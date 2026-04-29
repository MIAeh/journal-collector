import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockClient } = vi.hoisted(() => {
  const mockClient = {
    databases: {
      retrieve: vi.fn(),
      update: vi.fn(),
      query: vi.fn(),
    },
    pages: {
      retrieve: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
  return { mockClient };
});

vi.hoisted(() => {
  process.env.NOTION_API_KEY = "test-key";
  process.env.NOTION_DATABASE_ID = "test-db-id";
});

vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(function () {
    return mockClient;
  }),
}));

import { getItem, updateItem, saveItem } from "@/lib/notion";

function makePage(overrides: Record<string, unknown> = {}) {
  return {
    id: "page-1",
    created_time: "2024-01-01T00:00:00.000Z",
    properties: {
      Title: { title: [{ plain_text: "Test" }] },
      URL: { url: "https://example.com" },
      Tags: { multi_select: [] },
      Comment: { rich_text: [] },
      Image: { type: "files", files: [] },
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItem — images field", () => {
  it("returns empty array when no images", async () => {
    mockClient.pages.retrieve.mockResolvedValueOnce(makePage());
    const item = await getItem("page-1");
    expect(item.images).toEqual([]);
  });

  it("returns multiple external image URLs", async () => {
    mockClient.pages.retrieve.mockResolvedValueOnce(
      makePage({
        Image: {
          type: "files",
          files: [
            { type: "external", name: "a", external: { url: "https://img.com/a.jpg" } },
            { type: "external", name: "b", external: { url: "https://img.com/b.jpg" } },
          ],
        },
      })
    );
    const item = await getItem("page-1");
    expect(item.images).toEqual(["https://img.com/a.jpg", "https://img.com/b.jpg"]);
  });

  it("returns URLs from notion-hosted files", async () => {
    mockClient.pages.retrieve.mockResolvedValueOnce(
      makePage({
        Image: {
          type: "files",
          files: [
            {
              type: "file",
              name: "img",
              file: { url: "https://notion.so/secure/img.jpg", expiry_time: "2024-01-02T00:00:00.000Z" },
            },
          ],
        },
      })
    );
    const item = await getItem("page-1");
    expect(item.images).toEqual(["https://notion.so/secure/img.jpg"]);
  });
});

describe("updateItem — images field", () => {
  it("sets Images Files property to provided URLs", async () => {
    const updatedPage = makePage({
      Image: {
        type: "files",
        files: [{ type: "external", name: "Image", external: { url: "https://img.com/c.jpg" } }],
      },
    });
    mockClient.pages.update.mockResolvedValueOnce(updatedPage);

    await updateItem("page-1", { images: ["https://img.com/c.jpg"] });

    expect(mockClient.pages.update).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: "page-1",
        properties: expect.objectContaining({
          Image: {
            files: [
              { type: "external", name: "Image", external: { url: "https://img.com/c.jpg" } },
            ],
          },
        }),
      })
    );
  });

  it("clears Images when empty array passed", async () => {
    mockClient.pages.update.mockResolvedValueOnce(makePage());

    await updateItem("page-1", { images: [] });

    expect(mockClient.pages.update).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          Image: { files: [] },
        }),
      })
    );
  });
});

describe("saveItem — images field", () => {
  it("sets Image files when images array is provided", async () => {
    const page = makePage({
      Image: {
        type: "files",
        files: [{ type: "external", name: "Image", external: { url: "https://img.com/a.jpg" } }],
      },
    });
    mockClient.pages.create.mockResolvedValueOnce(page);

    await saveItem({ url: "https://example.com", images: ["https://img.com/a.jpg"] });

    expect(mockClient.pages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          Image: {
            files: [{ type: "external", name: "Image", external: { url: "https://img.com/a.jpg" } }],
          },
        }),
      })
    );
  });

  it("omits Image property when images array is empty", async () => {
    mockClient.pages.create.mockResolvedValueOnce(makePage());

    await saveItem({ url: "https://example.com", images: [] });

    const call = mockClient.pages.create.mock.calls[0][0];
    expect(call.properties).not.toHaveProperty("Image");
  });
});
