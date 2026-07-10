import axios from "axios";
import { deriveAuthHash } from "@/crypto/kdf";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.trim();
const API_BASE = BACKEND_URL?.startsWith("http") ? `${BACKEND_URL}/api` : null;

function isDemoMode() {
  return !API_BASE;
}

const axiosInstance = axios.create({
  baseURL: API_BASE || undefined,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Demo storage keys (v2 = crypto-aware, separate from legacy demo)
const DEMO_SESSION_KEY = "kript.session.v2";
const DEMO_ACCOUNTS_KEY = "kript.accounts.v2";

// Real-mode session cache: the backend has no GET /auth/me, so the user
// object returned by register/login is cached here to survive a reload.
// It is not a security boundary — the httponly cookies are what actually
// authenticate requests; this is only used to rehydrate the UI.
const SESSION_CACHE_KEY = "kript.session.cache.v1";

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeLocal(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getDemoAccounts() { return readLocal(DEMO_ACCOUNTS_KEY, []); }
function setDemoAccounts(acc) { writeLocal(DEMO_ACCOUNTS_KEY, acc); }
function getDemoSession() { return readLocal(DEMO_SESSION_KEY, null); }
function setDemoSession(u) { writeLocal(DEMO_SESSION_KEY, u); }
function clearDemoSession() { localStorage.removeItem(DEMO_SESSION_KEY); }

function getSessionCache() { return readLocal(SESSION_CACHE_KEY, null); }
function setSessionCache(u) { writeLocal(SESSION_CACHE_KEY, u); }
function clearSessionCache() { localStorage.removeItem(SESSION_CACHE_KEY); }

// Registers a new user. Derives the Auth Hash before sending — the plain
// master password never leaves the device. `username` doubles as the
// login identifier (the UI collects it as an email-shaped string, but the
// backend schema only knows `username`).
export async function authRegister(username, masterPassword, name = "") {
  const normalizedUsername = username.toLowerCase().trim();
  const authHash = await deriveAuthHash(masterPassword, normalizedUsername);

  if (isDemoMode()) {
    const accounts = getDemoAccounts();
    if (accounts.some((a) => a.username === normalizedUsername)) {
      throw Object.assign(new Error("El usuario ya está registrado"), {
        response: { data: { detail: "El usuario ya está registrado" } },
      });
    }
    const user = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username: normalizedUsername,
      name: name.trim() || "Usuario",
      authHash,
    };
    setDemoAccounts([...accounts, user]);
    const pub = { id: user.id, username: user.username, name: user.name };
    setDemoSession(pub);
    return pub;
  }

  const { data } = await axiosInstance.post("/auth/register", {
    username: normalizedUsername,
    auth_hash: authHash,
  });
  setSessionCache(data);
  return data;
}

// Logs in by checking the Auth Hash against the stored value.
// Returns the public user object on success.
export async function authLogin(username, masterPassword) {
  const normalizedUsername = username.toLowerCase().trim();
  const authHash = await deriveAuthHash(masterPassword, normalizedUsername);

  if (isDemoMode()) {
    const accounts = getDemoAccounts();
    const account = accounts.find(
      (a) => a.username === normalizedUsername && a.authHash === authHash
    );
    if (!account) {
      throw Object.assign(new Error("Credenciales inválidas"), {
        response: { data: { detail: "Credenciales inválidas" } },
      });
    }
    const pub = { id: account.id, username: account.username, name: account.name };
    setDemoSession(pub);
    return pub;
  }

  const { data } = await axiosInstance.post("/auth/login", {
    username: normalizedUsername,
    auth_hash: authHash,
  });
  setSessionCache(data);
  return data;
}

// The backend does not expose GET /auth/me (session state lives only in the
// httponly access/refresh cookies). This rehydrates the UI from the local
// session cache written by register/login, and lets a protected request
// (401 handling upstream) be the source of truth for whether it's still valid.
export async function authMe() {
  if (isDemoMode()) {
    const session = getDemoSession();
    if (!session) throw new Error("No autenticado");
    return session;
  }
  const cached = getSessionCache();
  if (!cached) throw new Error("No autenticado");
  return cached;
}

export async function authLogout() {
  if (isDemoMode()) {
    clearDemoSession();
    return;
  }
  try {
    await axiosInstance.post("/auth/logout");
  } finally {
    clearSessionCache();
  }
}

export { isDemoMode, API_BASE, axiosInstance };
