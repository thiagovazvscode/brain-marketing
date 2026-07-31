# Tasks — Workspace de Cliente

Banco já provisionado e migrado (`specs/admin-crm-analytics`) — sem bloqueio de
infra. Ordem pensada para destravar o gap mais doloroso primeiro: **o Bloco 1 não
depende de nenhuma tabela nova** (usa só `clients`, que já existe), então pode ir
pra produção antes de qualquer outro bloco estar pronto.

## 1. Cadastro manual de cliente (prioridade máxima — sem dependência de schema novo)

- [ ] `POST /api/admin/clients` — cria cliente (nome, whatsapp, enteredAt; slug
      gerado a partir do nome, rejeita duplicado).
- [ ] `PATCH /api/admin/clients/[slug]` — edita dados básicos.
- [ ] Adicionar coluna `entered_at` (nullable) em `clients` — única mudança de
      schema deste bloco, aditiva, não quebra `client_briefings` nem o `GET`
      que já existe.
- [ ] `src/components/admin/ClientForm.tsx`.
- [ ] Botão "Novo cliente" em `/admin/clients/page.tsx`, abrindo o form.

**Checkpoint**: cadastrar um cliente de teste direto pelo painel, sem passar por
`/briefing/[slug]`; editar nome/whatsapp/data de entrada e confirmar que
persiste; tentar criar outro com o mesmo slug e ver o erro esperado.

> Isso já resolve a queixa central ("preciso conseguir cadastrar cliente sem
> mandar ele preencher formulário") mesmo antes dos blocos abaixo existirem.

## 2. Schema das seções restantes

- [ ] Adicionar `clientProductTypeEnum`, `clientProductStatusEnum`,
      `clientProposalStatusEnum`, `clientProposalTypeEnum`,
      `clientFileCategoryEnum` (incluindo `"acesso"`), `clientRoadmapStatusEnum`
      e as tabelas `clientProducts`, `clientProposals` (com `proposalType`,
      `externalLabel`, `externalUrl`), `clientFiles`, `clientRoadmapItems` em
      `src/db/schema.ts` (ver `design.md` para o código exato — importar
      `date` de `drizzle-orm/pg-core`).
- [ ] Criar `src/data/proposals.ts` com o catálogo `KNOWN_PROPOSALS`.
- [ ] Criar `src/types/client-workspace.ts` com as interfaces de domínio.
- [ ] Rodar `npm run db:generate` + `npm run db:push`.

**Checkpoint**: `npm run build` passa; as 4 tabelas novas + a coluna
`entered_at` aparecem no banco.

## 3. Produtos por cliente (com upsell)

- [ ] `GET/POST /api/admin/clients/[slug]/products`.
- [ ] `PATCH /api/admin/clients/[slug]/products/[id]` (status).
- [ ] `src/components/admin/ClientProductsPanel.tsx` — grupo "contratados" +
      grupo "oportunidades" (catálogo menos o que está ativo).
- [ ] Seção "Produtos" em `/admin/clients/[slug]/page.tsx`.

**Checkpoint**: adicionar um produto a um cliente de teste, pausar, encerrar —
o produto encerrado volta a aparecer no grupo de oportunidades.

## 4. Propostas enviadas (site + externa)

- [ ] `GET/POST /api/admin/clients/[slug]/proposals` — valida por
      `proposalType`: `"site"` exige `proposalSlug` contra `KNOWN_PROPOSALS`;
      `"externa"` exige `externalLabel` (`externalUrl` opcional).
- [ ] `PATCH /api/admin/clients/[slug]/proposals/[id]` (status).
- [ ] `src/components/admin/ClientProposalForm.tsx` — campo de tipo
      (site/externa) alterna entre `<select>` de página conhecida e campos de
      título livre + link.
- [ ] Seção "Propostas enviadas" em `/admin/clients/[slug]/page.tsx`, com link
      pra `/proposta/[slug]` (site) ou pro `externalUrl` (externa, se houver).

**Checkpoint**: registrar o envio da proposta de MV Imóveis (tipo "site") pro
cliente de teste, ver o link funcionando; registrar uma proposta "externa"
(ex: "Proposta PDF enviada por e-mail", sem link) e ver as duas listadas
corretamente; mudar status de uma delas pra "aceita".

## 5. Arquivos por cliente

- [ ] `GET/POST /api/admin/clients/[slug]/files`.
- [ ] `DELETE /api/admin/clients/[slug]/files/[id]`.
- [ ] `src/components/admin/ClientFilesPanel.tsx`.
- [ ] Seção "Arquivos" em `/admin/clients/[slug]/page.tsx`.

**Checkpoint**: adicionar uma referência de arquivo (link do Drive, por
exemplo), ver na lista, remover.

## 6. Roadmap/cronograma

- [ ] `GET/POST /api/admin/clients/[slug]/roadmap`.
- [ ] `PATCH /api/admin/clients/[slug]/roadmap/[id]` (status, preenchendo
      `completedAt` em "feito").
- [ ] `src/components/admin/ClientRoadmapPanel.tsx`.
- [ ] Seção "Roadmap" em `/admin/clients/[slug]/page.tsx`.

**Checkpoint**: criar um item, mover pra "em andamento", marcar "feito" e
confirmar `completedAt` preenchido.

## 7. Reorganização final da pasta do cliente

- [ ] Reordenar `/admin/clients/[slug]/page.tsx` para a estrutura final: Dados
      básicos → Produtos → Propostas → Briefings → Arquivos → Roadmap —
      confirmando visualmente que Briefings deixou de ser "a única coisa que
      existe" sobre o cliente.
- [ ] `/admin/clients/page.tsx`: lista passa a mostrar também clientes sem
      nenhum produto/proposta ainda (recém-cadastrados manualmente), sem
      tratar isso como estado quebrado.

**Checkpoint**: revisão visual completa da pasta de um cliente com dado em
todas as seções (produto, proposta, briefing, arquivo, roadmap) e de um
cliente recém-criado com todas as seções vazias, sem erro em nenhum dos dois.

## Fora desta v1 (mencionar mas não implementar agora)

- Faturamento/MRR/histórico de pagamento (spec anterior, substituído por este).
- Upload real de arquivo (hoje é só link/referência — ver `design.md`).
- Notificação automática de roadmap atrasado ou proposta sem resposta.
