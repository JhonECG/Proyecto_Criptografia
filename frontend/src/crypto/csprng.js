// All randomness goes through crypto.getRandomValues (CSPRNG).

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function randomBase64(n) {
  const bytes = randomBytes(n);
  return btoa(String.fromCharCode(...bytes));
}

export function randomHex(n) {
  return Array.from(randomBytes(n))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generatePassword({
  length = 20,
  uppercase = true,
  lowercase = true,
  numbers = true,
  symbols = true,
} = {}) {
  let charset = "";
  if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
  if (numbers) charset += "0123456789";
  if (symbols) charset += "!@#$%^&*()-_=+[]{};:,.?/";
  if (!charset) throw new Error("Selecciona al menos un conjunto de caracteres");
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}
