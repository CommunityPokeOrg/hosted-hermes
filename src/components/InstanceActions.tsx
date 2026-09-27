"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

export function InstanceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(action: "start" | "stop" | "restart") {
    setBusy(action);
    await fetch(`/api/instances/${id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this instance and its container?")) return;
    setBusy("delete");
    await fetch(`/api/instances/${id}`, { method: "DELETE" });
    router.push("/dashboard/instances");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status !== "running" && (
        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act("start")}>
          Start
        </Button>
      )}
      {status === "running" && (
        <>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act("stop")}>
            Stop
          </Button>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act("restart")}>
            Restart
          </Button>
        </>
      )}
      <Button size="sm" variant="danger" disabled={busy !== null} onClick={remove}>
        Delete
      </Button>
    </div>
  );
}
