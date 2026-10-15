<template>
  <ClassicalSection :title="$t('classical_movements')">
    <template v-if="fromLibrary" #title-append>
      <span
        class="movements-mark"
        role="img"
        :title="isTouch ? undefined : $t('classical_movements_from_library')"
        :aria-label="$t('classical_movements_from_library')"
        >*</span
      >
    </template>
    <template v-if="model.length" #append>
      <Button variant="ghost" size="sm" @click="model = []">
        {{ $t("clear") }}
      </Button>
    </template>
    <ul class="movement-list">
      <li v-for="m in shown" :key="m.number">
        <button
          type="button"
          class="movement-toggle"
          :class="{ selected: model.includes(m.number) }"
          :aria-pressed="model.includes(m.number)"
          :disabled="!counts[m.number] && !model.includes(m.number)"
          @click="toggle(m.number)"
        >
          <span class="movement-check">
            <Check v-if="model.includes(m.number)" :size="16" />
          </span>
          <span class="movement-name">{{ m.name }}</span>
          <span class="movement-count">({{ counts[m.number] ?? 0 }})</span>
        </button>
      </li>
    </ul>
    <Button
      v-if="hasHidden"
      variant="link"
      size="sm"
      @click="expanded = !expanded"
    >
      {{ expanded ? $t("show_less") : $t("classical_show_all_movements") }}
    </Button>
    <!-- touch screens have no hover for the mark's note -->
    <p v-if="fromLibrary && isTouch" class="movements-note">
      * {{ $t("classical_movements_from_library") }}
    </p>
  </ClassicalSection>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import type { WorkMovement } from "@/plugins/api/interfaces";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import { LONG_MOVEMENT_LIST } from "@/views/classical/labels";
import { isTouch } from "@/views/classical/touch";
import { Check } from "@lucide/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkMovements" });

const props = defineProps<{
  movements: WorkMovement[];
  // the number of shown recordings with each movement, by movement number
  counts: Record<number, number>;
  // the list was built from the library's tracks, so may miss movements
  fromLibrary?: boolean;
}>();

// the chosen movement numbers; empty shows the recordings list
const model = defineModel<number[]>({ required: true });

const expanded = ref(false);

// A long list shows only the first few movements with recordings until
// expanded; a chosen one always shows.
const folded = computed(() => {
  if (props.movements.length <= LONG_MOVEMENT_LIST) return props.movements;
  let room = LONG_MOVEMENT_LIST;
  return props.movements.filter((m) => {
    if (model.value.includes(m.number)) return true;
    if (!props.counts[m.number] || !room) return false;
    room--;
    return true;
  });
});

const hasHidden = computed(() => folded.value.length < props.movements.length);

const shown = computed(() => (expanded.value ? props.movements : folded.value));

const toggle = (number: number) => {
  model.value = model.value.includes(number)
    ? model.value.filter((n) => n !== number)
    : [...model.value, number];
};
</script>

<style scoped>
.movements-mark {
  /* hugs the title, past the gap the section puts after it */
  margin-left: -8px;
  font-size: 22px;
  font-weight: 700;
  cursor: help;
}

.movements-note {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--muted-foreground, #888);
}

/* filled down the first column, then the second */
.movement-list {
  list-style: none;
  margin: 0;
  padding: 0;
  columns: 2;
  column-gap: 2rem;
}

.movement-list > li {
  break-inside: avoid;
}

@media (max-width: 768px) {
  .movement-list {
    columns: 1;
  }
}

.movement-toggle {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem 0.3rem 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.movement-toggle:hover:not(:disabled) {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

.movement-toggle:disabled {
  cursor: default;
  opacity: 0.5;
}

.movement-toggle.selected {
  color: var(--primary);
}

.movement-check {
  flex: none;
  width: 16px;
  align-self: center;
  display: inline-flex;
}

.movement-name {
  font-family: var(
    --font-classical-serif,
    "Roboto Serif",
    ui-serif,
    Georgia,
    serif
  );
  font-optical-sizing: auto;
  font-style: italic;
  font-size: 0.95rem;
}

.movement-count {
  color: var(--muted-foreground, #888);
  font-size: 0.875rem;
}
</style>
