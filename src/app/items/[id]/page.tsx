"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ImageWithProxy from "@/components/ImageWithProxy";
import type { CollectionItem } from "@/lib/types";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setItem(data); })
      .catch((err) => console.error("Failed to fetch item:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/");
      } else {
        alert("Failed to delete item");
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {item.imageUrl && (
        <div className="mb-6 rounded-lg overflow-hidden">
          <ImageWithProxy
            pageId={item.id}
            directUrl={item.imageUrl}
            alt={item.title}
            className="w-full h-auto"
          />
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">{item.title}</h1>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-all mb-4 block"
      >
        {item.url}
      </a>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {item.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${tag}`}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

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
