import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/sessions";
import { getProvisionService } from "@/lib/provision";
import { getStore } from "@/lib/store";
import { errorResponse, json, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    if (!getStore().getInstance(id)) return jsonError("instance not found", 404);
    await getProvisionService().syncInstances();
    const stats = await getProvisionService().getStats(id, 120);
    return json({ stats, latest: stats.at(-1) ?? null });
  } catch (err) {
    return errorResponse(err);
  }
}
