import { argon2id } from "hash-wasm";

// RFC 9106 "moderate" profile — matches the profile used for the Vault Key (see kdf.js).
const ARGON2_PARALLELISM = 1;
const ARGON2_ITERATIONS = 3;
const ARGON2_MEMORY_KIB = 65_536; // 64 MiB
const ARGON2_HASH_LENGTH = 32; // 256-bit output

// Derives a portable Export Key from masterPassword + exportSalt.
// The exportSalt is stored in the export file itself, so any device can decrypt
// the export without needing the device-bound Client Secret.
export async function deriveExportKey(masterPassword, exportSalt) {
  const hex = await argon2id({
    password: masterPassword,
    salt: new TextEncoder().encode("kript:export:" + exportSalt),
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: "hex",
  });
  const raw = new Uint8Array(hex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}
