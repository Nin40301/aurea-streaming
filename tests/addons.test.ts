import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { AddonEngine, safeUrl, supports } from "../src/main/addons";
import { demoManifest, startDemo } from "../src/main/demo";
import {
  manifestSchema,
  metaSchema,
  type Meta,
  type Addon,
} from "../src/shared/models";
import path from "node:path";
let demo: Awaited<ReturnType<typeof startDemo>>;
let engine: AddonEngine;
let addon: Addon;
const item: Meta = {
  ...metaSchema.parse({ id: "aurea:sintel", name: "Sintel", type: "movie" }),
  addonName: "Demo",
  addonUrl: "builtin:demo",
};
beforeAll(async () => {
  demo = await startDemo(path.join(process.cwd(), "assets"));
  engine = new AddonEngine(demo.manifestUrl);
  addon = await engine.install(demo.manifestUrl);
});
afterAll(() => new Promise<void>((r) => demo.server.close(() => r())));
describe("contrato Stremio HTTP", () => {
  it("valida manifest real sem executar código remoto", () => {
    expect(addon.manifest.id).toBe(demoManifest.id);
    expect(addon.url).toBe("builtin:demo");
    expect(
      manifestSchema.safeParse({ id: "x", resources: ["catalog"] }).success,
    ).toBe(false);
  });
  it("valida URLs e bloqueia esquemas e credenciais", () => {
    for (const url of [
      "file:///a",
      "javascript:alert(1)",
      "http://example.com/manifest.json",
      "https://user:secret@example.com/manifest.json",
    ])
      expect(() => safeUrl(url)).toThrow();
    expect(safeUrl(demo.manifestUrl).hostname).toBe("127.0.0.1");
  });
  it("não aplica idPrefixes de conteúdo aos IDs de catálogo", () => {
    expect(
      supports(
        { ...demoManifest, idPrefixes: ["tt"] },
        "catalog",
        "movie",
        "open-films",
      ),
    ).toBe(true);
  });
  it("recursos objeto têm seus próprios prefixos e tipos", () => {
    const m = {
      ...demoManifest,
      idPrefixes: ["tt"],
      resources: [{ name: "stream", types: ["movie"], idPrefixes: ["aurea:"] }],
    };
    expect(supports(m, "stream", "movie", "aurea:sintel")).toBe(true);
    expect(supports(m, "stream", "movie", "tt1")).toBe(false);
    expect(supports(m, "stream", "series", "aurea:studio")).toBe(false);
    expect(
      supports(
        { ...m, resources: [{ name: "stream", types: ["movie"] }] },
        "stream",
        "movie",
        "custom:1",
      ),
    ).toBe(true);
  });
  it("agrega catálogos habilitados e preserva fonte/tipo/id", async () => {
    const data = await engine.catalog([
      addon,
      { ...addon, url: "http://127.0.0.1:1/manifest.json", enabled: false },
    ]);
    expect(data.errors).toEqual([]);
    expect(data.rows).toHaveLength(2);
    expect(data.rows[0].items).toHaveLength(2);
    expect(data.rows[0].items[0].addonUrl).toBe("builtin:demo");
  });
  it("envia search/genre/skip declarados e filtra resultados", async () => {
    expect(
      (await engine.catalog([addon], { search: "Sintel" })).rows
        .flatMap((r) => r.items)
        .map((m) => m.name),
    ).toEqual(["Sintel"]);
    expect(
      (await engine.catalog([addon], { genre: "Fantasia" })).rows.flatMap(
        (r) => r.items,
      ),
    ).toHaveLength(1);
    expect(
      (await engine.catalog([addon], { type: "movie", skip: 100 })).rows[0]
        .items,
    ).toHaveLength(0);
  });
  it("resolve metadados, IDs de episódio e fontes reais", async () => {
    const m = await engine.meta([addon], {
      ...item,
      id: "aurea:studio",
      type: "series",
    });
    expect(m.videos).toHaveLength(2);
    const result = await engine.sources([addon], m, m.videos![1].id);
    expect(result.streams).toHaveLength(2);
    expect(result.streams[0].url).toContain("bunny.mp4");
    expect(result.subtitles).toHaveLength(1);
  });
  it("baixa WebVTT e converte SRT sem interpretar HTML", async () => {
    expect(await engine.subtitle(demo.base + "/media/credits.vtt")).toMatch(
      /^WEBVTT/,
    );
  });
  it("serve HTTP Range para seek e arquivos HLS locais", async () => {
    const response = await fetch(demo.base + "/media/sintel.mp4", {
      headers: { Range: "bytes=0-99" },
    });
    expect(response.status).toBe(206);
    expect((await response.arrayBuffer()).byteLength).toBe(100);
    expect((await fetch(demo.base + "/media/sintel/index.m3u8")).status).toBe(
      200,
    );
    expect(
      (
        await fetch(demo.base + "/media/sintel.mp4", {
          headers: { Range: "bytes=9999999999-" },
        })
      ).status,
    ).toBe(416);
  });
});
describe("falhas e limites de transporte", () => {
  it("cache, coalescência, timeout, JSON inválido, limite de bytes e erros parciais", async () => {
    let calls = 0;
    let current = 0,
      max = 0;
    const server = createServer((req, res) => {
      calls++;
      const route = req.url ?? "";
      if (route.startsWith("/slow")) {
        setTimeout(() => res.end("{}"), 250);
        return;
      }
      if (route.startsWith("/bad")) {
        res.end("not json");
        return;
      }
      if (route.startsWith("/large")) {
        res.setHeader("Content-Length", "5000000");
        res.end();
        return;
      }
      if (route.startsWith("/srt")) {
        res.end("1\n00:00:01,000 --> 00:00:03,000\nOlá\n");
        return;
      }
      if (route.startsWith("/error")) {
        res.writeHead(503).end();
        return;
      }
      if (route.startsWith("/catalog")) {
        res.end(JSON.stringify({ metas: [{ invalid: true }] }));
        return;
      }
      current++;
      max = Math.max(max, current);
      setTimeout(() => {
        current--;
        res.end("{}");
      }, 20);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
    const e = new AddonEngine(base + "/manifest.json", 100);
    try {
      await Promise.all([
        e.request(base + "/cache"),
        e.request(base + "/cache"),
      ]);
      expect(calls).toBe(1);
      await e.request(base + "/cache");
      expect(calls).toBe(1);
      await Promise.all(
        Array.from({ length: 9 }, (_, i) => e.request(base + "/parallel/" + i)),
      );
      expect(max).toBeLessThanOrEqual(4);
      await expect(e.request(base + "/slow")).rejects.toThrow("demorou");
      await expect(e.request(base + "/bad")).rejects.toThrow();
      await expect(e.request(base + "/large")).rejects.toThrow("tamanho");
      expect(await e.subtitle(base + "/srt")).toContain("00:00:01.000");
      await expect(e.request(base + "/error")).rejects.toThrow("503");
      const broken = { ...addon, url: base + "/manifest.json" };
      const data = await engine.catalog([addon, broken]);
      expect(data.errors).toHaveLength(2);
      expect(data.rows).toHaveLength(2);
      e.clear();
      await e.request(base + "/cache");
      expect(calls).toBeGreaterThan(12);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
  it("limita chamadas por origem e rejeita loopback disfarçado", async () => {
    const e = new AddonEngine(demo.manifestUrl);
    await expect(e.request("https://127.0.0.2/test")).rejects.toThrow(
      "privado",
    );
    for (let i = 0; i < 60; i++)
      await e.request(demo.base + "/manifest.json?unique=" + i);
    await expect(
      e.request(demo.base + "/manifest.json?unique=61"),
    ).rejects.toThrow("60 consultas");
  });
});
