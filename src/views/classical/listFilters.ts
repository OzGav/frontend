import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import {
  offeredFilterValues,
  toggledValue,
  type ListingMultiFilter,
} from "@/helpers/listing_filters";
import {
  Period,
  WorkType,
  type ClassicalComposerFilters,
  type ClassicalWorkFilters,
} from "@/plugins/api/interfaces";
import { countryLabel, periodLabel } from "@/views/classical/labels";
import { useClassicalPreferences } from "@/views/classical/preferences";
import { $t } from "@/plugins/i18n";
import { Shapes } from "@lucide/vue";
import { computed, shallowRef, type Ref } from "vue";

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
  // every value, in the order the panel lists them, or those present when
  // the values are not known up front
  values: readonly T[] | (() => readonly T[]);
  valueLabel: (value: T) => string;
  // the values the tab's list holds, to offer only those
  present: () => Iterable<string>;
}

/**
 * A multi-select filter for a classical tab's Filters panel, kept per user.
 *
 * Returns `filter`, the panel's filter or undefined while there is nothing to
 * choose from, and `selected`, the chosen values.
 */
export function useListFilter<T extends string>(options: ListFilterOptions<T>) {
  const { preferences, save } = useClassicalPreferences(options.itemtype);
  const { values } = options;
  const saved = (preferences[options.key] ?? []) as T[];
  // replaced whole on each change, so a shallow ref suffices; values not
  // known up front cannot be checked before they load
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
    const present = new Set<string>(options.present());
    const all = typeof values === "function" ? values() : values;
    const offered = offeredFilterValues(all, present, selected.value);
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
      toggle: (value) => set(toggledValue(selected.value, value as T)),
      set: (next) => set(next as T[]),
    };
  });

  return { filter, selected: computed(() => selected.value) };
}

/**
 * The period filter of a classical tab, listing periods in time order.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param periods: The periods the tab's list holds.
 */
export function usePeriodFilter(itemtype: string, periods: () => Period[]) {
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
 * Returns `filter`, as useListFilter does, and `query`, the list arguments
 * for the chosen types.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param choices: The filter values of the tab's list, absent until loaded.
 */
export function useWorkTypeFilter(
  itemtype: string,
  choices: () => ClassicalWorkFilters | undefined,
) {
  const { filter, selected } = useListFilter<string>({
    itemtype,
    key: "workTypeFilter",
    id: "work_type",
    label: "classical_type",
    placeholder: "classical_filter_any_type",
    layout: "dropdown",
    values: workTypeChoices(),
    valueLabel: (type) => $t(workTypeChoiceLabel(type)),
    present: () =>
      withUnknown(
        choices()?.work_types ?? [],
        choices()?.work_type_unknown ?? false,
        UNKNOWN_WORK_TYPE,
      ),
  });
  const query = computed(() => {
    const { values, unknown } = splitUnknown(selected.value, UNKNOWN_WORK_TYPE);
    return { work_type: values as WorkType[], work_type_unknown: unknown };
  });
  return { filter, query };
}

/**
 * The entries of a works list's menu: a Type sub menu ticking the types to
 * show, left out while a single type would filter nothing.
 *
 * :param types: The types of the listed works, UNKNOWN_WORK_TYPE for those
 *   without one.
 * :param chosen: The ticked types; empty shows every work.
 */
export function worksMenuItems(
  types: string[],
  chosen: Ref<string[]>,
): ToolBarMenuItem[] {
  const offered = offeredFilterValues(
    workTypeChoices(),
    new Set(types),
    chosen.value,
  );
  if (offered.length < 2 && !chosen.value.length) return [];
  return [
    {
      label: "classical_type",
      icon: Shapes,
      active: chosen.value.length > 0,
      closeOnContentClick: false,
      subItems: offered.map((type) => ({
        label: workTypeChoiceLabel(type),
        selected: chosen.value.includes(type),
        action: () => {
          chosen.value = toggledValue(chosen.value, type);
        },
      })),
    },
  ];
}

/** The choice for composers without a country in the country filter. */
export const UNKNOWN_COUNTRY = "unknown";

/**
 * The country filter of a classical tab, listing countries by name with
 * Unknown last.
 *
 * Returns `filter`, as useListFilter does, and `query`, the list arguments
 * for the chosen countries.
 *
 * :param itemtype: The tab the choice is stored under.
 * :param choices: The filter values of the tab's list, absent until loaded.
 */
export function useCountryFilter(
  itemtype: string,
  choices: () => ClassicalComposerFilters | undefined,
) {
  const { filter, selected } = useListFilter<string>({
    itemtype,
    key: "countryFilter",
    id: "country",
    label: "classical_filter_country",
    placeholder: "classical_filter_any_country",
    layout: "dropdown",
    values: () => {
      const codes = [...(choices()?.countries ?? [])];
      codes.sort((a, b) => countryLabel(a).localeCompare(countryLabel(b)));
      return [...codes, UNKNOWN_COUNTRY];
    },
    valueLabel: countryChoiceLabel,
    present: () =>
      withUnknown(
        choices()?.countries ?? [],
        choices()?.country_unknown ?? false,
        UNKNOWN_COUNTRY,
      ),
  });
  const query = computed(() => {
    const { values, unknown } = splitUnknown(selected.value, UNKNOWN_COUNTRY);
    return { country: values, country_unknown: unknown };
  });
  return { filter, query };
}

/**
 * Filter values with the choice for items without a value added, when some
 * item has none.
 */
export function withUnknown(
  values: readonly string[],
  hasUnknown: boolean,
  unknown: string,
): string[] {
  return hasUnknown ? [...values, unknown] : [...values];
}

/**
 * The chosen values of a filter, without the choice for items without a
 * value, and whether that choice is among them.
 */
export function splitUnknown(
  chosen: readonly string[],
  unknown: string,
): { values: string[]; unknown: boolean } {
  return {
    values: chosen.filter((v) => v !== unknown),
    unknown: chosen.includes(unknown),
  };
}

/** The name of a country filter choice. */
const countryChoiceLabel = (code: string) =>
  code === UNKNOWN_COUNTRY
    ? $t("classical_country_unknown")
    : countryLabel(code);
