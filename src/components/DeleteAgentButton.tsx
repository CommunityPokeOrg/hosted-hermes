"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

export function DeleteAgentButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="danger"
        onClick={async () => {
          const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
          if (res.ok) {
            router.refresh();
          } else {
            const body = await res.json().catch(() => ({}));
            setError(body.error ?? "delete failed");
          }
        }}
      >
        Delete
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
