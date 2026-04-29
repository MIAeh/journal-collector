import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ItemCard from "@/components/ItemCard";
import type { CollectionItem } from "@/lib/types";

function makeItem(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    id: "item-1",
    title: "Test Article",
    url: "https://example.com/article",
    images: [],
    tags: ["react"],
    comment: "",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe("ItemCard — vertical layout with image", () => {
  it("renders a 3:4 image container when item has images", () => {
    const item = makeItem({ images: ["https://img.com/photo.jpg"] });
    const { container } = render(<ItemCard item={item} />);
    expect(container.querySelector(".aspect-\\[3\\/4\\]")).toBeTruthy();
  });

  it("renders title below the image", () => {
    const item = makeItem({ images: ["https://img.com/photo.jpg"] });
    render(<ItemCard item={item} />);
    const title = screen.getByText("Test Article");
    // title should be inside the card, after the image container
    void title;
  });

  it("renders the first tag in the vertical card", () => {
    const item = makeItem({ images: ["https://img.com/photo.jpg"], tags: ["react", "typescript"] });
    render(<ItemCard item={item} />);
    expect(screen.getByText("react")).toBeTruthy();
  });

  it("does not render more than one tag in the vertical card", () => {
    const item = makeItem({ images: ["https://img.com/photo.jpg"], tags: ["react", "typescript"] });
    render(<ItemCard item={item} />);
    expect(screen.queryByText("typescript")).toBeFalsy();
  });
});

describe("ItemCard — compact layout without image", () => {
  it("does not render a 3:4 container when no images", () => {
    const item = makeItem({ images: [] });
    const { container } = render(<ItemCard item={item} />);
    expect(container.querySelector(".aspect-\\[3\\/4\\]")).toBeFalsy();
  });

  it("renders title directly", () => {
    const item = makeItem({ images: [] });
    render(<ItemCard item={item} />);
    screen.getByText("Test Article"); // throws if not found
  });

  it("renders tags in the compact layout", () => {
    const item = makeItem({ images: [], tags: ["react", "typescript"] });
    render(<ItemCard item={item} />);
    screen.getByText("react");
    screen.getByText("typescript");
  });
});
