import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useDialogFocus } from "./focus";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipForward,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type {
  PlaybackProgress,
  Meta,
  Settings,
  Stream,
  Subtitle,
} from "../shared/models";
export type Playing = {
  meta: Meta;
  videoId: string;
  streams: Stream[];
  subtitles: Subtitle[];
  index: number;
};
const clock = (n: number) =>
  Number.isFinite(n)
    ? `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`
    : "0:00";
export function Player({
  playing,
  settings,
  history,
  onClose,
  onNext,
}: {
  playing: Playing;
  settings: Settings;
  history: PlaybackProgress[];
  onClose: () => void;
  onNext: (id: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    container = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(playing.index),
    [error, setError] = useState(""),
    [buffering, setBuffering] = useState(true),
    [paused, setPaused] = useState(true),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [volume, setVolume] = useState(settings.volume),
    [speed, setSpeed] = useState(1),
    [subtitle, setSubtitle] = useState(""),
    [trackUrl, setTrackUrl] = useState(""),
    [subtitleError, setSubtitleError] = useState("");
  useDialogFocus(container);
  const progressError = useRef(false);
  const resume = useRef<number | undefined>(undefined);
  const stream = playing.streams[source];
  const episode = playing.meta.videos?.find((v) => v.id === playing.videoId);
  const next =
    playing.meta.videos?.[
      (playing.meta.videos.findIndex((v) => v.id === playing.videoId) ?? -1) + 1
    ];
  useEffect(() => {
    if (!buffering || error) return;
    const timer = setTimeout(() => {
      if (video.current && video.current.readyState < 3) {
        setError("A mídia não respondeu a tempo. Selecione outra fonte.");
        setBuffering(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [buffering, error, source]);
  useEffect(() => {
    const v = video.current!;
    let hls: Hls | undefined;
    let alive = true;
    setError("");
    setBuffering(true);
    progressError.current = false;
    const save = () => {
      if (!Number.isFinite(v.duration) || v.duration <= 0) return;
      void window.aurea
        .progress(playing.meta, playing.videoId, v.currentTime, v.duration)
        .catch(() => {
          if (alive && !progressError.current) {
            progressError.current = true;
            setSubtitleError("Não foi possível salvar o progresso.");
          }
        });
    };
    const restored = history.find(
      (i) =>
        i.metaId === playing.meta.id &&
        i.type === playing.meta.type &&
        i.addonUrl === playing.meta.addonUrl &&
        i.videoId === playing.videoId,
    );
    const startAt =
      resume.current ??
      (restored && restored.position < restored.duration - 3
        ? restored.position
        : 0);
    const loaded = () => {
      setDuration(v.duration);
      if (startAt > 0 && startAt < v.duration - 3) v.currentTime = startAt;
      v.volume = volume;
      v.playbackRate = speed;
      if (settings.autoplay)
        void v.play().catch(() => {
          if (alive) {
            setPaused(true);
            setBuffering(false);
          }
        });
    };
    v.addEventListener("loadedmetadata", loaded);
    v.addEventListener("pause", save);
    const timer = setInterval(save, 3000);
    if (/\.mpd(?:[?#]|$)/i.test(stream.url ?? "")) {
      setError("DASH ainda não é suportado. Escolha uma fonte MP4 ou HLS.");
      setBuffering(false);
    } else if (/\.m3u8(?:[?#]|$)/i.test(stream.url ?? "")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          startPosition: startAt,
          enableWorker: false,
          backBufferLength: 30,
          maxBufferLength: 30,
          manifestLoadingTimeOut: 10000,
          fragLoadingTimeOut: 15000,
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && alive) {
            setError(
              "Falha ao carregar HLS. Verifique a fonte, os codecs e o acesso à rede.",
            );
            setBuffering(false);
          }
        });
        hls.attachMedia(v);
        hls.loadSource(stream.url!);
      } else if (v.canPlayType("application/vnd.apple.mpegurl"))
        v.src = stream.url!;
      else {
        setError("HLS/MSE indisponível neste motor.");
        setBuffering(false);
      }
    } else v.src = stream.url!;
    return () => {
      resume.current = v.currentTime;
      save();
      alive = false;
      clearInterval(timer);
      v.removeEventListener("loadedmetadata", loaded);
      v.removeEventListener("pause", save);
      hls?.destroy();
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [source, playing.videoId]);
  useEffect(() => {
    let alive = true;
    setTrackUrl("");
    setSubtitleError("");
    if (!subtitle) return;
    let url = "";
    window.aurea
      .subtitle(subtitle)
      .then((text) => {
        if (!alive) return;
        url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
        setTrackUrl(url);
      })
      .catch((e) => {
        if (alive) setSubtitleError(e.message);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [subtitle]);
  useEffect(() => {
    if (trackUrl && video.current) {
      const tracks = video.current.textTracks;
      for (let i = 0; i < tracks.length; i++) tracks[i].mode = "showing";
    }
  }, [trackUrl]);
  const finish = async (nextId?: string) => {
    const v = video.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) {
      try {
        await window.aurea.progress(
          playing.meta,
          playing.videoId,
          v.currentTime,
          v.duration,
        );
      } catch {
        setSubtitleError("Não foi possível salvar o progresso.");
      }
    }
    if (document.fullscreenElement) await document.exitFullscreen();
    if (nextId) onNext(nextId);
    else onClose();
  };
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused)
      void v
        .play()
        .catch(() => setError("Não foi possível iniciar esta fonte."));
    else v.pause();
  };
  const full = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void container.current
        ?.requestFullscreen()
        .catch(() => setSubtitleError("Tela cheia indisponível."));
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input,select,button,textarea"))
        return;
      const v = video.current;
      if (!v) return;
      const k = event.key.toLowerCase();
      if (
        [
          " ",
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          "f",
          "m",
          "escape",
        ].includes(k)
      )
        event.preventDefault();
      if (k === " ") toggle();
      if (k === "arrowright")
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
      if (k === "arrowleft") v.currentTime = Math.max(0, v.currentTime - 10);
      if (k === "arrowup" || k === "arrowdown") {
        v.volume = Math.max(
          0,
          Math.min(1, v.volume + (k === "arrowup" ? 0.05 : -0.05)),
        );
        setVolume(v.volume);
      }
      if (k === "m") {
        v.muted = !v.muted;
        setVolume(v.muted ? 0 : v.volume);
      }
      if (k === "f") full();
      if (k === "escape" && !document.fullscreenElement) void finish();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div
      className="player"
      ref={container}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Player de vídeo"
    >
      <video
        ref={video}
        crossOrigin="anonymous"
        playsInline
        onClick={toggle}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onEnded={() => {
          if (next && settings.autoplay) void finish(next.id);
        }}
        onError={() => {
          setError(
            "Não foi possível reproduzir a mídia. Fonte indisponível ou codec incompatível.",
          );
          setBuffering(false);
        }}
      >
        {trackUrl && (
          <track
            key={trackUrl}
            kind="subtitles"
            src={trackUrl}
            srcLang={
              ({ por: "pt", eng: "en", spa: "es" } as Record<string, string>)[
                playing.subtitles.find((s) => s.url === subtitle)?.lang ?? ""
              ] ??
              playing.subtitles.find((s) => s.url === subtitle)?.lang ??
              "und"
            }
            label="Legenda selecionada"
            default
          />
        )}
      </video>
      <div className="player-top">
        <button
          className="icon"
          aria-label="Fechar player"
          onClick={() => void finish()}
        >
          <ArrowLeft />
        </button>
        <div>
          <h2>{playing.meta.name}</h2>
          <p>
            {episode?.title ?? "Cinema aberto"}{" "}
            <span>· {stream.name ?? stream.addonName}</span>
          </p>
        </div>
      </div>
      {buffering && !error && (
        <div className="player-center">
          <span className="spinner" />
          <p>Preparando seu cinema…</p>
        </div>
      )}
      {error && (
        <div className="player-center error-card" role="alert">
          <h2>Esta fonte não está disponível</h2>
          <p>{error}</p>
          <button onClick={() => void finish()}>Voltar aos detalhes</button>
        </div>
      )}
      <div className="player-bottom">
        {subtitleError && <p role="status">{subtitleError}</p>}
        <label className="timeline">
          <span className="sr-only">Posição</span>
          <input
            aria-label="Posição"
            type="range"
            min="0"
            max={Number.isFinite(duration) ? duration : 0}
            step="0.1"
            value={position}
            onChange={(e) => {
              video.current!.currentTime = Number(e.target.value);
              setPosition(Number(e.target.value));
            }}
          />
        </label>
        <div className="controls">
          <button
            className="icon"
            aria-label={paused ? "Reproduzir" : "Pausar"}
            onClick={toggle}
          >
            {paused ? <Play /> : <Pause />}
          </button>
          <button
            className="icon"
            aria-label="Voltar 10 segundos"
            onClick={() => {
              video.current!.currentTime = Math.max(0, position - 10);
            }}
          >
            <RotateCcw />
          </button>
          <button
            className="icon"
            aria-label="Avançar 10 segundos"
            onClick={() => {
              video.current!.currentTime = Math.min(duration, position + 10);
            }}
          >
            <RotateCw />
          </button>
          <span className="time">
            {clock(position)} <span>/ {clock(duration)}</span>
          </span>
          <label className="volume">
            {volume ? <Volume2 size={19} /> : <VolumeX size={19} />}
            <input
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const n = Number(e.target.value);
                setVolume(n);
                video.current!.volume = n;
                video.current!.muted = false;
              }}
            />
          </label>
          <div className="control-spacer" />
          <label>
            <span className="sr-only">Fonte</span>
            <select
              aria-label="Fonte de reprodução"
              value={source}
              onChange={(e) => setSource(Number(e.target.value))}
            >
              {playing.streams.map((s, i) => (
                <option key={i} value={i}>
                  {s.name ?? s.addonName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Legendas</span>
            <select
              aria-label="Legendas"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            >
              <option value="">Sem legendas</option>
              {playing.subtitles.map((s, i) => (
                <option key={i} value={s.url}>
                  {s.label ?? s.lang}
                </option>
              ))}
            </select>
          </label>
          <select
            aria-label="Velocidade"
            value={speed}
            onChange={(e) => {
              setSpeed(Number(e.target.value));
              video.current!.playbackRate = Number(e.target.value);
            }}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
          {next && (
            <button
              className="icon"
              aria-label="Próximo episódio"
              onClick={() => void finish(next.id)}
            >
              <SkipForward />
            </button>
          )}
          <button className="icon" aria-label="Tela cheia" onClick={full}>
            <Maximize />
          </button>
        </div>
      </div>
    </div>
  );
}
