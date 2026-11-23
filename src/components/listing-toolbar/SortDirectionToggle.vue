<template>
  <!-- looks like the sort menu's button, but a click flips the order -->
  <Button
    variant="outline"
    class="gap-1 px-3"
    :title="description"
    :aria-label="description"
    @click="emit('toggle')"
  >
    {{ label }}
    <component :is="directionIcon" aria-hidden="true" />
  </Button>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { sortDirectionIcon } from "@/helpers/sort_options";
import type { SortDirection } from "@/plugins/api/interfaces";
import { computed } from "vue";

defineOptions({ name: "SortDirectionToggle" });

const props = defineProps<{
  // what the list sorts on, e.g. Date
  label: string;
  direction: SortDirection;
  // read out and shown on hover, naming the current order
  description: string;
}>();

const emit = defineEmits<{ toggle: [] }>();

const directionIcon = computed(() => sortDirectionIcon(props.direction));
</script>
