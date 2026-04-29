import { describe, it, expect } from "vitest";
import { extractPageImages } from "@/app/api/items/[id]/scrape-images/extract";

describe("extractPageImages", () => {
  it("extracts og:image", () => {
    const html = `<meta property="og:image" content="https://example.com/og.jpg">`;
    expect(extractPageImages(html, "https://example.com/page")).toContain(
      "https://example.com/og.jpg"
    );
  });

  it("extracts img src tags", () => {
    const html = `<img src="https://example.com/photo.jpg" alt="photo">`;
    expect(extractPageImages(html, "https://example.com/page")).toContain(
      "https://example.com/photo.jpg"
    );
  });

  it("resolves relative img src to absolute", () => {
    const html = `<img src="/images/logo.png">`;
    expect(extractPageImages(html, "https://example.com/page")).toContain(
      "https://example.com/images/logo.png"
    );
  });

  it("deduplicates URLs", () => {
    const html = `
      <meta property="og:image" content="https://example.com/og.jpg">
      <img src="https://example.com/og.jpg">
    `;
    const result = extractPageImages(html, "https://example.com/page");
    expect(result.filter((u) => u === "https://example.com/og.jpg")).toHaveLength(1);
  });

  it("skips data: URLs", () => {
    const html = `<img src="data:image/gif;base64,R0lGOD">`;
    expect(extractPageImages(html, "https://example.com/page")).not.toContain(
      expect.stringContaining("data:")
    );
  });
});
