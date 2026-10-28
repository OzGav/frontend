<template>
  <!-- the recordings shown are only those of the performer the page was opened for -->
  <div class="mb-2 flex flex-wrap items-center gap-x-3 text-sm">
    <i18n-t
      keypath="classical_filter_showing_by"
      :plural="count"
      tag="span"
      class="text-muted-foreground"
    >
      <template #count>{{ count }}</template>
      <template #performer>
        <strong class="text-foreground">{{ performer }}</strong>
      </template>
    </i18n-t>
    <Button variant="link" size="sm" class="h-auto px-0" @click="emit('clear')">
      {{ $t("classical_filter_show_all") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";

defineOptions({ name: "PerformerFilterLine" });

defineProps<{
  performer: string;
  count: number;
}>();

const emit = defineEmits<{
  // show the recordings of every performer again
  clear: [];
}>();
</script>
