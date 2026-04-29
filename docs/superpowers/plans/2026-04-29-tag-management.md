# Tag Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tag management to the `/tags` page — create, rename, delete, and merge tags — backed by Notion's database schema API.

**Architecture:** Rename, delete, and create operate on the Notion `multi_select` schema via `PATCH /databases/{id}` (single API call, Notion propagates changes to all pages). Merge fans out per-page writes to add the target tag, then deletes the source from the schema. All new backend logic lives in `notion.ts`; new API routes delegate to it. The `/tags` page gains inline management affordances with no new routes.

**Tech Stack:** Next.js 16 App Router, `@notionhq/client`, Vitest, Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Create | `src/lib/tag-ops.ts` — pure Notion tag CRUD functions |
| Create | `src/app/api/tags/[name]/route.ts` — PATCH (rename), DELETE |
| Modify | `src/app/api/tags/route.ts` — add POST (create) |
| Create | `src/app/api/tags/merge/route.ts` — POST (merge) |
| Modify | `src/app/tags/page.tsx` — full management UI |
| Create | `src/lib/__tests__/tag-ops.test.ts` — unit tests |

> `tag-ops.ts` is extracted from `notion.ts` to keep responsibilities separate. `notion.ts` stays focused on item CRUD.

---

## Task 1: `tag-ops.ts` — schema read + create

**Files:**
- Create: `src/lib/tag-ops.ts`
- Create: `src/lib/__tests__/tag-ops.test.ts`

The Notion `PATCH /databases/{id}` payload for multi_select looks like:
```json
{
  "properties": {
    "Tags": {
      "multi_select": {
        "options": [
          { "id": "abc-123", "name": "javascript", "color": "blue" }
        ]
      }
    }
  }
}
```
Omitting an option deletes it. Passing a new entry without `id` creates it. Passing an existing `id` with a new `name` renames it.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/tag-ops.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @notionhq/client
vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    search: vi.fn(),
  })),
}));

// Mock env
vi.stubEnv("NOTION_API_KEY", "test-key");
vi.stubEnv("NOTION_DATABASE_ID", "test-db-id");

import { getTagOptions, createTag } from "@/lib/tag-ops";
import { Client } from "@notionhq/client";

const mockClient = new (Client as any)();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTagOptions", () => {
  it("returns options from multi_select schema", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "javascript", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });

    const options = await getTagOptions();
    expect(options).toEqual([
      { id: "id1", name: "javascript", color: "blue" },
      { id: "id2", name: "react", color: "green" },
    ]);
  });
});

describe("createTag", () => {
  it("adds a new option to the schema", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [{ id: "id1", name: "javascript", color: "blue" }],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await createTag("typescript");

    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [
              { id: "id1", name: "javascript", color: "blue" },
              { name: "typescript" },
            ],
          },
        },
      },
    });
  });

  it("throws if tag already exists", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [{ id: "id1", name: "javascript", color: "blue" }],
          },
        },
      },
    });

    await expect(createTag("javascript")).rejects.toThrow("Tag already exists");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd ~/info-collector-app && npm run test:run -- src/lib/__tests__/tag-ops.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/tag-ops'`

- [ ] **Step 3: Implement `getTagOptions` and `createTag`**

```typescript
// src/lib/tag-ops.ts
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

export async function getTagOptions(): Promise<TagOption[]> {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  const prop = (db as any).properties?.Tags;
  if (prop?.type !== "multi_select") return [];
  return prop.multi_select.options as TagOption[];
}

export async function createTag(name: string): Promise<void> {
  const options = await getTagOptions();
  if (options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Tag already exists");
  }
  await notion.databases.update({
    database_id: DATABASE_ID,
    properties: {
      Tags: {
        multi_select: {
          options: [...options, { name }],
        },
      },
    } as any,
  });
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd ~/info-collector-app && npm run test:run -- src/lib/__tests__/tag-ops.test.ts
```
Expected: `getTagOptions` and `createTag` tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/info-collector-app && git add src/lib/tag-ops.ts src/lib/__tests__/tag-ops.test.ts && git commit -m "feat: add tag-ops module with getTagOptions and createTag"
```

---

## Task 2: `tag-ops.ts` — rename and delete

**Files:**
- Modify: `src/lib/tag-ops.ts`
- Modify: `src/lib/__tests__/tag-ops.test.ts`

- [ ] **Step 1: Add failing tests for rename and delete**

Append to `src/lib/__tests__/tag-ops.test.ts`:

```typescript
import { getTagOptions, createTag, renameTag, deleteTag } from "@/lib/tag-ops";

describe("renameTag", () => {
  it("updates the option name in the schema by id", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await renameTag("js", "javascript");

    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [
              { id: "id1", name: "javascript", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });
  });

  it("throws if source tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [{ id: "id1", name: "react", color: "green" }] },
        },
      },
    });

    await expect(renameTag("nonexistent", "new")).rejects.toThrow("Tag not found");
  });
});

describe("deleteTag", () => {
  it("removes the option from the schema", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await deleteTag("js");

    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [{ id: "id2", name: "react", color: "green" }],
          },
        },
      },
    });
  });

  it("throws if tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [] },
        },
      },
    });

    await expect(deleteTag("missing")).rejects.toThrow("Tag not found");
  });
});
```

- [ ] **Step 2: Run tests — verify new ones fail**

```bash
cd ~/info-collector-app && npm run test:run -- src/lib/__tests__/tag-ops.test.ts
```
Expected: `renameTag` and `deleteTag` tests FAIL — not exported

- [ ] **Step 3: Implement `renameTag` and `deleteTag` in `tag-ops.ts`**

Append to `src/lib/tag-ops.ts`:

```typescript
export async function renameTag(oldName: string, newName: string): Promise<void> {
  const options = await getTagOptions();
  const target = options.find((o) => o.name === oldName);
  if (!target) throw new Error("Tag not found");
  await notion.databases.update({
    database_id: DATABASE_ID,
    properties: {
      Tags: {
        multi_select: {
          options: options.map((o) =>
            o.id === target.id ? { ...o, name: newName } : o
          ),
        },
      },
    } as any,
  });
}

export async function deleteTag(name: string): Promise<void> {
  const options = await getTagOptions();
  if (!options.some((o) => o.name === name)) throw new Error("Tag not found");
  await notion.databases.update({
    database_id: DATABASE_ID,
    properties: {
      Tags: {
        multi_select: {
          options: options.filter((o) => o.name !== name),
        },
      },
    } as any,
  });
}
```

- [ ] **Step 4: Run all tag-ops tests — verify all pass**

```bash
cd ~/info-collector-app && npm run test:run -- src/lib/__tests__/tag-ops.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/info-collector-app && git add src/lib/tag-ops.ts src/lib/__tests__/tag-ops.test.ts && git commit -m "feat: add renameTag and deleteTag to tag-ops"
```

---

## Task 3: `tag-ops.ts` — merge

**Files:**
- Modify: `src/lib/tag-ops.ts`
- Modify: `src/lib/__tests__/tag-ops.test.ts`

Merge algorithm:
1. Get tag options — verify both source and target exist
2. Query all pages tagged with source (paginate with `page_size: 100`)
3. For each page, if it doesn't already have target tag, PATCH to add target to Tags
4. Delete source from schema via `PATCH /databases`

The mock client needs `databases.query` and `pages.update` for this test.

- [ ] **Step 1: Add failing test for mergeTag**

Append to `src/lib/__tests__/tag-ops.test.ts` (update the mock at top to include `pages.update` and `databases.query`):

First, update the top-level mock to add query and pages:
```typescript
vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: {
      retrieve: vi.fn(),
      update: vi.fn(),
      query: vi.fn(),
    },
    pages: {
      update: vi.fn(),
    },
  })),
}));
```

Then add the test:
```typescript
import { getTagOptions, createTag, renameTag, deleteTag, mergeTag } from "@/lib/tag-ops";

describe("mergeTag", () => {
  it("adds target tag to all source-tagged pages then deletes source from schema", async () => {
    // First call: getTagOptions in mergeTag
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    // query pages with "js"
    mockClient.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: "page1",
          properties: {
            Tags: {
              multi_select: [{ name: "js" }],
            },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    });
    mockClient.pages.update.mockResolvedValueOnce({});
    // Second getTagOptions call (inside deleteTag)
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await mergeTag("js", "javascript");

    expect(mockClient.pages.update).toHaveBeenCalledWith({
      page_id: "page1",
      properties: {
        Tags: {
          multi_select: [{ name: "js" }, { name: "javascript" }],
        },
      },
    });
    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [{ id: "id2", name: "javascript", color: "yellow" }],
          },
        },
      },
    });
  });

  it("throws if source tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [{ id: "id1", name: "react", color: "blue" }] },
        },
      },
    });

    await expect(mergeTag("nonexistent", "react")).rejects.toThrow("Source tag not found");
  });

  it("throws if target tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [{ id: "id1", name: "js", color: "blue" }] },
        },
      },
    });

    await expect(mergeTag("js", "nonexistent")).rejects.toThrow("Target tag not found");
  });
});
```

- [ ] **Step 2: Run tests — verify mergeTag tests fail**

```bash
cd ~/info-collector-app && npm run test:run -- src/lib/__tests__/tag-ops.test.ts
```
Expected: `mergeTag` tests FAIL — not exported

- [ ] **Step 3: Implement `mergeTag` in `tag-ops.ts`**

Append to `src/lib/tag-ops.ts`:

```typescript
export async function mergeTag(sourceName: string, targetName: string): Promise<void> {
  const options = await getTagOptions();
  if (!options.some((o) => o.name === sourceName)) throw new Error("Source tag not found");
  if (!options.some((o) => o.name === targetName)) throw new Error("Target tag not found");

  // Paginate through all pages tagged with source
  let cursor: string | undefined;
  do {
    const response: any = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: { property: "Tags", multi_select: { contains: sourceName } },
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of response.results) {
      const currentTags: { name: string }[] =
        page.properties?.Tags?.multi_select ?? [];
      const alreadyHasTarget = currentTags.some((t: any) => t.name === targetName);
      if (!alreadyHasTarget) {
        await notion.pages.update({
          page_id: page.id,
          properties: {
            Tags: {
              multi_select: [...currentTags, { name: targetName }],
            },
          },
        } as any);
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  // Remove source from schema
  await deleteTag(sourceName);
}
```

- [ ] **Step 4: Run all tests — verify all pass**

```bash
cd ~/info-collector-app && npm run test:run -- src/lib/__tests__/tag-ops.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/info-collector-app && git add src/lib/tag-ops.ts src/lib/__tests__/tag-ops.test.ts && git commit -m "feat: add mergeTag to tag-ops"
```

---

## Task 4: API routes — create, rename, delete, merge

**Files:**
- Modify: `src/app/api/tags/route.ts` — add POST handler
- Create: `src/app/api/tags/[name]/route.ts` — PATCH and DELETE
- Create: `src/app/api/tags/merge/route.ts` — POST

- [ ] **Step 1: Add POST to `src/app/api/tags/route.ts`**

Replace the file contents:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { listTags } from "@/lib/notion";
import { createTag } from "@/lib/tag-ops";

export async function GET(request: NextRequest) {
  try {
    const tags = await listTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error listing tags:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list tags" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    await createTag(name.trim());
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tag";
    const status = message === "Tag already exists" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Create `src/app/api/tags/[name]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { renameTag, deleteTag } from "@/lib/tag-ops";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { newName } = await request.json();
    if (!newName || typeof newName !== "string" || !newName.trim()) {
      return NextResponse.json({ error: "newName is required" }, { status: 400 });
    }
    await renameTag(decodeURIComponent(name), newName.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rename tag";
    const status = message === "Tag not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    await deleteTag(decodeURIComponent(name));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete tag";
    const status = message === "Tag not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 3: Create `src/app/api/tags/merge/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { mergeTag } from "@/lib/tag-ops";

export async function POST(request: NextRequest) {
  try {
    const { source, target } = await request.json();
    if (!source || !target) {
      return NextResponse.json({ error: "source and target are required" }, { status: 400 });
    }
    await mergeTag(source, target);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to merge tags";
    const status =
      message === "Source tag not found" || message === "Target tag not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Verify app still compiles**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tags
```
Expected: `200`

- [ ] **Step 5: Commit**

```bash
cd ~/info-collector-app && git add src/app/api/tags/ && git commit -m "feat: add tag management API routes (create, rename, delete, merge)"
```

---

## Task 5: Tags page — management UI

**Files:**
- Modify: `src/app/tags/page.tsx`

UI spec:
- **Create:** input + "Add tag" button at the top of the page
- **Each tag row:** tag name + count badge on left, then action buttons on right: **Rename** (pencil icon), **Merge** (merge icon), **Delete** (trash icon)
- **Rename:** clicking Rename replaces the tag name with an inline `<input>` pre-filled with the current name; "Save" and "Cancel" buttons appear; submits `PATCH /api/tags/[name]`
- **Delete:** clicking Delete shows a `window.confirm("Remove tag '[name]' from all items?")`, then calls `DELETE /api/tags/[name]`
- **Merge:** clicking Merge opens an inline dropdown/select of other tags; selecting one and clicking "Merge" confirms with `window.confirm("Merge '[source]' into '[target]'? This cannot be undone.")`, then calls `POST /api/tags/merge`; shows a loading state on the row while in progress
- After any mutation, re-fetch tags from `/api/tags`

- [ ] **Step 1: Rewrite `src/app/tags/page.tsx`**

```typescript
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
    }
  };

  const handleMerge = async (source: string) => {
    if (!mergeTarget) return;
    if (!confirm(`Merge "${source}" into "${mergeTarget}"? This cannot be undone.`)) return;
    setBusyTag(source);
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
      setMergeTarget("");
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
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
        >
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
              className={`bg-white border border-gray-200 rounded-lg p-4 ${
                busyTag === tag.name ? "opacity-50 pointer-events-none" : ""
              }`}
            >
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
                  <span className="text-sm font-medium">Merge "{tag.name}" into:</span>
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
                    href={`/?tag=${tag.name}`}
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
```

- [ ] **Step 2: Verify app compiles and /tags loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tags
```
Expected: `200`

- [ ] **Step 3: Run full test suite**

```bash
cd ~/info-collector-app && npm run test:run
```
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
cd ~/info-collector-app && git add src/app/tags/page.tsx && git commit -m "feat: tag management UI — create, rename, merge, delete"
```

---

## Self-Review

**Spec coverage:**
- ✅ Create tag → Task 1 + Task 4 POST + Task 5 form
- ✅ Rename → Task 2 + Task 4 PATCH + Task 5 inline edit
- ✅ Delete → Task 2 + Task 4 DELETE + Task 5 confirm + delete button
- ✅ Merge → Task 3 + Task 4 merge route + Task 5 merge selector with confirm + progress

**Placeholder scan:** None found.

**Type consistency:**
- `TagOption` defined in Task 1, used consistently in Task 2 and 3
- `TagWithCount` from existing `types.ts`, used in Task 5
- Route param pattern `{ params: Promise<{ name: string }> }` matches existing `items/[id]/route.ts` pattern
- `encodeURIComponent` used client-side, `decodeURIComponent` used server-side — symmetric ✅
