import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ status: "ok", service: "hosted-hermes", time: new Date().toISOString() });
}
