const PBKDF2_ITERATIONS = 310_000;

async function importPasswordMaterial(password) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
}

// Derives the AES-256-GCM Vault Key from masterPassword + clientSecret + vaultSalt.
// clientSecret is device-bound (IndexedDB); vaultSalt is also device-bound.
// Neither the masterPassword nor the resulting key leave the device.
export async function deriveVaultKey(masterPassword, clientSecret, vaultSalt) {
  const material = await importPasswordMaterial(masterPassword + ":" + clientSecret);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("kript:vault:" + vaultSalt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Derives the Auth Hash sent to the backend instead of the plain master password.
// Uses a separate salt context so it cannot reconstruct the Vault Key.
export async function deriveAuthHash(masterPassword, email) {
  const material = await importPasswordMaterial(masterPassword);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("kript:auth:" + email.toLowerCase().trim()),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
