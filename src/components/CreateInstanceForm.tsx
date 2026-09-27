"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Select } from "./ui";

export function CreateInstanceForm({ agents }: { agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/instances", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        agentConfigId: form.get("agentConfigId"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed to create instance");
    }
  }

  if (agents.length === 0) {
    return <p className="text-sm text-zinc-500">Create an agent config first.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <Field label="Instance name">
        <Input name="name" required placeholder="my-agent-01" pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" />
      </Field>
      <Field label="Agent config">
        <Select name="agentConfigId" required defaultValue="">
          <option value="" disabled>Select…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={busy}>{busy ? "Provisioning…" : "Provision"}</Button>
      {error && <p className="self-center text-sm text-red-400">{error}</p>}
    </form>
  );
}
