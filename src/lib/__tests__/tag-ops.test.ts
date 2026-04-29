import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures the shared instance is available inside vi.mock factory
const { mockDatabases, mockPages } = vi.hoisted(() => ({
  mockDatabases: {
    retrieve: vi.fn(),
    update: vi.fn(),
    query: vi.fn(),
  },
  mockPages: {
    update: vi.fn(),
  },
}));

// Mock @notionhq/client — every new Client() returns the same databases/pages objects
vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(function () {
    return {
      databases: mockDatabases,
      pages: mockPages,
      search: vi.fn(),
    };
  }),
}));

// Stub env via vi.hoisted so the values are in place before any module body runs
vi.hoisted(() => {
  process.env.NOTION_API_KEY = "test-key";
  process.env.NOTION_DATABASE_ID = "test-db-id";
});

import { getTagOptions, createTag, renameTag, deleteTag, mergeTag } from "@/lib/tag-ops";
import { Client } from "@notionhq/client";

// mockClient.databases === mockDatabases, mockClient.pages === mockPages — same vi.fn() references
const mockClient = new (Client as any)();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTagOptions", () => {
  it("returns options from multi_select schema", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "javascript", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });

    const options = await getTagOptions();
    expect(options).toEqual([
      { id: "id1", name: "javascript", color: "blue" },
      { id: "id2", name: "react", color: "green" },
    ]);
  });

  it("returns empty array when Tags property is missing", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({ properties: {} });
    const options = await getTagOptions();
    expect(options).toEqual([]);
  });
});

describe("createTag", () => {
  it("adds a new option to the schema", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [{ id: "id1", name: "javascript", color: "blue" }],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await createTag("typescript");

    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [
              { id: "id1", name: "javascript", color: "blue" },
              { name: "typescript" },
            ],
          },
        },
      },
    });
  });

  it("throws if tag already exists", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [{ id: "id1", name: "javascript", color: "blue" }],
          },
        },
      },
    });

    await expect(createTag("javascript")).rejects.toThrow("Tag already exists");
  });
});

describe("renameTag", () => {
  it("updates the option name in the schema by id", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await renameTag("js", "javascript");

    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [
              { id: "id1", name: "javascript", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });
  });

  it("throws if source tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [{ id: "id1", name: "react", color: "green" }] },
        },
      },
    });

    await expect(renameTag("nonexistent", "new")).rejects.toThrow("Tag not found");
  });

  it("throws if new name already exists", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });

    await expect(renameTag("js", "JavaScript")).rejects.toThrow("Tag already exists");
  });
});

describe("deleteTag", () => {
  it("removes the option from the schema", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "react", color: "green" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await deleteTag("js");

    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [{ id: "id2", name: "react", color: "green" }],
          },
        },
      },
    });
  });

  it("throws if tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [] },
        },
      },
    });

    await expect(deleteTag("missing")).rejects.toThrow("Tag not found");
  });
});

describe("mergeTag", () => {
  it("adds target tag to source-tagged pages then deletes source from schema", async () => {
    // getTagOptions call in mergeTag
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    // query pages with "js" tag
    mockClient.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: "page1",
          properties: {
            Tags: { multi_select: [{ name: "js" }] },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    });
    mockClient.pages.update.mockResolvedValueOnce({});
    // getTagOptions call inside deleteTag
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await mergeTag("js", "javascript");

    expect(mockClient.pages.update).toHaveBeenCalledWith({
      page_id: "page1",
      properties: {
        Tags: {
          multi_select: [{ name: "js" }, { name: "javascript" }],
        },
      },
    });
    expect(mockClient.databases.update).toHaveBeenCalledWith({
      database_id: "test-db-id",
      properties: {
        Tags: {
          multi_select: {
            options: [{ id: "id2", name: "javascript", color: "yellow" }],
          },
        },
      },
    });
  });

  it("skips pages that already have the target tag", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    mockClient.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: "page1",
          properties: {
            Tags: { multi_select: [{ name: "js" }, { name: "javascript" }] },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    });
    // No pages.update call needed - page already has target tag
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await mergeTag("js", "javascript");

    expect(mockClient.pages.update).not.toHaveBeenCalled();
  });

  it("throws if source tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [{ id: "id1", name: "react", color: "blue" }] },
        },
      },
    });

    await expect(mergeTag("nonexistent", "react")).rejects.toThrow("Source tag not found");
  });

  it("throws if target tag not found", async () => {
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: { options: [{ id: "id1", name: "js", color: "blue" }] },
        },
      },
    });

    await expect(mergeTag("js", "nonexistent")).rejects.toThrow("Target tag not found");
  });

  it("paginates through all pages when has_more is true", async () => {
    // getTagOptions
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    // First page query — has_more: true
    mockClient.databases.query.mockResolvedValueOnce({
      results: [{ id: "page1", properties: { Tags: { multi_select: [{ name: "js" }] } } }],
      has_more: true,
      next_cursor: "cursor-abc",
    });
    mockClient.pages.update.mockResolvedValueOnce({});
    // Second page query — has_more: false
    mockClient.databases.query.mockResolvedValueOnce({
      results: [{ id: "page2", properties: { Tags: { multi_select: [{ name: "js" }] } } }],
      has_more: false,
      next_cursor: null,
    });
    mockClient.pages.update.mockResolvedValueOnce({});
    // getTagOptions inside deleteTag
    mockClient.databases.retrieve.mockResolvedValueOnce({
      properties: {
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { id: "id1", name: "js", color: "blue" },
              { id: "id2", name: "javascript", color: "yellow" },
            ],
          },
        },
      },
    });
    mockClient.databases.update.mockResolvedValueOnce({});

    await mergeTag("js", "javascript");

    expect(mockClient.pages.update).toHaveBeenCalledTimes(2);
    expect(mockClient.databases.query).toHaveBeenCalledTimes(2);
    // Second call should use the cursor
    expect(mockClient.databases.query).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ start_cursor: "cursor-abc" })
    );
  });
});
