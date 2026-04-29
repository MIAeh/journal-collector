import { NextRequest, NextResponse } from "next/server";
import { getImageUrl } from "@/lib/notion";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const pageId = searchParams.get("pageId");

    let imageUrl: string | null = null;

    if (url) {
      imageUrl = url;
    } else if (pageId) {
      imageUrl = await getImageUrl(pageId);
    } else {
      return NextResponse.json(
        { error: "url or pageId query parameter is required" },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Redirect the browser directly to the image URL instead of proxying bytes
    // through Vercel's US servers. CDNs like XHS block Vercel IPs but allow
    // direct browser requests (especially with a VPN). The browser follows the
    // redirect and fetches the image itself.
    return NextResponse.redirect(imageUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=3300",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to proxy image" },
      { status: 500 }
    );
  }
}
