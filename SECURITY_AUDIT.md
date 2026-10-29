# Auditoria de segurança e privacidade — AUREA

Data: 2026-10-28
Repositório auditado: `Nin40301/aurea-streaming` (privado durante a auditoria)
HEAD auditado: `818b36e2214d007035f3c4d0aeee7b6a1719c3ed`
Escopo: todas as 152 entradas versionadas no commit, todas as branches/tags após `git fetch --all --tags --prune`, histórico Git alcançável, arquivos binários/metadata, configuração, evidências e avisos de licenças.

## Conclusão

**Não apto para publicação pública no estado atual.** Foram encontrados dados de ambiente pessoal em sete arquivos JSON de evidência. Eles registram caminhos absolutos locais e o nome associado ao perfil da máquina. Esses dados estão no commit inicial, portanto apagar os arquivos apenas do working tree ou adicioná-los ao `.gitignore` não removeria a exposição do histórico.

O repositório permanece privado. Esta auditoria não alterou sua visibilidade, não fez push e não reescreveu o histórico.

## Resultados

### Segredos e credenciais

- Gitleaks 8.30.1, instalado do pacote oficial WinGet com hash do instalador verificado.
- `gitleaks git --redact --max-target-megabytes 100`: **0 findings**, 1 commit examinado, todo o histórico Git atualmente alcançável.
- `gitleaks dir --redact --max-target-megabytes 100`: **0 findings** na árvore de trabalho examinada. A varredura também passou por arquivos locais ignorados; alguns artefatos de build acima de 100 MB foram ignorados pelo limite do scanner e não fazem parte do Git.
- Busca adicional nos blobs versionados: nenhum padrão detectado de token, chave privada, credencial atribuível, segredo em configuração ou `.env`.
- Nenhum arquivo `.env`, banco SQLite, log, cache, chave de assinatura ou certificado está versionado. `.gitignore` cobre esses tipos e diretórios de build.
- Gitleaks não é um detector geral de dados pessoais e não elimina a ocorrência descrita abaixo.

### Privacidade e dados pessoais

Sete blobs versionados em `evidence/` contêm caminhos absolutos do Windows e o nome de usuário local. Os arquivos afetados são:

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

- Após fetch, foram encontradas apenas as branches locais `main` e `codex/aurea-2.0-continuation`, ambas apontando para o commit inicial; remotamente existe apenas `origin/main` e `origin/HEAD`.
- Não há tags nem commits adicionais. O histórico contém somente um commit raiz, que adicionou os 152 arquivos; não há arquivos excluídos posteriormente no histórico disponível.
- A branch `codex/aurea-2.0-continuation` é local e não foi enviada durante a auditoria.
- Os dados pessoais de `evidence/` estão no commit raiz compartilhado com o remoto privado. Uma correção que remova os dados do histórico exige substituir esse commit e atualizar `main` remoto; um commit corretivo comum ainda deixaria os valores no histórico.

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

## Correção necessária antes de tornar público

1. Remover os caminhos pessoais e o nome local dos sete JSON, substituindo-os por paths relativos e identificadores neutros; ou remover esses artefatos se não forem necessários. Regenerar os JSON de forma que não serializem paths de `C:\Users\...`.
2. Sanitizar o histórico Git inteiro, incluindo o commit raiz. Como o remoto privado também contém os dados, antes de tornar público substituir o root commit por uma versão sanitizada e atualizar `main` com a reescrita autorizada. Confirmar novamente por Gitleaks e por busca de paths tanto no tree quanto em todos os commits.
3. Decidir se o nome do autor do commit inicial deve ser mantido ou trocado por um identificador que o usuário aceite publicar; o e-mail já é `users.noreply.github.com`.
4. Só então considerar a alteração manual de visibilidade. Esta auditoria não está autorizada a alterar a visibilidade.

## Resumo de risco

- **Bloqueador para publicação pública:** paths absolutos e nome do perfil nos sete relatórios históricos de `evidence/`.
- **Consideração de privacidade:** nome do autor do commit visível no histórico.
- **Sem findings de segredo:** Gitleaks não detectou tokens/credenciais/chaves.
- **Risco de licença identificado:** nenhum incompatível aparente; preservar as atribuições CC BY 3.0 e a descrição de conversões/recortes.
- **Visibilidade do GitHub:** permanece privada.

## Revalidação após sanitização local — 2026-10-28

### Correções no working tree

Na branch local `codex/aurea-2.0-continuation`, os sete JSON acima foram atualizados. Caminhos do projeto foram substituídos por `${PROJECT_ROOT}`; outros caminhos sob o perfil do Windows foram normalizados para `${USERPROFILE}`; ocorrências do nome local foram substituídas por um rótulo genérico. Os sete arquivos foram recarregados pelo parser JSON após a gravação. Nenhuma identidade Git foi alterada.

A verificação dos arquivos versionados no working tree não encontrou caminhos absolutos do perfil nem o nome local em arquivos de texto. Não foram encontrados e-mails pessoais. Screenshots e mídia não foram alterados nesta correção.

### Testes repetidos

- Gitleaks 8.30.1 `dir`, com redação habilitada: 0 findings nos arquivos locais examinados.
- Gitleaks 8.30.1 `git`: 0 findings de segredos no commit histórico alcançável.
- Varredura PII personalizada: confirmou que os sete blobs do commit raiz ainda contêm os dados originais. O HEAD ainda é o commit inicial e a cópia remota `origin/main` não foi alterada.
- JSON: os sete arquivos corrigidos continuam válidos.
- `npm test`: 14 testes aprovados.
- `npm run typecheck`: aprovado.

**Importante:** a varredura Gitleaks de `git` não detecta dados pessoais. Seu resultado zero não significa que o histórico esteja sanitizado. O histórico deve ser reescrito e revarrido antes de tornar público.

### Identidade do commit

O commit raiz expõe somente um nome de perfil (não um endereço pessoal) e um endereço GitHub `users.noreply.github.com`. O usuário pediu que a identidade Git não seja alterada sem autorização; ela foi preservada. É uma informação de atribuição pública potencialmente identificável, embora o repositório esteja atualmente privado. Decidir se a atribuição deve permanecer antes de reescrever o commit; esta auditoria não a modifica.

### Licenças verificadas em fontes oficiais

- Sintel: site oficial Durian/Blender declara CC Attribution 3.0: https://durian.blender.org/about/ .
- Big Buck Bunny: página oficial Blender declara que os materiais do projeto Peach estão sob CC Attribution 3.0 e indica atribuição adequada: https://peach.blender.org/about/ .
- A página oficial Creative Commons explica que CC BY 3.0 permite redistribuição e adaptação, inclusive comercial, desde que se dê atribuição apropriada, link da licença e indicação de alterações: https://creativecommons.org/licenses/by/3.0/us/ .
- Os avisos versionados identificam autores/titulares, fontes, link de licença e conversões HLS/recortes. A redistribuição dos assets incluídos parece compatível com esses termos, sujeita à preservação dos avisos e créditos ao publicar/distribuir. A presente verificação não é parecer jurídico nem prova criptográfica da procedência de cada arquivo.

### Plano de reescrita do histórico — aguarda autorização

O remoto tem apenas `main`; não existem branches remotas de colaboradores nem tags. A branch local `codex/aurea-2.0-continuation` está no commit raiz antigo e contém as correções não commitadas. A reescrita exige atualizar o único ref remoto principal e muda o hash do commit raiz.

Plano aprovado pelo usuário; a criação do backup local já foi concluída. A reescrita remota ainda está pendente nesta etapa:
1. Salvar os hashes atuais de `origin/main` e das branches locais e criar refs/backup locais verificáveis; manter intacta a cópia atual dos arquivos e as correções pendentes.
2. Validar JSON, procurar paths/nome em todos os blobs da árvore limpa e confirmar os créditos/licenças antes de criar o novo root.
3. Construir um root commit sanitizado com a mesma árvore/código exceto pelos sete JSON e pelo relatório, preservando exatamente o autor original por padrão. Não mudar nome/email do commit sem autorização adicional.
4. Verificar o novo histórico completo com Gitleaks e scanner PII; então fazer push apenas de `main` usando `--force-with-lease` condicionado ao hash remoto antigo verificado. Não alterar a visibilidade.
5. Atualizar a branch de trabalho local por rebase sobre o novo root, preservar o relatório e correções; conferir hashes, status e árvore remota.
6. Informar que consumidores que já clonaram o remoto precisarão fazer fetch e reset/reclone/rebase, pois o hash raiz mudará. Atualmente há uma única branch remota `main`; a branch `codex/aurea-2.0-continuation` existe somente neste clone.

Autorização para a reescrita e atualização com `--force-with-lease` foi concedida. O backup local das refs e das alterações foi criado e verificado fora do repositório publicado. Ainda não houve commit sanitizado, push, reescrita de refs remotas nem mudança de visibilidade.

## Decisão atual de publicação

Ainda **não apto para tornar público**. Os dados foram removidos da cópia de trabalho, mas permanecem no commit raiz privado remoto e em `main` local. Após aprovação e execução do plano de reescrita, será necessária nova auditoria do histórico remoto antes de qualquer mudança de visibilidade.
