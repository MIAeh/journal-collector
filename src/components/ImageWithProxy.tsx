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
  // Upgrade http:// → https:// to prevent mixed-content blocks (app is HTTPS).
  const secureUrl = directUrl
    ? directUrl.replace(/^http:\/\//i, "https://")
    : null;

  const initialSrc = secureUrl ?? `/api/image-proxy?pageId=${pageId}`;

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (secureUrl && imgSrc === secureUrl && pageId) {
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

