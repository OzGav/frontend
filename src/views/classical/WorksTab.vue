<template>
  <div class="works-tab">
    <div class="works-controls">
      <SearchInput
        v-model="search"
        clearable
        class="works-search"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
      />
      <YearRangeFilter
        v-if="hasComposedYears"
        v-model:from="yearFrom"
        v-model:to="yearTo"
        :earliest="composedBounds.earliest"
        :latest="composedBounds.latest"
      />
    </div>

    <div v-if="loading && !works.length">
      <ListViewSkeleton v-for="n in 8" :key="n" />
    </div>
    <ul
      v-else-if="filteredWorks.length"
      class="work-list"
      :class="{ touch: isTouch }"
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
          @play="(e: Event) => playFirstRecording(w.item_id, e)"
        />
        <div class="work-link">
          <router-link
            v-if="w.composer_id"
            :to="`/classical/composers/${w.composer_id}`"
            class="work-composer work-composer-link"
          >
            {{ w.composer }}
          </router-link>
          <span v-else class="work-composer">{{ w.composer }}</span>
          <router-link :to="`/classical/works/${w.item_id}`" class="work-title">
            {{ w.name }}
          </router-link>
        </div>
        <!-- Rendered even when empty so every row keeps all four columns. -->
        <span class="work-catalog">{{ w.catalog_number }}</span>
        <span class="work-year">{{ w.year_composed }}</span>
        <span class="work-recordings">{{ w.recordings_label }}</span>
        <RowPlayButton
          side="end"
          :label="`${$t('play')} ${w.name}`"
          @play="(e: Event) => playFirstRecording(w.item_id, e)"
        />
      </li>
    </ul>
    <ClassicalEmpty v-else :filtered="works.length > 0" />
  </div>
</template>

<script setup lang="ts">
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import { SearchInput } from "@/components/ui/search-input";
import { normalizeForFilter } from "@/helpers/utils";
import { getWorks } from "@/services/classical";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import {
  navigateOnRowClick,
  useClassicalListing,
} from "@/views/classical/listing";
import { recordingCountLabel } from "@/views/classical/labels";
import { playFirstRecording } from "@/views/classical/playback";
import { isTouch } from "@/views/classical/touch";
import { useYearRange, yearBounds } from "@/views/classical/yearRange";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

defineOptions({ name: "WorksTab" });

const { t } = useI18n();

// Flattened to the fields the rows show and filter on.
interface WorkRow {
  item_id: string;
  name: string;
  composer: string;
  composer_id?: string;
  catalog_number: string;
  year_composed?: number | null;
  recording_count: number;
  recordings_label: string;
  // composer, title and catalog number folded for the filter
  haystack: string;
}

const works = ref<WorkRow[]>([]);
const search = ref("");

// Placeholder years, so the boxes advertise the span the library actually covers.
const composedBounds = computed(() =>
  yearBounds(works.value.map((w) => w.year_composed)),
);

// Year filtering and sorting only make sense once some work has a year.
const hasComposedYears = computed(
  () => composedBounds.value.earliest !== undefined,
);

const router = useRouter();

const { sortBy, loading, reload } = useClassicalListing({
  itemtype: "works",
  sorts: [
    { key: "composer", label: "classical_sort_composer" },
    { key: "title", label: "classical_sort_title" },
    {
      key: "year",
      label: "classical_sort_year",
      available: () => hasComposedYears.value,
    },
    { key: "recordings", label: "classical_sort_recordings" },
  ],
  load: async () => {
    works.value = (await getWorks()).map(({ work, recording_count }) => {
      const composer = work.composers[0]?.name ?? "";
      const catalogNumber = work.catalog_numbers[0] ?? "";
      return {
        item_id: work.item_id,
        name: work.name,
        composer,
        composer_id: work.composers[0]?.item_id,
        catalog_number: catalogNumber,
        year_composed: work.composition_year,
        recording_count,
        recordings_label: recordingCountLabel(recording_count),
        haystack: normalizeForFilter(
          `${composer} ${work.name} ${catalogNumber}`,
        ),
      };
    });
  },
});

const { from: yearFrom, to: yearTo, matches: matchesYear } = useYearRange();

const searchPlaceholder = computed(() =>
  t("classical_filter_works_placeholder"),
);

onMounted(reload);

const collator = new Intl.Collator(undefined, { numeric: true });

const filteredWorks = computed(() => {
  const q = normalizeForFilter(search.value.trim());
  const filtered = works.value.filter(
    (w) => (!q || w.haystack.includes(q)) && matchesYear(w.year_composed),
  );
  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (sortBy.value) {
      case "title":
        return collator.compare(a.name, b.name);
      case "year": {
        // works without a year sort last
        const ay = a.year_composed ?? Infinity;
        const by = b.year_composed ?? Infinity;
        return ay === by ? 0 : ay < by ? -1 : 1;
      }
      case "recordings":
        return b.recording_count - a.recording_count;
      case "composer":
      default: {
        const byComposer = collator.compare(a.composer, b.composer);
        if (byComposer !== 0) return byComposer;
        // Within a composer, secondary sort by catalog number so works appear
        // in canonical Op./BWV/K. order. Empty catalogs sort last.
        const ac = a.catalog_number || "";
        const bc = b.catalog_number || "";
        if (!ac && !bc) return 0;
        if (!ac) return 1;
        if (!bc) return -1;
        return collator.compare(ac, bc);
      }
    }
  });
  return sorted;
});
</script>

<style scoped>
.works-tab {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.works-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.works-search {
  flex: 1;
  min-width: 200px;
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
  align-self: flex-start;
  max-width: 100%;
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
