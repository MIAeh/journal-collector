"use client";

import { useState } from "react";

interface ImageWithProxyProps {
  pageId: string;
  directUrl: string | null;
  alt: string;
  className?: string;
}

export default function ImageWithProxy({
  pageId,
  directUrl,
  alt,
  className = "",
}: ImageWithProxyProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(directUrl);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc === directUrl && pageId) {
      setImgSrc(`/api/image-proxy?pageId=${pageId}`);
    } else {
      setHasError(true);
    }
  };

  if (!directUrl && !pageId) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center text-gray-400 text-xs`}
      >
        No image
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center text-gray-400 text-xs`}
      >
        No image
      </div>
    );
  }

  return (
    <img
      src={imgSrc || `/api/image-proxy?pageId=${pageId}`}
      alt={alt}
      className={`${className} object-cover`}
      onError={handleError}
    />
  );
}
