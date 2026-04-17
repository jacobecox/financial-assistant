import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES   = 12;
const TAG_BYTES  = 16;

function getKey(): Buffer {
  const hex = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must be a 64-char hex string");
  return Buffer.from(hex, "hex");
}

// Returns "iv:authTag:ciphertext" as hex-joined string
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

// Accepts both encrypted format and legacy plaintext (for backward compat during migration)
export function decrypt(value: string): string {
  if (!value.includes(":")) return value; // legacy plaintext — pass through
  const parts = value.split(":");
  if (parts.length !== 3) return value;
  const [ivHex, tagHex, cipherHex] = parts;
  const key    = getKey();
  const iv     = Buffer.from(ivHex, "hex");
  const tag    = Buffer.from(tagHex, "hex");
  const cipher = Buffer.from(cipherHex, "hex");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return value;
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(cipher) + decipher.final("utf8");
}
