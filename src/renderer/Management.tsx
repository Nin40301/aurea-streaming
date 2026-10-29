import { useState, type FormEvent } from "react";
import {
  Plus,
  UserRound,
  Trash2,
  Puzzle,
  ArrowRight,
  MonitorPlay,
  RefreshCw,
} from "lucide-react";
import type { Snapshot, Settings } from "../shared/models";
import { Empty } from "./App";
type Props = {
  state: Snapshot;
  onState: (s: Snapshot) => void;
  notify: (s: string) => void;
};
export function Profiles({
  state,
  onState,
  onSelect,
  notify,
}: Props & { onSelect: () => void }) {
  const [name, setName] = useState(""),
    [manage, setManage] = useState(false),
    [edit, setEdit] = useState("");
  const action = async (
    type: "create" | "select" | "rename" | "delete",
    id: string,
    label?: string,
  ) => {
    try {
      onState(await window.aurea.profile(type, id, label));
      setName("");
      setEdit("");
      if (type === "select") onSelect();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <section className="profiles">
      <div className="profile-brand">
        <span className="brand-symbol">A</span>
        <span>AUREA</span>
      </div>
      <span className="eyebrow">SEU CINEMA COMEÇA AQUI</span>
      <h1>
        Quem vai descobrir
        <br />a próxima história?
      </h1>
      <p>Um universo próprio para cada pessoa.</p>
      <div className="profile-list">
        {state.profiles.map((p) => (
          <div className="profile-item" key={p.id}>
            <button
              className="profile-select"
              onClick={() => {
                if (manage) {
                  setEdit(p.id);
                  setName(p.name);
                } else void action("select", p.id);
              }}
            >
              <span className="profile-face" style={{ background: p.color }}>
                <UserRound size={42} />
              </span>
              <strong>{p.name}</strong>
              {state.activeProfile === p.id && <small>Perfil atual</small>}
            </button>
            {manage && state.profiles.length > 1 && (
              <button
                className="delete-profile"
                aria-label={"Excluir perfil " + p.name}
                onClick={() => {
                  if (
                    window.confirm(
                      "Excluir o perfil " + p.name + " e sua biblioteca local?",
                    )
                  )
                    void action("delete", p.id);
                }}
              >
                <Trash2 size={15} />
                Excluir
              </button>
            )}
          </div>
        ))}
        {state.profiles.length < 8 && (
          <div className="profile-item">
            <button
              className="profile-select"
              onClick={() => {
                setManage(true);
                setEdit("new");
                setName("");
              }}
            >
              <span className="profile-face profile-add">
                <Plus size={35} />
              </span>
              <strong>Novo perfil</strong>
            </button>
          </div>
        )}
      </div>
      {edit && (
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            void action(edit === "new" ? "create" : "rename", edit, name);
          }}
        >
          <input
            aria-label="Nome do perfil"
            placeholder="Nome do perfil"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <button className="primary" type="submit">
            {edit === "new" ? "Criar perfil" : "Salvar nome"}
          </button>
          <button type="button" onClick={() => setEdit("")}>
            Cancelar
          </button>
        </form>
      )}
      <button
        className="profile-manage"
        onClick={() => {
          setManage(!manage);
          setEdit("");
        }}
      >
        {manage ? "Concluir" : "Gerenciar perfis"}
      </button>
      <div className="profile-bottom">SEM CONTA. SEM PRESSA. SEU ESPAÇO.</div>
    </section>
  );
}
export function Addons({
  state,
  onState,
  changed,
  notify,
}: Props & { changed: () => void }) {
  const [url, setUrl] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const install = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      onState(await window.aurea.install(url.trim()));
      setUrl("");
      changed();
      notify("Add-on instalado e validado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="page-body addons">
      <span className="eyebrow">MAIS CONEXÕES, MAIS HISTÓRIAS</span>
      <h1>Seu cinema pode ir além.</h1>
      <p className="lead">
        Conecte catálogos e fontes autorizadas com add-ons compatíveis.
      </p>
      <form onSubmit={(e) => void install(e)} className="install">
        <div>
          <label htmlFor="manifest">Instalar por URL do manifest</label>
          <div className="install-input">
            <Puzzle size={21} />
            <input
              id="manifest"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-addon/manifest.json"
              required
            />
            <button className="primary" disabled={pending}>
              {pending ? (
                "Validando…"
              ) : (
                <>
                  Instalar add-on
                  <Plus size={18} />
                </>
              )}
            </button>
          </div>
          <p>
            HTTPS ou servidor local. Recursos compatíveis: catálogo, detalhes,
            streams HTTP e legendas.
          </p>
        </div>
      </form>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="section-head">
        <h2>
          Suas conexões <span className="count">{state.addons.length}</span>
        </h2>
        <span className="muted">
          {state.addons.filter((a) => a.enabled).length} ativas
        </span>
      </div>
      <div className="addon-list">
        {state.addons.map((a) => (
          <article
            className={"addon-card " + (!a.enabled ? "disabled" : "")}
            key={a.url}
          >
            <div className="addon-emblem">
              <Puzzle size={29} />
            </div>
            <div className="addon-body">
              <div className="addon-title">
                <h3>{a.manifest.name}</h3>
                <span>v{a.manifest.version}</span>
                {a.url === "builtin:demo" && (
                  <span className="badge">INCLUÍDO</span>
                )}
              </div>
              <p>{a.manifest.description}</p>
              <div className="tags">
                {a.manifest.resources
                  .map((r) => (typeof r === "string" ? r : r.name))
                  .filter((r) =>
                    ["catalog", "meta", "stream", "subtitles"].includes(r),
                  )
                  .map((r, i) => (
                    <span key={i}>{r}</span>
                  ))}
              </div>
              <small className="addon-url">
                {a.url === "builtin:demo" ? state.demoUrl : a.url}
              </small>
            </div>
            <div className="addon-actions">
              <label className="switch-label">
                <input
                  aria-label={"Habilitar " + a.manifest.name}
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    onState({
                      ...state,
                      addons: state.addons.map((item) =>
                        item.url === a.url ? { ...item, enabled } : item,
                      ),
                    });
                    void window.aurea
                      .addon(a.url, enabled ? "enable" : "disable")
                      .then((s) => {
                        onState(s);
                        changed();
                      })
                      .catch((e) => {
                        onState(state);
                        notify(e.message);
                      });
                  }}
                />
                <span>{a.enabled ? "Ativo" : "Pausado"}</span>
              </label>
              <button
                className="icon"
                aria-label={"Remover " + a.manifest.name}
                onClick={() =>
                  void window.aurea
                    .addon(a.url, "remove")
                    .then((s) => {
                      onState(s);
                      changed();
                    })
                    .catch((e) => notify(e.message))
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!state.addons.length && (
        <Empty
          title="Seu próximo catálogo está a uma conexão"
          text="Cole uma URL acima, ou restaure o add-on de demonstração abaixo."
        />
      )}
      <div className="addon-info">
        <MonitorPlay size={27} />
        <div>
          <h3>Experimente o cinema aberto</h3>
          <p>
            O add-on incluído serve trailers MP4/HLS e legendas diretamente
            deste aplicativo. Funciona sem internet.
          </p>
          <button className="text-button" onClick={() => setUrl(state.demoUrl)}>
            Usar URL do add-on incluído
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <p className="muted">
        Compatibilidade parcial com o protocolo público Stremio. Sem torrents,
        IPFS, login, DRM ou execução de extensões. Add-ons externos controlam
        seus próprios catálogos e a disponibilidade de mídia.
      </p>
    </section>
  );
}
export function Preferences({
  state,
  onState,
  changed,
  notify,
}: Props & { changed: () => void }) {
  const saveSettings = (settings: Settings) => {
    onState({ ...state, settings });
    void window.aurea.settings(settings).catch((e) => {
      onState(state);
      notify(e.message);
    });
  };
  return (
    <section className="page-body settings">
      <span className="eyebrow">DO SEU JEITO</span>
      <h1>Seu cinema, suas escolhas.</h1>
      <p className="lead">Preferências salvas neste computador.</p>
      <div className="settings-card">
        <h2>Reprodução e experiência</h2>
        {(
          [
            [
              "autoplay",
              "Reprodução automática",
              "Iniciar ao escolher uma fonte e avançar para o próximo episódio.",
            ],
            [
              "reducedMotion",
              "Reduzir movimento",
              "Transições mais suaves e sem animações de entrada.",
            ],
          ] as const
        ).map(([key, title, desc]) => (
          <label className="setting" key={key}>
            <span>
              <strong>{title}</strong>
              <small>{desc}</small>
            </span>
            <input
              type="checkbox"
              checked={state.settings[key]}
              onChange={(e) =>
                saveSettings({ ...state.settings, [key]: e.target.checked })
              }
            />
          </label>
        ))}
        <label className="setting">
          <span>
            <strong>Volume inicial</strong>
            <small>Usado ao iniciar cada sessão do player.</small>
          </span>
          <input
            aria-label="Volume inicial"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={state.settings.volume}
            onChange={(e) =>
              saveSettings({
                ...state.settings,
                volume: Number(e.target.value),
              })
            }
          />
        </label>
        <button
          className="secondary"
          onClick={() =>
            void window.aurea
              .clearCache()
              .then(() => {
                changed();
                notify("Cache dos add-ons limpo.");
              })
              .catch((e) => notify(e.message))
          }
        >
          <RefreshCw size={16} />
          Limpar cache de consultas
        </button>
      </div>
      <div className="settings-card">
        <h2>Aurea 2.0.0</h2>
        <p>Cinema aberto. Uma biblioteca que é sua.</p>
        <p className="muted">
          SQLite local · sem conta · sem telemetria. MP4 e HLS dependem dos
          codecs da fonte. DASH e DRM não são suportados.
        </p>
        <h3>Atalhos do player</h3>
        <p className="shortcuts">
          <kbd>Espaço</kbd> play/pause <kbd>← →</kbd> 10 segundos <kbd>↑ ↓</kbd>{" "}
          volume <kbd>F</kbd> tela cheia <kbd>M</kbd> mudo <kbd>Esc</kbd> voltar
        </p>
        <h3>Créditos de mídia</h3>
        <p className="muted">
          Sintel © Blender Foundation, durian.blender.org · Big Buck Bunny ©
          Blender Foundation, peach.blender.org. Trailers e quadros
          redistribuídos sob CC BY 3.0. Arquivos disponibilizados pelo W3C.
          Conversão para HLS e recortes de imagem feitos para esta demonstração.
        </p>
      </div>
    </section>
  );
}
