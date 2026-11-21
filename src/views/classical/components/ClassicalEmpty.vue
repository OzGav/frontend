<template>
  <!-- the empty and failed states of the standard listings -->
  <Empty class="border-none">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <TriangleAlert v-if="failed" />
        <FilterX v-else-if="filtered" />
        <ListMusic v-else />
      </EmptyMedia>
      <EmptyTitle>
        {{ failed ? $t("items_load_failed") : $t("no_content") }}
      </EmptyTitle>
      <EmptyDescription v-if="filtered && !failed">
        {{ $t("no_content_filter_hint") }}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent v-if="failed">
      <Button variant="outline" size="sm" @click="emit('retry')">
        {{ $t("settings.retry") }}
      </Button>
    </EmptyContent>
  </Empty>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FilterX, ListMusic, TriangleAlert } from "@lucide/vue";

defineOptions({ name: "ClassicalEmpty" });

defineProps<{
  // a filter is narrowing the list, so nothing matches rather than nothing exists
  filtered?: boolean;
  // the list could not be loaded
  failed?: boolean;
}>();

const emit = defineEmits<{
  // load the list again
  retry: [];
}>();
</script>
