import { NextRequest, NextResponse } from "next/server";
import { saveItem } from "@/lib/notion";
import { fetchOgData } from "@/lib/og";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title, images, tags, comment } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    let finalTitle = title as string | undefined;
    let finalImages = (images as string[] | undefined) ?? [];

    if (!finalTitle || finalImages.length === 0) {
      const ogData = await fetchOgData(url);
      finalTitle = finalTitle || ogData.title;
      if (finalImages.length === 0 && ogData.imageUrl) {
        finalImages = [ogData.imageUrl];
      }
    }

    const item = await saveItem({
      url,
      title: finalTitle,
      images: finalImages,
      tags: tags || [],
      comment: comment || undefined,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error saving item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save item" },
      { status: 500 }
    );
  }
}
