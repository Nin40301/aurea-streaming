import { useState } from "react";
import {
  Play,
  ArrowUpRight,
  Plus,
  Check,
  Compass,
  Film,
  Layers,
  Library,
  Puzzle,
  Settings,
} from "lucide-react";
import type { Meta, Snapshot } from "../shared/models";
export type Destination =
  "home" | "movie" | "series" | "library" | "addons" | "settings";
export function SideNavigation({
  page,
  onNavigate,
}: {
  page: Destination;
  onNavigate: (p: Destination) => void;
}) {
  return (
    <aside className="side-navigation">
      <div className="side-monogram">
        A<span>AUREA</span>
      </div>
      <span className="side-caption">SEU UNIVERSO</span>
      <nav aria-label="Explorar">
        {(
          [
            ["home", "Descobrir", Compass],
            ["movie", "Filmes", Film],
            ["series", "Séries", Layers],
            ["library", "Biblioteca", Library],
            ["addons", "Conexões", Puzzle],
            ["settings", "Preferências", Settings],
          ] as const
        ).map(([id, name, Icon]) => (
          <button
            aria-label={
              id === "home"
                ? "Início"
                : id === "library"
                  ? "Minha Lista"
                  : id === "addons"
                    ? "Add-ons"
                    : id === "settings"
                      ? "Configurações"
                      : name
            }
            key={id}
            className={page === id ? "selected" : ""}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <div className="side-note">
        CINEMA ABERTO
        <br />
        <span>Uma perspectiva diferente.</span>
      </div>
    </aside>
  );
}
export function DiscoveryHome({
  items,
  state,
  open,
  play,
  toggle,
  variant = "editorial",
}: {
  items: Meta[];
  state: Snapshot;
  open: (m: Meta) => void;
  play: (m: Meta) => void;
  toggle: (m: Meta) => void;
  variant?: "cinema" | "editorial" | "nextgen";
}) {
  const [index, setIndex] = useState(0);
  const selected = items[index % Math.max(items.length, 1)];
  if (!selected) return null;
  const saved = state.library.some(
    (i) =>
      i.listed &&
      i.meta.id === selected.id &&
      i.meta.addonUrl === selected.addonUrl,
  );
  return (
    <section className={"discovery-home " + variant}>
      <div className="discovery-intro">
        <div>
          <span className="eyebrow">AUREA / CURADORIA ABERTA</span>
          <h1>
            {variant === "cinema"
              ? "A luz se apaga. A história começa."
              : variant === "nextgen"
                ? "Histórias em movimento."
                : "Encontre seu próximo universo."}
          </h1>
        </div>
        <span className="discovery-count">
          {items.length} títulos
          <br />
          nas suas conexões
        </span>
      </div>
      <div className="editorial-stage">
        <div className="feature-frame">
          <img src={selected.background ?? selected.poster} alt="" />
          <div className="feature-scrim" />
          <div className="feature-label">
            EM FOCO <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="feature-story">
            <span>{selected.genres.join(" / ")}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div>
              <button className="primary" onClick={() => play(selected)}>
                <Play size={18} fill="currentColor" />
                Assistir agora
              </button>
              <button className="feature-detail" onClick={() => open(selected)}>
                Conhecer a história
                <ArrowUpRight size={18} />
              </button>
              <button
                className="round"
                aria-label="Adicionar destaque à lista"
                onClick={() => toggle(selected)}
              >
                {saved ? <Check /> : <Plus />}
              </button>
            </div>
          </div>
        </div>
        <div className="editorial-picks">
          <header>
            <span>NA SUA ÓRBITA</span>
            <small>Selecione um universo</small>
          </header>
          {items
            .filter((_, i) => i !== index)
            .slice(0, 3)
            .map((m) => (
              <button
                key={m.addonUrl + m.id}
                className="editorial-pick"
                onClick={() => setIndex(items.indexOf(m))}
              >
                <img src={m.poster ?? m.background} alt="" />
                <div>
                  <small>{m.type === "series" ? "COLEÇÃO" : "FILME"}</small>
                  <h3>{m.name}</h3>
                  <span>
                    {m.releaseInfo} · {m.genres[0]}
                  </span>
                </div>
                <ArrowUpRight size={18} />
              </button>
            ))}
          <button className="pick-link" onClick={() => open(selected)}>
            Todos os detalhes de {selected.name}
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
      <div className="genre-strip">
        {[...new Set(items.flatMap((m) => m.genres))].map((g) => (
          <button
            key={g}
            onClick={() => {
              const m = items.find((i) => i.genres.includes(g));
              if (m) setIndex(items.indexOf(m));
            }}
          >
            {g}
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}
