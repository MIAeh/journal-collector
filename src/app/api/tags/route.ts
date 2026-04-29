import { NextRequest, NextResponse } from "next/server";
import { listTags } from "@/lib/notion";

export async function GET(request: NextRequest) {
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
