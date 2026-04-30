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
  // Always route through the server-side proxy so CDN hotlink protection
  // (e.g. XHS returning 403 when Referer is our domain) is bypassed.
  // Pass the stored URL as ?url= so the proxy can fetch it directly;
  // fall back to ?pageId= lookup if no directUrl is available.
  const proxySrc = directUrl
    ? `/api/image-proxy?url=${encodeURIComponent(directUrl)}`
    : pageId
    ? `/api/image-proxy?pageId=${pageId}`
    : null;

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

