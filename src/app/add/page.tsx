"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Mode = "structured" | "quick";

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export default function AddPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("quick");

  // Structured fields
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [comment, setComment] = useState("");

  // Quick field
  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const save = async (payload: object) => {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to save item");
    }
  };

  const handleStructured = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({
        url: url.trim(),
        title: title.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
        comment: comment.trim() || undefined,
      });
      router.push("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleQuick = async (e: FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    const extracted = extractUrl(quickText);
    if (!extracted) {
      setQuickError("No URL found in text");
      return;
    }
    setSaving(true);
    try {
      await save({ url: extracted });
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

      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
        {(["structured", "quick"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m === "structured" ? "Structured" : "Quick"}
          </button>
        ))}
      </div>

      {mode === "structured" ? (
        <form onSubmit={handleStructured} className="space-y-4">
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
      ) : (
        <form onSubmit={handleQuick} className="space-y-4">
          <div>
            <label htmlFor="quickText" className="block text-sm font-medium mb-2">
              Paste text containing a URL
            </label>
            <textarea
              id="quickText"
              value={quickText}
              onChange={(e) => { setQuickText(e.target.value); setQuickError(null); }}
              className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900 min-h-[140px]"
              placeholder="Paste any text — the first URL found will be saved."
              required
            />
            {quickError && (
              <p className="mt-1 text-sm text-red-600">{quickError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Extract & Save"}
          </button>
        </form>
      )}
    </div>
  );
}
