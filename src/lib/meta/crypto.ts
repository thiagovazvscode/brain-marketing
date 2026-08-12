import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM pro token de acesso do Meta em repouso — nunca guardar em
// texto puro. Chave vem de META_TOKEN_ENCRYPTION_KEY (server-only, 32 bytes
// em base64). Formato do ciphertext: "<iv>:<authTag>:<ciphertext>", tudo em
// base64, pra caber num único campo text.

function getKey(): Buffer {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY não configurada — necessária pra ler/gravar tokens do Meta.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY inválida — precisa decodificar pra exatamente 32 bytes (AES-256).");
  }
  return key;
}

export function encryptToken(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptToken(cipherText: string): string {
  const [ivB64, tagB64, dataB64] = cipherText.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de token criptografado inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
