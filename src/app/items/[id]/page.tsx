"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ImageWithProxy from "@/components/ImageWithProxy";
import type { CollectionItem, TagWithCount } from "@/lib/types";
import { clearCollectionCache } from "@/lib/cache";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag editing state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setItem(data); })
      .catch((err) => console.error("Failed to fetch item:", err))
      .finally(() => setLoading(false));

    fetch("/api/tags")
      .then((r) => r.ok ? r.json() : [])
      .then((data: TagWithCount[]) => setAllTags(data.map((t) => t.name)))
      .catch((err) => console.error("Failed to fetch tags:", err));
  }, [id]);

  const patchTags = async (newTags: string[]) => {
    if (!item) return;
    setSavingTags(true);
    try {
      const r = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      if (r.ok) {
        setItem({ ...item, tags: newTags });
      } else {
        alert("Failed to update tags");
      }
    } finally {
      setSavingTags(false);
      setTagDropdownOpen(false);
    }
  };

  const removeTag = (tag: string) => {
    if (!item) return;
    patchTags(item.tags.filter((t) => t !== tag));
  };

  const addTag = (tag: string) => {
    if (!item) return;
    patchTags([...item.tags, tag]);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await fetch(`/api/items/${id}/sync`, { method: "POST" });
      if (!r.ok) { setSyncMsg("Sync failed"); return; }
      const { item: updated, synced, reason } = await r.json();
      if (synced) {
        setItem(updated);
        clearCollectionCache();
        setSyncMsg("Synced");
      } else {
        setSyncMsg(
          reason === "unreachable" ? "URL unreachable — kept current" :
          reason === "gone"        ? "URL gone (404) — kept current" :
                                     "No new content found"
        );
      }
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;
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
        setItem({ ...item, images: [...item.images, url] });
        clearCollectionCache();
      } else {
        const data = await r.json().catch(() => ({}));
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (response.ok) {
        clearCollectionCache();
        router.push("/");
      } else {
        alert("Failed to delete item");
      }
    } catch {
      alert("Failed to delete item");
    } finally {
      setDeleting(false);
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
        <p className="text-gray-600 mb-4">
          The item you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <button onClick={() => router.push("/")} className="text-gray-900 underline">
          Back to collection
        </button>
      </div>
    );
  }

  const availableTags = allTags.filter((t) => !item.tags.includes(t));

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
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
            aria-label="Sync from source"
            title="Sync from source"
          >
            <svg
              className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {/* Upload image */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
            aria-label="Upload image"
            title={uploading ? "Uploading…" : "Upload image"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4-4m0 0l4 4m-4-4v9M20 16V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2" />
            </svg>
          </button>
          <Link
            href={`/items/${id}/edit`}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ✎ Edit
          </Link>
        </div>
      </div>

      {syncMsg && (
        <p className="text-sm text-gray-500 mb-4">{syncMsg}</p>
      )}

      {/* Image gallery — horizontal scroll */}      {item.images.length > 0 && (
        <div className="mb-6 -mx-4">
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
            {item.images.map((imgUrl, i) => (
              <ImageWithProxy
                key={i}
                pageId={item.id}
                directUrl={imgUrl}
                imageIndex={i}
                alt={`${item.title} ${i + 1}`}
                className="flex-none w-64 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 snap-start object-cover"
                hideOnError
              />
            ))}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2">{item.title}</h1>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-all mb-4 block text-sm"
      >
        {item.url}
      </a>

      {/* Inline tag editor */}
      <div className="flex flex-wrap items-center gap-2 mb-4 relative">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-900 text-sm px-3 py-1.5 rounded-full"
          >
            #{tag}
            <button
              onClick={() => removeTag(tag)}
              disabled={savingTags}
              className="text-gray-500 hover:text-gray-900 disabled:opacity-50 leading-none w-5 h-5 flex items-center justify-center"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {availableTags.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setTagDropdownOpen((o) => !o)}
              disabled={savingTags}
              className="inline-flex items-center gap-1 text-sm text-gray-900 border border-gray-300 px-3 py-1.5 rounded-full disabled:opacity-50"
            >
              + Add tag
            </button>
            {tagDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px] py-1">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="w-full text-left px-3 py-3 text-sm text-gray-900 hover:bg-gray-50"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {item.comment && (
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">{item.comment}</p>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6">
        Created: {new Date(item.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleting ? "Deleting..." : "Delete Item"}
      </button>
    </div>
  );
}
