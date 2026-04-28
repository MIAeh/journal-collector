"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AddPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("collector_token");
      if (!token) {
        alert("Authentication required. Please return to the home page.");
        router.push("/");
        return;
      }

      const response = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0),
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to save item");
      }

      router.push("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add New Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-2">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900"
            placeholder="https://example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900"
            placeholder="Auto-fetched if empty"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium mb-2">
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900"
            placeholder="tag1, tag2, tag3"
          />
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium mb-2">
            Comment
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900 min-h-[100px]"
            placeholder="Add your notes here..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Item"}
        </button>
      </form>
    </div>
  );
}
