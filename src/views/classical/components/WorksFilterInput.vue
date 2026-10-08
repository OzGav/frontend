<template>
  <input
    v-model="model"
    type="search"
    :placeholder="$t('classical_filter_detail_works_placeholder')"
    :aria-label="$t('classical_filter_detail_works_placeholder')"
    class="works-filter-input"
  />
</template>

<script setup lang="ts">
defineOptions({ name: "WorksFilterInput" });

const model = defineModel<string>({ required: true });
</script>

<style scoped>
/* Compact enough to sit on a section toolbar line. */
.works-filter-input {
  width: 14rem;
  max-width: 40vw;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border, #444);
  background: var(--card, transparent);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
}
</style>
