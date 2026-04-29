"use client";

import Link from "next/link";
import { CollectionItem } from "@/lib/types";
import ImageWithProxy from "./ImageWithProxy";

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
  return `${Math.floor(secondsAgo / 604800)}w ago`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

interface ItemCardProps {
  item: CollectionItem;
}

export default function ItemCard({ item }: ItemCardProps) {
  const primaryImage = item.images[0] ?? null;

  if (primaryImage) {
    return (
      <Link
        href={`/items/${item.id}`}
        className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="aspect-[3/4] w-full overflow-hidden bg-gray-100">
          <ImageWithProxy
            pageId={item.id}
            directUrl={primaryImage}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
            {item.title}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">
              {extractDomain(item.url)} · {getTimeAgo(item.createdAt)}
            </span>
            {item.tags.length > 0 && (
              <span className="inline-block bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">
                {item.tags[0]}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Compact card for items with no image
  return (
    <Link
      href={`/items/${item.id}`}
      className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow p-3"
    >
      <h3 className="text-sm font-medium text-gray-900 line-clamp-3 mb-2">
        {item.title}
      </h3>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-gray-500 truncate">
          {extractDomain(item.url)} · {getTimeAgo(item.createdAt)}
        </span>
        {item.tags.length > 0 && (
          <span className="inline-block bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded shrink-0">
            {item.tags[0]}
          </span>
        )}
      </div>
    </Link>
  );
}
