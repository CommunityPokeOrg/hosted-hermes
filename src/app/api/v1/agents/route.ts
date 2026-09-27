import { NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/auth/apiKeys";
import { getStore } from "@/lib/store";
import { json, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!authenticateApiKey(req, ["read"])) return jsonError("unauthorized", 401);
  return json({ agents: getStore().listAgentConfigs() });
}
