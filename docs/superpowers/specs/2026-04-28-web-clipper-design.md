# Web Clipper — Personal Content Collector

**Date:** 2026-04-28
**Status:** Approved

## Overview

A personal content collection app for saving useful posts found while browsing online. Each item includes a source link, thumbnail image, tags, and comments. The app uses Notion as the database backend and is deployed as a PWA installable on iPhone and accessible from any browser.

## Problem

When browsing online, useful content is scattered across tabs, bookmarks, and screenshots with no central, searchable, tagged archive for journaling purposes.

## Solution

A minimal web app (Next.js PWA on Vercel) backed by a Notion database, with three capture methods: Chrome extension, iOS Shortcut, and in-app form.

## Data Model (Notion Database)

| Property | Type | Purpose |
|----------|------|---------|
| Title | title | Auto-fetched page title (editable) |
| URL | url | Source link |
| Image | files | OG image or uploaded screenshot |
| Tags | multi_select | User-defined tags (free-form) |
| Comment | rich_text | Personal notes/thoughts |
| Created | created_time | Auto-set when saved |

## System Architecture

```
Capture Layer
├── Chrome Extension (Manifest V3, popup UI)
├── iOS Shortcut (Shortcuts app → API call)
└── In-App Form (manual add with URL auto-preview)
        │
        ▼
Next.js API Routes (Vercel)
├── POST   /api/save         — save new item
├── GET    /api/items        — list items (paginated, filterable)
├── GET    /api/tags         — list all tags with counts
├── DELETE /api/items/:id    — remove item
├── PATCH  /api/items/:id    — edit item (tags, comment, image)
├── GET    /api/image-proxy  — proxy expired Notion file URLs
        │
        ▼
Notion API (single database)
```

## Authentication

Single-user app. A bearer token stored as a Vercel environment variable (`AUTH_TOKEN`). All API routes check `Authorization: Bearer <token>`. The app URL itself is unlisted — security through obscurity plus token validation.

## UI Design

### Layout
- **Style:** Minimal/clean, light theme, generous whitespace
- **View:** List with thumbnails (rows showing: thumbnail, title, source domain, relative date, tags)
- **Navigation:**
  - Mobile: bottom tab bar (Collection / Add / Tags)
  - Desktop: top nav bar with same links + "+ Add New" button

### Pages (4 total)

1. **Collection (Home)** — Search bar + tag filter chips + paginated list (20 items/page). Default sort: newest first.
2. **Item Detail** — Full-size image, clickable source link, all tags, comment. Edit and delete actions.
3. **Add Item** — URL input with auto-preview (title + OG image fetched), tag picker with autocomplete, comment textarea, manual image upload option.
4. **Tags** — All tags listed with item counts. Tap a tag to jump to filtered collection view.

### Responsive Behavior
- Mobile-first design, breakpoint at 768px
- List items stack naturally on narrow screens
- Tag chips scroll horizontally on mobile

## Capture Flows

### Chrome Extension
- Manifest V3, `activeTab` permission only
- Popup UI: shows current page title + URL (auto-filled), tag input with autocomplete, optional comment
- Calls `POST /api/save` with bearer token
- Shows success/error toast

### iOS Shortcut
- Built with Apple Shortcuts app (no native app needed)
- Triggered via Safari Share Sheet → "Save to Collector"
- Sends current page URL to `POST /api/save`
- Optional: prompts for tags via Shortcuts "Ask for Input" action
- Server handles title/image fetching

### In-App Form
- Available at `/add` route
- Paste URL → app fetches and shows preview (title, thumbnail)
- Tag picker with autocomplete from existing tags
- Comment textarea
- Image upload dropzone (overrides auto-fetched OG image)
- Submit → saves to Notion

## Image Handling

### Auto-Fetch (OG Image)
- On save, server fetches the page HTML
- Extracts `og:image` meta tag content
- Falls back to: `twitter:image` → first large `<img>` → generated placeholder with site favicon
- Stores image URL in Notion Files property

### Manual Upload
- User can upload a screenshot/image via the in-app form or Chrome extension
- Uploaded to Notion's file hosting via their API
- Replaces auto-fetched image

### Image Proxy (Expired URLs)
- Notion file URLs expire after 1 hour
- `/api/image-proxy?pageId=xxx` fetches fresh URL from Notion API
- Returns 302 redirect to the fresh URL
- Sets `Cache-Control: max-age=3300` (~55 minutes) for client caching
- App renders images via this proxy endpoint

## Search & Filtering

- **Tag filter:** Multi-select chips at top of collection. Active tag filters items via Notion's filter API.
- **Search:** Text input searches across Title and Comment properties using Notion's database query with filter conditions.
- **Pagination:** Cursor-based using Notion's `start_cursor` / `has_more` response fields. 20 items per page.

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Notion API (via `@notionhq/client`) |
| Hosting | Vercel (free hobby tier) |
| PWA | `next-pwa` package |
| Extension | Chrome Manifest V3 |
| Mobile | iOS Shortcuts (no native code) |

## PWA Configuration

- Service worker caches app shell for instant load
- Web app manifest: standalone display, app icon, splash screen
- iPhone users: Safari → Share → "Add to Home Screen"
- Offline: app shell loads from cache; data requires network (no offline queue in v1)

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_DATABASE_ID` | Target database ID |
| `AUTH_TOKEN` | Bearer token for API auth |

## Deployment

- GitHub repository → Vercel auto-deploy on push
- Free `*.vercel.app` subdomain (custom domain optional)
- Zero infrastructure to maintain

## Performance Considerations

- Notion API rate limit: 3 requests/second (sufficient for single user)
- Image proxy caching reduces Notion API calls
- Client-side tag list cached (refreshed on add/edit)
- Pagination prevents loading entire collection at once

## Future Enhancements (Not in v1)

- Dark mode toggle
- Bulk tag operations
- Export to markdown
- Firefox extension
- Full-text search via cached index (if Notion search proves too slow)

## Non-Goals

- Multi-user support
- Social features / sharing
- Native mobile app
- Real-time sync / WebSocket
- AI-powered tagging (can add later)
