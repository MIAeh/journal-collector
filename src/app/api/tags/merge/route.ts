import { NextRequest, NextResponse } from "next/server";
import { mergeTag } from "@/lib/tag-ops";

export async function POST(request: NextRequest) {
  try {
    const { source, target } = await request.json();
    if (!source || typeof source !== "string" || !source.trim() ||
        !target || typeof target !== "string" || !target.trim()) {
      return NextResponse.json({ error: "source and target are required" }, { status: 400 });
    }
    await mergeTag(source.trim(), target.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error merging tags:", error);
    const message = error instanceof Error ? error.message : "Failed to merge tags";
    const status =
      message === "Source tag not found" || message === "Target tag not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
