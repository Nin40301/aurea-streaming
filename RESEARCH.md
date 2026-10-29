# Investigação — 28/10/2026

## Escopo e limites
Diretório inicial examinado: apenas outputs/ e work/, sem projeto existente ou AGENTS.md encontrado na árvore de trabalho. Nenhum artefato existente foi sobrescrito. A investigação anterior confirmou REA MCP 6.4.0, protocolo 2025-06-18, 170 ferramentas. Ghidra 12.1.4 e JDK 21 reconhecidos; análise nativa Windows restringe-se a PE x86/x64 compatíveis. Não há alvo Netflix local indicado. Nenhum backend, código privado, autenticação ou DRM Netflix foi acessado.

REA será aplicado ao executável Electron adquirido como dependência deste projeto para inspecionar sua estrutura PE/recursos, sem executar o alvo pela ferramenta. O resultado e suas limitações serão registrados após a instalação. Isso serve à identidade/empacotamento do runtime, não prova comportamento Netflix.

## Referências oficiais consultadas
- Stremio: https://stremio.github.io/stremio-addon-sdk/protocol.html — HTTP manifest + recursos catalog/meta/stream/subtitles, extras no caminho. Compatibilidade será deliberadamente parcial, focada em streams HTTP autorizados.
- Manifest: https://stremio.github.io/stremio-addon-sdk/api/responses/manifest.html — resources string/objeto, tipos e prefixos.
- Electron segurança: https://www.electronjs.org/docs/latest/tutorial/security/ e https://www.electronjs.org/docs/latest/tutorial/context-isolation/ — isolamento, sandbox, IPC restrito, CSP e navegação.
- Bridge: https://www.electronjs.org/docs/latest/api/context-bridge — wrappers explícitos, sem expor IPC genérico.
- Forge/Vite: https://www.electronforge.io/config/plugins/vite — plugin ainda marcado experimental. Decisão: usar Vite diretamente para os três bundles e Forge para package/make; reduz acoplamento a plugin experimental.
- Instalador: https://www.electronforge.io/config/makers/squirrel.windows — Setup.exe, nupkg e RELEASES; eventos Squirrel precisam tratamento.
- HLS: https://github.com/video-dev/hls.js e https://github.com/video-dev/hls.js/blob/master/docs/API.md — depende de MSE/codecs, controle pelo elemento video. Sem suporte DRM nesta aplicação.
- Runtime: https://releases.electronjs.org/?channel=stable — confirmar versão realmente adquirida pelo lockfile/npm.
- Netflix UX pública: https://help.netflix.com/en/node/321880164349028 — navegação superior, busca/categorias e biblioteca/continuar assistindo. Não implica que desktop/TV tenham interface idêntica.

## Hipóteses de produto próprias
Fileiras horizontais, destaque cinematográfico, ações rápidas e persistência local reduzem passos até assistir. Hierarquia escura com acentos âmbar e marca Aurea são escolhas próprias, não reprodução de assets Netflix. Recomendações locais usarão gêneros de favoritos e histórico, com regra explicável; não se presume acesso a algoritmos privados.

## Mídia
Trailers Blender disponibilizados por W3C: https://media.w3.org/2010/05/sintel/trailer.mp4 e https://media.w3.org/2010/05/bunny/trailer.mp4. Créditos/licenças devem acompanhar a distribuição e as capturas usadas como pôster. Catálogo de demonstração é um add-on real e não representa biblioteca comercial.


## Evidência REA obtida
A aquisição npm 45.1.0 não incluía ainda o runtime descompactado. A primeira consulta REA retornou ENOENT; após rodar o instalador oficial da dependência, a segunda consulta completou. Não foi usado esse erro como prova de análise.

`inspect_pe_resources` / provedor `rea-pe-resources` v1 inspecionou `node_modules/electron/dist/electron.exe` de forma estática. Evidência: `ev_644cdc88f5ad833e85455289ccc32afeeeaa8e6f0ac27baf9b9cf57d88bffc9d`. SHA-256 `c579acaab64b1c456bda1693cdf1a2ec7e4de7738b0e2d1b6349d60e8087143c`, 249.798.656 bytes, PE32+, 108 entradas examinadas, 51 recursos, um grupo de ícones. Resumo preservado em `evidence/rea-electron-pe.json`.

Observação: estrutura de recursos PE completa dentro dos limites do parser. Inferência: é um runtime que pode receber identidade/ícone via empacotamento Forge. Desconhecido: carregamento efetivo de ícones pelo shell, comportamento nativo interno e segurança do executável não são estabelecidos por essa inspeção. Não houve necessidade de decompilar o runtime de centenas de MB para implementar um cliente de protocolos públicos. Ghidra permaneceu disponível, mas não foi acionado sem uma pergunta de código nativo que justificasse a análise.

## Avaliação DASH e limites do player
DASH.js (https://dashif.org/dash.js/pages/quickstart/setup.html) é tecnicamente integrável por MSE, mas adicionaria outro motor/fixtures. A versão 1.0 implementa e testa MP4/HLS; MPD apresenta aviso de formato indisponível. Não foi implementado CDM, Widevine, licença ou DRM. HLS ESM usa transmux no renderer com enableWorker=false, evitando um worker externo/remoto; isto é adequado à demonstração, mas pode disputar a thread em streams de alto bitrate. MP4 e HLS usam os codecs do Chromium. CORS e disponibilidade da origem continuam necessários.

## Limitações da observação Netflix
A pesquisa foi documental. Nenhuma sessão autenticada Netflix foi aberta ou observada, nem foram medidos DOM, frames, timings de animações ou algoritmo de recomendação. As transições de 200–350 ms, paleta âmbar, tipografia serifada e regras locais por gênero são decisões próprias. O pequeno acervo embarcado é declarado como demonstração e servido por endpoints reais. O app não faz qualquer integração com a Netflix.

# Investigação pública: experiência de streaming e contratos abertos

Data da consulta: 28/10/2026. Pesquisa limitada a documentação pública dos responsáveis pelos produtos. Não foi iniciada sessão em Netflix, acessado backend privado, copiado código ou material visual proprietário, nem feita observação de reprodução protegida. O conteúdo abaixo é evidência documental; não constitui observação direta de uma sessão autenticada.

## Netflix: evidências documentais e aplicação ao produto

### Navegação, composição e busca

A documentação descreve uma home organizada em fileiras de títulos e atalhos para restringir a navegação a filmes e séries. A busca aceita termos como título, gênero, nomes e idioma; a disponibilidade de atalhos varia por dispositivo. Implicação de projeto: uma busca persistente e filtros de tipo/gênero devem atuar sobre dados efetivamente fornecidos pelos add-ons, exibindo claramente ausência de resultados. Não prometer busca por ator/idioma se os metadados não os incluírem. Fonte: [How to search and browse Netflix](https://help.netflix.com/en/node/47765).

O novo layout documentado para TV usa menu superior com destinos e perfis; reúne lista e progresso em My Netflix. A tecla de voltar pode devolver o foco ao menu. Isso descreve uma variante da experiência, não uma especificação universal de desktop. Implicação: o aplicativo próprio pode adotar navegação superior estável, tela de biblioteca, retorno previsível e foco visível, preservando identidade própria. Fonte: [An update to the Netflix TV experience and layout](https://help.netflix.com/en/node/321880164349028).

### Perfis e biblioteca

A Netflix documenta perfis com nome, preferências, atividade, sugestões, lista e avaliações próprias. Essa separação inspira perfis locais com biblioteca e progresso independentes no SQLite; não implica implementar conta Netflix, sincronização, bloqueio parental ou todas as preferências citadas na fonte. Fonte: [How to create, edit, or delete profiles](https://help.netflix.com/en/node/10421).

My List permite adicionar/remover títulos e consultar a seleção; alguns clientes oferecem filtros e ordenação. A ordem pode refletir relevância e mudanças de disponibilidade. Implicação: manter lista e favoritos como estados explícitos por perfil, oferecer remoção acessível e preservar o registro local quando uma fonte fica indisponível, com aviso correspondente. Fonte: [How to use My List](https://help.netflix.com/en/node/10523).

### Recomendações

A explicação pública menciona histórico, avaliações e atributos dos títulos, além de personalização da escolha e ordem das fileiras. Não divulga algoritmo, pesos ou modelos. Para o novo produto, uma recomendação local explicável por gêneros de itens curtidos/assistidos é hipótese de implementação independente. Deve ser identificada como tal e manter um início útil sem histórico; não alegar equivalência aos modelos privados. Fonte: [How Netflix’s Recommendations System Works](https://help.netflix.com/en/node/100639).

### Player, teclado e acessibilidade

Os atalhos documentados incluem espaço/Enter para play/pause, F para tela cheia, Escape para sair, setas horizontais para 10 segundos, verticais para volume e M para mudo. São referências úteis para consistência no desktop. Evitar atalhos globais enquanto usuário digita ou opera um seletor. Fonte: [Using keyboard shortcuts on Netflix](https://help.netflix.com/en/node/24855).

A documentação de acessibilidade menciona leitores de tela e ajustes de legendas e reprodução. Para este projeto: controles nativos ou botões com rótulos, foco de teclado, contraste e respeito a prefers-reduced-motion. Recursos que dependem de faixas fornecidas pelo vídeo não podem ser garantidos em todos os títulos. Fonte: [Accessibility on Netflix](https://help.netflix.com/en/node/116022/).

### Hipóteses visuais próprias

Destaque cinematográfico, cartões com ampliação discreta, transições curtas, carregamento progressivo e fileiras horizontais são decisões próprias inspiradas na categoria de produto. Duração exata das animações, regras de hover e estrutura DOM da Netflix não foram verificadas e não devem ser apresentadas como fatos. Usar marca, paleta, tipografia e imagens próprias ou licenciadas.

## Stremio: interoperabilidade delimitada

O transporte HTTP possui manifest.json e caminhos /{resource}/{type}/{id}.json, com argumentos adicionais codificados em um segmento extra. Os recursos relevantes são catalog, meta, stream e subtitles. Catalog entrega metadados resumidos; meta detalha um item; séries usam IDs de vídeos/episódios nos pedidos de stream. O protocolo também define transportes e eventos além do escopo deste aplicativo. Fonte: [Stremio Addon Protocol](https://stremio.github.io/stremio-addon-sdk/protocol.html).

O manifest declara identidade, versão, tipos, catálogos e recursos. Recursos podem ser strings ou objetos com tipos e prefixos de ID específicos; filtros por prefixo não se aplicam ao catálogo. Extras declarados permitem expor pesquisa e filtros compatíveis. Instalação por URL não deve ser confundida com executar código do add-on: o cliente solicita JSON e valida dados. Fonte: [Manifest format](https://stremio.github.io/stremio-addon-sdk/api/responses/manifest.html).

Stream suporta representações alternativas, incluindo URL direta, links externos e torrents. Compatibilidade com o protocolo não obriga suportar todos esses formatos. Decisão proposta: reproduzir somente URL HTTP(S) direta compatível com o motor; relatar fontes não suportadas sem tentar mecanismos alternativos. behaviorHints e cabeçalhos especiais podem exigir capacidades específicas. Fonte: [Stream Object](https://stremio.github.io/stremio-addon-sdk/api/responses/stream.html).

Legendas têm id, url e lang, com label opcional. O handler de legendas usa o ID do vídeo e pode receber videoHash, videoSize e filename. Há uma inconsistência entre exemplos/trechos da documentação geral e a página específica; priorizar o contrato atual do handler e manter os campos adicionais opcionais, sem inventar hash. Suportar WebVTT e conversão de SRT como escopo explícito; ASS estilizado exige outro renderizador. Fontes: [Subtitles Object](https://stremio.github.io/stremio-addon-sdk/api/responses/subtitles.html), [defineSubtitlesHandler](https://stremio.github.io/stremio-addon-sdk/api/requests/defineSubtitlesHandler.html).

## Electron e mídia

O modelo oficial separa main (Node, janelas, ciclo de vida), renderer (interface web) e preload (ponte restrita). Aplicação: rede de add-ons e SQLite no main/serviços; React e vídeo no renderer; métodos IPC específicos e tipados no preload. Fonte: [Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model).

A orientação oficial recomenda Node desabilitado para conteúdo remoto, contextIsolation, sandbox, CSP restritiva, validação de remetentes IPC e limites de navegação/janelas. Aplicação: renderer local empacotado, sem HTML remoto nem eval; validar entradas e URLs no processo privilegiado; nunca expor ipcRenderer integral. Fonte: [Security](https://www.electronjs.org/docs/latest/tutorial/security).

HLS.js usa HTMLMediaElement e MediaSource; o suporte final depende dos codecs do runtime e dos segmentos servidos. Todos os recursos HLS precisam de CORS adequado. Suporte à biblioteca não garante reprodução de qualquer m3u8. Testes reais devem verificar metadados, avanço do tempo e seek, além de mensagens de erro. Fonte: [HLS.js — documentação do projeto](https://github.com/video-dev/hls.js).

DASH.js oferece integração com video e bundlers como Vite. Avaliação: é tecnicamente possível adicionar adaptador MPD, mas a validação de MP4/HLS deve preceder essa ampliação. Não declarar DASH funcional sem teste end-to-end. Fonte: [DASH.js Setup](https://dashif.org/dash.js/pages/quickstart/setup.html).

DRM não faz parte da implementação proposta. Nenhuma configuração de CDM/licenças foi verificada; o projeto não deve prometer reprodução de serviços comerciais protegidos. Compatibilidade de container, codec, CORS, autorização e disponibilidade da origem são limites reais separados.

## Checklist de validação derivado

- Instalar manifest válido e rejeitar estrutura inválida, URL indevida e resposta excessiva.
- Verificar timeout, cache, concorrência limitada e erro parcial sem apagar catálogos saudáveis.
- Confirmar resources em forma string/objeto e prefixos de IDs; resolver episódio usando seu id.
- Testar pesquisa pelo extra declarado e filtros realmente disponibilizados.
- Persistir lista, favoritos e progresso por perfil; fechar/reabrir antes de afirmar persistência.
- Verificar player com mídia autorizada: avanço de currentTime, pause, seek, volume, velocidade, legenda, retomada e falhas.
- Testar navegação sem mouse e estados carregando/vazio/indisponível.
- Validar executável empacotado e instalador separadamente do servidor de desenvolvimento.



## Inspeção REA da distribuição própria
Após Forge package, `inspect_pe_resources` inspecionou o Aurea.exe produzido: PE32+, 249.798.656 bytes, 105 entradas e 49 recursos, um grupo de ícones; cobertura estática completa. Evidência `ev_e8ffe5bcb245cb994b4372cb8afb27039f30c424900f12345fb9bfe6021637b8`, SHA-256 `345e3103592807329dc3d44b1cbb0f6e176722dd67744480e6251154194dd9fe`. Detalhes em `evidence/rea-aurea-pe.json`. Propriedades Windows do arquivo indicam ProductName/FileDescription Aurea, versão 1.0.0. A execução foi avaliada separadamente por testes Electron, e não inferida da inspeção PE.

## Achado de build
O maker cross-zip do Forge usa fs.rmdir recursivo, removido no Node 26 do host. O primeiro make falhou nessa etapa após concluir package. A correção de ambiente foi obter Node 24.22.2 Windows x64 do distribuidor oficial https://nodejs.org/dist/latest-v24.x/ e validar o ZIP contra SHASUMS256.txt: `ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2`. O Node de sistema foi preservado. Não se alterou código de dependências para mascarar o erro.


## Artefato final 1.0.1
A revisão final usa o EXE com SHA-256 `801aaa0a4ca9cadf67163ffd12caf4a49992fe0214105ffbe2bac6180ac8dd11`. Evidência REA final `ev_f2a3de9e94c4d657fc27ad25612d56b491758435e5ce0af41a301fc6364a657d`, 105 entradas, 49 recursos e um grupo de ícones. Registros anteriores são candidatos intermediários preservados para rastreabilidade. A rodada final contra a instalação 1.0.1 passou nos cinco fluxos, incluindo avanço do relógio e frames decodificados em MP4/HLS. Resultados e limites em VALIDATION.md.
