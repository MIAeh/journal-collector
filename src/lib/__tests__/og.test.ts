import { describe, it, expect, vi } from "vitest";
import { fetchOgData } from "@/lib/og";

describe("fetchOgData", () => {
  it("extracts og:title and og:image", async () => {
    const html = `<html><head><meta property="og:title" content="Test Article"><meta property="og:image" content="https://example.com/img.jpg"></head></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(html, { status: 200 }));

    const result = await fetchOgData("https://example.com/article");
    expect(result.title).toBe("Test Article");
    expect(result.imageUrl).toBe("https://example.com/img.jpg");
  });

  it("falls back to title tag", async () => {
    const html = `<html><head><title>Fallback Title</title></head></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(html, { status: 200 }));

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
