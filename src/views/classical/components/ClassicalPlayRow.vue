<template>
  <!-- A list row with the standard play affordance and hover highlight, and
       its menu on right-click or long press when it has one. Like the standard
       rows, the highlight starts 7px before the play slot, and its hover overlay
       matches theirs. A row may set --play-row-inset to sit in from both edges
       of its list. -->
  <component
    :is="tag"
    v-hold="onRowHold"
    class="group ml-[calc(var(--play-row-inset,0px)_-_7px)] rounded-[4px] pr-[var(--play-row-inset,0px)] pl-[7px]"
    :class="ROW_HOVER_CLASS"
    :role="focusable ? 'button' : undefined"
    :tabindex="focusable ? 0 : undefined"
    @click.capture="swallowClickAfterHold"
    @keydown.enter.self="onKeyOpen"
    @keydown.space.self="onKeyOpen"
    @contextmenu="onContextMenu"
    @touchstart.passive="onTouchStart"
  >
    <RowPlayButton
      reserved
      :label="label"
      :disabled="playDisabled"
      @click="(e: MouseEvent) => $emit('play', e)"
    />
    <slot></slot>
    <RowPlayButton
      class="ml-auto"
      :label="label"
      :disabled="playDisabled"
      @click="(e: MouseEvent) => $emit('play', e)"
    />
    <slot name="actions"></slot>
  </component>
</template>

<script setup lang="ts">
import RowPlayButton from "@/components/RowPlayButton.vue";
import { useHoldToOpenMenu } from "@/composables/useHoldToOpenMenu";
import { usePlayActionInProgress } from "@/composables/usePlayActionInProgress";
import { ROW_HOVER_CLASS } from "@/views/classical/styles";
import { computed } from "vue";

defineOptions({ name: "ClassicalPlayRow" });

const props = withDefaults(
  defineProps<{
    // the row's element, e.g. li in a list
    tag?: string;
    // names the play buttons for screen readers
    label: string;
    // nothing to play, which dims the play buttons
    disabled?: boolean;
    // a prop rather than an emit, so a row without one keeps the browser's menu
    onMenu?: (evt: Event) => void;
    // reachable with the keyboard, where Enter or Space clicks the row, for a
    // row without a link or button of its own to open it by
    focusable?: boolean;
  }>(),
  { tag: "div", onMenu: undefined, focusable: false },
);

defineEmits<{
  (e: "play", evt: Event): void;
}>();

// a play still starting holds the buttons, so a second tap can't queue it twice
const playActionInProgress = usePlayActionInProgress();
const playDisabled = computed(
  () => props.disabled || playActionInProgress.value,
);

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event) => props.onMenu?.(evt),
);

const onRowHold = (evt: TouchEvent) => {
  if (props.onMenu) onHold(evt);
};

const onKeyOpen = (evt: KeyboardEvent) => {
  if (!props.focusable) return;
  evt.preventDefault();
  (evt.currentTarget as HTMLElement).click();
};

const onContextMenu = (evt: MouseEvent) => {
  if (!props.onMenu) return;
  evt.preventDefault();
  props.onMenu(evt);
};
</script>
