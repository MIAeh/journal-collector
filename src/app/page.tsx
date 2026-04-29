"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import TagChips from "@/components/TagChips";
import ItemCard from "@/components/ItemCard";
import type { CollectionItem, TagWithCount, PaginatedResponse } from "@/lib/types";

function CollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchItems(true);
  }, [activeTag, search]);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data);
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
      if (activeTag) params.append("tag", activeTag);
      if (search) params.append("search", search);
      if (!reset && cursor) params.append("cursor", cursor);

      const response = await fetch(`/api/items?${params.toString()}`);

      if (response.ok) {
        const data: PaginatedResponse<CollectionItem> = await response.json();
        setItems(reset ? data.items : [...items, ...data.items]);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tagName: string | null) => {
    if (tagName === null) {
      router.push("/");
    } else {
      router.push(`/?tag=${tagName}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <h1 className="text-3xl font-bold mb-6 md:hidden">Collector</h1>

      <div className="space-y-4 mb-6">
        <SearchBar onSearch={setSearch} />
        <TagChips
          tags={tags.map((t) => t.name)}
          activeTag={activeTag}
          onTagClick={handleTagClick}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {items.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-8">
          No items found. Try adding some!
        </p>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchItems(false)}
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    }>
      <CollectionContent />
    </Suspense>
  );
}
