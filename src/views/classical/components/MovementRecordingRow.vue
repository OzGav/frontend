<template>
  <!-- One recording's take on a movement, as the movement filter lists it. -->
  <ClassicalPlayRow
    class="movement-recording-row"
    :label="`${$t('play')} ${name}`"
    @click="onClick"
    @menu="(e: Event) => $emit('menu', tracks[0], recording, e)"
    @play="(e: Event) => $emit('play', tracks, e)"
  >
    <RecordingCredits
      :recording="recording"
      class="movement-recording-credits"
    />
    <template #actions>
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
    </template>
  </ClassicalPlayRow>
</template>

<script setup lang="ts">
import { getEventPosition } from "@/composables/useHoldToOpenMenu";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import type { Recording, Track } from "@/plugins/api/interfaces";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import RecordingCredits from "@/views/classical/components/RecordingCredits.vue";
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

defineEmits<{
  (e: "play", tracks: Track[], evt: Event): void;
  (e: "menu", track: Track, recording: Recording, evt: Event): void;
}>();

const name = computed(() => recordingName(props.recording));

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
  padding-block: 0.5rem;
  cursor: pointer;
}

/* indented under the movement's heading */
.movement-recording-credits {
  padding-left: 1.5rem;
}
</style>
