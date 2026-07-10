import { isDemoMode, axiosInstance } from "@/api/authClient";

// The vault is stored as a single encrypted blob.
// In real mode: GET/PUT /vault — server-side optimistic concurrency via `version`.
// In demo mode: persisted in localStorage keyed by userId.

const DEMO_VAULT_STORE = "kript.vault.v2";

function readDemoVaultStore() {
  try { return JSON.parse(localStorage.getItem(DEMO_VAULT_STORE)) || {}; }
  catch { return {}; }
}
function writeDemoVaultStore(store) {
  localStorage.setItem(DEMO_VAULT_STORE, JSON.stringify(store));
}

// Returns { blob, version } or null if no vault exists for this user.
export async function fetchVault(userId) {
  if (isDemoMode()) {
    const store = readDemoVaultStore();
    return store[userId] ?? null;
  }
  try {
    const { data } = await axiosInstance.get("/vault");
    return { blob: data.ciphertext, version: data.version };
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

// Saves the encrypted blob and returns the new version number.
// currentVersion must match the server's last-seen version (optimistic
// concurrency) — a mismatch raises 409, surfaced to the caller as-is.
export async function saveVault(userId, blob, currentVersion) {
  if (isDemoMode()) {
    const newVersion = currentVersion + 1;
    const store = readDemoVaultStore();
    store[userId] = { blob, version: newVersion };
    writeDemoVaultStore(store);
    return newVersion;
  }

  const { data } = await axiosInstance.put("/vault", {
    ciphertext: blob,
    version: currentVersion,
  });
  return data.version;
}

// Lightweight poll to detect remote changes without downloading the full blob.
export async function fetchVaultMetadata(userId) {
  if (isDemoMode()) {
    const store = readDemoVaultStore();
    return { version: store[userId]?.version ?? 0 };
  }
  try {
    const { data } = await axiosInstance.get("/vault/metadata");
    return { version: data.version };
  } catch (e) {
    if (e.response?.status === 404) return { version: 0 };
    throw e;
  }
}
