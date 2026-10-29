import { DiscoveryHome, SideNavigation } from "./Discovery";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  Search,
  Plus,
  Check,
  Play,
  Info,
  Heart,
  ArrowRight,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Film,
  CheckCircle2,
} from "lucide-react";
import type {
  CatalogResult,
  Meta,
  Row,
  Snapshot,
  Stream,
  Subtitle,
} from "../shared/models";
import type { Playing } from "./Player";
const Player = lazy(() =>
  import("./Player").then((m) => ({ default: m.Player })),
);
import { Addons, Profiles, Preferences } from "./Management";
import { useDialogFocus } from "./focus";
type Page = "home" | "movie" | "series" | "library" | "addons" | "settings";
type Sources = {
  meta: Meta;
  videoId: string;
  streams: Stream[];
  subtitles: Subtitle[];
  errors: string[];
};
export const same = (a: Meta, b: Meta) =>
  a.id === b.id && a.type === b.type && a.addonUrl === b.addonUrl;
export function Picture({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  return !bad && src && /^https?:\/\//.test(src) ? (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={className?.includes("hero") ? "eager" : "lazy"}
      width={1280}
      height={720}
      onError={() => setBad(true)}
    />
  ) : (
    <div className={"picture-fallback " + (className ?? "")}>
      <Film aria-hidden="true" />
      <span>{alt}</span>
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <Film size={36} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button onClick={action}>
          Explorar catálogos <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
function Card({
  item,
  wide = true,
  state,
  open,
  toggle,
}: {
  item: Meta;
  wide?: boolean;
  state: Snapshot;
  open: (m: Meta) => void;
  toggle: (m: Meta) => void;
}) {
  const saved = state.library.find((i) => same(i.meta, item));
  return (
    <article className={"card " + (wide ? "landscape" : "")}>
      <button
        className="card-open"
        onClick={() => open(item)}
        aria-label={"Detalhes de " + item.name}
      >
        <Picture
          src={wide ? (item.background ?? item.poster) : item.poster}
          alt={item.name}
        />
        <span className="card-shade" />
        <span className="format-label">
          {item.type === "series" ? "COLEÇÃO" : "FILME"}
        </span>
        <span className="card-play">
          <Play fill="currentColor" size={20} />
        </span>
        <span className="card-title">
          <strong>{item.name}</strong>
          <small>
            {item.releaseInfo ?? "Cinema independente"} <span>·</span>{" "}
            {item.type === "series" ? "Série" : (item.runtime ?? "Filme")}
          </small>
        </span>
      </button>
      <button
        className={"card-save " + (saved?.listed ? "selected" : "")}
        aria-label={
          (saved?.listed ? "Remover da lista: " : "Adicionar à lista: ") +
          item.name
        }
        onClick={() => toggle(item)}
      >
        {saved?.listed ? <Check size={17} /> : <Plus size={17} />}
      </button>
      {saved &&
        saved.duration > 0 &&
        saved.position > 0 &&
        saved.position < saved.duration - 2 && (
          <div className="card-progress">
            <i
              style={{
                width:
                  Math.min(100, (saved.position / saved.duration) * 100) + "%",
              }}
            />
          </div>
        )}
    </article>
  );
}
function Rail({
  row,
  state,
  open,
  toggle,
}: {
  row: Row;
  state: Snapshot;
  open: (m: Meta) => void;
  toggle: (m: Meta) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="rail">
      <header className="section-head">
        <div>
          <span className="eyebrow">{row.addonName}</span>
          <h2>
            {row.name}
            <span className="count">{row.items.length}</span>
          </h2>
        </div>
        <div className="rail-arrows">
          <button
            className="icon"
            aria-label={"Anterior: " + row.name}
            onClick={() =>
              ref.current?.scrollBy({ left: -600, behavior: "smooth" })
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon"
            aria-label={"Próximo: " + row.name}
            onClick={() =>
              ref.current?.scrollBy({ left: 600, behavior: "smooth" })
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <div className="rail-items" ref={ref}>
        {row.items.map((item) => (
          <Card
            key={item.addonUrl + item.type + item.id}
            item={item}
            wide={row.items[0]?.type !== "movie"}
            state={state}
            open={open}
            toggle={toggle}
          />
        ))}
      </div>
    </section>
  );
}
export function App() {
  const [state, setState] = useState<Snapshot>(),
    [bootError, setBootError] = useState(""),
    [profiles, setProfiles] = useState(true),
    [page, setPage] = useState<Page>("home"),
    [catalog, setCatalog] = useState<CatalogResult>({ rows: [], errors: [] }),
    [busy, setBusy] = useState(true),
    [search, setSearch] = useState(""),
    [genre, setGenre] = useState(""),
    [skip, setSkip] = useState(0),
    [detail, setDetail] = useState<Meta>(),
    [detailBusy, setDetailBusy] = useState(false),
    [detailError, setDetailError] = useState(""),
    [season, setSeason] = useState(1),
    [sources, setSources] = useState<Sources>(),
    [playing, setPlaying] = useState<Playing>(),
    [resolving, setResolving] = useState(false),
    [toast, setToast] = useState(""),
    [refresh, setRefresh] = useState(0),
    [libraryTab, setLibraryTab] = useState("listed");
  const searchRef = useRef<HTMLInputElement>(null),
    detailVersion = useRef(0),
    sourceVersion = useRef(0),
    main = useRef<HTMLElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6000);
  }, []);
  const sourceDialog = useRef<HTMLElement>(null);
  useDialogFocus(sourceDialog, !!sources);
  const reload = () =>
    window.aurea
      .snapshot()
      .then(setState)
      .catch((e) => notify(e.message));
  useEffect(() => {
    window.aurea
      .snapshot()
      .then(setState)
      .catch((e) => setBootError(e.message));
  }, []);
  useEffect(() => {
    let active = true;
    setBusy(true);
    const timer = setTimeout(
      () => {
        window.aurea
          .catalog({
            ...(page === "movie" || page === "series" ? { type: page } : {}),
            ...(search ? { search } : {}),
            ...(genre ? { genre } : {}),
            ...(skip ? { skip } : {}),
          })
          .then((result) => {
            if (active) setCatalog(result);
          })
          .catch((e) => {
            if (active) setCatalog({ rows: [], errors: [e.message] });
          })
          .finally(() => {
            if (active) setBusy(false);
          });
      },
      search ? 350 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, search, genre, skip, refresh]);
  useEffect(() => {
    document.documentElement.dataset.motion = state?.settings.reducedMotion
      ? "reduced"
      : "normal";
  }, [state?.settings.reducedMotion]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !playing &&
        !(e.target as HTMLElement).matches("input,textarea,select")
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && !playing) {
        if (sources) {
          setSources(undefined);
          sourceVersion.current++;
        } else if (detail) {
          setDetail(undefined);
          detailVersion.current++;
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [playing, sources, detail]);
  const navigate = (value: Page) => {
    setPage(value);
    setSearch("");
    setGenre("");
    setSkip(0);
    setDetail(undefined);
    detailVersion.current++;
    main.current?.scrollTo(0, 0);
  };
  const open = async (item: Meta) => {
    const version = ++detailVersion.current;
    setDetail(item);
    setDetailBusy(true);
    setDetailError("");
    setSeason(1);
    main.current?.scrollTo(0, 0);
    try {
      const meta = await window.aurea.meta(item);
      if (version === detailVersion.current) {
        setDetail(meta);
        setSeason(meta.videos?.[0]?.season ?? 1);
      }
    } catch (e) {
      if (version === detailVersion.current)
        setDetailError((e as Error).message);
    } finally {
      if (version === detailVersion.current) setDetailBusy(false);
    }
  };
  const resolve = async (item: Meta, id?: string) => {
    if (resolving) return;
    const version = ++sourceVersion.current;
    setResolving(true);
    try {
      const meta = await window.aurea.meta(item);
      const saved = state?.library.find((i) => same(i.meta, meta));
      const videoId =
        id ??
        (meta.type === "series"
          ? saved?.videoId && meta.videos?.some((v) => v.id === saved.videoId)
            ? saved.videoId
            : meta.videos?.[0]?.id
          : meta.id);
      if (!videoId)
        throw Error("Este título ainda não tem episódios disponíveis.");
      const result = await window.aurea.sources(meta, videoId);
      if (version === sourceVersion.current)
        setSources({ ...result, meta, videoId });
    } catch (e) {
      notify((e as Error).message);
    } finally {
      if (version === sourceVersion.current) setResolving(false);
    }
  };
  const toggle = async (item: Meta, field: "listed" | "favorite") => {
    const existing = state?.library.find((i) => same(i.meta, item));
    try {
      setState(await window.aurea.library(item, field, !existing?.[field]));
    } catch (e) {
      notify((e as Error).message);
    }
  };
  if (bootError)
    return (
      <div className="boot">
        <h1>Aurea</h1>
        <h2>Não foi possível abrir a biblioteca</h2>
        <p role="alert">{bootError}</p>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </div>
    );
  if (!state)
    return (
      <div className="boot">
        <span className="wordmark">AUREA</span>
        <span className="spinner" />
        <p>Abrindo seu cinema…</p>
      </div>
    );
  const current = state.profiles.find((p) => p.id === state.activeProfile)!;
  const all = catalog.rows.flatMap((r) => r.items);
  const unique = all.filter((m, i, a) => a.findIndex((o) => same(m, o)) === i);
  const hero = unique.find((m) => m.type === "movie") ?? unique[0];
  const genres = [...new Set(all.flatMap((m) => m.genres))].sort();
  const listed = state.library.filter((i) => i.listed),
    continued = state.library.filter(
      (i) => i.position > 1 && i.duration > 0 && i.position < i.duration - 2,
    ),
    favorites = state.library.filter((i) => i.favorite);
  const favoriteGenres = new Set(
    state.library
      .filter((i) => i.favorite || i.position > 1)
      .flatMap((i) => i.meta.genres),
  );
  const recommended = unique.filter(
    (m) =>
      m.genres.some((g) => favoriteGenres.has(g)) &&
      !state.library.some(
        (i) =>
          same(i.meta, m) && i.position >= i.duration - 2 && i.duration > 0,
      ),
  );
  const rail = (row: Row) => (
    <Rail
      key={row.id}
      row={row}
      state={state}
      open={(m) => void open(m)}
      toggle={(m) => void toggle(m, "listed")}
    />
  );
  return (
    <div className="app aurea-v12 aurea-v20">
      {profiles ? (
        <Profiles
          state={state}
          onState={setState}
          onSelect={() => {
            setProfiles(false);
            setDetail(undefined);
            setPage("home");
          }}
          notify={notify}
        />
      ) : (
        <>
          <div inert={!!sources || !!playing}>
            <SideNavigation page={page} onNavigate={navigate} />
          </div>
          <header className="topbar" inert={!!sources || !!playing}>
            <button
              className="brand"
              aria-label="Aurea início"
              onClick={() => navigate("home")}
            >
              <span className="brand-symbol">A</span>
              <span>AUREA</span>
            </button>

            <div className={"search " + (search ? "has-value" : "")}>
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label="Buscar títulos"
                placeholder="Títulos, gêneros…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDetail(undefined);
                  detailVersion.current++;
                  setSkip(0);
                  if (["addons", "settings", "library"].includes(page))
                    setPage("home");
                }}
              />
              {search && (
                <button aria-label="Limpar busca" onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
              <kbd>/</kbd>
            </div>
            <button
              className="avatar"
              title={"Trocar perfil: " + current.name}
              aria-label="Trocar perfil"
              style={{ background: current.color }}
              onClick={() => setProfiles(true)}
            >
              {current.name[0].toUpperCase()}
            </button>
          </header>
          <main ref={main} id="main-content" inert={!!sources || !!playing}>
            {detail ? (
              <>
                <section className="detail-hero">
                  <Picture
                    src={detail.background ?? detail.poster}
                    alt=""
                    className="detail-image"
                  />
                  <div className="hero-vignette" />
                  <div className="detail-copy">
                    <button
                      className="back"
                      onClick={() => {
                        setDetail(undefined);
                        detailVersion.current++;
                      }}
                    >
                      <ArrowLeft size={17} /> Voltar
                    </button>
                    <span className="eyebrow">{detail.addonName}</span>
                    <h1>{detail.name}</h1>
                    <div className="meta-line">
                      <span className="gold">
                        {detail.type === "series" ? "SÉRIE" : "FILME"}
                      </span>
                      <span>{detail.releaseInfo}</span>
                      <span>{detail.runtime}</span>
                      <span className="quality">ADD-ON</span>
                    </div>
                    <p>
                      {detail.description ??
                        "Esta fonte não forneceu uma sinopse."}
                    </p>
                    <div className="hero-actions">
                      <button
                        className="primary"
                        disabled={resolving || detailBusy}
                        onClick={() => void resolve(detail)}
                      >
                        <Play size={19} fill="currentColor" />
                        {resolving ? "Buscando fontes…" : "Assistir"}
                      </button>
                      <button
                        className="secondary"
                        onClick={() => void toggle(detail, "listed")}
                      >
                        {state.library.find((i) => same(i.meta, detail))
                          ?.listed ? (
                          <Check size={19} />
                        ) : (
                          <Plus size={19} />
                        )}
                        Minha Lista
                      </button>
                      <button
                        className={
                          "round " +
                          (state.library.find((i) => same(i.meta, detail))
                            ?.favorite
                            ? "liked"
                            : "")
                        }
                        aria-label="Favoritar título"
                        onClick={() => void toggle(detail, "favorite")}
                      >
                        <Heart size={20} />
                      </button>
                    </div>
                    <div className="tags">
                      {detail.genres.map((g) => (
                        <span key={g}>{g}</span>
                      ))}
                    </div>
                    {detailBusy && (
                      <p className="muted" role="status">
                        Carregando detalhes…
                      </p>
                    )}
                    {detailError && (
                      <p className="error-inline" role="alert">
                        {detailError}{" "}
                        <button onClick={() => void open(detail)}>
                          Tentar novamente
                        </button>
                      </p>
                    )}
                  </div>
                </section>
                {detail.type === "series" && (
                  <section className="episodes">
                    <div className="section-head">
                      <h2>Episódios</h2>
                      <select
                        aria-label="Temporada"
                        value={season}
                        onChange={(e) => setSeason(Number(e.target.value))}
                      >
                        {[...new Set(detail.videos?.map((v) => v.season ?? 1))]
                          .sort((a, b) => a - b)
                          .map((s) => (
                            <option key={s} value={s}>
                              Temporada {s}
                            </option>
                          ))}
                      </select>
                    </div>
                    {!detail.videos?.length && !detailBusy ? (
                      <Empty
                        title="Sem episódios disponíveis"
                        text="Este add-on ainda não forneceu os vídeos da série."
                      />
                    ) : (
                      detail.videos
                        ?.filter((v) => (v.season ?? 1) === season)
                        .map((v) => (
                          <button
                            className="episode"
                            disabled={resolving}
                            key={v.id}
                            onClick={() => void resolve(detail, v.id)}
                          >
                            <span className="episode-number">
                              {v.episode ?? "▶"}
                            </span>
                            <Picture
                              src={v.thumbnail ?? detail.background}
                              alt=""
                            />
                            <div>
                              <h3>{v.title}</h3>
                              <p>
                                {v.overview ??
                                  "Selecione para consultar as fontes disponíveis."}
                              </p>
                            </div>
                            <Play size={23} />
                          </button>
                        ))
                    )}
                  </section>
                )}
                <div className="detail-note">
                  Disponibilidade, sinopse e mídia fornecidas pelos add-ons
                  habilitados. Créditos dos trailers: Blender Foundation · CC BY
                  3.0.
                </div>
              </>
            ) : page === "addons" ? (
              <Addons
                state={state}
                onState={setState}
                changed={() => setRefresh((n) => n + 1)}
                notify={notify}
              />
            ) : page === "settings" ? (
              <Preferences
                state={state}
                onState={setState}
                changed={() => setRefresh((n) => n + 1)}
                notify={notify}
              />
            ) : page === "library" && !search ? (
              <section className="page-body">
                <span className="eyebrow">BIBLIOTECA DE {current.name}</span>
                <h1>Seu próximo play começa aqui.</h1>
                <p className="lead">
                  Histórias que você guardou, curtiu ou deixou para continuar.
                </p>
                <div className="tabs">
                  {[
                    ["listed", "Minha Lista", listed.length],
                    ["favorite", "Favoritos", favorites.length],
                    ["continue", "Continuar assistindo", continued.length],
                  ].map(([key, label, count]) => (
                    <button
                      className={libraryTab === key ? "active" : ""}
                      onClick={() => setLibraryTab(String(key))}
                      key={key}
                    >
                      {label}
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
                {(libraryTab === "listed"
                  ? listed
                  : libraryTab === "favorite"
                    ? favorites
                    : continued
                ).length ? (
                  <div className="card-grid">
                    {(libraryTab === "listed"
                      ? listed
                      : libraryTab === "favorite"
                        ? favorites
                        : continued
                    ).map((i) => (
                      <Card
                        key={i.meta.addonUrl + i.meta.id}
                        item={i.meta}
                        state={state}
                        open={(m) => void open(m)}
                        toggle={(m) => void toggle(m, "listed")}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Uma boa história ainda vai chegar"
                    text="Explore os catálogos e use + para salvar títulos. Seu progresso aparece aqui automaticamente."
                    action={() => navigate("home")}
                  />
                )}
              </section>
            ) : (
              <>
                {!search && page === "home" && hero && (
                  <DiscoveryHome
                    items={unique}
                    state={state}
                    open={(m) => void open(m)}
                    play={(m) => void resolve(m)}
                    toggle={(m) => void toggle(m, "listed")}
                    variant={
                      localStorage.getItem("aurea-preview") === "cinema"
                        ? "cinema"
                        : localStorage.getItem("aurea-preview") === "nextgen"
                          ? "nextgen"
                          : "editorial"
                    }
                  />
                )}
                <div
                  className={
                    "catalog-body " +
                    (search || page !== "home" ? "no-hero" : "")
                  }
                >
                  <div className="browse-heading">
                    <div>
                      <span className="eyebrow">
                        {search
                          ? "ENCONTRE SUA PRÓXIMA HISTÓRIA"
                          : page === "home"
                            ? "EXPLORAR SEM PRESSA"
                            : "SEU UNIVERSO DE HISTÓRIAS"}
                      </span>
                      <h1>
                        {search
                          ? `Resultados para “${search}”`
                          : page === "movie"
                            ? "Filmes"
                            : page === "series"
                              ? "Séries"
                              : "Uma janela para outros mundos."}
                      </h1>
                    </div>
                    <div className="filters">
                      <select
                        aria-label="Filtrar por gênero"
                        value={genre}
                        onChange={(e) => {
                          setGenre(e.target.value);
                          setSkip(0);
                        }}
                      >
                        <option value="">Todos os gêneros</option>
                        {[
                          ...new Set([...genres, ...(genre ? [genre] : [])]),
                        ].map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                      <button
                        className="icon"
                        aria-label="Atualizar catálogos"
                        onClick={() =>
                          void window.aurea
                            .clearCache()
                            .then(() => setRefresh((n) => n + 1))
                            .catch((e) => notify(e.message))
                        }
                      >
                        <RefreshCw size={17} />
                      </button>
                    </div>
                  </div>
                  {catalog.errors.length > 0 && (
                    <div className="notice" role="status">
                      <Info size={19} />
                      <div>
                        <strong>Algumas fontes não responderam</strong>
                        {catalog.errors.map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {busy ? (
                    <div
                      className="skeletons"
                      role="status"
                      aria-label="Carregando catálogos"
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} />
                      ))}
                    </div>
                  ) : (
                    <>
                      {!search &&
                        !genre &&
                        page === "home" &&
                        continued.length > 0 &&
                        rail({
                          id: "continue",
                          name: "A história continua",
                          addonName: "CONTINUAR ASSISTINDO",
                          items: continued.map((i) => i.meta),
                        })}
                      {!search &&
                        !genre &&
                        page === "home" &&
                        recommended.length > 0 &&
                        rail({
                          id: "recommend",
                          name: "Talvez seja a sua próxima história",
                          addonName: "PELOS GÊNEROS QUE VOCÊ CURTE",
                          items: recommended,
                        })}
                      {catalog.rows
                        .filter((r) => r.items.length)
                        .map((row) => rail(row))}
                      {!all.length && (
                        <Empty
                          title={
                            search
                              ? "Nenhuma história encontrada"
                              : "Nenhum título disponível"
                          }
                          text={
                            search
                              ? "Experimente outro título ou gênero. A busca depende dos catálogos habilitados."
                              : "Habilite ou instale um add-on em Add-ons, ou altere seus filtros."
                          }
                        />
                      )}
                      <div className="pagination">
                        <button
                          className="secondary"
                          disabled={!skip}
                          onClick={() => setSkip(Math.max(0, skip - 100))}
                        >
                          <ChevronLeft size={16} />
                          Página anterior
                        </button>
                        <span>
                          Página {Math.floor(skip / 100) + 1} · catálogos com
                          paginação
                        </span>
                        <button
                          className="secondary"
                          disabled={
                            !all.length ||
                            !state.addons.some(
                              (a) =>
                                a.enabled &&
                                a.manifest.catalogs.some(
                                  (c) =>
                                    c.extra?.some((e) => e.name === "skip") ||
                                    c.extraSupported?.includes("skip"),
                                ),
                            )
                          }
                          onClick={() => setSkip(skip + 100)}
                        >
                          Próxima página
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            <footer>
              <span className="footer-brand">AUREA</span>
              <span>Cinema aberto. Conexões infinitas.</span>
              <span>
                {state.addons.filter((a) => a.enabled).length} fonte
                {state.addons.filter((a) => a.enabled).length !== 1
                  ? "s"
                  : ""}{" "}
                conectada
                {state.addons.filter((a) => a.enabled).length !== 1 ? "s" : ""}
                <i className="connection-dot" />
              </span>
            </footer>
          </main>
        </>
      )}
      {sources && (
        <div className="modal-scrim" onClick={() => setSources(undefined)}>
          <section
            className="source-modal"
            ref={sourceDialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar fonte"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon modal-close"
              aria-label="Fechar fontes"
              onClick={() => setSources(undefined)}
            >
              <X />
            </button>
            <span className="eyebrow">O CINEMA ESTÁ PRONTO</span>
            <h2>{sources.meta.name}</h2>
            <p className="muted">Escolha uma fonte de um add-on habilitado.</p>
            {sources.streams.map((s, i) => (
              <button
                className="source"
                key={i}
                onClick={() => {
                  setPlaying({ ...sources, index: i });
                  setSources(undefined);
                }}
              >
                <span className="source-icon">
                  <Play size={20} />
                </span>
                <span>
                  <strong>{s.name ?? "Reprodução direta"}</strong>
                  <small>{s.title ?? s.description ?? s.addonName}</small>
                  <small>{s.addonName}</small>
                </span>
                <ArrowRight size={19} />
              </button>
            ))}
            {!sources.streams.length && (
              <Empty
                title="Sem fontes compatíveis"
                text="Este título não tem uma URL HTTP reproduzível nos add-ons habilitados."
              />
            )}
            {sources.errors.map((e, i) => (
              <p className="error-inline" key={i}>
                {e}
              </p>
            ))}
            <p className="source-footnote">
              <CheckCircle2 size={15} />
              Add-ons fornecem dados. Nenhum script remoto é executado.
            </p>
          </section>
        </div>
      )}
      {playing && (
        <Suspense
          fallback={
            <div className="boot player">
              <span className="spinner" />
            </div>
          }
        >
          <Player
            key={playing.videoId}
            playing={playing}
            settings={state.settings}
            history={state.playback}
            onClose={() => {
              setPlaying(undefined);
              void reload();
            }}
            onNext={(id) => {
              const meta = playing.meta;
              const index = playing.index;
              void window.aurea
                .sources(meta, id)
                .then((result) => {
                  if (!result.streams.length)
                    throw Error("Próximo episódio sem fonte compatível.");
                  setPlaying({
                    ...result,
                    meta,
                    videoId: id,
                    index: Math.min(index, result.streams.length - 1),
                  });
                  void reload();
                })
                .catch((e) => notify(e.message));
            }}
          />
        </Suspense>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
