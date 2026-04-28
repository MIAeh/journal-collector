export interface CollectionItem {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  tags: string[];
  comment: string;
  createdAt: string;
}

export interface SaveItemInput {
  url: string;
  title?: string;
  imageUrl?: string;
  tags?: string[];
  comment?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface TagWithCount {
  name: string;
  count: number;
}
