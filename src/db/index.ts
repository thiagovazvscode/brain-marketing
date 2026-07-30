import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// `next build` importa os route handlers para coletar metadados de página, o que
// executa este módulo mesmo sem nenhuma request real acontecer — chamar neon()
// direto quebraria o build sempre que DATABASE_URL não existir. Por isso o cliente
// real só é criado sob demanda; sem banco provisionado, `db` é um Proxy que lança
// apenas quando algo tenta de fato usá-lo (dentro de um route handler, em runtime).
function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL não configurada — banco ainda não provisionado.");
        },
      }
    ) as Db;
  }

  const sql = neon(url);
  return drizzle(sql, { schema });
}

export const db = createDb();
