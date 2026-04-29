import { NextRequest, NextResponse } from "next/server";
import { saveItem, updateItem } from "@/lib/notion";
import { fetchOgData } from "@/lib/og";
import { extractPageImages } from "@/app/api/items/[id]/scrape-images/extract";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.SAVE_API_KEY;
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, title, images, tags, comment } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    let finalTitle: string | undefined =
      typeof title === "string" && title.trim() ? title.trim() : undefined;
    let finalImages: string[] =
      Array.isArray(images) && images.every((x) => typeof x === "string")
        ? (images as string[])
        : [];

    // Fetch page HTML once — use for both OG data and image extraction
    let html: string | null = null;
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
      finalImages = extractMetaImages(html, url);
    }

    const item = await saveItem({
      url,
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
      const abs = new URL(raw, pageUrl).href;
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

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']og:title["']/i);
  if (og?.[1]) return og[1];
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return title?.[1]?.trim() || null;
}
