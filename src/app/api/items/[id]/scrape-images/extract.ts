export function extractPageImages(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const addUrl = (raw: string) => {
    if (!raw || raw.startsWith("data:")) return;
    try {
      const absolute = new URL(raw, pageUrl).href;
      if (!seen.has(absolute)) {
        seen.add(absolute);
        results.push(absolute);
      }
    } catch {
      // skip invalid URLs
    }
  };

  // og:image and twitter:image (property="X" content="Y" order)
  const metaRegex = /<meta[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(html)) !== null) addUrl(m[1]);

  // og:image reverse order (content="Y" property="X")
  const metaReverseRegex = /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi;
  while ((m = metaReverseRegex.exec(html)) !== null) addUrl(m[1]);

  // img src
  const imgRegex = /<img[^>]*\ssrc=["']([^"']+)["']/gi;
  while ((m = imgRegex.exec(html)) !== null) addUrl(m[1]);

  return results;
}
