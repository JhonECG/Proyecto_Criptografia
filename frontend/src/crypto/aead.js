// AES-256-GCM AEAD wrapper.
// Every encrypt call generates a fresh 12-byte nonce via CSPRNG — never reused.

export async function encryptData(plainData, cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(plainData));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );
  return JSON.stringify({
    v: 1,
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ciphertextBuffer)),
  });
}

export async function decryptData(encryptedString, cryptoKey) {
  const { iv, ct } = JSON.parse(encryptedString);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    cryptoKey,
    new Uint8Array(ct)
  );
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}
