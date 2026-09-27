"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Textarea } from "./ui";

const KNOWN_TOOLS = ["web_search", "code_exec", "filesystem", "http_request", "memory", "scheduler"];

export function AgentForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tools, setTools] = useState<string[]>([]);
  const [envPairs, setEnvPairs] = useState<{ k: string; v: string }[]>([]);

  function toggleTool(tool: string) {
    setTools((prev) => (prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const env: Record<string, string> = {};
    for (const { k, v } of envPairs) if (k.trim()) env[k.trim()] = v;
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        model: form.get("model"),
        systemPrompt: form.get("systemPrompt") ?? "",
        tools,
        env,
        resources: {
          cpus: Number(form.get("cpus") || 1),
          memoryMb: Number(form.get("memoryMb") || 512),
        },
        image: (form.get("image") as string) || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setTools([]);
      setEnvPairs([]);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed to create agent config");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Name">
          <Input name="name" required placeholder="research-agent" />
        </Field>
        <Field label="Model">
          <Input name="model" required placeholder="hermes-3-70b" />
        </Field>
      </div>
      <Field label="System prompt">
        <Textarea name="systemPrompt" rows={3} placeholder="You are a Hermes agent…" />
      </Field>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="CPUs">
          <Input name="cpus" type="number" min={0.25} max={16} step={0.25} defaultValue={1} />
        </Field>
        <Field label="Memory (MB)">
          <Input name="memoryMb" type="number" min={64} max={32768} step={64} defaultValue={512} />
        </Field>
        <Field label="Image override (optional)">
          <Input name="image" placeholder="registry/hermes-agent:tag" />
        </Field>
      </div>

      <div>
        <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">Tools</span>
        <div className="flex flex-wrap gap-2">
          {KNOWN_TOOLS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => toggleTool(t)}
              className={`rounded-full border px-3 py-1 text-xs ${
                tools.includes(t)
                  ? "border-accent bg-accent/20 text-accent-soft"
                  : "border-ink-600 text-zinc-400 hover:border-ink-600 hover:text-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
          Environment variables
        </span>
        <div className="space-y-2">
          {envPairs.map((pair, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="KEY"
                value={pair.k}
                onChange={(e) =>
                  setEnvPairs((p) => p.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))
                }
              />
              <Input
                placeholder="value"
                value={pair.v}
                onChange={(e) =>
                  setEnvPairs((p) => p.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEnvPairs((p) => p.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setEnvPairs((p) => [...p, { k: "", v: "" }])}>
            + Add variable
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create agent config"}</Button>
    </form>
  );
}
