import { app, BrowserWindow, ipcMain, session, Menu, dialog } from "electron";
import squirrel from "electron-squirrel-startup";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { Store } from "./store";
import { AddonEngine, friendly } from "./addons";
import { startDemo } from "./demo";
import { metaSchema, text, type API, type Meta } from "../shared/models";
if (squirrel) app.quit();
app.setAppUserModelId("com.squirrel.Aurea.Aurea");
if (process.env.AUREA_DATA_DIR)
  app.setPath("userData", path.resolve(process.env.AUREA_DATA_DIR));
app.setName("Aurea");
const ownsInstance = squirrel || app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
app.on("second-instance", () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
});
let store: Store;
let closeDemo: (() => void) | undefined;
const itemSchema = metaSchema.extend({
  addonUrl: z.string().max(4096),
  addonName: text,
});
async function boot() {
  const data = app.getPath("userData");
  mkdirSync(data, { recursive: true });
  store = new Store(path.join(data, "aurea.sqlite"));
  const assets = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(app.getAppPath(), "assets");
  const demo = await startDemo(assets);
  closeDemo = () => demo.server.close();
  const engine = new AddonEngine(demo.manifestUrl);
  if (!store.get("demoSeeded", false)) {
    store.saveAddon(await engine.install(demo.manifestUrl));
    store.set("demoSeeded", true);
  }
  const hydrate = (m: Meta): Meta =>
    m.addonUrl === "builtin:demo"
      ? {
          ...m,
          poster: m.poster?.replace(/^http:\/\/127\.0\.0\.1:\d+/, demo.base),
          background: m.background?.replace(
            /^http:\/\/127\.0\.0\.1:\d+/,
            demo.base,
          ),
        }
      : m;
  const snapshot = () => {
    const s = store.snapshot(demo.manifestUrl);
    s.library = s.library.map((i) => ({ ...i, meta: hydrate(i.meta) }));
    return s;
  };
  const schema = {
    snapshot: z.tuple([]),
    catalog: z.tuple([
      z
        .object({
          search: z.string().max(200).optional(),
          type: z.enum(["movie", "series", "channel", "tv"]).optional(),
          genre: z.string().max(100).optional(),
          skip: z.number().int().min(0).max(10000).optional(),
        })
        .optional(),
    ]),
    meta: z.tuple([itemSchema]),
    sources: z.tuple([itemSchema, text]),
    install: z.tuple([z.string().max(4096)]),
    addon: z.tuple([
      z.string().max(4096),
      z.enum(["remove", "enable", "disable"]),
    ]),
    profile: z.tuple([
      z.enum(["create", "select", "rename", "delete"]),
      z.string().max(100),
      z.string().trim().min(1).max(40).optional(),
    ]),
    library: z.tuple([itemSchema, z.enum(["listed", "favorite"]), z.boolean()]),
    progress: z.tuple([
      itemSchema,
      text,
      z.number().finite().min(0).max(1e8),
      z.number().finite().min(0).max(1e8),
    ]),
    settings: z.tuple([
      z.object({
        autoplay: z.boolean(),
        reducedMotion: z.boolean(),
        volume: z.number().min(0).max(1),
      }),
    ]),
    subtitle: z.tuple([z.string().max(8192)]),
    clearCache: z.tuple([]),
    fullscreen: z.tuple([]),
  };
  const api: API = {
    snapshot: async () => snapshot(),
    catalog: (query) => engine.catalog(store.addons(), query),
    meta: (item) => engine.meta(store.addons(), hydrate(item)),
    sources: (item, id) => engine.sources(store.addons(), item, id),
    install: async (url) => {
      if (store.addons().length >= 20)
        throw Error("Limite de 20 add-ons atingido.");
      const addon = await engine.install(url);
      store.saveAddon(addon);
      engine.clear();
      return snapshot();
    },
    addon: async (url, action) => {
      store.addon(url, action);
      engine.clear();
      return snapshot();
    },
    profile: async (action, id, name) => {
      if ((action === "create" || action === "rename") && !name)
        throw Error("Informe o nome do perfil.");
      store.profile(action, id, name);
      return snapshot();
    },
    library: async (meta, field, value) => {
      store.update(meta, { [field]: value });
      return snapshot();
    },
    progress: async (meta, videoId, position, duration) => {
      store.update(meta, {
        videoId,
        position: Math.min(position, duration || position),
        duration,
      });
    },
    settings: async (prefs) => {
      store.set("settings", prefs);
      return snapshot();
    },
    subtitle: (url) => engine.subtitle(url),
    clearCache: async () => engine.clear(),
    fullscreen: async () => {
      const w = BrowserWindow.getFocusedWindow();
      if (w) w.setFullScreen(!w.isFullScreen());
    },
  };
  const renderer = path.join(__dirname, "../renderer/index.html");
  for (const key of Object.keys(schema) as (keyof API)[]) {
    ipcMain.handle("aurea:" + key, async (event, ...args: unknown[]) => {
      try {
        if (
          event.senderFrame !== event.sender.mainFrame ||
          event.senderFrame?.url !== pathToFileURL(renderer).href
        )
          throw Error("Origem IPC inválida.");
        const values = schema[key].parse(args);
        const fn = api[key] as (...params: unknown[]) => unknown;
        return { ok: true, value: await fn(...values) };
      } catch (e) {
        return { ok: false, error: friendly(e) };
      }
    });
  }
  const localRenderer = pathToFileURL(renderer).href;
  session.defaultSession.setPermissionRequestHandler(
    (wc, permission, callback, details) =>
      callback(
        permission === "fullscreen" &&
          wc.getURL() === localRenderer &&
          details.requestingUrl === localRenderer,
      ),
  );
  session.defaultSession.setPermissionCheckHandler(
    (wc, permission) =>
      permission === "fullscreen" && wc?.getURL() === localRenderer,
  );
  session.defaultSession.on("will-download", (event) => event.preventDefault());
  Menu.setApplicationMenu(null);
  const create = () => {
    const window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 860,
      minHeight: 640,
      backgroundColor: "#0c0d11",
      title: "Aurea",
      icon: path.join(assets, "aurea.ico"),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (url !== window.webContents.getURL()) event.preventDefault();
    });
    window.webContents.on("will-attach-webview", (event) =>
      event.preventDefault(),
    );
    window.loadFile(renderer);
  };
  create();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) create();
  });
}
app
  .whenReady()
  .then(() => {
    if (!squirrel && ownsInstance) return boot();
  })
  .catch((e) => {
    console.error(e);
    dialog.showErrorBox("Aurea não pôde iniciar", friendly(e));
    app.quit();
  });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  closeDemo?.();
  store?.close();
});
