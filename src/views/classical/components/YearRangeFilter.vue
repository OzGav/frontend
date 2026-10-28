<template>
  <!-- Both boxes share one mat so the pair reads as a single control. The
       keys that move within and between the boxes stay here, so a menu
       holding the control does not take them for its own navigation. -->
  <div
    class="year-range"
    role="group"
    :class="{ 'year-range--active': isActive }"
    @keydown.left.stop
    @keydown.right.stop
    @keydown.up.stop
    @keydown.down.stop
    @keydown.home.stop
    @keydown.end.stop
    @keydown.tab.stop
  >
    <div class="year-range-fields">
      <input
        :value="from"
        type="text"
        inputmode="numeric"
        maxlength="4"
        class="year-input"
        :placeholder="fromPlaceholder"
        :aria-label="$t('classical_date_range_from')"
        @input="onInput('from', $event)"
        @blur="settle('from')"
        @keydown.enter="settle('from')"
      />
      <span class="year-range-dash" aria-hidden="true">–</span>
      <input
        :value="to"
        type="text"
        inputmode="numeric"
        maxlength="4"
        class="year-input"
        :placeholder="toPlaceholder"
        :aria-label="$t('classical_date_range_to')"
        @input="onInput('to', $event)"
        @blur="settle('to')"
        @keydown.enter="settle('to')"
      />
    </div>
    <!-- Always laid out, so the mat keeps its width as a range is typed in. -->
    <button
      type="button"
      class="year-range-clear"
      :disabled="!isActive"
      :title="$t('classical_date_range_clear')"
      :aria-label="$t('classical_date_range_clear')"
      @click="clear"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";
import { computed } from "vue";

defineOptions({ name: "YearRangeFilter" });

const props = defineProps<{
  /** Earliest and latest year present in the list, shown as placeholders. */
  earliest?: number;
  latest?: number;
}>();

const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });

const isActive = computed(() => Boolean(from.value || to.value));

const fromPlaceholder = computed(() => props.earliest?.toString() ?? "");
const toPlaceholder = computed(() => props.latest?.toString() ?? "");

const onInput = (field: "from" | "to", event: Event) => {
  const el = event.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, "").slice(0, 4);
  // Write the cleaned value straight back so a rejected character never
  // lingers in the field when the model value is unchanged.
  el.value = digits;
  (field === "from" ? from : to).value = digits;
};

// A part-typed year stands for the span it opens, so 19 settles as 1900 in the
// earliest box and 1999 in the latest and the pair reads as a whole century.
const settle = (field: "from" | "to") => {
  const model = field === "from" ? from : to;
  if (model.value)
    model.value = model.value.padEnd(4, field === "from" ? "0" : "9");
};

const clear = () => {
  from.value = "";
  to.value = "";
};
</script>

<style scoped>
.year-range {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  /* as tall as the standard search box beside it, growing only when it wraps */
  min-height: 2.25rem;
  padding: 0 0.15rem 0 0.7rem;
  border-radius: 8px;
  background: var(--muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border, #3d3d3d);
}

.year-range--active {
  border-color: var(--ring, #03a9f4);
}

/* the boxes share any room the control is stretched to */
.year-range-fields {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.year-input {
  flex: 1 1 4.25rem;
  min-width: 0;
  width: 4.25rem;
  height: 1.75rem;
  padding: 0 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border, #444);
  background: var(--card, transparent);
  color: inherit;
  font: inherit;
  font-size: 0.9rem;
  text-align: center;
}

.year-input:focus-visible {
  outline: 2px solid var(--ring, #03a9f4);
  outline-offset: 1px;
}

.year-range-dash {
  color: var(--muted-foreground, #888);
}

.year-range-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted-foreground, #aaa);
  cursor: pointer;
}

.year-range-clear:disabled {
  visibility: hidden;
}

.year-range-clear:hover {
  background: var(--accent, rgba(255, 255, 255, 0.08));
  color: inherit;
}
</style>
