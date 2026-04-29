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

export async function renameTag(oldName: string, newName: string): Promise<void> {
  const options = await getTagOptions();
  const target = options.find((o) => o.name === oldName);
  if (!target) throw new Error("Tag not found");
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
