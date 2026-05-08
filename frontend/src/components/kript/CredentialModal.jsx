import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { X, RefreshCw, Copy, Check, Eye, EyeOff, Trash2, Save, Star } from "lucide-react";
import { toast } from "sonner";
import PasswordGenerator from "@/components/kript/PasswordGenerator";

const empty = { name: "", username: "", password: "", url: "", notes: "", category: "general", favorite: false };

export default function CredentialModal({ open, onClose, initial, onSaved, onDeleted }) {
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...empty, ...initial } : empty);
      setShow(false);
      setShowGen(false);
    }
  }, [open, initial]);

  if (!open) return null;
  const isEdit = Boolean(initial?.id);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, username: form.username, password: form.password,
        url: form.url, notes: form.notes, category: form.category || "general",
        favorite: !!form.favorite,
      };
      const { data } = isEdit
        ? await api.put(`/credentials/${initial.id}`, payload)
        : await api.post("/credentials", payload);
      toast.success(isEdit ? "Credencial actualizada" : "Credencial guardada");
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    if (!window.confirm("¿Eliminar esta credencial definitivamente?")) return;
    try {
      await api.delete(`/credentials/${initial.id}`);
      toast.success("Credencial eliminada");
      onDeleted?.(initial.id);
      onClose?.();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al eliminar");
    }
  }

  async function copy(field, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(null), 1500);
    } catch (_) { toast.error("No se pudo copiar"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" data-testid="credential-modal">
      <div className="w-full max-w-2xl card-kr glow-border relative">
        <div className="flex items-center justify-between p-5 border-b border-[rgba(168,198,224,0.1)]">
          <div>
            <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)]">
              {isEdit ? "// EDITAR CREDENCIAL" : "// NUEVA CREDENCIAL"}
            </div>
            <div className="font-display font-black text-xl mt-1">{isEdit ? form.name || "Credencial" : "Agregar al vault"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => set("favorite", !form.favorite)} className={`p-2 border ${form.favorite ? "border-[var(--kript-primary)] text-[var(--kript-primary)]" : "border-[rgba(168,198,224,0.2)] text-[var(--kript-text-dim)]"} hover:text-[var(--kript-primary)]`} data-testid="toggle-favorite">
              <Star size={18} fill={form.favorite ? "currentColor" : "none"} />
            </button>
            <button onClick={onClose} className="p-2 border border-[rgba(168,198,224,0.2)] text-[var(--kript-text-dim)] hover:text-white" data-testid="close-modal">
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={save} className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label-kr">Nombre</label>
            <input className="input-kr" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. GitHub personal" required data-testid="field-name"/>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label-kr">Usuario / correo</label>
              <div className="relative">
                <input className="input-kr pr-11" value={form.username} onChange={(e) => set("username", e.target.value)} data-testid="field-username"/>
                <button type="button" onClick={() => copy("username", form.username)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]" data-testid="copy-username">
                  {copied === "username" ? <Check size={16} className="text-[var(--kript-primary)]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-kr">URL</label>
              <input className="input-kr" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" data-testid="field-url"/>
            </div>
          </div>

          <div>
            <label className="label-kr flex items-center justify-between">
              <span>Contraseña</span>
              <button type="button" onClick={() => setShowGen((s) => !s)} className="text-[var(--kript-primary)] text-xs hover:underline inline-flex items-center gap-1" data-testid="toggle-generator">
                <RefreshCw size={12} /> {showGen ? "Ocultar generador" : "Generar contraseña"}
              </button>
            </label>
            <div className="relative">
              <input type={show ? "text" : "password"} className="input-kr font-mono-kr pr-20" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="field-password"/>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setShow((s) => !s)} className="p-1.5 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]" data-testid="toggle-show-password">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button type="button" onClick={() => copy("password", form.password)} className="p-1.5 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]" data-testid="copy-password">
                  {copied === "password" ? <Check size={16} className="text-[var(--kript-primary)]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            {showGen && (
              <div className="mt-3">
                <PasswordGenerator onUse={(pwd) => { set("password", pwd); toast.success("Contraseña aplicada"); }} compact />
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label-kr">Categoría</label>
              <select className="input-kr" value={form.category} onChange={(e) => set("category", e.target.value)} data-testid="field-category">
                <option value="general">General</option>
                <option value="trabajo">Trabajo</option>
                <option value="personal">Personal</option>
                <option value="banca">Banca</option>
                <option value="redes">Redes sociales</option>
                <option value="desarrollo">Desarrollo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-kr">Notas</label>
            <textarea className="input-kr min-h-[90px]" value={form.notes} onChange={(e) => set("notes", e.target.value)} data-testid="field-notes"/>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[rgba(168,198,224,0.1)]">
            <div>
              {isEdit && (
                <button type="button" onClick={remove} className="inline-flex items-center gap-2 text-sm text-[var(--kript-danger)] hover:underline" data-testid="delete-credential">
                  <Trash2 size={16} /> Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-ghost" onClick={onClose} data-testid="cancel-credential">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving} data-testid="save-credential">
                <Save size={16} /> {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
