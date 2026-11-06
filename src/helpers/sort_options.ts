import { api } from "@/plugins/api";
import type { ListingType, SortOptionInfo } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { toast } from "vue-sonner";

// one toast for every listing whose sort options fail to load
const SORT_OPTIONS_ERROR_TOAST_ID = "library-sort-options-error";

/**
 * Fetch the sort options the server offers for a listing, showing an error
 * toast when they cannot be loaded.
 *
 * :param listing: The listing to fetch the sort options of.
 * Returns the sort options, or undefined when loading failed.
 */
export async function loadSortOptions(
  listing: ListingType,
): Promise<SortOptionInfo[] | undefined> {
  try {
    return await api.getSortOptions(listing);
  } catch {
    toast.error($t("settings.error_loading_sort_options"), {
      id: SORT_OPTIONS_ERROR_TOAST_ID,
    });
    return undefined;
  }
}
