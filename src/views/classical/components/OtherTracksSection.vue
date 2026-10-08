<template>
  <section v-if="tracks.length" class="other-tracks-section">
    <Toolbar
      :title="sectionTitle"
      :menu-items="menuItems"
      color="transparent"
    />
    <v-divider />
    <ul class="other-tracks-list">
      <li
        v-for="t in sortedTracks"
        :key="t.item_id"
        class="other-track-row classical-play-row"
        @click="$emit('play-track', t)"
        @contextmenu.prevent="$emit('menu-track', t, $event)"
      >
        <RowPlayButton
          side="start"
          :label="`${$t('play')} ${t.name}`"
          @play="$emit('play-track', t)"
        />
        <div class="other-track-main">
          <span class="other-track-title">{{ t.name }}</span>
          <router-link
            v-if="t.album"
            :to="`/albums/library/${t.album.item_id}`"
            class="other-track-album"
            @click.stop
          >
            {{ t.album.name }}
          </router-link>
        </div>
        <RowPlayButton
          side="end"
          :label="`${$t('play')} ${t.name}`"
          @play="$emit('play-track', t)"
        />
        <ClassicalRowActions
          :duration="t.duration"
          :source-item="t"
          :favorite-item="t"
          @menu="(e: Event) => $emit('menu-track', t, e)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import Toolbar, { type ToolBarMenuItem } from "@/components/Toolbar.vue";
import type { Track } from "@/plugins/api/interfaces";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import { ArrowUpDown } from "@lucide/vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "OtherTracksSection" });

const props = defineProps<{
  tracks: Track[];
}>();

const { t } = useI18n();

const sectionTitle = computed(
  () => `${t("classical_other_tracks")} (${props.tracks.length})`,
);

defineEmits<{
  (e: "play-track", track: Track): void;
  (e: "menu-track", track: Track, evt: Event): void;
}>();

type SortKey = "name" | "year" | "date_added";
const sortKey = ref<SortKey>("name");

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "classical_sort_name" },
  { key: "year", label: "classical_sort_year_newest" },
  { key: "date_added", label: "classical_sort_date_added" },
];

// The same sort button the standard listings show in their toolbar.
const menuItems = computed<ToolBarMenuItem[]>(() => [
  {
    label: "tooltip.sort_options",
    icon: ArrowUpDown,
    subItems: SORT_OPTIONS.map((option) => ({
      label: option.label,
      selected: sortKey.value === option.key,
      action: () => {
        sortKey.value = option.key;
      },
    })),
  },
]);

const collator = new Intl.Collator(undefined, { numeric: true });

const sortedTracks = computed(() => {
  const list = [...props.tracks];
  switch (sortKey.value) {
    case "year":
      return list.sort((a, b) => {
        const ay = a.album?.year ?? -Infinity;
        const by = b.album?.year ?? -Infinity;
        return by - ay || collator.compare(a.name, b.name);
      });
    case "date_added":
      // ISO timestamps order correctly as plain strings
      return list.sort((a, b) =>
        (b.date_added ?? "").localeCompare(a.date_added ?? ""),
      );
    case "name":
    default:
      return list.sort((a, b) => collator.compare(a.name, b.name));
  }
});
</script>

<style scoped>
.other-tracks-section {
  margin-top: 1rem;
}

.other-tracks-list {
  list-style: none;
  margin: 0;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
}

.other-track-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding: 0.5rem 0.25rem 0.5rem 7px;
  margin-left: calc(0.25rem - 7px);
  border-radius: 4px;
  cursor: pointer;
}

.other-track-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

.other-track-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.other-track-title {
  font-weight: 500;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.other-track-album {
  font-size: 0.8rem;
  color: var(--muted-foreground, #888);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
