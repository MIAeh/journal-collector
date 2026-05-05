import { NextRequest, NextResponse } from "next/server";
import { saveItem, updateItem } from "@/lib/notion";
import { mirrorImage } from "@/lib/mirror-image";

export async function POST(request: NextRequest) {
  const expectedKey = process.env.SAVE_API_KEY;
  const apiKey =
    request.headers.get("x-api-key") ??
    request.nextUrl.searchParams.get("key");
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // iOS Shortcut sends raw body (URL or XHS share text); web app sends JSON
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let url: string | undefined;
  let title: string | undefined;
  let images: string[] = [];
  let tags: string[] = [];
  let comment: string | undefined;

  if (!isJson) {
    // Raw text body from iOS Shortcut — extract first URL
    const raw = await request.text();
    url = extractFirstUrl(raw.trim());
  } else {
    try {
      const body = await request.json();
      ({ url, title, images, tags, comment } = body);
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  try {
    const hasContent =
      url || title?.trim() || comment?.trim() || tags?.length || images?.length;
    if (!hasContent) {
      return NextResponse.json(
        { error: "At least one field is required" },
        { status: 400 }
      );
    }

    let finalTitle: string | undefined =
      typeof title === "string" && title.trim() ? title.trim() : undefined;
    let finalImages: string[] =
      Array.isArray(images) && images.every((x) => typeof x === "string")
        ? (images as string[])
        : [];

    // Only fetch HTML if a URL was provided
    let html: string | null = null;
    if (url) {
      try {
        const pageResponse = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        html = await pageResponse.text();
      } catch {
        // continue without HTML
      }

      if (!finalTitle) {
        finalTitle = html ? extractTitle(html) || url : url;
      }

      if (finalImages.length === 0 && html) {
        // Only keep the primary (first) og/twitter image
        const found = extractMetaImages(html, url);
        if (found.length > 0) finalImages = [found[0]];
      }
    }

    // Mirror external images to Vercel Blob so URLs never expire.
    // User-uploaded images (from /api/upload) are already on Blob — skip those.
    finalImages = await Promise.all(
      finalImages.map((u) =>
        u.includes("vercel-storage.com") ? Promise.resolve(u) : mirrorImage(u)
      )
    );

    const item = await saveItem({
      url: url ?? "",
      title: finalTitle,
      images: finalImages,
      tags: tags || [],
      comment: comment || undefined,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error saving item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save item" },
      { status: 500 }
    );
  }
}

function extractMetaImages(html: string, pageUrl: string): string[] {
  // Only use og:image / twitter:image — these are explicitly intended for public sharing
  // and reliably accessible without cookies, sessions, or geo-restrictions.
  const seen = new Set<string>();
  const results: string[] = [];

  const add = (raw: string) => {
    if (!raw) return;
    try {
      const abs = new URL(raw, pageUrl).href.replace(/^http:\/\//i, "https://");
      if (!seen.has(abs)) { seen.add(abs); results.push(abs); }
    } catch { /* skip */ }
  };

  const patterns = [
    /<meta[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) add(m[1]);
  }

  return results;
}

function extractFirstUrl(input: string): string {
  const match = input.match(/https?:\/\/[^\s）】\]"']+/);
  return match ? match[0] : input;
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']og:title["']/i);
  if (og?.[1]) return og[1];
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return title?.[1]?.trim() || null;
}
