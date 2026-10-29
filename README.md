# Aurea

Aplicativo desktop Windows para catálogos extensíveis e mídia autorizada. Electron, React, TypeScript, Vite, SQLite e Electron Forge. Interface própria em português, com destaque cinematográfico, pesquisa, categorias, detalhes/episódios, perfis locais, lista, favoritos e progresso.

## Instalar e usar

1. Execute **Aurea-1.0.1-Setup.exe**. O instalador Squirrel instala por usuário, sem necessidade de administrador, e cria um atalho Aurea. A distribuição desta entrega não possui assinatura Authenticode nem atualização automática.
2. Abra **Aurea** e escolha “Meu cinema”, ou crie seu perfil.
3. Use “Assistir agora”, escolha **MP4 · local** ou **HLS · local**. Os dois trailers Blender estão incluídos e funcionam sem internet. “Mundos da Blender” reúne esses mesmos trailers como episódios de uma coleção de demonstração.
4. Use **+** para Minha Lista e o coração nos detalhes para Favoritos. O progresso é salvo a cada três segundos, ao pausar e antes de fechar o player; episódios têm posições independentes. Fechar o aplicativo abruptamente pode perder os últimos três segundos.
5. Em **Add-ons**, instale a URL completa de um manifest compatível. Somente fontes autorizadas e URLs reproduzíveis por Chromium devem ser usadas.

A distribuição ZIP portátil contém a pasta completa. Extraia tudo e execute **Aurea.exe** dentro dela. O EXE depende das DLLs, recursos e assets ao lado; não o mova sozinho. Tanto o ZIP quanto o instalador incluem o runtime e dispensam Node.js na máquina do usuário.

## Navegação e player

Mouse, Tab/Shift+Tab e Enter funcionam em botões e campos. `/` foca a busca; Escape fecha detalhes/fontes. No player, com o foco na superfície do vídeo: Espaço alterna reprodução, setas horizontais avançam/voltam dez segundos, verticais ajustam volume, M silencia, F alterna tela cheia e Escape retorna. Campos e seletores preservam seus atalhos próprios. O foco é limitado aos diálogos enquanto estão abertos.

Player: play/pause, seek, volume, velocidade, fonte MP4/HLS, legendas WebVTT/SRT e próximo episódio. Ao terminar um episódio, a reprodução automática avança se estiver habilitada. HLS pode selecionar qualidade adaptativamente pelo hls.js. O adaptador identifica HLS pela extensão `.m3u8` da URL; endpoints sem essa indicação podem exigir adaptação adicional. Não há um seletor manual de bitrate/faixa de áudio nesta versão.

Preferências: reprodução automática, movimento reduzido, volume inicial e limpeza do cache. Perfis têm nome e cor; podem ser criados, renomeados e excluídos em Gerenciar perfis. Lista, favoritos e histórico são por perfil; add-ons e preferências são compartilhados neste computador. Recomendações locais agrupam gêneros do histórico/favoritos e são identificadas como tal.

## Add-ons e protocolo

Compatibilidade **parcial** com o [protocolo público Stremio](https://stremio.github.io/stremio-addon-sdk/protocol.html):

| Recurso | Comportamento |
|---|---|
| `manifest.json` | Valida identidade, versão, tipos, recursos string/objeto e catálogos. Instalação, remoção e habilitação persistem. |
| `catalog` | Agrega até 40 catálogos por consulta; extras search/genre/skip quando declarados; paginação de 100 em 100. Catálogos sem skip são feeds da primeira página. |
| `meta` | Preserva tipo, ID e origem. Consulta provedores habilitados compatíveis e valida a identidade retornada. Séries usam a lista videos e seus IDs reais. |
| `stream` | Aceita URLs HTTP(S) diretas e compatíveis, de qualquer fonte habilitada que declare o tipo/prefixo. Mostra o provedor para escolha. Não reproduz infoHash, magnet, externalUrl, headers especiais, notWebReady ou scripts. |
| `subtitles` | Solicita por videoID, lê VTT/SRT UTF-8 até 1 MiB e converte SRT para WebVTT. Não inventa videoHash; provedores que exigem hash/tamanho/nome de arquivo não terão cobertura completa. |

Remotos precisam de HTTPS; loopback explícito aceita HTTP. A URL deve terminar em `/manifest.json`, sem query ou fragmento (configurações em segmentos de caminho são aceitas). Transportes IPFS, `stremio://`, protocolo legado, eventos player/library, configuração interativa e EPG não estão implementados. IDs de fontes diferentes não são unidos por semelhança de título. Há limite de 20 add-ons, quatro consultas HTTP simultâneas, 60 consultas/minuto por origem, respostas JSON até 4 MiB e timeout de oito segundos. Cache em memória por dois minutos, até 150 entradas; não é biblioteca offline de conteúdos externos.

Metadados inválidos são descartados; um catálogo sem nenhum item válido é sinalizado. Erros de fontes são isolados para preservar os demais catálogos. Busca remota respeita o extra declarado e filtra também título/sinopse/gêneros retornados. Não há busca por elenco ou algoritmo privado de recomendação. Manifests são JSON e não executam código no aplicativo.

## Add-on de demonstração

O app inicia um servidor apenas em `127.0.0.1`, com porta livre, durante a sessão. Em Add-ons aparece a URL atual, que também pode ser instalada em outro cliente compatível na mesma máquina enquanto o Aurea estiver aberto. A identidade interna `builtin:demo` mantém biblioteca/progresso estáveis entre reinícios e portas diferentes.

Para executar esse servidor separadamente durante desenvolvimento:

```powershell
npm run demo:addon
```

URL padrão: `http://127.0.0.1:17461/manifest.json`. Implementação em `src/main/demo.ts`, com catalog/meta/stream/subtitles e suporte HTTP Range para seek. Mídias e quadros sob CC BY 3.0, com créditos em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). A faixa de legenda da demonstração apresenta créditos; não é tradução de diálogos.

## Desenvolvimento e build Windows x64

Pré-requisitos: Windows 10/11 x64 e **Node.js 24 LTS**, npm e internet na preparação. Não requer Visual Studio ou compilação de bindings SQLite. O lockfile fixa as versões; runtime Electron 45.1.0, Forge 8.0.1 e Vite 8.3.5 nesta entrega.

```powershell
npm ci
npm run setup:runtime
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm start
```

Electron 45 distribui a ferramenta `install-electron` separadamente do download do runtime. `setup:runtime` executa o instalador oficial apenas quando necessário e prepara o 7-Zip do electron-winstaller. O script evita depender de install scripts que algumas versões do npm bloqueiam.

Para distribuir:

```powershell
npm run make
```

Forge gera `out/Aurea-win32-x64/Aurea.exe`, `out/make/squirrel.windows/x64/Aurea-1.0.1-Setup.exe` e ZIP em `out/make/zip/win32/x64/`. Os hooks incluem os textos de licença antes do empacotamento. Há também `npm run package`, `npm run format` e `npm run format:check`.

`npm run dev` atualmente recompila e inicia a aplicação local; não fornece HMR. Os bundles main, preload e renderer têm configs Vite independentes. O player é carregado sob demanda. Vite avisa sobre a diretiva React `use client` em Lucide e o chunk do hls.js maior que 500 KiB; os avisos são conhecidos e não impediram o build nem os testes.

Testes Playwright iniciam o Electron real, sem navegador adicional. Para rodar contra uma instalação/versão empacotada:

```powershell
$env:AUREA_EXECUTABLE = 'C:\caminho\Aurea.exe'
npm run test:e2e
Remove-Item Env:AUREA_EXECUTABLE
```

Os testes usam bancos temporários em `../../work/` e não alteram os perfis do usuário. `AUREA_DATA_DIR` permite diretório alternativo para diagnóstico. Evite apontá-lo para um diretório com dados de outro programa.

## Dados, segurança e limites reais

SQLite normalmente em `%APPDATA%\Aurea\aurea.sqlite`. Schema v2, migração v1→v2 testada. Para backup, feche o app e copie o diretório de dados completo. Manifests/URLs e histórico ficam em texto no banco local, sem criptografia. Não há contas, sincronização em nuvem, bloqueio infantil, telemetria própria ou serviço comercial de vídeo.

Renderer local com contextIsolation, sandbox e Node desabilitado; IPC tipado com schemas e validação de remetente, CSP, bloqueio de navegação/webviews/janelas externas e permissões negadas exceto tela cheia local. O transporte valida URLs/redirecionamentos e endereços privados óbvios. Isso não equivale a uma sandbox de rede completa contra DNS rebinding; não se deve tratar o aplicativo como ferramenta de análise de servidores hostis. Imagens e mídias remotas usam a rede Chromium e não passam pelo limitador de JSON.

MP4/HLS dependem de codecs, CORS e autorização da origem. DASH foi avaliado e está explicitamente indisponível; DRM, torrents, transcodificação de mídia externa, downloads, login Netflix e catálogo Netflix não são suportados. O app não contorna autenticação ou controles de acesso. Sem promessa de equivalência de escala, recomendações ou disponibilidade de um serviço comercial.

Consulte [RESEARCH.md](RESEARCH.md), [ARCHITECTURE.md](ARCHITECTURE.md) e [VALIDATION.md](VALIDATION.md) para evidências, decisões e o que foi efetivamente validado.


### Compatibilidade do ambiente de build

Typecheck, lint, Vite e testes também passaram com Node 26.13.0 do host. Entretanto o maker ZIP do Forge 8.0.1 usa uma dependência antiga (`cross-zip`) que chama `fs.rmdir({recursive:true})`, removido no Node 26. Por isso o empacotamento final utiliza Node 24.22.2 LTS, sem alterar o Node do sistema. Use Node 24 no PATH ao executar `npm run make`. Na primeira distribuição os makers foram retomados com o CLI oficial `electron-forge make --from-package --platform=win32 --arch=x64` sob Node 24. A entrega final 1.0.1 usa o fluxo completo `npm run make` sob Node 24, incluindo build, package e ambos os makers. A advertência de API depreciada é da ferramenta de compactação; o runtime do aplicativo é independente do Node instalado.
