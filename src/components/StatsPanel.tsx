"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "./ui";

interface Stats {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
  networkRxBytes: number;
  networkTxBytes: number;
  collectedAt: string;
}

/** Live-refreshing metrics panel; polls the stats API every 5s. */
export function StatsPanel({ instanceId, initial }: { instanceId: string; initial: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [history, setHistory] = useState<Stats[]>(initial ? [initial] : []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/instances/${instanceId}/stats`);
      if (!res.ok || cancelled) return;
      const body = await res.json();
      if (body.latest) {
        setStats(body.latest);
        setHistory(body.stats ?? []);
      }
    }
    const t = setInterval(poll, 5000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [instanceId]);

  const cpuMax = Math.max(10, ...history.map((s) => s.cpuPercent));
  const points = history
    .slice(-60)
    .map((s, i, arr) => `${(i / Math.max(1, arr.length - 1)) * 100},${100 - (s.cpuPercent / cpuMax) * 100}`)
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="CPU" value={stats ? `${stats.cpuPercent.toFixed(1)}%` : "—"} />
        <Metric
          label="Memory"
          value={stats ? `${stats.memoryMb.toFixed(0)} / ${stats.memoryLimitMb.toFixed(0)} MB` : "—"}
        />
        <Metric label="Net RX" value={stats ? formatBytes(stats.networkRxBytes) : "—"} />
        <Metric label="Net TX" value={stats ? formatBytes(stats.networkTxBytes) : "—"} />
      </div>
      {history.length > 1 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">CPU history</p>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-20 w-full rounded bg-ink-800">
            <polyline points={points} fill="none" stroke="#7c6cf0" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink-800 p-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-zinc-100">{value}</p>
    </div>
  );
}
