import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "admin_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias, rolling

function getSecretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET não configurada.");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  // Fase 7 — carregado no token pra evitar 1 query extra a cada request no
  // proxy; sempre reemitido (login e troca de senha) então nunca fica
  // desatualizado por mais que a duração de uma sessão já válida. Diferente
  // do client_id (nunca vive no token — ver src/lib/client-access.ts), isso
  // não é uma fronteira de isolamento entre clientes, só um gate de UX.
  passwordChangeRequired: boolean;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    passwordChangeRequired: payload.passwordChangeRequired,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.email !== "string" || typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      email: payload.email,
      role: typeof payload.role === "string" ? payload.role : "administrador",
      passwordChangeRequired: payload.passwordChangeRequired === true,
    };
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Mesmo custo (12) usado em scripts/seed-admin.ts — um único padrão de hash
// pra toda a base admin_users, admin ou cliente.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Senha temporária legível (evita 0/O/1/l/I ambíguos) — só existe em memória
// no momento da criação/reset; nunca persistida em texto puro, nunca logada,
// devolvida uma única vez na resposta da API pro admin copiar/entregar.
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export function generateTemporaryPassword(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => TEMP_PASSWORD_ALPHABET[b % TEMP_PASSWORD_ALPHABET.length]).join("");
}
