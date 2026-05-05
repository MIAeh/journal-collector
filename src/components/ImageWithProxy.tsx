"use client";

import { useState } from "react";

interface ImageWithProxyProps {
  pageId: string;
  directUrl: string | null;
  /** Position of this image in the item's images array (for multi-image Notion pages). */
  imageIndex?: number;
  alt: string;
  className?: string;
  hideOnError?: boolean;
}

/** Notion-hosted file URLs (signed S3) expire in ~1 hour. */
function isNotionFileUrl(url: string): boolean {
  return (
    url.includes("prod-files-secure.s3") ||
    url.includes("secure.notion-static.com") ||
    url.includes("s3.us-west-2.amazonaws.com/secure.notion")
  );
}

export default function ImageWithProxy({
  pageId,
  directUrl,
  imageIndex = 0,
  alt,
  className = "",
  hideOnError = false,
}: ImageWithProxyProps) {
  // For Notion-hosted files: always route through pageId+index so the proxy
  // fetches a fresh signed URL from Notion — stored S3 URLs expire in ~1 hour.
  // For stable URLs (Vercel Blob, etc.): pass the URL directly to the proxy.
  let proxySrc: string | null = null;
  if (directUrl && !isNotionFileUrl(directUrl)) {
    proxySrc = `/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
  } else if (pageId) {
    proxySrc = `/api/image-proxy?pageId=${encodeURIComponent(pageId)}&index=${imageIndex}`;
  }

  const [hasError, setHasError] = useState(false);

  if (!proxySrc) {
    if (hideOnError) return null;
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-400 text-xs`}>
        No image
      </div>
    );
  }

  if (hasError) {
    if (hideOnError) return null;
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-400 text-xs`}>
        No image
      </div>
    );
  }

  return (
    <img
      src={proxySrc}
      alt={alt}
      className={`${className} object-cover`}
      onError={() => setHasError(true)}
    />
  );
}
