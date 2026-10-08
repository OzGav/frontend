<template>
  <SearchInput
    v-model="model"
    clearable
    class="works-filter-input"
    :placeholder="$t('classical_filter_detail_works_placeholder')"
    :aria-label="$t('classical_filter_detail_works_placeholder')"
  />
</template>

<script setup lang="ts">
import { SearchInput } from "@/components/ui/search-input";

defineOptions({ name: "WorksFilterInput" });

const model = defineModel<string>({ required: true });
</script>

<style scoped>
/* Compact enough to sit on a section heading line. */
.works-filter-input {
  width: 16rem;
  max-width: 45vw;
}
</style>
