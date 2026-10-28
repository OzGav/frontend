<template>
  <!-- A list row with the standard play affordance and hover highlight, and
       its menu on right-click or long press when it has one. -->
  <component
    :is="tag"
    v-hold="onRowHold"
    class="classical-play-row"
    @click.capture="swallowClickAfterHold"
    @contextmenu="onContextMenu"
    @touchstart.passive="onTouchStart"
  >
    <RowPlayButton
      side="start"
      :label="label"
      :disabled="disabled"
      @play="(e: Event) => $emit('play', e)"
    />
    <slot />
    <RowPlayButton
      side="end"
      :label="label"
      :disabled="disabled"
      @play="(e: Event) => $emit('play', e)"
    />
    <slot name="actions" />
  </component>
</template>

<script setup lang="ts">
import { useHoldToOpenMenu } from "@/composables/useHoldToOpenMenu";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";

defineOptions({ name: "ClassicalPlayRow" });

const props = withDefaults(
  defineProps<{
    // the row's element, e.g. li in a list
    tag?: string;
    // names the play buttons for screen readers
    label: string;
    // nothing to play; the start slot keeps its space so rows stay aligned
    disabled?: boolean;
    // a prop rather than an emit, so a row without one keeps the browser's menu
    onMenu?: (evt: Event) => void;
  }>(),
  { tag: "div" },
);

defineEmits<{
  (e: "play", evt: Event): void;
}>();

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event) => props.onMenu?.(evt),
);

const onRowHold = (evt: TouchEvent) => {
  if (props.onMenu) onHold(evt);
};

const onContextMenu = (evt: MouseEvent) => {
  if (!props.onMenu) return;
  evt.preventDefault();
  props.onMenu(evt);
};
</script>

<style scoped>
.classical-play-row {
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding-left: 7px;
  /* a row may set --play-row-inset to sit in from both edges of its list */
  padding-right: var(--play-row-inset, 0px);
  margin-left: calc(var(--play-row-inset, 0px) - 7px);
  border-radius: 4px;
}

.classical-play-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}
</style>
