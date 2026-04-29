"use client";

import { useState } from "react";

interface ImageWithProxyProps {
  pageId: string;
  directUrl: string | null;
  alt: string;
  className?: string;
  hideOnError?: boolean;
}

function isNotionHosted(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith("notion.so") || hostname.includes("amazonaws.com");
  } catch {
    return false;
  }
}

export default function ImageWithProxy({
  pageId,
  directUrl,
  alt,
  className = "",
  hideOnError = false,
}: ImageWithProxyProps) {
  // For Notion-hosted images, go straight to proxy (they require auth).
  // For external og:image URLs, try the direct URL first — it's faster and
  // avoids Vercel routing through US servers which can trigger CDN blocks.
  const initialSrc = directUrl
    ? isNotionHosted(directUrl)
      ? `/api/image-proxy?url=${encodeURIComponent(directUrl)}`
      : directUrl
    : `/api/image-proxy?pageId=${pageId}`;

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (directUrl && imgSrc === directUrl) {
      // Direct URL failed — try the proxy
      setImgSrc(`/api/image-proxy?url=${encodeURIComponent(directUrl)}`);
    } else if (imgSrc !== `/api/image-proxy?pageId=${pageId}` && pageId) {
      // Proxy with explicit URL failed — try pageId lookup as last resort
      setImgSrc(`/api/image-proxy?pageId=${pageId}`);
    } else {
      setHasError(true);
    }
  };

  if (!directUrl && !pageId) {
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
      src={imgSrc}
      alt={alt}
      className={`${className} object-cover`}
      onError={handleError}
    />
  );
}
