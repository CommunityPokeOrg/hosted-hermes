import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/sessions";
import { getProvisionService } from "@/lib/provision";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const tail = Math.min(Number(req.nextUrl.searchParams.get("tail") ?? 200), 2000);
    const logs = await getProvisionService().getLogs(id, tail);
    return json({ logs });
  } catch (err) {
    return errorResponse(err);
  }
}
