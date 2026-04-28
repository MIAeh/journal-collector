"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import TagChips from "@/components/TagChips";
import ItemCard from "@/components/ItemCard";
import type { CollectionItem, TagWithCount, PaginatedResponse } from "@/lib/types";

function TokenPrompt({ onSave }: { onSave: (token: string) => void }) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      localStorage.setItem("collector_token", password.trim());
      onSave(password.trim());
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Enter Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Save Token
        </button>
      </form>
    </div>
  );
}

function CollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("collector_token");
    setToken(storedToken);
  }, []);

  useEffect(() => {
    const tagParam = searchParams.get("tag");
    setActiveTag(tagParam);
  }, [searchParams]);

  useEffect(() => {
    if (token) {
      fetchTags();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchItems(true);
    }
  }, [token, activeTag, search]);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

      const response = await fetch(`/api/items?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const handleLoadMore = () => {
    fetchItems(false);
  };

  const handleTagClick = (tagName: string | null) => {
    if (tagName === null) {
      router.push("/");
    } else {
      router.push(`/?tag=${tagName}`);
    }
  };

  if (!token) {
    return <TokenPrompt onSave={setToken} />;
  }

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

      <div className="space-y-4">
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
            onClick={handleLoadMore}
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
