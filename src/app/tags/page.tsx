"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TagWithCount } from "@/lib/types";

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergingTag, setMergingTag] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null); // "renaming" | "deleting" | "merging"

  const fetchTags = async () => {
    try {
      const r = await fetch("/api/tags");
      if (r.ok) setTags(await r.json());
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (!r.ok) {
        const { error } = await r.json();
        alert(error || "Failed to create tag");
        return;
      }
      setNewTagName("");
      await fetchTags();
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setRenamingTag(null);
      return;
    }
    setBusyTag(oldName);
    setBusyAction("renaming");
    try {
      const r = await fetch(`/api/tags/${encodeURIComponent(oldName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: renameValue.trim() }),
      });
      if (!r.ok) {
        const { error } = await r.json();
        alert(error || "Failed to rename tag");
        return;
      }
      setRenamingTag(null);
      await fetchTags();
    } finally {
      setBusyTag(null);
      setBusyAction(null);
    }
  };

  const handleDelete = async (name: string) => {
    const tag = tags.find((t) => t.name === name);
    const count = tag?.count ?? 0;
    const msg = count > 0
      ? `Remove tag "${name}" from ${count} item${count !== 1 ? "s" : ""}?`
      : `Delete tag "${name}"?`;
    if (!confirm(msg)) return;
    setBusyTag(name);
    setBusyAction("deleting");
    try {
      const r = await fetch(`/api/tags/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!r.ok) {
        const { error } = await r.json();
        alert(error || "Failed to delete tag");
        return;
      }
      await fetchTags();
    } finally {
      setBusyTag(null);
      setBusyAction(null);
    }
  };

  const handleMerge = async (source: string) => {
    if (!mergeTarget) return;
    if (!confirm(`Merge "${source}" into "${mergeTarget}"? This cannot be undone.`)) return;
    setBusyTag(source);
    setBusyAction("merging");
    setMergingTag(null);
    try {
      const r = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target: mergeTarget }),
      });
      if (!r.ok) {
        const { error } = await r.json();
        alert(error || "Failed to merge tags");
        return;
      }
      await fetchTags();
    } finally {
      setBusyTag(null);
      setBusyAction(null);
      setMergeTarget("");
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading tags...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tags</h1>

      {/* Create */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
        />
        <button
          type="submit"
          disabled={creating || !newTagName.trim()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
        >
          {creating && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {creating ? "Adding..." : "Add tag"}
        </button>
      </form>

      {tags.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No tags yet.</p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="bg-white border border-gray-200 rounded-lg p-4 relative"
            >
              {/* Busy overlay for slow operations */}
              {busyTag === tag.name && (
                <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center gap-2 text-sm text-gray-600 z-10">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="capitalize">{busyAction}...</span>
                </div>
              )}

              {renamingTag === tag.name ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(tag.name);
                      if (e.key === "Escape") setRenamingTag(null);
                    }}
                    className="flex-1 px-3 py-1 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
                  />
                  <button
                    onClick={() => handleRename(tag.name)}
                    className="px-3 py-1 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingTag(null)}
                    className="px-3 py-1 text-gray-600 text-sm hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : mergingTag === tag.name ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Merge &quot;{tag.name}&quot; into:</span>
                  <select
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="flex-1 px-3 py-1 bg-gray-100 border-0 rounded-lg text-sm"
                  >
                    <option value="">Select target tag</option>
                    {tags
                      .filter((t) => t.name !== tag.name)
                      .map((t) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                  </select>
                  <button
                    onClick={() => handleMerge(tag.name)}
                    disabled={!mergeTarget}
                    className="px-3 py-1 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => { setMergingTag(null); setMergeTarget(""); }}
                    className="px-3 py-1 text-gray-600 text-sm hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/?tag=${encodeURIComponent(tag.name)}`}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span className="font-medium truncate">#{tag.name}</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      {tag.count}
                    </span>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setRenamingTag(tag.name); setRenameValue(tag.name); }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => { setMergingTag(tag.name); setMergeTarget(""); }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                      title="Merge into another tag"
                    >
                      🔀
                    </button>
                    <button
                      onClick={() => handleDelete(tag.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
