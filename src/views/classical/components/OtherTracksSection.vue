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
        v-for="t in tracks"
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
import { ListingType, type Track } from "@/plugins/api/interfaces";
import { getOtherTracks } from "@/services/classical";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import { useOwnFavorites } from "@/views/classical/favorites";
import { isRowControlClick, useClassicalSort } from "@/views/classical/listing";
import { openMenu } from "@/views/classical/menu";
import { isTrackPlaying } from "@/views/classical/playback";
import { computed, ref, watch } from "vue";

defineOptions({ name: "OtherTracksSection" });

const props = defineProps<{
  artistId: string;
  // the artist's tracks as composer, otherwise as performer
  asComposer?: boolean;
}>();

const emit = defineEmits<{
  (e: "play-track", track: Track, evt: Event): void;
  (e: "menu-track", track: Track, evt: Event): void;
}>();

const tracks = ref<Track[]>([]);

useOwnFavorites(() => tracks.value);

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event, track: Track) => emit("menu-track", track, evt),
);

const { ready, sort, menuItem } = useClassicalSort({
  itemtype: "other_tracks",
  listing: ListingType.CLASSICAL_OTHER_TRACKS,
  onChange: () => load(),
});

// The sort entry the standard listings show in their toolbar menu.
const menuItems = computed<ContextMenuItem[]>(() => [menuItem.value]);

let loadCount = 0;

const load = async () => {
  const count = ++loadCount;
  await ready;
  // without them the page still shows, minus its Other tracks
  const list = await getOtherTracks(
    props.artistId,
    props.asComposer,
    sort.value,
  ).catch(() => []);
  // a newer load has taken over the section
  if (count !== loadCount) return;
  tracks.value = list;
};

watch(
  () => props.artistId,
  () => {
    tracks.value = [];
    load();
  },
  { immediate: true },
);

// A click on the row itself does what a click on any track row does.
const onRowClick = (track: Track, evt: MouseEvent) => {
  if (isRowControlClick(evt)) return;
  const { x, y } = getEventPosition(evt);
  handleMediaItemClick(track, x, y);
};
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
