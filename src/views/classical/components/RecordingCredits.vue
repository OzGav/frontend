<template>
  <div class="recording-title">
    <div class="recording-credits">
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
      <span v-if="recording.year" class="year"> ({{ recording.year }}) </span>
      <!-- notes after the year, e.g. the movements covered -->
      <slot></slot>
    </div>
    <span
      v-if="credits.performers.length && !credits.leadPerformers.length"
      class="performer-credits"
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

<style scoped>
.recording-title {
  flex: 1;
  min-width: 0;
}

.recording-credits {
  font-weight: 600;
  font-size: 0.95rem;
}

.year {
  color: var(--muted-foreground, #888);
  font-weight: 400;
  margin-left: 0.25rem;
}

.performer-credits {
  display: block;
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--muted-foreground, #888);
  margin-top: 0.1rem;
}
</style>
