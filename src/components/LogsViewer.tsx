"use client";

import { useEffect, useRef, useState } from "react";

/** Streaming log viewer; polls the logs API every 3s. */
export function LogsViewer({ instanceId }: { instanceId: string }) {
  const [logs, setLogs] = useState<string>("");
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/instances/${instanceId}/logs?tail=300`);
      if (!res.ok || cancelled) return;
      const body = await res.json();
      setLogs(body.logs ?? "");
    }
    const t = setInterval(poll, 3000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [instanceId]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <pre
      ref={ref}
      className="h-72 overflow-auto rounded-md bg-black/60 p-4 font-mono text-xs leading-relaxed text-zinc-300"
    >
      {logs || "No logs yet."}
    </pre>
  );
}
