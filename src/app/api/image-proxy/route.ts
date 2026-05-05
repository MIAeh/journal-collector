import { NextRequest, NextResponse } from "next/server";
import { getImageUrl } from "@/lib/notion";

/** Notion-hosted file URLs are signed S3 links that expire in ~1 hour. */
function isNotionFileUrl(url: string): boolean {
  return (
    url.includes("prod-files-secure.s3") ||
    url.includes("secure.notion-static.com") ||
    url.includes("s3.us-west-2.amazonaws.com/secure.notion")
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url    = searchParams.get("url");
    const pageId = searchParams.get("pageId");
    const index  = parseInt(searchParams.get("index") ?? "0", 10) || 0;

    let imageUrl: string | null = null;

    if (url && !isNotionFileUrl(url)) {
      // Stable external URL (Vercel Blob, etc.) — use directly.
      imageUrl = url;
    } else if (pageId) {
      // Notion-hosted file or explicit pageId lookup — always re-fetch a fresh
      // signed URL from Notion so we never serve an expired link.
      imageUrl = await getImageUrl(pageId, index);
    } else if (url) {
      // url was provided but it's a Notion S3 link with no pageId — try direct
      // (may still work if recently signed).
      imageUrl = url;
    } else {
      return NextResponse.json(
        { error: "url or pageId query parameter is required" },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Upgrade http:// → https://
    const secureUrl = imageUrl.replace(/^http:\/\//i, "https://");

    const upstream = await fetch(secureUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)" },
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
        // Notion signed URLs expire in ~1h; cache for 55 min.
        // Stable Blob URLs can be cached longer but 55 min is safe for both.
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
