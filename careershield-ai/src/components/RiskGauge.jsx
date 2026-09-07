import { useEffect, useState } from "react";
import { riskColorVar } from "../lib/analyzer";
import { DollarSign, UserCheck, MessageSquareWarning, ShieldCheck } from "lucide-react";

export default function RiskGauge({ score, riskLevel, subscores, size = 176 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270-degree arc
  const arcLength = circumference * arcFraction;
  const gapLength = circumference - arcLength;
  const color = riskColorVar(riskLevel, score);

  useEffect(() => {
    setAnimatedScore(0);
    const timeout = setTimeout(() => setAnimatedScore(score), 40);
    return () => clearTimeout(timeout);
  }, [score]);

  const progress = (animatedScore / 100) * arcFraction * circumference;
  const center = size / 2;

  const categories = [
    { key: "financial", label: "Financial", icon: DollarSign, val: subscores?.financial ?? 0 },
    { key: "identity", label: "Identity", icon: UserCheck, val: subscores?.identity ?? 0 },
    { key: "communication", label: "Channel", icon: MessageSquareWarning, val: subscores?.communication ?? 0 },
    { key: "credibility", label: "Credibility", icon: ShieldCheck, val: subscores?.credibility ?? 0 },
  ];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-[225deg]"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-line, #27272a)"
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${gapLength}`}
            strokeLinecap="round"
          />
          {/* Animated score arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 1.1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease",
              filter: `drop-shadow(0 0 8px ${color}88)`,
            }}
          />
        </svg>

        <div className="absolute flex flex-col items-center pointer-events-none">
          <span className="font-mono text-4xl font-bold tabular-nums" style={{ color }}>
            {animatedScore}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
            Risk Index / 100
          </span>
        </div>
      </div>

      {/* Sub-score breakdown meters */}
      {subscores && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const subColor = cat.val > 60 ? "#ef4444" : cat.val > 30 ? "#eab308" : "#22c55e";
            return (
              <div key={cat.key} className="bg-panel-raised border border-line rounded p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-text-dim">
                  <span className="flex items-center gap-1">
                    <Icon size={12} style={{ color: subColor }} />
                    {cat.label}
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: subColor }}>
                    {cat.val}
                  </span>
                </div>
                <div className="w-full bg-ink rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${cat.val}%`,
                      backgroundColor: subColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
