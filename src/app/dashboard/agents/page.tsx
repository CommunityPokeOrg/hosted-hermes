import { getStore } from "@/lib/store";
import { Card, CardTitle, EmptyState } from "@/components/ui";
import { AgentForm } from "@/components/AgentForm";
import { DeleteAgentButton } from "@/components/DeleteAgentButton";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = getStore().listAgentConfigs();
  const instances = getStore().listInstances();
  const usage = new Map<string, number>();
  for (const i of instances) usage.set(i.agentConfigId, (usage.get(i.agentConfigId) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Agent configs</h1>
      <p className="text-sm text-zinc-500">
        Reusable templates describing model, prompt, tools, environment and resource limits
        for provisioned instances.
      </p>

      <Card>
        <CardTitle>New agent config</CardTitle>
        <AgentForm />
      </Card>

      {agents.length === 0 ? (
        <EmptyState>No agent configs yet.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {agents.map((a) => (
            <Card key={a.id}>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100">{a.name}</h3>
                  <p className="font-mono text-xs text-zinc-500">{a.model}</p>
                </div>
                <DeleteAgentButton id={a.id} />
              </div>
              {a.systemPrompt && (
                <p className="mb-2 line-clamp-2 text-sm text-zinc-400">{a.systemPrompt}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {a.tools.map((t) => (
                  <span key={t} className="rounded-full bg-ink-700 px-2 py-0.5 text-xs text-zinc-400">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {a.resources.cpus} CPU · {a.resources.memoryMb} MB · {usage.get(a.id) ?? 0} instance(s)
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
