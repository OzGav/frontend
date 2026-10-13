import { returnedByHistory } from "@/helpers/navigation";
import { watch } from "vue";
import { useRouter } from "vue-router";

// The last filter of each page by its address, for as long as the app is open.
const kept = new Map<string, unknown>();

/**
 * Keep a detail page's filter while the user moves on, so going back to the
 * page shows it filtered as it was left. Opened any other way, the page starts
 * with its own filter.
 *
 * :param state: Reads the filter, as plain values.
 * :param apply: Puts a kept filter back on the page.
 * Returns `restore`, to call once the page has reset its filter for the item
 * it opens.
 */
export function useBackFilter<T>(state: () => T, apply: (saved: T) => void) {
  const router = useRouter();
  const path = () => router.currentRoute.value.fullPath;
  watch(state, (value) => kept.set(path(), value), { deep: true });
  return () => {
    const saved = kept.get(path());
    if (saved !== undefined && returnedByHistory(router)) apply(saved as T);
    // a fresh visit starts unfiltered, so an older filter must not return later
    else kept.delete(path());
  };
}
