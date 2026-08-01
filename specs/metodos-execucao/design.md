# Design — Etapa 1: Fundação dos Métodos (Métodos & Execução)

Apresentação prévia obrigatória, seguindo o mesmo formato de
`specs/crm-comercial/design.md`.

---

## 1. Auditoria — entidades reutilizadas

| Entidade | Como é reutilizada | Mudança |
|---|---|---|
| `products` | Método relaciona N produtos (`method_products`); Playbook relaciona 1 produto (`playbooks.product_id`) | Nenhuma |
| `admin_users` | Autor de método, playbook e versão | Nenhuma |
| `slugify()` (`src/lib/utils.ts`) | Slugs de método/playbook, mesmo padrão de `products`/`clients` | Nenhuma |

Nada existente é alterado. `client_products`/`opportunities` **não** ganham FK
para método/playbook nesta etapa — isso é integração de Cliente 360, fora de
escopo (ver seção 9).

## 2. Novas entidades

O enunciado sugere `Method`, `MethodVersion`, `MethodStage`, `Playbook`,
`PlaybookVersion`, `PlaybookProduct`, `PlaybookResource`. Para não duplicar
estrutura semelhante:

- **Um único enum de status** (`content_status`) compartilhado por método e
  playbook, em vez de dois enums quase idênticos.
- **Uma única tabela `resources`**, em vez de `MethodResource`/`PlaybookResource`
  separadas — a diferença é só qual FK está preenchida (mesmo raciocínio de
  `opportunity_activities` cobrir atividade/reunião/tarefa/nota com uma tabela).
- **Sem `PlaybookProduct`**: o pedido é "produto relacionado" no singular para
  playbook (item 8), então é uma FK simples (`playbooks.product_id`). Só
  `Method` precisa de relação N:N com produtos.

| # | Tabela | Por quê |
|---|---|---|
| 1 | `methods` | Entidade central do módulo |
| 2 | `method_products` | N:N método↔produto (mesmo padrão de `opportunity_products`) |
| 3 | `method_stages` | Macroetapas estratégicas (aba Estrutura) |
| 4 | `method_versions` | Log de versões publicadas/arquivadas |
| 5 | `playbooks` | Entidade central de playbook |
| 6 | `playbook_versions` | Mesmo padrão de `method_versions` |
| 7 | `resources` | Biblioteca de recursos/modelos, compartilhada |

## 3. Modelo de dados proposto

### Enums novos

```
content_status   → rascunho | em_revisao | publicado | arquivado
playbook_type    → implantacao | diagnostico | projeto | recorrente |
                    treinamento | acompanhamento | manutencao | renovacao |
                    encerramento
```

`content_status` é pequeno e estável (4 valores fixos, controla regra de
versionamento). `playbook_type` também é fixo — os 9 valores vêm explícitos do
enunciado (item 7).

### Validado em app, não em enum

`category` de método e `type`/`title` de `resources` ficam como `text`
validado em `src/lib/methods.ts` (`METHOD_CATEGORIES`, `RESOURCE_TYPES`) —
mesma convenção de `products.category` e `src/lib/crm.ts` (`OPPORTUNITY_SOURCES`
etc.): são taxonomias que crescem com o negócio.

### Tabelas

```
methods
  id, slug(unique), name
  short_description, full_description
  category text                         -- validado em app
  problem_solved, ideal_client_profile, expected_result
  principles jsonb text[], premises jsonb text[]
  success_indicators jsonb text[], risks jsonb text[]
  status content_status default 'rascunho'
  version text default '1.0'
  author_id → admin_users
  published_at timestamp nullable
  timestamps

method_products
  id, method_id → methods, product_id → products, created_at
  unique(method_id, product_id)

method_stages
  id, method_id → methods
  name, sort_order, objective, description, expected_result, success_criteria
  timestamps

method_versions
  id, method_id → methods
  version_label text, status content_status
  snapshot jsonb                        -- cópia dos campos + macroetapas no momento
  change_note text nullable
  author_id → admin_users, created_at

playbooks
  id, slug(unique), name, description, objective
  method_id → methods (not null)
  product_id → products (not null)
  type playbook_type
  default_duration_days integer nullable
  prerequisites jsonb text[]
  expected_result text
  default_responsibles jsonb text[]     -- papéis em texto livre (ex.: "Gestor de Tráfego")
  required_documents jsonb text[], deliverables jsonb text[]
  success_criteria jsonb text[]
  status content_status default 'rascunho'
  version text default '1.0'
  author_id → admin_users
  published_at timestamp nullable
  timestamps

playbook_versions
  id, playbook_id → playbooks
  version_label text, status content_status
  snapshot jsonb, change_note text nullable
  author_id → admin_users, created_at

resources
  id, title, type text                  -- validado em app
  url text nullable, description text nullable
  method_id → methods nullable
  playbook_id → playbooks nullable
  author_id → admin_users
  timestamps
```

### Regra de versionamento (item 10 do pedido)

`methods`/`playbooks` guardam o estado **corrente** editável. Publicar ou
arquivar grava um snapshot em `method_versions`/`playbook_versions` e
incrementa `version`. Editar um registro `publicado` primeiro grava o
snapshot do estado publicado (se ainda não gravado) e volta `status` para
`rascunho` — nunca edita o publicado in-place. Centralizado em
`transitionToDraft()` (`src/lib/methods.ts`), chamado pelas duas rotas PATCH,
para não duplicar a regra. Sem comparação avançada entre versões nesta etapa —
só listagem (mock "9. Versões do Playbook").

`method_stages` fica fora do versionamento por ora — mutável direto no método
corrente; o snapshot completo (campos + macroetapas) entra no `jsonb` de
`method_versions` no momento da publicação, o que não impede comparação
estruturada numa fase futura.

## 4. Relacionamentos

```
methods 1──N method_products N──1 products
methods 1──N method_stages
methods 1──N method_versions
methods 1──N playbooks
methods 1──N resources (nullable)

playbooks N──1 products
playbooks 1──N playbook_versions
playbooks 1──N resources (nullable)

admin_users 1──N methods/playbooks/method_versions/playbook_versions/resources (autor)
```

Sem FK circular. Sem FK de `methods`/`playbooks` para `clients` ou
`opportunities` nesta etapa.

## 5. Migrations

**Uma migration: `0005`, 100% aditiva** (a próxima livre — `0004` já existe no
working tree, é do CRM Comercial).

- `CREATE TYPE` × 2 (`content_status`, `playbook_type`)
- `CREATE TABLE` × 7

Nenhum `DROP`, `TRUNCATE` ou `ALTER` em tabela existente. Rollback = dropar as
tabelas novas.

Gerada com `npm run db:generate` a partir do `schema.ts`, aplicada com
`npm run db:push`.

## 6. Rotas

```
GET/POST   /api/admin/methods                       lista (filtro produto/categoria/status/autor + busca) / cria
GET/PATCH  /api/admin/methods/[id]                   detalhe completo / edita (aplica transitionToDraft)
POST       /api/admin/methods/[id]/duplicate
POST       /api/admin/methods/[id]/publish
POST       /api/admin/methods/[id]/archive
GET/POST   /api/admin/methods/[id]/stages            lista / cria macroetapa
PATCH/DEL  /api/admin/methods/[id]/stages/[stageId]  edita / remove
PATCH      /api/admin/methods/[id]/stages/reorder    salva nova ordem

GET/POST   /api/admin/playbooks                      lista (filtro produto/método/tipo/status + busca) / cria
GET/PATCH  /api/admin/playbooks/[id]                 detalhe / edita (mesma regra de versionamento)
POST       /api/admin/playbooks/[id]/duplicate
POST       /api/admin/playbooks/[id]/publish
POST       /api/admin/playbooks/[id]/archive
POST       /api/admin/playbooks/[id]/new-version     nova versão em rascunho a partir da publicada

GET/POST   /api/admin/resources                      lista (filtro method_id/playbook_id/type) / cria
```

Todas sob `/api/admin/*` — já protegidas pelo `src/proxy.ts`, sem mudar auth.

## 7. Componentes

**Novos**
- `MethodsLibrary.tsx` — cards + filtros + busca (usado no hub e em `/admin/metodos/biblioteca`)
- `MethodCard.tsx`, `MethodForm.tsx` (seções, não formulário único), `MethodStagesPanel.tsx` (reordenar macroetapas), `MethodVersionsPanel.tsx`
- `PlaybooksLibrary.tsx` — cards + tabela + filtros + busca (usado no hub e em `/admin/playbooks`)
- `PlaybookCard.tsx`, `PlaybookForm.tsx`, `PlaybookVersionsPanel.tsx`
- `ResourcesPanel.tsx` — estrutura inicial (lista + estado vazio)
- `StatusBadge.tsx` — badge reutilizável para os 4 status
- `MetodosOverviewTabs.tsx` — abas do hub, mesmo padrão de `ClientTabs.tsx`/`DashboardTabs.tsx`

**Biblioteca/lib nova**: `src/lib/methods.ts` — `METHOD_CATEGORIES`,
`PLAYBOOK_TYPES`, `RESOURCE_TYPES`, `CONTENT_STATUS` (labels/cores),
`transitionToDraft()`, funções de validação — mesmo padrão de `src/lib/crm.ts`.

## 8. Arquivos que serão alterados

**Alterados (poucos, de propósito):**
- `src/db/schema.ts` — 2 enums + 7 tabelas
- `src/components/admin/AdminShell.tsx` — item de navegação: label
  "Métodos e Playbooks" → "Métodos & Execução", `href`
  `/admin/playbooks` → `/admin/metodos`, remove `comingSoon`
- `scripts/seed-demo.ts` (ou script próprio) — seed do produto-piloto

**Criados:** `src/lib/methods.ts`, as rotas do item 6, os componentes do item
7, `src/app/admin/(protected)/metodos/` (hub, biblioteca, novo, `[id]`,
`[id]/editar`), `src/app/admin/(protected)/playbooks/` (biblioteca, novo,
`[id]`, `[id]/editar`).

**Não serão tocados:** site institucional, propostas, briefing, tracking,
CRM Comercial, Cliente 360, dashboard, auth.

## 9. Fora de escopo desta etapa (modelagem preparada)

Construtor visual de etapas/tarefas do playbook, subtarefas, reuniões,
aplicação a cliente, `PlaybookInstance`/`PlaybookStageInstance`/`PlaybookTaskInstance`,
bloqueios, próxima ação automática, automações, indicadores operacionais
avançados, integração completa com Cliente 360, comparação avançada entre
versões. A modelagem atual (tabelas próprias, sem acoplamento a `client_products`)
não impede essas entidades entrarem depois como tabelas aditivas.

## 10. Riscos

| Risco | Grau | Mitigação |
|---|---|---|
| "Métodos"/"Playbooks" existirem como aba do hub **e** rota própria gera lógica duplicada | Médio | Aba do hub renderiza o mesmo componente de biblioteca da rota dedicada — uma implementação, dois pontos de entrada |
| Formulário de método/playbook vira campo único gigante | Médio | Dividido em seções com scroll interno (Identificação, Diagnóstico, Indicadores/Riscos, Relacionamentos) |
| Regra "publicado não edita direto" aplicada de forma inconsistente corrompe a versão publicada | Alto | Centralizada em `transitionToDraft()`, chamada pelas duas rotas PATCH, nunca duplicada |
| `next build`/lint não rodam neste ambiente | Alto | Valido com `tsc --noEmit` a cada bloco e sinalizo o que precisa rodar localmente |

## 11. Ordem de implementação

| Etapa | Conteúdo | Entregável |
|---|---|---|
| **1.1** | Schema, enums, migration 0005, `src/lib/methods.ts` | Banco pronto, nada visível |
| **1.2** | Rotas de Método (CRUD + publish/archive/duplicate + stages) | API testável |
| **1.3** | Rotas de Playbook + resources | API completa |
| **1.4** | Páginas de Método (biblioteca, criação/edição, detalhe com abas) | Métodos utilizáveis |
| **1.5** | Páginas de Playbook (biblioteca, criação/edição, detalhe com abas) | Playbooks utilizáveis |
| **1.6** | Hub `/admin/metodos` (Visão Geral com indicadores reais) + `AdminShell` | Módulo navegável, sem links quebrados |
| **1.7** | Seed do produto-piloto (Método Brain de Estruturação Comercial + 5 playbooks) | Dados de exemplo |
| **1.8** | Validação final: `tsc`, migrations, testes manuais, site institucional intacto | Etapa 1 fechada |

---

## Fora do escopo desta fase (confirmado)

Aplicação a clientes, tarefas reais, central de execução e tudo listado na
seção 9 entram na Etapa 2 (Aplicação e Execução), sobre a base de dados criada
aqui.
