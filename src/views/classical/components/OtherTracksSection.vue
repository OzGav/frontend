<template>
  <ClassicalSection
    v-if="tracks.length"
    :title="$t('classical_other_tracks')"
    :meta="$t('n_tracks', tracks.length, { named: { count: tracks.length } })"
  >
    <template #append>
      <!-- inset like the rows, so it lines up with their menu -->
      <LibrarySortControls
        v-if="sortOptions.length"
        class="me-1"
        mode="menu"
        :options="sortOptions"
        :sort-by="sortBy"
        @sort-by="setSort"
      />
    </template>
    <ul class="m-0 flex list-none flex-col p-0">
      <ClassicalPlayRow
        v-for="t in tracks"
        :key="t.item_id"
        tag="li"
        class="flex cursor-pointer items-center gap-[0.4rem] py-[0.5rem] [--play-row-inset:0.25rem]"
        :label="`${$t('play')} ${t.name}`"
        @click="onRowClick(t, $event)"
        @menu="(e: Event) => $emit('menu-track', t, e)"
        @play="(e: Event) => $emit('play-track', t, e)"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-[0.1rem]">
          <span class="truncate text-[0.95rem] font-medium">{{ t.name }}</span>
          <router-link
            v-if="t.album"
            :to="`/albums/library/${t.album.item_id}`"
            class="truncate text-[0.8rem] text-muted-foreground no-underline"
            @click.stop
          >
            {{ t.album.name }}
          </router-link>
        </div>
        <template #actions>
          <ClassicalRowActions
            :name="t.name"
            :playing="isTrackPlaying(t)"
            :duration="t.duration"
            :source-item="t"
            :favorite-item="t"
            @menu="(e: Event) => $emit('menu-track', t, e)"
          />
        </template>
      </ClassicalPlayRow>
    </ul>
  </ClassicalSection>
</template>

<script setup lang="ts">
import LibrarySortControls from "@/components/LibrarySortControls.vue";
import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import { ListingType, type Track } from "@/plugins/api/interfaces";
import { getOtherTracks } from "@/services/classical";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import { useOwnFavorites } from "@/views/classical/favorites";
import { isRowControlClick, useClassicalSort } from "@/views/classical/listing";
import { isTrackPlaying } from "@/views/classical/playback";
import { ref, watch } from "vue";

defineOptions({ name: "OtherTracksSection" });

const props = defineProps<{
  artistId: string;
  // the artist's tracks as composer, otherwise as performer
  asComposer?: boolean;
}>();

defineEmits<{
  (e: "play-track", track: Track, evt: Event): void;
  (e: "menu-track", track: Track, evt: Event): void;
}>();

const tracks = ref<Track[]>([]);

useOwnFavorites(() => tracks.value);

const {
  ready,
  sort,
  options: sortOptions,
  sortBy,
  setSort,
} = useClassicalSort({
  itemtype: "other_tracks",
  listing: ListingType.CLASSICAL_OTHER_TRACKS,
  onChange: () => load(),
});

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
