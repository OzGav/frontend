import type { RowRegistry } from "@/components/details/rowRegistry";
import { computed, ref, type Ref } from "vue";

/**
 * The rows of a Classical detail page to show, in the user's order, with the
 * open state of its rows editor.
 *
 * @param item The page's item, undefined while it loads.
 * @param registry The page's rows and the user's customization of them.
 * @param available The rows the page can show for the item.
 * @param whileLoading The rows the page shows before the item has loaded.
 */
export function useClassicalRows<Id extends string, Item>(
  item: Ref<Item | undefined>,
  registry: RowRegistry<Id, Item>,
  available: (item: Item) => Id[],
  whileLoading: Id[],
) {
  const rowsEditorOpen = ref(false);
  const availableRows = computed<Id[]>(() =>
    item.value ? available(item.value) : whileLoading,
  );
  const visibleRows = computed(() => {
    const { order, hidden } = registry.resolve(availableRows.value);
    return order.filter((rowId) => !hidden.has(rowId));
  });
  return { rowsEditorOpen, availableRows, visibleRows };
}
