<template>
  <!-- the empty state of the standard listings -->
  <Empty class="border-none gap-3 py-8">
    <EmptyMedia variant="icon">
      <FilterX v-if="filtered" class="h-5 w-5" />
      <ListMusic v-else class="h-5 w-5" />
    </EmptyMedia>
    <EmptyDescription>
      {{ filtered ? $t("no_content_filter") : $t("no_content") }}
    </EmptyDescription>
  </Empty>
</template>

<script setup lang="ts">
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { FilterX, ListMusic } from "@lucide/vue";

defineOptions({ name: "ClassicalEmpty" });

defineProps<{
  // a filter is narrowing the list, so nothing matches rather than nothing exists
  filtered?: boolean;
}>();
</script>
