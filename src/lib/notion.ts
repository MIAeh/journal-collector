import { Client } from "@notionhq/client";
import type {
  CollectionItem,
  SaveItemInput,
  PaginatedResponse,
  TagWithCount,
} from "./types";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

/**
 * Extracts image URL from Notion page Image property
 */
function extractImageUrl(page: any): string | null {
  const imageProperty = page.properties.Image;
  if (!imageProperty || imageProperty.type !== "files") {
    return null;
  }

  const files = imageProperty.files;
  if (!files || files.length === 0) {
    return null;
  }

  const file = files[0];
  if (file.type === "external") {
    return file.external.url;
  } else if (file.type === "file") {
    return file.file.url;
  }

  return null;
}

/**
 * Maps Notion page to CollectionItem
 */
function pageToItem(page: any): CollectionItem {
  const title =
    page.properties.Title?.title?.[0]?.plain_text || "Untitled";
  const url =
    page.properties.URL?.url || "";
  const tags =
    page.properties.Tags?.multi_select?.map((tag: any) => tag.name) || [];
  const comment =
    page.properties.Comment?.rich_text?.[0]?.plain_text || "";
  const imageUrl = extractImageUrl(page);
  const createdAt = page.created_time;

  return {
    id: page.id,
    title,
    url,
    imageUrl,
    tags,
    comment,
    createdAt,
  };
}

/**
 * Saves a new item to Notion database
 */
export async function saveItem(input: SaveItemInput): Promise<CollectionItem> {
  const properties: any = {
    Title: {
      title: [
        {
          text: {
            content: input.title || input.url,
          },
        },
      ],
    },
    URL: {
      url: input.url,
    },
    Tags: {
      multi_select: (input.tags || []).map((tag) => ({ name: tag })),
    },
    Comment: {
      rich_text: [
        {
          text: {
            content: input.comment || "",
          },
        },
      ],
    },
  };

  if (input.imageUrl) {
    properties.Image = {
      files: [
        {
          type: "external",
          name: "Image",
          external: {
            url: input.imageUrl,
          },
        },
      ],
    };
  }

  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });

  return pageToItem(response);
}

/**
 * Lists items from database with optional filtering, pagination, and search
 */
export async function listItems(options: {
  cursor?: string;
  tag?: string;
  search?: string;
  pageSize?: number;
} = {}): Promise<PaginatedResponse<CollectionItem>> {
  const { cursor, tag, search, pageSize = 20 } = options;

  const filter: any = { and: [] };

  if (tag) {
    filter.and.push({
      property: "Tags",
      multi_select: {
        contains: tag,
      },
    });
  }

  if (search) {
    filter.and.push({
      or: [
        {
          property: "Title",
          title: {
            contains: search,
          },
        },
        {
          property: "Comment",
          rich_text: {
            contains: search,
          },
        },
      ],
    });
  }

  const queryOptions: any = {
    database_id: DATABASE_ID,
    page_size: pageSize,
    sorts: [
      {
        timestamp: "created_time",
        direction: "descending",
      },
    ],
  };

  if (filter.and.length > 0) {
    queryOptions.filter = filter;
  }

  if (cursor) {
    queryOptions.start_cursor = cursor;
  }

  const response = await notion.databases.query(queryOptions);

  return {
    items: response.results.map(pageToItem),
    hasMore: response.has_more,
    nextCursor: response.next_cursor,
  };
}

/**
 * Retrieves a single item by page ID
 */
export async function getItem(pageId: string): Promise<CollectionItem> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return pageToItem(page);
}

/**
 * Updates an existing item
 */
export async function updateItem(
  pageId: string,
  updates: Partial<SaveItemInput>
): Promise<CollectionItem> {
  const properties: any = {};

  if (updates.title !== undefined) {
    properties.Title = {
      title: [
        {
          text: {
            content: updates.title,
          },
        },
      ],
    };
  }

  if (updates.url !== undefined) {
    properties.URL = {
      url: updates.url,
    };
  }

  if (updates.tags !== undefined) {
    properties.Tags = {
      multi_select: updates.tags.map((tag) => ({ name: tag })),
    };
  }

  if (updates.comment !== undefined) {
    properties.Comment = {
      rich_text: [
        {
          text: {
            content: updates.comment,
          },
        },
      ],
    };
  }

  if (updates.imageUrl !== undefined) {
    if (updates.imageUrl) {
      properties.Image = {
        files: [
          {
            type: "external",
            name: "Image",
            external: {
              url: updates.imageUrl,
            },
          },
        ],
      };
    } else {
      properties.Image = {
        files: [],
      };
    }
  }

  const response = await notion.pages.update({
    page_id: pageId,
    properties,
  });

  return pageToItem(response);
}

/**
 * Deletes (archives) an item
 */
export async function deleteItem(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

/**
 * Lists all tags from database schema with counts
 */
export async function listTags(): Promise<TagWithCount[]> {
  // Get database to retrieve schema
  const database = await notion.databases.retrieve({
    database_id: DATABASE_ID,
  });

  // Type guard to check if response is a full database object
  if (!("properties" in database)) {
    return [];
  }

  const tagsProperty = (database as any).properties.Tags;
  if (
    !tagsProperty ||
    tagsProperty.type !== "multi_select"
  ) {
    return [];
  }

  const tagOptions = tagsProperty.multi_select.options;

  // Query for each tag to get counts
  const tagCounts = await Promise.all(
    tagOptions.map(async (option: any) => {
      let count = 0;
      let hasMore = true;
      let cursor: string | undefined = undefined;

      // Paginate through all results to get accurate count
      while (hasMore) {
        const response = await notion.databases.query({
          database_id: DATABASE_ID,
          filter: {
            property: "Tags",
            multi_select: {
              contains: option.name,
            },
          },
          page_size: 100,
          start_cursor: cursor,
        });

        count += response.results.length;
        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }

      return {
        name: option.name,
        count,
      };
    })
  );

  return tagCounts;
}

/**
 * Gets fresh image URL for a page (for proxy usage)
 */
export async function getImageUrl(pageId: string): Promise<string | null> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return extractImageUrl(page);
}
