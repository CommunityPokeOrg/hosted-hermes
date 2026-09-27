import { getStore } from "@/lib/store";
import { Card, CardTitle, EmptyState } from "@/components/ui";
import { KeyCreateForm, RevokeKeyButton } from "@/components/KeyManager";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const keys = getStore().listApiKeys();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">API keys</h1>
      <p className="text-sm text-zinc-500">
        Keys authenticate the external <code className="font-mono text-zinc-400">/api/v1</code>{" "}
        provisioning API via <code className="font-mono text-zinc-400">Authorization: Bearer hhk_…</code>.
      </p>

      <Card>
        <CardTitle>Create key</CardTitle>
        <KeyCreateForm />
      </Card>

      {keys.length === 0 ? (
        <EmptyState>No API keys yet.</EmptyState>
      ) : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-xs uppercase text-zinc-500">
                <th className="py-2">Name</th>
                <th>Prefix</th>
                <th>Scopes</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-ink-800">
                  <td className="py-2.5 text-zinc-200">{k.name}</td>
                  <td className="font-mono text-xs text-zinc-400">{k.prefix}…</td>
                  <td className="text-zinc-400">{k.scopes.join(", ")}</td>
                  <td className="text-zinc-500">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="text-zinc-500">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}
                  </td>
                  <td>
                    {k.revokedAt ? (
                      <span className="text-xs text-red-400">revoked</span>
                    ) : (
                      <span className="text-xs text-emerald-400">active</span>
                    )}
                  </td>
                  <td>{!k.revokedAt && <RevokeKeyButton id={k.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
