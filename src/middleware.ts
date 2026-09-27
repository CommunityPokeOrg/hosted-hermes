import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Edge-safe auth gate: checks for the presence of the session cookie and
 * redirects to /login when missing. Full session validation happens in the
 * dashboard layout and API route handlers (Node.js runtime).
 */
export function middleware(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
