# Aurea 1.0.1 — validação da entrega

Validado em 28/10/2026, Windows 11 Pro x64, build 10.0.26200. Este relatório distingue testes executados de recursos indisponíveis. O aplicativo foi instalado e executado de verdade.

## Resultado observado

| Verificação | Resultado |
|---|---|
| Instalação de dependências e lockfile | Concluída; versões fixadas no package-lock.json. |
| TypeScript `npm run typecheck` | Aprovado, sem erros. |
| ESLint `npm run lint` | Aprovado, sem erros. |
| Prettier `npm run format:check` | Aprovado. |
| Vitest `npm test` | **14 testes aprovados**, em dois arquivos. |
| Vite build | Bundles main, preload e renderer produzidos; player carregado sob demanda. |
| Electron Forge `npm run make` | Fluxo completo aprovado sob Node 24.22.2 LTS / npm 11.19.1: package Windows x64, Squirrel e ZIP. |
| Instalação Squirrel | **Código de saída 0**, registro Windows atualizado para Aurea 1.0.1. Testada atualização da instalação de teste 1.0.0. |
| Playwright contra EXE instalado 1.0.1 | **5 fluxos aprovados**, zero falhas, zero pulos e zero retries/flaky na rodada final. |
| Correspondência do código instalado | SHA-256 de resources/app.asar instalado igual ao do pacote. |
| ZIP Windows | **CRC integral aprovado**, 114 entradas, com Aurea.exe, app.asar e mídia incluída. |
| REA MCP | Respondeu; inspeção PE estática do Electron e do EXE produzido concluída, com evidências preservadas. |

O executável instalado testado foi `%LOCALAPPDATA%\Aurea\app-1.0.1\Aurea.exe`. Os testes usaram diretórios de dados temporários em work/, sem escrever na biblioteca normal do usuário. O registro de desinstalação confirmou DisplayName=Aurea, DisplayVersion=1.0.1 e InstallLocation=%LOCALAPPDATA%\Aurea.

Relatório Playwright da rodada final: [evidence/e2e-installed-results.json](evidence/e2e-installed-results.json). As capturas reais da versão instalada estão em [screenshots/](screenshots/).

## O que os testes cobrem

**Unitários e integração HTTP/SQLite:** validação de manifest, URLs/esquemas/credenciais, resources string/objeto, tipos e prefixos; exceção de prefixo para catalog; agregação e fontes desabilitadas; search/genre/skip; meta e IDs reais de episódio; streams e legendas; VTT/SRT; Range/seek e playlist HLS; cache/coalescência, concorrência máxima, timeout, JSON inválido, tamanho máximo, HTTP 503, erro parcial e rate limit. SQLite é fechado/reaberto para testar persistência, isolamento de perfis, nomes, exclusão, add-ons e preferências. Migração v1→v2 e progresso independente de episódios também são testados.

**Fluxos no Electron instalado:**

1. Perfis, home, categorias, pesquisa vazia/com resultados, filtros de gênero, detalhes, temporadas/episódios, Minha Lista, Favoritos, isolamento entre perfis e janela 900×700. Preferências de segurança do renderer confirmadas: Node desabilitado, contextIsolation e sandbox habilitados; `window.require` ausente.
2. MP4 e HLS locais reais. Os testes exigem dimensão de vídeo, avanço efetivo de currentTime e frames decodificados, além de testar pause, seek, volume, velocidade, legendas com cues carregados, tela cheia e retomada após reiniciar o EXE.
3. Instalação/remoção/habilitação do add-on real via manifest, erro de URL, estado sem catálogos, limpeza do cache e preferências persistidas após reiniciar.
4. Player por teclado, mudo, seek, próximo episódio, retomada independente e avanço automático ao terminar o episódio.
5. Segundo add-on HTTP de teste agregado ao primeiro; identidade correta do destaque externo; stream deliberadamente 404, mensagem de indisponibilidade e retorno à navegação.

CRUD de perfil em domínio/SQLite é coberto pelos unitários. Na interface, criação e troca de perfis foram automatizadas; renomear/excluir via diálogo não recebeu uma rodada separada de UI. Não se apresenta esse detalhe como cobertura visual exaustiva.

## Identidade e integridade

SHA-256 do código `resources/app.asar`, tanto instalado quanto empacotado:

`b2f48d45138616490b92b9e592e8828809fc5c4c129e220781286e909705b951`

SHA-256 do EXE final:

`801aaa0a4ca9cadf67163ffd12caf4a49992fe0214105ffbe2bac6180ac8dd11`

REA final: `ev_f2a3de9e94c4d657fc27ad25612d56b491758435e5ce0af41a301fc6364a657d`, provedor rea-pe-resources v1; PE32+, 249.798.656 bytes, 105 entradas, 49 recursos e um grupo de ícones. [Resumo da evidência](evidence/rea-aurea-1.0.1-final-pe.json). Isso é inspeção estática de recursos, não auditoria de código nativo ou prova de execução; a execução é evidenciada pelos testes separados.

Hashes do instalador, ZIP e fontes estão no arquivo CHECKSUMS.sha256 ao lado dos entregáveis. O pacote portátil deve ser extraído integralmente antes de executar; o EXE isolado depende dos demais arquivos.

## Limites e ocorrências resolvidas

- Primeiro make sob Node 26 falhou em API removida usada por cross-zip. A distribuição final foi gerada integralmente sob Node 24 LTS, preservando a instalação Node do sistema.
- Tela cheia, ordem de gravação do último progresso e atualização visual do interruptor de add-on foram corrigidas após falhas reais nos testes. A rodada final passou com essas correções.
- Permanecem avisos de build do chunk hls.js acima de 500 KiB e diretiva `use client` do Lucide. O compactador emite depreciação fs.rmdir sob Node 24. Nenhum desses avisos impediu a geração ou execução testada.
- Instalador sem assinatura Authenticode; sem atualizador automático ou certificação Microsoft Store. Windows 10 é alvo declarado do runtime, mas não foi testado nesta máquina Windows 11. ARM64 não foi empacotado.
- Add-ons foram validados pelo servidor demonstrativo e uma segunda fixture HTTP. Não há certificação de toda a comunidade Stremio. Compatibilidade é parcial e está delimitada no README.
- MP4/HLS são testados com trailers Blender autorizados incluídos. Outros codecs, servidores, resoluções, CORS e conexões não são garantidos. HLS é identificado por `.m3u8`; DASH, DRM, torrents, IPFS, login de serviços e downloads não estão implementados.
- Não houve sessão Netflix autenticada, acesso a backend/código/algoritmos privados nem contorno de DRM. A investigação Netflix foi documental. As recomendações do Aurea são regras locais por gênero.
## Redesign 1.1.0
Três ciclos de screenshots reais em 1440×900 e 1920×1080 inspecionados. Typecheck passou; 14 testes Vitest e cinco fluxos Electron passaram. O script de captura foi convertido para ESM; lint final aprovado. Cinco fluxos adicionais contra o EXE empacotado também passaram. Nenhum serviço foi reescrito. Detalhes em DESIGN_SYSTEM.md. Relatórios 1.0.1 acima são históricos.
## Validação 1.2.0
Typecheck, lint e 14 testes de domínio/HTTP/SQLite aprovados. Cinco fluxos passaram tanto em execução local quanto contra EXE empacotado, incluindo player MP4/HLS, legendas, retomada, biblioteca, navegação e add-ons. Relatório em evidence/e2e-v12-packaged.json. Duas propostas e comparações 1.1/1.2 em screenshots. Instalação 1.2 ainda não testada; não confundir com validação instalada 1.0.1 histórica acima.
