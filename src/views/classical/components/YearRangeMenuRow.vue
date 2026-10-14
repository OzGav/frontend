<!--
  The year range as a row of a toolbar menu.

  Typing and Tab stay with the boxes rather than moving through the menu, and
  clicks into them leave the menu open; Escape still closes it.
-->
<template>
  <div
    class="year-range-menu-row"
    @pointerdown.stop
    @click.stop
    @keydown="keepKey"
  >
    <YearRangeFilter
      v-model:from="from"
      v-model:to="to"
      :earliest="earliest"
      :latest="latest"
    />
  </div>
</template>

<script setup lang="ts">
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";

defineOptions({ name: "YearRangeMenuRow" });

defineProps<{
  earliest?: number;
  latest?: number;
}>();

const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });

const keepKey = (event: KeyboardEvent) => {
  if (event.key !== "Escape") event.stopPropagation();
};
</script>

<style scoped>
.year-range-menu-row {
  padding: 0.25rem 0.375rem;
}
</style>
