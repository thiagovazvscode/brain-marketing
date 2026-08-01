// Seed do produto-piloto do módulo Métodos & Execução (item 11 do pedido —
// specs/metodos-execucao/design.md).
//
// Método Brain de Estruturação Comercial + 9 macroetapas + 5 playbooks
// relacionados. NÃO é dado descartável de demo: é o primeiro exemplo real do
// módulo, por isso não leva prefixo "demo-" e não é removido por
// `seed-demo --clean` — mesmo raciocínio do seed-pipeline.ts.
//
// Idempotente: rodar de novo não duplica (verifica por slug) nem sobrescreve
// edição feita pela interface.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { methods, methodProducts, methodStages, methodVersions, playbooks, playbookVersions, products, adminUsers } from "@/db/schema";

const METHOD_SLUG = "metodo-brain-de-estruturacao-comercial";
const PRODUCT_SLUG = "inteligencia-comercial";

const STAGES = [
  { name: "Imersão", objective: "Entender a operação comercial atual do cliente." },
  { name: "Diagnóstico", objective: "Mapear gargalos do funil e do time comercial." },
  { name: "Devolutiva", objective: "Apresentar o diagnóstico e alinhar prioridades." },
  { name: "Plano de ação", objective: "Definir as iniciativas e a ordem de execução." },
  { name: "Implantação", objective: "Colocar o plano em prática na operação do cliente." },
  { name: "Treinamento", objective: "Capacitar o time do cliente no novo processo." },
  { name: "Acompanhamento", objective: "Monitorar a adoção e ajustar o que for preciso." },
  { name: "Validação", objective: "Confirmar que os resultados esperados foram atingidos." },
  { name: "Encerramento", objective: "Fechar o ciclo e registrar aprendizados." },
];

const PLAYBOOKS = [
  { name: "Diagnóstico Comercial", type: "diagnostico" as const, description: "Levantamento do funil, processo e time comercial do cliente." },
  { name: "Construção do Plano de Ação", type: "projeto" as const, description: "Estruturação das iniciativas priorizadas a partir do diagnóstico." },
  { name: "Implantação Comercial", type: "implantacao" as const, description: "Execução do plano de ação na operação do cliente." },
  { name: "Treinamento da Equipe", type: "treinamento" as const, description: "Capacitação do time comercial do cliente no novo processo." },
  { name: "Acompanhamento e Validação", type: "acompanhamento" as const, description: "Monitoramento pós-implantação e validação de resultados." },
];

async function main() {
  const [product] = await db.select().from(products).where(eq(products.slug, PRODUCT_SLUG)).limit(1);
  if (!product) {
    console.error(`Produto "${PRODUCT_SLUG}" não encontrado — rode o seed de produtos antes (npm run db:seed:demo).`);
    process.exit(1);
  }

  const [author] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);

  let [method] = await db.select().from(methods).where(eq(methods.slug, METHOD_SLUG)).limit(1);

  if (!method) {
    const now = new Date();
    [method] = await db
      .insert(methods)
      .values({
        slug: METHOD_SLUG,
        name: "Método Brain de Estruturação Comercial",
        shortDescription: "Diagnóstico, estruturação e acompanhamento da operação comercial do cliente.",
        fullDescription:
          "Método completo de estruturação comercial da Brain — da imersão na operação do cliente até a validação dos resultados, passando por diagnóstico, plano de ação, implantação, treinamento e acompanhamento.",
        category: "Comercial",
        problemSolved: "Operação comercial sem processo claro, previsibilidade ou acompanhamento estruturado.",
        idealClientProfile: "Empresas com time comercial ativo, mas sem funil, processo ou indicadores definidos.",
        expectedResult: "Processo comercial estruturado, com funil, indicadores e time capacitado para sustentar os resultados.",
        principles: ["Dados antes de opinião", "Processo antes de ferramenta", "Time capacitado sustenta o resultado"],
        premises: ["Cliente engajado durante a imersão", "Acesso aos dados comerciais do cliente"],
        successIndicators: ["Funil comercial mapeado", "Indicadores de conversão definidos", "Time treinado no processo"],
        risks: ["Baixo engajamento do time do cliente", "Falta de acesso a dados históricos"],
        status: "publicado",
        version: "1.0",
        authorId: author?.id ?? null,
        publishedAt: now,
      })
      .returning();

    await db.insert(methodProducts).values({ methodId: method.id, productId: product.id });

    await db.insert(methodStages).values(
      STAGES.map((s, index) => ({
        methodId: method.id,
        name: s.name,
        sortOrder: index,
        objective: s.objective,
      }))
    );

    await db.insert(methodVersions).values({
      methodId: method.id,
      versionLabel: "1.0",
      status: "publicado",
      snapshot: method,
      authorId: author?.id ?? null,
    });

    console.log(`Método "${method.name}" criado e publicado, com ${STAGES.length} macroetapas.`);
  } else {
    console.log(`Método "${method.name}" já existia — mantido como está.`);
  }

  let playbooksCriados = 0;
  for (const p of PLAYBOOKS) {
    const slug = `${METHOD_SLUG}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
    const [existing] = await db.select({ id: playbooks.id }).from(playbooks).where(eq(playbooks.slug, slug)).limit(1);
    if (existing) continue;

    const now = new Date();
    const [playbook] = await db
      .insert(playbooks)
      .values({
        slug,
        name: p.name,
        description: p.description,
        methodId: method.id,
        productId: product.id,
        type: p.type,
        status: "publicado",
        version: "1.0",
        authorId: author?.id ?? null,
        publishedAt: now,
      })
      .returning();

    await db.insert(playbookVersions).values({
      playbookId: playbook.id,
      versionLabel: "1.0",
      status: "publicado",
      snapshot: playbook,
      authorId: author?.id ?? null,
    });

    playbooksCriados++;
  }

  console.log(`Playbooks: ${playbooksCriados} criado(s) (${PLAYBOOKS.length} no modelo).`);
  console.log("Seed do produto-piloto de Métodos & Execução concluído.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao rodar o seed de métodos:", error);
  process.exit(1);
});
