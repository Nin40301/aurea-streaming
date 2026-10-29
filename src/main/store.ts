import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type {
  Addon,
  LibraryItem,
  Meta,
  Profile,
  Settings,
  Snapshot,
  PlaybackProgress,
} from "../shared/models";
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    const version = Number(
      this.db.prepare("PRAGMA user_version").get()?.user_version ?? 0,
    );
    if (version > 2) {
      this.db.close();
      throw Error(
        "Esta biblioteca foi criada por uma versão mais recente do Aurea.",
      );
    }
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,name TEXT NOT NULL,color TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS prefs(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS addons(url TEXT PRIMARY KEY,manifest TEXT NOT NULL,enabled INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS library(profile TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(profile,key));
 CREATE TABLE IF NOT EXISTS playback(profile TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,key TEXT NOT NULL,video TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(profile,key,video));`);
    if (version < 2) {
      this.db.exec("BEGIN");
      try {
        for (const row of this.db.prepare("SELECT * FROM library").all()) {
          const item = JSON.parse(String(row.data)) as LibraryItem;
          const key = JSON.stringify([
            item.meta.type,
            item.meta.id,
            item.meta.addonUrl,
          ]);
          this.db
            .prepare("UPDATE library SET key=? WHERE profile=? AND key=?")
            .run(key, row.profile, row.key);
          if (item.duration > 0) {
            const progress: PlaybackProgress = {
              metaId: item.meta.id,
              type: item.meta.type,
              addonUrl: item.meta.addonUrl,
              videoId: item.videoId,
              position: item.position,
              duration: item.duration,
            };
            this.db
              .prepare("INSERT OR IGNORE INTO playback VALUES(?,?,?,?)")
              .run(row.profile, key, item.videoId, JSON.stringify(progress));
          }
        }
        this.db.exec("PRAGMA user_version=2; COMMIT");
      } catch (e) {
        this.db.exec("ROLLBACK");
        throw e;
      }
    }
    if (!this.profiles().length) {
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO profiles VALUES(?,?,?)")
        .run(id, "Meu cinema", "#e6b767");
      this.set("active", id);
    }
  }
  profiles(): Profile[] {
    return this.db
      .prepare("SELECT * FROM profiles ORDER BY rowid")
      .all() as unknown as Profile[];
  }
  get<T>(key: string, fallback: T): T {
    const row = this.db.prepare("SELECT value FROM prefs WHERE key=?").get(key);
    return row ? JSON.parse(String(row.value)) : fallback;
  }
  set(key: string, value: unknown) {
    this.db
      .prepare("INSERT OR REPLACE INTO prefs VALUES(?,?)")
      .run(key, JSON.stringify(value));
  }
  active() {
    return this.get("active", this.profiles()[0].id);
  }
  addons(): Addon[] {
    return this.db
      .prepare("SELECT * FROM addons ORDER BY rowid")
      .all()
      .map((r) => ({
        url: String(r.url),
        manifest: JSON.parse(String(r.manifest)),
        enabled: !!r.enabled,
      }));
  }
  saveAddon(a: Addon) {
    this.db
      .prepare("INSERT OR REPLACE INTO addons VALUES(?,?,?)")
      .run(a.url, JSON.stringify(a.manifest), Number(a.enabled));
  }
  addon(url: string, action: string) {
    if (action === "remove")
      this.db.prepare("DELETE FROM addons WHERE url=?").run(url);
    else
      this.db
        .prepare("UPDATE addons SET enabled=? WHERE url=?")
        .run(Number(action === "enable"), url);
  }
  library(): LibraryItem[] {
    return this.db
      .prepare("SELECT data FROM library WHERE profile=?")
      .all(this.active())
      .map((r) => JSON.parse(String(r.data)))
      .sort((a, b) => b.updated - a.updated);
  }
  update(meta: Meta, patch: Partial<LibraryItem>) {
    const key = JSON.stringify([meta.type, meta.id, meta.addonUrl]);
    const row = this.db
      .prepare("SELECT data FROM library WHERE profile=? AND key=?")
      .get(this.active(), key);
    const item: LibraryItem = {
      meta,
      listed: false,
      favorite: false,
      videoId: meta.id,
      position: 0,
      duration: 0,
      ...(row ? JSON.parse(String(row.data)) : {}),
      ...patch,
      updated: Date.now(),
    };
    this.db
      .prepare("INSERT OR REPLACE INTO library VALUES(?,?,?)")
      .run(this.active(), key, JSON.stringify(item));
    if (
      patch.videoId !== undefined &&
      patch.position !== undefined &&
      patch.duration !== undefined
    ) {
      const progress: PlaybackProgress = {
        metaId: meta.id,
        type: meta.type,
        addonUrl: meta.addonUrl,
        videoId: patch.videoId,
        position: patch.position,
        duration: patch.duration,
      };
      this.db
        .prepare("INSERT OR REPLACE INTO playback VALUES(?,?,?,?)")
        .run(this.active(), key, patch.videoId, JSON.stringify(progress));
    }
  }
  profile(action: string, id: string, name?: string) {
    if (action === "create") {
      if (this.profiles().length >= 8)
        throw Error("Limite de 8 perfis atingido.");
      const key = randomUUID();
      this.db
        .prepare("INSERT INTO profiles VALUES(?,?,?)")
        .run(
          key,
          name!,
          ["#e6b767", "#7dbbb7", "#b49bdf", "#c88585"][
            this.profiles().length % 4
          ],
        );
    } else {
      if (!this.profiles().some((p) => p.id === id))
        throw Error("Perfil não encontrado.");
      if (action === "select") this.set("active", id);
      if (action === "rename")
        this.db.prepare("UPDATE profiles SET name=? WHERE id=?").run(name!, id);
      if (action === "delete") {
        if (this.profiles().length === 1)
          throw Error("Mantenha pelo menos um perfil.");
        this.db.prepare("DELETE FROM profiles WHERE id=?").run(id);
        if (this.active() === id) this.set("active", this.profiles()[0].id);
      }
    }
  }
  settings(): Settings {
    return this.get("settings", {
      autoplay: true,
      reducedMotion: false,
      volume: 0.8,
    });
  }
  snapshot(demoUrl: string): Snapshot {
    return {
      profiles: this.profiles(),
      activeProfile: this.active(),
      addons: this.addons(),
      library: this.library(),
      playback: this.playback(),
      settings: this.settings(),
      demoUrl,
    };
  }
  close() {
    this.db.close();
  }
  playback(): PlaybackProgress[] {
    return this.db
      .prepare("SELECT data FROM playback WHERE profile=?")
      .all(this.active())
      .map((r) => JSON.parse(String(r.data)));
  }
}
