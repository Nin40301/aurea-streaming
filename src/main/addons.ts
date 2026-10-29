import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import {
  manifestSchema,
  metaSchema,
  streamSchema,
  subtitleSchema,
  type Addon,
  type CatalogResult,
  type Manifest,
  type Meta,
  type Stream,
  type Subtitle,
} from "../shared/models";
export function safeUrl(raw: string) {
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    (!local && url.protocol !== "https:") ||
    (local && !["http:", "https:"].includes(url.protocol))
  )
    throw Error(
      "Use HTTPS, ou HTTP em localhost. Credenciais na URL não são aceitas.",
    );
  return url;
}
function privateAddress(ip: string) {
  return (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      ip,
    ) ||
    ip === "::1" ||
    /^(fc|fd|fe80|::ffff:)/i.test(ip)
  );
}
export function supports(
  m: Manifest,
  resource: string,
  type: string,
  id: string,
) {
  return (
    m.types.includes(type) &&
    m.resources.some((r) => {
      if (typeof r === "string")
        return (
          r === resource &&
          (resource === "catalog" ||
            !m.idPrefixes ||
            m.idPrefixes.some((p) => id.startsWith(p)))
        );
      return (
        r.name === resource &&
        (!r.types || r.types.includes(type)) &&
        (resource === "catalog" ||
          !r.idPrefixes ||
          r.idPrefixes.some((p) => id.startsWith(p)))
      );
    })
  );
}
export class AddonEngine {
  private cache = new Map<string, { until: number; value: unknown }>();
  private inflight = new Map<string, Promise<unknown>>();
  private active = 0;
  private queue: (() => void)[] = [];
  private calls = new Map<string, { start: number; count: number }>();
  constructor(
    readonly demoUrl: string,
    readonly timeout = 8000,
  ) {}
  clear() {
    this.cache.clear();
  }
  actual(url: string) {
    return url === "builtin:demo" ? this.demoUrl : url;
  }
  async request(raw: string, json = true): Promise<unknown> {
    const cached = this.cache.get(raw);
    if (cached && cached.until > Date.now()) return cached.value;
    const pending = this.inflight.get(raw);
    if (pending) return pending;
    const task = this.fetchBounded(raw, json);
    this.inflight.set(raw, task);
    try {
      return await task;
    } finally {
      this.inflight.delete(raw);
    }
  }
  private async fetchBounded(raw: string, json: boolean) {
    if (this.active >= 4) {
      if (this.queue.length >= 100)
        throw Error("Fila de consultas cheia. Tente novamente.");
      await new Promise<void>((r) => this.queue.push(r));
    } else this.active++;
    try {
      let url = safeUrl(raw);
      const origin = url.origin;
      const now = Date.now();
      let rate = this.calls.get(origin);
      if (!rate || now - rate.start > 60000) {
        rate = { start: now, count: 0 };
        this.calls.set(origin, rate);
      }
      if (++rate.count > 60)
        throw Error("Limite de 60 consultas por minuto desta fonte atingido.");
      if (this.calls.size > 200)
        this.calls.delete(this.calls.keys().next().value!);
      const signal = AbortSignal.timeout(this.timeout);
      let response: Response | undefined;
      for (let redirect = 0; redirect < 4; redirect++) {
        const local = ["localhost", "127.0.0.1", "[::1]"].includes(
          url.hostname,
        );
        if (!local) {
          const addresses = isIP(url.hostname)
            ? [{ address: url.hostname }]
            : await lookup(url.hostname, { all: true });
          if (addresses.some((a) => privateAddress(a.address)))
            throw Error(
              "Endereço privado bloqueado. Use loopback explícito para add-ons locais.",
            );
        }
        response = await fetch(url, {
          signal,
          redirect: "manual",
          headers: {
            Accept: json ? "application/json" : "text/vtt,text/plain",
          },
        });
        if (response.status >= 300 && response.status < 400) {
          await response.body?.cancel();
          const next = safeUrl(
            new URL(response.headers.get("location") ?? "", url).href,
          );
          if (next.origin !== origin)
            throw Error("Redirecionamento para outro servidor bloqueado.");
          url = next;
          continue;
        }
        break;
      }
      if (!response?.ok) {
        await response?.body?.cancel();
        throw Error(
          `Fonte retornou HTTP ${response?.status ?? "indisponível"}.`,
        );
      }
      const max = json ? 4 * 1024 * 1024 : 1024 * 1024;
      if (Number(response.headers.get("content-length")) > max) {
        await response.body?.cancel();
        throw Error("Resposta excedeu o limite de tamanho.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw Error("Resposta vazia.");
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > max) {
          await reader.cancel();
          throw Error("Resposta excedeu o limite de tamanho.");
        }
        chunks.push(part.value);
      }
      const body = Buffer.concat(chunks).toString("utf8");
      const value: unknown = json ? JSON.parse(body) : body;
      this.cache.set(raw, { until: now + 120000, value });
      if (this.cache.size > 150)
        this.cache.delete(this.cache.keys().next().value!);
      return value;
    } catch (e) {
      if (
        e instanceof Error &&
        (e.name === "TimeoutError" || e.name === "AbortError")
      )
        throw Error("A fonte demorou demais. Tente novamente.", { cause: e });
      throw e;
    } finally {
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }
  async install(raw: string): Promise<Addon> {
    const url = safeUrl(raw);
    if (!url.pathname.endsWith("/manifest.json") || url.hash || url.search)
      throw Error(
        "Informe uma URL terminada em /manifest.json, sem query ou fragmento.",
      );
    const manifest = manifestSchema.parse(await this.request(url.href));
    return {
      url: url.href === this.demoUrl ? "builtin:demo" : url.href,
      manifest,
      enabled: true,
    };
  }
  resource(
    a: Addon,
    resource: string,
    type: string,
    id: string,
    extra: Record<string, string> = {},
  ) {
    const base = this.actual(a.url).replace(/manifest\.json$/, "");
    const suffix = new URLSearchParams(extra).toString();
    return (
      base +
      [resource, type, id].map(encodeURIComponent).join("/") +
      (suffix ? "/" + suffix : "") +
      ".json"
    );
  }
  async catalog(
    addons: Addon[],
    query: {
      search?: string;
      type?: string;
      genre?: string;
      skip?: number;
    } = {},
  ): Promise<CatalogResult> {
    const rows: CatalogResult["rows"] = [];
    const errors: string[] = [];
    const jobs = addons
      .filter((a) => a.enabled)
      .flatMap((a) =>
        a.manifest.catalogs
          .filter((c) => !query.type || c.type === query.type)
          .map((c) => ({ a, c })),
      )
      .slice(0, 40);
    await Promise.all(
      jobs.map(async ({ a, c }) => {
        try {
          const names = new Set([
            ...(c.extra ?? []).map((e) => e.name),
            ...(c.extraSupported ?? []),
          ]);
          const extra: Record<string, string> = {};
          if (query.search && names.has("search")) extra.search = query.search;
          if (query.genre && names.has("genre")) extra.genre = query.genre;
          if (query.skip && names.has("skip")) extra.skip = String(query.skip);
          const required = [
            ...(c.extra ?? []).filter((e) => e.isRequired).map((e) => e.name),
            ...(c.extraRequired ?? []),
          ];
          if (required.some((k) => !extra[k])) return;
          if (!supports(a.manifest, "catalog", c.type, c.id)) return;
          const data = z
            .object({ metas: z.array(z.unknown()).max(2000) })
            .parse(
              await this.request(
                this.resource(a, "catalog", c.type, c.id, extra),
              ),
            );
          let items = data.metas.flatMap((m) => {
            const parsed = metaSchema.safeParse(m);
            return parsed.success && parsed.data.type === c.type
              ? [
                  {
                    ...parsed.data,
                    addonUrl: a.url,
                    addonName: a.manifest.name,
                  },
                ]
              : [];
          });
          if (data.metas.length && !items.length)
            throw Error("Catálogo sem itens válidos.");
          if (query.search)
            items = items.filter((m) =>
              (m.name + " " + m.description + " " + m.genres.join(" "))
                .toLocaleLowerCase()
                .includes(query.search!.toLocaleLowerCase()),
            );
          if (query.genre)
            items = items.filter((m) => m.genres.includes(query.genre!));
          rows.push({
            id: a.url + ":" + c.type + ":" + c.id,
            name: c.name ?? a.manifest.name,
            items,
            addonName: a.manifest.name,
          });
        } catch (e) {
          errors.push(a.manifest.name + ": " + friendly(e));
        }
      }),
    );
    return {
      rows: rows.sort(
        (a, b) =>
          jobs.findIndex(
            (j) => a.id === j.a.url + ":" + j.c.type + ":" + j.c.id,
          ) -
          jobs.findIndex(
            (j) => b.id === j.a.url + ":" + j.c.type + ":" + j.c.id,
          ),
      ),
      errors,
    };
  }
  async meta(addons: Addon[], item: Meta): Promise<Meta> {
    const candidates = addons
      .filter(
        (a) => a.enabled && supports(a.manifest, "meta", item.type, item.id),
      )
      .sort(
        (a, b) =>
          Number(b.url === item.addonUrl) - Number(a.url === item.addonUrl),
      );
    let last: unknown;
    for (const a of candidates) {
      try {
        const data = z
          .object({ meta: metaSchema })
          .parse(
            await this.request(this.resource(a, "meta", item.type, item.id)),
          );
        if (data.meta.id !== item.id || data.meta.type !== item.type)
          throw Error(
            "Metadados retornaram uma identidade diferente da solicitada.",
          );
        return {
          ...data.meta,
          addonName: item.addonName,
          addonUrl: item.addonUrl,
        };
      } catch (e) {
        last = e;
      }
    }
    if (last) throw Error(friendly(last));
    return item;
  }
  async sources(addons: Addon[], item: Meta, id: string) {
    const streams: Stream[] = [];
    const subtitles: Subtitle[] = [];
    const errors: string[] = [];
    await Promise.all(
      addons
        .filter((a) => a.enabled)
        .map(async (a) => {
          for (const resource of ["stream", "subtitles"]) {
            if (!supports(a.manifest, resource, item.type, id)) continue;
            try {
              const data = await this.request(
                this.resource(a, resource, item.type, id),
              );
              if (resource === "stream") {
                const body = z
                  .object({ streams: z.array(z.unknown()).max(200) })
                  .parse(data);
                for (const raw of body.streams) {
                  const parsed = streamSchema.safeParse(raw);
                  if (!parsed.success) continue;
                  const s = parsed.data;
                  if (
                    !s.url ||
                    s.infoHash ||
                    s.behaviorHints?.proxyHeaders ||
                    s.behaviorHints?.notWebReady
                  )
                    continue;
                  try {
                    safeUrl(s.url);
                    streams.push({
                      ...s,
                      addonName: a.manifest.name,
                      addonUrl: a.url,
                    });
                  } catch {
                    /* Unsupported transport is not executable data. */
                  }
                }
                if (
                  body.streams.length &&
                  !streams.some((s) => s.addonUrl === a.url)
                )
                  errors.push(
                    a.manifest.name +
                      ": sem fonte HTTP compatível; torrent, headers especiais e fontes externas não são reproduzidos.",
                  );
              } else {
                const body = z
                  .object({ subtitles: z.array(z.unknown()).max(200) })
                  .parse(data);
                for (const raw of body.subtitles) {
                  const p = subtitleSchema.safeParse(raw);
                  if (p.success) {
                    try {
                      safeUrl(p.data.url);
                      subtitles.push(p.data);
                    } catch {
                      /* ignore unsupported URL */
                    }
                  }
                }
              }
            } catch (e) {
              errors.push(
                a.manifest.name + " (" + resource + "): " + friendly(e),
              );
            }
          }
        }),
    );
    return { streams, subtitles, errors };
  }
  async subtitle(raw: string) {
    const value = String(await this.request(safeUrl(raw).href, false)).replace(
      /^\uFEFF/,
      "",
    );
    if (value.trimStart().startsWith("WEBVTT")) return value;
    if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(value))
      return (
        "WEBVTT\n\n" + value.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
      );
    throw Error("Legenda deve estar em WebVTT ou SRT UTF-8.");
  }
}
export function friendly(e: unknown) {
  return e instanceof z.ZodError
    ? "Resposta inválida do add-on."
    : e instanceof Error
      ? e.message
      : "Não foi possível consultar esta fonte.";
}
