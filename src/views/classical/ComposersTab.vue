<template>
  <div class="composers-tab">
    <div class="composers-controls">
      <SearchInput
        v-model="search"
        clearable
        class="composers-search"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
      />
    </div>

    <ClassicalArtistGrid
      v-if="gridItems.length || loading"
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="280"
      :loading="loading"
      :placeholder-icon="Feather"
    />
    <ClassicalEmpty v-else :filtered="composers.length > 0" />
  </div>
</template>

<script setup lang="ts">
import { SearchInput } from "@/components/ui/search-input";
import { normalizeForFilter } from "@/helpers/utils";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { Period, type ClassicalComposer } from "@/plugins/api/interfaces";
import { getComposers } from "@/services/classical";
import ClassicalArtistGrid, {
  type ClassicalArtistGridItem,
} from "@/views/classical/components/ClassicalArtistGrid.vue";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import {
  cardImage,
  LIST_IMAGE_SIZE,
  SQUARE_IMAGE_SIZE,
  squareImage,
  WIDE_IMAGE_SIZE,
} from "@/views/classical/images";
import { periodLabel, workCountLabel } from "@/views/classical/labels";
import { useOwnFavorites } from "@/views/classical/favorites";
import {
  useClassicalListing,
  useClassicalPreferences,
} from "@/views/classical/listing";
import { Feather, Hourglass } from "@lucide/vue";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ComposersTab" });

const { t } = useI18n();

const composers = ref<ClassicalComposer[]>([]);

useOwnFavorites(() => composers.value.map((row) => row.artist));

const ITEMTYPE = "composers";

const { preferences, save } = useClassicalPreferences(ITEMTYPE);

const search = ref(preferences.search ?? "");
watch(search, (value) => save("search", value));

const PERIODS = Object.values(Period);

const periodFilter = ref<Period[]>(
  (preferences.periodFilter ?? []).filter((p): p is Period =>
    PERIODS.includes(p as Period),
  ),
);

// The periods of the listed composers, in time order. A chosen period stays
// listed so it can be cleared even when no composer has it any more.
const periodFilterItem = computed<ToolBarMenuItem>(() => {
  const present = new Set(composers.value.map((c) => c.artist.period));
  const offered = PERIODS.filter(
    (p) => present.has(p) || periodFilter.value.includes(p),
  );
  return {
    label: "classical_filter_period",
    icon: Hourglass,
    hide: !offered.length,
    active: periodFilter.value.length > 0,
    closeOnContentClick: false,
    overflowAllowed: true,
    subItems: offered.map((period) => ({
      label: `classical_period.${period}`,
      selected: periodFilter.value.includes(period),
      action: () => togglePeriod(period),
    })),
  };
});

const { viewMode, favoritesOnly, gridSize, loading, reload } =
  useClassicalListing({
    itemtype: ITEMTYPE,
    listing: "classical_composers",
    load: async (sort) => {
      composers.value = await getComposers(sort);
    },
    views: true,
    filters: () => [periodFilterItem.value],
  });

function togglePeriod(period: Period) {
  periodFilter.value = periodFilter.value.includes(period)
    ? periodFilter.value.filter((p) => p !== period)
    : [...periodFilter.value, period];
  save("periodFilter", periodFilter.value);
}

const searchPlaceholder = computed(() =>
  t("classical_filter_composers_placeholder"),
);

onMounted(reload);

// Built once per load, so filtering and redrawing reuse the folded name and
// image urls.
const rows = computed(() =>
  composers.value.map((c) => ({
    composer: c,
    haystack: normalizeForFilter(c.artist.name),
    item: {
      id: c.artist.item_id,
      artist: c.artist,
      name: c.artist.name,
      link: `/classical/composers/${c.artist.item_id}`,
      wideImage: cardImage(c, WIDE_IMAGE_SIZE),
      squareImage: squareImage(c, SQUARE_IMAGE_SIZE),
      listImage: squareImage(c, LIST_IMAGE_SIZE),
      lines: [
        [
          c.artist.period && periodLabel(c.artist.period),
          workCountLabel(c.work_count),
        ]
          .filter(Boolean)
          .join(" · "),
      ],
    } satisfies ClassicalArtistGridItem,
  })),
);

const gridItems = computed<ClassicalArtistGridItem[]>(() => {
  const q = normalizeForFilter(search.value.trim());
  return rows.value
    .filter(
      (r) =>
        (!favoritesOnly.value || r.composer.artist.favorite === true) &&
        (!periodFilter.value.length ||
          periodFilter.value.some((p) => p === r.composer.artist.period)) &&
        (!q || r.haystack.includes(q)),
    )
    .map((r) => r.item);
});
</script>

<style scoped>
.composers-tab {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.composers-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.composers-search {
  flex: 1;
  min-width: 200px;
}
</style>
