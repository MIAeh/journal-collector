import { NextRequest, NextResponse } from "next/server";
import { getImageUrl } from "@/lib/notion";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const pageId = searchParams.get("pageId");

    let imageUrl: string | null = null;

    if (url) {
      imageUrl = url;
    } else if (pageId) {
      imageUrl = await getImageUrl(pageId);
    } else {
      return NextResponse.json(
        { error: "url or pageId query parameter is required" },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    return new NextResponse(imageResponse.body, {
      headers: {
        "Content-Type": contentType,
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
