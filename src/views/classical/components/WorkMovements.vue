<template>
  <ClassicalSection :title="$t('classical_movements')">
    <template v-if="fromLibrary" #title-append>
      <!-- hugs the title, past the gap the section puts after it -->
      <span class="ml-[-8px] text-[22px] font-bold" aria-hidden="true">*</span>
    </template>
    <template v-if="model.length || selectedArias.length" #append>
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
