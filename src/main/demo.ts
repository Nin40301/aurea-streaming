import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Manifest } from "../shared/models";
export const demoManifest: Manifest = {
  id: "org.aurea.open-cinema",
  version: "1.0.0",
  name: "Cinema aberto · Aurea",
  description:
    "Trailers Blender, Creative Commons BY 3.0. Fontes MP4 e HLS locais, sem conta.",
  types: ["movie", "series"],
  resources: [
    "catalog",
    { name: "meta", idPrefixes: ["aurea:"] },
    { name: "stream", idPrefixes: ["aurea:"] },
    { name: "subtitles", idPrefixes: ["aurea:"] },
  ],
  catalogs: [
    {
      id: "open-films",
      type: "movie",
      name: "Curtas, grandes mundos",
      extra: [
        { name: "search" },
        { name: "genre", options: ["Fantasia", "Animação", "Aventura"] },
        { name: "skip" },
      ],
    },
    {
      id: "studio",
      type: "series",
      name: "Dentro do cinema aberto",
      extra: [{ name: "search" }, { name: "genre" }],
    },
  ],
};
export async function startDemo(assets: string, port = 0) {
  let base = "";
  const server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") {
      res.end();
      return;
    }
    if (!["GET", "HEAD"].includes(req.method ?? "")) {
      res.writeHead(405).end();
      return;
    }
    const url = new URL(req.url ?? "/", base || "http://localhost");
    const send = (value: unknown) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(value));
    };
    const film = (id: string) => ({
      id: "aurea:" + id,
      type: "movie",
      name: id === "sintel" ? "Sintel" : "Big Buck Bunny",
      releaseInfo: id === "sintel" ? "2010" : "2008",
      runtime: id === "sintel" ? "52 s · trailer" : "33 s · trailer",
      genres:
        id === "sintel" ? ["Fantasia", "Aventura"] : ["Animação", "Aventura"],
      description:
        id === "sintel"
          ? "Uma jovem viajante atravessa um mundo extraordinário em busca de um pequeno dragão. Trailer do curta aberto da Blender Foundation."
          : "Um gigante gentil, três pequenos provocadores e uma floresta cheia de personalidade. Trailer do curta aberto da Blender Foundation.",
      poster: base + "/media/" + id + ".jpg",
      background: base + "/media/" + id + "-wide.jpg",
    });
    const series = {
      id: "aurea:studio",
      type: "series",
      name: "Mundos da Blender",
      releaseInfo: "2008–2010",
      genres: ["Animação", "Aventura"],
      description:
        "Uma coleção de trailers dos filmes abertos da Blender Foundation. Cada episódio apresenta um universo diferente. Mídia Creative Commons BY 3.0.",
      poster: base + "/media/studio.jpg",
      background: base + "/media/bunny-wide.jpg",
      videos: [
        {
          id: "aurea:studio:1:1",
          title: "Sintel · A jornada",
          season: 1,
          episode: 1,
          overview: "Trailer oficial: fantasia e aventura.",
          thumbnail: base + "/media/sintel-wide.jpg",
        },
        {
          id: "aurea:studio:1:2",
          title: "Big Buck Bunny · A floresta",
          season: 1,
          episode: 2,
          overview: "Trailer oficial: um mundo de animação.",
          thumbnail: base + "/media/bunny-wide.jpg",
        },
      ],
    };
    try {
      const parts = url.pathname
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent);
      if (url.pathname === "/manifest.json") {
        send(demoManifest);
        return;
      }
      if (parts[0] === "media") {
        const rel = parts.slice(1).join("/");
        if (!/^[\w./-]+$/.test(rel) || rel.split("/").includes("..")) {
          res.writeHead(403).end();
          return;
        }
        const file = path.join(assets, "media", rel);
        const stat = statSync(file);
        if (!stat.isFile()) throw Error();
        const types: Record<string, string> = {
          ".mp4": "video/mp4",
          ".jpg": "image/jpeg",
          ".m3u8": "application/vnd.apple.mpegurl",
          ".ts": "video/mp2t",
          ".vtt": "text/vtt; charset=utf-8",
        };
        res.setHeader(
          "Content-Type",
          types[path.extname(file)] ?? "application/octet-stream",
        );
        res.setHeader("Accept-Ranges", "bytes");
        const range = req.headers.range;
        if (range) {
          const match = /^bytes=(\d+)-(\d*)$/.exec(range);
          if (!match) {
            res
              .writeHead(416, { "Content-Range": `bytes */${stat.size}` })
              .end();
            return;
          }
          const start = Number(match[1]),
            end = match[2]
              ? Math.min(Number(match[2]), stat.size - 1)
              : stat.size - 1;
          if (start > end || start >= stat.size) {
            res
              .writeHead(416, { "Content-Range": `bytes */${stat.size}` })
              .end();
            return;
          }
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Content-Length": end - start + 1,
          });
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          createReadStream(file, { start, end }).pipe(res);
        } else {
          res.setHeader("Content-Length", stat.size);
          if (req.method === "HEAD") res.end();
          else createReadStream(file).pipe(res);
        }
        return;
      }
      const resource = parts[0],
        type = parts[1],
        id = (parts[2] ?? "").replace(/\.json$/, "");
      if (resource === "catalog") {
        let metas: ReturnType<typeof film>[] =
          type === "series"
            ? [{ ...series, runtime: "2 episódios" }]
            : [film("sintel"), film("bunny")];
        const extras = new URLSearchParams(
          (parts[3] ?? "").replace(/\.json$/, ""),
        );
        if (extras.has("search"))
          metas = metas.filter((m) =>
            (m.name + " " + m.description + " " + m.genres.join(" "))
              .toLowerCase()
              .includes(extras.get("search")!.toLowerCase()),
          );
        if (extras.has("genre"))
          metas = metas.filter((m) => m.genres.includes(extras.get("genre")!));
        const skip = Number(extras.get("skip") ?? 0);
        send({ metas: metas.slice(skip, skip + 20) });
        return;
      }
      const known = [
        "aurea:sintel",
        "aurea:bunny",
        "aurea:studio",
        "aurea:studio:1:1",
        "aurea:studio:1:2",
      ];
      if (!known.includes(id)) {
        res.writeHead(404).end();
        return;
      }
      if (resource === "meta") {
        send({
          meta: id === "aurea:studio" ? series : film(id.replace("aurea:", "")),
        });
        return;
      }
      const media =
        id.includes("bunny") || id.endsWith(":1:2") ? "bunny" : "sintel";
      if (resource === "stream") {
        send({
          streams: [
            {
              name: "MP4 · local",
              title: "Trailer Blender · reprodução direta",
              url: base + "/media/" + media + ".mp4",
            },
            {
              name: "HLS · local",
              title: "Trailer Blender · streaming segmentado",
              url: base + "/media/" + media + "/index.m3u8",
            },
          ],
        });
        return;
      }
      if (resource === "subtitles") {
        send({
          subtitles: [
            {
              id: "aurea-demo-pt",
              lang: "por",
              label: "Português · créditos de demonstração",
              url: base + "/media/credits.vtt",
            },
          ],
        });
        return;
      }
      res.writeHead(404).end();
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  return { server, base, manifestUrl: base + "/manifest.json" };
}
