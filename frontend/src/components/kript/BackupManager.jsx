import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';

export default function BackupManager({ vaultData, onImportSuccess, isImporting = false }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const totalProcessing = isProcessing || isImporting;

  // --- FUNCIÓN DE EXPORTAR ---
  const handleExport = async () => {
    setIsProcessing(true);
    try {
      // Exportar como JSON (modo demo sin cifrado)
      const exportData = Array.isArray(vaultData) ? vaultData : [vaultData];
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kript_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Bóveda exportada correctamente.");
    } catch (error) {
      toast.error("Error al exportar la bóveda.");
      console.error(error);
    }
    setIsProcessing(false);
  };

  // --- FUNCIÓN DE IMPORTAR ---
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileContent = e.target.result;
        let importedData;
        
        try {
          importedData = JSON.parse(fileContent);
        } catch (parseErr) {
          throw new Error("El archivo no es JSON válido.");
        }
        
        // Validar que sea array o un objeto de credencial
        if (typeof importedData !== 'object' || importedData === null) {
          throw new Error("Formato de archivo no válido. Debe ser un array o un objeto.");
        }
        
        // Si es un array vacío, rechazar
        if (Array.isArray(importedData) && importedData.length === 0) {
          throw new Error("El archivo no contiene credenciales.");
        }
        
        // Llamar al callback con los datos
        await onImportSuccess(importedData);
        
      } catch (error) {
        toast.error(`Error: ${error.message || "Archivo corrupto o formato no válido."}`);
        console.error(error);
      } finally {
        setIsProcessing(false);
        event.target.value = null; // Limpiar el input file
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="card-kr p-6 mt-6">
      <div className="text-[10px] font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-3">// EXPORT / IMPORT</div>
      <h3 className="font-display text-lg font-bold mb-2">Respaldo y Restauración</h3>
      <p className="text-sm text-[var(--kript-text-dim)] mb-4">
        Exporta una copia de seguridad de tu bóveda o importa un respaldo anterior.
      </p>
      
      <div className="flex gap-3 flex-wrap">
        <button 
          onClick={handleExport} 
          disabled={totalProcessing}
          className="btn-primary !py-2 !px-4 text-sm inline-flex items-center gap-2"
        >
          <Download size={16} /> {isProcessing ? "Exportando…" : "Exportar Bóveda"}
        </button>
        
        <div>
          <input
            type="file"
            accept=".json,.kript"
            id="import-file"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <button 
            onClick={() => document.getElementById("import-file").click()}
            disabled={totalProcessing}
            className="btn-ghost !py-2 !px-4 text-sm inline-flex items-center gap-2"
          >
            <Upload size={16} /> {totalProcessing ? "Importando…" : "Importar Bóveda"}
          </button>
        </div>
      </div>
    </div>
  );
}