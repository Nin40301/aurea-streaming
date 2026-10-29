# Auditoria de segurança e privacidade — AUREA

Data: 2026-10-28
Repositório auditado: `Nin40301/aurea-streaming` (privado durante a auditoria)
HEAD auditado: `818b36e2214d007035f3c4d0aeee7b6a1719c3ed`
Escopo: todas as 152 entradas versionadas no commit, todas as branches/tags após `git fetch --all --tags --prune`, histórico Git alcançável, arquivos binários/metadata, configuração, evidências e avisos de licenças.

## Conclusão

A auditoria inicial encontrou paths pessoais em sete JSON. Os arquivos foram sanitizados e o único commit inicial foi reescrito. O novo root sanitizado `57d0896074595c9c21e803cf2edce1c93bd45041` substituiu o root antigo na única branch publicada (`main`) via `--force-with-lease` condicionado ao hash esperado. A branch do repositório continua privada; não foi alterada sua visibilidade.

A revisão final do novo histórico alcançável encontrou zero paths pessoais nos blobs e zero findings de segredos com Gitleaks. A atribuição do autor do commit foi preservada conforme solicitado e é a única consideração de privacidade remanescente: o nome de perfil associado à identidade Git ficará visível se o repositório for público. A varredura não encontrou e-mail pessoal.

## Resultados

### Segredos e credenciais

- Gitleaks 8.30.1, instalado do pacote oficial WinGet com hash do instalador verificado.
- `gitleaks git --redact --max-target-megabytes 100`: **0 findings**, 1 commit examinado, todo o histórico Git atualmente alcançável.
- `gitleaks dir --redact --max-target-megabytes 100`: **0 findings** na árvore de trabalho examinada. A varredura também passou por arquivos locais ignorados; alguns artefatos de build acima de 100 MB foram ignorados pelo limite do scanner e não fazem parte do Git.
- Busca adicional nos blobs versionados: nenhum padrão detectado de token, chave privada, credencial atribuível, segredo em configuração ou `.env`.
- Nenhum arquivo `.env`, banco SQLite, log, cache, chave de assinatura ou certificado está versionado. `.gitignore` cobre esses tipos e diretórios de build.
- Gitleaks não é um detector geral de dados pessoais e não elimina a ocorrência descrita abaixo.

### Privacidade e dados pessoais

A auditoria inicial encontrou caminhos absolutos do Windows e o nome de usuário local nos sete JSON a seguir. Eles foram sanitizados antes da reescrita do histórico:

- `evidence/e2e-installed-results.json`
- `evidence/e2e-results.json`
- `evidence/e2e-v12-packaged.json`
- `evidence/rea-aurea-1.0.1-final-pe.json`
- `evidence/rea-aurea-1.0.1-pe.json`
- `evidence/rea-aurea-pe.json`
- `evidence/rea-electron-pe.json`

A pesquisa nos arquivos versionados não encontrou endereços pessoais dos provedores de e-mail comuns pesquisados. Não foram identificados outros dados de usuário, banco local, histórico pessoal ou identificadores de conta nos arquivos do app. O uso de `%APPDATA%` na documentação é uma descrição genérica, não um caminho pessoal.

O autor do único commit tem um nome de perfil e um endereço `users.noreply.github.com`. O endereço evita expor um e-mail pessoal, mas o nome de perfil pode identificar o autor. Avaliar se o autor deseja manter esse nome antes da abertura pública.

### Histórico Git e branches

- Antes da reescrita havia somente o root original, com 152 arquivos; as refs remotas eram `main` e `origin/HEAD`, sem tags e sem PRs.
- Esse root antigo foi substituído na branch remota `main`. O novo histórico publicado contém o root sanitizado e o commit de registro desta auditoria; não há arquivos excluídos no histórico atualmente alcançável.
- A branch local `codex/aurea-2.0-continuation` foi preservada e sincronizada com a nova história. Não foi publicada.
- O backup local fora do repositório conserva refs e patch antigos para recuperação; não foi enviado ao GitHub.

### Screenshots e binários

- Os PNGs não contêm chunks de metadata textual (`tEXt`, `zTXt`, `iTXt`) e os JPGs não contêm bloco EXIF. A inspeção visual das capturas versionadas mostra telas do próprio AUREA e conteúdo demonstrativo, sem janelas ou desktop pessoal ao fundo.
- Os trailers MP4 contêm metadata de mídia padrão (marcas de container, hora de criação e créditos/título). A inspeção das tags não apontou caminhos pessoais, e-mails ou credenciais. Não foi encontrada metadata EXIF nas imagens JPG.
- Binários grandes são os trailers e segmentos HLS da demonstração autorizada, não executáveis ou instaladores. Os executáveis, pacotes Squirrel, ZIPs de release, `node_modules`, cache e relatórios locais de execução ficam fora dos blobs versionados.
- Não foi feito OCR de cada frame interno dos vídeos; os trailers são conteúdo público de animação e não gravações da máquina/usuário.

### Licenças e redistribuição

- O código do projeto declara MIT em `LICENSE` e os avisos de dependências estão em `assets/licenses/` e `THIRD_PARTY_NOTICES.md`.
- `assets/THIRD_PARTY_NOTICES.md` atribui Sintel e Big Buck Bunny à Blender Foundation, aponta as fontes de download/créditos e declara CC BY 3.0. Também revela as transformações: transcodificação HLS e recortes JPG. Atribuição e indicação de alterações são compatíveis com CC BY 3.0 conforme a documentação mantida pelo projeto.
- Não há logos Netflix/Stremio ou ativos dessas marcas identificados no conjunto versionado.
- A auditoria confirma que os créditos/licenças declarados acompanham os assets; não substitui uma confirmação externa de cadeia de custódia dos arquivos originais. Manter créditos e licença ao redistribuir.

### Configurações e informações internas

- Não foram detectados hosts corporativos, URLs de serviços privados, senhas ou dados de infraestrutura. O servidor local demonstrativo usa loopback (`127.0.0.1`) de forma intencional e documentada.
- Configurações Electron, CSP e limites do adaptador de add-ons não contêm credenciais. O design documenta que URLs/manifests e histórico ficam em texto no SQLite local; nenhum banco está incluído no repositório.

## Correções e riscos restantes

- Os sete JSON foram sanitizados com marcadores neutros, mantendo estrutura e validade.
- O root antigo foi substituído na única branch remota, e verificações posteriores confirmaram ausência de dados pessoais no novo histórico alcançável.
- A identidade de autor/committer foi preservada como solicitado. O nome de perfil continua visível como atribuição Git; decidir se esse nome pode aparecer publicamente. O endereço é `users.noreply.github.com`, não um e-mail pessoal.
- Nenhum incompatibilidade de licença foi identificada; manter créditos CC BY 3.0 e a descrição das conversões/recortes.
- A visibilidade do GitHub permanece privada e não foi alterada.

## Revalidação após sanitização local — 2026-10-28

### Correções no working tree

Na branch local `codex/aurea-2.0-continuation`, os sete JSON acima foram atualizados. Caminhos do projeto foram substituídos por `${PROJECT_ROOT}`; outros caminhos sob o perfil do Windows foram normalizados para `${USERPROFILE}`; ocorrências do nome local foram substituídas por um rótulo genérico. Os sete arquivos foram recarregados pelo parser JSON após a gravação. Nenhuma identidade Git foi alterada.

A verificação dos arquivos versionados no working tree não encontrou caminhos absolutos do perfil nem o nome local em arquivos de texto. Não foram encontrados e-mails pessoais. Screenshots e mídia não foram alterados nesta correção.

### Testes repetidos

- Gitleaks 8.30.1 `dir`, com redação habilitada: 0 findings nos arquivos locais examinados.
- Gitleaks 8.30.1 `git`: 0 findings de segredos no commit histórico alcançável.
- Varredura PII personalizada no root sanitizado e em todas as refs publicadas: nenhum caminho absoluto local ou nome local encontrado. O blob antigo não está alcançável pelas refs publicadas atuais.
- JSON: os sete arquivos corrigidos continuam válidos.
- `npm test`: 14 testes aprovados.
- `npm run typecheck`: aprovado.

**Importante:** Gitleaks detecta segredos, não todos os dados pessoais. Por isso também foi executado scanner PII sobre cada blob alcançável pelas refs. A primeira varredura Gitleaks cobriu o root antigo; as revalidações posteriores cobriram o novo histórico sanitizado.

### Identidade do commit

O commit raiz expõe somente um nome de perfil (não um endereço pessoal) e um endereço GitHub `users.noreply.github.com`. O usuário pediu que a identidade Git não seja alterada sem autorização; ela foi preservada. É uma informação de atribuição pública potencialmente identificável, embora o repositório esteja atualmente privado. Decidir se a atribuição deve permanecer antes de reescrever o commit; esta auditoria não a modifica.

### Licenças verificadas em fontes oficiais

- Sintel: site oficial Durian/Blender declara CC Attribution 3.0: https://durian.blender.org/about/ .
- Big Buck Bunny: página oficial Blender declara que os materiais do projeto Peach estão sob CC Attribution 3.0 e indica atribuição adequada: https://peach.blender.org/about/ .
- A página oficial Creative Commons explica que CC BY 3.0 permite redistribuição e adaptação, inclusive comercial, desde que se dê atribuição apropriada, link da licença e indicação de alterações: https://creativecommons.org/licenses/by/3.0/us/ .
- Os avisos versionados identificam autores/titulares, fontes, link de licença e conversões HLS/recortes. A redistribuição dos assets incluídos parece compatível com esses termos, sujeita à preservação dos avisos e créditos ao publicar/distribuir. A presente verificação não é parecer jurídico nem prova criptográfica da procedência de cada arquivo.

### Reescrita do histórico executada

- Backup local das refs em bundle Git, patch binário das mudanças de working tree e cópia do relatório criado e verificado fora do repositório publicado. O backup contém deliberadamente a cópia privada do histórico antigo para recuperação; não foi enviado.
- Antes da operação, `origin/main` era `818b36e2214d007035f3c4d0aeee7b6a1719c3ed`. O remoto tinha somente `main`, zero tags e nenhum pull request. As branches locais `main` e `codex/aurea-2.0-continuation` apontavam para o root antigo.
- Foi criado novo root `57d0896074595c9c21e803cf2edce1c93bd45041`, contendo os sete JSON sanitizados e este relatório; a identidade Git (nome e email) foi preservada. Árvore validada antes da atualização remota.
- Imediatamente antes do force push, o hash remoto ainda correspondia ao esperado e o conjunto de refs remotas permanecia inalterado. `--force-with-lease` atualizou somente `main`. Não houve divergência nem perda de alterações.
- As branches locais `main` e `codex/aurea-2.0-continuation` foram sincronizadas com o novo root; o working tree ficou limpo após o registro final desta auditoria. O remoto continua privado.
- Consumidores que já clonaram o remoto precisam buscar a branch atualizada e fazer reset/reclone/rebase porque o hash raiz mudou. O backup bundle local, fora do repositório publicado, conserva as refs e objetos antigos para recuperação. Reflogs/objetos antigos também podem permanecer no `.git` local até sua expiração; nenhum desses refs locais foi enviado ao GitHub.

## Verificação final e decisão de publicação

Gitleaks 8.30.1 retornou zero findings para os arquivos atuais e para o histórico Git alcançável. A varredura PII percorreu todos os blobs alcançáveis pelas refs atuais: nenhum path local ou nome pessoal foi encontrado. Sete JSON seguem válidos; `npm test` aprovou 14 testes e `npm run typecheck` passou.

Não foram identificados bloqueadores de segredos, paths, assets ou licença para publicação pública. Os assets de demonstração são declarados CC BY 3.0 com atribuição, links e indicação das conversões/crops; esses avisos devem permanecer. O risco residual de privacidade é a identidade/nome de perfil já presente como autor/committer no único commit; ela foi mantida conforme instrução explícita. A decisão de aceitar essa atribuição pública pertence ao proprietário.

**Quanto aos achados desta auditoria, o repositório está preparado para publicação pública após a decisão do proprietário sobre a visibilidade do nome de autor. A visibilidade permanece privada e não foi alterada.**