"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      router.push(params.get("next") ?? "/dashboard");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "login failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="admin@example.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
