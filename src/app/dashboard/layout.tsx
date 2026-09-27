import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/sessions";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/instances", label: "Instances" },
  { href: "/dashboard/monitoring", label: "Monitoring" },
  { href: "/dashboard/agents", label: "Agents" },
  { href: "/dashboard/keys", label: "API Keys" },
];

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-ink-700 bg-ink-900 p-4">
        <Link href="/dashboard" className="mb-8 block px-2">
          <span className="text-lg font-semibold text-zinc-100">Hosted Hermes</span>
          <span className="block text-xs text-zinc-500">agent platform</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-ink-700 hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-700 pt-3">
          <p className="px-2 text-xs text-zinc-500">{user.email}</p>
          <p className="mb-2 px-2 text-xs text-zinc-600">{user.role}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
