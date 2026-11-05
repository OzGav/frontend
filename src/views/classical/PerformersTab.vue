<template>
  <div class="flex flex-col gap-4">
    <ClassicalArtistGrid
      v-if="gridItems.length || loading"
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="220"
      :loading="loading"
      :placeholder-icon="Users"
    />
    <ClassicalEmpty v-else :filtered="filtered" />
    <LoadMoreSentinel v-if="hasMore" :loading="loadingMore" @more="loadMore" />
  </div>
</template>

<script setup lang="ts">
import {
  ArtistRole,
  ListingType,
  type ClassicalPerformer,
  type ClassicalPerformerFilters,
} from "@/plugins/api/interfaces";
import { getPerformerFilters, getPerformers } from "@/services/classical";
import { useArtistGridItems } from "@/views/classical/artistGrid";
import ClassicalArtistGrid from "@/views/classical/components/ClassicalArtistGrid.vue";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import LoadMoreSentinel from "@/views/classical/components/LoadMoreSentinel.vue";
import { roleLabel } from "@/helpers/classical_credits";
import { recordingCountLabel } from "@/views/classical/labels";
import { useOwnFavorites } from "@/views/classical/favorites";
import { useListFilter } from "@/views/classical/listFilters";
import { useClassicalListing } from "@/views/classical/listing";
import { Users } from "@lucide/vue";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "PerformersTab" });

const ITEMTYPE = "performers";

const { t } = useI18n();

// The roles the filter offers, in panel order, with their names.
const ROLE_LABELS = {
  [ArtistRole.CONDUCTOR]: "classical_role.conductors",
  [ArtistRole.ORCHESTRA]: "classical_role.orchestras",
  [ArtistRole.ENSEMBLE]: "classical_role.chamber_groups",
  [ArtistRole.CHOIR]: "classical_role.choirs",
  [ArtistRole.SOLOIST]: "classical_role.soloists",
  // Catches credits with role=PERFORMER that weren't classified more specifically.
  [ArtistRole.PERFORMER]: "classical_role.other",
} satisfies Partial<Record<ArtistRole, string>>;

const performers = ref<ClassicalPerformer[]>([]);
const choices = ref<ClassicalPerformerFilters>();

useOwnFavorites(() => performers.value.map((row) => row.artist));

const roleFilter = useListFilter({
  itemtype: ITEMTYPE,
  key: "roleFilter",
  id: "role",
  label: "classical_filter_role",
  placeholder: "classical_filter_any_role",
  layout: "checkboxes",
  values: Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>,
  valueLabel: (role) => t(ROLE_LABELS[role]),
  present: () => choices.value?.roles ?? [],
});

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
  listing: ListingType.CLASSICAL_PERFORMERS,
  items: performers,
  load: getPerformers,
  query: () => ({ role: roleFilter.selected.value }),
  loadFilterChoices: async () => {
    choices.value = await getPerformerFilters();
  },
  views: true,
  search: {
    placeholder: () => t("classical_filter_performers_placeholder"),
  },
  filters: () => [roleFilter.filter.value],
});

const gridItems = useArtistGridItems({
  rows: () => performers.value,
  section: "performers",
  details: (p) => ({
    role: roleLabel(p.main_role),
    lines: [recordingCountLabel(p.recording_count)],
  }),
});
</script>
