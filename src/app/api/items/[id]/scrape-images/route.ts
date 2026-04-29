import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/notion";
import { extractPageImages } from "./extract";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItem(id);

    if (!item.url) {
      return NextResponse.json({ error: "Item has no URL" }, { status: 400 });
    }

    // Block SSRF: private IPs, localhost, metadata endpoints
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(item.url);
    } catch {
      return NextResponse.json({ error: "Item URL is invalid" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const blocked = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    if (blocked.some((re) => re.test(hostname))) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let html: string;
    try {
      const response = await fetch(item.url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; info-collector-bot/1.0)" },
      });
      html = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    const images = extractPageImages(html, item.url);
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error scraping images:", error);
    const message = error instanceof Error ? error.message : "Failed to scrape images";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
