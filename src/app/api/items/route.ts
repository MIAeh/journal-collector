import { NextRequest, NextResponse } from "next/server";
import { listItems } from "@/lib/notion";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listItems({ cursor, tag, search });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list items" },
      { status: 500 }
    );
  }
}
