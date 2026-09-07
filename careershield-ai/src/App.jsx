import { useState, useEffect } from "react";
import { ShieldHalf, Layers, Activity } from "lucide-react";
import ScanConsole from "./components/ScanConsole";
import ScanReport from "./components/ScanReport";
import ScanHistory from "./components/ScanHistory";
import BatchScanner from "./components/BatchScanner";
import { runAnalysis } from "./lib/analyzer";

const STORAGE_KEY = "careershield_history";

export default function App() {
  const [activeTab, setActiveTab] = useState("single"); // "single" | "batch"
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeReport, setActiveReport] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
    } catch (err) {
      console.error("Failed to save history to localStorage", err);
    }
  }, [history]);

  function handleClearHistory() {
    if (window.confirm("Clear all recorded scan history?")) {
      setHistory([]);
      setActiveReport(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

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
      setHistory((prev) => [report, ...prev.filter((p) => p.id !== report.id)].slice(0, 50));
    } catch {
      const report = runAnalysis(type, input);
      const fallbackReport = {
        ...report,
        source: "local-heuristic",
        webCheck: { found: false, note: "Offline mode or API server unreachable" },
      };
      setActiveReport(fallbackReport);
      setHistory((prev) => [fallbackReport, ...prev.filter((p) => p.id !== fallbackReport.id)].slice(0, 50));
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="min-h-screen grain-bg text-text">
      {/* Top Header */}
      <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-scan/10 border border-scan/30">
              <ShieldHalf size={20} className="text-scan" strokeWidth={2} />
            </div>
            <div>
              <span className="font-mono text-sm font-bold tracking-wide">
                CareerShield<span className="text-scan">//</span>AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-panel-raised border border-line text-text-dim">
                v2.0
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 bg-panel-raised p-1 rounded-md border border-line">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === "single"
                  ? "bg-scan text-black font-semibold shadow-sm"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <Activity size={13} />
              <span>Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === "batch"
                  ? "bg-scan text-black font-semibold shadow-sm"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <Layers size={13} />
              <span>Batch</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Batch Tab */}
        {activeTab === "batch" && (
          <BatchScanner
            onSelectReport={(report) => {
              setActiveReport(report);
              setActiveTab("single");
            }}
          />
        )}

        {/* Single Scan Tab */}
        {activeTab === "single" && (
          <div>
            <div className="mb-6 max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Recruitment Threat Intelligence
              </h1>
              <p className="text-text-dim text-sm leading-relaxed">
                Detect advance-fee scams, check fraud, domain impersonation, and identity theft vectors across jobs, recruiters, and URLs.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
              <div className="space-y-5">
                <ScanConsole onScan={handleScan} isScanning={isScanning} />
                <ScanHistory
                  history={history}
                  onSelect={setActiveReport}
                  activeId={activeReport?.id}
                  onClearHistory={handleClearHistory}
                />
              </div>
              <ScanReport report={activeReport} />
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-6 border-t border-line/50 mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-[11px] text-text-dim">
          CareerShield AI · Automated heuristic & AI recruitment protection.
        </p>
        <span className="font-mono text-[10px] text-text-dim">
          Never wire money or purchase gift cards for an employment offer.
        </span>
      </footer>
    </div>
  );
}
