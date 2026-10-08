<template>
  <!-- The standard list play affordance, on hover-capable screens a blue play
       revealed on row hover in a reserved slot at the start of the row, on
       touch screens a small play button at the end. -->
  <button
    v-if="side === 'start' && !isTouch"
    type="button"
    class="row-play-slot"
    :disabled="disabled"
    :aria-label="label"
    @click.stop.prevent="(e: Event) => $emit('play', e)"
  >
    <span class="row-play-disc">
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
    class="row-play-touch"
    :aria-label="label"
    @click.stop.prevent="(e: Event) => $emit('play', e)"
  >
    <span class="row-play-disc-touch">
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
/* Sized like the album view's track number slot. */
.row-play-slot {
  display: grid;
  place-items: center;
  flex: none;
  align-self: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.row-play-slot:disabled {
  cursor: default;
}

.row-play-slot:disabled .row-play-disc {
  visibility: hidden;
}

.row-play-disc,
.row-play-disc-touch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  color: #fff;
}

.row-play-disc {
  width: 32px;
  height: 32px;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.classical-play-row:hover .row-play-disc,
.row-play-slot:focus-visible .row-play-disc {
  opacity: 1;
}

.row-play-touch {
  flex: none;
  align-self: center;
  margin-left: auto;
}

.row-play-disc-touch {
  width: 22px;
  height: 22px;
}
</style>
