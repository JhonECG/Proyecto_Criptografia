import React, { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LogOut,
  Plus,
  Search,
  Vault,
  Sparkles,
  Settings,
  Star,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
} from "lucide-react";
import KriptLogo from "@/components/kript/KriptLogo";
import LockScreen from "@/components/kript/LockScreen";
import { useAuth } from "@/context/AuthContext";
import { useVault } from "@/context/VaultContext";
import CredentialModal from "@/components/kript/CredentialModal";
import PasswordGenerator from "@/components/kript/PasswordGenerator";
import BackupManager from "@/components/kript/BackupManager";
import { toast } from "sonner";

export function AppShell() {
  const { user, logout } = useAuth();
  const { locked, lock } = useVault();
  const nav = useNavigate();

  async function onLogout() {
    lock();
    await logout();
    nav("/");
  }

  return (
    <>
      {locked && <LockScreen userId={user?.id} />}
      <div className="min-h-screen bg-[var(--kript-bg)] text-white grid grid-cols-[240px_1fr]">
        <aside className="border-r border-[rgba(168,198,224,0.1)] p-5 flex flex-col justify-between sticky top-0 h-screen">
          <div>
            <KriptLogo size={28} />
            <nav className="mt-10 space-y-1 text-sm" data-testid="app-nav">
              {[
                { to: "/app", label: "Bóveda", Icon: Vault, end: true },
                { to: "/app/generator", label: "Generador", Icon: Sparkles },
                { to: "/app/settings", label: "Ajustes", Icon: Settings },
              ].map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 border rounded-sm ${
                      isActive
                        ? "border-[var(--kript-primary)] text-[var(--kript-primary)] bg-[rgba(198,224,138,0.06)]"
                        : "border-transparent text-[var(--kript-text-dim)] hover:text-white hover:border-[rgba(168,198,224,0.2)]"
                    }`
                  }
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon size={16} /> {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="space-y-3">
            <button
              onClick={lock}
              className="btn-ghost w-full justify-center !py-2 text-xs"
              data-testid="lock-btn"
            >
              <Lock size={14} /> Bloquear
            </button>
            <div className="card-kr p-3 text-xs">
              <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-1">SESIÓN</div>
              <div className="truncate font-medium" data-testid="sidebar-user-email">
                {user?.email}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn-ghost w-full justify-center !py-2 text-xs"
              data-testid="logout-btn"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </aside>
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </>
  );
}

function copyToClipboard(text, setCopied, key) {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      setCopied(key);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(null), 1200);
    })
    .catch(() => toast.error("No se pudo copiar"));
}

export function VaultPage() {
  const { credentials, addCredential, updateCredential, deleteCredential, locked } = useVault();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState(null);

  const filtered = useMemo(() => {
    let list = credentials;
    if (filter === "favoritas") list = list.filter((c) => c.favorite);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(n) ||
          (c.username || "").toLowerCase().includes(n) ||
          (c.url || "").toLowerCase().includes(n)
      );
    }
    return list;
  }, [credentials, q, filter]);

  function openNew() { setEditing(null); setModalOpen(true); }
  function openEdit(c) { setEditing(c); setModalOpen(true); }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)]">// TU BÓVEDA</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black mt-2">Credenciales</h1>
          <p className="text-[var(--kript-text-dim)] mt-1">
            {locked
              ? "Bóveda bloqueada"
              : `${credentials.length} ${credentials.length === 1 ? "entrada" : "entradas"} protegidas`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openNew} className="btn-primary" data-testid="new-credential-btn" disabled={locked}>
            <Plus size={16} /> Nueva credencial
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)]" />
          <input
            placeholder="Buscar por nombre, usuario o dominio…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-kr pl-10"
            data-testid="search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          {["todas", "favoritas"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-mono-kr tracking-widest border rounded-sm ${
                filter === f
                  ? "border-[var(--kript-primary)] text-[var(--kript-primary)] bg-[rgba(198,224,138,0.06)]"
                  : "border-[rgba(168,198,224,0.2)] text-[var(--kript-text-dim)] hover:text-white"
              }`}
              data-testid={`filter-${f}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-kr p-12 text-center" data-testid="empty-state">
          <Vault size={32} className="mx-auto text-[var(--kript-primary)]" />
          <div className="font-display text-2xl font-bold mt-4">Tu bóveda está vacía</div>
          <p className="text-[var(--kript-text-dim)] mt-2">Añade tu primera credencial para empezar.</p>
          <button onClick={openNew} className="btn-primary mt-6" data-testid="empty-new-btn">
            <Plus size={16} /> Nueva credencial
          </button>
        </div>
      ) : (
        <div className="grid gap-px bg-[rgba(168,198,224,0.12)] border border-[rgba(168,198,224,0.12)]">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-[var(--kript-surface)] p-5 hover:bg-[var(--kript-surface-2)] transition group"
              data-testid={`credential-row-${c.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => openEdit(c)}
                  className="text-left flex-1 min-w-0"
                  data-testid={`open-credential-${c.id}`}
                >
                  <div className="flex items-center gap-2">
                    {c.favorite && (
                      <Star size={14} className="text-[var(--kript-primary)]" fill="currentColor" />
                    )}
                    <div className="font-heading font-semibold text-lg truncate">{c.name}</div>
                    {c.category && (
                      <span className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)] uppercase border border-[rgba(168,198,224,0.2)] px-2 py-0.5">
                        {c.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--kript-text-dim)] mt-1 truncate">
                    {c.username || "—"}
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRevealed((r) => ({ ...r, [c.id]: !r[c.id] }))}
                    className="p-2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
                    title="Revelar"
                    data-testid={`reveal-${c.id}`}
                  >
                    {revealed[c.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(c.username, setCopied, `u-${c.id}`)}
                    className="p-2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
                    title="Copiar usuario"
                    data-testid={`copy-user-${c.id}`}
                  >
                    {copied === `u-${c.id}` ? (
                      <Check size={16} className="text-[var(--kript-primary)]" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(c.password, setCopied, `p-${c.id}`)}
                    className="p-2 text-[var(--kript-primary)] hover:text-[var(--kript-primary-strong)]"
                    title="Copiar contraseña"
                    data-testid={`copy-pass-${c.id}`}
                  >
                    {copied === `p-${c.id}` ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  {c.url && (
                    <a
                      href={c.url.startsWith("http") ? c.url : `https://${c.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
                      title="Abrir URL"
                      data-testid={`open-url-${c.id}`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              {revealed[c.id] && (
                <div
                  className="mt-3 font-mono-kr text-sm bg-[#05090f] border border-[rgba(198,224,138,0.25)] p-3 text-[var(--kript-primary)] break-all"
                  data-testid={`password-view-${c.id}`}
                >
                  {c.password || "(sin contraseña)"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CredentialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSaved={async (item) => {
          if (editing) {
            await updateCredential(item.id, item);
          } else {
            await addCredential(item);
          }
        }}
        onDeleted={async (id) => { await deleteCredential(id); }}
      />
    </div>
  );
}

export function GeneratorPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="mb-6">
        <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)]">// HERRAMIENTA</div>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-2">Generador</h1>
        <p className="text-[var(--kript-text-dim)] mt-1">
          Contraseñas fuertes generadas localmente con CSPRNG del navegador.
        </p>
      </div>
      <PasswordGenerator />
    </div>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { credentials, exportVault, importVault, lock } = useVault();
  const nav = useNavigate();

  async function onLogout() {
    lock();
    await logout();
    nav("/");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="mb-6">
        <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)]">// CUENTA</div>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-2">Ajustes</h1>
      </div>
      <div className="card-kr p-6 space-y-3">
        <div>
          <div className="label-kr">Correo</div>
          <div className="font-mono-kr">{user?.email}</div>
        </div>
        <div>
          <div className="label-kr">Nombre</div>
          <div>{user?.name || "—"}</div>
        </div>
        <div>
          <div className="label-kr">Credenciales en bóveda</div>
          <div className="font-mono-kr text-[var(--kript-primary)]">{credentials.length}</div>
        </div>
      </div>

      <BackupManager userId={user?.id} exportVault={exportVault} importVault={importVault} />

      <div className="mt-8 flex items-center gap-4 text-xs text-[var(--kript-text-muted)] font-mono-kr tracking-widest">
        <Link to="/app" className="hover:text-[var(--kript-primary)]">← Volver al sitio</Link>
        <button onClick={onLogout} className="hover:text-[var(--kript-danger)]">Cerrar sesión</button>
      </div>
    </div>
  );
}
