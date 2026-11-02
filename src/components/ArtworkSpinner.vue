<template>
  <div
    class="absolute inset-0 z-[3] flex items-center justify-center bg-black/40 text-white"
    aria-hidden="true"
  >
    <LoaderCircle class="animate-spin" :size="size" />
  </div>
</template>

<script setup lang="ts">
// A dimmed spinner over an item's artwork while the item is being opened; the
// item itself carries aria-busy for assistive technology.
import { LoaderCircle } from "@lucide/vue";

interface Props {
  size: number;
}
defineProps<Props>();
</script>
