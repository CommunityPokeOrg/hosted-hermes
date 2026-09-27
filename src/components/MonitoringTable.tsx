"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge, formatBytes, formatUptime } from "./ui";

interface Row {
  id: string;
  name: string;
  status: string;
  hostPort: number | null;
  startedAt: string | null;
  agentConfig: string | null;
  stats: {
    cpuPercent: number;
    memoryMb: number;
    memoryLimitMb: number;
    networkRxBytes: number;
    networkTxBytes: number;
  } | null;
}

/** Fleet-wide monitoring table; polls the instances API every 5s. */
export function MonitoringTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/instances");
      if (!res.ok || cancelled) return;
      const body = await res.json();
      setRows(body.instances ?? []);
    }
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-ink-700 text-xs uppercase text-zinc-500">
          <th className="py-2">Name</th>
          <th>Agent</th>
          <th>Status</th>
          <th>CPU</th>
          <th>Memory</th>
          <th>Net RX/TX</th>
          <th>Uptime</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((i) => (
          <tr key={i.id} className="border-b border-ink-800">
            <td className="py-2.5">
              <Link href={`/dashboard/instances/${i.id}`} className="text-accent-soft hover:underline">
                {i.name}
              </Link>
            </td>
            <td className="text-zinc-400">{i.agentConfig ?? "—"}</td>
            <td><StatusBadge status={i.status} /></td>
            <td className="font-mono text-zinc-300">{i.stats ? `${i.stats.cpuPercent.toFixed(1)}%` : "—"}</td>
            <td className="font-mono text-zinc-300">
              {i.stats ? `${i.stats.memoryMb.toFixed(0)} MB` : "—"}
            </td>
            <td className="font-mono text-zinc-400">
              {i.stats ? `${formatBytes(i.stats.networkRxBytes)} / ${formatBytes(i.stats.networkTxBytes)}` : "—"}
            </td>
            <td className="text-zinc-400">{formatUptime(i.startedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
