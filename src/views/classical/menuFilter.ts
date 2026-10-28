import type { ListingMultiFilter } from "@/helpers/listing_filters";
import { Period, WorkType } from "@/plugins/api/interfaces";
import { countryLabel, periodLabel } from "@/views/classical/labels";
import { useClassicalPreferences } from "@/views/classical/listing";
import { $t } from "@/plugins/i18n";
import { computed, shallowRef } from "vue";

interface ListFilterOptions<T extends string> {
  // the tab the choice is stored under
  itemtype: string;
  // the preference the choice is stored as
  key: "periodFilter" | "roleFilter" | "workTypeFilter" | "countryFilter";
  // the filter's id in the Filters panel
  id: string;
  // translation keys of the filter's heading, and of what stands in for the
  // picked values while there are none
  label: string;
  placeholder: string;
  layout: ListingMultiFilter["layout"];
  // every value, in the order the panel lists them, or those of the listed
  // items when the values are not known up front
  values: readonly T[] | (() => readonly T[]);
  valueLabel: (value: T) => string;
  // the values of the listed items, to offer only those
  present: () => Iterable<string | null | undefined>;
}

/**
 * A multi-select filter for a classical tab's Filters panel, kept per user.
 *
 * Returns `filter`, the panel's filter or undefined while there is nothing to
 * choose from, and `matches`, which tells whether an item with a value, or
 * with any of several, passes the filter.
 */
export function useListFilter<T extends string>(options: ListFilterOptions<T>) {
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

  const set = (next: T[]) => {
    selected.value = next;
    save(options.key, next);
  };

  // A chosen value stays listed so it can be cleared even when no item has it
  // any more. A single value would filter nothing, so the filter hides then.
  const filter = computed<ListingMultiFilter | undefined>(() => {
    const present = new Set<string | null | undefined>(options.present());
    const all = typeof values === "function" ? values() : values;
    const offered = [
      ...all.filter((v) => present.has(v) || selected.value.includes(v)),
      ...selected.value.filter((v) => !all.includes(v)),
    ];
    if (offered.length < 2 && !selected.value.length) return undefined;
    return {
      kind: "multi",
      id: options.id,
      label: $t(options.label),
      placeholder: $t(options.placeholder),
      layout: options.layout,
      options: offered.map((value) => ({
        label: options.valueLabel(value),
        value,
      })),
      selected: selected.value,
      toggle: (value) =>
        set(
          selected.value.includes(value as T)
            ? selected.value.filter((v) => v !== value)
            : [...selected.value, value as T],
        ),
      set: (next) => set(next as T[]),
    };
  });

  const matches = (value: string | null | undefined | string[]): boolean => {
    if (!selected.value.length) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.some((v) => selected.value.includes(v as T));
  };

  return { filter, matches };
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
  return useListFilter({
    itemtype,
    key: "periodFilter",
    id: "period",
    label: "classical_filter_period",
    placeholder: "classical_filter_any_period",
    layout: "dropdown",
    values: Object.values(Period),
    valueLabel: periodLabel,
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
  return useListFilter<string>({
    itemtype,
    key: "workTypeFilter",
    id: "work_type",
    label: "classical_type",
    placeholder: "classical_filter_any_type",
    layout: "dropdown",
    values: workTypeChoices(),
    valueLabel: (type) => $t(workTypeChoiceLabel(type)),
    present: types,
  });
}

/** The choice for composers without a country in the country filter. */
export const UNKNOWN_COUNTRY = "unknown";

/** The name of a country filter choice. */
const countryChoiceLabel = (code: string) =>
  code === UNKNOWN_COUNTRY
    ? $t("classical_country_unknown")
    : countryLabel(code);

/**
 * The country filter of a classical tab, listing countries by name with
 * Unknown last.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param countries: The country codes of the listed items, UNKNOWN_COUNTRY
 *   for those without one.
 */
export function useCountryFilter(itemtype: string, countries: () => string[]) {
  return useListFilter<string>({
    itemtype,
    key: "countryFilter",
    id: "country",
    label: "classical_filter_country",
    placeholder: "classical_filter_any_country",
    layout: "dropdown",
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
