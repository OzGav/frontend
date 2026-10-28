<template>
  <div class="recordings-list">
    <template v-for="g in groups" :key="g.key">
      <div class="movement-heading classical-play-row">
        <RowPlayButton
          side="start"
          :label="`${$t('play')} ${g.name}`"
          @play="(e: Event) => playGroup(g.rows, e)"
        />
        <h3 class="movement-heading-title">{{ g.name }}</h3>
        <RowPlayButton
          side="end"
          :label="`${$t('play')} ${g.name}`"
          @play="(e: Event) => playGroup(g.rows, e)"
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
import type { Recording, Track } from "@/plugins/api/interfaces";
import MovementRecordingRow from "@/views/classical/components/MovementRecordingRow.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import { playTracks } from "@/views/classical/playback";
import type {
  MovementGroup,
  MovementRow,
} from "@/views/classical/recordingGroups";

defineOptions({ name: "MovementGroupList" });

defineProps<{
  groups: MovementGroup[];
}>();

const emit = defineEmits<{
  (e: "menu", track: Track, recording: Recording, evt: Event): void;
}>();

const playGroup = (rows: MovementRow[], evt: Event) => {
  playTracks(
    rows.flatMap((row) => row.tracks),
    evt,
  );
};
</script>

<style scoped>
.recordings-list {
  display: flex;
  flex-direction: column;
}

.movement-heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  /* lines up with the rows below, whose highlight starts 7px early */
  padding-left: 7px;
  margin: 1rem 0 0.25rem -7px;
}

.movement-heading:first-child {
  margin-top: 0;
}

/* in the movements' own italic, as the Movements section lists them */
.movement-heading-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(
    --font-classical-serif,
    "Roboto Serif",
    ui-serif,
    Georgia,
    serif
  );
  font-optical-sizing: auto;
  font-style: italic;
  font-size: 1.05rem;
  font-weight: 600;
}
</style>
