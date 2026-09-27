import { NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/auth/apiKeys";
import { getProvisionService } from "@/lib/provision";
import { getStore } from "@/lib/store";
import { errorResponse, json, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!authenticateApiKey(req, ["read"])) return jsonError("unauthorized", 401);
  const { id } = await params;
  const instance = getStore().getInstance(id);
  if (!instance) return jsonError("instance not found", 404);
  return json({ instance, stats: getStore().latestStats(id) });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!authenticateApiKey(req, ["write"])) return jsonError("unauthorized", 401);
  try {
    const { id } = await params;
    await getProvisionService().deleteInstance(id);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
