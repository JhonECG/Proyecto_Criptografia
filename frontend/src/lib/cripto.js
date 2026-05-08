
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function encryptVault(vaultData, cryptoKey) {
  // 1. Generar un Nonce único de 12 bytes para AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(JSON.stringify(vaultData));

  // 2. Cifrar los datos (AES-GCM añade automáticamente el auth tag al final)
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    encodedData
  );

  // 3. Empaquetar el IV y el texto cifrado para exportar
  const ciphertextArray = Array.from(new Uint8Array(ciphertextBuffer));
  const ivArray = Array.from(iv);
  
  return JSON.stringify({
    iv: ivArray,
    ciphertext: ciphertextArray
  });
}

export async function decryptVault(encryptedString, cryptoKey) {
  try {
    const { iv, ciphertext } = JSON.parse(encryptedString);
    const ivArray = new Uint8Array(iv);
    const ciphertextArray = new Uint8Array(ciphertext);

    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivArray },
      cryptoKey,
      ciphertextArray
    );

    const decryptedString = decoder.decode(decryptedBuffer);
    return JSON.parse(decryptedString);
    
  } catch (error) {
    throw new Error("El archivo ha sido alterado o la contraseña es incorrecta.");
  }
}