<template>
  <nav
    v-if="links.length"
    class="inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full bg-[rgba(0,0,0,0.45)] px-2 text-[12px] font-medium"
    :aria-label="$t('classical_work_links')"
  >
    <!-- the look of the providers pill beneath it -->
    <template v-for="(link, index) in links" :key="link.type">
      <span v-if="index > 0" class="opacity-40">·</span>
      <a
        :href="link.url"
        target="_blank"
        rel="noopener"
        class="whitespace-nowrap text-inherit no-underline hover:underline focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--v-theme-primary))]"
        >{{ $t(link.label) }}</a
      >
    </template>
  </nav>
</template>

<script setup lang="ts">
import type { Work } from "@/plugins/api/interfaces";
import { workLinks } from "@/views/classical/workLinks";
import { computed } from "vue";

export interface Props {
  work: Work;
}
const props = defineProps<Props>();

const links = computed(() => workLinks(props.work.metadata.links));
</script>
