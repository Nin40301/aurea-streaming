# AUREA 2.0 — validação desta rodada

## Direção e UI
Direção Editorial mantida após comparação visual das três propostas em 1440×900 e 1920×1080. Capturas de propostas: `screenshots/v20-proposal-*`. Evolução frente à 1.2 é perceptível em `screenshots/v12-final-*` versus `screenshots/v20-home-*`: área editorial principal, leitura tipográfica, navegação de seção, cartões, detalhe de série com arte expandida e nova composição de perfil.

Camada visual `aurea-v20` em `src/renderer/v12.css`: sistema de cor e tipo, palco editorial, hover/focus, composição integral dos detalhes, cards e episódios, perfil, conexões, preferências, player e redução de movimento. Serviços e reprodução foram preservados.

## Testes
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm test`: 14 testes passaram.
- `npm run test:e2e` em desenvolvimento: 5 fluxos passaram.
- `npm run make` Windows x64: Setup Squirrel e ZIP portátil gerados.
- `npm run test:e2e` apontando para `out/Aurea-win32-x64/Aurea.exe`: 5 fluxos passaram, incluindo MP4/HLS/legendas/progresso, navegação, perfis, biblioteca e add-ons.
- Capturas de tela Electron e erros de renderer: `screenshots/v20-*`; `scripts/v20-qa.mjs` registrou `RENDERER_ERRORS []`.

## Limitações honestas
Captura de todas as rotas foi parcial: Home em 1440/1920, perfil em ambas e add-ons, preferências, biblioteca, séries e detalhes foram capturados em uma resolução; uma tentativa de roteiro complementar falhou ao selecionar o botão Início, portanto não foi criada screenshot do player, busca nem telas de filmes independentes nesta rodada. Os fluxos funcionais dessas áreas passam nos testes e2e, mas validação estética dessas capturas ainda precisa ocorrer. Setup foi produzido, porém a instalação via Setup não foi executada. Assinatura Authenticode ausente; avisos de chunk HLS e `fs.rmdir` permanecem.
