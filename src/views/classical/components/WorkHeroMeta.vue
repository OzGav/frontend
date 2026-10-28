<template>
  <!-- tells it apart from a work of the same title -->
  <div v-if="work.version" class="work-meta-text">{{ work.version }}</div>
  <div class="work-meta-line">
    <Music :size="16" class="work-meta-icon" />
    <span class="work-meta-text">
      <router-link
        v-if="composerMapping"
        :to="`/classical/composers/${composerMapping.item_id}`"
        class="work-composer-link"
      >
        {{ composerMapping.name }}
      </router-link>
      <template v-for="(detail, i) in workDetails" :key="i">
        <span v-if="composerMapping || i" class="work-meta-sep">·</span
        >{{ detail }}
      </template>
    </span>
  </div>
  <div v-if="work.parent_work" class="work-meta-text work-part-of">
    {{ $t("classical_part_of") }}
    <router-link
      :to="`/classical/works/${work.parent_work.item_id}`"
      class="work-parent-link"
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

<style scoped>
.work-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.work-meta-icon {
  flex: none;
}

.work-meta-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-composer-link {
  font-family: var(--font-classical-serif);
  font-optical-sizing: auto;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.work-meta-sep {
  margin: 0 4px;
  opacity: 0.5;
}

/* lines up with the text after the icon on the line above */
.work-part-of {
  padding-left: 24px;
}

.work-parent-link {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
</style>
