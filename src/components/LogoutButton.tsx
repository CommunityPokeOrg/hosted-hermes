"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
