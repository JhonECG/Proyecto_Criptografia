import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, KeyRound, EyeOff, Fingerprint, Server, Download,
  ArrowRight, Cpu, Hash, Lock, Sparkles, FileDown, Check,
} from "lucide-react";
import KriptLogo from "@/components/kript/KriptLogo";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--kript-bg)] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1118]/80 border-b border-[rgba(168,198,224,0.1)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <KriptLogo size={32} />
          <nav className="hidden md:flex items-center gap-8 text-sm text-[var(--kript-text-dim)]">
            <a href="#features" className="hover:text-[var(--kript-primary)] transition" data-testid="nav-features">Funciones</a>
            <a href="#architecture" className="hover:text-[var(--kript-primary)] transition" data-testid="nav-architecture">Arquitectura</a>
            <a href="#crypto" className="hover:text-[var(--kript-primary)] transition" data-testid="nav-crypto">Criptografía</a>
            <a href="#authors" className="hover:text-[var(--kript-primary)] transition" data-testid="nav-authors">Autores</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost !py-2 !px-4 text-sm" data-testid="nav-login-btn">Iniciar sesión</Link>
            <Link to="/register" className="btn-primary !py-2 !px-4 text-sm" data-testid="nav-register-btn">Crear cuenta</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative kript-grid">
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[rgba(198,224,138,0.35)] text-[var(--kript-primary)] text-xs font-mono-kr tracking-widest mb-8">
                <Sparkles size={14} /> ZERO · KNOWLEDGE · ARCHITECTURE
              </div>
              <h1 className="font-display font-black tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
                Tu bóveda.<br />
                <span style={{ color: "var(--kript-primary)" }}>Solo tuya.</span><br />
                <span className="text-[var(--kript-secondary)]">Ni siquiera nuestro servidor</span>
                <br />puede leerla.
              </h1>
              <p className="mt-8 text-lg text-[var(--kript-text-dim)] max-w-xl leading-relaxed">
                Kript es un gestor de contraseñas de conocimiento cero. Todo el cifrado
                ocurre en tu dispositivo con <span className="font-mono-kr text-[var(--kript-primary)]">Argon2id</span> y{" "}
                <span className="font-mono-kr text-[var(--kript-primary)]">AES-256-GCM</span>.
                El servidor solo guarda blobs cifrados opacos.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link to="/register" className="btn-primary" data-testid="hero-register-btn">
                  Crear mi bóveda <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn-ghost" data-testid="hero-login-btn">
                  Entrar con mi contraseña maestra
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-8 text-xs text-[var(--kript-text-muted)] font-mono-kr tracking-widest">
                <div className="flex items-center gap-2"><Check size={14} className="text-[var(--kript-primary)]" /> CIFRADO EXTREMO A EXTREMO</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-[var(--kript-primary)]" /> NIST 800-63B</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-[var(--kript-primary)]" /> RFC 9106</div>
              </div>
            </div>

            {/* Hero art — circuit padlock */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square ring-lock">
                <div className="absolute inset-6 rounded-full border border-[rgba(198,224,138,0.2)]" />
                <div className="absolute inset-14 rounded-full border border-[rgba(168,198,224,0.25)]" />
                <div className="absolute inset-24 rounded-full border border-[rgba(198,224,138,0.35)] border-dashed" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative flex items-center justify-center w-48 h-48 rounded-full bg-[#0a1118] border border-[rgba(168,198,224,0.3)]">
                    <div className="absolute inset-2 rounded-full border-2 border-[var(--kript-primary)]" />
                    <Lock size={72} strokeWidth={1.5} style={{ color: "var(--kript-primary)" }} />
                  </div>
                </div>
                {/* orbit dots */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <div
                    key={deg}
                    className="absolute w-2 h-2 rounded-full bg-[var(--kript-secondary)]"
                    style={{
                      top: "50%", left: "50%",
                      transform: `rotate(${deg}deg) translate(140px) rotate(-${deg}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="neon-divider" />

      {/* Features grid */}
      <section id="features" className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="mb-14">
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-3">// 01 FUNCIONES</div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black">
            Todo lo que necesitas,<br />
            <span style={{ color: "var(--kript-primary)" }}>nada que te delate.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[rgba(168,198,224,0.15)] border border-[rgba(168,198,224,0.15)]">
          {[
            { icon: KeyRound, title: "Gestión de credenciales", body: "Crea, edita, busca y elimina credenciales (usuario, contraseña, URL, notas) con búsqueda inteligente por nombre o dominio." },
            { icon: Sparkles, title: "Generador de contraseñas", body: "Longitud ajustable, mayúsculas, números y símbolos. Alimentado por CSPRNG para máxima impredecibilidad." },
            { icon: EyeOff, title: "Servidor ciego", body: "El servidor nunca ve tu contraseña maestra ni tus datos en claro. Solo blobs cifrados opacos." },
            { icon: Fingerprint, title: "Salt por usuario", body: "Cada usuario recibe un salt aleatorio único al registrarse para frustrar ataques de diccionario." },
            { icon: Hash, title: "Nonce por operación", body: "Cada guardado genera un nonce nuevo. AES-GCM conserva toda su fuerza sin reutilizaciones peligrosas." },
            { icon: FileDown, title: "Exportar e importar", body: "Respaldos cifrados en JSON verificables con MAC. Guárdalos donde quieras sin perder seguridad." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-[var(--kript-bg)] p-8 group hover:bg-[var(--kript-surface)] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center border border-[var(--kript-primary)]/40 group-hover:border-[var(--kript-primary)] transition">
                  <Icon size={20} className="text-[var(--kript-primary)]" />
                </div>
                <h3 className="font-heading font-bold text-lg">{title}</h3>
              </div>
              <p className="text-[var(--kript-text-dim)] text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative max-w-7xl mx-auto px-6 py-24 border-t border-[rgba(168,198,224,0.1)]">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-3">// 02 ARQUITECTURA</div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.05]">
              Cliente confiable.<br />
              <span style={{ color: "var(--kript-primary)" }}>Servidor</span>{" "}
              <span className="text-[var(--kript-danger)]">no confiable.</span>
            </h2>
            <p className="mt-6 text-[var(--kript-text-dim)] leading-relaxed">
              Todo el cómputo criptográfico ocurre en tu dispositivo. Tu contraseña
              maestra jamás viaja por la red. Del servidor solo subes y bajas blobs
              cifrados, autenticados y versionados.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "KDF local: Argon2id con parámetros calibrados",
                "AEAD: AES-256-GCM con nonce único por operación",
                "JWT emitido tras verificar el hash de autenticación",
                "Export/Import cifrado con verificación MAC",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 bg-[var(--kript-primary)]" />
                  <span className="text-[var(--kript-text)]">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="card-kr p-6 glow-border">
              <div className="grid grid-cols-2 gap-px bg-[rgba(168,198,224,0.12)]">
                <div className="bg-[var(--kript-surface)] p-6">
                  <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-primary)] mb-2">CLIENT · TRUSTED</div>
                  <div className="space-y-3 text-sm">
                    {["Contraseña maestra", "Argon2id (KDF)", "AES-256-GCM (AEAD)", "CSPRNG", "Export key"].map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <Cpu size={14} className="text-[var(--kript-primary)]" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[var(--kript-surface)] p-6">
                  <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-danger)] mb-2">SERVER · UNTRUSTED</div>
                  <div className="space-y-3 text-sm">
                    {["Auth Service · JWT", "Vault API", "Storage · ciphertext only", "Metadata & versions"].map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <Server size={14} className="text-[var(--kript-secondary)]" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 font-mono-kr text-xs text-[var(--kript-text-dim)] border border-[rgba(198,224,138,0.2)]">
                <div><span className="text-[var(--kript-primary)]">›</span> upload: POST /vault &#123; ciphertext, nonce, version &#125;</div>
                <div><span className="text-[var(--kript-primary)]">›</span> download: GET /vault → opaque blob</div>
                <div><span className="text-[var(--kript-primary)]">›</span> decrypt locally with derived key</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Crypto */}
      <section id="crypto" className="relative max-w-7xl mx-auto px-6 py-24 border-t border-[rgba(168,198,224,0.1)]">
        <div className="mb-14">
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-3">// 03 CRIPTOGRAFÍA ELEGIDA</div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black">
            Algoritmos estándar.<br />
            <span style={{ color: "var(--kript-primary)" }}>Nada de criptografía casera.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "Argon2id", s: "KDF", d: "Derivación de clave resistente a memoria y tiempo. Parámetros afinables contra fuerza bruta. RFC 9106." },
            { t: "AES-256-GCM", s: "AEAD", d: "Confidencialidad + integridad simultáneas. Detecta cualquier modificación del blob. NIST SP 800-38D." },
            { t: "CSPRNG", s: "Randomness", d: "Fuente criptográficamente segura para salts, nonces y claves. Nunca funciones básicas del lenguaje." },
          ].map((x) => (
            <div key={x.t} className="card-kr p-6">
              <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)]">{x.s}</div>
              <div className="font-display text-2xl font-black mt-2 text-[var(--kript-primary)]">{x.t}</div>
              <p className="text-sm text-[var(--kript-text-dim)] leading-relaxed mt-3">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Authors */}
      <section id="authors" className="relative max-w-7xl mx-auto px-6 py-24 border-t border-[rgba(168,198,224,0.1)]">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-3">// 04 EQUIPO</div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black">
              Proyecto<br /><span style={{ color: "var(--kript-primary)" }}>académico.</span>
            </h2>
            <p className="mt-6 text-[var(--kript-text-dim)]">
              Kript nace como aplicación real de la teoría del curso: diseño, amenazas
              y decisiones criptográficas aterrizadas en un producto usable.
            </p>
          </div>
          <div className="lg:col-span-7 grid md:grid-cols-3 gap-4">
            {[
              "Jazmin Soto Quiñonez",
              "Jhon Chilo Gonzales",
              "Ariana Mercado Barbieri",
            ].map((name) => (
              <div key={name} className="card-kr p-5">
                <div className="w-10 h-10 rounded-full border border-[var(--kript-primary)]/50 flex items-center justify-center text-[var(--kript-primary)] font-display font-bold">
                  {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="mt-4 font-heading font-semibold">{name}</div>
                <div className="text-xs font-mono-kr text-[var(--kript-text-muted)] mt-1">COAUTOR · KRIPT</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="card-kr glow-border p-12 md:p-16 text-center">
          <ShieldCheck size={40} className="mx-auto text-[var(--kript-primary)]" />
          <h2 className="mt-6 font-display text-3xl sm:text-4xl lg:text-5xl font-black">
            Empieza a proteger tu vida digital hoy.
          </h2>
          <p className="mt-4 text-[var(--kript-text-dim)] max-w-xl mx-auto">
            Una sola contraseña maestra. El resto lo hacemos con matemática verificable.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn-primary" data-testid="cta-register-btn">
              Crear bóveda gratis <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-ghost" data-testid="cta-login-btn">Entrar</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(168,198,224,0.1)] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <KriptLogo size={26} />
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-text-muted)]">
            © {new Date().getFullYear()} KRIPT · ZERO-KNOWLEDGE · v0.1
          </div>
        </div>
      </footer>
    </div>
  );
}
