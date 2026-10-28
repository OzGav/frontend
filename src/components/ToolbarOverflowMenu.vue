<template>
  <OverflowMenu :items="items">
    <Button
      variant="ghost"
      size="icon-lg"
      :title="$t('menu')"
      :aria-label="$t('menu')"
    >
      <span class="relative inline-flex">
        <EllipsisVertical class="size-[22px]" />
        <span v-if="active" :class="ACTIVE_DOT_CLASS"></span>
      </span>
    </Button>
  </OverflowMenu>
</template>

<script setup lang="ts">
import { ACTIVE_DOT_CLASS } from "@/constants";
import OverflowMenu from "@/components/OverflowMenu.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { Button } from "@/components/ui/button";
import { $t } from "@/plugins/i18n";
import { EllipsisVertical } from "@lucide/vue";

defineOptions({ name: "ToolbarOverflowMenu" });

/**
 * The toolbar's ⋮ button with its menu of toolbar items.
 */
defineProps<{
  items: readonly ToolBarMenuItem[];
  // shows a dot on the button, e.g. while a filter in the menu is on
  active?: boolean;
}>();
</script>
