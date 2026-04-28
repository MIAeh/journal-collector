"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TagWithCount } from "@/lib/types";

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem("collector_token");
      if (!token) {
        return;
      }

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Loading tags...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">All Tags</h1>

      {tags.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No tags found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tags.map((tag) => (
            <Link
              key={tag.name}
              href={`/?tag=${tag.name}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">#{tag.name}</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {tag.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
