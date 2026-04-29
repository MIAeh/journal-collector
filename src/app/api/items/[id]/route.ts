import { NextRequest, NextResponse } from "next/server";
import { getItem, updateItem, deleteItem } from "@/lib/notion";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItem(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error getting item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, comment, tags, images } = body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (comment !== undefined) {
      if (typeof comment !== "string") {
        return NextResponse.json({ error: "comment must be a string" }, { status: 400 });
      }
      updates.comment = comment;
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
        return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
      }
      updates.tags = tags as string[];
    }

    if (images !== undefined) {
      if (
        !Array.isArray(images) ||
        images.length > 20 ||
        !images.every((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")))
      ) {
        return NextResponse.json(
          { error: "images must be an array of up to 20 http/https URLs" },
          { status: 400 }
        );
      }
      updates.images = images as string[];
    }

    const item = await updateItem(id, updates);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteItem(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete item" },
      { status: 500 }
    );
  }
}
