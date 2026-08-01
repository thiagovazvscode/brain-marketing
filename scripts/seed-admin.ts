import bcrypt from "bcryptjs";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password) {
    console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD (em .env.local) antes de rodar o seed.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  if (existing.length > 0) {
    await db.update(adminUsers).set({ passwordHash, name, role: "administrador" }).where(eq(adminUsers.email, email));
    console.log(`Admin ${email} já existia — senha atualizada.`);
  } else {
    await db.insert(adminUsers).values({ email, passwordHash, name, role: "administrador" });
    console.log(`Admin ${email} criado.`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao rodar o seed do admin:", error);
  process.exit(1);
});
