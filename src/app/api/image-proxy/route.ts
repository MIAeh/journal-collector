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

    // Upgrade http:// → https:// to avoid mixed-content blocks in the browser.
    const secureUrl = imageUrl.replace(/^http:\/\//i, "https://");

    // Fetch the image server-side so the CDN never sees the browser's Referer.
    // Some CDNs (e.g. XHS) block requests whose Referer is not their own domain.
    const upstream = await fetch(secureUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
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
