# Collector

A personal link/image collection app backed by Notion. Save URLs from any device (including iPhone via Apple Shortcuts), browse your collection as a visual grid, tag and annotate items.

## Features

- Save any URL with auto-fetched title and og:image
- Visual grid with horizontal image gallery in detail view
- Tag management (add, remove, rename, merge)
- Per-item sync — re-fetches title and images from source URL
- Inline comment editing
- PWA installable on iOS/Android
- iOS Share Sheet integration via Apple Shortcuts
- Force light theme (consistent on all devices)

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Notion API** as database backend
- **Tailwind CSS** for styling
- **Vercel** for hosting
- **Vitest** for testing

---

## Local Development

### Prerequisites

- Node.js 18+
- A Notion account with an integration token
- A Notion database (see [Notion Setup](#notion-setup))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local
```

`.env.local` contents:

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API key for the /api/save endpoint (used by iOS Shortcut and the Add page)
SAVE_API_KEY=your-secret-key-here

# Same value — baked into the client bundle so the browser can call /api/save
NEXT_PUBLIC_SAVE_API_KEY=your-secret-key-here
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run tests

```bash
npm test          # watch mode
npm run test:run  # single run (CI)
```

---

## Notion Setup

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new internal integration. Copy the **Internal Integration Token** → `NOTION_API_KEY`.

2. Create a Notion database with these properties:

   | Property | Type         |
   |----------|--------------|
   | Title    | Title        |
   | URL      | URL          |
   | Tags     | Multi-select |
   | Image    | Files        |
   | Comment  | Text         |

3. Open the database in Notion, click **...** → **Add connections** → select your integration.

4. Copy the database ID from the URL:
   `https://www.notion.so/{workspace}/{DATABASE_ID}?v=...`
   → `NOTION_DATABASE_ID`

---

## Deploy to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MIAeh/journal-collector)

### Manual deploy

1. Push your branch to GitHub.
2. Import the repo in [vercel.com/new](https://vercel.com/new).
3. Add the four environment variables from `.env.local` in the Vercel project settings.
4. Vercel builds and deploys automatically on every push to the default branch.

> **Default branch:** `feat/task-2-shared-types-notion-client` is the production branch Vercel tracks. Any push to it triggers a deployment.

---

## iOS Shortcut (Save from Share Sheet)

1. In the Shortcuts app, create a new shortcut with **Receive input from Share Sheet** (URLs).
2. Add a **Get Contents of URL** action:
   - URL: `https://your-app.vercel.app/api/save`
   - Method: POST
   - Headers: `x-api-key: <SAVE_API_KEY>`, `Content-Type: application/json`
   - Body (JSON): `{"url": "<shared URL>"}`
3. Add the shortcut to your Home Screen or use it from the Share Sheet in Safari.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Home — grid of all items, tag filter, search
│   ├── add/page.tsx                 # Manual add form
│   ├── tags/page.tsx                # Tag management (rename, merge, delete)
│   ├── items/[id]/
│   │   ├── page.tsx                 # Item detail — gallery, tags, sync, delete
│   │   └── edit/page.tsx            # Edit title, comment, images
│   ├── api/
│   │   ├── save/route.ts            # POST /api/save — create item (iOS Shortcut)
│   │   ├── items/route.ts           # GET /api/items — paginated list
│   │   ├── items/[id]/route.ts      # GET / PATCH / DELETE /api/items/:id
│   │   ├── items/[id]/sync/route.ts          # POST — re-fetch title & og:images from source
│   │   ├── items/[id]/scrape-images/route.ts # POST — scrape all <img> tags from URL
│   │   ├── items/[id]/upload-image/route.ts  # POST — upload image file to Notion
│   │   ├── image-proxy/route.ts     # GET — proxy image bytes through Vercel
│   │   └── tags/                    # GET list, PATCH rename, POST merge, DELETE
│   ├── globals.css                  # Tailwind base + force light color-scheme
│   └── layout.tsx                   # Root layout — NavBar + BottomTabs
│
├── components/
│   ├── ImageWithProxy.tsx           # <img> with direct-URL-first + proxy fallback
│   ├── ItemCard.tsx                 # Grid card — image, title, first tag
│   ├── TagChips.tsx                 # Horizontal scrollable tag filter chips
│   ├── SearchBar.tsx                # Debounced search input
│   ├── NavBar.tsx                   # Top nav (desktop)
│   └── BottomTabs.tsx               # Bottom tab bar (mobile)
│
└── lib/
    ├── notion.ts                    # All Notion API calls (CRUD + image helpers)
    ├── types.ts                     # Shared TypeScript types
    ├── cache.ts                     # sessionStorage cache keys + clearCollectionCache()
    ├── tag-ops.ts                   # Tag rename / merge logic
    └── og.ts                        # OG metadata fetch helper
```

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/items` | — | List items (paginated, `?cursor=`) |
| `POST` | `/api/save` | `x-api-key` | Create item from URL |
| `GET` | `/api/items/:id` | — | Get single item |
| `PATCH` | `/api/items/:id` | — | Update title / tags / comment / images |
| `DELETE` | `/api/items/:id` | — | Delete item |
| `POST` | `/api/items/:id/sync` | — | Re-fetch title & og:images from source |
| `POST` | `/api/items/:id/scrape-images` | — | Scrape all `<img> tags from source |
| `POST` | `/api/items/:id/upload-image` | — | Upload image file, store in Notion |
| `GET` | `/api/image-proxy` | — | Proxy image bytes (`?url=` or `?pageId=`) |
| `GET` | `/api/tags` | — | List all tags with counts |
| `PATCH` | `/api/tags/:name` | — | Rename tag |
| `POST` | `/api/tags/merge` | — | Merge two tags |
| `DELETE` | `/api/tags/:name` | — | Delete tag from all items |
