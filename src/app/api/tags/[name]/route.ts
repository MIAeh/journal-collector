import { NextRequest, NextResponse } from "next/server";
import { renameTag, deleteTag } from "@/lib/tag-ops";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { newName } = await request.json();
    if (!newName || typeof newName !== "string" || !newName.trim()) {
      return NextResponse.json({ error: "newName is required" }, { status: 400 });
    }
    await renameTag(decodeURIComponent(name), newName.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error renaming tag:", error);
    const message = error instanceof Error ? error.message : "Failed to rename tag";
    let status = 500;
    if (message === "Tag not found") status = 404;
    else if (message === "Tag already exists") status = 409;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    await deleteTag(decodeURIComponent(name));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    const message = error instanceof Error ? error.message : "Failed to delete tag";
    const status = message === "Tag not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
