<template>
  <ClassicalSection :title="$t('classical_movements')">
    <template v-if="fromLibrary" #title-append>
      <!-- hugs the title, past the gap the section puts after it -->
      <span class="ml-[-8px] text-[22px] font-bold" aria-hidden="true">*</span>
    </template>
    <template v-if="model.length" #append>
      <Button variant="ghost" size="sm" @click="clear">
        {{ $t("clear") }}
      </Button>
    </template>
    <!-- filled down the first column, then the second -->
    <ul class="m-0 list-none columns-2 gap-x-[2rem] p-0 max-[769px]:columns-1">
      <!-- a movement and its arias share a column -->
      <li
        v-for="group in groups"
        :key="group[0].key"
        class="break-inside-avoid"
      >
        <!-- one step in, e.g. an aria under its act; two, e.g. one dance of
             a number -->
        <div
          v-for="row in group"
          :key="row.key"
          :class="{
            'pl-[1.5rem]': row.depth === 1,
            'pl-[3rem]': row.depth === 2,
          }"
        >
          <!-- the hover matches the overlay of the standard list rows -->
          <button
            type="button"
            class="flex w-full cursor-pointer items-baseline gap-[0.4rem] rounded-[4px] border-0 bg-[transparent] p-[0.3rem_0.5rem_0.3rem_0] text-left [font:inherit] disabled:cursor-default disabled:opacity-50 [&:hover:not(:disabled)]:bg-[color:rgba(var(--v-theme-on-surface),calc(var(--v-hover-opacity)*var(--v-theme-overlay-multiplier)))]"
            :class="
              row.selected ? 'text-[color:var(--primary)]' : 'text-inherit'
            "
            :aria-pressed="row.selected"
            :disabled="!row.count && !row.selected"
            @click="row.toggle"
          >
            <span class="inline-flex w-[16px] flex-none self-center">
              <Check v-if="row.selected" :size="16" />
            </span>
            <span class="movement-name text-[0.95rem]">{{ row.name }}</span>
            <span class="text-[0.875rem] text-muted-foreground"
              >({{ row.count }})</span
            >
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
    <!-- the room added above is taken back from the gap to the next section -->
    <p
      v-if="fromLibrary"
      class="m-[0.75rem_0_-0.75rem] text-[0.8rem] text-muted-foreground"
    >
      * {{ $t("classical_movements_from_library") }}
    </p>
  </ClassicalSection>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import type { WorkMovement } from "@/plugins/api/interfaces";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import {
  LONG_MOVEMENT_LIST,
  shortMovementName,
} from "@/views/classical/labels";
import { movementLineage } from "@/views/classical/recordingGroups";
import { Check } from "@lucide/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkMovements" });

const props = defineProps<{
  movements: WorkMovement[];
  // the number of shown recordings with each movement, by movement number
  counts: Record<number, number>;
  // the list was built from the library's tracks, so may miss movements
  fromLibrary?: boolean;
  // the numbers of the entries listed under the work's parts, e.g. the arias
  // of an opera's acts
  partEntries?: Set<number>;
}>();

// the chosen movement numbers; empty shows the recordings list
const model = defineModel<number[]>({ required: true });

// the arias an act shows until the list is expanded
const FOLDED_ARIAS = 3;

const expanded = ref(false);

const lineage = computed(() => movementLineage(props.movements));

const isAria = (n: number | null | undefined) =>
  n != null && (props.partEntries?.has(n) ?? false);

const own = computed(() => props.movements.filter((m) => !isAria(m.number)));
const arias = computed(() => props.movements.filter((m) => isAria(m.number)));

// A long list shows only its first few movements until expanded; a chosen one
// always shows, and a shown one brings its parent.
const folded = computed(() => {
  if (own.value.length <= LONG_MOVEMENT_LIST) return own.value;
  const kept = new Set<number>(model.value);
  for (const m of own.value.slice(0, LONG_MOVEMENT_LIST)) kept.add(m.number);
  for (const m of own.value)
    if (kept.has(m.number) && m.parent != null) kept.add(m.parent);
  return own.value.filter((m) => kept.has(m.number));
});

// An act shows only its first few arias until expanded; a chosen one always
// shows, and a piece shows with its number.
const foldedArias = computed(() => {
  const seen = new Map<number, number>();
  const kept = new Set<number>();
  for (const a of arias.value) {
    // a piece sits under a number, a number under its act
    if (isAria(a.parent)) continue;
    const index = seen.get(a.parent!) ?? 0;
    seen.set(a.parent!, index + 1);
    if (index < FOLDED_ARIAS || model.value.includes(a.number))
      kept.add(a.number);
  }
  return arias.value.filter(
    (a) =>
      kept.has(a.number) ||
      model.value.includes(a.number) ||
      (a.parent != null && kept.has(a.parent)),
  );
});

const hasHidden = computed(
  () =>
    folded.value.length < own.value.length ||
    foldedArias.value.length < arias.value.length,
);

const shown = computed(() => (expanded.value ? own.value : folded.value));

const shownArias = computed(() =>
  expanded.value ? arias.value : foldedArias.value,
);

const entryRow = (m: WorkMovement, name: string, depth: number) => ({
  key: `movement-${m.number}`,
  name,
  depth,
  count: props.counts[m.number] ?? 0,
  selected: model.value.includes(m.number),
  toggle: () => (model.value = toggled(model.value, m.number)),
});

// each shown movement followed by its arias
const groups = computed(() =>
  shown.value.map((m) => [
    entryRow(m, m.name, m.parent != null ? 1 : 0),
    ...shownArias.value
      .filter((a) => lineage.value.get(a.number)?.at(-1) === m.number)
      // a piece sits under its number
      .map((a) =>
        entryRow(a, shortMovementName(a.name), isAria(a.parent) ? 2 : 1),
      ),
  ]),
);

const clear = () => {
  model.value = [];
};

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}
</script>

<style scoped>
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
}
</style>
