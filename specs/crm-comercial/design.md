# Design — Fase 2: CRM Comercial

Apresentação prévia obrigatória (itens 1 a 10) antes da implementação.

---

## 1. Entidades atuais reutilizadas

| Entidade | Como é reutilizada | Mudança |
|---|---|---|
| `leads` | Continua sendo a **caixa de entrada bruta** (formulário do site, quiz, banners). Uma oportunidade nasce a partir de um lead, mas lead ≠ oportunidade. | Nenhuma alteração de coluna |
| `clients` | Destino da conversão. A oportunidade pode apontar para cliente novo **ou existente** (upsell). | Nenhuma |
| `products` | Produtos de interesse na oportunidade e produtos contratados na venda | Nenhuma |
| `product_plans` | Seleção de plano no fluxo de contratação — **finalmente dá uso ao `plan_id`**, pendência nº1 da Fase 1 | Nenhuma |
| `client_products` | Criado ao converter. Herda valor, ciclo, responsáveis. | **+1 coluna**: `sale_id` |
| `admin_users` | Responsável comercial e operacional (FKs) | Nenhuma |
| `billing_type` / `billing_cycle` (enums) | Reaproveitados no fluxo de contratação | Nenhuma |
| `computeImpactOnMrr()` (`src/lib/billing.ts`) | **Reutilizado na conversão** — o MRR da venda usa exatamente a função corrigida na Fase 1, sem duplicar regra | Nenhuma |

**Decisão importante — lead x oportunidade.** Não vou transformar `leads` em
oportunidade nem migrar dados. `leads` é captura (pode ser lixo, duplicado, curioso);
`opportunities` é pipeline qualificado. A ligação é `opportunities.lead_id` (nullable),
o que preserva 100% dos dados atuais e permite oportunidade criada manualmente, sem lead
de origem.

## 2. Novas entidades necessárias

| # | Tabela | Por quê |
|---|---|---|
| 1 | `pipelines` | Suporte a múltiplos funis no futuro (Novos negócios, Upsell) sem migration |
| 2 | `pipeline_stages` | **Etapas no banco, não hardcoded** — requisito explícito |
| 3 | `opportunities` | Entidade central do CRM |
| 4 | `opportunity_products` | Produtos de interesse (N:N com `products`) |
| 5 | `opportunity_activities` | Atividades, reuniões, tarefas e anotações |
| 6 | `opportunity_stage_history` | Histórico de movimentação entre etapas |
| 7 | `opportunity_documents` | Documentos por referência/link |
| 8 | `sales` | **Registro da venda** — âncora do vínculo oportunidade ↔ cliente ↔ contratação, e ponto de entrada para Contrato e Financeiro nas Fases 3/4 |

### Por que existe a tabela `sales`

Ao converter, criamos N `client_products` de uma vez. Sem um agregador, "a venda"
não existe como objeto — não dá para dizer "esta venda fechou R$ X" nem pendurar
contrato/fatura depois. `sales` é essa âncora, e é exatamente onde
`contract_id` e `invoice_id` vão entrar nas próximas fases **sem refatorar nada**.

## 3. Modelo de dados proposto

### Enums novos (conjuntos pequenos e estáveis)

```
opportunity_status   → aberta | ganha | perdida
opportunity_priority → baixa | media | alta | urgente
```

### Validado em app, não em enum (segue a convenção do projeto)

`activity_type`, `origem` e `motivo de perda` ficam como `text` validados em
`src/lib/crm.ts` — são listas que crescem com o negócio, e travar em `pgEnum` exige
migration para cada valor novo. Mesmo raciocínio já usado em `method-stages.ts` e
`billing.ts`.

### Tabelas

```
pipelines
  id, slug(unique), name, description, is_default, is_active, sort_order, timestamps

pipeline_stages
  id, pipeline_id → pipelines
  slug, name, sort_order, color
  is_won (bool)          -- dispara o fluxo de contratação
  is_lost (bool)         -- exige motivo de perda
  default_probability    -- 0-100, preenche a oportunidade ao entrar na etapa
  stuck_after_days       -- limite para o alerta de "parada"; por etapa, não global
  is_active, timestamps

opportunities
  id, pipeline_id → pipelines, stage_id → pipeline_stages
  lead_id → leads (nullable)          -- origem, quando veio do site
  client_id → clients (nullable)      -- preenchido em upsell ou após conversão
  title
  contact_name, company_name, phone, whatsapp, email
  source                              -- texto validado em app
  estimated_value numeric(12,2)
  probability integer                 -- 0-100
  priority opportunity_priority
  owner_id → admin_users              -- responsável
  status opportunity_status           -- aberta | ganha | perdida
  stage_entered_at timestamp          -- base do "dias na etapa"
  next_action, next_action_date
  expected_close_date
  notes
  lost_reason, lost_notes, lost_at
  won_at
  timestamps

opportunity_products          -- produtos de interesse
  id, opportunity_id, product_id, plan_id (nullable)
  estimated_value (nullable), notes, created_at

opportunity_activities        -- atividades, reuniões, tarefas, anotações
  id, opportunity_id, type, title, description
  due_at, done_at             -- nulo/nulo = anotação; due preenchido = tarefa
  created_by → admin_users
  timestamps

opportunity_stage_history
  id, opportunity_id, from_stage_id, to_stage_id, changed_at, changed_by, note

opportunity_documents
  id, opportunity_id, title, url, category, added_at

sales
  id, opportunity_id (nullable), client_id → clients
  sold_at date, salesperson_id → admin_users
  total_mrr numeric(12,2), total_one_time numeric(12,2)
  notes, created_at
```

### Campo a campo do que foi pedido

| Pedido | Onde vive |
|---|---|
| Nome do contato ou empresa | `contact_name` + `company_name` |
| Telefone / WhatsApp / e-mail | `phone`, `whatsapp`, `email` |
| Origem | `source` |
| Produtos de interesse | `opportunity_products` |
| Valor estimado | `estimated_value` |
| Responsável | `owner_id` |
| Prioridade | `priority` |
| Etapa atual | `stage_id` |
| Probabilidade | `probability` |
| Próxima ação + data | `next_action`, `next_action_date` |
| **Dias na etapa** | **calculado** de `stage_entered_at` — não é coluna |
| Observações | `notes` |
| Motivo de perda | `lost_reason` + `lost_notes` |
| Data prevista de fechamento | `expected_close_date` |
| Histórico de atividades | `opportunity_activities` + `opportunity_stage_history` |

**"Dias na etapa" e "alerta de parada" são calculados, nunca armazenados.** A Fase 1
nos ensinou isso: `impact_on_mrr` guardado em coluna ficou defasado quando o ciclo
mudava. Contador de dias tem o mesmo defeito — ficaria errado todo dia à meia-noite.

## 4. Relacionamentos

```
pipelines 1──N pipeline_stages
pipelines 1──N opportunities
pipeline_stages 1──N opportunities

leads    1──N opportunities        (lead_id nullable — origem opcional)
clients  1──N opportunities        (client_id nullable — upsell)
admin_users 1──N opportunities     (owner_id)

opportunities 1──N opportunity_products    N──1 products / product_plans
opportunities 1──N opportunity_activities
opportunities 1──N opportunity_stage_history
opportunities 1──N opportunity_documents

opportunities 1──1 sales (via sales.opportunity_id)
clients       1──N sales
sales         1──N client_products (via client_products.sale_id)
```

Sem FK circular: a oportunidade não aponta para a venda; a venda é que aponta para a
oportunidade e para o cliente.

## 5. Migrations

**Uma migration: `0004`, 100% aditiva.**

- `CREATE TYPE` × 2 (`opportunity_status`, `opportunity_priority`)
- `CREATE TABLE` × 8
- `ALTER TABLE client_products ADD COLUMN sale_id uuid` (nullable, FK)

Nenhum `DROP`, `TRUNCATE` ou `DELETE`. Nenhuma coluna existente alterada. Rollback =
dropar as tabelas novas; nada do que já existe é tocado.

**Seed idempotente** do pipeline padrão com as 7 etapas pedidas:
Novo lead → Contato realizado → Diagnóstico → Proposta enviada → Negociação →
Fechado (`is_won`) → Perdido (`is_lost`).

## 6. Rotas

```
GET    /api/admin/pipelines                          lista pipelines + etapas
GET    /api/admin/opportunities                      lista (filtro: pipeline, etapa, responsável, status, busca)
POST   /api/admin/opportunities                      cria (manual ou a partir de lead)
GET    /api/admin/opportunities/[id]                 detalhe completo
PATCH  /api/admin/opportunities/[id]                 edita campos
PATCH  /api/admin/opportunities/[id]/stage           move de etapa (drag and drop)
POST   /api/admin/opportunities/[id]/products        adiciona produto de interesse
DELETE /api/admin/opportunities/[id]/products/[pid]  remove
GET    /api/admin/opportunities/[id]/activities      lista
POST   /api/admin/opportunities/[id]/activities      registra atividade/tarefa/nota
PATCH  /api/admin/opportunities/[id]/activities/[aid] conclui/edita
POST   /api/admin/opportunities/[id]/documents       adiciona documento
POST   /api/admin/opportunities/[id]/convert         **fluxo Nova Venda**
POST   /api/admin/leads/[id]/to-opportunity          promove lead a oportunidade
```

Todas sob `/api/admin/*` — já protegidas pelo `proxy.ts` existente, sem mudar auth.

### Regras da rota `/stage`
- Move para etapa `is_lost` → **exige `lost_reason`**, grava `lost_at`, status `perdida`
- Move para etapa `is_won` → **não fecha sozinha**; responde `requiresConversion: true`
  e o front abre o fluxo de contratação. A oportunidade só vira `ganha` quando a venda
  é concluída.
- Toda movimentação atualiza `stage_entered_at` e grava `opportunity_stage_history`

### Regras da rota `/convert` (transacional)
1. Cria cliente (com slug único) **ou** usa `clientId` existente
2. Cria `sales`
3. Cria N `client_products` com `sale_id`, usando `computeImpactOnMrr()` da Fase 1
4. Totaliza `total_mrr` / `total_one_time` na venda
5. Marca a oportunidade: `status = ganha`, `won_at`, `client_id`
6. Grava atividade "Venda fechada" no histórico
7. Gera a próxima ação (`next_action` de cada `client_products`: "Iniciar onboarding")

## 7. Componentes

**Novos**
- `KanbanBoard.tsx` — colunas por etapa, drag and drop
- `KanbanCard.tsx` — empresa, produto, valor, responsável, próxima ação, tempo na etapa, prioridade, alerta de parada
- `OpportunityDetailPanel.tsx` — painel lateral com abas (Dados, Produtos, Atividades, Documentos, Histórico)
- `OpportunityForm.tsx` — criar/editar
- `ActivityTimeline.tsx` + `ActivityForm.tsx`
- `LossReasonDialog.tsx` — obrigatório ao mover para Perdido
- `ConversionWizard.tsx` — assistente de 3 passos (Cliente → Produtos/Planos/Valores → Revisão)
- `OpportunityProductsPanel.tsx`
- `LeadsInbox.tsx` — lista de leads com ação "Criar oportunidade"

**Biblioteca de drag and drop**: `@dnd-kit/core` + `@dnd-kit/sortable` — é a escolha
com manutenção ativa e suporte real a React 19 (`react-beautiful-dnd` está
descontinuada e quebra em StrictMode).

## 8. Arquivos que serão alterados

**Alterados (poucos, de propósito):**
- `src/db/schema.ts` — 8 tabelas + 2 enums + `sale_id`
- `src/components/admin/AdminShell.tsx` — itens "CRM" e "Leads" na navegação
- `scripts/seed-demo.ts` — pipeline padrão + oportunidades de demonstração
- `package.json` — dependência de drag and drop

**Criados:** `src/lib/crm.ts`, `src/types/crm.ts`, as rotas do item 6, os componentes
do item 7, `src/app/admin/(protected)/crm/page.tsx`,
`src/app/admin/(protected)/leads/` (evolução da tela atual).

**Não serão tocados:** site institucional, propostas, briefing, tracking, auth,
`billing.ts`, Cliente 360, dashboard.

## 9. Riscos

| Risco | Grau | Mitigação |
|---|---|---|
| Conversão parcial (cria cliente e falha no produto) deixa lixo | **Alto** | Rota `/convert` valida tudo **antes** de escrever; ordem cliente → venda → produtos; retorna erro sem parcial. Ideal seria transação, mas o driver HTTP do Neon não suporta multi-statement — mitigo com validação prévia e ordem segura |
| Slug de cliente duplicado na conversão | Médio | Verificar e sufixar (`-2`) antes de inserir |
| Dados de demo do CRM contaminarem indicadores | Médio | Mesmo prefixo `demo-` da Fase 1, incluído no `--clean` |
| Drag and drop pesado com muitos cards | Médio | Kanban carrega no servidor e pagina por coluna (limite inicial 50/coluna) |
| Etapa configurável quebrar oportunidade órfã | Médio | Etapa só desativa (`is_active`), nunca deleta se tiver oportunidade |
| Escopo do wizard (13 campos) inflar a etapa 2.5 | Médio | Wizard em 3 passos; campos opcionais não bloqueiam a conclusão |
| `next build`/lint não rodam neste ambiente | **Alto** | Valido com `tsc` a cada etapa e sinalizo o que você precisa rodar |

## 10. Ordem de implementação

| Etapa | Conteúdo | Entregável |
|---|---|---|
| **2.1** | Schema, enums, migration 0004, `src/lib/crm.ts`, seed do pipeline | Banco pronto, nada visível |
| **2.2** | Lista de oportunidades + caixa de leads + criar oportunidade | Telas em tabela |
| **2.3** | Kanban com drag and drop + regras de etapa | CRM utilizável |
| **2.4** | Painel de detalhe: produtos, atividades, documentos, histórico, perda | CRM completo |
| **2.5** | Wizard de conversão em cliente + contratação | Ciclo comercial fechado |
| **2.6** | Validação final, build, testes, seed de demonstração | Fase 2 fechada |

Ao final de cada etapa: arquivos alterados, `tsc`, estado da migration, correção de
erros antes de seguir.

---

## Fora do escopo desta fase (modelagem preparada)

Contrato completo, assinatura eletrônica, onboarding completo, playbooks e financeiro
com faturas **não serão implementados**. A tabela `sales` já é o ponto de ancoragem:
`contract_id`, `signature_status` e `invoice_id` entram como colunas aditivas nas
Fases 3/4, sem refatorar o que for construído agora.
