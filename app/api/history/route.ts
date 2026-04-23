import { NextRequest, NextResponse } from "next/server";
import { getSubmissionsBySession, getSubmissionsBySessionAndProblem } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) {
    return NextResponse.json({ submissions: [] });
  }

  const problemId = request.nextUrl.searchParams.get("problem");
  if (problemId) {
    const submissions = getSubmissionsBySessionAndProblem(sessionId, problemId);
    return NextResponse.json({ submissions });
  }

  const submissions = getSubmissionsBySession(sessionId);
  return NextResponse.json({ submissions });
}
