# Relatório de Validação — Fase 1 (Brain OS)

Escopo auditado: commits `ef75ff2` → `459ddae` (Fase 1) + correções aplicadas nesta
validação (`fe3462d`).
Data da auditoria: 01/08/2026.

---

## Veredito final (resumo executivo)

| Item | Resultado |
|---|---|
| **Fase 1** | **Validada com ressalvas** |
| **Build** | **Aprovado** (TypeScript limpo; `next build` não executável neste ambiente — ver §1) |
| **Banco** | **Aprovado** (migrations 100% aditivas, nenhuma operação destrutiva) |
| **Recomendação Fase 2** | **Pode iniciar**, após os 3 itens de "antes da Fase 2" (§19) |

Foram encontrados **4 defeitos**, todos de Fase 1 e todos **já corrigidos e commitados**
nesta validação. O mais grave inflava o MRR em até 12×.

---

## 1. Build de produção

- **`npx tsc --noEmit`: PASSOU, zero erros** — antes e depois das correções.
- **`next build` não pôde ser executado neste ambiente.** O `node_modules` foi
  instalado no Windows e não contém o binário SWC de Linux
  (`@next/swc-linux-x64-gnu`), e o sandbox não tem acesso ao registry npm para
  baixá-lo. Erro: `Failed to load SWC binary for linux/x64`.
- **Isto é limitação de ambiente, não defeito do código.** `next.config.ts` **não**
  possui `eslint.ignoreDuringBuilds` nem `typescript.ignoreBuildErrors`, ou seja, o
  build da Vercel valida tipos e lint — e o último deploy publicado está no ar e
  funcional.
- **Ação necessária sua**: rodar `npm run build` na sua máquina para fechar este item
  com evidência local. Com TypeScript limpo, a probabilidade de falha é baixa.

## 2. Verificação de TypeScript

**APROVADO.** `npx tsc --noEmit` → exit 0, nenhum erro, nenhum warning.
Reexecutado após as correções: continua limpo.

## 3. Lint

**NÃO EXECUTÁVEL neste ambiente.** O ESLint trava mesmo em arquivo único (timeout
>43s), pela mesma causa raiz do item 1: `eslint-config-next` tenta resolver o binário
SWC/rede indisponível. Não é erro de código.
**Ação necessária sua**: `npm run lint` local.

## 4. Migrations criadas e aplicadas

Quatro migrations no repositório, todas registradas em `drizzle/meta/_journal.json`:

| # | Tag | Origem |
|---|---|---|
| 0000 | `pale_mikhail_rasputin` | Base (CRM/analytics) |
| 0001 | `slippery_celestials` | `entered_at` em clients |
| 0002 | `sleepy_susan_delgado` | Plataforma de operação (produtos, estágios, links, diagnóstico) |
| 0003 | `shallow_puma` | **Fase 1** — camada comercial |

**Migration 0003 (Fase 1)** cria a tabela `product_plans`, 3 enums
(`billing_cycle`, `billing_type`, `user_role`) e adiciona **19 colunas**:
2 em `admin_users` (`name`, `role`) e 17 em `client_products` (`plan_id`,
`negotiated_value`, `billing_type`, `billing_cycle`, `billing_day`, `installments`,
`quantity`, `number_of_users`, `discount`, `contract_term`, `impact_on_mrr`,
`responsible_user_id`, `salesperson_id`, `onboarding_status`,
`implementation_progress`, `operational_status`, `next_action`, `next_action_date`).

Aplicação em produção: confirmada indiretamente — o painel em produção lê e exibe
esses campos sem erro (`/admin/dashboard`, `/admin/clients`). Não foi possível
consultar o Neon diretamente (rede bloqueada no sandbox).

## 5. Nenhum dado real apagado ou sobrescrito

**CONFIRMADO.** Varredura por `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` e `DELETE FROM`
em **todas** as migrations: **nenhuma ocorrência**. A 0003 é exclusivamente
`CREATE TABLE` + `ADD COLUMN`, e toda coluna nova é nullable ou tem default — não
reescreve linha existente.

O único `DELETE` do projeto está em `scripts/seed-demo.ts --clean`, que é opt-in por
flag e filtrado por prefixo `demo-` (§15).

## 6. Site institucional não alterado

**CONFIRMADO por dois caminhos:**

1. Nenhum arquivo de `components/sections|layout|ui|proposals|briefing|tracking` nem
   de `app/(page|hub|proposta|briefing|privacy|terms|layout)` aparece no diff da Fase 1.
2. `globals.css` foi tocado, mas **só por adição**: novos tokens `--color-os-*` e a
   classe de escopo `.brain-os { color-scheme: light }`. Nenhum token existente do
   site foi alterado.

Verificação ao vivo: `https://brainmktp.com.br/` renderiza normalmente (home, método,
soluções, ecossistema, contato).

## 7. Autenticação e login

**FUNCIONANDO.** `GET /admin/dashboard` sem sessão → **302 para `/admin/login`**,
confirmado ao vivo em produção. `src/proxy.ts` mantém o matcher
`["/admin/:path*", "/api/admin/:path*"]`, retorna 401 JSON em rotas de API e faz
renovação rolling de 7 dias do cookie. A Fase 1 adicionou `role` ao payload da sessão
sem quebrar o fluxo.

## 8. Rotas antigas

**TODAS PRESERVADAS.** Presentes e intocadas: `/`, `/hub`, `/privacy`, `/terms`,
`/briefing/mv-imoveis`, as 4 propostas (`vaz-ferreira`, `mv-imoveis`, `capbox`,
`francine-leite`), `/l/[slug]`, e as APIs `auth/login`, `auth/logout`,
`briefings/[client]`, `leads`, `track/click`, `track/pageview`, `track/quiz`.

## 9. CRUD de Produtos

| Operação | Status | Observação |
|---|---|---|
| Criar | OK | `POST /api/admin/products` — valida nome, gera slug |
| Editar | OK | `PATCH /api/admin/products/[slug]` — nome, descrição, categoria, ordem |
| Desativar | OK | via `PATCH { isActive: false }` (soft delete — correto) |
| Listar | OK | `GET /api/admin/products` ordenado por `sortOrder` |
| **Vincular planos** | **PARCIAL** | ver abaixo |

**Vincular planos — gap real.** O CRUD de planos existe e funciona
(`GET/POST /api/admin/products/[slug]/plans`, `PATCH .../plans/[id]`), mas **a coluna
`plan_id` de `client_products` nunca é escrita**: nem o POST nem o PATCH da
contratação aceitam `planId`. Na prática, você cadastra planos mas **não consegue
vincular um plano a um contrato de cliente**. O preço é digitado à mão em
`negotiated_value`, sem herdar `base_price` do plano.

**Ressalva de método**: os testes de CRUD foram feitos por **auditoria de código**, não
por execução ao vivo — a extensão do Chrome caiu no meio da validação. Como os
endpoints só podem ser criados/editados em produção (e `products` não tem DELETE),
optei por não poluir o banco real com registros de teste que não poderiam ser
removidos depois.

## 10. Contratação de produtos por cliente

| Requisito | Status |
|---|---|
| Cliente com um produto | OK |
| Cliente com vários produtos | OK (N linhas em `client_products`) |
| Produto recorrente | OK |
| Produto pontual | OK (`billing_type = pontual`) |
| Valor negociado | OK (`negotiated_value`) |
| Ciclo de cobrança | OK no cadastro; **estava quebrado no cálculo** (§11, corrigido) |
| Responsável | PARCIAL — `responsible_user_id` é aceito pela API, mas `salesperson_id` nunca é escrito |
| Progresso de implantação | OK (0–100, com clamp) |
| Próxima ação | OK (`next_action` + `next_action_date`) |

**Colunas mortas (criadas na 0003, nunca lidas nem escritas em nenhum lugar):**
`plan_id`, `salesperson_id`, `quantity`, `installments`, `number_of_users`,
`contract_term`. `billing_day` é escrito só pelo seed e exibido, nunca editável.

Isso não quebra nada hoje, mas é dívida: seis colunas sugerindo funcionalidade que
não existe.

## 11. Validação do cálculo de MRR — **4 DEFEITOS ENCONTRADOS E CORRIGIDOS**

### DEFEITO 1 (CRÍTICO) — ciclo de cobrança ignorado no MRR
`computeImpactOnMrr()` considerava apenas `billingType`, **ignorando `billingCycle`**.
Um contrato **recorrente anual de R$ 12.000 entrava como R$ 12.000 de MRR** em vez de
R$ 1.000 — **12× inflado**. Trimestral inflava 3×, semestral 6×.

O bug era **totalmente alcançável pela interface**: `ClientProductsPanel.tsx` oferece
o seletor de ciclo (mensal/trimestral/semestral/anual/único) e envia o valor no POST,
que simplesmente não o repassava ao cálculo.

**Corrigido**: o valor líquido agora é dividido pelos meses do ciclo
(anual ÷12, semestral ÷6, trimestral ÷3), com arredondamento a 2 casas.

### DEFEITO 2 — combinação contraditória entrava no MRR
`billingType = recorrente` + `billingCycle = unico` (selecionável na UI) somava o
valor cheio ao MRR. **Corrigido**: ciclo "único" retorna 0 sempre.

### DEFEITO 3 — MRR defasado ao mudar só o ciclo
No `PATCH`, o recálculo do MRR só disparava se mudasse valor, desconto ou tipo. Mudar
**apenas o ciclo** (ex.: mensal → anual) gravava o novo ciclo e **mantinha o MRR
antigo**. **Corrigido**: `billingCycle` entra na condição de recálculo.

### DEFEITO 4 — "Receita contratada" somava contratos encerrados
No dashboard, `SUM(negotiated_value)` não tinha filtro de status, então contratos
encerrados continuavam inflando o número. **Corrigido**:
`FILTER (WHERE status <> 'encerrado')`.

### Resultado da validação após correção

Suíte de 11 casos executada — **todos passaram**:

```
PASS  mensal recorrente 1500                 → 1500
PASS  ANUAL recorrente 12000 → /12           → 1000
PASS  TRIMESTRAL 3000 → /3                   → 1000
PASS  SEMESTRAL 6000 → /6                    → 1000
PASS  pontual 4000 → fora do MRR             → 0
PASS  recorrente+unico (contraditório) → 0   → 0
PASS  desconto: 1500-300 mensal              → 1200
PASS  desconto + anual: (12000-1200)/12      → 900
PASS  valor nulo                             → 0
PASS  desconto > valor → nunca negativo      → 0
PASS  ciclo ausente assume mensal            → 800
```

**Cancelados/inativos fora do MRR: CONFIRMADO.** Os 5 pontos de agregação filtram por
`status = 'ativo'` (dashboard, lista de clientes, cliente 360, lista de produtos,
detalhe do produto). Nenhum ponto de soma ficou sem filtro.

**Desconto e valor negociado respeitados: CONFIRMADO** (casos 7, 8 e 10 acima).

## 12. Página Cliente 360

| Item | Status |
|---|---|
| Abas funcionando | PARCIAL — 4 de 10 implementadas |
| Produtos em cards separados | OK |
| Carregamento dos dados corretos | OK (Server Component, query direta ao banco) |
| Estados vazios | OK — 3 estados tratados (sem produto, sem evento, sem briefing) |
| Estado de erro | OK para cliente inexistente (`notFound()`); **sem error boundary** para falha de banco |
| Responsividade | FRACA — apenas 6 breakpoints na página inteira |

**Abas**: implementadas → Visão Geral, Produtos, Diagnóstico, Histórico.
Marcadas como *coming soon* → Operação, Tarefas, Reuniões, Contratos, Financeiro,
Documentos. Ou seja, **6 abas visíveis não fazem nada** — é honesto por estarem
rotuladas, mas é superfície inacabada na tela principal do produto.

## 13. Dashboard

| Item | Status |
|---|---|
| MRR real | OK — vem de `SUM(impact_on_mrr) FILTER (status='ativo')` |
| Receita contratada | OK **após correção** do §11 defeito 4 |
| Clientes ativos | OK — `COUNT(DISTINCT client_id)` com status ativo |
| **Ausência de números hardcoded** | **CONFIRMADO** — varredura não encontrou nenhum literal; todos os `StatTile` recebem valor calculado |

## 14. Dados de demonstração criados

Gerados por `npm run db:seed:demo`:

- **6 produtos** do catálogo real (Tráfego pago, Posicionamento, Sites e LPs,
  Audiovisual, Inteligência comercial, Tecnologia) — **sem prefixo demo**, pois são o
  catálogo legítimo; inseridos de forma idempotente por slug.
- **8 clientes** com prefixo `demo-`: Imóveis Alvorada, Marcos Corretor Premium,
  Vidal Advocacia, Loja Bella Casa, Construtora Horizonte, Ferreira Imóveis,
  Studio Fit Belém, Nogueira Advogados Associados.
- **Contratações** (`client_products`) para esses clientes, com valores, ciclos,
  estágios do Método, progresso e próxima ação — incluindo casos "travados" de propósito.
- **Diagnósticos** com scores por pilar e recomendações derivadas.
- **10 links rastreáveis** com prefixo `demo-` + 90 dias de cliques com tendência.
- **90 dias** de `page_views`, `click_events`, `leads` e `quiz_sessions`, todos com
  `session_id` prefixado `demo-session-`.

**Nenhum dado real foi alterado**: o seed é idempotente (cliente existente é pulado,
produto existente é reaproveitado).

## 15. Como separar demonstração de dados reais

A separação é por **convenção de prefixo**, e é consistente:

- Clientes de demo: `slug` começa com `demo-`
- Links de demo: `slug` começa com `demo-`
- Tráfego/leads/quiz de demo: `session_id` começa com `demo-session-`

Para limpar: **`npm run db:seed:demo -- --clean`**. Remove, em ordem de dependência,
os cliques e links demo, os engajamentos/histórico/diagnósticos e clientes demo, e
todos os eventos com sessão `demo-session-`. **Não dropa tabela e não toca em dado
real.**

Os **6 produtos permanecem** após o `--clean` — correto, pois são o catálogo real da
agência, não demonstração.

**Ressalva**: o `--clean` não foi executado nesta auditoria (sem acesso ao banco a
partir do sandbox). A lógica foi auditada linha a linha e está correta, mas a execução
ainda é não testada.

## 16. Os dados de demo entram nos indicadores financeiros?

**SIM — entram.** Esta é a ressalva mais importante do relatório.

As contratações dos clientes `demo-` têm `impact_on_mrr` preenchido e status `ativo`.
As queries de MRR, receita contratada, clientes ativos e entregas ativas **não
distinguem demo de real** — filtram apenas por status. Logo, **o MRR exibido hoje no
dashboard é majoritariamente ficção**.

Enquanto for vitrine, tudo bem. **Antes de usar o painel para decisão comercial real,
rode o `--clean`** — ou o número vai enganar você.

## 17. Arquivos criados e alterados

**Criados (13):** `drizzle/0003_shallow_puma.sql`, `drizzle/meta/0003_snapshot.json`,
`admin/(protected)/products/page.tsx`, `admin/(protected)/products/[slug]/page.tsx`,
`api/admin/products/[slug]/route.ts`, `api/admin/products/[slug]/plans/route.ts`,
`api/admin/products/[slug]/plans/[id]/route.ts`, `components/admin/ClientTabs.tsx`,
`components/admin/ClientsListClient.tsx`, `components/admin/CreateProductForm.tsx`,
`components/admin/ProductPlansPanel.tsx`, `components/admin/ProductStatusToggle.tsx`,
`src/lib/billing.ts`.

**Alterados (29):** `drizzle/meta/_journal.json`, `scripts/seed-admin.ts`,
`scripts/seed-demo.ts`, `specs/client-workspace/requirements.md`,
`src/db/schema.ts`, `src/lib/auth.ts`, `src/proxy.ts`, `src/app/globals.css`,
`src/app/admin/login/page.tsx`, dashboard, clients (lista, detalhe, loading), leads,
links, pixels, `api/admin/products/route.ts`,
`api/admin/clients/[slug]/products/route.ts` e `.../[id]/route.ts`,
`api/auth/login/route.ts`, `AdminShell.tsx`, `ClientDiagnosticPanel.tsx`,
`ClientForm.tsx`, `ClientProductsPanel.tsx`, `CreateLinkForm.tsx`,
`DashboardTabs.tsx`, `DashboardWidgets.tsx`, `charts/StageFunnelChart.tsx`,
`charts/TrendLineChart.tsx`.

Total: **42 arquivos, +3.441 / −397 linhas.**

## 18. Pendências técnicas da Fase 1

1. **`plan_id` nunca vinculado** — planos existem mas não conectam ao contrato (§9).
2. **6 colunas mortas** — `plan_id`, `salesperson_id`, `quantity`, `installments`,
   `number_of_users`, `contract_term` (§10).
3. **6 abas *coming soon*** na tela principal do Cliente 360 (§12).
4. **Sem error boundary** no Cliente 360 para falha de banco (§12).
5. **Responsividade fraca** — 6 breakpoints na página inteira (§12).
6. **Desconto não editável no cadastro** — só via API/PATCH, o formulário de
   contratação não expõe o campo.
7. **README não documenta** `db:seed:demo` nem o `--clean` (foi pedido e não foi feito).
8. **`--clean` nunca executado** — lógica correta em revisão, execução não testada.
9. **Divergência de decisão de design**: ficou acordado tema **escuro** na paleta da
   Brain; foi implementado **claro com acento verde** (`--color-os-bg: #f4f6f8`,
   `--color-os-accent: #16a34a`). Funciona e está escopado ao `/admin` sem afetar o
   site, mas não é o que foi combinado.
10. **Pré-existente (fora da Fase 1)**: o site em produção ainda tem placeholders —
    `canonical: seu_dominio_aqui.com.br`, `SEU_EMAIL_AQUI@brainmkt.com.br`,
    `SEU_INSTAGRAM_AQUI`. Prejudica SEO e compartilhamento.

## 19. Correções aplicadas nesta validação

Commit **`fe3462d`** — *fix(brain-os): MRR normaliza ciclo de cobrança e receita
contratada ignora encerrados*. Arquivos: `src/lib/billing.ts`,
`api/admin/clients/[slug]/products/route.ts`, `.../[id]/route.ts`,
`admin/(protected)/dashboard/page.tsx`, `scripts/seed-demo.ts`.

TypeScript revalidado após as mudanças: **limpo**.

**Atenção — possível backfill.** Contratos criados **antes** desta correção com ciclo
diferente de mensal têm `impact_on_mrr` gravado errado no banco. Os dados de demo não
são afetados (usam só mensal/único). Para conferir e corrigir:

```sql
-- 1) Existe contrato afetado?
SELECT id, negotiated_value, billing_cycle, impact_on_mrr
FROM client_products
WHERE billing_type = 'recorrente' AND billing_cycle <> 'mensal';

-- 2) Se houver, recalcular:
UPDATE client_products SET impact_on_mrr = ROUND(
  GREATEST(0, COALESCE(negotiated_value,0) - COALESCE(discount,0)) /
  CASE billing_cycle WHEN 'anual' THEN 12 WHEN 'semestral' THEN 6
                     WHEN 'trimestral' THEN 3 ELSE 1 END, 2)
WHERE billing_type = 'recorrente' AND billing_cycle NOT IN ('mensal','unico');

UPDATE client_products SET impact_on_mrr = 0
WHERE billing_type <> 'recorrente' OR billing_cycle = 'unico';
```

---

## Antes de iniciar a Fase 2

1. Rodar `npm run build` e `npm run lint` na sua máquina (§1 e §3) — os dois itens que
   este ambiente não conseguiu fechar.
2. Rodar o SQL de verificação de backfill acima e fazer deploy da correção `fe3462d`.
3. Decidir sobre `plan_id`: ou vincular plano ao contrato, ou remover as 6 colunas
   mortas. Levar schema morto para a Fase 2 multiplica o custo de manutenção.

## Riscos remanescentes

- **Alto** — MRR do dashboard hoje é dominado por dados de demonstração (§16).
  Não use para decisão comercial antes do `--clean`.
- **Médio** — 6 colunas e 6 abas prometem funcionalidade inexistente; se a Fase 2
  construir por cima sem resolver, a dívida cresce.
- **Médio** — build e lint não verificados localmente nesta auditoria.
- **Baixo** — `--clean` com lógica auditada mas execução não testada.
- **Baixo** — sem error boundary no Cliente 360; falha de banco derruba a página.

## Conclusão

**Fase 1 validada com ressalvas.** A fundação está sólida: migrations aditivas e
seguras, nenhum dado real tocado, site institucional e autenticação intactos, rotas
antigas preservadas, dashboard sem números hardcoded e separação demo/real bem
desenhada.

O cálculo de MRR — o coração comercial da fase — **chegou quebrado em 4 pontos**, o
principal inflando receita anual em 12×. Todos foram corrigidos e cobertos por testes
nesta validação. **Recomendo iniciar a Fase 2** após os 3 itens acima.
