<template>
  <div
    v-if="open && (store.mobileLayout || narrow)"
    class="mx-2.5 mt-2.5 flex items-center gap-1"
  >
    <SearchInput
      ref="input"
      v-model="text"
      clearable
      class="listing-search--row min-w-0 flex-1"
      :placeholder="placeholder"
      :aria-label="placeholder"
      @focus="emit('focus')"
      @blur="emit('blur')"
      @keydown.esc.prevent="emit('close')"
    />
    <Button
      variant="ghost"
      size="icon"
      class="size-10 shrink-0"
      :aria-label="$t('close')"
      :title="$t('close')"
      @click="emit('close')"
    >
      <X class="size-[22px]" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { store } from "@/plugins/store";
import { X } from "@lucide/vue";
import { useTemplateRef } from "vue";

/**
 * The search field of a listing on a phone, on a row of its own below the
 * title bar, whose ListingSearch has room for the search icon only.
 */
defineProps<{
  open: boolean;
  placeholder: string;
  // the title bar has no room for the field, so it shows here as on a phone
  narrow?: boolean;
}>();

const text = defineModel<string>();

const emit = defineEmits<{
  // the close button or Escape asks to close the field
  close: [];
  focus: [];
  blur: [];
}>();

const input = useTemplateRef<InstanceType<typeof SearchInput>>("input");

defineExpose({
  focus: () => input.value?.focus(),
});
</script>
