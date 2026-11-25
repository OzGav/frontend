<template>
  <img
    v-if="logo"
    class="w-auto max-w-full object-contain object-left"
    :class="isPhone ? 'h-[56px]' : 'h-[80px]'"
    :src="logo"
    alt=""
  />
  <h1 :class="nameClass">{{ item.name }}</h1>
</template>

<script setup lang="ts">
import { getImageThumbForItem } from "@/helpers/utils";
import { ImageType, type MediaItemType } from "@/plugins/api/interfaces";
import { isPhoneSizedScreen } from "@/plugins/breakpoint";
import { computed } from "vue";

const props = defineProps<{
  // named by its logo when it has one, else by its name clamped to two lines
  item: MediaItemType;
}>();

const isPhone = computed(() => isPhoneSizedScreen());

const logo = computed(() => getImageThumbForItem(props.item, ImageType.LOGO));

// the logo shows the name, so the heading stays for screen readers only
const nameClass = computed(() =>
  logo.value
    ? "sr-only"
    : [
        "m-0 line-clamp-2 leading-[1.2] font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]",
        isPhone.value
          ? "text-[34px] tracking-[-0.8px]"
          : "text-[48px] tracking-[-1.2px]",
      ],
);
</script>
