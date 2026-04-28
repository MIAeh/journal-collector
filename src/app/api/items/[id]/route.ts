import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { getItem, updateItem, deleteItem } from "@/lib/notion";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateAuth(request);
  if (authError) return authError;

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
  const authError = await validateAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    const item = await updateItem(id, body);

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
  const authError = await validateAuth(request);
  if (authError) return authError;

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
