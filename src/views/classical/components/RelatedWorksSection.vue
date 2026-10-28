<template>
  <ClassicalSection v-if="relatedWorks.length" :title="$t('related_works')">
    <ul class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="r in relatedWorks" :key="`${r.label}-${r.work.item_id}`">
        {{ $t(r.label) }}
        <router-link :to="`/classical/works/${r.work.item_id}`">
          {{ r.work.name }}
          <span v-if="r.work.version" class="text-muted-foreground">
            ({{ r.work.version }})</span
          >
        </router-link>
      </li>
    </ul>
  </ClassicalSection>
</template>

<script setup lang="ts">
import type { Work } from "@/plugins/api/interfaces";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import { computed } from "vue";

defineOptions({ name: "RelatedWorksSection" });

const props = defineProps<{
  work?: Work;
}>();

// Works this one is arranged from, then works arranged from it.
const relatedWorks = computed(() => [
  ...(props.work?.arrangement_of ?? []).map((w) => ({
    label: "classical_arrangement_of",
    work: w,
  })),
  ...(props.work?.arrangements ?? []).map((w) => ({
    label: "classical_arranged_as",
    work: w,
  })),
]);
</script>
