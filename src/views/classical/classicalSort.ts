import { useLibrarySorting } from "@/composables/useLibrarySorting";
import api from "@/plugins/api";
import type {
  ListingType,
  SortField,
  SortOptionInfo,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import type { ClassicalSort } from "@/services/classical";
import { useClassicalPreferences } from "@/views/classical/preferences";
import { computed, ref } from "vue";
import { toast } from "vue-sonner";

/** The classical lists the server offers sort choices for. */
type ClassicalListingType =
  | ListingType.CLASSICAL_COMPOSERS
  | ListingType.CLASSICAL_PERFORMERS
  | ListingType.CLASSICAL_WORKS
  | ListingType.CLASSICAL_OTHER_TRACKS;

export interface ClassicalSortOptions {
  // name the choice is stored under
  itemtype: string;
  listing: ClassicalListingType;
  // called after the user picks another sort
  onChange: () => void;
  // fields left out of the menu, e.g. while the data they sort on is missing
  exclude?: () => SortField[];
  // label keys under sort replacing the server's, e.g. a more specific year
  labels?: Partial<Record<SortField, string>>;
}

/**
 * The sort of a classical list, chosen from the choices the server offers for
 * it and kept per user like the other library listings keep theirs.
 *
 * Returns `ready`, settled once the choices are known; `sort`, the arguments
 * to fetch the list with; and `options`, `sortBy` and `setSort`, for a sort
 * menu.
 */
export function useClassicalSort(options: ClassicalSortOptions) {
  const { preferences, save } = useClassicalPreferences(options.itemtype);
  const sortOptions = ref<SortOptionInfo[]>([]);
  const sortBy = ref(preferences.sortBy ?? "");
  const sorting = useLibrarySorting(sortOptions, sortBy);

  // Without the choices the list still loads, in the server's default order.
  const ready = api
    .getSortOptions(options.listing)
    .then((list) => {
      sortOptions.value = list;
      sortBy.value = sorting.normalizeSortBy(sortBy.value);
    })
    .catch(() => {
      toast.error($t("settings.error_loading_sort_options"), {
        id: "library-sort-options-error",
      });
    });

  const { selectedOption } = sorting;

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

  // the choices on offer, under the page's own labels
  const offered = computed(() => {
    const excluded = options.exclude?.() ?? [];
    return sortOptions.value
      .filter((o) => !excluded.includes(o.field))
      .map((o) => ({
        ...o,
        label_key: options.labels?.[o.field] ?? o.label_key,
      }));
  });

  const setSort = (value: string | undefined) => {
    if (!value || value === sortBy.value) return;
    sortBy.value = value;
    save("sortBy", value);
    options.onChange();
  };

  return {
    ready,
    sort,
    options: offered,
    sortBy: computed(() => sortBy.value),
    setSort,
  };
}
