const PBKDF2_ITERATIONS = 310_000;

// Derives a portable Export Key from masterPassword + exportSalt.
// The exportSalt is stored in the export file itself, so any device can decrypt
// the export without needing the device-bound Client Secret.
export async function deriveExportKey(masterPassword, exportSalt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("kript:export:" + exportSalt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
