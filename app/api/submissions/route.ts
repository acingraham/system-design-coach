import { NextRequest, NextResponse } from "next/server";
import { getSubmissions } from "@/lib/db";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since") ?? undefined;
  const submissions = getSubmissions(since);
  return NextResponse.json({ submissions });
}
