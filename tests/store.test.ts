import { it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import { Store } from "../src/main/store";
import { metaSchema, type Meta } from "../src/shared/models";
import { demoManifest } from "../src/main/demo";
const item: Meta = {
  ...metaSchema.parse({ id: "aurea:sintel", type: "movie", name: "Sintel" }),
  addonUrl: "builtin:demo",
  addonName: "Demo",
};
it("SQLite persiste lista/favorito/progresso/perfis/add-ons/preferências após reabertura", () => {
  const folder = mkdtempSync(path.join(process.cwd(), "../../work/sqlite-"));
  const file = path.join(folder, "test.sqlite");
  let store = new Store(file);
  const first = store.active();
  store.update(item, { listed: true });
  store.update(item, {
    favorite: true,
    videoId: item.id,
    position: 12,
    duration: 52,
  });
  store.saveAddon({
    url: "builtin:demo",
    manifest: demoManifest,
    enabled: true,
  });
  store.set("settings", { autoplay: false, reducedMotion: true, volume: 0.2 });
  store.profile("create", "", "Visitante");
  const second = store.profiles()[1].id;
  store.profile("select", second);
  expect(store.library()).toHaveLength(0);
  store.update(item, { favorite: true });
  store.close();
  store = new Store(file);
  expect(store.active()).toBe(second);
  expect(store.settings().volume).toBe(0.2);
  expect(store.addons()[0].enabled).toBe(true);
  store.profile("select", first);
  expect(store.library()[0]).toMatchObject({
    listed: true,
    favorite: true,
    position: 12,
    duration: 52,
  });
  store.addon("builtin:demo", "disable");
  expect(store.addons()[0].enabled).toBe(false);
  store.profile("rename", second, "Novo nome");
  expect(store.profiles()[1].name).toBe("Novo nome");
  store.profile("delete", second);
  expect(store.profiles()).toHaveLength(1);
  expect(() => store.profile("delete", first)).toThrow();
  expect(() => store.profile("select", "missing")).toThrow();
  store.addon("builtin:demo", "remove");
  expect(store.addons()).toHaveLength(0);
  store.close();
});
it("preserva progresso independente por episódio e migra biblioteca v1", () => {
  const folder = mkdtempSync(path.join(process.cwd(), "../../work/migration-"));
  const file = path.join(folder, "test.sqlite");
  let s = new Store(file);
  s.update(item, { videoId: "episode:1", position: 12, duration: 52 });
  s.db.exec("DROP TABLE playback; PRAGMA user_version=1;");
  s.close();
  s = new Store(file);
  expect(s.playback()[0]).toMatchObject({ videoId: "episode:1", position: 12 });
  s.update(item, { videoId: "episode:2", position: 3, duration: 33 });
  s.close();
  s = new Store(file);
  expect(s.playback()).toHaveLength(2);
  expect(s.playback().find((p) => p.videoId === "episode:1")?.position).toBe(
    12,
  );
  expect(s.library()[0].videoId).toBe("episode:2");
  s.db.exec("PRAGMA user_version=99");
  s.close();
  expect(() => new Store(file)).toThrow("mais recente");
});
it("não colide mídia de mesmo ID entre tipos e fontes", () => {
  const store = new Store(":memory:");
  store.update(item, { listed: true });
  store.update({ ...item, type: "series" }, { favorite: true });
  store.update(
    { ...item, addonUrl: "https://example.com/manifest.json" },
    { position: 3 },
  );
  expect(store.library()).toHaveLength(3);
  store.close();
});
