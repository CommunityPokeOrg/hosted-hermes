import { NextRequest } from "next/server";
import { CreateApiKeyInputSchema } from "@/lib/models";
import { requireUser } from "@/lib/auth/sessions";
import { createApiKey } from "@/lib/auth/apiKeys";
import { getStore } from "@/lib/store";
import { errorResponse, json, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

function redact(key: ReturnType<ReturnType<typeof getStore>["listApiKeys"]>[number]) {
  const { hash: _hash, ...rest } = key;
  return rest;
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  return json({ keys: getStore().listApiKeys().map(redact) });
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("response" in auth) return auth.response;
  try {
    const input = await parseBody(req, CreateApiKeyInputSchema);
    const { apiKey, plaintext } = createApiKey(input.name, input.scopes, auth.user.id);
    // The plaintext key is returned exactly once — it is never stored.
    return json({ key: redact(apiKey), plaintext }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
