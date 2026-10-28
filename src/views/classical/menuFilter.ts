import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { Period, WorkType } from "@/plugins/api/interfaces";
import { countryLabel } from "@/views/classical/labels";
import { useClassicalPreferences } from "@/views/classical/listing";
import { $t } from "@/plugins/i18n";
import { Globe, Hourglass, Shapes } from "@lucide/vue";
import { computed, shallowRef, type Component } from "vue";

interface MenuFilterOptions<T extends string> {
  // the tab the choice is stored under
  itemtype: string;
  // the preference the choice is stored as
  key: "periodFilter" | "roleFilter" | "workTypeFilter" | "countryFilter";
  label: string;
  icon: Component;
  // every value, in the order the menu lists them, or those of the listed
  // items when the values are not known up front
  values: readonly T[] | (() => readonly T[]);
  // a value's name, or its translation key
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
  const { values } = options;
  const saved = (preferences[options.key] ?? []) as T[];
  // replaced whole on each change, so a shallow ref suffices; values read
  // from the items cannot be checked before they load
  const selected = shallowRef<T[]>(
    typeof values === "function"
      ? saved
      : saved.filter((v) => values.includes(v)),
  );

  const toggle = (value: T) => {
    selected.value = selected.value.includes(value)
      ? selected.value.filter((v) => v !== value)
      : [...selected.value, value];
    save(options.key, selected.value);
  };

  // A chosen value stays listed so it can be cleared even when no item has it
  // any more. A single value would filter nothing, so the filter hides then.
  const menuItem = computed<ToolBarMenuItem>(() => {
    const present = new Set<string | null | undefined>(options.present());
    const all = typeof values === "function" ? values() : values;
    const offered = [
      ...all.filter((v) => present.has(v) || selected.value.includes(v)),
      ...selected.value.filter((v) => !all.includes(v)),
    ];
    return {
      label: options.label,
      icon: options.icon,
      hide: offered.length < 2 && !selected.value.length,
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

/** Translation key of a work type filter choice. */
export const workTypeChoiceLabel = (type: string) =>
  `classical_work_type.${type}`;

/**
 * Every work type filter choice, by name with Other and Unknown last.
 */
export function workTypeChoices(): string[] {
  const byName = Object.values(WorkType)
    .filter((type) => type !== WorkType.OTHER)
    .sort((a, b) =>
      $t(workTypeChoiceLabel(a)).localeCompare($t(workTypeChoiceLabel(b))),
    );
  return [...byName, WorkType.OTHER, UNKNOWN_WORK_TYPE];
}

/**
 * The work type filter of a classical tab.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param types: The types of the listed items, UNKNOWN_WORK_TYPE for those
 *   without one.
 */
export function useWorkTypeFilter(itemtype: string, types: () => string[]) {
  return useMenuFilter<string>({
    itemtype,
    key: "workTypeFilter",
    label: "classical_filter_type",
    icon: Shapes,
    values: workTypeChoices(),
    valueLabel: workTypeChoiceLabel,
    present: types,
  });
}

/** The choice for composers without a country in the country filter. */
export const UNKNOWN_COUNTRY = "unknown";

/** The name, or translation key, of a country filter choice. */
const countryChoiceLabel = (code: string) =>
  code === UNKNOWN_COUNTRY ? "classical_country_unknown" : countryLabel(code);

/**
 * The country filter of a classical tab, listing countries by name with
 * Unknown last.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param countries: The country codes of the listed items, UNKNOWN_COUNTRY
 *   for those without one.
 */
export function useCountryFilter(itemtype: string, countries: () => string[]) {
  return useMenuFilter<string>({
    itemtype,
    key: "countryFilter",
    label: "classical_filter_country",
    icon: Globe,
    values: () => {
      const codes = [...new Set(countries())].filter(
        (c) => c !== UNKNOWN_COUNTRY,
      );
      codes.sort((a, b) => countryLabel(a).localeCompare(countryLabel(b)));
      return [...codes, UNKNOWN_COUNTRY];
    },
    valueLabel: countryChoiceLabel,
    present: countries,
  });
}
