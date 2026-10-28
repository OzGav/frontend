<template>
  <div class="flex flex-col gap-3">
    <div v-if="loading && !works.length">
      <ListViewSkeleton v-for="n in 8" :key="n" />
    </div>
    <!-- Column tracks live on the list, and the rows borrow them through
         subgrid, so catalog, year and count line up all the way down. -->
    <ul
      v-else-if="filteredWorks.length"
      class="m-0 grid list-none gap-x-[0.75rem] p-0"
      :class="listColumns"
    >
      <ClassicalPlayRow
        v-for="w in filteredWorks"
        :key="w.item_id"
        tag="li"
        class="col-[1/-1] grid cursor-pointer grid-cols-subgrid items-baseline py-[0.5rem] [--play-row-inset:0.25rem]"
        :label="`${$t('play')} ${w.name}`"
        @click="
          navigateOnRowClick($event, router, `/classical/works/${w.item_id}`)
        "
        @play="(e: Event) => playWork(w.item_id, e)"
      >
        <div class="flex min-w-0 flex-col text-inherit no-underline">
          <span
            class="text-[0.8rem] text-muted-foreground"
            :class="{ 'order-1': mobile }"
          >
            <!-- Only the name is the link, so the underline marks just what
                 is clicked. -->
            <router-link
              v-if="w.composer_id"
              :to="`/classical/composers/${w.composer_id}`"
              class="text-inherit no-underline [&:focus-visible]:underline [&:hover]:underline"
            >
              {{ w.composer }}
            </router-link>
            <template v-else>{{ w.composer }}</template>
            <template v-if="w.period_label"> · {{ w.period_label }}</template>
            <!-- on phones the columns join this line, under the title -->
            <template v-if="mobile">
              <template
                v-for="detail in [
                  w.catalog_number,
                  w.year_composed,
                  w.recordings_label,
                ].filter(Boolean)"
                :key="detail"
              >
                · {{ detail }}
              </template>
            </template>
          </span>
          <router-link
            :to="`/classical/works/${w.item_id}`"
            class="overflow-hidden text-[0.95rem] font-semibold text-ellipsis text-inherit no-underline"
            :class="mobile ? 'whitespace-normal' : 'whitespace-nowrap'"
          >
            {{ w.name }}
          </router-link>
          <span v-if="w.version" class="text-[0.8rem] text-muted-foreground">
            {{ w.version }}
          </span>
        </div>
        <!-- Rendered even when empty so every row keeps all four columns. -->
        <template v-if="!mobile">
          <span :class="COLUMN_CLASS">{{ w.catalog_number }}</span>
          <span :class="COLUMN_CLASS">{{ w.year_composed }}</span>
          <span :class="COLUMN_CLASS">{{ w.recordings_label }}</span>
        </template>
      </ClassicalPlayRow>
    </ul>
    <ClassicalEmpty v-else :filtered="works.length > 0" />
  </div>
</template>

<script setup lang="ts">
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import type { ListingCustomFilter } from "@/helpers/listing_filters";
import { normalizeForFilter } from "@/helpers/utils";
import { ListingType, SortField, type Period } from "@/plugins/api/interfaces";
import { getWorks } from "@/services/classical";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import {
  navigateOnRowClick,
  useClassicalListing,
  useClassicalPreferences,
} from "@/views/classical/listing";
import { periodLabel, recordingCountLabel } from "@/views/classical/labels";
import {
  UNKNOWN_WORK_TYPE,
  usePeriodFilter,
  useWorkTypeFilter,
} from "@/views/classical/listFilters";
import { playWork } from "@/views/classical/playback";
import { isTouch } from "@/views/classical/touch";
import { useYearRange, yearBounds } from "@/views/classical/yearRange";
import { computed, markRaw, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";

defineOptions({ name: "WorksTab" });

const ITEMTYPE = "works";

const COLUMN_CLASS = "text-[0.85rem] whitespace-nowrap text-muted-foreground";

const { mobile } = useDisplay();

const { t } = useI18n();

// Flattened to the fields the rows show and filter on.
interface WorkRow {
  item_id: string;
  name: string;
  // tells apart works sharing a title, e.g. 1888 version
  version: string;
  composer: string;
  composer_id?: string;
  period?: Period | null;
  period_label: string;
  // UNKNOWN_WORK_TYPE when the work has no type
  work_type: string;
  catalog_number: string;
  year_composed?: number | null;
  recordings_label: string;
  // composer, title, catalog number and part names folded for the filter
  haystack: string;
}

const works = ref<WorkRow[]>([]);

const { preferences, save } = useClassicalPreferences(ITEMTYPE);

// Placeholder years, so the boxes advertise the span the library actually covers.
const composedBounds = computed(() =>
  yearBounds(works.value.map((w) => w.year_composed)),
);

// Year filtering and sorting only make sense once some work has a year.
const hasComposedYears = computed(
  () => composedBounds.value.earliest !== undefined,
);

const router = useRouter();

// The play column leads on hover screens and trails on touch screens; on
// phones the title takes the width.
const listColumns = computed(() => {
  if (mobile.value)
    return isTouch.value
      ? "grid-cols-[minmax(0,1fr)_auto]"
      : "grid-cols-[auto_minmax(0,1fr)]";
  return isTouch.value
    ? "grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
    : "grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]";
});

const periodFilter = usePeriodFilter(ITEMTYPE, () =>
  works.value.map((w) => w.period),
);

const workTypeFilter = useWorkTypeFilter(ITEMTYPE, () =>
  works.value.map((w) => w.work_type),
);

const {
  from: yearFrom,
  to: yearTo,
  isActive: yearActive,
  matches: matchesYear,
  clear: clearYears,
} = useYearRange();
yearFrom.value = preferences.yearFrom ?? "";
yearTo.value = preferences.yearTo ?? "";
watch(yearFrom, (value) => save("yearFrom", value));
watch(yearTo, (value) => save("yearTo", value));

const yearFilter = computed<ListingCustomFilter | undefined>(() =>
  hasComposedYears.value
    ? {
        kind: "custom",
        id: "year_composed",
        label: t("sort.year_composed"),
        // markRaw, as the filters land in a reactive object
        component: markRaw(YearRangeFilter),
        props: {
          from: yearFrom.value,
          to: yearTo.value,
          earliest: composedBounds.value.earliest,
          latest: composedBounds.value.latest,
          "onUpdate:from": (value: string) => (yearFrom.value = value),
          "onUpdate:to": (value: string) => (yearTo.value = value),
        },
        activeCount: Number(yearActive.value),
        clear: clearYears,
      }
    : undefined,
);

const { loading, reload, search } = useClassicalListing({
  itemtype: ITEMTYPE,
  listing: ListingType.CLASSICAL_WORKS,
  exclude: () => (hasComposedYears.value ? [] : [SortField.YEAR]),
  labels: { [SortField.YEAR]: "year_composed" },
  search: {
    placeholder: () => t("classical_filter_works_placeholder"),
  },
  filters: () => [
    periodFilter.filter.value,
    workTypeFilter.filter.value,
    yearFilter.value,
  ],
  load: async (sort) => {
    works.value = (await getWorks(sort)).map(
      ({ work, recording_count, part_names, period }) => {
        const composer = work.composers[0]?.name ?? "";
        const catalogNumber = work.catalog_numbers[0] ?? "";
        return {
          item_id: work.item_id,
          name: work.name,
          version: work.version,
          composer,
          composer_id: work.composers[0]?.item_id,
          period,
          period_label: period ? periodLabel(period) : "",
          work_type: work.work_type ?? UNKNOWN_WORK_TYPE,
          catalog_number: catalogNumber,
          year_composed: work.composition_year,
          recordings_label: recordingCountLabel(recording_count),
          haystack: normalizeForFilter(
            [composer, work.name, catalogNumber, ...(part_names ?? [])].join(
              " ",
            ),
          ),
        };
      },
    );
  },
});

onMounted(reload);

const filteredWorks = computed(() => {
  const q = normalizeForFilter(search.value.trim());
  return works.value.filter(
    (w) =>
      (!q || w.haystack.includes(q)) &&
      periodFilter.matches(w.period) &&
      workTypeFilter.matches(w.work_type) &&
      // kept years must not narrow the list while the boxes are hidden
      (!hasComposedYears.value || matchesYear(w.year_composed)),
  );
});
</script>
