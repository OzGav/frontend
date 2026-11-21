<template>
  <ClassicalSection :title="title" :meta="meta">
    <template v-if="searchable" #append>
      <div class="ms-auto flex items-center">
        <ListingSearch
          ref="field"
          v-model="text"
          :open="open"
          :placeholder="placeholder"
          @toggle="toggle"
          @close="close"
        />
        <ToolbarOverflowMenu
          v-if="menu.length"
          :items="menu"
          :active="menuActive"
        />
      </div>
    </template>
    <template v-if="searchable" #below-head>
      <ListingSearchRow
        ref="row"
        v-model="text"
        :open="open"
        :placeholder="placeholder"
        @close="close"
      />
      <slot name="below-search"></slot>
    </template>
    <slot></slot>
  </ClassicalSection>
</template>

<script setup lang="ts">
import ListingSearch from "@/components/listing-toolbar/ListingSearch.vue";
import ListingSearchRow from "@/components/listing-toolbar/ListingSearchRow.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import ToolbarOverflowMenu from "@/components/ToolbarOverflowMenu.vue";
import { useListingSearch } from "@/composables/useListingSearch";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";

defineOptions({ name: "FilterableSection" });

/**
 * A detail page section whose heading offers a search of its list and a menu
 * of further filters. Clearing the text and setting `open` to false closes
 * the search, e.g. when the page opens another item.
 */
defineProps<{
  title: string;
  // short text beside the title, e.g. a count
  meta?: string;
  // the list has items, so the search and menu are offered
  searchable: boolean;
  placeholder: string;
  menu: ToolBarMenuItem[];
  // shows a dot on the menu button, e.g. while a filter in it is on
  menuActive?: boolean;
}>();

const text = defineModel<string>({ required: true });
const open = defineModel<boolean>("open", { required: true });

defineSlots<{
  // the section's list
  default(): unknown;
  // under the search row, shown while the list has items
  "below-search"(): unknown;
}>();

const { field, row, toggle, close } = useListingSearch(text, { open });
</script>
