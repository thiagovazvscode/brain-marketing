// Consultas server-only compartilhadas pelas páginas de Métodos & Execução.
// Existem aqui (e não inline em cada page.tsx) porque a mesma lista aparece em
// dois pontos de entrada: a aba do hub (/admin/metodos) e a rota dedicada
// (/admin/metodos/biblioteca e /admin/playbooks) — uma implementação só,
// evitando a duplicação citada nos riscos do design.md.
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { methods, methodProducts, methodStages, methodVersions, playbooks, playbookVersions, resources, products, adminUsers } from "@/db/schema";
import type { MethodSummary, PlaybookSummary, PlaybookEditorData } from "@/types/methods";
import { computeStageConfigStatus } from "@/lib/methods";
import { getStagesWithBlocks } from "@/lib/playbook-builder";

export async function getMethodDetail(id: string) {
  const [method] = await db.select().from(methods).where(eq(methods.id, id)).limit(1);
  if (!method) return null;

  const [productRows, stageRows, playbookRows, versionRows, resourceRows, authorRows] = await Promise.all([
    db
      .select({ productId: methodProducts.productId, productName: products.name })
      .from(methodProducts)
      .innerJoin(products, eq(products.id, methodProducts.productId))
      .where(eq(methodProducts.methodId, id)),
    db.select().from(methodStages).where(eq(methodStages.methodId, id)).orderBy(asc(methodStages.sortOrder)),
    db
      .select({ id: playbooks.id, slug: playbooks.slug, name: playbooks.name, status: playbooks.status, type: playbooks.type })
      .from(playbooks)
      .where(eq(playbooks.methodId, id)),
    db.select().from(methodVersions).where(eq(methodVersions.methodId, id)).orderBy(desc(methodVersions.createdAt)),
    db.select().from(resources).where(eq(resources.methodId, id)),
    method.authorId
      ? db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).where(eq(adminUsers.id, method.authorId)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    method: {
      ...method,
      // Nem todo admin_user tem `name` preenchido — cai para o e-mail em vez de "Sem autor" indevido.
      authorName: authorRows[0]?.name ?? authorRows[0]?.email ?? null,
      publishedAt: method.publishedAt?.toISOString() ?? null,
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString(),
    },
    products: productRows,
    stages: stageRows,
    playbooks: playbookRows,
    versions: versionRows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    resources: resourceRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
  };
}

export async function getPlaybookDetail(id: string) {
  const [playbook] = await db.select().from(playbooks).where(eq(playbooks.id, id)).limit(1);
  if (!playbook) return null;

  const [methodRows, productRows, versionRows, resourceRows, authorRows] = await Promise.all([
    db.select({ id: methods.id, name: methods.name, slug: methods.slug }).from(methods).where(eq(methods.id, playbook.methodId)).limit(1),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, playbook.productId)).limit(1),
    db.select().from(playbookVersions).where(eq(playbookVersions.playbookId, id)).orderBy(desc(playbookVersions.createdAt)),
    db.select().from(resources).where(eq(resources.playbookId, id)),
    playbook.authorId
      ? db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).where(eq(adminUsers.id, playbook.authorId)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    playbook: {
      ...playbook,
      authorName: authorRows[0]?.name ?? authorRows[0]?.email ?? null,
      publishedAt: playbook.publishedAt?.toISOString() ?? null,
      createdAt: playbook.createdAt.toISOString(),
      updatedAt: playbook.updatedAt.toISOString(),
    },
    method: methodRows[0] ?? null,
    product: productRows[0] ?? null,
    versions: versionRows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    resources: resourceRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
  };
}

/**
 * Payload do Construtor Visual (Fase 2.1). Recebe `versionId` já resolvido
 * pelo chamador (ensureDraftVersion roda antes, na rota/página — esta
 * função só lê, não decide transição de versão).
 */
export async function getPlaybookEditorData(playbookId: string, versionId: string): Promise<PlaybookEditorData | null> {
  const [playbook] = await db.select().from(playbooks).where(eq(playbooks.id, playbookId)).limit(1);
  if (!playbook) return null;

  const [version] = await db
    .select()
    .from(playbookVersions)
    .where(and(eq(playbookVersions.id, versionId), eq(playbookVersions.playbookId, playbookId)))
    .limit(1);
  if (!version) return null;

  const [methodRows, productRows, authorRows, stagesWithBlocks, resourceRows] = await Promise.all([
    db.select({ id: methods.id, name: methods.name }).from(methods).where(eq(methods.id, playbook.methodId)).limit(1),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, playbook.productId)).limit(1),
    playbook.authorId
      ? db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).where(eq(adminUsers.id, playbook.authorId)).limit(1)
      : Promise.resolve([]),
    getStagesWithBlocks(versionId),
    // Só pro bloco Documento vincular (Fase 2.2A) — nunca duplica o arquivo,
    // só guarda o vínculo (resourceId) em metadata.
    db.select({ id: resources.id, title: resources.title, type: resources.type }).from(resources).where(eq(resources.playbookId, playbookId)),
  ]);

  return {
    playbook: {
      ...playbook,
      authorName: authorRows[0]?.name ?? authorRows[0]?.email ?? null,
      publishedAt: playbook.publishedAt?.toISOString() ?? null,
      createdAt: playbook.createdAt.toISOString(),
      updatedAt: playbook.updatedAt.toISOString(),
    },
    method: methodRows[0] ?? null,
    product: productRows[0] ?? null,
    version: { id: version.id, versionLabel: version.versionLabel, status: version.status, createdAt: version.createdAt.toISOString() },
    stages: stagesWithBlocks.map((stage) => {
      const blocks = stage.blocks.map((block) => ({
        ...block,
        createdAt: block.createdAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
        checklistItems: block.checklistItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        formQuestions: block.formQuestions.map((q) => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        })),
        analysisDimensions: block.analysisDimensions.map((dimension) => ({
          ...dimension,
          createdAt: dimension.createdAt.toISOString(),
          updatedAt: dimension.updatedAt.toISOString(),
          criteria: dimension.criteria.map((criterion) => ({
            ...criterion,
            createdAt: criterion.createdAt.toISOString(),
            updatedAt: criterion.updatedAt.toISOString(),
          })),
        })),
        deliverableComponents: block.deliverableComponents.map((component) => ({
          ...component,
          createdAt: component.createdAt.toISOString(),
          updatedAt: component.updatedAt.toISOString(),
        })),
        materials: block.materials.map((material) => ({
          ...material,
          createdAt: material.createdAt.toISOString(),
          updatedAt: material.updatedAt.toISOString(),
        })),
        qualityCriteria: block.qualityCriteria.map((criterion) => ({
          ...criterion,
          createdAt: criterion.createdAt.toISOString(),
          updatedAt: criterion.updatedAt.toISOString(),
        })),
      }));
      return {
        ...stage,
        blocks,
        createdAt: stage.createdAt.toISOString(),
        updatedAt: stage.updatedAt.toISOString(),
        configStatus: computeStageConfigStatus(stage, blocks),
      };
    }),
    resources: resourceRows,
  };
}

export async function getMethodsSummary(): Promise<MethodSummary[]> {
  const rows = await db
    .select({
      id: methods.id,
      slug: methods.slug,
      name: methods.name,
      shortDescription: methods.shortDescription,
      category: methods.category,
      status: methods.status,
      version: methods.version,
      authorId: methods.authorId,
      // Nem todo admin_user tem `name` preenchido — cai para o e-mail em vez de "Sem autor" indevido.
      authorName: sql<string | null>`coalesce(${adminUsers.name}, ${adminUsers.email})`,
      updatedAt: methods.updatedAt,
      createdAt: methods.createdAt,
    })
    .from(methods)
    .leftJoin(adminUsers, eq(adminUsers.id, methods.authorId))
    .orderBy(desc(methods.updatedAt));

  const ids = rows.map((r) => r.id);
  const [productRows, playbookCountRows] = await Promise.all([
    ids.length
      ? db
          .select({ methodId: methodProducts.methodId, productName: products.name })
          .from(methodProducts)
          .innerJoin(products, eq(products.id, methodProducts.productId))
          .where(inArray(methodProducts.methodId, ids))
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ methodId: playbooks.methodId, count: sql<number>`count(*)::int` })
          .from(playbooks)
          .where(inArray(playbooks.methodId, ids))
          .groupBy(playbooks.methodId)
      : Promise.resolve([]),
  ]);

  const productsByMethod = new Map<string, string[]>();
  for (const row of productRows) {
    const list = productsByMethod.get(row.methodId) ?? [];
    list.push(row.productName);
    productsByMethod.set(row.methodId, list);
  }
  const playbookCountByMethod = new Map(playbookCountRows.map((r) => [r.methodId, r.count]));

  return rows.map((m) => ({
    ...m,
    updatedAt: m.updatedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    productNames: productsByMethod.get(m.id) ?? [],
    playbookCount: playbookCountByMethod.get(m.id) ?? 0,
  }));
}

export async function getPlaybooksSummary(): Promise<PlaybookSummary[]> {
  const rows = await db
    .select({
      id: playbooks.id,
      slug: playbooks.slug,
      name: playbooks.name,
      description: playbooks.description,
      type: playbooks.type,
      status: playbooks.status,
      version: playbooks.version,
      defaultDurationDays: playbooks.defaultDurationDays,
      methodId: playbooks.methodId,
      methodName: methods.name,
      productId: playbooks.productId,
      productName: products.name,
      authorId: playbooks.authorId,
      authorName: sql<string | null>`coalesce(${adminUsers.name}, ${adminUsers.email})`,
      updatedAt: playbooks.updatedAt,
      createdAt: playbooks.createdAt,
    })
    .from(playbooks)
    .innerJoin(methods, eq(methods.id, playbooks.methodId))
    .innerJoin(products, eq(products.id, playbooks.productId))
    .leftJoin(adminUsers, eq(adminUsers.id, playbooks.authorId))
    .orderBy(desc(playbooks.updatedAt));

  return rows.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString(), createdAt: p.createdAt.toISOString() }));
}

export interface MethodsOverviewStats {
  activeMethods: number;
  playbooksTotal: number;
  playbooksPublished: number;
  playbooksDraft: number;
  productsWithMethod: number;
  recentUpdates: number;
}

/**
 * Indicadores da Visão Geral (item 3) — sempre calculados, nunca hardcoded.
 * "Atualizações recentes" usa `now()` do Postgres (não `Date.now()` no
 * componente) — cálculo fica na consulta, não no render.
 */
export async function getMethodsOverviewStats(): Promise<MethodsOverviewStats> {
  const [[methodStats], [playbookStats], [productStats]] = await Promise.all([
    db
      .select({
        active: sql<number>`count(*) filter (where ${methods.status} != 'arquivado')::int`,
        recent: sql<number>`count(*) filter (where ${methods.updatedAt} >= now() - interval '7 days')::int`,
      })
      .from(methods),
    db
      .select({
        total: sql<number>`count(*)::int`,
        published: sql<number>`count(*) filter (where ${playbooks.status} = 'publicado')::int`,
        draft: sql<number>`count(*) filter (where ${playbooks.status} = 'rascunho')::int`,
        recent: sql<number>`count(*) filter (where ${playbooks.updatedAt} >= now() - interval '7 days')::int`,
      })
      .from(playbooks),
    db.select({ count: sql<number>`count(distinct ${methodProducts.productId})::int` }).from(methodProducts),
  ]);

  return {
    activeMethods: methodStats?.active ?? 0,
    playbooksTotal: playbookStats?.total ?? 0,
    playbooksPublished: playbookStats?.published ?? 0,
    playbooksDraft: playbookStats?.draft ?? 0,
    productsWithMethod: productStats?.count ?? 0,
    recentUpdates: (methodStats?.recent ?? 0) + (playbookStats?.recent ?? 0),
  };
}

export interface RecentActivityRow {
  id: string;
  kind: "method" | "playbook";
  name: string;
  status: string;
  updatedAt: string;
}

/** Bloco "Atividade recente" — últimos métodos/playbooks tocados, sem número fixo além do limite de exibição. */
export async function getRecentMethodActivity(limit = 8): Promise<RecentActivityRow[]> {
  const [methodRows, playbookRows] = await Promise.all([
    db
      .select({ id: methods.id, name: methods.name, status: methods.status, updatedAt: methods.updatedAt })
      .from(methods)
      .orderBy(desc(methods.updatedAt))
      .limit(limit),
    db
      .select({ id: playbooks.id, name: playbooks.name, status: playbooks.status, updatedAt: playbooks.updatedAt })
      .from(playbooks)
      .orderBy(desc(playbooks.updatedAt))
      .limit(limit),
  ]);

  const combined: RecentActivityRow[] = [
    ...methodRows.map((m) => ({ id: m.id, kind: "method" as const, name: m.name, status: m.status, updatedAt: m.updatedAt.toISOString() })),
    ...playbookRows.map((p) => ({ id: p.id, kind: "playbook" as const, name: p.name, status: p.status, updatedAt: p.updatedAt.toISOString() })),
  ];

  return combined.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, limit);
}

export async function getMethodOptions() {
  return db.select({ id: methods.id, name: methods.name }).from(methods).orderBy(methods.name);
}

export async function getDraftPlaybooksAwaitingCompletion(limit = 8) {
  return db
    .select({ id: playbooks.id, name: playbooks.name, updatedAt: playbooks.updatedAt })
    .from(playbooks)
    .where(eq(playbooks.status, "rascunho"))
    .orderBy(desc(playbooks.updatedAt))
    .limit(limit);
}

export async function getPlaybooksByProduct() {
  const rows = await db
    .select({ productName: products.name, count: sql<number>`count(*)::int` })
    .from(playbooks)
    .innerJoin(products, eq(products.id, playbooks.productId))
    .groupBy(products.name)
    .orderBy(desc(sql`count(*)`));
  return rows;
}

export async function getMethodsRecentlyUpdated(limit = 6) {
  return db
    .select({ id: methods.id, name: methods.name, status: methods.status, updatedAt: methods.updatedAt })
    .from(methods)
    .orderBy(desc(methods.updatedAt))
    .limit(limit);
}

/** Aba "Recursos" do hub — listagem global (sem CRUD, estrutura inicial). */
export async function getAllResourcesWithContext() {
  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      type: resources.type,
      url: resources.url,
      updatedAt: resources.updatedAt,
      methodName: methods.name,
      playbookName: playbooks.name,
    })
    .from(resources)
    .leftJoin(methods, eq(methods.id, resources.methodId))
    .leftJoin(playbooks, eq(playbooks.id, resources.playbookId))
    .orderBy(desc(resources.updatedAt));

  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}
