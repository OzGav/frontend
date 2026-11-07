<template>
  <div class="flex flex-col gap-3">
    <div v-if="loading && !works.length">
      <ListViewSkeleton v-for="n in SKELETONS" :key="n" />
    </div>
    <!-- Column tracks live on the list, and the rows borrow them through
         subgrid, so catalog, year and count line up all the way down. -->
    <ul
      v-else-if="works.length"
      class="m-0 grid list-none gap-x-[0.75rem] p-0"
      :class="listColumns"
    >
      <ClassicalPlayRow
        v-for="w in works"
        :key="w.work.item_id"
        tag="li"
        class="col-[1/-1] grid cursor-pointer grid-cols-subgrid items-baseline py-[0.5rem] [--play-row-inset:0.25rem]"
        :label="`${$t('play')} ${w.work.name}`"
        @click="navigateOnRowClick($event, router, workLink(w))"
        @play="(e: Event) => playWork(w.work, e)"
      >
        <div class="flex min-w-0 flex-col text-inherit no-underline">
          <span
            class="text-[0.8rem] text-muted-foreground"
            :class="{ 'order-1': mobile }"
          >
            <!-- Only the name is the link, so the underline marks just what
                 is clicked. -->
            <router-link
              v-if="w.work.composers[0]"
              :to="`/classical/composers/${w.work.composers[0].item_id}`"
              class="text-inherit no-underline [&:focus-visible]:underline [&:hover]:underline"
            >
              {{ w.work.composers[0].name }}
            </router-link>
            <template v-if="w.period"> · {{ periodLabel(w.period) }}</template>
            <!-- on phones the columns join this line, under the title -->
            <template v-if="mobile">
              <template v-for="detail in phoneDetails(w)" :key="String(detail)">
                · {{ detail }}
              </template>
            </template>
          </span>
          <router-link
            :to="workLink(w)"
            class="overflow-hidden text-[0.95rem] font-semibold text-ellipsis text-inherit no-underline"
            :class="mobile ? 'whitespace-normal' : 'whitespace-nowrap'"
          >
            {{ w.work.name }}
          </router-link>
          <span
            v-if="w.work.version"
            class="text-[0.8rem] text-muted-foreground"
          >
            {{ w.work.version }}
          </span>
        </div>
        <!-- Rendered even when empty so every row keeps all four columns. -->
        <template v-if="!mobile">
          <span :class="COLUMN_CLASS">{{ w.work.catalog_numbers[0] }}</span>
          <span :class="COLUMN_CLASS">{{ w.work.composition_year }}</span>
          <span :class="COLUMN_CLASS">{{
            recordingCountLabel(w.recording_count)
          }}</span>
        </template>
      </ClassicalPlayRow>
    </ul>
    <ClassicalEmpty v-else :filtered="filtered" />
    <LoadMoreSentinel v-if="hasMore" :loading="loadingMore" @more="loadMore" />
  </div>
</template>

<script setup lang="ts">
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import type { ListingCustomFilter } from "@/helpers/listing_filters";
import {
  ListingType,
  SortField,
  type ClassicalWorkEntry,
  type ClassicalWorkFilters,
} from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { getWorkFilters, getWorks } from "@/services/classical";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import LoadMoreSentinel from "@/views/classical/components/LoadMoreSentinel.vue";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import {
  CLASSICAL_TYPING_DEBOUNCE_MS,
  useClassicalListing,
} from "@/views/classical/listing";
import { useClassicalPreferences } from "@/views/classical/preferences";
import { navigateOnRowClick } from "@/views/classical/rowClick";
import { periodLabel, recordingCountLabel } from "@/views/classical/labels";
import {
  usePeriodFilter,
  useWorkTypeFilter,
} from "@/views/classical/listFilters";
import { playWork } from "@/views/classical/playback";
import { isTouch } from "@/composables/touchScreen";
import { useYearRange } from "@/views/classical/yearRange";
import { refDebounced } from "@vueuse/core";
import { computed, markRaw, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

defineOptions({ name: "WorksTab" });

const ITEMTYPE = "works";
const SKELETONS = 8;

const COLUMN_CLASS = "text-[0.85rem] whitespace-nowrap text-muted-foreground";

const { t } = useI18n();

const works = ref<ClassicalWorkEntry[]>([]);
const choices = ref<ClassicalWorkFilters>();

const { preferences, save } = useClassicalPreferences(ITEMTYPE);

// Year filtering and sorting only make sense once some work has a year.
const hasComposedYears = computed(
  () =>
    choices.value !== undefined &&
    (choices.value.earliest_year !== null ||
      choices.value.latest_year !== null),
);

const router = useRouter();

// as narrow as a phone, where the columns join the title's line
const mobile = computed(() => !getBreakpointValue("bp2"));

const workLink = (w: ClassicalWorkEntry) =>
  `/classical/works/${w.work.item_id}`;

const phoneDetails = ({ work, recording_count }: ClassicalWorkEntry) =>
  [
    work.catalog_numbers[0],
    work.composition_year,
    recordingCountLabel(recording_count),
  ].filter(Boolean);

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

const periodFilter = usePeriodFilter(
  ITEMTYPE,
  () => choices.value?.periods ?? [],
);

const workTypeFilter = useWorkTypeFilter(ITEMTYPE, () => choices.value);

const {
  from: yearFrom,
  to: yearTo,
  bounds: years,
  isActive: yearActive,
  clear: clearYears,
} = useYearRange();
yearFrom.value = preferences.yearFrom ?? "";
yearTo.value = preferences.yearTo ?? "";
// made after the kept years are set, so the first load already has them
const typedYears = refDebounced(years, CLASSICAL_TYPING_DEBOUNCE_MS);
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
          // the boxes' placeholders, the span the library covers
          earliest: choices.value?.earliest_year ?? undefined,
          latest: choices.value?.latest_year ?? undefined,
          "onUpdate:from": (value: string) => (yearFrom.value = value),
          "onUpdate:to": (value: string) => (yearTo.value = value),
        },
        activeCount: Number(yearActive.value),
        clear: clearYears,
      }
    : undefined,
);

const { loading, loadingMore, hasMore, loadMore, filtered } =
  useClassicalListing({
    itemtype: ITEMTYPE,
    listing: ListingType.CLASSICAL_WORKS,
    exclude: () => (hasComposedYears.value ? [] : [SortField.YEAR]),
    search: {
      placeholder: () => t("classical_filter_works_placeholder"),
    },
    filters: () => [
      periodFilter.filter.value,
      workTypeFilter.filter.value,
      yearFilter.value,
    ],
    items: works,
    query: () => ({
      period: periodFilter.selected.value,
      ...workTypeFilter.query.value,
      // kept years must not narrow the list once the boxes are known to be
      // hidden; until then they apply, so the first page is already narrowed
      ...(choices.value && !hasComposedYears.value
        ? {}
        : { year_from: typedYears.value.low, year_to: typedYears.value.high }),
    }),
    loadFilterChoices: async () => {
      choices.value = await getWorkFilters();
    },
    load: getWorks,
  });
</script>
