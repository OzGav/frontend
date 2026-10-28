<template>
  <!-- --play-offset is the play slot in front of each row, absent on touch
       screens -->
  <article
    class="[--play-offset:calc(32px_+_0.4rem)] [@media(hover:none)]:[--play-offset:0px]"
    :class="{ expanded }"
  >
    <ClassicalPlayRow
      class="flex items-center gap-[0.4rem]"
      :label="`${$t('play')} ${recordingName}`"
      @menu="(e: Event) => $emit('menu-recording', recording, e)"
      @play="(e: Event) => $emit('play-recording', recording, e)"
    >
      <!-- Not a <button>, as the credited names inside are links. -->
      <div
        role="button"
        tabindex="0"
        class="flex min-w-0 flex-1 cursor-pointer items-center gap-[0.6rem] border-0 bg-[transparent] p-[0.7rem_0.25rem_0.7rem_0] text-left [font:inherit] text-inherit"
        :aria-expanded="expanded"
        @click="toggle"
        @keydown.enter.self.prevent="toggle"
        @keydown.space.self.prevent="toggle"
      >
        <ChevronRight
          class="size-[1.1rem] shrink-0 [transition:transform_0.15s_ease]"
          :class="{ '[transform:rotate(90deg)]': expanded }"
        />
        <RecordingCredits :recording="recording">
          <span
            v-if="coverage"
            class="font-normal text-muted-foreground"
            :title="coverageTitle || undefined"
          >
            · {{ coverage }}
          </span>
        </RecordingCredits>
      </div>
      <template #actions>
        <ClassicalRowActions
          :name="recordingName"
          :duration="recording.duration"
          :source-item="recording.tracks[0]"
          :favorite="favorite"
          @toggle-favorite="setTracksLiked(recording.tracks, !favorite)"
          @menu="(e: Event) => $emit('menu-recording', recording, e)"
        />
      </template>
    </ClassicalPlayRow>
    <div v-if="expanded" class="flex flex-col gap-[0.5rem] p-[0_0_0.8rem]">
      <ol class="m-0 flex list-none flex-col gap-[0.1rem] p-0">
        <ClassicalPlayRow
          v-for="m in recording.tracks"
          :key="m.item_id"
          tag="li"
          class="flex cursor-pointer items-center gap-[0.4rem]"
          :label="`${$t('play')} ${trackName(m)}`"
          @click="onMovementClick(m, $event)"
          @menu="(e: Event) => $emit('menu-movement', m, recording, e)"
          @play="(e: Event) => $emit('play-movement', m, e)"
        >
          <!-- movement titles sit indented under the recording's credits -->
          <button
            type="button"
            class="flex min-w-0 flex-1 cursor-pointer items-baseline gap-0 border-0 bg-[transparent] p-[0.25rem_0_0.25rem_2.5rem] text-left [font:inherit] text-inherit"
            @click="(e: MouseEvent) => openMovement(m, e)"
          >
            <span class="movement-title text-[0.95rem]">{{
              trackName(m)
            }}</span>
          </button>
          <template #actions>
            <ClassicalRowActions
              :name="trackName(m)"
              :playing="isTrackPlaying(m)"
              :duration="m.duration"
              :source-item="m"
              :favorite-item="m"
              @menu="(e: Event) => $emit('menu-movement', m, recording, e)"
            />
          </template>
        </ClassicalPlayRow>
      </ol>
      <div
        v-for="album in albums"
        :key="album.item_id"
        class="ml-[calc(var(--play-offset)_+_2.5rem)] flex items-baseline gap-[0.4rem] text-[0.85rem] text-muted-foreground"
      >
        <span class="opacity-60">→</span>
        <router-link :to="`/albums/library/${album.item_id}`">
          {{ album.year ? `${album.name} (${album.year})` : album.name }}
        </router-link>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import type { Recording, Track, WorkMovement } from "@/plugins/api/interfaces";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import RecordingCredits from "@/views/classical/components/RecordingCredits.vue";
import { isRowControlClick } from "@/views/classical/listing";
import { recordingName as nameOf } from "@/views/classical/credits";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
import { movementCoverageLabel, trackLabel } from "@/views/classical/labels";
import { isTrackPlaying } from "@/views/classical/playback";
import { ChevronRight } from "@lucide/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkRecordingCard" });

const props = defineProps<{
  recording: Recording;
  // the work's movements, to name those the recording covers
  movements?: WorkMovement[];
  // the own numbers of the act it is of, to count those it holds
  actMovements?: WorkMovement[];
}>();

defineEmits<{
  (e: "play-recording", recording: Recording, evt: Event): void;
  (e: "play-movement", movement: Track, evt: Event): void;
  (e: "menu-recording", recording: Recording, evt: Event): void;
  (e: "menu-movement", movement: Track, recording: Recording, evt: Event): void;
}>();

const expanded = ref(false);

// A movement opens or plays the way a click on any track row does.
const openMovement = (track: Track, evt: MouseEvent) => {
  const { x, y } = getEventPosition(evt);
  handleMediaItemClick(track, x, y);
};

const onMovementClick = (track: Track, evt: MouseEvent) => {
  if (isRowControlClick(evt)) return;
  openMovement(track, evt);
};

const toggle = () => {
  expanded.value = !expanded.value;
};

// Recording is favourited only when every member movement is. Partial state
// renders as unfavourited.
const favorite = computed(() => allLiked(props.recording.tracks));

// names the buttons for screen readers
const recordingName = computed(() => nameOf(props.recording));

const coverage = computed(() =>
  movementCoverageLabel(
    props.recording,
    props.movements ?? [],
    props.actMovements,
  ),
);

// the work's, its parent's and the page's act names, which a track never goes by
const workNames = computed(() => [
  props.recording.work.name,
  ...(props.recording.parent_work ? [props.recording.parent_work.name] : []),
  ...(props.movements ?? []).filter((m) => m.work_id).map((m) => m.name),
]);

const trackName = (track: Track) =>
  trackLabel(track, workNames.value, props.actMovements);

// each album once, also when the library holds it twice under one name and year
const albums = computed(() => {
  const seen = new Set<string>();
  return props.recording.albums.filter((album) => {
    const keys = [album.item_id, `${album.name}|${album.year ?? ""}`];
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
});

// the covered movements' names, on hover
const coverageTitle = computed(() => {
  const covered = new Set(props.recording.movement_numbers);
  return (props.movements ?? [])
    .filter((m) => covered.has(m.number))
    .map((m) => m.name)
    .join("\n");
});
</script>

<style scoped>
.movement-title {
  font-family: var(
    --font-classical-serif,
    "Roboto Serif",
    ui-serif,
    Georgia,
    serif
  );
  font-optical-sizing: auto;
  font-style: italic;
}
</style>
