# Tasks — Plataforma de Operação da Brain

Bloco 1 (cadastro manual de cliente) já em produção, sem mudanças. A partir
daqui, nova arquitetura completa — schema primeiro (todos os módulos juntos,
uma migration só), depois seed de demonstração (pra enxergar UI com dado
real), depois API+UI módulo por módulo, depois dashboard, depois conversão
para Server Components.

## 0. Schema de todos os módulos

- [ ] `products`, `clientProducts` (v2, substitui a versão com enum),
      `clientStageHistory`, `trackedLinks`, `linkClicks`,
      `clientDiagnostics` em `src/db/schema.ts`.
- [ ] `src/lib/method-stages.ts` (constante `METHOD_STAGES`).
- [ ] `npm run db:generate` + `npm run db:push`.

**Checkpoint**: `npm run build` passa; 6 tabelas novas no banco.

## 1. Seed de demonstração

- [ ] `scripts/seed-demo.ts` + `npm run db:seed:demo` (com `--clean`).
- [ ] 6 produtos reais (de `src/data/services.ts`).
- [ ] 7–8 clientes plausíveis, `enteredAt` espalhado em 12 meses.
- [ ] Engajamentos em estágios variados, 2 travados há semanas.
- [ ] Diagnósticos com scores variados → recomendações diferentes.
- [ ] 8–10 links rastreáveis, 90 dias de cliques com tendência de
      crescimento (bio do Instagram = campeão).
- [ ] 90 dias de `page_views`/`click_events`, 30–40 leads com UTM coerente,
      `quiz_sessions` com ~30% de conclusão.
- [ ] Todo dado de demo é identificável (slugs/sessionIds prefixados
      `demo-`) para o `--clean` remover com segurança, sem `DROP TABLE`.

**Checkpoint**: rodar o seed, conferir volumes no banco; rodar `--clean`,
conferir que só o prefixado `demo-` sumiu.

## 2. Catálogo + engajamento do cliente (Módulos 1 e 2)

- [ ] `GET /api/admin/products`.
- [ ] `GET/POST /api/admin/clients/[slug]/products`.
- [ ] `PATCH /api/admin/clients/[slug]/products/[id]` (status + estágio,
      grava `client_stage_history` ao mudar estágio).
- [ ] `ClientProductsPanel.tsx` — contratados (com estágio) + upsell
      (catálogo menos contratado).
- [ ] Seção "Produtos" em `/admin/clients/[slug]`.

**Checkpoint**: associar produto a um cliente de teste, avançar estágio 2x,
conferir `client_stage_history` com as 2 transições.

## 3. Links rastreáveis (Módulo 3)

- [ ] `GET/POST /api/admin/links`.
- [ ] `GET /l/[slug]/route.ts` — 302 + log de clique fire-and-forget.
- [ ] `/admin/links/page.tsx` — ranking, CTR, destino, jornada pós-clique.
- [ ] Item "Links" no nav do `AdminShell`.

**Checkpoint**: criar um link de teste, acessar `/l/[slug]`, confirmar
redirect funcionando e `link_clicks` gravado; matar a query proposital e
confirmar que o redirect não quebra (fire-and-forget de verdade).

## 4. Diagnóstico (Módulo 4)

- [ ] `GET/POST /api/admin/clients/[slug]/diagnostics` (scores,
      `bottleneck`, `recommendations`).
- [ ] `ClientDiagnosticPanel.tsx`.
- [ ] Seção "Diagnóstico" em `/admin/clients/[slug]`, com a recomendação
      mais recente substituindo a lista genérica de upsell quando houver.

**Checkpoint**: criar diagnóstico com nota baixa em "tecnologia", confirmar
que a recomendação aponta Broker Apps com justificativa.

## 5. Dashboard — 3 visões

- [ ] `npm install recharts`.
- [ ] `GET /api/admin/dashboard/operacao`, `.../links`, `.../leads`.
- [ ] `/admin/dashboard/page.tsx` reestruturado em 3 seções, com gráficos
      de linha/barra do `recharts`.

**Checkpoint**: os 3 números batem com contagem manual no banco (após o
seed de demonstração).

## 6. Conversão para Server Components

- [ ] `/admin/clients/[slug]/page.tsx` e `/admin/dashboard/page.tsx` buscam
      dado direto via `db` (Server Component), sem `useEffect`/fetch para
      dado inicial; `"use client"` só nas ilhas interativas.
- [ ] `loading.tsx` (skeleton) nas duas rotas.

**Checkpoint**: `/admin/clients/[slug]` mostra conteúdo no primeiro paint
(sem spinner inicial) com o dado do seed de demonstração.

## Fora desta versão (adiado, não cancelado)

- Propostas enviadas, arquivos/pastas, roadmap genérico (spec anterior).
- Página de gestão do catálogo de produtos (hoje só via seed/SQL direto).
