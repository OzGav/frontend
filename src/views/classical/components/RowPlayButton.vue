<template>
  <!-- The standard list play affordance, on hover-capable screens a blue play
       revealed on row hover in a reserved slot at the start of the row, on
       touch screens a small play button at the end. The slot is sized like the
       album view's track number slot. -->
  <button
    v-if="side === 'start' && !isTouch"
    type="button"
    class="row-play-slot grid size-[32px] flex-none cursor-pointer place-items-center self-center border-0 bg-[transparent] p-0 text-inherit disabled:cursor-default"
    :disabled="disabled"
    :aria-label="label"
    @click.stop.prevent="(e: Event) => $emit('play', e)"
  >
    <span
      class="row-play-disc inline-flex size-[32px] items-center justify-center rounded-[999px] bg-[rgb(var(--v-theme-primary))] text-[#fff]"
    >
      <Play
        :size="16"
        fill="currentColor"
        :stroke-width="0"
        class="play-icon-centered"
      />
    </span>
  </button>
  <v-btn
    v-else-if="side === 'end' && isTouch && !disabled"
    icon
    variant="text"
    size="small"
    class="ml-auto flex-none self-center"
    :aria-label="label"
    @click.stop.prevent="(e: Event) => $emit('play', e)"
  >
    <span
      class="inline-flex size-[22px] items-center justify-center rounded-[999px] bg-[rgb(var(--v-theme-primary))] text-[#fff]"
    >
      <Play
        :size="11"
        fill="currentColor"
        :stroke-width="0"
        class="play-icon-centered"
      />
    </span>
  </v-btn>
</template>

<script setup lang="ts">
import { Play } from "@lucide/vue";
import { isTouch } from "@/views/classical/touch";

defineOptions({ name: "RowPlayButton" });

defineProps<{
  // where in the row this instance sits; each shows on its own kind of screen
  side: "start" | "end";
  label: string;
  // nothing to play; the start slot keeps its space so rows stay aligned
  disabled?: boolean;
}>();

defineEmits<{
  (e: "play", evt: Event): void;
}>();
</script>

<style scoped>
.row-play-slot:disabled .row-play-disc {
  visibility: hidden;
}

.row-play-disc {
  opacity: 0;
  transition: opacity 0.18s ease;
}

.classical-play-row:hover .row-play-disc,
.row-play-slot:focus-visible .row-play-disc {
  opacity: 1;
}
</style>
