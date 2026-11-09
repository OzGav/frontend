<template>
  <div class="flex flex-col">
    <template v-for="g in groups" :key="g.key">
      <!-- with parts, the work's own recordings get a heading too -->
      <h3
        v-if="g.link || groups.length > 1"
        class="mx-0 mt-[1rem] mb-[0.25rem] text-[1rem] font-semibold first:mt-0"
      >
        <router-link
          v-if="g.link"
          :to="g.link"
          class="text-inherit no-underline [&:hover]:underline"
        >
          {{ g.name }}
          <span v-if="g.version" class="text-muted-foreground">
            ({{ g.version }})</span
          >
        </router-link>
        <span v-else class="text-inherit no-underline">{{ g.name }}</span>
        <span v-if="g.composer" class="font-normal opacity-70">
          · {{ g.composer }}
        </span>
      </h3>
      <WorkRecordingCard
        v-for="r in g.recordings"
        :key="r.key"
        :recording="r"
        :movements="movements"
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
import type { RecordingGroup } from "@/views/classical/recordingGroups";

defineOptions({ name: "RecordingGroupList" });

defineProps<{
  groups: RecordingGroup[];
  // the work's movements, to name those each recording covers
  movements?: WorkMovement[];
}>();

const emit = defineEmits<{
  (e: "menu-recording", recording: Recording, evt: Event): void;
  (e: "menu-movement", movement: Track, recording: Recording, evt: Event): void;
}>();
</script>
