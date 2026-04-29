"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import TagChips from "@/components/TagChips";
import ItemCard from "@/components/ItemCard";
import type { CollectionItem, TagWithCount, PaginatedResponse } from "@/lib/types";
import { ITEMS_CACHE_KEY, TAGS_CACHE_KEY } from "@/lib/cache";

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[3/4] w-full bg-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");

  const [allItems, setAllItems] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Track whether this is first mount so we skip the search re-fetch
  const initialised = useRef(false);

  // Derived: filter allItems by activeTag + search client-side
  const visibleItems = allItems.filter((item) => {
    const matchesTag = !activeTag || item.tags.includes(activeTag);
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.url.toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  useEffect(() => {
    // Load tags from cache first, then refresh
    const cachedTags = readCache<TagWithCount[]>(TAGS_CACHE_KEY);
    if (cachedTags) setTags(cachedTags);

    // Load items from cache first
    const cachedItems = readCache<CollectionItem[]>(ITEMS_CACHE_KEY);
    if (cachedItems) {
      setAllItems(cachedItems);
      initialised.current = true;
    } else {
      // No cache — must fetch
      fetchItems(true);
    }

    fetchTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data: TagWithCount[] = await response.json();
        setTags(data);
        writeCache(TAGS_CACHE_KEY, data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const fetchItems = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!reset && cursor) params.append("cursor", cursor);

      const response = await fetch(`/api/items?${params.toString()}`);
      if (response.ok) {
        const data: PaginatedResponse<CollectionItem> = await response.json();
        const next = reset ? data.items : [...allItems, ...data.items];
        setAllItems(next);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor ?? null);
        if (reset) writeCache(ITEMS_CACHE_KEY, next);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
      initialised.current = true;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setCursor(null);
    try {
      const response = await fetch("/api/items");
      if (response.ok) {
        const data: PaginatedResponse<CollectionItem> = await response.json();
        setAllItems(data.items);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor ?? null);
        writeCache(ITEMS_CACHE_KEY, data.items);
      }
      await fetchTags();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTagClick = (tagName: string | null) => {
    if (tagName === null) {
      router.push("/");
    } else {
      router.push(`/?tag=${tagName}`);
    }
  };

  const showSkeleton = loading && allItems.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <div className="flex items-center justify-between mb-6 md:hidden">
        <h1 className="text-3xl font-bold">Collector</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
          aria-label="Refresh"
        >
          <svg
            className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <SearchBar onSearch={setSearch} />
        <TagChips
          tags={tags.map((t) => t.name)}
          activeTag={activeTag}
          onTagClick={handleTagClick}
        />
      </div>

      {showSkeleton ? (
        <SkeletonGrid />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {visibleItems.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-8">
              No items found.
            </p>
          )}

          {hasMore && !search && !activeTag && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchItems(false)}
                disabled={loading}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <h1 className="text-3xl font-bold mb-6 md:hidden">Collector</h1>
        <SkeletonGrid />
      </div>
    }>
      <CollectionContent />
    </Suspense>
  );
}
