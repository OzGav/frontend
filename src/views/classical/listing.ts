import GridSizeSlider from "@/components/GridSizeSlider.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { useUserPreferences } from "@/composables/userPreferences";
import { keepOwnFavorite } from "@/helpers/favorites";
import { normalizeGridSize } from "@/helpers/grid_size";
import api from "@/plugins/api";
import {
  EventType,
  type Artist,
  type EventMessage,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { useOwnFavorites } from "@/views/classical/favorites";
import {
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

export interface ClassicalSortOption {
  key: string;
  // translation key of the option's label
  label: string;
  // offered only while this returns true, e.g. while the data it sorts on exists
  available?: () => boolean;
}

export interface ClassicalListingOptions {
  // name the tab's settings are stored under
  itemtype: string;
  // the first option is the default
  sorts: ClassicalSortOption[];
  load: () => Promise<void>;
  // adds the favourites filter, the view modes and the cover size
  views?: boolean;
}

/**
 * State and toolbar menu for a classical browse tab, with sort, refresh and,
 * optionally, the favourites filter, view mode and cover size. The settings
 * are kept per user like those of the other library listings, and the menu
 * shows in the Classical view's toolbar while the tab is open.
 */
export function useClassicalListing(options: ClassicalListingOptions) {
  const { getItemsListingPreferences, setItemsListingPreference } =
    useUserPreferences();
  const prefs = getItemsListingPreferences(PREFS_PATH, options.itemtype).value;
  const { sortBy: chosenSort, setSort } = useClassicalSort(
    options.itemtype,
    options.sorts.map((s) => s.key),
  );
  const availableSorts = computed(() =>
    options.sorts.filter((s) => s.available?.() ?? true),
  );
  // An unavailable choice stays saved and applies again once it is offered.
  const sortBy = computed(() =>
    availableSorts.value.some((s) => s.key === chosenSort.value)
      ? chosenSort.value
      : availableSorts.value[0].key,
  );
  const viewMode = ref<ClassicalViewMode>(
    isViewMode(prefs.viewMode) ? prefs.viewMode : "fanart",
  );
  const favoritesOnly = ref(options.views === true && !!prefs.favoriteFilter);
  const gridSize = ref(normalizeGridSize(prefs.gridSize));
  // the tabs load on mount, so they start out loading
  const loading = ref(true);

  const save = (
    key: "viewMode" | "favoriteFilter" | "gridSize",
    value: string | boolean | number,
  ) => setItemsListingPreference(PREFS_PATH, options.itemtype, key, value);

  const reload = async () => {
    loading.value = true;
    try {
      await options.load();
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
    list.push({
      label: "tooltip.refresh",
      icon: RefreshCw,
      disabled: loading.value,
      overflowAllowed: true,
      action: reload,
    });
    list.push({
      label: "tooltip.sort_options",
      icon: ArrowUpDown,
      disabled: availableSorts.value.length <= 1 || loading.value,
      overflowAllowed: true,
      subItems: availableSorts.value.map((s) => ({
        label: s.label,
        selected: sortBy.value === s.key,
        action: () => setSort(s.key),
      })),
    });
    if (options.views) list.push(viewModeItem());
    return list;
  });

  useClassicalMenu(
    () => items.value,
    () => favoritesOnly.value,
  );

  return { sortBy, viewMode, favoritesOnly, gridSize, loading, reload };
}

/**
 * A sort choice kept per user under the given name, like the other library
 * listings keep theirs. The first key is the default.
 */
export function useClassicalSort(itemtype: string, keys: readonly string[]) {
  const { getItemsListingPreferences, setItemsListingPreference } =
    useUserPreferences();
  const stored = getItemsListingPreferences(PREFS_PATH, itemtype).value.sortBy;
  const sortBy = ref(stored && keys.includes(stored) ? stored : keys[0]);
  const setSort = (key: string) => {
    sortBy.value = key;
    setItemsListingPreference(PREFS_PATH, itemtype, "sortBy", key);
  };
  return { sortBy, setSort };
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
