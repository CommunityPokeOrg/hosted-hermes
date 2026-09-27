import { NextRequest } from "next/server";
import { CreateInstanceInputSchema } from "@/lib/models";
import { authenticateApiKey } from "@/lib/auth/apiKeys";
import { getProvisionService } from "@/lib/provision";
import { getStore } from "@/lib/store";
import { errorResponse, json, jsonError, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * External provisioning API — authenticated with `Authorization: Bearer hhk_...`.
 * Scopes: `read` for GET, `write` for POST.
 */
export async function GET(req: NextRequest) {
  if (!authenticateApiKey(req, ["read"])) return jsonError("unauthorized", 401);
  const instances = getStore().listInstances();
  return json({ instances });
}

export async function POST(req: NextRequest) {
  if (!authenticateApiKey(req, ["write"])) return jsonError("unauthorized", 401);
  try {
    const input = await parseBody(req, CreateInstanceInputSchema);
    const instance = await getProvisionService().createInstance(
      input.name,
      input.agentConfigId,
    );
    return json({ instance }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
