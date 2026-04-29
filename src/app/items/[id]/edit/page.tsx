"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import ImageWithProxy from "@/components/ImageWithProxy";
import type { CollectionItem } from "@/lib/types";
import { clearCollectionCache } from "@/lib/cache";

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Scrape modal state
  const [scraping, setScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<string[] | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // URL add state
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data: CollectionItem | null) => {
        if (data) {
          setItem(data);
          setTitle(data.title);
          setComment(data.comment);
          setImages(data.images);
        }
      })
      .catch((err) => console.error("Failed to fetch item:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) {
      setSaveError("Title is required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), comment: comment.trim(), images }),
      });
      if (r.ok) {
        clearCollectionCache();
        router.push(`/items/${id}`);
      } else {
        const data = await r.json().catch(() => ({}));
        setSaveError(data.error || "Failed to save");
      }
    } catch {
      setSaveError("Failed to save — check your connection");
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeError(null);
    setScrapeResults(null);
    try {
      const r = await fetch(`/api/items/${id}/scrape-images`);
      if (!r.ok) {
        setScrapeError("Failed to scrape images");
        return;
      }
      const urls: string[] = await r.json();
      setScrapeResults(urls.filter((u) => !images.includes(u)));
    } catch {
      setScrapeError("Failed to scrape images");
    } finally {
      setScraping(false);
    }
  };

  const addFromScrape = (url: string) => {
    setImages((prev) => [...prev, url]);
    setScrapeResults((prev) => prev ? prev.filter((u) => u !== url) : null);
  };

  const handleAddUrl = () => {
    setUrlError(null);
    const trimmed = urlInput.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setUrlError("URL must start with http:// or https://");
      return;
    }
    if (images.includes(trimmed)) {
      setUrlError("Image already added");
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setUrlInput("");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch(`/api/items/${id}/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (r.ok) {
        const { url } = await r.json();
        setImages((prev) => [...prev, url]);
      } else {
        const data = await r.json().catch(() => ({}));
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Item Not Found</h1>
        <button onClick={() => router.push("/")} className="text-gray-900 underline">
          Back to collection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {saveError && (
        <p className="mb-4 text-sm text-red-600">{saveError}</p>
      )}

      {/* URL (read-only) */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">URL</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm break-all"
        >
          {item.url}
        </a>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="edit-title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
        />
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label htmlFor="edit-comment" className="block text-sm font-medium mb-1">
          Comment
        </label>
        <textarea
          id="edit-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm min-h-[100px]"
          placeholder="Add your notes here..."
        />
      </div>

      {/* Images */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-2">Images</p>

        {/* Thumbnail row */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((url, i) => (
              <div key={`${url}-${i}`} className="relative group">
                <ImageWithProxy
                  pageId={item.id}
                  directUrl={url}
                  alt={`Image ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add methods */}
        <div className="space-y-3 border border-gray-200 rounded-lg p-3">
          {/* Scrape */}
          <div>
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="text-sm text-gray-700 hover:text-gray-900 underline disabled:opacity-50"
            >
              {scraping ? "Scraping..." : "Scrape from URL"}
            </button>
            {scrapeError && <p className="text-xs text-red-600 mt-1">{scrapeError}</p>}
          </div>

          {/* URL input */}
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddUrl(); }}
              />
              <button
                onClick={handleAddUrl}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
              >
                Add
              </button>
            </div>
            {urlError && <p className="text-xs text-red-600 mt-1">{urlError}</p>}
          </div>

          {/* Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`text-sm text-gray-700 hover:text-gray-900 underline cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              {uploading ? "Uploading..." : "Upload image"}
            </label>
          </div>
        </div>
      </div>

      {/* Scrape results modal */}
      {scrapeResults !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Found {scrapeResults.length} images</h2>
              <button
                onClick={() => setScrapeResults(null)}
                className="text-gray-500 hover:text-gray-900 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {scrapeResults.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No new images found.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {scrapeResults.map((url) => (
                    <button
                      key={url}
                      onClick={() => addFromScrape(url)}
                      className="aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-gray-900 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
