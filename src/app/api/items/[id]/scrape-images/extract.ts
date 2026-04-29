// Patterns to skip — clearly non-content images
const SKIP_PATTERNS = [
  /\.(ico|svg|gif)(\?|$)/i,         // icons, vectors, GIFs (usually UI)
  /\/(favicon|logo|icon|sprite|pixel|beacon|track|blank)\b/i,
  /[?&](w=1|h=1|width=1|height=1)\b/i,  // 1px tracking pixels via query
  /\/1x1\b/i,
];

export function extractPageImages(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const addUrl = (raw: string) => {
    if (!raw || raw.startsWith("data:")) return;
    if (SKIP_PATTERNS.some((re) => re.test(raw))) return;
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

  // img src + lazy-load variants
  const imgRegex = /<img[^>]*>/gi;
  while ((m = imgRegex.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch =
      tag.match(/\bdata-lazy-src=["']([^"']+)["']/) ||
      tag.match(/\bdata-src=["']([^"']+)["']/) ||
      tag.match(/\bdata-original=["']([^"']+)["']/) ||
      tag.match(/\bsrc=["']([^"']+)["']/);
    if (srcMatch) addUrl(srcMatch[1]);
  }

  return results;
}
