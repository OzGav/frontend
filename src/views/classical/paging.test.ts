import { CLASSICAL_PAGE_SIZE, usePagedList } from "@/views/classical/paging";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

// The numbers from offset on, as many as asked for, ending at total.
const numbers = (total: number) =>
  vi.fn(async (offset: number, limit: number) =>
    Array.from(
      { length: Math.max(0, Math.min(limit, total - offset)) },
      (_, i) => offset + i,
    ),
  );

// A fetch that resolves when the test says so.
function deferredFetch() {
  const calls: Array<(page: number[]) => void> = [];
  const fetch = vi.fn(
    () => new Promise<number[]>((resolve) => calls.push(resolve)),
  );
  return { fetch, calls };
}

describe("usePagedList", () => {
  it("loads the first page and appends further pages until a short one", async () => {
    const items = ref<number[]>([]);
    const fetch = numbers(CLASSICAL_PAGE_SIZE + 5);
    const list = usePagedList({ items, fetch });

    await list.reload();
    expect(fetch).toHaveBeenLastCalledWith(0, CLASSICAL_PAGE_SIZE);
    expect(items.value).toHaveLength(CLASSICAL_PAGE_SIZE);
    expect(list.hasMore.value).toBe(true);

    await list.loadMore();
    expect(fetch).toHaveBeenLastCalledWith(
      CLASSICAL_PAGE_SIZE,
      CLASSICAL_PAGE_SIZE,
    );
    expect(items.value).toHaveLength(CLASSICAL_PAGE_SIZE + 5);
    expect(list.hasMore.value).toBe(false);

    await list.loadMore();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("loads a larger first page when asked to", async () => {
    const items = ref<number[]>([]);
    const fetch = numbers(1000);
    const list = usePagedList({ items, fetch });

    await list.reload(250);
    expect(fetch).toHaveBeenLastCalledWith(0, 250);
    expect(items.value).toHaveLength(250);
    expect(list.hasMore.value).toBe(true);
  });

  it("replaces the list on reload", async () => {
    const items = ref<number[]>([]);
    const list = usePagedList({ items, fetch: numbers(1000) });

    await list.reload();
    await list.loadMore();
    await list.reload();
    expect(items.value).toHaveLength(CLASSICAL_PAGE_SIZE);
  });

  it("drops a page that lands after a newer reload", async () => {
    const items = ref<number[]>([]);
    const { fetch, calls } = deferredFetch();
    const list = usePagedList({ items, fetch });

    const first = list.reload();
    const second = list.reload();
    calls[1]([2]);
    calls[0]([1]);
    await Promise.all([first, second]);
    expect(items.value).toEqual([2]);
    expect(list.loading.value).toBe(false);
  });

  it("drops a further page that lands after a reload", async () => {
    const items = ref<number[]>([]);
    const { fetch, calls } = deferredFetch();
    const list = usePagedList({ items, fetch });

    const first = list.reload();
    calls[0](Array.from({ length: CLASSICAL_PAGE_SIZE }, (_, i) => i));
    await first;
    const more = list.loadMore();
    expect(list.loadingMore.value).toBe(true);
    const reload = list.reload();
    expect(list.loadingMore.value).toBe(false);
    calls[2]([7]);
    calls[1]([99]);
    await Promise.all([more, reload]);
    expect(items.value).toEqual([7]);
  });

  it("asks for one page at a time", async () => {
    const items = ref<number[]>([]);
    const { fetch, calls } = deferredFetch();
    const list = usePagedList({ items, fetch });

    const first = list.reload();
    calls[0](Array.from({ length: CLASSICAL_PAGE_SIZE }, (_, i) => i));
    await first;
    void list.loadMore();
    void list.loadMore();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops paging after a failed page until the next reload", async () => {
    const items = ref<number[]>([]);
    const fetch = numbers(1000);
    const list = usePagedList({ items, fetch });

    await list.reload();
    fetch.mockRejectedValueOnce(new Error("offline"));
    await list.loadMore();
    expect(list.hasMore.value).toBe(false);
    expect(list.loadingMore.value).toBe(false);
    await list.loadMore();
    expect(fetch).toHaveBeenCalledTimes(2);

    await list.reload();
    expect(list.hasMore.value).toBe(true);
  });

  it("keeps the list when the first page fails", async () => {
    const items = ref<number[]>([1, 2]);
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const list = usePagedList({ items, fetch });

    await list.reload();
    await flushPromises();
    expect(items.value).toEqual([1, 2]);
    expect(list.loading.value).toBe(false);
    expect(list.hasMore.value).toBe(false);
  });
});
