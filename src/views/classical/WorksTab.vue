<template>
  <div class="works-tab">
    <div v-if="loading && !works.length">
      <ListViewSkeleton v-for="n in 8" :key="n" />
    </div>
    <ul
      v-else-if="filteredWorks.length"
      class="work-list"
      :class="{ touch: isTouch, narrow: mobile }"
    >
      <li
        v-for="w in filteredWorks"
        :key="w.item_id"
        class="work-row classical-play-row"
        @click="
          navigateOnRowClick($event, router, `/classical/works/${w.item_id}`)
        "
      >
        <RowPlayButton
          side="start"
          :label="`${$t('play')} ${w.name}`"
          @play="(e: Event) => playWork(w.item_id, e)"
        />
        <div class="work-link">
          <span class="work-composer">
            <router-link
              v-if="w.composer_id"
              :to="`/classical/composers/${w.composer_id}`"
              class="work-composer-link"
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
          <router-link :to="`/classical/works/${w.item_id}`" class="work-title">
            {{ w.name }}
          </router-link>
          <span v-if="w.version" class="text-[0.8rem] text-muted-foreground">
            {{ w.version }}
          </span>
        </div>
        <!-- Rendered even when empty so every row keeps all four columns. -->
        <template v-if="!mobile">
          <span class="work-catalog">{{ w.catalog_number }}</span>
          <span class="work-year">{{ w.year_composed }}</span>
          <span class="work-recordings">{{ w.recordings_label }}</span>
        </template>
        <RowPlayButton
          side="end"
          :label="`${$t('play')} ${w.name}`"
          @play="(e: Event) => playWork(w.item_id, e)"
        />
      </li>
    </ul>
    <ClassicalEmpty v-else :filtered="works.length > 0" />
  </div>
</template>

<script setup lang="ts">
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { normalizeForFilter } from "@/helpers/utils";
import { ListingType, SortField, type Period } from "@/plugins/api/interfaces";
import { getWorks } from "@/services/classical";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import YearRangeMenuRow from "@/views/classical/components/YearRangeMenuRow.vue";
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
} from "@/views/classical/menuFilter";
import { playWork } from "@/views/classical/playback";
import { isTouch } from "@/views/classical/touch";
import { useYearRange, yearBounds } from "@/views/classical/yearRange";
import { CalendarRange } from "@lucide/vue";
import { computed, markRaw, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";

defineOptions({ name: "WorksTab" });

const ITEMTYPE = "works";

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

const search = ref(preferences.search ?? "");
watch(search, (value) => save("search", value));

// Placeholder years, so the boxes advertise the span the library actually covers.
const composedBounds = computed(() =>
  yearBounds(works.value.map((w) => w.year_composed)),
);

// Year filtering and sorting only make sense once some work has a year.
const hasComposedYears = computed(
  () => composedBounds.value.earliest !== undefined,
);

const router = useRouter();

const periodFilter = usePeriodFilter(ITEMTYPE, () =>
  works.value.map((w) => w.period),
);

const workTypeFilter = useWorkTypeFilter(ITEMTYPE, () =>
  works.value.map((w) => w.work_type),
);

const { from: yearFrom, to: yearTo, matches: matchesYear } = useYearRange();
yearFrom.value = preferences.yearFrom ?? "";
yearTo.value = preferences.yearTo ?? "";
watch(yearFrom, (value) => save("yearFrom", value));
watch(yearTo, (value) => save("yearTo", value));

const yearFilterItem = computed<ToolBarMenuItem>(() => ({
  label: "classical_filter_year",
  icon: CalendarRange,
  hide: !hasComposedYears.value,
  active: !!(yearFrom.value || yearTo.value),
  closeOnContentClick: false,
  overflowAllowed: true,
  subItems: [
    {
      label: "classical_filter_year",
      // markRaw, as the menu items land in a reactive array
      component: markRaw(YearRangeMenuRow),
      componentProps: {
        from: yearFrom.value,
        to: yearTo.value,
        earliest: composedBounds.value.earliest,
        latest: composedBounds.value.latest,
        "onUpdate:from": (value: string) => (yearFrom.value = value),
        "onUpdate:to": (value: string) => (yearTo.value = value),
      },
    },
  ],
}));

const { loading, reload } = useClassicalListing({
  itemtype: ITEMTYPE,
  listing: ListingType.CLASSICAL_WORKS,
  exclude: () => (hasComposedYears.value ? [] : [SortField.YEAR]),
  labels: { [SortField.YEAR]: "year_composed" },
  search: {
    text: search,
    placeholder: () => t("classical_filter_works_placeholder"),
  },
  filters: () => [
    periodFilter.menuItem.value,
    workTypeFilter.menuItem.value,
    yearFilterItem.value,
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

<style scoped>
.works-tab {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.work-list {
  list-style: none;
  margin: 0;
  padding: 0;
  /* Column tracks live on the list, and the rows borrow them through subgrid,
     so catalog, year and count line up all the way down. */
  display: grid;
  /* the play column leads on hover screens and trails on touch screens */
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  column-gap: 0.75rem;
}

.work-list.touch {
  grid-template-columns: minmax(0, 1fr) auto auto auto auto;
}

/* on phones the title takes the width, the columns join the composer line */
.work-list.narrow {
  grid-template-columns: auto minmax(0, 1fr);
}

.work-list.narrow.touch {
  grid-template-columns: minmax(0, 1fr) auto;
}

.work-list.narrow .work-composer {
  order: 1;
}

.work-list.narrow .work-title {
  white-space: normal;
}

.work-row {
  cursor: pointer;
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: baseline;
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding: 0.5rem 0.25rem 0.5rem 7px;
  margin-left: calc(0.25rem - 7px);
  border-radius: 4px;
}

.work-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

.work-link {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.work-composer {
  font-size: 0.8rem;
  color: var(--muted-foreground, #aaa);
}

/* Only the name is the link, so the underline marks just what is clicked. */
.work-composer-link {
  color: inherit;
  text-decoration: none;
}

.work-composer-link:hover,
.work-composer-link:focus-visible {
  text-decoration: underline;
}

.work-title {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-catalog,
.work-year,
.work-recordings {
  font-size: 0.85rem;
  color: var(--muted-foreground, #888);
  white-space: nowrap;
}
</style>
