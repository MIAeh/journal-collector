import { NextRequest, NextResponse } from "next/server";
import { listTags } from "@/lib/notion";
import { createTag } from "@/lib/tag-ops";

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

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    await createTag(name.trim());
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tag";
    const status = message === "Tag already exists" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
