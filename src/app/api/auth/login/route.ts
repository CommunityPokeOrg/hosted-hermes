import { NextRequest, NextResponse } from "next/server";
import { LoginInputSchema } from "@/lib/models";
import { getStore } from "@/lib/store";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSession, setSessionCookie } from "@/lib/auth/sessions";
import { errorResponse, parseBody, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await parseBody(req, LoginInputSchema);
    const user = getStore().getUserByEmail(email);
    // Constant-shape response regardless of which check failed.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return jsonError("invalid credentials", 401);
    }
    const { session, maxAge } = createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
    setSessionCookie(res, session.token, maxAge);
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
