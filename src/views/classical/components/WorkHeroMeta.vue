<template>
  <!-- tells it apart from a work of the same title -->
  <div v-if="work.version" class="min-w-0 truncate">{{ work.version }}</div>
  <div class="flex min-w-0 items-center gap-[8px]">
    <Music :size="16" class="flex-none" />
    <span class="min-w-0 truncate">
      <router-link
        v-if="composerMapping"
        :to="`/classical/composers/${composerMapping.item_id}`"
        class="font-[family-name:var(--font-classical-serif)] font-semibold text-inherit no-underline [font-optical-sizing:auto]"
      >
        {{ composerMapping.name }}
      </router-link>
      <template v-for="(detail, i) in workDetails" :key="i">
        <span v-if="composerMapping || i" class="m-[0_4px] opacity-50">·</span
        >{{ detail }}
      </template>
    </span>
  </div>
  <!-- lines up with the text after the icon on the line above -->
  <div v-if="work.parent_work" class="min-w-0 truncate pl-[24px]">
    {{ $t("classical_part_of") }}
    <router-link
      :to="`/classical/works/${work.parent_work.item_id}`"
      class="font-semibold text-inherit no-underline"
    >
      {{ work.parent_work.name }}
      <span v-if="work.parent_work.version" class="text-muted-foreground">
        ({{ work.parent_work.version }})</span
      >
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { WorkType, type Artist, type Work } from "@/plugins/api/interfaces";
import { periodLabel, workTypeLabel } from "@/views/classical/labels";
import { Music } from "@lucide/vue";
import { computed } from "vue";

defineOptions({ name: "WorkHeroMeta" });

const props = defineProps<{
  work: Work;
  composer?: Artist;
}>();

const composerMapping = computed(() => props.work.composers[0]);

// e.g. Romantic · Op. 18 · Concerto · 1901; a type of Other says nothing
const workDetails = computed(() => {
  const w = props.work;
  return [
    props.composer?.period && periodLabel(props.composer.period),
    w.catalog_numbers[0],
    w.work_type && w.work_type !== WorkType.OTHER && workTypeLabel(w.work_type),
    w.composition_year && String(w.composition_year),
  ].filter((d): d is string => !!d);
});
</script>
