import { contextBridge, ipcRenderer } from "electron";
import type { API } from "../shared/models";
const call = async (name: string, ...args: unknown[]) => {
  const result = await ipcRenderer.invoke("aurea:" + name, ...args);
  if (!result.ok) throw Error(result.error);
  return result.value;
};
const api: API = {
  snapshot: () => call("snapshot"),
  catalog: (q) => call("catalog", q),
  meta: (m) => call("meta", m),
  sources: (m, id) => call("sources", m, id),
  install: (url) => call("install", url),
  addon: (url, action) => call("addon", url, action),
  profile: (action, id, name) => call("profile", action, id, name),
  library: (m, field, value) => call("library", m, field, value),
  progress: (m, id, pos, dur) => call("progress", m, id, pos, dur),
  settings: (s) => call("settings", s),
  subtitle: (url) => call("subtitle", url),
  clearCache: () => call("clearCache"),
  fullscreen: () => call("fullscreen"),
};
contextBridge.exposeInMainWorld("aurea", api);
