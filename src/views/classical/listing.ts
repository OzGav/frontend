import GridSizeSlider from "@/components/GridSizeSlider.vue";
import type { ListingViewOption } from "@/components/listing-toolbar/constants";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { normalizeGridSize } from "@/helpers/grid_size";
import {
  activeFilterCount,
  type ListingFilter,
} from "@/helpers/listing_filters";
import { $t } from "@/plugins/i18n";
import type { SortOptionInfo } from "@/plugins/api/interfaces";
import type { ClassicalListQuery } from "@/services/classical";
import { useBackScroll } from "@/views/classical/backScroll";
import {
  useClassicalSort,
  type ClassicalSortOptions,
} from "@/views/classical/classicalSort";
import { CLASSICAL_PAGE_SIZE, usePagedList } from "@/views/classical/paging";
import { useClassicalPreferences } from "@/views/classical/preferences";
import { Grid3x3, Heart, LayoutGrid, LayoutList, RefreshCw } from "@lucide/vue";
import { refDebounced } from "@vueuse/core";
import {
  computed,
  inject,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  toRaw,
  watch,
  watchEffect,
  type InjectionKey,
  type Ref,
} from "vue";

/** The toolbar menu a classical page hands to the Classical view. */
export interface ClassicalMenu {
  items: ToolBarMenuItem[];
  // the page's text filter, opened from its toolbar button
  search?: ClassicalMenuSearch;
  // the page's sort, and its view where it offers more than one
  sort: ClassicalMenuSort;
  // the page's filters, shown in the Filters panel
  filters: ListingFilter[];
  clearFilters: () => void;
}

/** A page's sort and view, for the Classical view to show in its toolbar. */
interface ClassicalMenuSort {
  options: SortOptionInfo[];
  sortBy: string;
  setSort: (value: string) => void;
  // left out where the page has a single view
  viewMode?: ClassicalViewMode;
  setViewMode: (mode: string) => void;
}

/** A page's text filter, for the Classical view to show in its toolbar. */
interface ClassicalMenuSearch {
  text: string;
  placeholder: string;
  open: boolean;
  setText: (text?: string) => void;
  setOpen: (open: boolean) => void;
}

export const CLASSICAL_MENU_KEY: InjectionKey<Ref<ClassicalMenu | undefined>> =
  Symbol("classicalMenu");

export type ClassicalViewMode = "fanart" | "thumbs" | "list";

/** How long typing in a classical tab's search or year boxes settles first. */
export const CLASSICAL_TYPING_DEBOUNCE_MS = 300;

// the views a picture tab offers in its sort menu
export const CLASSICAL_VIEWS: readonly ListingViewOption[] = [
  {
    value: "fanart",
    label: "classical_view_fanart",
    shortLabel: "classical_view_fanart_short",
    icon: LayoutGrid,
  },
  {
    value: "thumbs",
    label: "view.panel",
    shortLabel: "view.panel_short",
    icon: LayoutGrid,
  },
  {
    value: "list",
    label: "view.list",
    shortLabel: "view.list_short",
    icon: LayoutList,
  },
];

interface ClassicalListingOptions<T, Q extends object> extends Omit<
  ClassicalSortOptions,
  "onChange"
> {
  // the tab's list, replaced by each reload and extended by each page
  items: Ref<T[]>;
  // fetches a page of the list
  load: (query: ClassicalListQuery & Q) => Promise<T[]>;
  // the list arguments of the tab's own filters; a change reloads the list
  query?: () => Q;
  // loads the values the tab's filters offer, as the tab opens and on refresh
  loadFilterChoices?: () => Promise<void>;
  // adds the favourites filter, the view modes and the cover size
  views?: boolean;
  // the tab's own filters, shown in the Filters panel after the favourites
  // filter, with undefined for one left out; read as the panel is built, so
  // their state must exist before this is called
  filters?: () => Array<ListingFilter | undefined>;
  // adds a text filter, opened from a toolbar button and kept per user
  search?: { placeholder: () => string };
}

/**
 * State and toolbar menu for a classical browse tab, with sort, refresh and,
 * optionally, the favourites filter, view mode, cover size and the tab's own
 * filters. The settings are kept per user like those of the other library
 * listings, the menu, text filter, sort and filters show in the Classical
 * view's toolbar while the tab is open, and going back to the tab returns it
 * to where it was scrolled.
 *
 * The list loads as the tab opens, page by page: place a LoadMoreSentinel
 * after its last row while `hasMore`, with `loadingMore` and `loadMore`.
 * `filtered` tells whether a search or filter narrows the list.
 */
export function useClassicalListing<T, Q extends object = object>(
  options: ClassicalListingOptions<T, Q>,
) {
  const { preferences: prefs, save } = useClassicalPreferences(
    options.itemtype,
  );
  const sort = useClassicalSort({ ...options, onChange: () => reload() });
  // the text filter, empty where the tab has none
  const search = ref(options.search ? (prefs.search ?? "") : "");
  watch(search, (value) => save("search", value));
  const searchText = refDebounced(
    computed(() => search.value.trim()),
    CLASSICAL_TYPING_DEBOUNCE_MS,
  );
  const viewMode = ref<ClassicalViewMode>(
    isViewMode(prefs.viewMode) ? prefs.viewMode : "fanart",
  );
  const favoritesOnly = ref(options.views === true && !!prefs.favoriteFilter);
  const gridSize = ref(normalizeGridSize(prefs.gridSize));

  const { loading, loadingMore, hasMore, reload, loadMore } = usePagedList({
    items: options.items,
    fetch: async (offset, limit) => {
      await sort.ready;
      return options.load({
        ...sort.sort.value,
        search: searchText.value || undefined,
        favorite: favoritesOnly.value || undefined,
        offset,
        limit,
        ...(options.query?.() as Q),
      });
    },
  });
  const { returnRows } = useBackScroll(
    () => loading.value,
    () => options.items.value.length,
  );

  const refresh = (limit?: number) => {
    // the api has already reported a failure
    options.loadFilterChoices?.().catch(() => {});
    return reload(limit);
  };

  // going back to the tab loads again the rows it had, to scroll back to
  onMounted(() => refresh(Math.max(CLASSICAL_PAGE_SIZE, returnRows() ?? 0)));
  // Getters, so only a changed value reloads; the tab's arguments are built
  // afresh on each read, so they are compared as text.
  watch(
    [
      () => searchText.value,
      () => favoritesOnly.value,
      () => JSON.stringify(options.query?.()),
    ],
    () => reload(),
  );

  // a kept filter opens with the tab, so it shows what narrows the list
  const searchOpen = ref(!!search.value);

  const setViewMode = (mode: string) => {
    if (!isViewMode(mode)) return;
    viewMode.value = mode;
    save("viewMode", mode);
  };

  const gridSizeItem = (): ToolBarMenuItem => ({
    label: "grid_size",
    icon: Grid3x3,
    overflowAllowed: true,
    subItems: [
      {
        label: "grid_size",
        // markRaw, as the menu items land in a reactive array; a bare component
        // definition there would be needlessly made reactive.
        component: markRaw(GridSizeSlider),
        componentProps: {
          size: gridSize.value,
          onChange: (size: number) => {
            gridSize.value = size;
          },
          onCommit: (size: number) => {
            gridSize.value = size;
            save("gridSize", size);
          },
        },
      },
    ],
  });

  const filters = computed<ListingFilter[]>(() => {
    const list: ListingFilter[] = [];
    if (options.views) {
      list.push({
        kind: "toggle",
        id: "favorites",
        label: $t("listing_filters.favorites_only"),
        icon: Heart,
        active: favoritesOnly.value,
        toggle: () => {
          favoritesOnly.value = !favoritesOnly.value;
          save("favoriteFilter", favoritesOnly.value);
        },
      });
    }
    for (const filter of options.filters?.() ?? []) {
      if (filter) list.push(filter);
    }
    return list;
  });

  const items = computed<ToolBarMenuItem[]>(() => {
    const list: ToolBarMenuItem[] = [];
    list.push({
      label: "tooltip.refresh",
      icon: RefreshCw,
      disabled: loading.value,
      overflowAllowed: true,
      action: () => refresh(),
    });
    if (options.views && viewMode.value !== "list") list.push(gridSizeItem());
    return list;
  });

  useClassicalMenu(() => ({
    items: items.value,
    search: options.search && {
      text: search.value,
      placeholder: options.search.placeholder(),
      open: searchOpen.value,
      setText: (text = "") => {
        search.value = text;
      },
      setOpen: (open) => {
        searchOpen.value = open;
      },
    },
    sort: {
      options: sort.options.value,
      sortBy: sort.sortBy.value,
      setSort: sort.setSort,
      viewMode: options.views ? viewMode.value : undefined,
      setViewMode,
    },
    filters: filters.value,
    clearFilters: () => filters.value.forEach(clearFilter),
  }));

  const filtered = computed(
    () => !!searchText.value || activeFilterCount(filters.value) > 0,
  );

  return {
    viewMode,
    gridSize,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    filtered,
  };
}

// turns a filter off through its own handler, which saves the change
function clearFilter(filter: ListingFilter) {
  switch (filter.kind) {
    case "toggle":
      if (filter.active) filter.toggle();
      return;
    case "multi":
      if (filter.set) filter.set([]);
      else [...filter.selected].forEach(filter.toggle);
      return;
    case "custom":
      filter.clear();
  }
}

function isViewMode(value: unknown): value is ClassicalViewMode {
  return CLASSICAL_VIEWS.some((view) => view.value === value);
}

/**
 * Show a menu in the Classical view's toolbar while the calling page is open.
 *
 * :param build: The menu, rebuilt whenever what it depends on changes.
 */
function useClassicalMenu(build: () => ClassicalMenu) {
  const menu = inject(CLASSICAL_MENU_KEY, undefined);
  let ownMenu: ClassicalMenu | undefined;
  watchEffect(() => {
    ownMenu = build();
    if (menu) menu.value = ownMenu;
  });
  // The next page sets its menu before this one unmounts, so only clear our own.
  onUnmounted(() => {
    if (menu && toRaw(menu.value) === ownMenu) menu.value = undefined;
  });
}
