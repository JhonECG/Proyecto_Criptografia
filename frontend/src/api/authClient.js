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

// Registers a new user. Derives the Auth Hash before sending — the plain
// master password never leaves the device.
export async function authRegister(email, masterPassword, name = "") {
  const normalizedEmail = email.toLowerCase().trim();
  const authHash = await deriveAuthHash(masterPassword, normalizedEmail);

  if (isDemoMode()) {
    const accounts = getDemoAccounts();
    if (accounts.some((a) => a.email === normalizedEmail)) {
      throw Object.assign(new Error("El correo ya está registrado"), {
        response: { data: { detail: "El correo ya está registrado" } },
      });
    }
    const user = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: normalizedEmail,
      name: name.trim() || "Usuario",
      authHash,
    };
    setDemoAccounts([...accounts, user]);
    const pub = { id: user.id, email: user.email, name: user.name };
    setDemoSession(pub);
    return pub;
  }

  const { data } = await axiosInstance.post("/auth/register", {
    email: normalizedEmail,
    password: authHash,
    name: name.trim(),
  });
  return data;
}

// Logs in by checking the Auth Hash against the stored value.
// Returns the public user object on success.
export async function authLogin(email, masterPassword) {
  const normalizedEmail = email.toLowerCase().trim();
  const authHash = await deriveAuthHash(masterPassword, normalizedEmail);

  if (isDemoMode()) {
    const accounts = getDemoAccounts();
    const account = accounts.find(
      (a) => a.email === normalizedEmail && a.authHash === authHash
    );
    if (!account) {
      throw Object.assign(new Error("Credenciales inválidas"), {
        response: { data: { detail: "Credenciales inválidas" } },
      });
    }
    const pub = { id: account.id, email: account.email, name: account.name };
    setDemoSession(pub);
    return pub;
  }

  const { data } = await axiosInstance.post("/auth/login", {
    email: normalizedEmail,
    password: authHash,
  });
  return data;
}

export async function authMe() {
  if (isDemoMode()) {
    const session = getDemoSession();
    if (!session) throw new Error("No autenticado");
    return session;
  }
  const { data } = await axiosInstance.get("/auth/me");
  return data;
}

export async function authLogout() {
  if (isDemoMode()) {
    clearDemoSession();
    return;
  }
  await axiosInstance.post("/auth/logout");
}

export { isDemoMode, API_BASE };
