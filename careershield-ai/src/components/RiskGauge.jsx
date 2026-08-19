import { useEffect, useState } from "react";
import { riskColorVar } from "../lib/analyzer";

export default function RiskGauge({ score, riskLevel, size = 168 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270-degree arc, like a scanner sweep
  const arcLength = circumference * arcFraction;
  const gapLength = circumference - arcLength;
  const color = riskColorVar(riskLevel);

  useEffect(() => {
    setAnimatedScore(0);
    const timeout = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timeout);
  }, [score]);

  const progress = (animatedScore / 100) * arcFraction * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[225deg]"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="10"
          strokeDasharray={`${arcLength} ${gapLength}`}
          strokeLinecap="round"
        />
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
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-4xl font-semibold tabular-nums" style={{ color }}>
          {animatedScore}
        </span>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">/ 100</span>
      </div>
    </div>
  );
}
