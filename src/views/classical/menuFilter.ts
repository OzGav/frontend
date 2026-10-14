import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { Period, WorkType } from "@/plugins/api/interfaces";
import { useClassicalPreferences } from "@/views/classical/listing";
import { $t } from "@/plugins/i18n";
import { Hourglass, Shapes } from "@lucide/vue";
import { computed, shallowRef, type Component } from "vue";

export interface MenuFilterOptions<T extends string> {
  // the tab the choice is stored under
  itemtype: string;
  // the preference the choice is stored as
  key: "periodFilter" | "roleFilter" | "workTypeFilter";
  label: string;
  icon: Component;
  // every value, in the order the menu lists them
  values: readonly T[];
  // translation key of a value's name
  valueLabel: (value: T) => string;
  // the values of the listed items, to offer only those
  present: () => Iterable<string | null | undefined>;
}

/**
 * A multi-select filter for a classical tab's menu, kept per user.
 *
 * Returns `menuItem`, the filter's menu entry, and `matches`, which tells
 * whether an item with a value, or with any of several, passes the filter.
 */
export function useMenuFilter<T extends string>(options: MenuFilterOptions<T>) {
  const { preferences, save } = useClassicalPreferences(options.itemtype);
  // replaced whole on each change, so a shallow ref suffices
  const selected = shallowRef<T[]>(
    (preferences[options.key] ?? []).filter((v): v is T =>
      options.values.includes(v as T),
    ),
  );

  const toggle = (value: T) => {
    selected.value = selected.value.includes(value)
      ? selected.value.filter((v) => v !== value)
      : [...selected.value, value];
    save(options.key, selected.value);
  };

  // A chosen value stays listed so it can be cleared even when no item has it
  // any more.
  const menuItem = computed<ToolBarMenuItem>(() => {
    const present = new Set<string | null | undefined>(options.present());
    const offered = options.values.filter(
      (v) => present.has(v) || selected.value.includes(v),
    );
    return {
      label: options.label,
      icon: options.icon,
      hide: !offered.length,
      active: selected.value.length > 0,
      closeOnContentClick: false,
      overflowAllowed: true,
      subItems: offered.map((value) => ({
        label: options.valueLabel(value),
        selected: selected.value.includes(value),
        action: () => toggle(value),
      })),
    };
  });

  const matches = (value: string | null | undefined | string[]): boolean => {
    if (!selected.value.length) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.some((v) => selected.value.includes(v as T));
  };

  return { menuItem, matches };
}

/**
 * The period filter of a classical tab, listing periods in time order.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param periods: The periods of the listed items.
 */
export function usePeriodFilter(
  itemtype: string,
  periods: () => Array<Period | null | undefined>,
) {
  return useMenuFilter({
    itemtype,
    key: "periodFilter",
    label: "classical_filter_period",
    icon: Hourglass,
    values: Object.values(Period),
    valueLabel: (period) => `classical_period.${period}`,
    present: periods,
  });
}

/** The choice for works without a type in the work type filter. */
export const UNKNOWN_WORK_TYPE = "unknown";

/**
 * The work type filter of a classical tab, listing types by name with Other
 * and Unknown last.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param types: The types of the listed items, UNKNOWN_WORK_TYPE for those
 *   without one.
 */
export function useWorkTypeFilter(itemtype: string, types: () => string[]) {
  const label = (type: string) => `classical_work_type.${type}`;
  const byName = Object.values(WorkType)
    .filter((type) => type !== WorkType.OTHER)
    .sort((a, b) => $t(label(a)).localeCompare($t(label(b))));
  return useMenuFilter<string>({
    itemtype,
    key: "workTypeFilter",
    label: "classical_filter_type",
    icon: Shapes,
    values: [...byName, WorkType.OTHER, UNKNOWN_WORK_TYPE],
    valueLabel: label,
    present: types,
  });
}
