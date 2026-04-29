import { NextRequest, NextResponse } from "next/server";
import { getItem, updateItem } from "@/lib/notion";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const item = await getItem(id);

    if (!item.url) {
      return NextResponse.json({ error: "Item has no URL" }, { status: 400 });
    }

    // Fetch the source page — hard timeout 10s
    let html: string;
    let ok: boolean;
    try {
      const response = await fetch(item.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)",
          "Accept": "text/html,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });
      ok = response.ok;
      html = ok ? await response.text() : "";
    } catch {
      // Network error, DNS failure, timeout — keep current content
      return NextResponse.json({ item, synced: false, reason: "unreachable" });
    }

    if (!ok) {
      // 404, 410, etc. — URL gone, keep current content
      return NextResponse.json({ item, synced: false, reason: "gone" });
    }

    // Extract updated title
    const newTitle =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTagContent(html, "title") ||
      null;

    // Extract updated images — only og/twitter meta tags (reliably public)
    const newImages = extractMetaImages(html, item.url);

    // Build updates — only overwrite if we got something meaningful
    const updates: { title?: string; images?: string[] } = {};
    if (newTitle && newTitle.trim()) updates.title = newTitle.trim();
    if (newImages.length > 0) updates.images = newImages;

    if (Object.keys(updates).length === 0) {
      // Page loaded but yielded nothing useful — keep current
      return NextResponse.json({ item, synced: false, reason: "no_content" });
    }

    const updated = await updateItem(id, updates);
    return NextResponse.json({ item: updated, synced: true });
  } catch (error) {
    console.error("Error syncing item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync" },
      { status: 500 }
    );
  }
}

function extractMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return m[1];
  const reRev = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    "i"
  );
  const mRev = html.match(reRev);
  return mRev ? mRev[1] : null;
}

function extractTagContent(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractMetaImages(html: string, pageUrl: string): string[] {
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
