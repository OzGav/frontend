<template>
  <!-- Both boxes share one mat so the pair reads as a single control. The
       keys that move within and between the boxes stay here, so a menu
       holding the control does not take them for its own navigation. It is as
       tall as the standard search box beside it, growing only when it wraps. -->
  <div
    class="inline-flex min-h-[2.25rem] flex-wrap items-center gap-[0.35rem_0.6rem] rounded-[8px] border-[1px] border-solid bg-muted p-[0_0.15rem_0_0.7rem]"
    role="group"
    :class="isActive ? 'border-ring' : 'border-border'"
    @keydown.left.stop
    @keydown.right.stop
    @keydown.up.stop
    @keydown.down.stop
    @keydown.home.stop
    @keydown.end.stop
    @keydown.tab.stop
  >
    <!-- the boxes share any room the control is stretched to -->
    <div class="flex flex-auto items-center gap-[0.35rem]">
      <input
        :value="from"
        type="text"
        inputmode="numeric"
        maxlength="4"
        :class="INPUT_CLASS"
        :placeholder="fromPlaceholder"
        :aria-label="$t('classical_date_range_from')"
        @input="onInput('from', $event)"
        @blur="settle('from')"
        @keydown.enter="settle('from')"
      />
      <span class="text-muted-foreground" aria-hidden="true">–</span>
      <input
        :value="to"
        type="text"
        inputmode="numeric"
        maxlength="4"
        :class="INPUT_CLASS"
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
      class="flex size-[1.5rem] cursor-pointer items-center justify-center rounded-[50%] border-0 bg-[transparent] text-muted-foreground disabled:invisible [&:hover]:bg-accent [&:hover]:text-inherit"
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

const INPUT_CLASS =
  "year-input h-[1.75rem] w-[4.25rem] min-w-0 flex-[1_1_4.25rem] rounded-[6px] border-[1px] border-solid border-border bg-card p-[0_0.4rem] text-center text-[0.9rem] text-inherit [&:focus-visible]:outline-offset-[1px] [&:focus-visible]:[outline:2px_solid_var(--ring)]";

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
/* the page font, at the size its text utility sets */
.year-input {
  font: inherit;
}
</style>
