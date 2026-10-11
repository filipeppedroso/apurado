import type { ReactNode } from "react";
import { C } from "../theme";

export const Gauge = ({ pct, color, h = 10 }: { pct: number; color: string; h?: number }) => (
  <div
    className="relative w-full rounded-full overflow-hidden"
    style={{ background: C.inset, border: `1px solid ${C.line}`, height: h }}
  >
    <div
      className="rounded-full transition-all duration-500"
      style={{ width: `${Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))}%`, background: color, height: "100%" }}
    />
    {[25, 50, 75].map((t) => (
      <div key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t}%`, background: C.line }} />
    ))}
  </div>
);

export const Card = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
    {children}
  </div>
);

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: C.dim }}>
    {children}
  </div>
);

/** Linha clicável com marcador ✓ (blocos de trabalho, opção de trajeto). */
export const CheckRow = ({
  on,
  onClick,
  title,
  subtitle,
  tag,
}: {
  on: boolean;
  onClick: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  tag?: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-left active:scale-95 transition-all"
    style={{
      border: `1px solid ${on ? C.amber : C.line}`,
      background: on ? C.amberSoft : "transparent",
    }}
  >
    <div className="flex items-center gap-2 min-w-0">
      {tag}
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: on ? C.amber : C.text }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-xs" style={{ color: C.dim }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
    <span
      className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-mono text-sm"
      style={{ border: `1px solid ${on ? C.amber : C.line}`, color: on ? C.amber : C.dim }}
    >
      {on ? "✓" : ""}
    </span>
  </button>
);

/** Bolinha de dia (S T Q Q S S D), usada no trajeto e nos ajustes. */
export const DiaPill = ({ on, label, sub, onClick }: { on: boolean; label: string; sub?: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 select-none">
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm transition-all duration-200 active:scale-95"
      style={{
        border: `1px solid ${on ? C.amber : C.line}`,
        background: on ? C.amberSoft : "transparent",
        color: on ? C.amber : C.dim,
      }}
    >
      {on && sub !== undefined ? "✓" : label}
    </span>
    {sub !== undefined && (
      <span className="text-xs font-mono" style={{ color: C.dim }}>
        {sub}
      </span>
    )}
  </button>
);
