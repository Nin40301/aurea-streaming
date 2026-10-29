# Aurea — arquitetura e plano de execução

## Decisões
Electron + React + TypeScript + Vite. Forge gera distribuição Windows x64 e instalador Squirrel por usuário. SQLite usa `node:sqlite` do Node embarcado no Electron, evitando módulos nativos com ABI divergente. O arquivo reside em userData; migrações versionadas por PRAGMA user_version. Perfis isolam lista, favoritos e progresso. Sem conta ou telemetria.

Main é responsável por banco, HTTP de add-ons, cache e validação. Preload expõe métodos específicos e tipados; nunca expõe ipcRenderer, filesystem ou execução de comandos. Renderer React contém navegação e player; contextIsolation=true, sandbox=true, nodeIntegration=false. IPC verifica origem, estrutura e limites dos argumentos. Janelas externas e navegação remota são bloqueadas. CSP permite mídia/imagens HTTP(S), porém scripts apenas locais. Respostas de add-ons nunca viram HTML ou código.

## Módulos
- shared/models: contratos de domínio, schemas de entrada e API.
- main/store: persistência SQLite, perfis, preferências, biblioteca, progresso e add-ons.
- main/addons: transporte público HTTP Stremio, validação Zod, timeout, concorrência limitada, cache limitado, negociação de resources/types/idPrefixes e agregação.
- main/demo: add-on HTTP embarcado com mídia legal distribuída junto do app, catálogo, meta, stream, subtitles e HTTP Range.
- main/index: ciclo de vida Electron, políticas de segurança, IPC e servidor local.
- preload/index: ponte de capacidades.
- renderer: home, pesquisa/categorias, detalhes/episódios, biblioteca, perfis, configurações e player HTMLMediaElement + hls.js.

## Fronteiras e compatibilidade
Somente transporte manifest.json HTTP(S); URLs HTTPS remotas ou loopback HTTP explícito. Sem IPFS, torrent, magnet, scripts de add-ons, DRM ou login de serviços. IDs preservados por fonte e tipo; resolução cross-source apenas quando recurso/tipo/prefixo são declarados. Não se presume equivalência por título. Recursos não suportados são ignorados, sem reivindicar compatibilidade integral com Stremio.

HLS via MSE/hls.js, MP4 pelo Chromium. DASH foi avaliado e permanece explicitamente indisponível na versão inicial. Formatos/DRM/codecs e headers específicos podem limitar fontes externas. Legendas VTT e SRT são recuperadas com limite e convertidas em dados textuais. Nenhum hash OpenSubtitles é fabricado ou enviado nesta versão; consulta por videoID é uma modalidade parcial.

## Ordem verificável
1. Bootstrap que inicia Electron com renderer local.
2. Motor de add-ons e fixture HTTP real, depois persistência.
3. Player real e progresso, biblioteca/perfis.
4. Acabamento visual, acessibilidade e estados de erro.
5. Unitários/integração, automação Electron, empacotamento e execução do instalador.

## Qualidade
Testar validação, URLs, resources, extras, erro HTTP, cache, timeout, persistência reaberta, isolamento de perfis e integração com add-on. Playwright inicia o Electron real e verifica navegação, instalação, MP4/HLS, legendas e retomada. Evidências de execução registradas em VALIDATION.md. Não declarar testes inexistentes como aprovados.


## Persistência entregue
Schema SQLite v2: profiles, prefs, addons, library e playback. Migração v1→v2 transacional preserva os registros e o último progresso antigo; bancos de versão futura são recusados. Chaves de biblioteca usam tupla JSON [tipo, id, origem], evitando colisões de delimitadores. playback mantém posições por episódio, enquanto library mantém a seleção e o último vídeo para continuar. Apenas uma instância por diretório de dados é admitida.

## Build verificado
Vite gera bundles CJS de main/preload com builtins Node externos e renderer local com player lazy. Todas as dependências JavaScript de runtime estão nos bundles; node_modules não entra no pacote instalado. Assets de mídia/licenças são extraResource fora de app.asar. Forge 8.0.1 package produziu PE Windows x64; o maker ZIP exige Node 24 LTS devido a API removida no Node 26. Esse limite de ferramenta não afeta o aplicativo instalado.
