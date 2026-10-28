<template>
  <div class="composers-tab">
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
import { ListingType, type ClassicalComposer } from "@/plugins/api/interfaces";
import { getComposers } from "@/services/classical";
import { useArtistGridItems } from "@/views/classical/artistGrid";
import ClassicalArtistGrid from "@/views/classical/components/ClassicalArtistGrid.vue";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import { periodLabel, workCountLabel } from "@/views/classical/labels";
import { useOwnFavorites } from "@/views/classical/favorites";
import { useClassicalListing } from "@/views/classical/listing";
import {
  UNKNOWN_COUNTRY,
  useCountryFilter,
  usePeriodFilter,
} from "@/views/classical/listFilters";
import { Feather } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ComposersTab" });

const { t } = useI18n();

const composers = ref<ClassicalComposer[]>([]);

useOwnFavorites(() => composers.value.map((row) => row.artist));

const ITEMTYPE = "composers";

const periodFilter = usePeriodFilter(ITEMTYPE, () =>
  composers.value.map((c) => c.artist.period),
);

const countryFilter = useCountryFilter(ITEMTYPE, () =>
  composers.value.map((c) => c.country ?? UNKNOWN_COUNTRY),
);

const { viewMode, favoritesOnly, gridSize, loading, reload, search } =
  useClassicalListing({
    itemtype: ITEMTYPE,
    listing: ListingType.CLASSICAL_COMPOSERS,
    load: async (sort) => {
      composers.value = await getComposers(sort);
    },
    views: true,
    search: {
      placeholder: () => t("classical_filter_composers_placeholder"),
    },
    filters: () => [periodFilter.filter.value, countryFilter.filter.value],
  });

onMounted(reload);

const gridItems = useArtistGridItems({
  rows: () => composers.value,
  section: "composers",
  search,
  favoritesOnly,
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
  matches: (c) =>
    periodFilter.matches(c.artist.period) &&
    countryFilter.matches(c.country ?? UNKNOWN_COUNTRY),
});
</script>

<style scoped>
.composers-tab {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
