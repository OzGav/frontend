<template>
  <div class="recordings-list">
    <template v-for="g in groups" :key="g.key">
      <!-- with parts, the work's own recordings get a heading too -->
      <h3 v-if="g.link || groups.length > 1" class="part-heading">
        <router-link v-if="g.link" :to="g.link" class="part-title">
          {{ g.name }}
          <span v-if="g.version" class="text-muted-foreground">
            ({{ g.version }})</span
          >
        </router-link>
        <span v-else class="part-title">{{ g.name }}</span>
        <span v-if="g.composer" class="part-composer">
          · {{ g.composer }}
        </span>
      </h3>
      <WorkRecordingCard
        v-for="r in g.recordings"
        :key="r.key"
        :recording="r"
        :movements="movements"
        :act-movements="actMovementsOf(r)"
        @play-recording="playRecording"
        @play-movement="playMovement"
        @menu-recording="
          (rec: Recording, e: Event) => emit('menu-recording', rec, e)
        "
        @menu-movement="
          (m: Track, rec: Recording, e: Event) =>
            emit('menu-movement', m, rec, e)
        "
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Recording, Track, WorkMovement } from "@/plugins/api/interfaces";
import WorkRecordingCard from "@/views/classical/components/WorkRecordingCard.vue";
import { playTracks } from "@/views/classical/playback";
import type { RecordingGroup } from "@/views/classical/recordingGroups";

defineOptions({ name: "RecordingGroupList" });

defineProps<{
  groups: RecordingGroup[];
  // the work's movements, to name those each recording covers
  movements?: WorkMovement[];
  // the own numbers of the act a recording is of
  actMovementsOf: (recording: Recording) => WorkMovement[] | undefined;
}>();

const emit = defineEmits<{
  (e: "menu-recording", recording: Recording, evt: Event): void;
  (e: "menu-movement", movement: Track, recording: Recording, evt: Event): void;
}>();

const playRecording = (r: Recording, evt: Event) => {
  playTracks(r.tracks, evt);
};

const playMovement = (m: Track, evt: Event) => {
  playTracks([m], evt);
};
</script>

<style scoped>
.recordings-list {
  display: flex;
  flex-direction: column;
}

.part-heading {
  margin: 1rem 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
}

.part-heading:first-child {
  margin-top: 0;
}

.part-title {
  color: inherit;
  text-decoration: none;
}

a.part-title:hover {
  text-decoration: underline;
}

.part-composer {
  font-weight: 400;
  opacity: 0.7;
}
</style>
