import { store } from "@/plugins/store";
import { useEventListener } from "@vueuse/core";
import { nextTick, ref, watch, type Ref } from "vue";

interface Focusable {
  focus: () => void;
}

export interface ListingSearchOptions {
  // the open state, where the caller keeps it
  open?: Ref<boolean>;
  // the title bar has no room for the field, so it opens in the row
  narrow?: () => boolean;
  // whether the open search shows, so Escape closes it; `open` if left out
  shown?: () => boolean;
}

/**
 * The search of a listing, opened from its title bar: a ListingSearch (or
 * SectionSearch) in the title bar and a ListingSearchRow under it, used on a
 * phone or when the title bar is narrow. Escape closes an open search before
 * the page's back navigation sees it.
 *
 * :param text: The search text; setting it, e.g. when the page restores a
 *   kept search, opens the search.
 * :param options: See ListingSearchOptions.
 * Returns `open`, `field` and `row` to bind the field and the row to by ref,
 * `focus`, which puts the cursor in whichever of the two shows, `toggle` and
 * `close`, which also clears the text.
 */
export function useListingSearch(
  text: Ref<string>,
  options: ListingSearchOptions = {},
) {
  const open = options.open ?? ref(false);
  const field = ref<Focusable>();
  const row = ref<Focusable>();

  const focus = () => {
    nextTick(() => {
      const inRow = store.mobileLayout || !!options.narrow?.();
      (inRow ? row : field).value?.focus();
    });
  };

  const close = () => {
    text.value = "";
    open.value = false;
  };

  const toggle = () => {
    if (open.value) return close();
    open.value = true;
    focus();
  };

  watch(text, (value) => {
    if (value) open.value = true;
  });

  useEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (!(options.shown?.() ?? open.value)) return;
    if (store.dialogActive || store.showPlayersMenu) return;
    e.preventDefault();
    close();
  });

  return { open, field, row, focus, toggle, close };
}
