import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { listTags } from "@/lib/notion";

export async function GET(request: NextRequest) {
  const authError = await validateAuth(request);
  if (authError) return authError;

  try {
    const tags = await listTags();

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error listing tags:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list tags" },
      { status: 500 }
    );
  }
}
