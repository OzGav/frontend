<template>
  <!-- sized here, as the search box itself fills what it is given -->
  <div class="works-filter-input">
    <SearchInput
      v-model="model"
      clearable
      :placeholder="$t('classical_filter_works_placeholder')"
      :aria-label="$t('classical_filter_works_placeholder')"
    />
  </div>
</template>

<script setup lang="ts">
import { SearchInput } from "@/components/ui/search-input";

defineOptions({ name: "WorksFilterInput" });

const model = defineModel<string>({ required: true });
</script>

<style scoped>
/* As wide as the other Classical section search boxes, on a section heading
   line. */
.works-filter-input {
  flex-shrink: 0;
  width: var(--classical-search-width);
  font-size: 0.9375rem;
}

/* on phones the controls have a line of their own to fill */
@media (max-width: 539px) {
  .works-filter-input {
    flex: 1;
    width: auto;
  }
}
</style>
