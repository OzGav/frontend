import { computed, ref, type Ref } from "vue";

/** How many items a classical browse list fetches per page. */
export const CLASSICAL_PAGE_SIZE = 100;

interface PagedListOptions<T> {
  // the list, replaced by each reload and extended by each further page
  items: Ref<T[]>;
  fetch: (offset: number, limit: number) => Promise<T[]>;
}

/**
 * A list loaded page by page. A page shorter than asked for ends the list.
 *
 * Returns `reload`, which fetches the first page afresh; `loadMore`, which
 * appends the next page; `loading` and `loadingMore`, set while either runs;
 * and `hasMore`, whether a further page may follow the loaded list. A page
 * from before the latest reload is dropped, and a failed page stops paging
 * until the next reload.
 */
export function usePagedList<T>(options: PagedListOptions<T>) {
  // the tabs load on mount, so they start out loading
  const loading = ref(true);
  const loadingMore = ref(false);
  const more = ref(false);

  let loadCount = 0;

  /**
   * Fetch the first page afresh.
   *
   * :param limit: The size of the first page, larger to load again what was
   *   loaded before.
   */
  const reload = async (limit = CLASSICAL_PAGE_SIZE) => {
    const count = ++loadCount;
    loading.value = true;
    loadingMore.value = false;
    more.value = false;
    try {
      const page = await options.fetch(0, limit);
      // a newer load has taken over the list
      if (count !== loadCount) return;
      options.items.value = page;
      more.value = page.length >= limit;
    } catch {
      // the api has already reported the failure
    } finally {
      if (count === loadCount) loading.value = false;
    }
  };

  const loadMore = async () => {
    if (loading.value || loadingMore.value || !more.value) return;
    const count = loadCount;
    loadingMore.value = true;
    try {
      const page = await options.fetch(
        options.items.value.length,
        CLASSICAL_PAGE_SIZE,
      );
      if (count !== loadCount) return;
      options.items.value.push(...page);
      more.value = page.length >= CLASSICAL_PAGE_SIZE;
    } catch {
      // the api has already reported the failure; stopping here keeps a
      // failing page from being asked for again and again
      if (count === loadCount) more.value = false;
    } finally {
      if (count === loadCount) loadingMore.value = false;
    }
  };

  return {
    loading,
    loadingMore,
    hasMore: computed(() => more.value && !loading.value),
    reload,
    loadMore,
  };
}
