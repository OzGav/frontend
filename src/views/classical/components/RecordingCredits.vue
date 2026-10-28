<template>
  <div class="min-w-0 flex-1">
    <div class="text-[0.95rem] font-semibold">
      <span v-if="credits.conductors.length" class="conductor">
        <CreditLinks :artists="credits.conductors" separator=", " />
      </span>
      <span v-if="credits.conductors.length && credits.orchestras.length">
        /
      </span>
      <span v-if="credits.orchestras.length" class="orchestra">
        <CreditLinks :artists="credits.orchestras" separator=", " />
      </span>
      <span v-if="credits.leadPerformers.length" class="performers">
        <CreditLinks :artists="credits.leadPerformers" separator=", " />
      </span>
      <span
        v-if="recording.year"
        class="ml-[0.25rem] font-normal text-muted-foreground"
      >
        ({{ recording.year }})
      </span>
      <!-- notes after the year, e.g. the movements covered -->
      <slot></slot>
    </div>
    <span
      v-if="credits.performers.length && !credits.leadPerformers.length"
      class="mt-[0.1rem] block text-[0.85rem] font-normal text-muted-foreground"
    >
      <CreditLinks :artists="credits.performers" separator=" · " />
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Recording } from "@/plugins/api/interfaces";
import CreditLinks from "@/views/classical/components/CreditLinks.vue";
import { recordingCredits } from "@/views/classical/credits";
import { computed } from "vue";

defineOptions({ name: "RecordingCredits" });

const props = defineProps<{
  recording: Recording;
}>();

const credits = computed(() => recordingCredits(props.recording));
</script>
