import {
  useUserPreferences,
  type ItemsListingPreferences,
} from "@/composables/userPreferences";

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

const PREFS_PATH = "classical";
