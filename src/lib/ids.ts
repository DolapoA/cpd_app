import crypto from "crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomFromAlphabet(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function newRegisterCode(): string {
  return randomFromAlphabet(10);
}

export function newVerificationCode(): string {
  return `CPD-${randomFromAlphabet(4)}-${randomFromAlphabet(4)}-${randomFromAlphabet(4)}`;
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
