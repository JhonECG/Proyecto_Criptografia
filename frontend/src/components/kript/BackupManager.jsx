import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Eye, EyeOff } from "lucide-react";
// Handles encrypted export and import of the vault.
// Export: encrypts all credentials with a KDF-derived Export Key (separate from Vault Key).
// Import: decrypts the export file, then re-encrypts with a new device Vault Key.
export default function BackupManager({ userId, exportVault, importVault }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [showImportPwd, setShowImportPwd] = useState(false);
  const [exportPwd, setExportPwd] = useState("");
  const [importPwd, setImportPwd] = useState("");
  const [showExportForm, setShowExportForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  async function onExport(e) {
    e.preventDefault();
    if (!exportPwd) { toast.error("Ingresa tu contraseña maestra para exportar"); return; }
    setExporting(true);
    try {
      const exportObj = await exportVault(exportPwd);
      const json = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kript-backup-${new Date().toISOString().slice(0, 10)}.kript`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Bóveda exportada — el archivo está cifrado con tu contraseña maestra");
      setShowExportForm(false);
      setExportPwd("");
    } catch (e) {
      toast.error(e.message || "Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  async function onImport(e) {
    e.preventDefault();
    if (!importFile) { toast.error("Selecciona un archivo de respaldo"); return; }
    if (!importPwd) { toast.error("Ingresa tu contraseña maestra"); return; }
    setImporting(true);
    try {
      const text = await importFile.text();
      const exportObj = JSON.parse(text);
      if (!exportObj.exportSalt || !exportObj.blob) {
        throw new Error("El archivo no es un respaldo válido de Kript (.kript)");
      }
      const creds = await importVault(importPwd, exportObj, userId);
      toast.success(`${creds.length} credencial(es) importada(s) correctamente`);
      setShowImportForm(false);
      setImportPwd("");
      setImportFile(null);
    } catch (e) {
      toast.error(e.message || "Error al importar — verifica la contraseña y el archivo");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="card-kr p-6 mt-6">
      <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-3">
        // EXPORT / IMPORT CIFRADO
      </div>
      <h3 className="font-display text-lg font-bold mb-2">Respaldo y Restauración</h3>
      <p className="text-sm text-[var(--kript-text-dim)] mb-4">
        El archivo de respaldo está cifrado con tu contraseña maestra (Export Key independiente
        del dispositivo). Úsalo para transferir tu bóveda a un dispositivo nuevo.
      </p>

      <div className="flex gap-3 flex-wrap mb-4">
        <button
          onClick={() => { setShowExportForm((s) => !s); setShowImportForm(false); }}
          className="btn-primary !py-2 !px-4 text-sm inline-flex items-center gap-2"
          data-testid="export-btn"
        >
          <Download size={16} /> Exportar bóveda
        </button>
        <button
          onClick={() => { setShowImportForm((s) => !s); setShowExportForm(false); }}
          className="btn-ghost !py-2 !px-4 text-sm inline-flex items-center gap-2"
          data-testid="import-btn"
        >
          <Upload size={16} /> Importar bóveda
        </button>
      </div>

      {showExportForm && (
        <form onSubmit={onExport} className="space-y-3 border border-[rgba(168,198,224,0.15)] p-4 mt-2" data-testid="export-form">
          <div className="text-xs font-mono-kr text-[var(--kript-secondary)]">// CONFIRMAR EXPORTACIÓN</div>
          <div>
            <label className="label-kr">Contraseña maestra</label>
            <div className="relative">
              <input
                type={showExportPwd ? "text" : "password"}
                required
                className="input-kr pr-11 font-mono-kr"
                placeholder="Para cifrar el archivo"
                value={exportPwd}
                onChange={(e) => setExportPwd(e.target.value)}
                data-testid="export-password-input"
              />
              <button
                type="button"
                onClick={() => setShowExportPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
              >
                {showExportPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary !py-2 !px-4 text-sm"
            disabled={exporting}
            data-testid="export-submit"
          >
            <Download size={14} /> {exporting ? "Exportando…" : "Descargar respaldo cifrado"}
          </button>
        </form>
      )}

      {showImportForm && (
        <form onSubmit={onImport} className="space-y-3 border border-[rgba(168,198,224,0.15)] p-4 mt-2" data-testid="import-form">
          <div className="text-xs font-mono-kr text-[var(--kript-secondary)]">// IMPORTAR RESPALDO</div>
          <div>
            <label className="label-kr">Archivo de respaldo (.kript)</label>
            <input
              type="file"
              accept=".kript,.json"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="input-kr text-sm file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-[rgba(198,224,138,0.1)] file:text-[var(--kript-primary)] file:text-xs file:cursor-pointer"
              data-testid="import-file-input"
            />
          </div>
          <div>
            <label className="label-kr">Contraseña maestra</label>
            <div className="relative">
              <input
                type={showImportPwd ? "text" : "password"}
                required
                className="input-kr pr-11 font-mono-kr"
                placeholder="La que usaste al exportar"
                value={importPwd}
                onChange={(e) => setImportPwd(e.target.value)}
                data-testid="import-password-input"
              />
              <button
                type="button"
                onClick={() => setShowImportPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
              >
                {showImportPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--kript-text-muted)]">
            Importar reemplaza la clave de dispositivo actual y re-cifra el vault con una nueva clave local.
          </p>
          <button
            type="submit"
            className="btn-primary !py-2 !px-4 text-sm"
            disabled={importing}
            data-testid="import-submit"
          >
            <Upload size={14} /> {importing ? "Importando…" : "Importar y restaurar"}
          </button>
        </form>
      )}
    </div>
  );
}
