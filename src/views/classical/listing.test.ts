import type { ListingToggleFilter } from "@/helpers/listing_filters";
import { ListingType } from "@/plugins/api/interfaces";
import type { ClassicalListQuery } from "@/services/classical";
import {
  CLASSICAL_MENU_KEY,
  CLASSICAL_TYPING_DEBOUNCE_MS,
  useClassicalListing,
  type ClassicalMenu,
} from "@/views/classical/listing";
import { CLASSICAL_PAGE_SIZE } from "@/views/classical/paging";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";

const { backMock, prefsMock, sortMock } = vi.hoisted(() => ({
  backMock: { returnRows: undefined as number | undefined },
  prefsMock: {
    preferences: {} as Record<string, unknown>,
    save: () => {},
  },
  sortMock: { onChange: undefined as (() => void) | undefined },
}));

vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));
vi.mock("@/views/classical/preferences", () => ({
  useClassicalPreferences: () => prefsMock,
}));
vi.mock("@/views/classical/backScroll", () => ({
  useBackScroll: () => ({ returnRows: () => backMock.returnRows }),
}));
vi.mock("@/views/classical/classicalSort", async () => {
  const { computed, ref } = await import("vue");
  return {
    useClassicalSort: (options: { onChange: () => void }) => {
      sortMock.onChange = options.onChange;
      return {
        ready: Promise.resolve(),
        sort: ref({ sort_field: "name" }),
        options: ref([]),
        sortBy: computed(() => "name"),
        setSort: () => options.onChange(),
      };
    },
  };
});

// Mounts a tab with the listing, its own period choice as its query.
function mountListing() {
  const load = vi.fn(async (_query: ClassicalListQuery) => [] as number[]);
  const loadFilterChoices = vi.fn(async () => {});
  const period = ref<string[]>([]);
  const menu = ref<ClassicalMenu>();
  let listing!: ReturnType<typeof useClassicalListing<number, object>>;
  mount(
    defineComponent({
      setup() {
        listing = useClassicalListing({
          itemtype: "composers",
          listing: ListingType.CLASSICAL_COMPOSERS,
          items: ref<number[]>([]),
          load,
          query: () => ({ period: period.value }),
          loadFilterChoices,
          views: true,
          search: { placeholder: () => "" },
        });
        return () => null;
      },
    }),
    { global: { provide: { [CLASSICAL_MENU_KEY as symbol]: menu } } },
  );
  return { load, loadFilterChoices, period, menu, listing };
}

function toggleFavorites(menu: ClassicalMenu | undefined) {
  menu?.filters
    .find((f): f is ListingToggleFilter => f.id === "favorites")
    ?.toggle();
}

beforeEach(() => {
  vi.useFakeTimers();
  backMock.returnRows = undefined;
  prefsMock.preferences = {};
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useClassicalListing", () => {
  it("loads the first page and the filter choices as the tab opens", async () => {
    const { load, loadFilterChoices } = mountListing();
    await flushPromises();
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith({
      sort_field: "name",
      offset: 0,
      limit: CLASSICAL_PAGE_SIZE,
      period: [],
    });
    expect(loadFilterChoices).toHaveBeenCalledOnce();
  });

  it("loads again the rows the tab had when the user goes back to it", async () => {
    backMock.returnRows = CLASSICAL_PAGE_SIZE * 3;
    const { load } = mountListing();
    await flushPromises();
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ limit: CLASSICAL_PAGE_SIZE * 3 }),
    );
  });

  it("reloads once the search text settles", async () => {
    const { load, menu } = mountListing();
    await flushPromises();
    menu.value?.search?.setText(" bach ");
    await vi.advanceTimersByTimeAsync(CLASSICAL_TYPING_DEBOUNCE_MS - 1);
    expect(load).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "bach", offset: 0 }),
    );
  });

  it("reloads at once when the favourites filter or the tab's query change", async () => {
    const { load, menu, period } = mountListing();
    await flushPromises();

    toggleFavorites(menu.value);
    await flushPromises();
    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ favorite: true }),
    );

    period.value = ["baroque"];
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(3);
    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ period: ["baroque"] }),
    );
  });

  it("does not reload when the tab's query is rebuilt unchanged", async () => {
    const { load, period } = mountListing();
    await flushPromises();
    period.value = [];
    await flushPromises();
    expect(load).toHaveBeenCalledOnce();
  });

  it("reloads on a new sort", async () => {
    const { load } = mountListing();
    await flushPromises();
    sortMock.onChange?.();
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reloads the list and the filter choices on refresh", async () => {
    const { load, loadFilterChoices, menu } = mountListing();
    await flushPromises();
    menu.value?.items[0].action?.();
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
    expect(loadFilterChoices).toHaveBeenCalledTimes(2);
  });

  it("tells whether a search or filter narrows the list", async () => {
    const { menu, listing } = mountListing();
    await flushPromises();
    expect(listing.filtered.value).toBe(false);

    menu.value?.search?.setText("bach");
    await vi.advanceTimersByTimeAsync(CLASSICAL_TYPING_DEBOUNCE_MS);
    expect(listing.filtered.value).toBe(true);

    menu.value?.search?.setText("");
    await vi.advanceTimersByTimeAsync(CLASSICAL_TYPING_DEBOUNCE_MS);
    expect(listing.filtered.value).toBe(false);

    toggleFavorites(menu.value);
    expect(listing.filtered.value).toBe(true);
  });
});
