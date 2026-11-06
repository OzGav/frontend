<template>
  <FilterableSection
    v-model="worksFilter"
    v-model:open="searchOpen"
    :title="title"
    :meta="works.length ? workCountLabel(filtered.length) : undefined"
    :searchable="works.length > 0"
    :placeholder="$t('classical_filter_works_placeholder')"
    :menu="worksMenu"
    :menu-active="worksMenuActive"
  >
    <div v-if="loading">
      <ListViewSkeleton v-for="n in 4" :key="n" />
    </div>
    <ul v-else-if="filtered.length" class="m-0 flex list-none flex-col p-0">
      <slot :filtered="filtered"></slot>
    </ul>
    <ClassicalEmpty v-else :filtered="works.length > 0" />
  </FilterableSection>
</template>

<script setup lang="ts">
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import { normalizeForFilter } from "@/helpers/text_filter";
import type { ClassicalWorkEntry } from "@/plugins/api/interfaces";
import { useBackFilter } from "@/views/classical/backFilter";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import FilterableSection from "@/views/classical/components/FilterableSection.vue";
import { workCountLabel } from "@/views/classical/labels";
import {
  UNKNOWN_WORK_TYPE,
  worksMenuItems,
} from "@/views/classical/listFilters";
import { computed, ref, watch } from "vue";

defineOptions({ name: "WorksSection" });

const props = defineProps<{
  title: string;
  works: ClassicalWorkEntry[];
  loading: boolean;
  // the artist whose works these are; another one starts unfiltered
  artistId: string;
}>();

defineSlots<{
  // the rows of the works the search and type filter keep
  default(props: { filtered: ClassicalWorkEntry[] }): unknown;
}>();

const worksFilter = ref("");
const searchOpen = ref(false);
const typeFilter = ref<string[]>([]);
const restoreWorksFilter = useBackFilter(
  () => ({ text: worksFilter.value, types: typeFilter.value }),
  (saved) => {
    worksFilter.value = saved.text;
    typeFilter.value = saved.types;
  },
);

const workType = (entry: ClassicalWorkEntry) =>
  entry.work.work_type ?? UNKNOWN_WORK_TYPE;

const worksMenu = computed(() =>
  worksMenuItems(props.works.map(workType), typeFilter),
);
const worksMenuActive = computed(() => worksMenu.value.some((i) => i.active));

// Title, catalog numbers, composers, part names and co-performers of each
// work, folded once per load rather than per keystroke.
const searchable = computed(() =>
  props.works.map((entry) => ({
    entry,
    haystack: normalizeForFilter(
      [
        entry.work.name,
        ...entry.work.catalog_numbers,
        ...entry.work.composers.map((c) => c.name),
        ...(entry.part_names ?? []),
        ...(entry.co_performers ?? []),
      ].join(" "),
    ),
  })),
);

const filtered = computed(() => {
  const q = normalizeForFilter(worksFilter.value.trim());
  return searchable.value
    .filter(
      ({ entry, haystack }) =>
        (!q || haystack.includes(q)) &&
        (!typeFilter.value.length ||
          typeFilter.value.includes(workType(entry))),
    )
    .map(({ entry }) => entry);
});

watch(
  () => props.artistId,
  () => {
    worksFilter.value = "";
    searchOpen.value = false;
    typeFilter.value = [];
    restoreWorksFilter();
  },
  { immediate: true },
);
</script>
