import { useState } from "react";
import { Briefcase, Link2, MessageSquare, ScanLine } from "lucide-react";

const TABS = [
  { id: "job", label: "Job", icon: Briefcase, placeholder: "Paste the full job description here — title, salary, requirements, contact details..." },
  { id: "url", label: "Link", icon: Link2, placeholder: "Paste the application or recruitment URL, e.g. https://careers.example.com/apply" },
  { id: "message", label: "Message", icon: MessageSquare, placeholder: "Paste the recruiter's email, SMS, or WhatsApp message here..." },
];

const SAMPLES = {
  job: "Immediate hiring! Data Entry Assistant needed, no experience required. Earn $500 per day working from home. Act now, limited spots. To confirm your position, a refundable registration fee of $45 is required before training begins.",
  url: "http://linkedin-careers-verify.top/apply?id=3921",
  message: "Congratulations! You have been selected for the Remote Support role. This is urgent — reply within 2 hours on WhatsApp with your bank account details to receive your starter kit.",
};

export default function ScanConsole({ onScan, isScanning }) {
  const [activeTab, setActiveTab] = useState("job");
  const [value, setValue] = useState("");

  const active = TABS.find((t) => t.id === activeTab);

  function handleTabChange(id) {
    setActiveTab(id);
    setValue("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onScan(activeTab, value.trim());
  }

  function fillSample() {
    setValue(SAMPLES[activeTab]);
  }

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 border-b border-line bg-panel-raised px-2 pt-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-wide rounded-t-md transition-colors ${
                isActive
                  ? "bg-panel text-scan border border-line border-b-0"
                  : "text-text-dim hover:text-text border border-transparent"
              }`}
            >
              <Icon size={13} strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="scan-input" className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
            Input // {active.label}
          </label>
          <button
            type="button"
            onClick={fillSample}
            className="font-mono text-[11px] text-scan hover:underline"
          >
            load sample
          </button>
        </div>
        <textarea
          id="scan-input"
          aria-label={`Input for ${active.label}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={active.placeholder}
          rows={activeTab === "url" ? 2 : 6}
          className="w-full resize-none bg-ink border border-line rounded-md px-3 py-2.5 text-sm text-text placeholder:text-text-dim/60 focus:outline-none focus:border-scan focus:ring-1 focus:ring-scan transition-colors font-mono"
        />
        <button
          type="submit"
          disabled={!value.trim() || isScanning}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-scan text-ink font-mono text-sm font-semibold uppercase tracking-wide py-2.5 rounded-md hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ScanLine size={15} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "Scanning..." : "Run Scan"}
        </button>
      </form>
    </div>
  );
}
