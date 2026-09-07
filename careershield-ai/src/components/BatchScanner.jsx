import { useState } from "react";
import { Layers, Play, Download } from "lucide-react";
import { runAnalysis, riskColorVar } from "../lib/analyzer";

const BATCH_SAMPLE = `https://careers-google-verify.xyz/apply
---
Urgent! Data Entry Clerks needed immediately. Earn $1200/week no experience needed. To reserve your laptop and equipment, send $50 via Zelle for insurance.
---
We are pleased to inform you that you have been selected for the Software Engineer role at Microsoft. Please reply via Telegram @msft_recruitment with your SSN and driver license photo to receive your starter check.
---
https://amazon.jobs/en/jobs/2541890/software-development-engineer-aws
---
Immediate start! Mystery Shopper required to test Western Union wire services. We will mail you a cashier's check of $2,500. Deposit it and send back $2,000.`;

export default function BatchScanner({ onSelectReport }) {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState("all");

  function loadSample() {
    setInputText(BATCH_SAMPLE);
  }

  function detectType(item) {
    const trimmed = item.trim();
    if (/^https?:\/\//i.test(trimmed) || (!trimmed.includes(" ") && trimmed.includes("."))) {
      return "url";
    }
    if (trimmed.toLowerCase().includes("congratulations") || trimmed.toLowerCase().includes("reply to") || trimmed.length < 150) {
      return "message";
    }
    return "job";
  }

  async function handleBatchScan() {
    if (!inputText.trim()) return;
    setIsProcessing(true);

    const items = inputText
      .split(/\n\s*---\s*\n|\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (items.length === 0) {
      setIsProcessing(false);
      return;
    }

    const batchReports = [];
    for (const item of items) {
      const type = detectType(item);
      try {
        const report = runAnalysis(type, item);
        batchReports.push(report);
      } catch (err) {
        console.error("Scan error:", err);
      }
    }

    setResults(batchReports);
    setIsProcessing(false);
  }

  function exportCSV() {
    if (results.length === 0) return;
    const headers = ["ID", "Type", "RiskLevel", "Score", "InputPreview", "TopSignal"];
    const rows = results.map((r) => [
      r.id,
      r.type,
      r.riskLevel,
      r.score,
      `"${r.input.replace(/"/g, '""').slice(0, 80)}"`,
      `"${(r.signals[0]?.label || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `careershield-batch-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportJSON() {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `careershield-batch-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredResults = results.filter((r) => {
    if (filter === "all") return true;
    if (filter === "critical") return r.riskLevel === "Critical Risk";
    if (filter === "high") return r.riskLevel === "High Risk";
    if (filter === "suspicious") return r.riskLevel === "Suspicious";
    if (filter === "safe") return r.riskLevel === "No Risk" || r.riskLevel === "Low Risk";
    return true;
  });

  const stats = {
    total: results.length,
    critical: results.filter((r) => r.riskLevel === "Critical Risk").length,
    high: results.filter((r) => r.riskLevel === "High Risk").length,
    safe: results.filter((r) => r.riskLevel === "No Risk" || r.riskLevel === "Low Risk").length,
    avgScore: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0,
  };

  return (
    <div className="space-y-6 animate-rise">
      <div className="bg-panel border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-scan" />
            <h2 className="text-base font-semibold">Batch Recruitment Scanner</h2>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="font-mono text-xs text-scan hover:underline"
          >
            Load Sample Batch
          </button>
        </div>

        <p className="text-xs text-text-dim mb-3">
          Paste multiple links, messages, or job postings separated by <code className="text-scan font-mono">---</code> or double line breaks.
        </p>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste multiple items separated by --- ..."
          rows={6}
          className="w-full resize-y bg-ink border border-line rounded-md px-3 py-2.5 text-sm text-text placeholder:text-text-dim/60 focus:outline-none focus:border-scan focus:ring-1 focus:ring-scan transition-colors font-mono"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBatchScan}
            disabled={!inputText.trim() || isProcessing}
            className="flex items-center gap-2 bg-scan text-black font-mono text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-md hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Play size={14} className={isProcessing ? "animate-spin" : ""} />
            {isProcessing ? "Scanning Batch..." : "Run Batch Scan"}
          </button>

          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-line rounded bg-panel-raised hover:border-scan text-text-dim hover:text-text transition-colors"
              >
                <Download size={13} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportJSON}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-line rounded bg-panel-raised hover:border-scan text-text-dim hover:text-text transition-colors"
              >
                <Download size={13} />
                Export JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-panel border border-line rounded p-3 text-center">
              <span className="font-mono text-xs text-text-dim uppercase">Total Checked</span>
              <p className="font-mono text-xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="bg-panel border border-line rounded p-3 text-center">
              <span className="font-mono text-xs text-text-dim uppercase">Critical Risk</span>
              <p className="font-mono text-xl font-bold text-red-500 mt-1">{stats.critical}</p>
            </div>
            <div className="bg-panel border border-line rounded p-3 text-center">
              <span className="font-mono text-xs text-text-dim uppercase">High Risk</span>
              <p className="font-mono text-xl font-bold text-orange-400 mt-1">{stats.high}</p>
            </div>
            <div className="bg-panel border border-line rounded p-3 text-center">
              <span className="font-mono text-xs text-text-dim uppercase">Safe / Low</span>
              <p className="font-mono text-xl font-bold text-green-500 mt-1">{stats.safe}</p>
            </div>
            <div className="bg-panel border border-line rounded p-3 text-center col-span-2 sm:col-span-1">
              <span className="font-mono text-xs text-text-dim uppercase">Avg Risk Index</span>
              <p className="font-mono text-xl font-bold text-scan mt-1">{stats.avgScore}/100</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 border-b border-line pb-2">
            {[
              { id: "all", label: "All" },
              { id: "critical", label: "Critical" },
              { id: "high", label: "High" },
              { id: "suspicious", label: "Suspicious" },
              { id: "safe", label: "Safe / Low" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  filter === t.id
                    ? "bg-scan text-black font-semibold"
                    : "text-text-dim hover:text-text bg-panel-raised border border-line"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-panel border border-line rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-panel-raised border-b border-line text-text-dim uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Snippet</th>
                    <th className="px-4 py-3">Risk Level</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredResults.map((item) => {
                    const color = riskColorVar(item.riskLevel, item.score);
                    return (
                      <tr key={item.id} className="hover:bg-panel-raised/50 transition-colors">
                        <td className="px-4 py-3 uppercase text-text-dim font-bold">{item.type}</td>
                        <td className="px-4 py-3 max-w-xs truncate text-text">
                          {item.input}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold border"
                            style={{ color, borderColor: color, backgroundColor: `${color}18` }}
                          >
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color }}>
                          {item.score}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectReport && onSelectReport(item)}
                            className="text-scan hover:underline text-[11px]"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
