# AUREA 1.2.0 — transformação estrutural

## Duas propostas executadas
As duas propostas são componentes React funcionais, usando o catálogo e ações reais (detalhes, lista, reprodução) do add-on. `scripts/proposals.mjs` seleciona o ambiente isolado via localStorage e captura ambas em 1440×900 e 1920×1080. Nenhum filme foi inventado.

- Cinema: composição de palco central, título/ações centralizados e imagem dominante. screenshots/v12-proposal-cinema-1440.png e -1920.png.
- Editorial (escolhida): navegação lateral, cabeçalho de descoberta, palco assimétrico, lista lateral de outras histórias e navegação por gêneros. screenshots/v12-proposal-editorial-1440.png e -1920.png.

Editorial foi escolhida por permitir descobrir outros títulos sem abandonar o contexto. Cinema deixava as fileiras abaixo da dobra. A seleção de gêneros reposiciona o destaque; o filtro de catálogo continua disponível separadamente. A prévia não altera serviços ou biblioteca.

## Alterações reais de estrutura
`Discovery.tsx`: novos componentes SideNavigation e DiscoveryHome. O componente antigo do hero foi removido do App.tsx. Navegação superior por tabs foi removida e substituída pela lateral persistente. A barra superior concentra busca e perfil. Destaque agora é painel editorial com seleção funcional de outras histórias, não imagem de fundo com o mesmo texto reposicionado.

Cards: filmes usam pôster vertical; coleções usam composição horizontal; etiquetas de formato. Detalhes: pôster em coluna própria e informações em coluna separada; episódios em sequência de superfícies independentes. Biblioteca: seletor segmentado e grade, no shell novo. Configurações: duas colunas (preferências/contexto). Add-ons: grade adaptativa de conexões com instalação destacada. Perfis: composição editorial alinhada à esquerda e avatares circulares. Player: ilha de controles flutuante; mecânica de reprodução preservada.

Tokens semânticos e componentes no arquivo v12.css: canvas/panel/accent/text/secondary/radius/gutter. A camada anterior é preservada como base, mas a estrutura nova é React. Microinterações e redução de movimento permanecem. Sidebar recolhe a ícones em janelas menores. Isolamento inert também cobre sidebar durante diálogos/player.

## Validação
Skills frontend-design, ui-ux-pro-max e web-design-guidelines lidas e aplicadas. Guidelines oficiais atualizadas por consulta em 28/10/2026. Typecheck e lint aprovados, 14 testes Vitest aprovados, cinco fluxos Electron aprovados após ajustar a navegação. Capturas finais em screenshots/v12-final-1440.png e v12-final-1920.png; telas adicionais v12-details.png, v12-settings.png, v12-addons.png, v12-library.png e v12-profiles-*.png. Capturas finais sem pageerror observado. Comparação histórica: screenshots/redesign-3-1440.png e -1920.png da 1.1.0.

## Limites
Acervo real pequeno (dois trailers e uma coleção), sem duplicação para preencher fileiras. CSS preserva uma camada legada que pode ser consolidada. Imagens limitadas à resolução da mídia existente. Testes de grandes volumes não constituem benchmark: fileiras usam overflow e content-visibility, mas não há prova de desempenho de milhares de títulos. DASH/DRM e demais limites do README permanecem. As telas secundárias reutilizam seus formulários e controles funcionais; a reconstrução React principal está concentrada no shell/Home/cards, enquanto layouts secundários foram recompostos com grid. Não se afirma reescrita de todos os componentes.

Ocorrência de build: primeira tentativa encontrou DLL bloqueada pela versão antiga aberta; janela encerrada normalmente e Forge reiniciado. Não foi erro do código. A instalação 1.2 não foi executada nesta rodada; o EXE empacotado recebe testes separados. Avisos conhecidos: chunk hls.js e diretiva use client Lucide; compactador usa fs.rmdir depreciado sob Node 24.
