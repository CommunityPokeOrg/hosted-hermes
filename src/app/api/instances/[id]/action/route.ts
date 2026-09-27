import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/sessions";
import { getProvisionService } from "@/lib/provision";
import { errorResponse, json, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({ action: z.enum(["start", "stop", "restart"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const { action } = await parseBody(req, ActionSchema);
    const instance = await getProvisionService().performAction(id, action);
    return json({ instance });
  } catch (err) {
    return errorResponse(err);
  }
}
