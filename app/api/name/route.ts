import { NextRequest, NextResponse } from "next/server";
import { updateStudentName } from "@/lib/db";
import { anonymousName } from "@/lib/anonymousName";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 400 });
  }
  return NextResponse.json({ name: anonymousName(sessionId) });
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 400 });
  }

  const { name } = await request.json();
  const displayName = typeof name === "string" && name.trim()
    ? name.trim()
    : anonymousName(sessionId);

  updateStudentName(sessionId, displayName);
  return NextResponse.json({ ok: true });
}
