"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "./ui";

const SCOPES = ["read", "write", "admin"] as const;

export function KeyCreateForm() {
  const router = useRouter();
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), scopes }),
    });
    if (res.ok) {
      const body = await res.json();
      setCreated(body.plaintext);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed to create key");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label="Key name">
          <Input name="name" required placeholder="ci-pipeline" />
        </Field>
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">Scopes</span>
          <div className="flex gap-2">
            {SCOPES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() =>
                  setScopes((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  scopes.includes(s)
                    ? "border-accent bg-accent/20 text-accent-soft"
                    : "border-ink-600 text-zinc-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit">Create key</Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {created && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="mb-1 text-xs text-emerald-400">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-sm text-emerald-200">{created}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(created);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RevokeKeyButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="danger"
      onClick={async () => {
        if (!confirm("Revoke this API key? Clients using it will lose access immediately.")) return;
        await fetch(`/api/keys/${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Revoke
    </Button>
  );
}
