<template>
  <div class="performers-tab">
    <div class="performers-controls">
      <SearchInput
        v-model="search"
        clearable
        class="performers-search"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
      />
    </div>

    <div class="role-chips">
      <button
        v-for="chip in chips"
        :key="chip.value ?? 'all'"
        type="button"
        class="role-chip"
        :class="{ active: chip.value === activeRole }"
        @click="setRole(chip.value)"
      >
        {{ $t(chip.labelKey) }}
      </button>
    </div>

    <ClassicalArtistGrid
      v-if="gridItems.length || loading"
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="220"
      :loading="loading"
      :placeholder-icon="Users"
    />
    <ClassicalEmpty
      v-else
      :filtered="!!search.trim() || favoritesOnly || !!activeRole"
    />
  </div>
</template>

<script setup lang="ts">
import { SearchInput } from "@/components/ui/search-input";
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
import { useClassicalListing } from "@/views/classical/listing";
import { Users } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

defineOptions({ name: "PerformersTab" });

const { t } = useI18n();

const props = defineProps<{
  // Pre-selected chip from /classical/performers?role=conductor.
  role?: string;
}>();

const router = useRouter();

interface Chip {
  /** null = "All" (no role filter). */
  value: ArtistRole | null;
  labelKey: string;
}

const chips: Chip[] = [
  { value: null, labelKey: "classical_role.all" },
  { value: ArtistRole.CONDUCTOR, labelKey: "classical_role.conductors" },
  { value: ArtistRole.ORCHESTRA, labelKey: "classical_role.orchestras" },
  { value: ArtistRole.ENSEMBLE, labelKey: "classical_role.chamber_groups" },
  { value: ArtistRole.CHOIR, labelKey: "classical_role.choirs" },
  { value: ArtistRole.SOLOIST, labelKey: "classical_role.soloists" },
  // Catches credits with role=PERFORMER that weren't classified more specifically.
  { value: ArtistRole.PERFORMER, labelKey: "classical_role.other" },
];

const performers = ref<ClassicalPerformer[]>([]);

useOwnFavorites(() => performers.value.map((row) => row.artist));

const search = ref("");

// The full list is fetched once; the role chips filter it client-side.
const { sortBy, viewMode, favoritesOnly, gridSize, loading, reload } =
  useClassicalListing({
    itemtype: "performers",
    sorts: [
      { key: "name", label: "sort.name" },
      { key: "recordings", label: "classical_sort_recordings" },
    ],
    load: async () => {
      performers.value = await getPerformers();
    },
    views: true,
  });

const searchPlaceholder = computed(() =>
  t("classical_filter_performers_placeholder"),
);

const activeRole = computed<ArtistRole | null>(() => {
  if (!props.role) return null;
  return chips.find((c) => c.value === props.role)?.value ?? null;
});

const collator = new Intl.Collator(undefined, { numeric: true });

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
  const role = activeRole.value;
  const q = normalizeForFilter(search.value.trim());
  return rows.value
    .filter(
      (r) =>
        (!role || r.performer.roles.includes(role)) &&
        (!favoritesOnly.value || r.performer.artist.favorite === true) &&
        (!q || r.haystack.includes(q)),
    )
    .sort((ra, rb) => {
      const a = ra.performer;
      const b = rb.performer;
      if (sortBy.value === "recordings") {
        const byCount = b.recording_count - a.recording_count;
        if (byCount !== 0) return byCount;
      }
      return collator.compare(a.artist.name, b.artist.name);
    })
    .map((r) => r.item);
});

const setRole = (role: ArtistRole | null) => {
  router.replace({
    path: "/classical/performers",
    query: role ? { role } : {},
  });
};

onMounted(reload);
</script>

<style scoped>
.performers-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.performers-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.performers-search {
  flex: 1;
  min-width: 200px;
}

.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.role-chip {
  background: transparent;
  color: inherit;
  border: 1px solid var(--border, #444);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.role-chip:hover {
  background: var(--muted, rgba(255, 255, 255, 0.05));
}

.role-chip.active {
  background: var(--primary, #4a90e2);
  border-color: var(--primary, #4a90e2);
  color: var(--primary-foreground, #fff);
  font-weight: 600;
}
</style>
