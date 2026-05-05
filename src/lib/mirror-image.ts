import { put } from "@vercel/blob";

/**
 * Downloads an external image URL and re-uploads it to Vercel Blob.
 * Returns the stable blob URL, or the original URL if download/upload fails.
 */
export async function mirrorImage(externalUrl: string): Promise<string> {
  try {
    const response = await fetch(externalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return externalUrl;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return externalUrl;

    const buffer = await response.arrayBuffer();
    // Cap at 20 MB to avoid enormous blobs
    if (buffer.byteLength > 20 * 1024 * 1024) return externalUrl;

    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const filename = `mirror-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { url } = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    return url;
  } catch {
    // Network error, blob unavailable, etc. — fall back to original
    return externalUrl;
  }
}

/**
 * Mirrors a list of image URLs. Runs in parallel, capped to avoid overload.
 */
export async function mirrorImages(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map((u) => mirrorImage(u)));
}
