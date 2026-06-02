"use client";
import { useRef, useState } from "react";
import { healthColor } from "@/lib/stellarUtils";

interface DataPoint {
  date: string;       // ISO date string
  value: number;      // bps, 10_000 = 1.0
}

interface TooltipState {
  x: number;
  y: number;
  point: DataPoint;
}

interface Props {
  value: number;          // current bps value (single-point mode)
  history?: DataPoint[];  // optional time-series for chart mode
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function HistoryChart({ history }: { history: DataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const max = Math.max(...history.map((p) => p.value), 20_000);
  const W = 100; // percentage-based viewport

  function show(e: React.MouseEvent | React.TouchEvent, point: DataPoint, idx: number) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // raw position relative to container
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // clamp tooltip so it never overflows container (tooltip ~140×64px)
    const TW = 144, TH = 68;
    x = Math.min(Math.max(x, TW / 2), rect.width - TW / 2);
    y = y < TH + 8 ? y + 12 : y - TH - 8;

    setTooltip({ x, y, point });
  }

  return (
    <div ref={containerRef} className="relative mt-4 h-28 select-none" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" className="w-full h-full" aria-label="Health factor history chart">
        {/* baseline */}
        <line x1="0" y1="50" x2={W} y2="50" stroke="#4A2C0A" strokeOpacity="0.08" strokeWidth="0.5" />

        {/* polyline */}
        <polyline
          fill="none"
          stroke="#D4A017"
          strokeWidth="1.5"
          strokeLinejoin="round"
          points={history
            .map((p, i) => {
              const px = (i / (history.length - 1 || 1)) * W;
              const py = 100 - (p.value / max) * 90;
              return `${px},${py}`;
            })
            .join(" ")}
        />

        {/* interactive data points */}
        {history.map((point, i) => {
          const px = (i / (history.length - 1 || 1)) * W;
          const py = 100 - (point.value / max) * 90;
          const color = healthColor(point.value);
          const isActive = tooltip?.point === point;
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={isActive ? 3 : 2}
              fill={isActive ? color : "#D4A017"}
              stroke={isActive ? color : "white"}
              strokeWidth={isActive ? 0 : 0.8}
              style={{ cursor: "pointer", transition: "r 0.15s" }}
              onMouseEnter={(e) => show(e, point, i)}
              onTouchStart={(e) => { e.preventDefault(); show(e, point, i); }}
              onTouchEnd={() => setTimeout(() => setTooltip(null), 2000)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-brown text-cream text-xs px-3 py-2 shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateX(-50%)",
            minWidth: "9rem",
          }}
          role="tooltip"
        >
          <p className="font-semibold">{formatDate(tooltip.point.date)}</p>
          <p>Health: <span className="font-mono">{(tooltip.point.value / 10_000).toFixed(2)}x</span></p>
          <p>Value: <span className="font-mono">{tooltip.point.value.toLocaleString()} bps</span></p>
        </div>
      )}
    </div>
  );
}

export default function HealthGauge({ value, history }: Props) {
  const ratio = Math.min(value / 20_000, 1);
  const pct = Math.round(ratio * 100);
  const color = healthColor(value);
  const label = value >= 10_000 ? "Healthy" : "At Risk";

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold" style={{ color }}>{label}</span>
        <span className="text-brown/60">{(value / 10_000).toFixed(2)}x</span>
      </div>
      <div className="w-full bg-brown/10 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {history && history.length > 1 && <HistoryChart history={history} />}
    </div>
  );
}
