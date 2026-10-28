import { store } from "@/plugins/store";
import { useEventListener } from "@vueuse/core";
import { nextTick, ref, watch, type Ref } from "vue";

interface Focusable {
  focus: () => void;
}

/**
 * The search of a detail page section, opened from its heading as the
 * sections of the standard detail pages are: a SectionSearch in the heading
 * and a ListingSearchRow under it for phones.
 *
 * :param text: The search text; setting it, e.g. when the page restores a
 *   kept search, opens the field.
 * Returns `open`, `field` and `row` to bind the SectionSearch and
 * ListingSearchRow to by ref, `toggle` and `close`, which also clears the
 * text.
 */
export function useSectionSearch(text: Ref<string>) {
  const open = ref(false);
  const field = ref<Focusable>();
  const row = ref<Focusable>();

  const close = () => {
    text.value = "";
    open.value = false;
  };

  const toggle = () => {
    if (open.value) return close();
    open.value = true;
    nextTick(() => (store.mobileLayout ? row : field).value?.focus());
  };

  watch(text, (value) => {
    if (value) open.value = true;
  });

  // an open search claims Escape before the page's back navigation sees it
  useEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !open.value) return;
    if (store.dialogActive || store.showPlayersMenu) return;
    e.preventDefault();
    close();
  });

  return { open, field, row, toggle, close };
}
