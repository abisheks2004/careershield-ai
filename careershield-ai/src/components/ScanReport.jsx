import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX, Radar } from "lucide-react";
import RiskGauge from "./RiskGauge";
import { riskColorVar } from "../lib/analyzer";

const RISK_ICON = {
  "Low Risk": ShieldCheck,
  Suspicious: ShieldAlert,
  "High Risk": AlertTriangle,
  "Critical Risk": ShieldX,
};

export default function ScanReport({ report }) {
  if (!report) {
    return (
      <div className="bg-panel border border-line rounded-lg h-full min-h-[420px] flex flex-col items-center justify-center text-center px-8">
        <Radar size={36} className="text-line mb-3" strokeWidth={1.5} />
        <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
          Awaiting input
        </p>
        <p className="text-sm text-text-dim mt-2 max-w-xs">
          Submit a job description, link, or message on the left to generate a risk report.
        </p>
      </div>
    );
  }

  const color = riskColorVar(report.riskLevel);
  const Icon = RISK_ICON[report.riskLevel];

  return (
    <div key={report.id} className="bg-panel border border-line rounded-lg overflow-hidden relative animate-rise">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-0 right-0 h-24 animate-scanline"
          style={{ background: `linear-gradient(180deg, transparent, ${color}22, transparent)` }}
        />
      </div>

      <div className="relative px-5 pt-5 pb-4 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          <span className="font-mono text-xs uppercase tracking-widest text-text-dim">
            Scan Report // {report.type}
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-dim">
          {new Date(report.createdAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="relative px-5 py-6 flex flex-col items-center gap-3 border-b border-line">
        <RiskGauge score={report.score} riskLevel={report.riskLevel} />
        <span
          className="font-mono text-sm font-semibold uppercase tracking-widest px-3 py-1 rounded-full border"
          style={{ color, borderColor: color, backgroundColor: `${color}14` }}
        >
          {report.riskLevel}
        </span>
      </div>

      <div className="relative px-5 py-4 border-b border-line">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-3">
          Detected Signals
        </p>
        <ul className="space-y-2">
          {report.signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 font-mono text-[13px]">
              <span
                className="shrink-0 tabular-nums px-1.5 py-0.5 rounded text-[11px] font-semibold"
                style={{
                  color: s.weight > 0 ? color : "var(--color-text-dim)",
                  backgroundColor: s.weight > 0 ? `${color}14` : "transparent",
                }}
              >
                {s.weight > 0 ? `+${s.weight}` : "—"}
              </span>
              <span className="text-text-dim leading-snug">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-2">
          Recommendation
        </p>
        <p className="text-sm leading-relaxed text-text">{report.recommendation}</p>
      </div>
    </div>
  );
}
