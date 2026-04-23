import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get("session_id")) {
    const sessionId = crypto.randomUUID();
    response.cookies.set("session_id", sessionId, {
      path: "/",
      httpOnly: false, // Client needs to read it for the history page
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}
