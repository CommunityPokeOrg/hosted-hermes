import Link from "next/link";
import { getStore } from "@/lib/store";
import { getProvisionService } from "@/lib/provision";
import { Card, CardTitle, EmptyState, StatusBadge, formatUptime } from "@/components/ui";
import { CreateInstanceForm } from "@/components/CreateInstanceForm";
import { InstanceActions } from "@/components/InstanceActions";

export const dynamic = "force-dynamic";

export default async function InstancesPage() {
  const store = getStore();
  const instances = await getProvisionService().syncInstances();
  const agents = store.listAgentConfigs();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Instances</h1>

      <Card>
        <CardTitle>Provision new instance</CardTitle>
        <CreateInstanceForm agents={agents.map((a) => ({ id: a.id, name: a.name }))} />
      </Card>

      {instances.length === 0 ? (
        <EmptyState>No instances provisioned yet.</EmptyState>
      ) : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-xs uppercase text-zinc-500">
                <th className="py-2">Name</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Port</th>
                <th>Uptime</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {instances.map((i) => (
                <tr key={i.id} className="border-b border-ink-800">
                  <td className="py-2.5">
                    <Link href={`/dashboard/instances/${i.id}`} className="text-accent-soft hover:underline">
                      {i.name}
                    </Link>
                    {i.error && <p className="mt-0.5 text-xs text-red-400">{i.error}</p>}
                  </td>
                  <td className="text-zinc-400">{store.getAgentConfig(i.agentConfigId)?.name ?? "—"}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td className="font-mono text-zinc-400">{i.hostPort ?? "—"}</td>
                  <td className="text-zinc-400">{formatUptime(i.startedAt)}</td>
                  <td className="text-zinc-500">{new Date(i.createdAt).toLocaleString()}</td>
                  <td><InstanceActions id={i.id} status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
