<template>
  <ClassicalSection
    :title="title"
    :meta="works.length ? workCountLabel(filtered.length) : undefined"
  >
    <template v-if="works.length" #append>
      <div class="ms-auto flex items-center">
        <SectionSearch
          ref="searchField"
          v-model="worksFilter"
          :open="searchOpen"
          :placeholder="$t('classical_filter_works_placeholder')"
          @toggle="toggleSearch"
          @close="closeSearch"
        />
        <ToolbarOverflowMenu
          v-if="worksMenu.length"
          :items="worksMenu"
          :active="worksMenuActive"
        />
      </div>
    </template>
    <template v-if="works.length" #below-head>
      <ListingSearchRow
        ref="searchRow"
        v-model="worksFilter"
        :open="searchOpen"
        :placeholder="$t('classical_filter_works_placeholder')"
        @close="closeSearch"
      />
    </template>
    <div v-if="loading">
      <ListViewSkeleton v-for="n in 4" :key="n" />
    </div>
    <ul v-else-if="filtered.length" class="works-list">
      <slot :filtered="filtered"></slot>
    </ul>
    <ClassicalEmpty v-else :filtered="works.length > 0" />
  </ClassicalSection>
</template>

<script
  setup
  lang="ts"
  generic="T extends { haystack: string; work_type?: WorkType | null }"
>
import ListingSearchRow from "@/components/listing-toolbar/ListingSearchRow.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import ToolbarOverflowMenu from "@/components/ToolbarOverflowMenu.vue";
import { normalizeForFilter } from "@/helpers/utils";
import type { WorkType } from "@/plugins/api/interfaces";
import { useBackFilter } from "@/views/classical/backFilter";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import SectionSearch from "@/views/classical/components/SectionSearch.vue";
import { workCountLabel } from "@/views/classical/labels";
import {
  UNKNOWN_WORK_TYPE,
  worksMenuItems,
} from "@/views/classical/listFilters";
import { useSectionSearch } from "@/views/classical/sectionSearch";
import { computed, ref, watch } from "vue";

defineOptions({ name: "WorksSection" });

const props = defineProps<{
  title: string;
  // each with its haystack, the text the search matches, folded
  works: T[];
  loading: boolean;
  // the artist whose works these are; another one starts unfiltered
  artistId: string;
}>();

defineSlots<{
  // the rows of the works the search and type filter keep
  default(props: { filtered: T[] }): unknown;
}>();

const worksFilter = ref("");
const {
  open: searchOpen,
  field: searchField,
  row: searchRow,
  toggle: toggleSearch,
  close: closeSearch,
} = useSectionSearch(worksFilter);
const typeFilter = ref<string[]>([]);
const restoreWorksFilter = useBackFilter(
  () => ({ text: worksFilter.value, types: typeFilter.value }),
  (saved) => {
    worksFilter.value = saved.text;
    typeFilter.value = saved.types;
  },
);

const workTypes = computed(() =>
  props.works.map((w) => w.work_type ?? UNKNOWN_WORK_TYPE),
);
const worksMenu = computed(() => worksMenuItems(workTypes.value, typeFilter));
const worksMenuActive = computed(() => worksMenu.value.some((i) => i.active));

const filtered = computed(() => {
  const q = normalizeForFilter(worksFilter.value.trim());
  return props.works.filter(
    (w) =>
      (!q || w.haystack.includes(q)) &&
      (!typeFilter.value.length ||
        typeFilter.value.includes(w.work_type ?? UNKNOWN_WORK_TYPE)),
  );
});

watch(
  () => props.artistId,
  () => {
    closeSearch();
    typeFilter.value = [];
    restoreWorksFilter();
  },
  { immediate: true },
);
</script>

<style scoped>
.works-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
</style>
