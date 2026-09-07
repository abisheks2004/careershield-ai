import { useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Radar,
  Printer,
  Download,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import RiskGauge from "./RiskGauge";
import { riskColorVar } from "../lib/analyzer";

const RISK_ICON = {
  "No Risk": ShieldCheck,
  "Low Risk": ShieldCheck,
  Suspicious: ShieldAlert,
  "High Risk": AlertTriangle,
  "Critical Risk": ShieldX,
};

export default function ScanReport({ report }) {
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <div className="bg-panel border border-line rounded-lg h-full min-h-[460px] flex flex-col items-center justify-center text-center px-8">
        <Radar size={40} className="text-line mb-3 animate-pulse" strokeWidth={1.5} />
        <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
          Forensic Scan Console Ready
        </p>
        <p className="text-sm text-text-dim mt-2 max-w-xs">
          Input a recruitment message, employment contract, or job link to inspect threat vectors.
        </p>
      </div>
    );
  }

  const color = riskColorVar(report.riskLevel, report.score);
  const Icon = RISK_ICON[report.riskLevel] || ShieldAlert;

  function copyMarkdownSummary() {
    const summary = `### CareerShield AI Forensic Report
**Risk Level**: ${report.riskLevel} (${report.score}/100)
**Type**: ${report.type}
**Timestamp**: ${report.createdAt}
**Recommendation**: ${report.recommendation}

#### Flagged Threat Signals:
${report.signals.map((s) => `- [Weight +${s.weight}] ${s.label}`).join("\n")}

${report.llm ? `\n#### AI Forensic Insights:\n${report.llm.summary || ""}\n- Threat Category: ${report.llm.threatCategory || "N/A"}` : ""}
`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `careershield-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div key={report.id} className="bg-panel border border-line rounded-lg overflow-hidden relative animate-rise print:border-none print:shadow-none">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden print:hidden">
        <div
          className="absolute left-0 right-0 h-28 animate-scanline"
          style={{ background: `linear-gradient(180deg, transparent, ${color}18, transparent)` }}
        />
      </div>

      {/* Header bar */}
      <div className="relative px-5 pt-4 pb-3 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-panel-raised/50">
        <div className="flex items-center gap-2">
          <Icon size={18} style={{ color }} />
          <span className="font-mono text-xs uppercase tracking-widest text-text-dim">
            Threat Analysis · <span className="text-text font-bold uppercase">{report.type}</span>
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={copyMarkdownSummary}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-line rounded bg-panel hover:border-scan text-text-dim hover:text-text transition-colors"
            title="Copy formatted markdown report"
          >
            {copied ? <Check size={12} className="text-safe" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={downloadJSON}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-line rounded bg-panel hover:border-scan text-text-dim hover:text-text transition-colors"
            title="Download full incident JSON"
          >
            <Download size={12} />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-line rounded bg-panel hover:border-scan text-text-dim hover:text-text transition-colors"
            title="Print or save as PDF"
          >
            <Printer size={12} />
            <span>Print/PDF</span>
          </button>
        </div>
      </div>

      {/* Main Gauge & Category Breakdown */}
      <div className="relative px-5 py-6 flex flex-col items-center gap-4 border-b border-line">
        <RiskGauge
          score={report.score}
          riskLevel={report.riskLevel}
          subscores={report.subscores}
        />
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-sm font-semibold uppercase tracking-widest px-3.5 py-1 rounded-full border shadow-sm"
            style={{ color, borderColor: color, backgroundColor: `${color}15` }}
          >
            {report.riskLevel}
          </span>
          {report.source && (
            <span className="font-mono text-[10px] text-text-dim px-2 py-0.5 rounded border border-line bg-ink uppercase">
              {report.source}
            </span>
          )}
        </div>
      </div>

      {/* LLM Forensic Analysis (if present) */}
      {report.llm && (
        <div className="relative px-5 py-4 border-b border-line bg-scan/5">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-scan uppercase tracking-wider">
              <Sparkles size={14} />
              AI Forensic Intelligence
            </span>
            {report.llm.threatCategory && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-panel-raised border border-scan/30 text-scan">
                {report.llm.threatCategory}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-text mb-3">
            {report.llm.summary}
          </p>

          {report.llm.keyRedFlags?.length > 0 && (
            <div className="mb-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-1">
                AI Detected Indicators:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-text-dim">
                {report.llm.keyRedFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {report.llm.countermeasures?.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-1">
                Recommended Countermeasures:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-text-dim">
                {report.llm.countermeasures.map((cm, idx) => (
                  <li key={idx} className="text-scan/90">{cm}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Flagged Signals List */}
      <div className="relative px-5 py-4 border-b border-line">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-3">
          Signal Indicators Detected ({report.signals?.length || 0})
        </p>
        <ul className="space-y-2">
          {report.signals?.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 font-mono text-[13px]">
              <span
                className="shrink-0 tabular-nums px-1.5 py-0.5 rounded text-[11px] font-semibold"
                style={{
                  color: s.weight > 0 ? "var(--color-danger, #ef4444)" : "var(--color-text-dim)",
                  backgroundColor: s.weight > 0 ? "color-mix(in srgb, var(--color-danger, #ef4444) 12%, transparent)" : "transparent",
                }}
              >
                {s.weight > 0 ? `+${s.weight}` : "—"}
              </span>
              <span className="text-text leading-snug">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Advisory recommendation */}
      <div className="relative px-5 py-4 border-b border-line bg-panel-raised/30">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-1.5">
          Advisory Action
        </p>
        <p className="text-sm leading-relaxed text-text font-sans">{report.recommendation}</p>
      </div>

      {/* Online Web Check Results */}
      {report.webCheck && (
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
              Threat Intelligence Lookups
            </p>
            <span className={`font-mono text-[11px] uppercase ${report.webCheck.found ? "text-safe" : "text-warn"}`}>
              {report.webCheck.found ? "Public records found" : "No public records"}
            </span>
          </div>

          {report.webCheck.results?.length > 0 ? (
            <ul className="space-y-2.5">
              {report.webCheck.results.map((result, idx) => (
                <li key={idx} className="bg-panel-raised p-2.5 rounded border border-line">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-scan hover:underline flex items-center gap-1 font-mono font-medium"
                  >
                    <span>{result.title}</span>
                    <ExternalLink size={11} />
                  </a>
                  <p className="text-xs text-text-dim mt-1 line-clamp-2">{result.snippet}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-dim">
              No matching public domain intelligence found for this query. Exercise caution when dealing with unlisted entities.
            </p>
          )}
        </div>
      )}

      {/* Report Footer */}
      <div className="px-5 py-2.5 bg-panel-raised border-t border-line flex items-center justify-between text-[11px] font-mono text-text-dim">
        <span>Report ID: {report.id?.slice(0, 16)}...</span>
        <span>Generated: {new Date(report.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
