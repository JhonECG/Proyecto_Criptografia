import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Copy, Check, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

function estimateStrength({ length, uppercase, lowercase, numbers, symbols }) {
  let pool = 0;
  if (lowercase) pool += 26;
  if (uppercase) pool += 26;
  if (numbers) pool += 10;
  if (symbols) pool += 26;
  if (pool === 0) return { score: 0, label: "—" };
  const bits = Math.log2(Math.pow(pool, length));
  let score = 0, label = "Débil";
  if (bits >= 40) { score = 1; label = "Aceptable"; }
  if (bits >= 70) { score = 2; label = "Fuerte"; }
  if (bits >= 100) { score = 3; label = "Excelente"; }
  return { score, label, bits: Math.round(bits) };
}

export default function PasswordGenerator({ onUse, compact = false }) {
  const [opts, setOpts] = useState({ length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true });
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const strength = useMemo(() => estimateStrength(opts), [opts]);

  async function gen() {
    setLoading(true);
    try {
      const { data } = await api.post("/generator", opts);
      setPwd(data.password);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al generar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { gen(); /* eslint-disable-next-line */ }, []);

  async function copy() {
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(true);
      toast.success("Contraseña copiada");
      setTimeout(() => setCopied(false), 1500);
    } catch (_) { toast.error("No se pudo copiar"); }
  }

  return (
    <div className={`card-kr ${compact ? "p-4" : "p-6"}`} data-testid="generator-panel">
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)]">// GENERADOR · CSPRNG</div>
            <div className="font-display text-2xl font-black mt-1">Generador de contraseñas</div>
          </div>
          <Sparkles className="text-[var(--kript-primary)]" />
        </div>
      )}

      <div className="bg-[#05090f] border border-[rgba(198,224,138,0.25)] p-4 font-mono-kr text-lg sm:text-xl text-[var(--kript-primary)] break-all min-h-[60px] flex items-center" data-testid="generated-password-display">
        {pwd || "—"}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={gen} className="btn-ghost !py-2 !px-3 text-xs" data-testid="regenerate-btn">
            <RefreshCw size={14} /> {loading ? "…" : "Regenerar"}
          </button>
          <button onClick={copy} className="btn-primary !py-2 !px-3 text-xs" data-testid="copy-generated-btn">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiado" : "Copiar"}
          </button>
          {onUse && (
            <button onClick={() => onUse(pwd)} className="btn-ghost !py-2 !px-3 text-xs" data-testid="use-generated-btn">
              Usar
            </button>
          )}
        </div>
        <div className="text-xs font-mono-kr text-[var(--kript-text-muted)]" data-testid="strength-bits">
          ≈ {strength.bits || 0} bits · <span className="text-[var(--kript-primary)]">{strength.label}</span>
        </div>
      </div>

      {/* strength bars */}
      <div className="mt-3 flex gap-1" aria-label="indicador de fuerza">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1" style={{
            background: i <= strength.score
              ? ["#ff4d4f", "#fbbf24", "#a8c6e0", "#c6e08a"][strength.score]
              : "rgba(168,198,224,0.15)",
          }}/>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="label-kr flex justify-between">
            <span>Longitud</span>
            <span className="text-[var(--kript-primary)] font-mono-kr">{opts.length}</span>
          </label>
          <input type="range" min={8} max={64} value={opts.length}
            onChange={(e) => setOpts({ ...opts, length: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--kript-primary)]" data-testid="length-slider"/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["uppercase", "Mayúsculas A-Z"],
            ["lowercase", "Minúsculas a-z"],
            ["numbers", "Números 0-9"],
            ["symbols", "Símbolos !@#$"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 p-3 border border-[rgba(168,198,224,0.15)] cursor-pointer hover:border-[var(--kript-primary)]/50" data-testid={`toggle-${k}`}>
              <input type="checkbox" checked={opts[k]}
                onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })}
                className="accent-[var(--kript-primary)]"/>
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
