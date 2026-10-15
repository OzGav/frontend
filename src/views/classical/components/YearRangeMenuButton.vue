<template>
  <!-- The year range behind a button, for headings too narrow to show it. -->
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        :title="$t('classical_filter_year')"
        :aria-label="$t('classical_filter_year')"
      >
        <span class="relative inline-flex">
          <EllipsisVertical />
          <span v-if="active" :class="ACTIVE_DOT_CLASS"></span>
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align="end"
      class="w-auto p-2"
      @open-auto-focus="preventOnScreenKeyboardOnOpen"
    >
      <YearRangeFilter
        v-model:from="from"
        v-model:to="to"
        :earliest="earliest"
        :latest="latest"
      />
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ACTIVE_DOT_CLASS } from "@/constants";
import { preventOnScreenKeyboardOnOpen } from "@/helpers/dialog_focus";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import { EllipsisVertical } from "@lucide/vue";

defineOptions({ name: "YearRangeMenuButton" });

defineProps<{
  earliest?: number;
  latest?: number;
  // a range is set, marked on the button
  active: boolean;
}>();

const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });
</script>
