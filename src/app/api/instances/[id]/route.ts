import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/sessions";
import { getProvisionService } from "@/lib/provision";
import { getStore } from "@/lib/store";
import { errorResponse, json, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const instance = getStore().getInstance(id);
  if (!instance) return jsonError("instance not found", 404);
  const store = getStore();
  return json({
    instance,
    agentConfig: store.getAgentConfig(instance.agentConfigId),
    stats: store.recentStats(id, 120),
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    await getProvisionService().deleteInstance(id);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
