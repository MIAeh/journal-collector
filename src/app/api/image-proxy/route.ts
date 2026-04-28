import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { getImageUrl } from "@/lib/notion";

export async function GET(request: NextRequest) {
  const authError = await validateAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json(
        { error: "pageId query parameter is required" },
        { status: 400 }
      );
    }

    const imageUrl = await getImageUrl(pageId);

    if (!imageUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.redirect(imageUrl, {
      headers: {
        "Cache-Control": "public, max-age=3300",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to proxy image" },
      { status: 500 }
    );
  }
}
