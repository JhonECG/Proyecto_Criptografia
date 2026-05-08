import React from "react";
import KriptSvg from "./Kript.svg";

/**
 * Kript logo component using SVG asset.
 */
export function KriptLogo({ size = 400, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="kript-logo">
      <img 
        src={KriptSvg} 
        alt="Kript Logo" 
        style={{ width: size, height: size }}
        className="object-contain"
      />
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
