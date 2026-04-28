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
