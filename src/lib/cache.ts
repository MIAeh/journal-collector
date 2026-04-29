export const ITEMS_CACHE_KEY = "collector_items_cache";
export const TAGS_CACHE_KEY = "collector_tags_cache";

export function clearCollectionCache() {
  try {
    sessionStorage.removeItem(ITEMS_CACHE_KEY);
    sessionStorage.removeItem(TAGS_CACHE_KEY);
  } catch {
    // SSR or private mode
  }
}
