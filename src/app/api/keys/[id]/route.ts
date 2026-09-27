import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/sessions";
import { getStore } from "@/lib/store";
import { errorResponse, json, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const key = getStore().revokeApiKey(id);
    if (!key) return jsonError("api key not found", 404);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
