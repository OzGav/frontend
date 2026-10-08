<template>
  <ClassicalSection
    v-if="tracks.length"
    :title="$t('classical_other_tracks')"
    :meta="$t('n_tracks', tracks.length, { named: { count: tracks.length } })"
  >
    <template #append>
      <MAButton
        variant="icon"
        icon="mdi-dots-vertical"
        :aria-label="$t('menu')"
        @click.stop="(e: Event) => openMenu(menuItems, e)"
      />
    </template>
    <ul class="other-tracks-list">
      <li
        v-for="t in sortedTracks"
        :key="t.item_id"
        v-hold="(e: TouchEvent) => onHold(e, t)"
        class="other-track-row classical-play-row"
        @click.capture="swallowClickAfterHold"
        @click="onRowClick(t, $event)"
        @contextmenu.prevent="$emit('menu-track', t, $event)"
        @touchstart.passive="onTouchStart"
      >
        <RowPlayButton
          side="start"
          :label="`${$t('play')} ${t.name}`"
          @play="(e: Event) => $emit('play-track', t, e)"
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
          @play="(e: Event) => $emit('play-track', t, e)"
        />
        <ClassicalRowActions
          :name="t.name"
          :playing="isTrackPlaying(t)"
          :duration="t.duration"
          :source-item="t"
          :favorite-item="t"
          @menu="(e: Event) => $emit('menu-track', t, e)"
        />
      </li>
    </ul>
  </ClassicalSection>
</template>

<script setup lang="ts">
import MAButton from "@/components/Button.vue";
import {
  getEventPosition,
  useHoldToOpenMenu,
} from "@/composables/useHoldToOpenMenu";
import type { ContextMenuItem } from "@/helpers/context_menu_item";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import type { Track } from "@/plugins/api/interfaces";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import { useOwnFavorites } from "@/views/classical/favorites";
import { isRowControlClick, useClassicalSort } from "@/views/classical/listing";
import { openMenu } from "@/views/classical/menu";
import { isTrackPlaying } from "@/views/classical/playback";
import { ArrowUpDown } from "@lucide/vue";
import { computed } from "vue";

defineOptions({ name: "OtherTracksSection" });

const props = defineProps<{
  tracks: Track[];
}>();

const emit = defineEmits<{
  (e: "play-track", track: Track, evt: Event): void;
  (e: "menu-track", track: Track, evt: Event): void;
}>();

useOwnFavorites(() => props.tracks);

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event, track: Track) => emit("menu-track", track, evt),
);

const SORT_OPTIONS = [
  { key: "name", label: "sort.name" },
  { key: "year", label: "sort.year_desc" },
  { key: "date_added", label: "sort.timestamp_added_desc" },
] as const;

const { sortBy: sortKey, setSort } = useClassicalSort(
  "other_tracks",
  SORT_OPTIONS.map((o) => o.key),
);

// The sort entry the standard listings show in their toolbar menu.
const menuItems = computed<ContextMenuItem[]>(() => [
  {
    label: "tooltip.sort_options",
    icon: ArrowUpDown,
    subItems: SORT_OPTIONS.map((option) => ({
      label: option.label,
      selected: sortKey.value === option.key,
      action: () => setSort(option.key),
    })),
  },
]);

// A click on the row itself does what a click on any track row does.
const onRowClick = (track: Track, evt: MouseEvent) => {
  if (isRowControlClick(evt)) return;
  const { x, y } = getEventPosition(evt);
  handleMediaItemClick(track, x, y);
};

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
.other-tracks-list {
  list-style: none;
  margin: 0;
  padding: 0;
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
