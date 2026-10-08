<template>
  <div class="composers-tab">
    <div class="composers-controls">
      <input
        v-model="search"
        type="search"
        :placeholder="searchPlaceholder"
        class="composers-search"
        :aria-label="searchPlaceholder"
      />
    </div>

    <ClassicalArtistGrid
      v-if="gridItems.length"
      :items="gridItems"
      :view-mode="viewMode"
      :grid-size="gridSize"
      :min-card-width="280"
    />
    <p v-else-if="composers.length" class="text-muted-foreground">
      {{ $t("classical_no_composers_match") }}
    </p>
    <p v-else class="text-muted-foreground">
      {{ $t("classical_no_composers") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { normalizeForFilter } from "@/helpers/utils";
import type { ClassicalComposer } from "@/plugins/api/interfaces";
import { getComposers } from "@/services/classical";
import ClassicalArtistGrid, {
  type ClassicalArtistGridItem,
} from "@/views/classical/components/ClassicalArtistGrid.vue";
import { cardImage, squareImage } from "@/views/classical/images";
import { useOwnArtistFavorites } from "@/views/classical/favorites";
import { useClassicalListing } from "@/views/classical/listing";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ComposersTab" });

const { t } = useI18n();

const composers = ref<ClassicalComposer[]>([]);

useOwnArtistFavorites(() => composers.value.map((row) => row.artist));

const search = ref("");

const { sortBy, viewMode, favoritesOnly, gridSize, reload } =
  useClassicalListing({
    itemtype: "composers",
    sorts: [
      { key: "sort_name", label: "sort.sort_name" },
      { key: "name", label: "sort.name" },
      { key: "works", label: "classical_sort_works" },
    ],
    load: async () => {
      composers.value = await getComposers();
    },
    views: true,
  });

const searchPlaceholder = computed(() =>
  t("classical_filter_composers_placeholder"),
);

onMounted(reload);

const collator = new Intl.Collator(undefined, { numeric: true });

const filteredComposers = computed(() => {
  const q = normalizeForFilter(search.value.trim());
  const filtered = composers.value.filter(
    (c) =>
      (!favoritesOnly.value || c.artist.favorite === true) &&
      (!q || normalizeForFilter(c.artist.name).includes(q)),
  );
  const sortName = (c: ClassicalComposer) =>
    c.artist.sort_name || c.artist.name;
  return filtered.sort((a, b) => {
    if (sortBy.value === "works") {
      const byCount = b.work_count - a.work_count;
      if (byCount !== 0) return byCount;
      return collator.compare(sortName(a), sortName(b));
    }
    if (sortBy.value === "sort_name") {
      return collator.compare(sortName(a), sortName(b));
    }
    return collator.compare(a.artist.name, b.artist.name);
  });
});

const gridItems = computed<ClassicalArtistGridItem[]>(() =>
  filteredComposers.value.map((c) => ({
    id: c.artist.item_id,
    artist: c.artist,
    name: c.artist.name,
    link: `/classical/composers/${c.artist.item_id}`,
    wideImage: cardImage(c),
    squareImage: squareImage(c),
    lines: [`${t("works")}: ${c.work_count}`],
  })),
);
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
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border, #444);
  background: var(--card, transparent);
  color: inherit;
  font: inherit;
}
</style>
