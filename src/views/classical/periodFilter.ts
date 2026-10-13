import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { Period } from "@/plugins/api/interfaces";
import { useClassicalPreferences } from "@/views/classical/listing";
import { Hourglass } from "@lucide/vue";
import { computed, ref } from "vue";

const PERIODS = Object.values(Period);

/**
 * A multi-select period filter for a classical tab's menu, kept per user.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param periods: The periods of the listed items, to offer only those.
 * Returns `menuItem`, the filter's menu entry, and `matches`, which tells
 * whether an item of a period passes the filter.
 */
export function usePeriodFilter(
  itemtype: string,
  periods: () => Array<Period | null | undefined>,
) {
  const { preferences, save } = useClassicalPreferences(itemtype);
  const selected = ref<Period[]>(
    (preferences.periodFilter ?? []).filter((p): p is Period =>
      PERIODS.includes(p as Period),
    ),
  );

  const toggle = (period: Period) => {
    selected.value = selected.value.includes(period)
      ? selected.value.filter((p) => p !== period)
      : [...selected.value, period];
    save("periodFilter", selected.value);
  };

  // In time order. A chosen period stays listed so it can be cleared even when
  // no item has it any more.
  const menuItem = computed<ToolBarMenuItem>(() => {
    const present = new Set(periods());
    const offered = PERIODS.filter(
      (p) => present.has(p) || selected.value.includes(p),
    );
    return {
      label: "classical_filter_period",
      icon: Hourglass,
      hide: !offered.length,
      active: selected.value.length > 0,
      closeOnContentClick: false,
      overflowAllowed: true,
      subItems: offered.map((period) => ({
        label: `classical_period.${period}`,
        selected: selected.value.includes(period),
        action: () => toggle(period),
      })),
    };
  });

  const matches = (period?: Period | null): boolean =>
    !selected.value.length || selected.value.some((p) => p === period);

  return { menuItem, matches };
}
