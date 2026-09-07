import { useState } from "react";
import { ShieldHalf } from "lucide-react";
import ScanConsole from "./components/ScanConsole";
import ScanReport from "./components/ScanReport";
import ScanHistory from "./components/ScanHistory";
import { runAnalysis } from "./lib/analyzer";

export default function App() {
  const [history, setHistory] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  async function handleScan(type, input) {
    setIsScanning(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, input }),
      });
      if (!response.ok) throw new Error("The analysis service is unavailable.");
      const report = await response.json();
      setActiveReport(report);
      setHistory((prev) => [report, ...prev].slice(0, 20));
    } catch {
      const report = runAnalysis(type, input);
      setActiveReport({ ...report, source: "local-fallback", webCheck: { found: false } });
      setHistory((prev) => [{ ...report, source: "local-fallback" }, ...prev].slice(0, 20));
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="min-h-screen grain-bg text-text">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldHalf size={20} className="text-scan" strokeWidth={2} />
            <span className="font-mono text-sm font-semibold tracking-wide">
              CareerShield<span className="text-scan">//</span>AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-safe animate-blink" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
              Live scam screening
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Check it before you trust it
          </h1>
          <p className="text-text-dim text-sm leading-relaxed">
            Paste a job offer, link, or message. CareerShield looks for warning signs and
            explains what it finds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
          <div className="space-y-5">
            <ScanConsole onScan={handleScan} isScanning={isScanning} />
            <ScanHistory
              history={history}
              onSelect={setActiveReport}
              activeId={activeReport?.id}
            />
          </div>
          <ScanReport report={activeReport} />
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-8 mt-4">
        <p className="font-mono text-[11px] text-text-dim">
          Results are a helpful warning, not a guarantee. Always verify the company before
          sharing money or personal information.
        </p>
      </footer>
    </div>
  );
}
