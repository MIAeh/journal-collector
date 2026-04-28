export async function fetchOgData(url: string): Promise<{ title: string; imageUrl: string | null }> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();

    const title = extractMeta(html, "og:title")
      || extractMeta(html, "twitter:title")
      || extractTagContent(html, "title")
      || "Untitled";

    const imageUrl = extractMeta(html, "og:image")
      || extractMeta(html, "twitter:image")
      || null;

    return { title, imageUrl };
  } catch {
    return { title: "Untitled", imageUrl: null };
  }
}

function extractMeta(html: string, property: string): string | null {
  // Try property="X" content="Y" order
  const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i");
  const match = html.match(regex);
  if (match) return match[1];
  // Try content="Y" property="X" order
  const regexReverse = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i");
  const matchReverse = html.match(regexReverse);
  return matchReverse ? matchReverse[1] : null;
}

function extractTagContent(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}
