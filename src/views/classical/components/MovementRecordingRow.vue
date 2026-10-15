<template>
  <!-- One recording's take on a movement, as the movement filter lists it. -->
  <div
    v-hold="(e: TouchEvent) => onHold(e)"
    class="movement-recording-row classical-play-row"
    @click.capture="swallowClickAfterHold"
    @click="onClick"
    @contextmenu.prevent="$emit('menu', tracks[0], recording, $event)"
    @touchstart.passive="onTouchStart"
  >
    <RowPlayButton
      side="start"
      :label="`${$t('play')} ${name}`"
      @play="(e: Event) => $emit('play', tracks, e)"
    />
    <RecordingCredits
      :recording="recording"
      class="movement-recording-credits"
    />
    <RowPlayButton
      side="end"
      :label="`${$t('play')} ${name}`"
      @play="(e: Event) => $emit('play', tracks, e)"
    />
    <ClassicalRowActions
      :name="name"
      :playing="tracks.some(isTrackPlaying)"
      :duration="tracks.reduce((sum, t) => sum + t.duration, 0)"
      :source-item="tracks[0]"
      :favorite-item="tracks.length === 1 ? tracks[0] : undefined"
      :favorite="tracks.length > 1 ? allLiked(tracks) : undefined"
      @toggle-favorite="setTracksLiked(tracks, !allLiked(tracks))"
      @menu="(e: Event) => $emit('menu', tracks[0], recording, e)"
    />
  </div>
</template>

<script setup lang="ts">
import {
  getEventPosition,
  useHoldToOpenMenu,
} from "@/composables/useHoldToOpenMenu";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import type { Recording, Track } from "@/plugins/api/interfaces";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import RecordingCredits from "@/views/classical/components/RecordingCredits.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import { recordingName } from "@/views/classical/credits";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
import { isRowControlClick } from "@/views/classical/listing";
import { isTrackPlaying } from "@/views/classical/playback";
import { computed } from "vue";

defineOptions({ name: "MovementRecordingRow" });

const props = defineProps<{
  recording: Recording;
  // the movement's tracks in this recording, usually one
  tracks: Track[];
}>();

const emit = defineEmits<{
  (e: "play", tracks: Track[], evt: Event): void;
  (e: "menu", track: Track, recording: Recording, evt: Event): void;
}>();

const name = computed(() => recordingName(props.recording));

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event) => emit("menu", props.tracks[0], props.recording, evt),
);

// The row opens or plays the way a click on any track row does.
const onClick = (evt: MouseEvent) => {
  if (isRowControlClick(evt)) return;
  const { x, y } = getEventPosition(evt);
  handleMediaItemClick(props.tracks[0], x, y);
};
</script>

<style scoped>
.movement-recording-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding: 0.5rem 0 0.5rem 7px;
  margin-left: -7px;
  border-radius: 4px;
  cursor: pointer;
}

.movement-recording-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

/* indented under the movement's heading */
.movement-recording-credits {
  padding-left: 1.5rem;
}
</style>
