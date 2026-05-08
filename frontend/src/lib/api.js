import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.trim();
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : null;

export const DEMO_LOGIN_CREDENTIALS = {
  email: "demo@kript.app",
  password: "Kript123!",
};

const DEMO_SESSION_KEY = "kript.demo.session";
const DEMO_ACCOUNTS_KEY = "kript.demo.accounts";
const DEMO_CREDENTIALS_KEY = "kript.demo.credentials";

const DEMO_SEED_CREDENTIALS = [
  {
    id: "demo-cred-1",
    name: "GitHub personal",
    username: "demo@kript.app",
    password: "DemoGitHub!234",
    url: "https://github.com",
    notes: "Credencial de ejemplo para validar el front estático.",
    category: "desarrollo",
    favorite: true,
  },
  {
    id: "demo-cred-2",
    name: "Correo principal",
    username: "demo@kript.app",
    password: "DemoMail!234",
    url: "https://mail.google.com",
    notes: "Segundo ejemplo para búsquedas y edición.",
    category: "personal",
    favorite: false,
  },
];

const axiosApi = axios.create({
  baseURL: API_BASE || undefined,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function isDemoMode() {
  return !API_BASE;
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson(key, fallback) {
  if (!hasBrowserStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_e) {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeItem(key) {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(key);
}

function makeError(status, detail) {
  const error = new Error(typeof detail === "string" ? detail : "Request failed");
  error.response = { status, data: { detail } };
  return error;
}

function getDemoAccounts() {
  return readJson(DEMO_ACCOUNTS_KEY, []);
}

function setDemoAccounts(accounts) {
  writeJson(DEMO_ACCOUNTS_KEY, accounts);
}

function getDemoSession() {
  return readJson(DEMO_SESSION_KEY, null);
}

function setDemoSession(user) {
  writeJson(DEMO_SESSION_KEY, user);
}

function clearDemoSession() {
  removeItem(DEMO_SESSION_KEY);
}

function ensureDemoVault() {
  const existing = readJson(DEMO_CREDENTIALS_KEY, null);
  if (Array.isArray(existing)) return existing;
  writeJson(DEMO_CREDENTIALS_KEY, DEMO_SEED_CREDENTIALS);
  return DEMO_SEED_CREDENTIALS;
}

function getDemoCredentials() {
  return ensureDemoVault();
}

function setDemoCredentials(credentials) {
  writeJson(DEMO_CREDENTIALS_KEY, credentials);
}

function requireDemoSession() {
  const session = getDemoSession();
  if (!session) throw makeError(401, "Debes iniciar sesión para acceder a la demo");
  return session;
}

function generateDemoPassword(opts = {}) {
  const { length = 20, uppercase = true, lowercase = true, numbers = true, symbols = true } = opts;
  let charset = "";
  if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
  if (numbers) charset += "0123456789";
  if (symbols) charset += "!@#$%^&*()-_=+[]{};:,.?/";
  if (!charset) throw makeError(400, "Selecciona al menos un conjunto de caracteres");

  const cryptoSource = typeof window !== "undefined" ? window.crypto : null;
  const values = new Uint32Array(length);
  if (cryptoSource?.getRandomValues) {
    cryptoSource.getRandomValues(values);
    return Array.from(values, (value) => charset[value % charset.length]).join("");
  }

  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
}

function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

async function demoRequest(method, url, data) {
  const path = String(url || "").split("?")[0];

  if (method === "get" && path === "/auth/me") {
    const session = getDemoSession();
    if (!session) throw makeError(401, "No autenticado");
    return { data: clone(session) };
  }

  if (method === "post" && path === "/auth/login") {
    const email = String(data?.email || "").trim().toLowerCase();
    const password = String(data?.password || "");
    const demoEmail = DEMO_LOGIN_CREDENTIALS.email.toLowerCase();

    const accounts = getDemoAccounts();
    const account =
      accounts.find((item) => item.email.toLowerCase() === email && item.password === password) ||
      (email === demoEmail && password === DEMO_LOGIN_CREDENTIALS.password
        ? { id: "demo-user", email: DEMO_LOGIN_CREDENTIALS.email, name: "Usuario Demo" }
        : null);

    if (!account) throw makeError(401, "Credenciales inválidas");

    const user = {
      id: account.id || "demo-user",
      email: account.email,
      name: account.name || "Usuario Demo",
    };
    setDemoSession(user);
    return { data: clone(user) };
  }

  if (method === "post" && path === "/auth/register") {
    const email = String(data?.email || "").trim().toLowerCase();
    const password = String(data?.password || "");
    const name = String(data?.name || "").trim();
    if (!email || !password) throw makeError(400, "Correo y contraseña son obligatorios");

    const accounts = getDemoAccounts();
    if (accounts.some((item) => item.email.toLowerCase() === email) || email === DEMO_LOGIN_CREDENTIALS.email.toLowerCase()) {
      throw makeError(400, "Ese correo ya está registrado");
    }

    const user = {
      id: `demo-user-${Date.now()}`,
      email,
      name: name || "Usuario Demo",
      password,
    };
    setDemoAccounts([...accounts, user]);
    setDemoSession({ id: user.id, email: user.email, name: user.name });
    return { data: { id: user.id, email: user.email, name: user.name } };
  }

  if (method === "post" && path === "/auth/logout") {
    clearDemoSession();
    return { data: { ok: true } };
  }

  if (path === "/credentials") {
    requireDemoSession();
    if (method === "get") {
      return { data: clone(getDemoCredentials()) };
    }
    if (method === "post") {
      const credentials = getDemoCredentials();
      const item = { id: `cred-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, ...data };
      const next = [item, ...credentials];
      setDemoCredentials(next);
      return { data: clone(item) };
    }
  }

  const credentialMatch = path.match(/^\/credentials\/([^/]+)$/);
  if (credentialMatch) {
    requireDemoSession();
    const id = credentialMatch[1];
    const credentials = getDemoCredentials();
    const index = credentials.findIndex((item) => item.id === id);
    if (index === -1) throw makeError(404, "Credencial no encontrada");

    if (method === "put") {
      const updated = { ...credentials[index], ...data, id };
      const next = [...credentials];
      next[index] = updated;
      setDemoCredentials(next);
      return { data: clone(updated) };
    }

    if (method === "delete") {
      const next = credentials.filter((item) => item.id !== id);
      setDemoCredentials(next);
      return { data: { ok: true } };
    }
  }

  if (method === "post" && path === "/generator") {
    return { data: { password: generateDemoPassword(data) } };
  }

  throw makeError(404, `Ruta demo no soportada: ${method.toUpperCase()} ${path}`);
}

async function request(method, url, data) {
  if (!isDemoMode()) {
    return axiosApi.request({ method, url, data });
  }
  return demoRequest(method, url, data);
}

export const api = {
  get(url, config) {
    return request("get", url, config?.data);
  },
  post(url, data, config) {
    return request("post", url, data, config);
  },
  put(url, data, config) {
    return request("put", url, data, config);
  },
  delete(url, config) {
    return request("delete", url, config?.data);
  },
};

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Algo salió mal. Intenta nuevamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export { getDemoCredentials, isDemoMode };
