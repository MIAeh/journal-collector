"use client";

import { useState } from "react";

interface ImageWithProxyProps {
  pageId: string;
  directUrl: string | null;
  alt: string;
  className?: string;
  hideOnError?: boolean;
}

export default function ImageWithProxy({
  pageId,
  directUrl,
  alt,
  className = "",
  hideOnError = false,
}: ImageWithProxyProps) {
  // Try the direct URL first — the browser (with VPN) can reach CDN URLs that
  // Vercel's US servers cannot. On error, fall back to the proxy which now
  // does a redirect (so the browser still fetches directly, just via a lookup).
  const initialSrc = directUrl ?? `/api/image-proxy?pageId=${pageId}`;

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (directUrl && imgSrc === directUrl && pageId) {
      // Direct URL failed — use proxy pageId lookup as fallback
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

