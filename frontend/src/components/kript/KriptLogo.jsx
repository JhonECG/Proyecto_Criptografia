import React from "react";
import { Lock } from "lucide-react";

/**
 * Placeholder wordmark for "KRIPT".
 * User will replace with the official asset — keeps layout stable.
 */
export function KriptLogo({ size = 36, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="kript-logo">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--kript-primary)" }} />
        <div
          className="absolute rounded-full border"
          style={{
            inset: 4,
            borderColor: "var(--kript-secondary)",
            borderStyle: "dashed",
          }}
        />
        <Lock size={size * 0.45} strokeWidth={2.25} style={{ color: "var(--kript-primary)" }} />
      </div>
      {withText && (
        <span
          className="font-display font-black tracking-widest"
          style={{ fontSize: size * 0.55, color: "var(--kript-text)" }}
        >
          KRIPT
        </span>
      )}
    </div>
  );
}

export default KriptLogo;
