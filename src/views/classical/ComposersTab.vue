<template>
  <div class="flex flex-col gap-3">
    <ClassicalArtistGrid
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="280"
      :loading="loading"
      :placeholder-icon="Feather"
      :filtered="filtered"
      :has-more="hasMore"
      :loading-more="loadingMore"
      @more="loadMore"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ListingType,
  type ClassicalComposer,
  type ClassicalComposerFilters,
} from "@/plugins/api/interfaces";
import { getComposerFilters, getComposers } from "@/services/classical";
import { useArtistGridItems } from "@/views/classical/artistGrid";
import ClassicalArtistGrid from "@/views/classical/components/ClassicalArtistGrid.vue";
import { periodLabel, workCountLabel } from "@/views/classical/labels";
import { useOwnFavorites } from "@/views/classical/favorites";
import { useClassicalListing } from "@/views/classical/listing";
import {
  useCountryFilter,
  usePeriodFilter,
} from "@/views/classical/listFilters";
import { Feather } from "@lucide/vue";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ComposersTab" });

const { t } = useI18n();

const composers = ref<ClassicalComposer[]>([]);
const choices = ref<ClassicalComposerFilters>();

useOwnFavorites(() => composers.value.map((row) => row.artist));

const ITEMTYPE = "composers";

const periodFilter = usePeriodFilter(
  ITEMTYPE,
  () => choices.value?.periods ?? [],
);

const countryFilter = useCountryFilter(ITEMTYPE, () => choices.value);

const {
  viewMode,
  gridSize,
  loading,
  loadingMore,
  hasMore,
  loadMore,
  filtered,
} = useClassicalListing({
  itemtype: ITEMTYPE,
  listing: ListingType.CLASSICAL_COMPOSERS,
  items: composers,
  load: getComposers,
  query: () => ({
    period: periodFilter.selected.value,
    ...countryFilter.query.value,
  }),
  loadFilterChoices: async () => {
    choices.value = await getComposerFilters();
  },
  views: true,
  search: {
    placeholder: () => t("classical_filter_composers_placeholder"),
  },
  filters: () => [periodFilter.filter.value, countryFilter.filter.value],
});

const gridItems = useArtistGridItems({
  rows: () => composers.value,
  section: "composers",
  details: (c) => ({
    lines: [
      [
        c.artist.period && periodLabel(c.artist.period),
        workCountLabel(c.work_count),
      ]
        .filter(Boolean)
        .join(" · "),
    ],
  }),
});
</script>
