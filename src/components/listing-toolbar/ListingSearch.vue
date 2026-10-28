<template>
  <Button
    v-if="withIcon && !iconHidden && !fieldCloses && !fieldShown"
    ref="iconButton"
    variant="ghost"
    size="icon-lg"
    :title="$t('search')"
    :aria-label="$t('search')"
    :aria-expanded="open"
    @click="emit('toggle')"
  >
    <Search class="size-[22px]" />
  </Button>
  <Transition
    v-if="!inRow"
    name="listing-search"
    @before-enter="fieldShown = true"
    @before-leave="onFieldLeave"
    @after-leave="onFieldLeft"
  >
    <!-- the input follows the slot's edge as it opens, and the padding
         keeps its 3px focus ring inside the clipped area. With the icon it
         grows out of the icon's width and shrinks back to it, so the
         controls beside it do not jump -->
    <div
      v-if="open"
      class="-m-[3px] box-content flex w-[clamp(0px,calc(100vw-560px),280px)] p-[3px]"
      :class="
        withIcon
          ? '[&.listing-search-enter-from]:w-10 [&.listing-search-leave-to]:w-10'
          : '[&.listing-search-enter-from]:w-0 [&.listing-search-leave-to]:w-0'
      "
    >
      <SearchInput
        ref="input"
        v-model="text"
        :clearable="!withIcon"
        class="text-[0.9375rem] font-normal"
        :placeholder="placeholder"
        :aria-label="placeholder"
        @focus="emit('focus')"
        @blur="emit('blur')"
        @keydown.esc.prevent="emit('close')"
      >
        <!-- the search icon gives way to the field, so it closes here -->
        <template v-if="withIcon" #append>
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              class="text-muted-foreground"
              :title="$t('close')"
              :aria-label="$t('close')"
              @click="emit('close')"
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        </template>
      </SearchInput>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { SearchInput } from "@/components/ui/search-input";
import { store } from "@/plugins/store";
import { Search, X } from "@lucide/vue";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";

/**
 * The search of a listing's title bar: a search icon and the field that grows
 * out of it. A phone, or a title bar without room for the field, shows it in a
 * ListingSearchRow below the title bar instead, so only the icon is shown here.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    placeholder: string;
    // the field opens from a search icon and closes with its own X; without
    // it, the field is opened from elsewhere, e.g. a menu, and offers Clear
    withIcon?: boolean;
    // hides the search icon, e.g. while the listing is collapsed
    iconHidden?: boolean;
    // the title bar has no room for the field, so it opens below as on a phone
    narrow?: boolean;
  }>(),
  { withIcon: true },
);

const text = defineModel<string>();

const emit = defineEmits<{
  // the search icon was clicked
  toggle: [];
  // the X or Escape asks to close the field
  close: [];
  focus: [];
  blur: [];
}>();

const input = useTemplateRef<InstanceType<typeof SearchInput>>("input");
const iconButton = useTemplateRef<InstanceType<typeof Button>>("iconButton");

defineExpose({
  focus: () => input.value?.focus(),
});

const inRow = computed(() => store.mobileLayout || props.narrow);
const fieldCloses = computed(() => props.open && !inRow.value);

// the field stays on screen while it closes, and its icon waits for it to go
const fieldShown = ref(false);
// focus was in the field as it closed, so it goes to the icon that replaces it
let refocusIcon = false;

const onFieldLeave = (el: Element) => {
  refocusIcon = el.contains(document.activeElement);
};
const onFieldLeft = () => {
  fieldShown.value = false;
  if (!refocusIcon) return;
  refocusIcon = false;
  nextTick(() => (iconButton.value?.$el as HTMLElement | undefined)?.focus());
};

// moving to the row drops the inline field without letting it finish closing
watch(inRow, (row) => {
  if (row) fieldShown.value = false;
});
</script>

<style scoped>
.listing-search-enter-active,
.listing-search-leave-active {
  overflow: hidden;
  transition: width 320ms cubic-bezier(0.32, 0.72, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  .listing-search-enter-active,
  .listing-search-leave-active {
    transition: none;
  }
}
</style>
