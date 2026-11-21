<template>
  <div class="flex flex-col">
    <template v-for="g in groups" :key="g.key">
      <!-- lines up with the rows below, whose highlight starts 7px early -->
      <div
        class="group mt-[1rem] mr-0 mb-[0.25rem] ml-[-7px] flex items-center gap-[0.4rem] pl-[7px] first:mt-0"
      >
        <RowPlayButton
          reserved
          :label="`${$t('play')} ${g.name}`"
          :disabled="playActionInProgress"
          @click="(e: MouseEvent) => playGroup(g.rows, e)"
        />
        <!-- in the movements' own italic, as the Movements section lists them -->
        <h3
          class="m-0 min-w-0 flex-1 text-[1.05rem] font-semibold"
          :class="MOVEMENT_TITLE_CLASS"
        >
          {{ g.name }}
        </h3>
        <RowPlayButton
          :label="`${$t('play')} ${g.name}`"
          :disabled="playActionInProgress"
          @click="(e: MouseEvent) => playGroup(g.rows, e)"
        />
      </div>
      <MovementRecordingRow
        v-for="row in g.rows"
        :key="row.recording.key"
        :recording="row.recording"
        :tracks="row.tracks"
        @play="playTracks"
        @menu="(m: Track, r: Recording, e: Event) => emit('menu', m, r, e)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import RowPlayButton from "@/components/RowPlayButton.vue";
import { usePlayActionInProgress } from "@/composables/usePlayActionInProgress";
import type { Recording, Track } from "@/plugins/api/interfaces";
import MovementRecordingRow from "@/views/classical/components/MovementRecordingRow.vue";
import { playRecording, playTracks } from "@/views/classical/playback";
import type {
  MovementGroup,
  MovementRow,
} from "@/views/classical/recordingGroups";
import { MOVEMENT_TITLE_CLASS } from "@/views/classical/styles";

defineOptions({ name: "MovementGroupList" });

defineProps<{
  groups: MovementGroup[];
}>();

const emit = defineEmits<{
  (e: "menu", track: Track, recording: Recording, evt: Event): void;
}>();

// a play still starting holds the buttons, so a second tap can't queue it twice
const playActionInProgress = usePlayActionInProgress();

const playGroup = (rows: MovementRow[], evt: Event) => {
  playRecording(
    rows.flatMap((row) => row.tracks),
    evt,
  );
};
</script>
