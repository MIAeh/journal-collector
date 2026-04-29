import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

export async function getTagOptions(): Promise<TagOption[]> {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  if (!("properties" in db)) return [];
  const prop = (db as any).properties?.Tags;
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
          options: [...options, { name } as TagOption],
        },
      },
    },
  });
}
