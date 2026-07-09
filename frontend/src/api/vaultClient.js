import axios from "axios";
import { isDemoMode, API_BASE } from "@/api/authClient";

// The vault is stored as a single encrypted blob.
// In real mode: persisted as a special credential entry in /credentials.
// In demo mode: persisted in localStorage keyed by userId.

const VAULT_BLOB_NAME = "__kript_vault_blob__";
const VAULT_BLOB_CATEGORY = "__vault__";

const axiosInstance = axios.create({
  baseURL: API_BASE || undefined,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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
  const { data: creds } = await axiosInstance.get("/credentials");
  const entry = creds.find(
    (c) => c.name === VAULT_BLOB_NAME && c.category === VAULT_BLOB_CATEGORY
  );
  if (!entry) return null;
  return { blob: entry.notes, version: parseInt(entry.username, 10) || 0, entryId: entry.id };
}

// Saves the encrypted blob and returns the new version number.
export async function saveVault(userId, blob, currentVersion) {
  const newVersion = currentVersion + 1;

  if (isDemoMode()) {
    const store = readDemoVaultStore();
    store[userId] = { blob, version: newVersion };
    writeDemoVaultStore(store);
    return newVersion;
  }

  const { data: creds } = await axiosInstance.get("/credentials");
  const existing = creds.find(
    (c) => c.name === VAULT_BLOB_NAME && c.category === VAULT_BLOB_CATEGORY
  );
  const payload = {
    name: VAULT_BLOB_NAME,
    category: VAULT_BLOB_CATEGORY,
    notes: blob,
    username: String(newVersion),
    password: "",
    url: "",
    favorite: false,
  };

  if (existing) {
    await axiosInstance.put(`/credentials/${existing.id}`, payload);
  } else {
    await axiosInstance.post("/credentials", payload);
  }
  return newVersion;
}

// Lightweight poll to detect remote changes without downloading the full blob.
export async function fetchVaultMetadata(userId) {
  if (isDemoMode()) {
    const store = readDemoVaultStore();
    return { version: store[userId]?.version ?? 0 };
  }
  const { data: creds } = await axiosInstance.get("/credentials");
  const entry = creds.find(
    (c) => c.name === VAULT_BLOB_NAME && c.category === VAULT_BLOB_CATEGORY
  );
  return { version: entry ? parseInt(entry.username, 10) || 0 : 0 };
}
