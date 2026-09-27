import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { AgentConfigInputSchema } from "@/lib/models";
import { requireUser } from "@/lib/auth/sessions";
import { getStore } from "@/lib/store";
import { errorResponse, json, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  return json({ agents: getStore().listAgentConfigs() });
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const input = await parseBody(req, AgentConfigInputSchema);
    const agent = getStore().createAgentConfig({ id: randomUUID(), ...input });
    return json({ agent }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
