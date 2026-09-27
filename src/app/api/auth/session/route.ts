import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/sessions";
import { getStore } from "@/lib/store";
import { json, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  const user = session ? getStore().getUser(session.userId) : null;
  if (!user) return jsonError("unauthorized", 401);
  return json({
    user: { id: user.id, email: user.email, role: user.role },
    expiresAt: session!.expiresAt,
  });
}
