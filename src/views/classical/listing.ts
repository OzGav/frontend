import GridSizeSlider from "@/components/GridSizeSlider.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { useLibrarySorting } from "@/composables/useLibrarySorting";
import {
  useUserPreferences,
  type ItemsListingPreferences,
} from "@/composables/userPreferences";
import type { ContextMenuItem } from "@/helpers/context_menu_item";
import { keepOwnFavorite } from "@/helpers/favorites";
import { normalizeGridSize } from "@/helpers/grid_size";
import api from "@/plugins/api";
import {
  EventType,
  SortDirection,
  type Artist,
  type EventMessage,
  type SortField,
  type SortOptionInfo,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import type { ClassicalSort } from "@/services/classical";
import { useOwnFavorites } from "@/views/classical/favorites";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Heart,
  LayoutGrid,
  LayoutList,
  RefreshCw,
} from "@lucide/vue";
import {
  computed,
  inject,
  markRaw,
  onBeforeUnmount,
  onUnmounted,
  ref,
  toRaw,
  watchEffect,
  type InjectionKey,
  type Ref,
} from "vue";
import type { RouteLocationRaw, Router } from "vue-router";

/** The toolbar menu a classical page hands to the Classical view. */
export interface ClassicalMenu {
  items: ToolBarMenuItem[];
  // a filter is narrowing the list, shown as a dot on the menu button
  active: boolean;
}

export const CLASSICAL_MENU_KEY: InjectionKey<Ref<ClassicalMenu | undefined>> =
  Symbol("classicalMenu");

/**
 * Keep a composer or performer page's artist in step with the server, so like
 * changes, refreshes and metadata updates show on the page as they happen.
 */
export function useArtistPageUpdates(artist: Ref<Artist | undefined>) {
  useOwnFavorites(() => (artist.value ? [artist.value] : []));
  const unsubscribe = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      const updated = evt.data as Artist;
      if (artist.value && updated.uri === artist.value.uri)
        artist.value = keepOwnFavorite(updated, artist.value);
    },
  );
  onBeforeUnmount(unsubscribe);
}

/**
 * Whether a click inside a list row landed on one of the row's own links or
 * buttons, which handle it themselves.
 */
export function isRowControlClick(evt: MouseEvent): boolean {
  return !!(evt.target as HTMLElement).closest("a, button");
}

/**
 * Open a list row's page when the click lands on the row itself, leaving
 * clicks on its own links and buttons to them.
 */
export function navigateOnRowClick(
  evt: MouseEvent,
  router: Router,
  to: RouteLocationRaw,
) {
  if (isRowControlClick(evt)) return;
  router.push(to);
}

export type ClassicalViewMode = "fanart" | "thumbs" | "list";

/** The classical lists the server offers sort choices for. */
export type ClassicalListingType =
  | "classical_composers"
  | "classical_performers"
  | "classical_works"
  | "classical_other_tracks";

export interface ClassicalSortOptions {
  // name the choice is stored under
  itemtype: string;
  listing: ClassicalListingType;
  // called after the user picks another sort
  onChange: () => void;
  // fields left out of the menu, e.g. while the data they sort on is missing
  exclude?: () => SortField[];
  // translation keys replacing the server's labels, e.g. a more specific year
  labels?: Partial<Record<SortField, string>>;
}

export interface ClassicalListingOptions extends Omit<
  ClassicalSortOptions,
  "onChange"
> {
  load: (sort: ClassicalSort) => Promise<void>;
  // adds the favourites filter, the view modes and the cover size
  views?: boolean;
  // the tab's own filters, shown after the favourites filter; read as the
  // menu is built, so their state must exist before this is called
  filters?: () => ToolBarMenuItem[];
}

/**
 * State and toolbar menu for a classical browse tab, with sort, refresh and,
 * optionally, the favourites filter, view mode, cover size and the tab's own
 * filters. The settings are kept per user like those of the other library
 * listings, and the menu shows in the Classical view's toolbar while the tab
 * is open.
 */
export function useClassicalListing(options: ClassicalListingOptions) {
  const { preferences: prefs, save } = useClassicalPreferences(
    options.itemtype,
  );
  const sort = useClassicalSort({ ...options, onChange: () => reload() });
  const viewMode = ref<ClassicalViewMode>(
    isViewMode(prefs.viewMode) ? prefs.viewMode : "fanart",
  );
  const favoritesOnly = ref(options.views === true && !!prefs.favoriteFilter);
  const gridSize = ref(normalizeGridSize(prefs.gridSize));
  // the tabs load on mount, so they start out loading
  const loading = ref(true);

  const reload = async () => {
    loading.value = true;
    try {
      await sort.ready;
      await options.load(sort.sort.value);
    } finally {
      loading.value = false;
    }
  };

  const viewModeItem = (): ToolBarMenuItem => ({
    label: "tooltip.view_mode_current",
    labelArgs: [$t(VIEW_MODE_LABELS[viewMode.value])],
    icon: viewMode.value === "list" ? LayoutList : LayoutGrid,
    overflowAllowed: true,
    subItems: [
      ...(["list", "fanart", "thumbs"] as const).map((mode) => ({
        label: VIEW_MODE_LABELS[mode],
        icon: mode === "list" ? LayoutList : LayoutGrid,
        selected: viewMode.value === mode,
        action: () => {
          viewMode.value = mode;
          save("viewMode", mode);
        },
      })),
      {
        label: "grid_size",
        hide: viewMode.value === "list",
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

  const items = computed<ToolBarMenuItem[]>(() => {
    const list: ToolBarMenuItem[] = [];
    if (options.views) {
      list.push({
        label: "tooltip.filter_favorites",
        icon: Heart,
        active: favoritesOnly.value,
        overflowAllowed: true,
        action: () => {
          favoritesOnly.value = !favoritesOnly.value;
          save("favoriteFilter", favoritesOnly.value);
        },
      });
    }
    if (options.filters) list.push(...options.filters());
    list.push({
      label: "tooltip.refresh",
      icon: RefreshCw,
      disabled: loading.value,
      overflowAllowed: true,
      action: reload,
    });
    list.push({
      ...sort.menuItem.value,
      disabled: sort.menuItem.value.disabled || loading.value,
      overflowAllowed: true,
    });
    if (options.views) list.push(viewModeItem());
    return list;
  });

  useClassicalMenu(
    () => items.value,
    () => items.value.some((item) => item.active),
  );

  return { viewMode, favoritesOnly, gridSize, loading, reload };
}

/**
 * The listing settings kept for a classical tab, as they were when the tab
 * opened, and a way to save one.
 */
export function useClassicalPreferences(itemtype: string) {
  const { getItemsListingPreferences, setItemsListingPreference } =
    useUserPreferences();
  const save = <K extends keyof ItemsListingPreferences>(
    key: K,
    value: ItemsListingPreferences[K],
  ) => setItemsListingPreference(PREFS_PATH, itemtype, key, value);
  return {
    preferences: getItemsListingPreferences(PREFS_PATH, itemtype).value,
    save,
  };
}

/**
 * The sort of a classical list, chosen from the choices the server offers for
 * it and kept per user like the other library listings keep theirs.
 *
 * Returns `ready`, settled once the choices are known; `sort`, the arguments
 * to fetch the list with; and `menuItem`, the sort entry for the list's menu.
 */
export function useClassicalSort(options: ClassicalSortOptions) {
  const { getItemsListingPreferences, setItemsListingPreference } =
    useUserPreferences();
  const sortOptions = ref<SortOptionInfo[]>([]);
  const sortBy = ref(
    getItemsListingPreferences(PREFS_PATH, options.itemtype).value.sortBy ?? "",
  );
  const sorting = useLibrarySorting(sortOptions, sortBy);

  // Without the choices (an older server) the list keeps the server default.
  const ready = api
    .getSortOptions(options.listing)
    .then((list) => {
      sortOptions.value = list;
      sortBy.value = sorting.normalizeSortBy(sortBy.value);
    })
    .catch(() => undefined);

  const selectedOption = computed(() =>
    sortOptions.value.find((o) => o.field === sorting.current.value.field),
  );

  const sort = computed<ClassicalSort>(() =>
    selectedOption.value
      ? {
          sort_field: selectedOption.value.field,
          sort_direction: selectedOption.value.supports_direction
            ? sorting.current.value.direction
            : undefined,
        }
      : {},
  );

  const setSort = (value: string | undefined) => {
    if (!value || value === sortBy.value) return;
    sortBy.value = value;
    setItemsListingPreference(PREFS_PATH, options.itemtype, "sortBy", value);
    options.onChange();
  };

  const directionItem = (direction: SortDirection): ContextMenuItem => ({
    label:
      direction === SortDirection.ASC ? "sort.ascending" : "sort.descending",
    icon: direction === SortDirection.ASC ? ArrowUp : ArrowDown,
    selected: sorting.current.value.direction === direction,
    action: () => setSort(sorting.sortByDirection(direction)),
  });

  const menuItem = computed<ContextMenuItem>(() => {
    const excluded = options.exclude?.() ?? [];
    const offered = sortOptions.value.filter(
      (o) => !excluded.includes(o.field),
    );
    const subItems: ContextMenuItem[] = offered.map((o) => ({
      label: options.labels?.[o.field] ?? `sort.${o.label_key ?? o.field}`,
      selected: o.field === selectedOption.value?.field,
      action: () => setSort(sorting.sortByOption(o)),
    }));
    if (selectedOption.value?.supports_direction)
      subItems.push(
        directionItem(SortDirection.ASC),
        directionItem(SortDirection.DESC),
      );
    return {
      label: "tooltip.sort_options",
      icon: ArrowUpDown,
      disabled: !offered.length,
      subItems,
    };
  });

  return { ready, sort, menuItem };
}

/**
 * Number of grid columns for a picture view. The default is as many columns
 * of at least minWidth as fit the width, and the cover size steps from there.
 */
export function classicalGridColumns(
  width: number,
  minWidth: number,
  gap: number,
  size: number,
): number {
  const fitting = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
  // unlike gridColumns this allows one column, so larger steps on a phone
  // never add a column
  return Math.min(MAX_GRID_COLUMNS, Math.max(1, fitting - size));
}

const PREFS_PATH = "classical";

// the most columns the grid size slider allows elsewhere
const MAX_GRID_COLUMNS = 12;

const VIEW_MODE_LABELS: Record<ClassicalViewMode, string> = {
  fanart: "classical_view_fanart",
  thumbs: "view.panel",
  list: "view.list",
};

function isViewMode(value: unknown): value is ClassicalViewMode {
  return value === "fanart" || value === "thumbs" || value === "list";
}

/**
 * Show a menu in the Classical view's toolbar while the calling page is open.
 *
 * :param items: The menu entries, re-read whenever what they depend on changes.
 * :param active: Whether a filter is narrowing the page, shown as a dot.
 */
function useClassicalMenu(
  items: () => ToolBarMenuItem[],
  active: () => boolean = () => false,
) {
  const menu = inject(CLASSICAL_MENU_KEY, undefined);
  let ownMenu: ClassicalMenu | undefined;
  watchEffect(() => {
    ownMenu = { items: items(), active: active() };
    if (menu) menu.value = ownMenu;
  });
  // The next page sets its menu before this one unmounts, so only clear our own.
  onUnmounted(() => {
    if (menu && toRaw(menu.value) === ownMenu) menu.value = undefined;
  });
}
