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
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
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
            {item.tags[0] && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                #{item.tags[0]}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Compact horizontal row for items with no image
  const domain = extractDomain(item.url);
  const timeAgo = getTimeAgo(item.createdAt);

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3 p-4 bg-white border-b hover:bg-gray-50 transition-colors"
    >
      <ImageWithProxy
        pageId={item.id}
        directUrl={null}
        alt={item.title}
        className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {domain} · {timeAgo}
        </p>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <svg
        className="hidden md:block w-5 h-5 text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
}
