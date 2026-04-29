# Item Edit, Multi-Image & Quick Tag Change Design

**Goal:** Add full item editing, multiple images per item, and inline tag editing on the detail page.

**Architecture:** Data model changes `imageUrl: string | null` to `images: string[]`. New edit page handles title, comment, and image management. Inline tag chips on the detail page handle fast tag changes. New server routes handle image scraping and Notion file uploads.

**Tech Stack:** Next.js 16 App Router, `@notionhq/client`, Tailwind CSS, Vitest

---

## Data Model

### `CollectionItem` type change

```typescript
// Before
imageUrl: string | null;

// After
images: string[];  // first entry is the primary/display image
```

All consumers of `imageUrl` update to `images[0] ?? null`.

### Notion Files property

The `Files` property already supports multiple entries. Currently only `files[0]` is read. Update `notion.ts` to read all entries via a new `extractImages(page)` helper that replaces `extractImageUrl(page)`.

Each entry is either:
- `{ type: "external", external: { url } }` — external URL, never expires
- `{ type: "file", file: { url, expiry_time } }` — Notion-hosted, URL expires in ~1hr

The existing image proxy at `/api/image-proxy` already handles re-fetching on expiry for the primary image. For the edit page gallery, images are fetched fresh via the API.

---

## Card Layout

On the home page (`/`), `ItemCard` changes to a **vertical card** when the item has images:

```
┌─────────────────────────────────┐
│                                 │
│      image (16:9, full width)   │
│                                 │
├─────────────────────────────────┤
│ Title                           │
│ domain.com · 2d ago   #tag1     │
└─────────────────────────────────┘
```

Items with **no image** keep the current compact horizontal row (thumbnail placeholder + text). No wasted space for link-only saves.

---

## Detail Page (`/items/[id]`)

### Layout

```
┌─────────────────────────────┐
│ ← Back              ✎ Edit │
├─────────────────────────────┤
│   [  image  16:9 banner  ]  │
│   ○ ● ○  (dot indicators)  │
├─────────────────────────────┤
│ Title                       │
│ domain.com · 2d ago         │
├─────────────────────────────┤
│ react ×  typescript ×  +   │
├─────────────────────────────┤
│ Comment text...             │
└─────────────────────────────┘
```

### Inline tag editor

- Tags render as chips: `#name ×`
- Tapping `×` removes the tag and immediately PATCHes `PATCH /api/items/[id]` with the updated array
- Tapping `+` opens a small dropdown of all existing tags from `GET /api/tags`; selecting one adds it and PATCHes immediately
- Tags already on the item are excluded from the dropdown
- No save button — each change is instant

### Image gallery

- Primary image shown as 16:9 banner
- If `images.length > 1`, dot indicators show below the banner; tapping a dot swaps the displayed image
- No image editing here — that's on the edit page

### Edit link

- `✎ Edit` text button in the top-right header navigates to `/items/[id]/edit`

---

## Edit Page (`/items/[id]/edit`)

### Layout

```
┌─────────────────────────────┐
│ ← Back              Save   │
├─────────────────────────────┤
│ Title                       │
│ ┌─────────────────────────┐ │
│ │ Article title here      │ │
│ └─────────────────────────┘ │
│ Comment                     │
│ ┌─────────────────────────┐ │
│ │ My notes...             │ │
│ └─────────────────────────┘ │
│ Images                      │
│ [img1 ×] [img2 ×] [ + ]   │
│  Scrape · URL · Upload      │
└─────────────────────────────┘
```

### Fields

- **Title** — text input, required
- **Comment** — textarea, optional
- **Images** — gallery manager (see below)
- **URL** — displayed as a read-only link (changing URL = different item)
- **Tags** — not on this page; handled inline on detail page

### Image manager

Current images: row of 64×64 thumbnails, each with `×` to remove. Removals are held in local state until Save.

Three add methods below the thumbnail row:

1. **Scrape** — calls `GET /api/items/[id]/scrape-images`; shows a modal grid of all `<img>` and OG images found on the saved URL; tap any to queue it for addition
2. **URL** — text input + "Add" button; validates it starts with `http`; queues the URL
3. **Upload** — `<input type="file" accept="image/*">`; sends to `POST /api/items/[id]/upload-image`; server uploads to Notion and returns the file URL; queues it

### Save behavior

Single "Save" button at top-right. On click:
- Sends `PATCH /api/items/[id]` with `{ title, comment, images }` — the full resolved images array (pending additions included, removed ones excluded)
- On success: navigate back to `/items/[id]`
- On error: show inline error message, stay on page

---

## New & Changed API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `PATCH` | `/api/items/[id]` | Already exists; update to handle `images[]` |
| `GET` | `/api/items/[id]/scrape-images` | Fetch saved URL, extract all image URLs |
| `POST` | `/api/items/[id]/upload-image` | Receive file, upload to Notion, return URL |

### `GET /api/items/[id]/scrape-images`

1. Fetch the item to get its URL
2. HTTP GET the saved URL (with a 5s timeout)
3. Parse HTML: extract `<img src>` attributes + `og:image` meta tag
4. Resolve relative URLs to absolute
5. Deduplicate, return array of strings

### `POST /api/items/[id]/upload-image`

1. Receive `multipart/form-data` with `file` field
2. Upload to Notion via `POST https://api.notion.com/v1/files/upload` with the binary
3. Notion returns a `file_upload` object with an ID
4. Return `{ url }` to the client (the client queues it; actual save happens on the Save button)

---

## Changes to `notion.ts`

- `extractImageUrl(page)` → `extractImages(page): string[]` — reads all Files entries, returns array of current URLs
- `pageToItem(page)` — `imageUrl` field removed, `images: string[]` added
- `updateItem()` — handle `images?: string[]` in the update payload, mapping to Notion Files property entries (`{ type: "external", external: { url }, name: "Image" }` for each)

---

## `ImageWithProxy` component

Update to accept `images: string[]` instead of `directUrl: string | null`. The proxy fallback applies only to `images[0]`.

---

## Scope: what is NOT included

- Reordering images (drag-to-reorder)
- Editing the URL field
- Creating new tags from the detail page (use `/tags` page)
- Bulk editing multiple items
