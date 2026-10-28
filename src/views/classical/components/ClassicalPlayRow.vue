<template>
  <!-- A list row with the standard play affordance and hover highlight, and
       its menu on right-click or long press when it has one. Like the standard
       rows, the highlight starts 7px before the play slot, and its hover overlay
       matches theirs. A row may set --play-row-inset to sit in from both edges
       of its list. -->
  <component
    :is="tag"
    v-hold="onRowHold"
    class="classical-play-row ml-[calc(var(--play-row-inset,0px)_-_7px)] rounded-[4px] pr-[var(--play-row-inset,0px)] pl-[7px] [&:hover]:bg-[color:rgba(var(--v-theme-on-surface),calc(var(--v-hover-opacity)*var(--v-theme-overlay-multiplier)))]"
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
    <slot></slot>
    <RowPlayButton
      side="end"
      :label="label"
      :disabled="disabled"
      @play="(e: Event) => $emit('play', e)"
    />
    <slot name="actions"></slot>
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
  { tag: "div", onMenu: undefined },
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
