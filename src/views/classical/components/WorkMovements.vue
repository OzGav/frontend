<template>
  <ClassicalSection :title="$t('classical_movements')">
    <template v-if="fromLibrary" #title-append>
      <span class="movements-mark" aria-hidden="true">*</span>
    </template>
    <template v-if="model.length || selectedArias.length" #append>
      <Button variant="ghost" size="sm" @click="clear">
        {{ $t("clear") }}
      </Button>
    </template>
    <ul class="movement-list">
      <!-- a movement and its arias share a column -->
      <li v-for="group in groups" :key="group[0].key">
        <div
          v-for="row in group"
          :key="row.key"
          :class="{
            'movement-child': row.depth === 1,
            'movement-grandchild': row.depth === 2,
          }"
        >
          <button
            type="button"
            class="movement-toggle"
            :class="{ selected: row.selected }"
            :aria-pressed="row.selected"
            :disabled="!row.count && !row.selected"
            @click="row.toggle"
          >
            <span class="movement-check">
              <Check v-if="row.selected" :size="16" />
            </span>
            <span class="movement-name">{{ row.name }}</span>
            <span class="movement-count">({{ row.count }})</span>
          </button>
        </div>
      </li>
    </ul>
    <Button
      v-if="hasHidden"
      variant="link"
      size="sm"
      @click="expanded = !expanded"
    >
      {{ expanded ? $t("show_less") : $t("classical_filter_show_all") }}
    </Button>
    <p v-if="fromLibrary" class="movements-note">
      * {{ $t("classical_movements_from_library") }}
    </p>
  </ClassicalSection>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import type { WorkMovement } from "@/plugins/api/interfaces";
import type { ActAria } from "@/views/classical/actArias";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import { LONG_MOVEMENT_LIST } from "@/views/classical/labels";
import { Check } from "@lucide/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkMovements" });

const props = defineProps<{
  movements: WorkMovement[];
  // the number of shown recordings with each movement, by movement number
  counts: Record<number, number>;
  // the list was built from the library's tracks, so may miss movements
  fromLibrary?: boolean;
  // the arias recordings hold, listed under their act
  arias?: ActAria[];
  // the number of shown recordings with each aria, by its key
  ariaCounts?: Record<string, number>;
}>();

// the chosen movement numbers; empty shows the recordings list
const model = defineModel<number[]>({ required: true });
// the keys of the chosen arias
const selectedArias = defineModel<string[]>("selectedArias", {
  default: () => [],
});

// the arias an act shows until the list is expanded
const FOLDED_ARIAS = 3;

const expanded = ref(false);

// A long list shows only its first few movements until expanded; a chosen one
// always shows, and a shown one brings its parent.
const folded = computed(() => {
  if (props.movements.length <= LONG_MOVEMENT_LIST) return props.movements;
  const kept = new Set<number>(model.value);
  for (const m of props.movements.slice(0, LONG_MOVEMENT_LIST))
    kept.add(m.number);
  for (const m of props.movements)
    if (kept.has(m.number) && m.parent != null) kept.add(m.parent);
  return props.movements.filter((m) => kept.has(m.number));
});

// An act shows only its first few arias until expanded; a chosen one always
// shows, and a piece shows with its number.
const foldedArias = computed(() => {
  const arias = props.arias ?? [];
  const kept = new Set(
    arias
      .filter(
        (a) =>
          a.parent == null &&
          (selectedArias.value.includes(a.key) ||
            arias
              .filter((other) => other.act === a.act && other.parent == null)
              .indexOf(a) < FOLDED_ARIAS),
      )
      .map((a) => a.key),
  );
  return arias.filter(
    (a) =>
      kept.has(a.key) ||
      selectedArias.value.includes(a.key) ||
      (a.parent != null && kept.has(`${a.act}-${a.parent}`)),
  );
});

const hasHidden = computed(
  () =>
    folded.value.length < props.movements.length ||
    foldedArias.value.length < (props.arias ?? []).length,
);

const shown = computed(() => (expanded.value ? props.movements : folded.value));

const shownArias = computed(() =>
  expanded.value ? (props.arias ?? []) : foldedArias.value,
);

// each shown movement followed by its arias
const groups = computed(() =>
  shown.value.map((m) => [
    {
      key: `movement-${m.number}`,
      name: m.name,
      depth: m.parent != null ? 1 : 0,
      count: props.counts[m.number] ?? 0,
      selected: model.value.includes(m.number),
      toggle: () => (model.value = toggled(model.value, m.number)),
    },
    ...shownArias.value
      .filter((a) => a.act === m.number)
      .map((a) => ({
        key: `aria-${a.key}`,
        name: a.name,
        // a piece sits under its number
        depth: a.parent != null ? 2 : 1,
        count: props.ariaCounts?.[a.key] ?? 0,
        selected: selectedArias.value.includes(a.key),
        toggle: () =>
          (selectedArias.value = toggled(selectedArias.value, a.key)),
      })),
  ]),
);

const clear = () => {
  model.value = [];
  selectedArias.value = [];
};

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}
</script>

<style scoped>
.movements-mark {
  /* hugs the title, past the gap the section puts after it */
  margin-left: -8px;
  font-size: 22px;
  font-weight: 700;
}

.movements-note {
  /* the room added above is taken back from the gap to the next section */
  margin: 0.75rem 0 -0.75rem;
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

/* e.g. an aria under its act */
.movement-child {
  padding-left: 1.5rem;
}

/* e.g. one dance of a number */
.movement-grandchild {
  padding-left: 3rem;
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
