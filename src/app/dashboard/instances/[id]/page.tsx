import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { getProvisionService } from "@/lib/provision";
import { Card, CardTitle, StatusBadge, formatUptime } from "@/components/ui";
import { InstanceActions } from "@/components/InstanceActions";
import { StatsPanel } from "@/components/StatsPanel";
import { LogsViewer } from "@/components/LogsViewer";

export const dynamic = "force-dynamic";

export default async function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const instance = store.getInstance(id);
  if (!instance) notFound();
  await getProvisionService().syncInstances();
  const fresh = store.getInstance(id)!;
  const agent = store.getAgentConfig(fresh.agentConfigId);
  const latest = store.latestStats(id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/instances" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Instances
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-zinc-100">
            {fresh.name} <StatusBadge status={fresh.status} />
          </h1>
          <InstanceActions id={fresh.id} status={fresh.status} />
        </div>
        {fresh.error && <p className="mt-2 text-sm text-red-400">{fresh.error}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Details</CardTitle>
          <dl className="space-y-2 text-sm">
            <Row k="Instance ID" v={fresh.id} mono />
            <Row k="Container ID" v={fresh.containerId ?? "—"} mono />
            <Row k="Host port" v={fresh.hostPort ? String(fresh.hostPort) : "—"} mono />
            <Row k="Agent config" v={agent?.name ?? "—"} />
            <Row k="Model" v={agent?.model ?? "—"} mono />
            <Row k="Image" v={agent?.image ?? "default"} mono />
            <Row k="Resources" v={agent ? `${agent.resources.cpus} CPU / ${agent.resources.memoryMb} MB` : "—"} />
            <Row k="Uptime" v={formatUptime(fresh.startedAt)} />
            <Row k="Created" v={new Date(fresh.createdAt).toLocaleString()} />
          </dl>
        </Card>
        <Card>
          <CardTitle>Monitoring</CardTitle>
          <StatsPanel instanceId={fresh.id} initial={latest} />
        </Card>
      </div>

      <Card>
        <CardTitle>Logs</CardTitle>
        <LogsViewer instanceId={fresh.id} />
      </Card>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{k}</dt>
      <dd className={`truncate text-right text-zinc-300 ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
