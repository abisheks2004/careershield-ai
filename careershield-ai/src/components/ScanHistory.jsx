import { riskColorVar } from "../lib/analyzer";
import { History } from "lucide-react";

export default function ScanHistory({ history, onSelect, activeId }) {
  if (history.length === 0) return null;

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
        <History size={13} className="text-text-dim" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
          Recent Scans ({history.length})
        </span>
      </div>
      <ul className="divide-y divide-line max-h-64 overflow-y-auto">
        {history.map((r) => {
          const color = riskColorVar(r.riskLevel);
          const isActive = r.id === activeId;
          return (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-panel-raised ${
                  isActive ? "bg-panel-raised" : ""
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                />
                <span className="font-mono text-[11px] uppercase text-text-dim w-14 shrink-0">
                  {r.type}
                </span>
                <span className="text-xs text-text-dim truncate flex-1">
                  {r.input.slice(0, 48)}
                  {r.input.length > 48 ? "…" : ""}
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums shrink-0" style={{ color }}>
                  {r.score}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
