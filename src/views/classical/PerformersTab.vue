<template>
  <div class="performers-tab">
    <ClassicalArtistGrid
      v-if="gridItems.length || loading"
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="220"
      :loading="loading"
      :placeholder-icon="Users"
    />
    <ClassicalEmpty v-else :filtered="performers.length > 0" />
  </div>
</template>

<script setup lang="ts">
import { normalizeForFilter } from "@/helpers/utils";
import { ArtistRole, type ClassicalPerformer } from "@/plugins/api/interfaces";
import { getPerformers } from "@/services/classical";
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
import { recordingCountLabel, roleLabel } from "@/views/classical/labels";
import { useOwnFavorites } from "@/views/classical/favorites";
import { useMenuFilter } from "@/views/classical/menuFilter";
import {
  useClassicalListing,
  useClassicalPreferences,
} from "@/views/classical/listing";
import { Drama, Users } from "@lucide/vue";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "PerformersTab" });

const ITEMTYPE = "performers";

const { t } = useI18n();

// The roles the filter offers, in menu order, with their names.
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

useOwnFavorites(() => performers.value.map((row) => row.artist));

const { preferences, save } = useClassicalPreferences(ITEMTYPE);

const search = ref(preferences.search ?? "");
watch(search, (value) => save("search", value));

const roleFilter = useMenuFilter({
  itemtype: ITEMTYPE,
  key: "roleFilter",
  label: "classical_filter_role",
  icon: Drama,
  values: Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>,
  valueLabel: (role) => ROLE_LABELS[role],
  present: () => performers.value.flatMap((p) => p.roles),
});

// The full list is fetched once; the menu filters narrow it client-side.
const { viewMode, favoritesOnly, gridSize, loading, reload } =
  useClassicalListing({
    itemtype: ITEMTYPE,
    listing: "classical_performers",
    load: async (sort) => {
      performers.value = await getPerformers(sort);
    },
    views: true,
    search: {
      text: search,
      placeholder: () => t("classical_filter_performers_placeholder"),
    },
    filters: () => [roleFilter.menuItem.value],
  });

// Built once per load, so filtering and redrawing reuse the folded name and
// image urls.
const rows = computed(() =>
  performers.value.map((p) => ({
    performer: p,
    haystack: normalizeForFilter(p.artist.name),
    item: {
      id: p.artist.item_id,
      artist: p.artist,
      name: p.artist.name,
      link: `/classical/performers/${p.artist.item_id}`,
      wideImage: cardImage(p, WIDE_IMAGE_SIZE),
      squareImage: squareImage(p, SQUARE_IMAGE_SIZE),
      listImage: squareImage(p, LIST_IMAGE_SIZE),
      role: roleLabel(p.main_role),
      lines: [recordingCountLabel(p.recording_count)],
    } satisfies ClassicalArtistGridItem,
  })),
);

const gridItems = computed<ClassicalArtistGridItem[]>(() => {
  const q = normalizeForFilter(search.value.trim());
  return rows.value
    .filter(
      (r) =>
        roleFilter.matches(r.performer.roles) &&
        (!favoritesOnly.value || r.performer.artist.favorite === true) &&
        (!q || r.haystack.includes(q)),
    )
    .map((r) => r.item);
});

onMounted(reload);
</script>

<style scoped>
.performers-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
