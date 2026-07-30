# Tasks — Painel Admin, Analytics e CRM de Leads

Ordem otimizada por dependência. Cada bloco só começa quando o anterior estiver
funcional — evita retrabalho (ex: não faz sentido montar o dashboard antes de
ter eventos reais no banco).

## 0. Infraestrutura (pré-requisito, ação manual sua)

- [ ] **Você**: provisionar um banco Postgres na Vercel (aba Storage → Marketplace
      → Neon, dentro do projeto `brain-marketing`) — esse passo pede aprovação
      de billing e precisa ser feito no dashboard, não dá pra automatizar via CLI.
      Depois disso a Vercel injeta `DATABASE_URL` automaticamente no projeto.
- [ ] Eu puxo a env var localmente (`vercel env pull`) para rodar migrations
      em dev.
- [ ] Instalar dependências: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`,
      `jose`, `bcryptjs`, `@types/bcryptjs`.
- [ ] Configurar `drizzle.config.ts` e `src/db/schema.ts` (schema já definido no
      `design.md`), gerar e rodar a primeira migration.
- [ ] Script de seed (`scripts/seed-admin.ts`) para criar o único usuário admin
      (email + senha via variável de ambiente, hash com bcrypt) — rodado uma vez
      manualmente por você, não fica exposto como rota pública.

**Checkpoint de qualidade**: `npm run build` passa com o schema novo; migration
aplicada sem erro num banco de dev/preview antes de tocar produção.

## 1. Autenticação do admin

- [ ] `src/lib/auth.ts`: funções `createSessionToken`, `verifySessionToken` (jose),
      `verifyPassword` (bcryptjs).
- [ ] `POST /api/auth/login`: valida credenciais contra `admin_users`, seta
      cookie `admin_session` (httpOnly, secure, sameSite=lax, 7 dias).
- [ ] `POST /api/auth/logout`: limpa o cookie.
- [ ] `middleware.ts`: protege `/admin/:path*` exceto `/admin/login`, redireciona
      para login se cookie ausente/inválido.
- [ ] `/admin/login/page.tsx`: form simples de email+senha.

**Checkpoint**: login com credencial errada não revela se o e-mail existe;
acessar `/admin/dashboard` deslogado redireciona corretamente; cookie não
acessível via `document.cookie` (httpOnly confirmado no devtools).

## 2. Captura de eventos (page view + clique)

- [ ] Tabela de rate limit simples (`rate_limit_hits`: ip, endpoint, window,
      count) ou lógica equivalente com `count(*)` por janela — decidir na hora
      qual é mais barato de manter.
- [ ] `src/hooks/useTrackingSession.ts`: gera/persiste `sessionId`, captura UTM
      da URL na entrada e mantém em `sessionStorage`.
- [ ] `POST /api/track/pageview` e `POST /api/track/click`: inserts simples,
      sempre `200` mesmo com payload malformado (nunca deixar o client tratar
      erro de tracking como bloqueante).
- [ ] Instrumentar `SiteChrome.tsx` para disparar `trackPageView()` uma vez por
      navegação (App Router: hook em `usePathname()` change).
- [ ] Instrumentar cliques: banners do hub, botão de WhatsApp do rodapé, opções
      do quiz — cada um com um `elementId` estável.

**Checkpoint**: navegar pelo site gera linhas em `page_views`; clicar em cada
banner gera linha em `click_events` com o `elementId` certo; matar a
`DATABASE_URL` de propósito e confirmar que a navegação continua funcionando
normalmente (fire-and-forget de verdade).

## 3. Popup de captura de lead

- [ ] `src/components/tracking/LeadCaptureModal.tsx`: modal com nome*, telefone*,
      e-mail, validação inline, estados idle/submitting/success, transição de
      fade para o botão de WhatsApp pós-submit.
- [ ] `POST /api/leads`: valida payload, insere em `leads` com UTM/sessionId,
      aceita `metadata` opcional (jsonb) para os campos extras do Contact form.
- [ ] Trocar os `<a href={banner.href}>` do hub (exceto BrokerApps) para abrir o
      `LeadCaptureModal` em vez de navegar direto.
- [ ] CTA final do quiz passa pelo mesmo modal antes do WhatsApp.
- [ ] BrokerApps continua com `<a>` direto, sem popup (confirmado na Fase 1).
- [ ] `Contact.tsx`: troca o `await new Promise(...)` simulado por
      `fetch("/api/leads", ...)` com `sourceType: "homepage-contact"`.

**Checkpoint**: submeter o popup em cada banner (exceto BrokerApps) cria lead
com `sourceElementId` correto e some para o botão de WhatsApp; BrokerApps
continua abrindo direto; submeter o Contact form da home cria lead com
`sourceType: "homepage-contact"` e mantém a tela de sucesso que já existe.

## 4. Funil do quiz

- [ ] `POST /api/track/quiz-start`, `.../quiz-step`, `.../quiz-complete` (ou um
      único endpoint com um campo `event`) para popular `quiz_sessions`.
- [ ] Instrumentar `QuizModal` (`src/app/hub/page.tsx`) nos pontos: abrir quiz,
      avançar step, calcular resultado.

**Checkpoint**: abrir o quiz e fechar no meio gera `quiz_sessions` com
`completedAt` nulo e `lastStep` correto; completar gera `resultService`
preenchido.

## 5. CRM-lite (lista de leads)

- [ ] `GET /api/admin/leads` (filtros: status, service, utmCampaign) e
      `PATCH /api/admin/leads/:id` (só atualiza `status`).
- [ ] `/admin/leads/page.tsx`: tabela com filtros, e detalhe/expansão por lead
      mostrando respostas do quiz quando `quizSessionId` existir.

**Checkpoint**: mudar status de um lead persiste e reflete no filtro; criar
leads de fontes diferentes (banner, quiz, home) aparecem corretamente
identificados na lista.

## 6. Dashboard de analytics

- [ ] `GET /api/admin/analytics/summary` (period + utmCampaign opcional):
      agrega `page_views`, `click_events`, contagem de leads, taxa de conclusão
      do quiz.
- [ ] `GET /api/admin/analytics/quiz-funnel`: contagem de sessões que alcançaram
      cada step vs. completaram.
- [ ] `/admin/dashboard/page.tsx`: seletor de período, cards de totais, funil do
      quiz, breakdown por UTM campaign.

**Checkpoint**: números do dashboard batem com contagem manual no banco para um
período de teste conhecido.

## 7. Gestão de pixels

- [ ] `GET/PUT /api/admin/pixels`.
- [ ] `/admin/pixels/page.tsx`: form para cadastrar/editar pixel por página.
- [ ] `src/components/tracking/PixelScripts.tsx`: server component que busca a
      config da página atual e injeta `<Script>` (Meta Pixel ou GA4 conforme
      `provider`); usado nos layouts de `/`, `/hub`, `/proposta/vaz-ferreira`.

**Checkpoint**: cadastrar um pixel de teste e confirmar no Network tab do
browser que o script carrega só na página configurada.

## 8. Deploy

- [ ] Rodar migration em produção (via `vercel env pull` + `drizzle-kit push`
      apontando pro banco de produção, ou pipeline equivalente).
- [ ] Rodar o script de seed do admin em produção (uma vez).
- [ ] Confirmar em produção: login funciona, tracking grava, popup de lead
      funciona, pixel injeta.

## Fora desta v1 (mencionar mas não implementar agora)

- Exportação de leads (CSV) — cogitar se aparecer necessidade real.
- Gráficos mais elaborados (vou usar cards/tabelas simples nesta v1; se quiser
  visualizações mais ricas depois, dá pra evoluir usando a skill `dataviz`).
- Notificação (e-mail/WhatsApp) automática quando lead novo chega.
