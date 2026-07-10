import { argon2id } from "hash-wasm";

// RFC 9106 "moderate" profile, tuned for a one-shot client-side KDF (login/unlock).
const ARGON2_PARALLELISM = 1;
const ARGON2_ITERATIONS = 3;
const ARGON2_MEMORY_KIB = 65_536; // 64 MiB
const ARGON2_HASH_LENGTH = 32; // 256-bit output

async function deriveArgon2Bits(password, salt) {
  const hex = await argon2id({
    password,
    salt: new TextEncoder().encode(salt),
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: "hex",
  });
  return hex;
}

async function importAesKey(hex) {
  const raw = new Uint8Array(hex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Derives the AES-256-GCM Vault Key from masterPassword + clientSecret + vaultSalt.
// clientSecret is device-bound (IndexedDB); vaultSalt is also device-bound.
// Neither the masterPassword nor the resulting key leave the device.
export async function deriveVaultKey(masterPassword, clientSecret, vaultSalt) {
  const hex = await deriveArgon2Bits(
    masterPassword + ":" + clientSecret,
    "kript:vault:" + vaultSalt
  );
  return importAesKey(hex);
}

// Derives the Auth Hash sent to the backend instead of the plain master password.
// Uses a separate salt context so it cannot reconstruct the Vault Key.
export async function deriveAuthHash(masterPassword, email) {
  return deriveArgon2Bits(
    masterPassword,
    "kript:auth:" + email.toLowerCase().trim()
  );
}
