import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// Stub env via vi.hoisted so the values are in place before any module body runs
vi.hoisted(() => {
  process.env.NOTION_API_KEY = "test-key";
  process.env.NOTION_DATABASE_ID = "test-db-id";
});

import { getTagOptions, createTag } from "@/lib/tag-ops";
import { Client } from "@notionhq/client";

// mockClient.databases === mockDatabases — same vi.fn() references
const mockClient = new (Client as any)();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
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
