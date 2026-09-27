import Link from "next/link";
import { getStore } from "@/lib/store";
import { getProvisionService } from "@/lib/provision";
import { Card, CardTitle, StatusBadge, formatUptime } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const store = getStore();
  const instances = await getProvisionService().syncInstances();
  const running = instances.filter((i) => i.status === "running").length;
  const failed = instances.filter((i) => i.status === "failed").length;
  const agents = store.listAgentConfigs();
  const keys = store.listApiKeys().filter((k) => !k.revokedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-3xl font-semibold text-zinc-100">{instances.length}</p>
          <p className="text-sm text-zinc-500">instances</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-emerald-400">{running}</p>
          <p className="text-sm text-zinc-500">running</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-red-400">{failed}</p>
          <p className="text-sm text-zinc-500">failed</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-zinc-100">{keys.length}</p>
          <p className="text-sm text-zinc-500">active API keys</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Recent instances</CardTitle>
        {instances.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No instances yet. <Link className="text-accent-soft underline" href="/dashboard/instances">Provision one</Link>.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-xs uppercase text-zinc-500">
                <th className="py-2">Name</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Port</th>
                <th>Uptime</th>
              </tr>
            </thead>
            <tbody>
              {instances.slice(0, 8).map((i) => (
                <tr key={i.id} className="border-b border-ink-800">
                  <td className="py-2">
                    <Link href={`/dashboard/instances/${i.id}`} className="text-accent-soft hover:underline">
                      {i.name}
                    </Link>
                  </td>
                  <td className="text-zinc-400">{store.getAgentConfig(i.agentConfigId)?.name ?? "—"}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td className="font-mono text-zinc-400">{i.hostPort ?? "—"}</td>
                  <td className="text-zinc-400">{formatUptime(i.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardTitle>Agent configs</CardTitle>
        {agents.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No agent configs yet. <Link className="text-accent-soft underline" href="/dashboard/agents">Create one</Link> before provisioning.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {agents.slice(0, 6).map((a) => (
              <li key={a.id} className="flex justify-between">
                <span className="text-zinc-300">{a.name}</span>
                <span className="font-mono text-xs text-zinc-500">{a.model}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
