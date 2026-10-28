<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
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
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-56">
      <template v-for="(menuItem, index) in items" :key="index">
        <DropdownMenuSub v-if="menuItem.subItems?.length">
          <DropdownMenuSubTrigger
            class="gap-3"
            :disabled="menuItem.disabled == true"
          >
            <span class="relative inline-flex">
              <MenuItemIcon :icon="menuItem.icon" />
              <span v-if="menuItem.active" :class="ACTIVE_DOT_CLASS"></span>
            </span>
            <span class="min-w-0 flex-1 truncate">{{
              menuItemLabel(menuItem)
            }}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            align="start"
            :align-offset="-5"
            :side-offset="6"
            class="max-h-[70vh] min-w-56 overflow-y-auto"
          >
            <template
              v-for="subItem of menuItem.subItems.filter((x) => !x.hide)"
              :key="subItem.label"
            >
              <!-- custom inline control; renders its own row and manages
                   its own interaction without closing the menu -->
              <component
                :is="subItem.component"
                v-if="subItem.component"
                v-bind="subItem.componentProps"
              />
              <DropdownMenuItem
                v-else
                :disabled="subItem.disabled === true"
                class="gap-3"
                @select="(e: Event) => onSubItemSelect(e, menuItem, subItem)"
              >
                <MenuItemIcon :icon="subItem.icon" />
                <span class="min-w-0 flex-1 truncate">{{
                  menuItemLabel(subItem)
                }}</span>
                <Check v-if="subItem.selected" class="ml-auto size-4" />
              </DropdownMenuItem>
            </template>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          v-else
          :disabled="menuItem.disabled == true"
          class="gap-3"
          @select="(e: Event) => e.preventDefault()"
          @click="(e: MouseEvent) => onMenuItemClick(e, menuItem)"
        >
          <span class="relative inline-flex">
            <MenuItemIcon :icon="menuItem.icon" />
            <span v-if="menuItem.active" :class="ACTIVE_DOT_CLASS"></span>
          </span>
          <span class="min-w-0 flex-1 truncate">{{
            menuItemLabel(menuItem)
          }}</span>
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { ACTIVE_DOT_CLASS } from "@/constants";
import MenuItemIcon from "@/components/MenuItemIcon.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  menuItemLabel,
  type ContextMenuItem,
} from "@/helpers/context_menu_item";
import { $t } from "@/plugins/i18n";
import { Check, EllipsisVertical } from "@lucide/vue";
import { ref } from "vue";

defineOptions({ name: "ToolbarOverflowMenu" });

defineProps<{
  items: ToolBarMenuItem[];
  // shows a dot on the button, e.g. while a filter in the menu is on
  active?: boolean;
}>();

const open = ref(false);

const onSubItemSelect = (
  event: Event,
  parent: ToolBarMenuItem,
  subItem: ContextMenuItem,
) => {
  if (
    parent.closeOnContentClick === false ||
    subItem.close_on_click === false
  ) {
    event.preventDefault();
  }
  subItem.action?.();
};

const onMenuItemClick = (event: MouseEvent, menuItem: ToolBarMenuItem) => {
  event.preventDefault();
  if (!menuItem.action) return;
  open.value = false;
  menuItem.action();
};
</script>
