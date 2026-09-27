import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-100">Hosted Hermes</h1>
        <p className="mb-6 text-sm text-zinc-500">Sign in to manage agent instances</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </Card>
    </main>
  );
}
