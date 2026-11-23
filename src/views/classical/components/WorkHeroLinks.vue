<template>
  <nav
    v-if="links.length"
    class="min-w-0 text-[14px] text-[rgba(255,255,255,0.85)] [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]"
    :aria-label="$t('classical_work_links')"
  >
    <template v-for="(link, index) in links" :key="link.type">
      <span v-if="index > 0" class="m-[0_4px] opacity-50">·</span>
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
