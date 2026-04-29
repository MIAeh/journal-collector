import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

type QueryResult = {
  results: Array<{
    id: string;
    properties: { Tags?: { multi_select: Array<{ name: string }> } };
  }>;
  has_more: boolean;
  next_cursor: string | null;
};

type SelectColor = "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";

export interface TagOption {
  id: string;
  name: string;
  color: SelectColor;
}

export async function getTagOptions(): Promise<TagOption[]> {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  if (!("properties" in db)) return [];
  const dbWithProps = db as { properties: Record<string, unknown> };
  const prop = dbWithProps.properties["Tags"] as any;
  if (prop?.type !== "multi_select") return [];
  return prop.multi_select.options as TagOption[];
}

export async function createTag(name: string): Promise<void> {
  const options = await getTagOptions();
  if (options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Tag already exists");
  }
  await notion.databases.update({
    database_id: DATABASE_ID,
    properties: {
      Tags: {
        multi_select: {
          options: [...options, { name }],
        },
      },
    },
  });
}

export async function renameTag(oldName: string, newName: string): Promise<void> {
  const options = await getTagOptions();
  const target = options.find((o) => o.name === oldName);
  if (!target) throw new Error("Tag not found");
  if (options.some((o) => o.id !== target.id && o.name.toLowerCase() === newName.toLowerCase())) {
    throw new Error("Tag already exists");
  }
  await notion.databases.update({
    database_id: DATABASE_ID,
    properties: {
      Tags: {
        multi_select: {
          options: options.map((o) =>
            o.id === target.id ? { ...o, name: newName } : o
          ),
        },
      },
    } as Parameters<typeof notion.databases.update>[0]["properties"],
  });
}

export async function deleteTag(name: string): Promise<void> {
  const options = await getTagOptions();
  if (!options.some((o) => o.name === name)) throw new Error("Tag not found");
  await notion.databases.update({
    database_id: DATABASE_ID,
    properties: {
      Tags: {
        multi_select: {
          options: options.filter((o) => o.name !== name),
        },
      },
    } as Parameters<typeof notion.databases.update>[0]["properties"],
  });
}

export async function mergeTag(sourceName: string, targetName: string): Promise<void> {
  const options = await getTagOptions();
  if (!options.some((o) => o.name === sourceName)) throw new Error("Source tag not found");
  if (!options.some((o) => o.name === targetName)) throw new Error("Target tag not found");

  let cursor: string | undefined;
  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: { property: "Tags", multi_select: { contains: sourceName } },
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    } as Parameters<typeof notion.databases.query>[0]) as QueryResult;

    for (const page of response.results) {
      const currentTags: { name: string }[] =
        page.properties?.Tags?.multi_select ?? [];
      const alreadyHasTarget = currentTags.some((t) => t.name === targetName);
      if (!alreadyHasTarget) {
        await (notion.pages.update as (params: {
          page_id: string;
          properties: { Tags: { multi_select: Array<{ name: string }> } };
        }) => Promise<unknown>)({
          page_id: page.id,
          properties: {
            Tags: { multi_select: [...currentTags, { name: targetName }] },
          },
        });
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  await deleteTag(sourceName);
}
