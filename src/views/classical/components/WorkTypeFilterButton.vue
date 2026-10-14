<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="work-type-filter"
        :class="{ 'work-type-filter--active': model.length > 0 }"
        :aria-label="$t('classical_filter_type')"
      >
        <Shapes />
        {{ $t("classical_type") }}
        <ChevronDown />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuCheckboxItem
        v-for="type in offered"
        :key="type"
        :model-value="model.includes(type)"
        @select.prevent
        @update:model-value="toggle(type)"
      >
        {{ $t(workTypeChoiceLabel(type)) }}
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  workTypeChoiceLabel,
  workTypeChoices,
} from "@/views/classical/menuFilter";
import { ChevronDown, Shapes } from "@lucide/vue";
import { computed } from "vue";

defineOptions({ name: "WorkTypeFilterButton" });

const props = defineProps<{
  // the types of the listed works, UNKNOWN_WORK_TYPE for those without one
  types: string[];
}>();

// the chosen types; empty shows every work
const model = defineModel<string[]>({ required: true });

const choices = workTypeChoices();

// A chosen type stays listed so it can be cleared even when no work has it.
const offered = computed(() => {
  const present = new Set(props.types);
  return choices.filter((t) => present.has(t) || model.value.includes(t));
});

const toggle = (type: string) => {
  model.value = model.value.includes(type)
    ? model.value.filter((t) => t !== type)
    : [...model.value, type];
};
</script>

<style scoped>
.work-type-filter {
  flex-shrink: 0;
}

.work-type-filter--active {
  border-color: var(--primary);
}
</style>
