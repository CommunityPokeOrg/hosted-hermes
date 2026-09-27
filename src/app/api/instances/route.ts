import { NextRequest } from "next/server";
import { CreateInstanceInputSchema } from "@/lib/models";
import { requireUser } from "@/lib/auth/sessions";
import { getProvisionService } from "@/lib/provision";
import { getStore } from "@/lib/store";
import { errorResponse, json, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  const service = getProvisionService();
  const instances = await service.syncInstances();
  const store = getStore();
  return json({
    instances: instances.map((i) => ({
      ...i,
      agentConfig: store.getAgentConfig(i.agentConfigId)?.name ?? null,
      stats: store.latestStats(i.id),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
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
