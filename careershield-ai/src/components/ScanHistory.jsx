import { useState } from "react";
import { riskColorVar } from "../lib/analyzer";
import { History, Trash2, Download, Search } from "lucide-react";

export default function ScanHistory({ history, onSelect, activeId, onClearHistory }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");

  if (!history || history.length === 0) return null;

  const filteredHistory = history.filter((item) => {
    if (filterSeverity === "critical" && item.riskLevel !== "Critical Risk") return false;
    if (filterSeverity === "high" && item.riskLevel !== "High Risk") return false;
    if (filterSeverity === "suspicious" && item.riskLevel !== "Suspicious") return false;
    if (filterSeverity === "safe" && item.riskLevel !== "No Risk" && item.riskLevel !== "Low Risk") return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.input.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.riskLevel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `careershield-history-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={13} className="text-scan" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
            Scan History ({history.length})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={exportHistory}
            className="text-text-dim hover:text-text p-1 rounded hover:bg-panel-raised"
            title="Export History JSON"
          >
            <Download size={13} />
          </button>
          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-text-dim hover:text-red-400 p-1 rounded hover:bg-panel-raised"
              title="Clear History"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-2 border-b border-line bg-panel-raised/40 space-y-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2.5 text-text-dim" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter scans..."
            className="w-full bg-ink border border-line rounded pl-7 pr-2 py-1 text-xs font-mono text-text placeholder:text-text-dim/60 focus:outline-none focus:border-scan"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {[
            { id: "all", label: "All" },
            { id: "critical", label: "Critical" },
            { id: "high", label: "High" },
            { id: "suspicious", label: "Susp" },
            { id: "safe", label: "Safe" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterSeverity(btn.id)}
              className={`px-2 py-0.5 rounded ${
                filterSeverity === btn.id
                  ? "bg-scan text-black font-bold"
                  : "bg-panel border border-line text-text-dim hover:text-text"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-line max-h-64 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <li className="px-4 py-3 text-center text-xs font-mono text-text-dim">
            No matching scans found.
          </li>
        ) : (
          filteredHistory.map((r) => {
            const color = riskColorVar(r.riskLevel, r.score);
            const isActive = r.id === activeId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-panel-raised ${
                    isActive ? "bg-panel-raised" : ""
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  <span className="font-mono text-[10px] uppercase text-text-dim w-12 shrink-0 font-semibold">
                    {r.type}
                  </span>
                  <span className="text-xs text-text-dim truncate flex-1 font-mono">
                    {r.input.slice(0, 42)}
                    {r.input.length > 42 ? "…" : ""}
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums shrink-0" style={{ color }}>
                    {r.score}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
