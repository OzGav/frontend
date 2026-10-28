<template>
  <ListingSearch
    ref="field"
    v-model="text"
    :open="open"
    :placeholder="placeholder"
    :with-icon="false"
    @close="emit('close')"
  />
  <Button
    variant="ghost"
    size="icon-lg"
    :title="$t(label)"
    :aria-label="$t(label)"
    :aria-expanded="open"
    @click="emit('toggle')"
  >
    <span class="relative inline-flex">
      <X v-if="closes" class="size-[22px]" />
      <Search v-else class="size-[22px]" />
      <span v-if="text && !closes" :class="ACTIVE_DOT_CLASS"></span>
    </span>
  </Button>
</template>

<script setup lang="ts">
import ListingSearch from "@/components/listing-toolbar/ListingSearch.vue";
import { Button } from "@/components/ui/button";
import { ACTIVE_DOT_CLASS } from "@/constants";
import { store } from "@/plugins/store";
import { Search, X } from "@lucide/vue";
import { computed, useTemplateRef } from "vue";

defineOptions({ name: "SectionSearch" });

/**
 * The search of a detail page section's heading: a search button and the
 * field it opens beside it. A phone shows the field in a ListingSearchRow
 * under the heading instead.
 */
const props = defineProps<{
  open: boolean;
  placeholder: string;
}>();

const text = defineModel<string>({ required: true });

const emit = defineEmits<{
  // the search button was clicked
  toggle: [];
  // Escape in the field asks to close it
  close: [];
}>();

const field = useTemplateRef("field");

defineExpose({
  focus: () => field.value?.focus(),
});

// a phone's field has a close button of its own, on its row
const closes = computed(() => props.open && !store.mobileLayout);
const label = computed(() =>
  closes.value
    ? "close"
    : text.value
      ? "tooltip.search_filter_active"
      : "tooltip.search",
);
</script>
