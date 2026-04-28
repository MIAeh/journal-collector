# Web Clipper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal content collector PWA backed by Notion, with Chrome extension and iOS Shortcut capture methods.

**Architecture:** Next.js App Router deployed to Vercel. API routes handle CRUD against Notion's database API. Frontend is a responsive list-based UI with tag filtering and search. Chrome extension and iOS Shortcut call the same API endpoints for capture.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, `@notionhq/client`, `next-pwa`, Chrome Manifest V3

---

## File Structure

```
info-collector-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with metadata, fonts
│   │   ├── page.tsx                # Collection page (home)
│   │   ├── add/
│   │   │   └── page.tsx            # Add item form
│   │   ├── tags/
│   │   │   └── page.tsx            # Tags overview page
│   │   ├── items/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Item detail page
│   │   └── api/
│   │       ├── save/
│   │       │   └── route.ts        # POST - save new item
│   │       ├── items/
│   │       │   ├── route.ts        # GET - list items
│   │       │   └── [id]/
│   │       │       └── route.ts    # PATCH, DELETE - edit/remove item
│   │       ├── tags/
│   │       │   └── route.ts        # GET - list all tags
│   │       └── image-proxy/
│   │           └── route.ts        # GET - proxy Notion file URLs
│   ├── lib/
│   │   ├── notion.ts               # Notion client + query helpers
│   │   ├── auth.ts                 # Bearer token validation
│   │   ├── og.ts                   # OG image extraction
│   │   └── types.ts                # Shared TypeScript types
│   └── components/
│       ├── ItemCard.tsx             # Single list item row
│       ├── TagChips.tsx             # Tag filter chips
│       ├── SearchBar.tsx            # Search input
│       ├── NavBar.tsx               # Desktop top nav
│       ├── BottomTabs.tsx           # Mobile bottom tabs
│       ├── AddForm.tsx              # Add item form component
│       └── ImageWithProxy.tsx       # Image component using proxy
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── icon-192.png                # App icon
│   └── icon-512.png                # App icon large
├── extension/
│   ├── manifest.json               # Chrome extension manifest V3
│   ├── popup.html                  # Extension popup
│   ├── popup.js                    # Extension popup logic
│   └── icon-48.png                 # Extension icon
├── docs/
│   └── ios-shortcut-setup.md       # iOS Shortcut instructions
├── next.config.ts                  # Next.js + PWA config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json
├── package.json
└── .env.local                      # Local env vars (not committed)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`, `public/manifest.json`

- [ ] **Step 1: Create Next.js project**

```bash
cd ~/info-collector-app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the full project structure.

- [ ] **Step 2: Install dependencies**

```bash
npm install @notionhq/client next-pwa
npm install -D @types/node
```

- [ ] **Step 3: Add environment variables**

Create `.env.local`:

```env
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
AUTH_TOKEN=your_secret_bearer_token
```

- [ ] **Step 4: Configure next.config.ts for PWA**

Replace `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
```

- [ ] **Step 5: Create PWA manifest**

Replace `public/manifest.json`:

```json
{
  "name": "Collector",
  "short_name": "Collector",
  "description": "Personal content collector",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#111111",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 6: Update root layout with PWA metadata**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collector",
  description: "Personal content collector",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Collector",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder icons**

```bash
# Generate simple placeholder icons (replace with real ones later)
npx @anthropic-ai/placeholder-icon --size 192 --output public/icon-192.png --text "C" 2>/dev/null || echo "Add icons manually later"
npx @anthropic-ai/placeholder-icon --size 512 --output public/icon-512.png --text "C" 2>/dev/null || echo "Add icons manually later"
```

Note: If the icon generator isn't available, create simple PNG icons manually or use any icon generator. The app works without them.

- [ ] **Step 8: Verify project runs**

```bash
npm run dev
```

Expected: App starts on http://localhost:3000 with the default Next.js page.

- [ ] **Step 9: Commit**

```bash
git init
echo "node_modules\n.next\n.env.local\npublic/sw.js\npublic/workbox-*.js" >> .gitignore
git add .
git commit -m "feat: scaffold Next.js project with PWA config"
```

---

## Task 2: Shared Types & Notion Client

**Files:**
- Create: `src/lib/types.ts`, `src/lib/notion.ts`, `src/lib/auth.ts`

- [ ] **Step 1: Define shared types**

Create `src/lib/types.ts`:

```typescript
export interface CollectionItem {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  tags: string[];
  comment: string;
  createdAt: string;
}

export interface SaveItemInput {
  url: string;
  title?: string;
  imageUrl?: string;
  tags?: string[];
  comment?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface TagWithCount {
  name: string;
  count: number;
}
```

- [ ] **Step 2: Create auth helper**

Create `src/lib/auth.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export function validateAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const token = process.env.AUTH_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server misconfigured: no AUTH_TOKEN" },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
```

- [ ] **Step 3: Create Notion client and helpers**

Create `src/lib/notion.ts`:

```typescript
import { Client } from "@notionhq/client";
import type {
  CollectionItem,
  SaveItemInput,
  PaginatedResponse,
  TagWithCount,
} from "./types";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export async function saveItem(input: SaveItemInput): Promise<CollectionItem> {
  const properties: Record<string, unknown> = {
    Title: {
      title: [{ text: { content: input.title || "Untitled" } }],
    },
    URL: { url: input.url },
    Tags: {
      multi_select: (input.tags || []).map((tag) => ({ name: tag })),
    },
    Comment: {
      rich_text: [{ text: { content: input.comment || "" } }],
    },
  };

  if (input.imageUrl) {
    properties.Image = {
      files: [{ type: "external", name: "thumbnail", external: { url: input.imageUrl } }],
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  return pageToItem(page);
}

export async function listItems(options: {
  cursor?: string;
  tag?: string;
  search?: string;
  pageSize?: number;
}): Promise<PaginatedResponse<CollectionItem>> {
  const { cursor, tag, search, pageSize = 20 } = options;

  const filter: Record<string, unknown>[] = [];

  if (tag) {
    filter.push({
      property: "Tags",
      multi_select: { contains: tag },
    });
  }

  if (search) {
    filter.push({
      or: [
        { property: "Title", title: { contains: search } },
        { property: "Comment", rich_text: { contains: search } },
      ],
    });
  }

  const response = await notion.databases.query({
    database_id: databaseId,
    start_cursor: cursor || undefined,
    page_size: pageSize,
    sorts: [{ property: "Created", direction: "descending" }],
    ...(filter.length > 0 && {
      filter: filter.length === 1 ? filter[0] : { and: filter },
    }),
  });

  const items = response.results.map(pageToItem);

  return {
    items,
    hasMore: response.has_more,
    nextCursor: response.next_cursor,
  };
}

export async function getItem(pageId: string): Promise<CollectionItem> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return pageToItem(page);
}

export async function updateItem(
  pageId: string,
  updates: Partial<SaveItemInput>
): Promise<CollectionItem> {
  const properties: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    properties.Title = {
      title: [{ text: { content: updates.title } }],
    };
  }
  if (updates.tags !== undefined) {
    properties.Tags = {
      multi_select: updates.tags.map((tag) => ({ name: tag })),
    };
  }
  if (updates.comment !== undefined) {
    properties.Comment = {
      rich_text: [{ text: { content: updates.comment } }],
    };
  }
  if (updates.imageUrl !== undefined) {
    properties.Image = {
      files: [{ type: "external", name: "thumbnail", external: { url: updates.imageUrl } }],
    };
  }

  const page = await notion.pages.update({
    page_id: pageId,
    properties,
  });

  return pageToItem(page);
}

export async function deleteItem(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

export async function listTags(): Promise<TagWithCount[]> {
  const response = await notion.databases.retrieve({
    database_id: databaseId,
  });

  const tagsProperty = response.properties.Tags;
  if (tagsProperty.type !== "multi_select") return [];

  const tagNames = tagsProperty.multi_select.options.map((opt) => opt.name);

  // Get counts by querying each tag (limited but works for moderate volume)
  const counts: TagWithCount[] = [];
  for (const name of tagNames) {
    const result = await notion.databases.query({
      database_id: databaseId,
      filter: { property: "Tags", multi_select: { contains: name } },
      page_size: 1,
    });
    // Notion doesn't return total count easily, so we approximate
    counts.push({ name, count: result.results.length });
  }

  return counts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getImageUrl(pageId: string): Promise<string | null> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return extractImageUrl(page);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pageToItem(page: any): CollectionItem {
  const props = page.properties;

  return {
    id: page.id,
    title: props.Title?.title?.[0]?.plain_text || "Untitled",
    url: props.URL?.url || "",
    imageUrl: extractImageUrl(page),
    tags: props.Tags?.multi_select?.map((t: { name: string }) => t.name) || [],
    comment: props.Comment?.rich_text?.[0]?.plain_text || "",
    createdAt: page.created_time,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(page: any): string | null {
  const files = page.properties?.Image?.files;
  if (!files || files.length === 0) return null;

  const file = files[0];
  if (file.type === "external") return file.external.url;
  if (file.type === "file") return file.file.url;
  return null;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add shared types, auth helper, and Notion client"
```

---

## Task 3: API Routes

**Files:**
- Create: `src/app/api/save/route.ts`, `src/app/api/items/route.ts`, `src/app/api/items/[id]/route.ts`, `src/app/api/tags/route.ts`, `src/app/api/image-proxy/route.ts`
- Create: `src/lib/og.ts`

- [ ] **Step 1: Create OG image extraction helper**

Create `src/lib/og.ts`:

```typescript
export async function fetchOgData(url: string): Promise<{
  title: string;
  imageUrl: string | null;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Collector/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();

    const title = extractMeta(html, "og:title")
      || extractMeta(html, "twitter:title")
      || extractTagContent(html, "title")
      || "Untitled";

    const imageUrl = extractMeta(html, "og:image")
      || extractMeta(html, "twitter:image")
      || null;

    return { title, imageUrl };
  } catch {
    return { title: "Untitled", imageUrl: null };
  }
}

function extractMeta(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  if (match) return match[1];

  // Try reverse order (content before property)
  const regexReverse = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    "i"
  );
  const matchReverse = html.match(regexReverse);
  return matchReverse ? matchReverse[1] : null;
}

function extractTagContent(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}
```

- [ ] **Step 2: Create POST /api/save**

Create `src/app/api/save/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { saveItem } from "@/lib/notion";
import { fetchOgData } from "@/lib/og";

export async function POST(request: NextRequest) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { url, title, imageUrl, tags, comment } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch OG data if title or image not provided
    let resolvedTitle = title;
    let resolvedImage = imageUrl;

    if (!resolvedTitle || !resolvedImage) {
      const ogData = await fetchOgData(url);
      resolvedTitle = resolvedTitle || ogData.title;
      resolvedImage = resolvedImage || ogData.imageUrl;
    }

    const item = await saveItem({
      url,
      title: resolvedTitle,
      imageUrl: resolvedImage || undefined,
      tags: tags || [],
      comment: comment || "",
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: "Failed to save item" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create GET /api/items**

Create `src/app/api/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { listItems } from "@/lib/notion";

export async function GET(request: NextRequest) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listItems({ cursor, tag, search });

    return NextResponse.json(result);
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: "Failed to list items" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create PATCH/DELETE /api/items/[id]**

Create `src/app/api/items/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { updateItem, deleteItem, getItem } from "@/lib/notion";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const item = await getItem(id);
    return NextResponse.json(item);
  } catch (error) {
    console.error("Get error:", error);
    return NextResponse.json(
      { error: "Failed to get item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const item = await updateItem(id, body);
    return NextResponse.json(item);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    await deleteItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Create GET /api/tags**

Create `src/app/api/tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { listTags } from "@/lib/notion";

export async function GET(request: NextRequest) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const tags = await listTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Tags error:", error);
    return NextResponse.json(
      { error: "Failed to list tags" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Create GET /api/image-proxy**

Create `src/app/api/image-proxy/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { getImageUrl } from "@/lib/notion";

export async function GET(request: NextRequest) {
  const authError = validateAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json(
        { error: "pageId is required" },
        { status: 400 }
      );
    }

    const imageUrl = await getImageUrl(pageId);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image found" },
        { status: 404 }
      );
    }

    return NextResponse.redirect(imageUrl, {
      headers: {
        "Cache-Control": "public, max-age=3300",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7: Verify API routes compile**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/ src/lib/og.ts
git commit -m "feat: add all API routes (save, list, edit, delete, tags, image-proxy)"
```

---

## Task 4: Frontend Components

**Files:**
- Create: `src/components/NavBar.tsx`, `src/components/BottomTabs.tsx`, `src/components/SearchBar.tsx`, `src/components/TagChips.tsx`, `src/components/ItemCard.tsx`, `src/components/ImageWithProxy.tsx`

- [ ] **Step 1: Create NavBar (desktop)**

Create `src/components/NavBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Collector
        </Link>
        <Link
          href="/"
          className={`text-sm ${pathname === "/" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Collection
        </Link>
        <Link
          href="/tags"
          className={`text-sm ${pathname === "/tags" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Tags
        </Link>
      </div>
      <Link
        href="/add"
        className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        + Add New
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: Create BottomTabs (mobile)**

Create `src/components/BottomTabs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomTabs() {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Collection", icon: "📋" },
    { href: "/add", label: "Add", icon: "➕" },
    { href: "/tags", label: "Tags", icon: "🏷️" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-50">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            pathname === tab.href
              ? "text-gray-900 font-semibold"
              : "text-gray-400"
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Create SearchBar**

Create `src/components/SearchBar.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search your collection..." }: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(value);
    },
    [value, onSearch]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (e.target.value === "") {
        onSearch("");
      }
    },
    [onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
      />
    </form>
  );
}
```

- [ ] **Step 4: Create TagChips**

Create `src/components/TagChips.tsx`:

```tsx
"use client";

interface TagChipsProps {
  tags: string[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

export function TagChips({ tags, activeTag, onTagClick }: TagChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onTagClick(null)}
        className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
          activeTag === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagClick(tag)}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
            activeTag === tag
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create ImageWithProxy**

Create `src/components/ImageWithProxy.tsx`:

```tsx
"use client";

import { useState } from "react";

interface ImageWithProxyProps {
  pageId: string;
  directUrl: string | null;
  alt: string;
  className?: string;
}

export function ImageWithProxy({ pageId, directUrl, alt, className = "" }: ImageWithProxyProps) {
  const [error, setError] = useState(false);

  const src = error || !directUrl
    ? `/api/image-proxy?pageId=${pageId}`
    : directUrl;

  if (!directUrl && !pageId) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => {
        if (!error) setError(true);
      }}
    />
  );
}
```

- [ ] **Step 6: Create ItemCard**

Create `src/components/ItemCard.tsx`:

```tsx
import Link from "next/link";
import type { CollectionItem } from "@/lib/types";
import { ImageWithProxy } from "./ImageWithProxy";

interface ItemCardProps {
  item: CollectionItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const domain = (() => {
    try {
      return new URL(item.url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  const timeAgo = getTimeAgo(item.createdAt);

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
    >
      <ImageWithProxy
        pageId={item.id}
        directUrl={item.imageUrl}
        alt={item.title}
        className="w-12 h-12 md:w-16 md:h-16 rounded-md flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {item.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {domain}{domain && " · "}{timeAgo}
        </p>
        {item.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="text-gray-300 self-center hidden md:block">›</span>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/
git commit -m "feat: add UI components (nav, search, tags, item card, image proxy)"
```

---

## Task 5: Frontend Pages

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/add/page.tsx`, `src/app/tags/page.tsx`, `src/app/items/[id]/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout to include navigation**

Update `src/app/layout.tsx` body:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { BottomTabs } from "@/components/BottomTabs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collector",
  description: "Personal content collector",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Collector",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <NavBar />
        <main className="pb-20 md:pb-8">{children}</main>
        <BottomTabs />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create Collection page (home)**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { TagChips } from "@/components/TagChips";
import { ItemCard } from "@/components/ItemCard";
import type { CollectionItem } from "@/lib/types";

export default function CollectionPage() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("collector_token") : null;

  const fetchItems = useCallback(async (options: {
    tag?: string | null;
    search?: string;
    cursor?: string | null;
    append?: boolean;
  } = {}) => {
    if (!token) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (options.tag) params.set("tag", options.tag);
    if (options.search) params.set("search", options.search);
    if (options.cursor) params.set("cursor", options.cursor);

    try {
      const res = await fetch(`/api/items?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (options.append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTags = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch("/api/tags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTags(data.map((t: { name: string }) => t.name));
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchItems({ tag: activeTag, search });
  }, [activeTag, search, fetchItems]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setCursor(null);
  }, []);

  const handleTagClick = useCallback((tag: string | null) => {
    setActiveTag(tag);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    fetchItems({ tag: activeTag, search, cursor, append: true });
  }, [activeTag, search, cursor, fetchItems]);

  if (!token) {
    return <TokenPrompt onSubmit={() => window.location.reload()} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl font-bold text-gray-900 md:hidden mb-4">
        Collector
      </h1>

      <div className="space-y-3 mb-4">
        <SearchBar onSearch={handleSearch} />
        {tags.length > 0 && (
          <TagChips tags={tags} activeTag={activeTag} onTagClick={handleTagClick} />
        )}
      </div>

      <div className="space-y-2">
        {loading && items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No items yet. Start collecting!
          </p>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}

function TokenPrompt({ onSubmit }: { onSubmit: () => void }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      localStorage.setItem("collector_token", input.trim());
      onSubmit();
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Collector</h1>
      <p className="text-sm text-gray-500 mb-6">Enter your access token</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Bearer token"
          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-gray-900 text-white text-sm py-2.5 rounded-lg"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create Add Item page**

Create `src/app/add/page.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AddPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [comment, setComment] = useState("");
  const [preview, setPreview] = useState<{ title: string; imageUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("collector_token") : null;

  const handleUrlBlur = useCallback(async () => {
    if (!url || !token) return;

    setLoading(true);
    try {
      // Use the save endpoint's OG fetch logic via a preview call
      const res = await fetch(url, { mode: "no-cors" }).catch(() => null);
      if (res) {
        setPreview({ title: "", imageUrl: null });
      }
    } catch {
      // Preview is best-effort
    } finally {
      setLoading(false);
    }
  }, [url, token]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) return;

    setSaving(true);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          title: title || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          comment,
        }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save item");
    } finally {
      setSaving(false);
    }
  }, [url, title, tags, comment, token, router]);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Add Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://..."
            required
            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300"
          />
          {loading && (
            <p className="text-xs text-gray-400 mt-1">Fetching preview...</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title (auto-fetched if empty)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={preview?.title || "Leave empty to auto-fetch"}
            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="design, inspiration, career"
            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Your thoughts..."
            rows={3}
            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !url}
          className="w-full bg-gray-900 text-white text-sm py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Item"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create Tags page**

Create `src/app/tags/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TagWithCount } from "@/lib/types";

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("collector_token") : null;

  useEffect(() => {
    if (!token) return;

    fetch("/api/tags", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Tags</h1>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No tags yet. Add some items first!
        </p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <Link
              key={tag.name}
              href={`/?tag=${encodeURIComponent(tag.name)}`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">
                #{tag.name}
              </span>
              <span className="text-xs text-gray-400">
                {tag.count} {tag.count === 1 ? "item" : "items"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Item Detail page**

Create `src/app/items/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ImageWithProxy } from "@/components/ImageWithProxy";
import type { CollectionItem } from "@/lib/types";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("collector_token") : null;

  useEffect(() => {
    if (!token || !id) return;

    fetch(`/api/items/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setItem)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleDelete = useCallback(async () => {
    if (!token || !confirm("Delete this item?")) return;

    setDeleting(true);
    try {
      await fetch(`/api/items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }, [token, id, router]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-gray-400 text-center">Loading...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-gray-400 text-center">Item not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Back
      </button>

      {item.imageUrl && (
        <ImageWithProxy
          pageId={item.id}
          directUrl={item.imageUrl}
          alt={item.title}
          className="w-full h-48 md:h-64 rounded-lg mb-4"
        />
      )}

      <h1 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h1>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline break-all"
      >
        {item.url}
      </a>

      {item.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-4">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {item.comment && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {item.comment}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Saved {new Date(item.createdAt).toLocaleDateString()}
      </p>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          {deleting ? "Deleting..." : "Delete item"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/ src/components/
git commit -m "feat: add all frontend pages (collection, add, tags, item detail)"
```

---

## Task 6: Chrome Extension

**Files:**
- Create: `extension/manifest.json`, `extension/popup.html`, `extension/popup.js`

- [ ] **Step 1: Create extension manifest**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Collector",
  "version": "1.0.0",
  "description": "Save content to your personal collection",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon-48.png"
  }
}
```

- [ ] **Step 2: Create extension popup HTML**

Create `extension/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 320px; padding: 16px; font-family: -apple-system, system-ui, sans-serif; font-size: 13px; color: #333; }
    h1 { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    label { display: block; font-size: 11px; font-weight: 500; color: #666; margin-bottom: 4px; margin-top: 10px; }
    input, textarea { width: 100%; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 12px; background: #f8f8f8; }
    textarea { resize: none; height: 60px; }
    button { width: 100%; margin-top: 14px; padding: 10px; background: #111; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    .status { margin-top: 8px; text-align: center; font-size: 11px; }
    .status.success { color: #22c55e; }
    .status.error { color: #ef4444; }
    .setup { text-align: center; padding: 20px 0; }
    .setup input { margin-top: 8px; }
  </style>
</head>
<body>
  <div id="app">
    <h1>Collector</h1>
    <div id="setup" style="display:none" class="setup">
      <p>Enter your API URL and token:</p>
      <label>API URL</label>
      <input id="apiUrl" type="url" placeholder="https://your-app.vercel.app">
      <label>Token</label>
      <input id="apiToken" type="password" placeholder="Your bearer token">
      <button onclick="saveConfig()">Save</button>
    </div>
    <div id="form" style="display:none">
      <label>URL</label>
      <input id="url" type="url" readonly>
      <label>Title</label>
      <input id="title" type="text" placeholder="Auto-fetched if empty">
      <label>Tags (comma-separated)</label>
      <input id="tags" type="text" placeholder="design, dev, career">
      <label>Comment</label>
      <textarea id="comment" placeholder="Your thoughts..."></textarea>
      <button id="saveBtn" onclick="saveItem()">Save</button>
      <div id="status" class="status"></div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create extension popup logic**

Create `extension/popup.js`:

```javascript
const CONFIG_KEY = "collector_config";

async function init() {
  const config = await chrome.storage.local.get(CONFIG_KEY);

  if (!config[CONFIG_KEY]) {
    document.getElementById("setup").style.display = "block";
    return;
  }

  document.getElementById("form").style.display = "block";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    document.getElementById("url").value = tab.url || "";
    document.getElementById("title").value = tab.title || "";
  }
}

function saveConfig() {
  const apiUrl = document.getElementById("apiUrl").value.trim();
  const token = document.getElementById("apiToken").value.trim();

  if (!apiUrl || !token) return;

  chrome.storage.local.set({
    [CONFIG_KEY]: { apiUrl, token },
  }).then(() => {
    document.getElementById("setup").style.display = "none";
    document.getElementById("form").style.display = "block";
    init();
  });
}

async function saveItem() {
  const config = (await chrome.storage.local.get(CONFIG_KEY))[CONFIG_KEY];
  if (!config) return;

  const btn = document.getElementById("saveBtn");
  const status = document.getElementById("status");
  btn.disabled = true;
  status.textContent = "";
  status.className = "status";

  const body = {
    url: document.getElementById("url").value,
    title: document.getElementById("title").value || undefined,
    tags: document.getElementById("tags").value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    comment: document.getElementById("comment").value || undefined,
  };

  try {
    const res = await fetch(`${config.apiUrl}/api/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      status.textContent = "Saved!";
      status.className = "status success";
      setTimeout(() => window.close(), 1000);
    } else {
      const data = await res.json();
      status.textContent = data.error || "Failed to save";
      status.className = "status error";
    }
  } catch (err) {
    status.textContent = "Network error";
    status.className = "status error";
  } finally {
    btn.disabled = false;
  }
}

init();
```

- [ ] **Step 4: Commit**

```bash
git add extension/
git commit -m "feat: add Chrome extension for quick capture"
```

---

## Task 7: iOS Shortcut Documentation

**Files:**
- Create: `docs/ios-shortcut-setup.md`

- [ ] **Step 1: Write iOS Shortcut setup guide**

Create `docs/ios-shortcut-setup.md`:

```markdown
# iOS Shortcut Setup — Save to Collector

## Quick Setup

1. Open the **Shortcuts** app on your iPhone
2. Tap **+** to create a new shortcut
3. Name it "Save to Collector"

## Actions (in order)

### Action 1: Receive input from Share Sheet
- Accept: **URLs** only

### Action 2: Ask for Input (optional)
- Prompt: "Tags (comma-separated):"
- Input type: Text
- Default: leave empty

### Action 3: Get Contents of URL
- URL: `https://YOUR-APP.vercel.app/api/save`
- Method: **POST**
- Headers:
  - `Authorization`: `Bearer YOUR_TOKEN`
  - `Content-Type`: `application/json`
- Request Body (JSON):
  ```json
  {
    "url": "[Shortcut Input]",
    "tags": "[Split text by comma from Action 2]"
  }
  ```

### Action 4: Show Notification
- Title: "Saved!"
- Body: "Item added to Collector"

## Usage

1. In Safari, tap the **Share** button
2. Select **"Save to Collector"** from the share sheet
3. Optionally enter tags when prompted
4. Done — item is saved with auto-fetched title and image

## Tips

- To skip the tag prompt, remove Action 2 and the tags field from the JSON body
- The server automatically fetches the page title and OG image
- Works from any app that shares URLs (Twitter, Reddit, etc.)
```

- [ ] **Step 2: Commit**

```bash
git add docs/
git commit -m "docs: add iOS Shortcut setup guide"
```

---

## Task 8: Notion Database Setup & Deployment

**Files:**
- Create: `docs/notion-setup.md`

- [ ] **Step 1: Write Notion setup guide**

Create `docs/notion-setup.md`:

```markdown
# Notion Database Setup

## 1. Create the Integration

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name: "Collector"
4. Select your workspace
5. Capabilities: Read, Update, Insert content
6. Copy the **Internal Integration Secret** → this is your `NOTION_API_KEY`

## 2. Create the Database

1. Create a new full-page database in Notion
2. Add these properties (exact names matter):

| Property Name | Type |
|--------------|------|
| Title | Title (default) |
| URL | URL |
| Image | Files & media |
| Tags | Multi-select |
| Comment | Text |
| Created | Created time |

3. Copy the database ID from the URL:
   `https://notion.so/YOUR_WORKSPACE/DATABASE_ID?v=...`
   The 32-character hex string before `?v=` is your `NOTION_DATABASE_ID`

## 3. Connect the Integration

1. Open the database page in Notion
2. Click "..." menu → "Connections" → "Add connection"
3. Select your "Collector" integration

## 4. Deploy to Vercel

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Add environment variables:
   - `NOTION_API_KEY` = your integration secret
   - `NOTION_DATABASE_ID` = your database ID
   - `AUTH_TOKEN` = any secret string you choose (used for API auth)
5. Deploy

## 5. Verify

```bash
curl -X POST https://YOUR-APP.vercel.app/api/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "tags": ["test"]}'
```

Should return the saved item as JSON.
```

- [ ] **Step 2: Commit**

```bash
git add docs/
git commit -m "docs: add Notion database and deployment setup guide"
```

---

## Task 9: End-to-End Testing

**Files:**
- Create: `src/lib/__tests__/og.test.ts`, `src/lib/__tests__/auth.test.ts`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add vitest config**

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 3: Write auth tests**

Create `src/lib/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("validateAuth", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_TOKEN", "test-secret-token");
  });

  it("returns null for valid token", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer test-secret-token" },
    });
    expect(validateAuth(request)).toBeNull();
  });

  it("returns 401 for missing header", () => {
    const request = new NextRequest("http://localhost/api/test");
    const response = validateAuth(request);
    expect(response?.status).toBe(401);
  });

  it("returns 401 for wrong token", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    const response = validateAuth(request);
    expect(response?.status).toBe(401);
  });

  it("returns 500 when AUTH_TOKEN not configured", () => {
    vi.stubEnv("AUTH_TOKEN", "");
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer anything" },
    });
    const response = validateAuth(request);
    expect(response?.status).toBe(500);
  });
});
```

- [ ] **Step 4: Write OG extraction tests**

Create `src/lib/__tests__/og.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { fetchOgData } from "@/lib/og";

describe("fetchOgData", () => {
  it("extracts og:title and og:image", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Test Article">
          <meta property="og:image" content="https://example.com/img.jpg">
        </head>
      </html>
    `;

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200 })
    );

    const result = await fetchOgData("https://example.com/article");
    expect(result.title).toBe("Test Article");
    expect(result.imageUrl).toBe("https://example.com/img.jpg");
  });

  it("falls back to title tag", async () => {
    const html = `<html><head><title>Fallback Title</title></head></html>`;

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200 })
    );

    const result = await fetchOgData("https://example.com");
    expect(result.title).toBe("Fallback Title");
    expect(result.imageUrl).toBeNull();
  });

  it("returns defaults on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("timeout"));

    const result = await fetchOgData("https://broken.com");
    expect(result.title).toBe("Untitled");
    expect(result.imageUrl).toBeNull();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/lib/__tests__/ package.json
git commit -m "test: add unit tests for auth and OG extraction"
```

---

## Task 10: Final Polish & README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md`:

```markdown
# Collector

Personal content collector PWA backed by Notion.

## Features

- Save links with auto-fetched thumbnails and titles
- Tag and comment on saved items
- Search and filter your collection
- Chrome extension for one-click save
- iOS Shortcut for mobile capture
- Installable as PWA on iPhone

## Quick Start

1. Set up Notion database (see `docs/notion-setup.md`)
2. Clone and install:
   ```bash
   npm install
   cp .env.local.example .env.local
   # Fill in your Notion API key, database ID, and auth token
   npm run dev
   ```
3. Open http://localhost:3000

## Deployment

Push to GitHub and import on [Vercel](https://vercel.com). Add env vars and deploy.

## Capture Methods

- **Chrome Extension**: Load `extension/` folder in chrome://extensions (developer mode)
- **iOS Shortcut**: Follow guide in `docs/ios-shortcut-setup.md`
- **In-App**: Use the "+ Add" button

## Tech Stack

Next.js · TypeScript · Tailwind CSS · Notion API · Vercel
```

- [ ] **Step 2: Create .env.local.example**

Create `.env.local.example`:

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=your-secret-bearer-token
```

- [ ] **Step 3: Final build check**

```bash
npm run build && npm run test:run
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add README.md .env.local.example
git commit -m "docs: add README and env example"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|----------------|
| 1 | Project scaffolding | 9 |
| 2 | Types & Notion client | 4 |
| 3 | API routes | 8 |
| 4 | Frontend components | 7 |
| 5 | Frontend pages | 7 |
| 6 | Chrome extension | 4 |
| 7 | iOS Shortcut docs | 2 |
| 8 | Notion setup & deploy docs | 2 |
| 9 | Tests | 6 |
| 10 | Final polish | 4 |

**Total: 10 tasks, ~53 steps**

Tasks 1-5 are sequential (each builds on previous). Tasks 6-8 are independent and can be parallelized. Task 9 depends on tasks 2-3. Task 10 is last.
