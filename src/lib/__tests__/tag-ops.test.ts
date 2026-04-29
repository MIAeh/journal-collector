import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures the shared instance is available inside vi.mock factory
const mockDatabases = vi.hoisted(() => ({
  retrieve: vi.fn(),
  update: vi.fn(),
}));

// Mock @notionhq/client — every new Client() returns the same databases object
vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(function () {
    return {
      databases: mockDatabases,
      search: vi.fn(),
    };
  }),
}));

// Mock env
vi.stubEnv("NOTION_API_KEY", "test-key");
vi.stubEnv("NOTION_DATABASE_ID", "test-db-id");

import { getTagOptions, createTag } from "@/lib/tag-ops";
import { Client } from "@notionhq/client";

// mockClient.databases === mockDatabases — same vi.fn() references
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
