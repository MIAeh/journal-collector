import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/notion";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5 MB)" },
        { status: 400 }
      );
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Upload file to Notion
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const uploadResponse = await fetch("https://api.notion.com/v1/file_uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
      },
      body: uploadForm,
    });

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      console.error("Notion file upload error:", err);
      return NextResponse.json({ error: "Failed to upload to Notion" }, { status: 502 });
    }

    const uploadData = await uploadResponse.json() as { id?: string };
    const fileUploadId = uploadData.id;

    if (!fileUploadId) {
      return NextResponse.json({ error: "Unexpected response from Notion" }, { status: 502 });
    }

    // Get current images, append the file_upload reference
    const item = await getItem(id);
    const currentImages = item.images;

    // Patch using raw Notion API (file_upload type not supported by SDK helper)
    const patchResponse = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          Image: {
            files: [
              ...currentImages.map((url) => ({
                type: "external",
                name: "Image",
                external: { url },
              })),
              { type: "file_upload", file_upload: { id: fileUploadId } },
            ],
          },
        },
      }),
    });

    if (!patchResponse.ok) {
      const err = await patchResponse.text();
      console.error("Notion patch error:", err);
      return NextResponse.json({ error: "Failed to attach image to item" }, { status: 502 });
    }

    // Re-fetch to get the final hosted URL
    const updatedItem = await getItem(id);
    const newUrl = updatedItem.images[updatedItem.images.length - 1];

    if (!newUrl) {
      return NextResponse.json({ error: "Image attached but URL unavailable" }, { status: 500 });
    }

    return NextResponse.json({ url: newUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}
