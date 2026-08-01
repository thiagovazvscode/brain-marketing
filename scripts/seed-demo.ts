import { eq, like, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  productPlans,
  clients,
  clientProducts,
  clientStageHistory,
  trackedLinks,
  linkClicks,
  clientDiagnostics,
  pageViews,
  clickEvents,
  leads,
  quizSessions,
  adminUsers,
} from "@/db/schema";
import { computeRecommendations } from "@/lib/diagnostics";
import { computeImpactOnMrr } from "@/lib/billing";

const DEMO_PREFIX = "demo-";
const DEMO_SESSION_PREFIX = "demo-session-";

// ── Utilidades ───────────────────────────────────────────────────────────

function daysAgo(n: number, hour = 12): Date {
  const d = new Date();
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Insere em lotes (poucas idas ao banco) em vez de um INSERT por linha —
// o driver HTTP do Neon faz uma ida de rede por chamada, então milhares de
// inserts individuais tornam o seed impraticavelmente lento.
async function insertInBatches<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  batchSize = 500
) {
  for (const batch of chunk(rows, batchSize)) {
    if (batch.length === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table).values(batch as any);
  }
}

async function isCleanRun(): Promise<boolean> {
  return process.argv.includes("--clean");
}

// ── Catálogo real (fonte: src/data/services.ts) ─────────────────────────

const PRODUCTS_SEED = [
  {
    slug: "trafego-pago",
    name: "Tráfego pago e aquisição",
    shortDescription: "Meta Ads e Google Ads planejados para gerar demanda constante.",
    category: "Aquisição",
    isEntryProduct: true,
    sortOrder: 1,
  },
  {
    slug: "posicionamento",
    name: "Posicionamento",
    shortDescription: "Direção de comunicação e construção de autoridade.",
    category: "Marca",
    isEntryProduct: false,
    sortOrder: 2,
  },
  {
    slug: "sites-landing-pages",
    name: "Sites e landing pages",
    shortDescription: "Estruturas digitais de alta conversão.",
    category: "Estrutura",
    isEntryProduct: false,
    sortOrder: 3,
  },
  {
    slug: "audiovisual",
    name: "Audiovisual",
    shortDescription: "Produção de vídeo e fotografia para campanhas e imóveis.",
    category: "Conteúdo",
    isEntryProduct: false,
    sortOrder: 4,
  },
  {
    slug: "inteligencia-comercial",
    name: "Inteligência comercial",
    shortDescription: "Diagnóstico da operação, funil e integração com vendas.",
    category: "Consultoria",
    isEntryProduct: false,
    sortOrder: 5,
  },
  {
    slug: "tecnologia",
    name: "Broker Apps",
    shortDescription: "Ecossistema tecnológico para organizar imóveis, leads e CRM.",
    category: "Tecnologia",
    isEntryProduct: false,
    sortOrder: 6,
  },
] as const;

// ── Clientes de demonstração ─────────────────────────────────────────────

const DEMO_CLIENTS = [
  { slug: "imoveis-alvorada", name: "Imóveis Alvorada", whatsapp: "(91) 98111-0001", enteredDaysAgo: 330 },
  { slug: "marcos-corretor", name: "Marcos Corretor Premium", whatsapp: "(91) 98111-0002", enteredDaysAgo: 290 },
  { slug: "vidal-advocacia", name: "Vidal Advocacia", whatsapp: "(91) 98111-0003", enteredDaysAgo: 240 },
  { slug: "bella-casa", name: "Loja Bella Casa", whatsapp: "(91) 98111-0004", enteredDaysAgo: 190 },
  { slug: "construtora-horizonte", name: "Construtora Horizonte", whatsapp: "(91) 98111-0005", enteredDaysAgo: 140 },
  { slug: "ferreira-imoveis", name: "Ferreira Imóveis", whatsapp: "(91) 98111-0006", enteredDaysAgo: 90 },
  { slug: "studio-fit-belem", name: "Studio Fit Belém", whatsapp: "(91) 98111-0007", enteredDaysAgo: 45 },
  { slug: "nogueira-advogados", name: "Nogueira Advogados Associados", whatsapp: "(91) 98111-0008", enteredDaysAgo: 15 },
] as const;

const STAGE_ORDER = ["raio-x", "direcao", "estrutura", "motor-de-aquisicao", "curva-de-otimizacao"];

// Preço/cobrança plausível por produto (dado de demonstração, não é preço
// oficial) — usado pra popular os campos comerciais novos de client_products.
const PRODUCT_PRICING: Record<string, { value: number; billingType: "recorrente" | "pontual"; billingCycle: string }> = {
  "trafego-pago": { value: 1500, billingType: "recorrente", billingCycle: "mensal" },
  posicionamento: { value: 1200, billingType: "recorrente", billingCycle: "mensal" },
  "sites-landing-pages": { value: 4000, billingType: "pontual", billingCycle: "unico" },
  audiovisual: { value: 2500, billingType: "pontual", billingCycle: "unico" },
  "inteligencia-comercial": { value: 1800, billingType: "recorrente", billingCycle: "mensal" },
  tecnologia: { value: 1000, billingType: "recorrente", billingCycle: "mensal" },
};

const NEXT_ACTIONS = [
  "Aprovar novos criativos",
  "Agendar reunião de otimização",
  "Enviar relatório mensal",
  "Solicitar acesso à conta de anúncios",
  "Revisar plano de conteúdo",
  "Importar imóveis no BrokerApps",
];

interface EngagementSeed {
  productSlug: string;
  status: "ativo" | "pausado" | "encerrado";
  currentStage: string;
  stuck: boolean; // última transição há 25-40 dias, sem avanço desde então
}

const DEMO_ENGAGEMENTS: Record<string, EngagementSeed[]> = {
  "imoveis-alvorada": [
    { productSlug: "trafego-pago", status: "ativo", currentStage: "motor-de-aquisicao", stuck: false },
    { productSlug: "inteligencia-comercial", status: "ativo", currentStage: "direcao", stuck: false },
  ],
  "marcos-corretor": [{ productSlug: "trafego-pago", status: "ativo", currentStage: "estrutura", stuck: true }],
  "vidal-advocacia": [
    { productSlug: "posicionamento", status: "ativo", currentStage: "raio-x", stuck: false },
    { productSlug: "sites-landing-pages", status: "encerrado", currentStage: "curva-de-otimizacao", stuck: false },
  ],
  "bella-casa": [{ productSlug: "trafego-pago", status: "ativo", currentStage: "curva-de-otimizacao", stuck: false }],
  "construtora-horizonte": [
    { productSlug: "trafego-pago", status: "ativo", currentStage: "motor-de-aquisicao", stuck: false },
    { productSlug: "audiovisual", status: "ativo", currentStage: "estrutura", stuck: false },
    { productSlug: "tecnologia", status: "pausado", currentStage: "direcao", stuck: false },
  ],
  "ferreira-imoveis": [{ productSlug: "trafego-pago", status: "ativo", currentStage: "direcao", stuck: true }],
  "studio-fit-belem": [{ productSlug: "trafego-pago", status: "ativo", currentStage: "raio-x", stuck: false }],
  "nogueira-advogados": [
    { productSlug: "inteligencia-comercial", status: "ativo", currentStage: "estrutura", stuck: false },
    { productSlug: "posicionamento", status: "ativo", currentStage: "motor-de-aquisicao", stuck: false },
  ],
};

const DEMO_DIAGNOSTICS: Record<string, { aquisicao: number; posicionamento: number; processoComercial: number; tecnologia: number }> = {
  "imoveis-alvorada": { aquisicao: 7, posicionamento: 6, processoComercial: 6, tecnologia: 3 },
  "vidal-advocacia": { aquisicao: 6, posicionamento: 6, processoComercial: 3, tecnologia: 5 },
  "construtora-horizonte": { aquisicao: 7, posicionamento: 4, processoComercial: 6, tecnologia: 5 },
  "studio-fit-belem": { aquisicao: 6, posicionamento: 5, processoComercial: 4, tecnologia: 2 },
  "ferreira-imoveis": { aquisicao: 4, posicionamento: 6, processoComercial: 6, tecnologia: 6 },
};

// ── Links rastreáveis ────────────────────────────────────────────────────

const DEMO_LINKS = [
  { slug: "bio-instagram", label: "Bio do Instagram", destinationUrl: "https://brainmktp.com.br/hub", campaign: "bio-organico", baseClicks: 14 },
  { slug: "whatsapp-rodape", label: "WhatsApp rodapé do hub", destinationUrl: "https://brainmktp.com.br/hub", campaign: "bio-organico", baseClicks: 6 },
  { slug: "anuncio-corretores", label: "Anúncio Meta — Corretores", destinationUrl: "https://brainmktp.com.br/hub", campaign: "corretores-julho", baseClicks: 5 },
  { slug: "anuncio-incorporadoras", label: "Anúncio Meta — Incorporadoras", destinationUrl: "https://brainmktp.com.br/hub", campaign: "incorporadoras-lancamento", baseClicks: 4 },
  { slug: "story-diagnostico", label: "Story — Diagnóstico Comercial", destinationUrl: "https://brainmktp.com.br/hub", campaign: "diagnostico-comercial", baseClicks: 3 },
  { slug: "assinatura-email", label: "Assinatura de e-mail", destinationUrl: "https://brainmktp.com.br/", campaign: "assinatura-email", baseClicks: 2 },
  { slug: "cartao-digital", label: "Cartão de visita digital", destinationUrl: "https://brainmktp.com.br/hub", campaign: "networking", baseClicks: 1.5 },
  { slug: "grupo-whatsapp", label: "Grupo de WhatsApp de corretores", destinationUrl: "https://brainmktp.com.br/hub", campaign: "grupo-corretores", baseClicks: 2.5 },
  { slug: "proposta-mv", label: "Link direto — Proposta MV Imóveis", destinationUrl: "https://brainmktp.com.br/proposta/mv-imoveis", campaign: "followup-mv", baseClicks: 0.4, ownerSlug: "imoveis-alvorada" },
  { slug: "proposta-vaz-ferreira", label: "Link direto — Proposta Vaz Ferreira", destinationUrl: "https://brainmktp.com.br/proposta/vaz-ferreira", campaign: "followup-vaz-ferreira", baseClicks: 0.3, ownerSlug: "vidal-advocacia" },
] as const;

const DAYS_OF_HISTORY = 90;
const PAGE_PATHS = ["/hub", "/", "/proposta/vaz-ferreira", "/proposta/mv-imoveis", "/briefing/mv-imoveis"];
const UTM_CAMPAIGNS = ["corretores-julho", "incorporadoras-lancamento", "diagnostico-comercial", "bio-organico", null];

// Fator de crescimento: dias mais recentes têm mais volume que os antigos.
function trendMultiplier(dayIndex: number): number {
  // dayIndex 0 = há 90 dias, dayIndex 89 = hoje
  return 0.5 + (dayIndex / DAYS_OF_HISTORY) * 1.3 + (Math.random() * 0.3 - 0.15);
}

async function clean() {
  console.log("Limpando dados de demonstração (--clean)...");

  const demoClientRows = await db.select({ id: clients.id }).from(clients).where(like(clients.slug, `${DEMO_PREFIX}%`));
  const demoClientIds = demoClientRows.map((c) => c.id);

  const demoLinkRows = await db.select({ id: trackedLinks.id }).from(trackedLinks).where(like(trackedLinks.slug, `${DEMO_PREFIX}%`));
  const demoLinkIds = demoLinkRows.map((l) => l.id);

  if (demoLinkIds.length) {
    await db.delete(linkClicks).where(inArray(linkClicks.linkId, demoLinkIds));
    await db.delete(trackedLinks).where(inArray(trackedLinks.id, demoLinkIds));
  }

  if (demoClientIds.length) {
    const engagementRows = await db
      .select({ id: clientProducts.id })
      .from(clientProducts)
      .where(inArray(clientProducts.clientId, demoClientIds));
    const engagementIds = engagementRows.map((e) => e.id);

    if (engagementIds.length) {
      await db.delete(clientStageHistory).where(inArray(clientStageHistory.clientProductId, engagementIds));
      await db.delete(clientProducts).where(inArray(clientProducts.id, engagementIds));
    }

    await db.delete(clientDiagnostics).where(inArray(clientDiagnostics.clientId, demoClientIds));
    await db.delete(clients).where(inArray(clients.id, demoClientIds));
  }

  await db.delete(pageViews).where(like(pageViews.sessionId, `${DEMO_SESSION_PREFIX}%`));
  await db.delete(clickEvents).where(like(clickEvents.sessionId, `${DEMO_SESSION_PREFIX}%`));
  await db.delete(leads).where(like(leads.sessionId, `${DEMO_SESSION_PREFIX}%`));
  await db.delete(quizSessions).where(like(quizSessions.sessionId, `${DEMO_SESSION_PREFIX}%`));

  console.log(`Removidos: ${demoClientIds.length} cliente(s), ${demoLinkIds.length} link(s) e eventos/leads/sessões de demo.`);
}

async function seedProducts(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const p of PRODUCTS_SEED) {
    const [existing] = await db.select().from(products).where(eq(products.slug, p.slug)).limit(1);
    if (existing) {
      slugToId.set(p.slug, existing.id);
      continue;
    }
    const [inserted] = await db
      .insert(products)
      .values({
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        category: p.category,
        isEntryProduct: p.isEntryProduct,
        sortOrder: p.sortOrder,
      })
      .returning();
    slugToId.set(p.slug, inserted.id);
  }

  console.log(`Catálogo: ${slugToId.size} produto(s) confirmados.`);
  return slugToId;
}

async function seedClients(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const c of DEMO_CLIENTS) {
    const slug = `${DEMO_PREFIX}${c.slug}`;
    const entered = daysAgo(c.enteredDaysAgo);
    const [inserted] = await db
      .insert(clients)
      .values({
        slug,
        name: c.name,
        whatsapp: c.whatsapp,
        enteredAt: entered.toISOString().slice(0, 10),
        createdAt: entered,
      })
      .returning();
    slugToId.set(c.slug, inserted.id);
  }

  console.log(`Clientes de demo: ${slugToId.size} criado(s).`);
  return slugToId;
}

async function seedEngagements(clientIds: Map<string, string>, productIds: Map<string, string>, adminUserId: string | null) {
  let engagementCount = 0;
  let historyCount = 0;

  for (const [clientKey, engagements] of Object.entries(DEMO_ENGAGEMENTS)) {
    const clientId = clientIds.get(clientKey);
    if (!clientId) continue;

    for (const eng of engagements) {
      const productId = productIds.get(eng.productSlug);
      if (!productId) continue;

      const targetStageIndex = STAGE_ORDER.indexOf(eng.currentStage);
      const totalSpanDays = eng.stuck ? randomInt(60, 100) : randomInt(20, 70);
      const startedAt = daysAgo(totalSpanDays);

      const pricing = PRODUCT_PRICING[eng.productSlug] ?? { value: 1000, billingType: "recorrente" as const, billingCycle: "mensal" };
      const isEnded = eng.status === "encerrado";
      const isPaused = eng.status === "pausado";
      const negotiatedValue = String(pricing.value);
      const impactOnMrr = String(computeImpactOnMrr(pricing.billingType, isEnded ? null : negotiatedValue));

      let onboardingStatus: string;
      let implementationProgress: number;
      let operationalStatus: string;
      if (isEnded) {
        onboardingStatus = "concluido";
        implementationProgress = 100;
        operationalStatus = "concluido";
      } else if (isPaused) {
        onboardingStatus = "concluido";
        implementationProgress = randomInt(40, 70);
        operationalStatus = "pausado";
      } else if (eng.stuck) {
        onboardingStatus = "incompleto";
        implementationProgress = randomInt(20, 50);
        operationalStatus = "bloqueado";
      } else if (targetStageIndex <= 1) {
        onboardingStatus = pick(["enviado", "concluido"] as const);
        implementationProgress = randomInt(10, 40);
        operationalStatus = targetStageIndex === 0 ? "onboarding" : "em-implantacao";
      } else {
        onboardingStatus = "concluido";
        implementationProgress = randomInt(60, 100);
        operationalStatus = "em-execucao";
      }

      // randomInt negativo faz daysAgo devolver uma data futura (some dias
      // ainda por vir), positivo devolve uma data passada (ação vencida) —
      // mistura de próximas ações futuras e atrasadas, de propósito.
      const nextActionDate = !isEnded && !isPaused ? daysAgo(randomInt(-15, 10)).toISOString().slice(0, 10) : null;

      const [engagement] = await db
        .insert(clientProducts)
        .values({
          clientId,
          productId,
          status: eng.status,
          currentStage: eng.currentStage,
          startedAt: startedAt.toISOString().slice(0, 10),
          endedAt: eng.status === "encerrado" ? daysAgo(randomInt(1, 10)).toISOString().slice(0, 10) : null,
          createdAt: startedAt,
          negotiatedValue,
          billingType: pricing.billingType,
          billingCycle: pricing.billingCycle as "mensal" | "trimestral" | "semestral" | "anual" | "unico",
          billingDay: pricing.billingType === "recorrente" ? randomInt(1, 28) : null,
          impactOnMrr,
          responsibleUserId: Math.random() < 0.5 ? adminUserId : null,
          onboardingStatus,
          implementationProgress,
          operationalStatus,
          nextAction: !isEnded && !isPaused ? pick(NEXT_ACTIONS) : null,
          nextActionDate,
        })
        .returning();
      engagementCount++;

      // Histórico de transição: raio-x -> ... -> currentStage.
      // Estágios "travados" têm a última transição há 25-40 dias (sem avanço desde então).
      let previousStage: string | null = null;
      const stepsUntilCurrent = targetStageIndex + 1;
      const lastTransitionDaysAgo = eng.stuck ? randomInt(25, 40) : randomInt(1, 8);
      const spacing = Math.max(3, Math.floor((totalSpanDays - lastTransitionDaysAgo) / Math.max(stepsUntilCurrent, 1)));

      for (let i = 0; i <= targetStageIndex; i++) {
        const stage = STAGE_ORDER[i];
        const isLast = i === targetStageIndex;
        const changedAt = isLast ? daysAgo(lastTransitionDaysAgo) : daysAgo(totalSpanDays - i * spacing);
        await db.insert(clientStageHistory).values({
          clientProductId: engagement.id,
          fromStage: previousStage,
          toStage: stage,
          changedAt,
        });
        historyCount++;
        previousStage = stage;
      }
    }
  }

  console.log(`Engajamentos: ${engagementCount}, transições de estágio: ${historyCount}.`);
}

async function seedDiagnostics(clientIds: Map<string, string>, productIds: Map<string, string>) {
  let count = 0;

  for (const [clientKey, scores] of Object.entries(DEMO_DIAGNOSTICS)) {
    const clientId = clientIds.get(clientKey);
    if (!clientId) continue;

    const activeEngagements = await db
      .select({ productId: clientProducts.productId })
      .from(clientProducts)
      .where(eq(clientProducts.clientId, clientId));

    const productIdToSlug = new Map(Array.from(productIds.entries()).map(([slug, id]) => [id, slug]));
    const activeSlugs = activeEngagements.map((e) => productIdToSlug.get(e.productId)).filter((s): s is string => Boolean(s));

    const recommendations = computeRecommendations(scores, activeSlugs);
    const bottleneckEntry = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];

    await db.insert(clientDiagnostics).values({
      clientId,
      scores,
      bottleneck: bottleneckEntry[0],
      recommendations,
      createdAt: daysAgo(randomInt(5, 60)),
    });
    count++;
  }

  console.log(`Diagnósticos: ${count} criado(s).`);
}

async function seedLinks(clientIds: Map<string, string>) {
  const linkIds = new Map<string, string>();

  for (const link of DEMO_LINKS) {
    const slug = `${DEMO_PREFIX}${link.slug}`;
    const ownerClientId = "ownerSlug" in link ? clientIds.get(link.ownerSlug) ?? null : null;

    const [existing] = await db.select({ id: trackedLinks.id }).from(trackedLinks).where(eq(trackedLinks.slug, slug)).limit(1);
    if (existing) {
      linkIds.set(link.slug, existing.id);
      continue;
    }

    const [inserted] = await db
      .insert(trackedLinks)
      .values({
        slug,
        label: link.label,
        destinationUrl: link.destinationUrl,
        campaign: link.campaign,
        ownerClientId,
        createdAt: daysAgo(DAYS_OF_HISTORY),
      })
      .returning();
    linkIds.set(link.slug, inserted.id);
  }

  const clickRows: (typeof linkClicks.$inferInsert)[] = [];
  // Jornada pós-clique: parte das sessões de clique continua navegando pelo
  // site com o MESMO sessionId — é o que a página de Links usa pra mostrar
  // "depois do clique, vai mais pra". Sem isso o join nunca casa nenhuma linha.
  const journeyRows: (typeof pageViews.$inferInsert)[] = [];
  for (const link of DEMO_LINKS) {
    const linkId = linkIds.get(link.slug)!;
    for (let dayIndex = 0; dayIndex < DAYS_OF_HISTORY; dayIndex++) {
      const daysBack = DAYS_OF_HISTORY - dayIndex;
      const expected = link.baseClicks * trendMultiplier(dayIndex);
      const clicksToday = Math.max(0, Math.round(expected * (0.6 + Math.random() * 0.8)));

      for (let c = 0; c < clicksToday; c++) {
        const sessionId = `${DEMO_SESSION_PREFIX}${daysBack}-${randomInt(1000, 9999)}`;
        const clickedAt = daysAgo(daysBack);
        clickRows.push({
          linkId,
          sessionId,
          referrer: pick(["https://instagram.com", "https://whatsapp.com", "https://google.com", ""]),
          utmSource: link.campaign,
          utmMedium: "link-proprio",
          utmCampaign: link.campaign,
          userAgent: pick(["Mobile Safari", "Chrome Mobile", "Chrome Desktop", "Instagram App"]),
          createdAt: clickedAt,
        });

        if (Math.random() < 0.65) {
          const steps = randomInt(1, 3);
          for (let s = 0; s < steps; s++) {
            const viewedAt = new Date(clickedAt.getTime() + (s + 1) * randomInt(20, 180) * 1000);
            journeyRows.push({
              path: pick(PAGE_PATHS),
              sessionId,
              referrer: pick(["https://instagram.com", "https://whatsapp.com", "https://google.com", ""]),
              utmSource: link.campaign,
              utmMedium: "link-proprio",
              utmCampaign: link.campaign,
              createdAt: viewedAt,
            });
          }
        }
      }
    }
  }

  await insertInBatches(linkClicks, clickRows);
  await insertInBatches(pageViews, journeyRows);
  console.log(
    `Links rastreáveis: ${linkIds.size} criado(s), ${clickRows.length} clique(s), ${journeyRows.length} page view(s) de jornada pós-clique em ${DAYS_OF_HISTORY} dias.`
  );
}

async function seedTrafficAndLeads() {
  const pageViewRows: (typeof pageViews.$inferInsert)[] = [];
  const clickEventRows: (typeof clickEvents.$inferInsert)[] = [];
  const leadRows: (typeof leads.$inferInsert)[] = [];
  const quizRows: (typeof quizSessions.$inferInsert)[] = [];

  for (let dayIndex = 0; dayIndex < DAYS_OF_HISTORY; dayIndex++) {
    const daysBack = DAYS_OF_HISTORY - dayIndex;
    const trend = trendMultiplier(dayIndex);

    const pageViewsToday = Math.max(1, Math.round(8 * trend));
    for (let i = 0; i < pageViewsToday; i++) {
      const sessionId = `${DEMO_SESSION_PREFIX}pv-${daysBack}-${randomInt(1000, 9999)}`;
      const campaign = pick(UTM_CAMPAIGNS);
      pageViewRows.push({
        path: pick(PAGE_PATHS),
        sessionId,
        referrer: pick(["https://instagram.com", "https://google.com", "https://whatsapp.com", ""]),
        utmSource: campaign ? pick(["instagram", "facebook", "google"]) : null,
        utmMedium: campaign ? "cpc" : null,
        utmCampaign: campaign,
        createdAt: daysAgo(daysBack),
      });

      if (Math.random() < 0.35) {
        clickEventRows.push({
          elementId: pick(["banner-incorporadoras", "banner-corretores", "quiz-trigger", "whatsapp-footer", "banner-audiovisual"]),
          path: "/hub",
          sessionId,
          utmSource: campaign ? pick(["instagram", "facebook"]) : null,
          utmMedium: campaign ? "cpc" : null,
          utmCampaign: campaign,
          createdAt: daysAgo(daysBack),
        });
      }
    }

    // ~30-40 leads distribuídos nos 90 dias (~0.4/dia em média)
    if (Math.random() < 0.42) {
      const campaign = pick(UTM_CAMPAIGNS.filter((c): c is string => Boolean(c)));
      leadRows.push({
        name: pick(["Marcos Vieira", "Renata Farias", "Diego Nascimento", "Patrícia Gomes", "Carlos Eduardo Reis", "Juliana Prado", "Fábio Almeida", "Ana Beatriz Souza"]),
        phone: `(91) 9${randomInt(8000, 9999)}-${randomInt(1000, 9999)}`,
        email: Math.random() > 0.4 ? `lead${randomInt(1, 999)}@exemplo.com` : null,
        sourceType: pick(["banner", "quiz-cta", "homepage-contact"] as const),
        sourceElementId: pick(["banner-incorporadoras", "banner-corretores", "banner-audiovisual", null]),
        service: pick(["Tráfego Pago para Incorporadoras", "Tráfego Pago para Corretores Autônomos", "Diagnóstico Comercial", "Audiovisual Imobiliário"]),
        sessionId: `${DEMO_SESSION_PREFIX}lead-${daysBack}-${randomInt(1000, 9999)}`,
        utmSource: pick(["instagram", "facebook", "google"]),
        utmMedium: "cpc",
        utmCampaign: campaign,
        status: pick(["novo", "novo", "contatado", "fechado", "perdido"] as const),
        createdAt: daysAgo(daysBack),
      });
    }

    // quiz: ~1 sessão a cada 2 dias, ~30% completando
    if (Math.random() < 0.5) {
      const completes = Math.random() < 0.3;
      const lastStep = completes ? 5 : randomInt(1, 4);
      quizRows.push({
        sessionId: `${DEMO_SESSION_PREFIX}quiz-${daysBack}-${randomInt(1000, 9999)}`,
        startedAt: daysAgo(daysBack),
        completedAt: completes ? daysAgo(daysBack, 13) : null,
        lastStep,
        answers: Array.from({ length: lastStep }, () => randomInt(0, 3)),
        resultService: completes ? pick(["Tráfego Pago · Corretores", "Audiovisual Imobiliário", "Diagnóstico Comercial", "BrokerApps — CRM com IA"]) : null,
      });
    }
  }

  await insertInBatches(pageViews, pageViewRows);
  await insertInBatches(clickEvents, clickEventRows);
  await insertInBatches(leads, leadRows);
  await insertInBatches(quizSessions, quizRows);

  console.log(
    `Tráfego: ${pageViewRows.length} page views, ${clickEventRows.length} cliques, ${leadRows.length} leads, ${quizRows.length} sessões de quiz em ${DAYS_OF_HISTORY} dias.`
  );
}

async function seedProductPlans(productIds: Map<string, string>) {
  let created = 0;
  for (const [slug, productId] of productIds.entries()) {
    const pricing = PRODUCT_PRICING[slug];
    if (!pricing) continue;

    const [existing] = await db.select({ id: productPlans.id }).from(productPlans).where(eq(productPlans.productId, productId)).limit(1);
    if (existing) continue;

    await db.insert(productPlans).values({
      productId,
      name: "Padrão",
      billingType: pricing.billingType,
      billingCycle: pricing.billingCycle as "mensal" | "trimestral" | "semestral" | "anual" | "unico",
      basePrice: String(pricing.value),
      isDefault: true,
    });
    created++;
  }
  console.log(`Planos de produto: ${created} criado(s).`);
}

async function main() {
  if (await isCleanRun()) {
    await clean();
    process.exit(0);
  }

  console.log("Rodando seed de demonstração...");
  const [admin] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  const productIds = await seedProducts();
  const clientIds = await seedClients();
  await seedProductPlans(productIds);
  await seedEngagements(clientIds, productIds, admin?.id ?? null);
  await seedDiagnostics(clientIds, productIds);
  await seedLinks(clientIds);
  await seedTrafficAndLeads();
  console.log("Seed de demonstração concluído.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao rodar o seed de demonstração:", error);
  process.exit(1);
});
