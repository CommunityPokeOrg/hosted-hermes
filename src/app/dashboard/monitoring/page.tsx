import { getStore } from "@/lib/store";
import { getProvisionService } from "@/lib/provision";
import { Card, CardTitle, EmptyState } from "@/components/ui";
import { MonitoringTable } from "@/components/MonitoringTable";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const store = getStore();
  const instances = await getProvisionService().syncInstances();
  const rows = instances.map((i) => ({
    id: i.id,
    name: i.name,
    status: i.status,
    hostPort: i.hostPort,
    startedAt: i.startedAt,
    agentConfig: store.getAgentConfig(i.agentConfigId)?.name ?? null,
    stats: store.latestStats(i.id),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Monitoring</h1>
      <p className="text-sm text-zinc-500">
        Live fleet view — refreshes every 5 seconds.
      </p>
      {rows.length === 0 ? (
        <EmptyState>No instances to monitor.</EmptyState>
      ) : (
        <Card>
          <CardTitle>Fleet</CardTitle>
          <MonitoringTable initial={rows} />
        </Card>
      )}
    </div>
  );
}
