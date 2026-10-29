import { z } from "zod";
export const text = z.string().min(1).max(400);
export const mediaType = z.enum(["movie", "series", "channel", "tv"]);
export const videoSchema = z.object({
  id: text,
  title: z.string().max(400).default("Episódio"),
  season: z.number().int().min(0).optional(),
  episode: z.number().int().min(0).optional(),
  overview: z.string().max(8000).optional(),
  thumbnail: z.string().max(4096).optional(),
  released: z.string().optional(),
});
export const metaSchema = z.object({
  id: text,
  type: mediaType,
  name: text,
  description: z.string().max(16000).optional(),
  poster: z.string().max(4096).optional(),
  background: z.string().max(4096).optional(),
  releaseInfo: z.string().max(100).optional(),
  runtime: z.string().max(100).optional(),
  genres: z.array(z.string().max(100)).max(50).default([]),
  videos: z.array(videoSchema).max(5000).optional(),
});
export const resourceSchema = z.union([
  z.string().max(100),
  z.object({
    name: text,
    types: z.array(z.string().max(100)).max(30).optional(),
    idPrefixes: z.array(z.string().max(200)).max(100).optional(),
  }),
]);
export const manifestSchema = z.object({
  id: text,
  name: text,
  version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/),
  description: z.string().max(16000).default(""),
  types: z.array(z.string().max(100)).min(1).max(30),
  idPrefixes: z.array(z.string().max(200)).max(100).optional(),
  resources: z.array(resourceSchema).min(1).max(30),
  catalogs: z
    .array(
      z.object({
        id: text,
        type: mediaType,
        name: z.string().max(200).optional(),
        extra: z
          .array(
            z.object({
              name: text,
              isRequired: z.boolean().optional(),
              options: z.array(z.string().max(200)).max(500).optional(),
            }),
          )
          .max(30)
          .optional(),
        extraSupported: z.array(z.string()).max(30).optional(),
        extraRequired: z.array(z.string()).max(30).optional(),
      }),
    )
    .max(100)
    .default([]),
});
export const streamSchema = z.object({
  url: z.string().max(8192).optional(),
  name: z.string().max(300).optional(),
  title: z.string().max(1000).optional(),
  description: z.string().max(1000).optional(),
  infoHash: z.string().optional(),
  externalUrl: z.string().optional(),
  behaviorHints: z
    .object({
      notWebReady: z.boolean().optional(),
      proxyHeaders: z.unknown().optional(),
    })
    .optional(),
});
export const subtitleSchema = z.object({
  id: text,
  url: z.string().max(8192),
  lang: z.string().max(100),
  label: z.string().max(200).optional(),
});
export type Manifest = z.infer<typeof manifestSchema>;
export type Meta = z.infer<typeof metaSchema> & {
  addonUrl: string;
  addonName: string;
};
export type Stream = z.infer<typeof streamSchema> & {
  addonName: string;
  addonUrl: string;
};
export type Subtitle = z.infer<typeof subtitleSchema>;
export type Profile = { id: string; name: string; color: string };
export type Addon = { url: string; manifest: Manifest; enabled: boolean };
export type LibraryItem = {
  meta: Meta;
  listed: boolean;
  favorite: boolean;
  videoId: string;
  position: number;
  duration: number;
  updated: number;
};
export type Settings = {
  autoplay: boolean;
  reducedMotion: boolean;
  volume: number;
};
export type PlaybackProgress = {
  metaId: string;
  type: Meta["type"];
  addonUrl: string;
  videoId: string;
  position: number;
  duration: number;
};
export type Snapshot = {
  profiles: Profile[];
  activeProfile: string;
  addons: Addon[];
  library: LibraryItem[];
  playback: PlaybackProgress[];
  settings: Settings;
  demoUrl: string;
};
export type Row = {
  id: string;
  name: string;
  items: Meta[];
  addonName: string;
};
export type CatalogResult = { rows: Row[]; errors: string[] };
export type API = {
  snapshot(): Promise<Snapshot>;
  catalog(query?: {
    search?: string;
    type?: string;
    genre?: string;
    skip?: number;
  }): Promise<CatalogResult>;
  meta(item: Meta): Promise<Meta>;
  sources(
    item: Meta,
    videoId: string,
  ): Promise<{ streams: Stream[]; subtitles: Subtitle[]; errors: string[] }>;
  install(url: string): Promise<Snapshot>;
  addon(
    url: string,
    action: "remove" | "enable" | "disable",
  ): Promise<Snapshot>;
  profile(
    action: "create" | "select" | "rename" | "delete",
    id: string,
    name?: string,
  ): Promise<Snapshot>;
  library(
    meta: Meta,
    field: "listed" | "favorite",
    value: boolean,
  ): Promise<Snapshot>;
  progress(
    meta: Meta,
    videoId: string,
    position: number,
    duration: number,
  ): Promise<void>;
  settings(settings: Settings): Promise<Snapshot>;
  subtitle(url: string): Promise<string>;
  clearCache(): Promise<void>;
  fullscreen(): Promise<void>;
};
declare global {
  interface Window {
    aurea: API;
  }
}
