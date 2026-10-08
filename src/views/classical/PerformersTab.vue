<template>
  <div class="performers-tab">
    <div class="performers-controls">
      <input
        v-model="search"
        type="search"
        :placeholder="searchPlaceholder"
        class="performers-search"
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
      v-if="gridItems.length"
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="220"
    />
    <p v-else-if="search.trim() || favoritesOnly" class="text-muted-foreground">
      {{ $t("classical_no_performers_match") }}
    </p>
    <p v-else class="text-muted-foreground">
      {{ $t("classical_no_performers_for_role") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { normalizeForFilter } from "@/helpers/utils";
import { ArtistRole, type ClassicalPerformer } from "@/plugins/api/interfaces";
import { getPerformers } from "@/services/classical";
import ClassicalArtistGrid, {
  type ClassicalArtistGridItem,
} from "@/views/classical/components/ClassicalArtistGrid.vue";
import { cardImage, squareImage } from "@/views/classical/images";
import { useOwnArtistFavorites } from "@/views/classical/favorites";
import { useClassicalListing } from "@/views/classical/listing";
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

useOwnArtistFavorites(() => performers.value.map((row) => row.artist));

const search = ref("");

// The full list is fetched once; the role chips filter it client-side.
const { sortBy, viewMode, favoritesOnly, gridSize, reload } =
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

const filteredPerformers = computed(() => {
  const role = activeRole.value;
  const q = normalizeForFilter(search.value.trim());
  const filtered = performers.value.filter(
    (p) =>
      (!role || p.roles.includes(role)) &&
      (!favoritesOnly.value || p.artist.favorite === true) &&
      (!q || normalizeForFilter(p.artist.name).includes(q)),
  );
  return filtered.sort((a, b) => {
    if (sortBy.value === "recordings") {
      const byCount = b.recording_count - a.recording_count;
      if (byCount !== 0) return byCount;
    }
    return collator.compare(a.artist.name, b.artist.name);
  });
});

const gridItems = computed<ClassicalArtistGridItem[]>(() =>
  filteredPerformers.value.map((p) => ({
    id: p.artist.item_id,
    artist: p.artist,
    name: p.artist.name,
    link: `/classical/performers/${p.artist.item_id}`,
    wideImage: cardImage(p),
    squareImage: squareImage(p),
    role: formatRole(p.main_role),
    lines: [
      `${p.recording_count} ${
        p.recording_count === 1
          ? t("classical_recording")
          : t("classical_recordings_lower")
      }`,
    ],
    initials: initials(p.artist.name),
  })),
);

const setRole = (role: ArtistRole | null) => {
  router.replace({
    path: "/classical/performers",
    query: role ? { role } : {},
  });
};

const formatRole = (raw: string) =>
  raw
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

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
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border, #444);
  background: var(--card, transparent);
  color: inherit;
  font: inherit;
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
