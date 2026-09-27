import { NextRequest } from "next/server";
import { AgentConfigPatchSchema } from "@/lib/models";
import { requireUser } from "@/lib/auth/sessions";
import { getStore } from "@/lib/store";
import { errorResponse, json, jsonError, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const agent = getStore().getAgentConfig(id);
  if (!agent) return jsonError("agent config not found", 404);
  return json({ agent });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const input = await parseBody(req, AgentConfigPatchSchema);
    const agent = getStore().updateAgentConfig(id, input);
    if (!agent) return jsonError("agent config not found", 404);
    return json({ agent });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const removed = getStore().deleteAgentConfig(id);
    if (!removed) return jsonError("agent config not found", 404);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
