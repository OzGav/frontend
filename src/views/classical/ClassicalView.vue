<template>
  <section class="classical-typography flex flex-col">
    <Toolbar
      v-if="!fullBleedContent"
      ref="toolbar"
      :icon="Piano"
      :title="$t('classical')"
      :menu-items="menu?.items"
      :enforce-overflow-menu="true"
      class="classical-toolbar"
    >
      <!-- The minimum width leaves room for the three tab icons. -->
      <Tabs
        ref="tabs"
        :model-value="activeTab"
        class="min-w-[8rem] flex-[1_1_auto] pr-[0.75rem] max-[769px]:pr-0"
        :class="{ 'icons-only': iconsOnly }"
      >
        <TabsList class="w-full h-auto">
          <TabsTrigger
            value="composers"
            :class="TAB_TRIGGER_CLASS"
            @click="goToTab('composers')"
          >
            <Feather class="size-[1.05rem] shrink-0" />
            <span
              class="classical-tab-label min-w-0 overflow-hidden whitespace-nowrap"
              >{{ $t("composers") }}</span
            >
          </TabsTrigger>
          <TabsTrigger
            value="works"
            :class="TAB_TRIGGER_CLASS"
            @click="goToTab('works')"
          >
            <Music3 class="size-[1.05rem] shrink-0" />
            <span
              class="classical-tab-label min-w-0 overflow-hidden whitespace-nowrap"
              >{{ $t("works") }}</span
            >
          </TabsTrigger>
          <TabsTrigger
            value="performers"
            :class="TAB_TRIGGER_CLASS"
            @click="goToTab('performers')"
          >
            <Users class="size-[1.05rem] shrink-0" />
            <span
              class="classical-tab-label min-w-0 overflow-hidden whitespace-nowrap"
              >{{ $t("performers") }}</span
            >
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <template v-if="menu" #append>
        <div ref="controls" class="flex items-center">
          <ListingSearch
            v-if="search"
            ref="searchField"
            :model-value="search.text"
            :open="search.open"
            :placeholder="search.placeholder"
            :narrow="compactControls"
            @update:model-value="search.setText"
            @toggle="toggleSearch"
            @close="search.close"
          />
          <ListingToolbarControls
            :sort-options="menu.sort.options"
            :sort-by="menu.sort.sortBy"
            :view-mode="menu.sort.viewMode ?? ''"
            :show-view-modes="!!menu.sort.viewMode"
            :views="CLASSICAL_VIEWS"
            :filters="menu.filters"
            :active-filter-count="activeFilters"
            :compact="store.mobileLayout || compactControls"
            @sort-by="menu.sort.setSort"
            @view-mode="menu.sort.setViewMode"
            @clear-filters="menu.clearFilters"
          />
        </div>
      </template>
    </Toolbar>
    <ListingSearchRow
      v-if="!fullBleedContent && search"
      ref="searchRow"
      :model-value="search.text"
      :open="search.open"
      :placeholder="search.placeholder"
      :narrow="compactControls"
      @update:model-value="search.setText"
      @close="search.close"
    />
    <v-divider v-if="!fullBleedContent" />
    <div
      class="min-h-0 flex-1"
      :class="fullBleedContent ? 'p-0' : 'p-[0.75rem_1rem_1rem]'"
    >
      <LinkProgressAlert v-if="!fullBleedContent" />
      <router-view />
    </div>
  </section>
</template>

<script setup lang="ts">
import ListingSearch from "@/components/listing-toolbar/ListingSearch.vue";
import ListingSearchRow from "@/components/listing-toolbar/ListingSearchRow.vue";
import ListingToolbarControls from "@/components/listing-toolbar/ListingToolbarControls.vue";
import Toolbar from "@/components/Toolbar.vue";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeFilterCount } from "@/helpers/listing_filters";
import { store } from "@/plugins/store";
import {
  CLASSICAL_DEFAULT_TAB,
  isClassicalTab,
  useClassicalTabNavigation,
  type ClassicalTab,
} from "@/views/classical/tabs";
import LinkProgressAlert from "@/views/classical/components/LinkProgressAlert.vue";
import {
  CLASSICAL_MENU_KEY,
  CLASSICAL_VIEWS,
  type ClassicalMenu,
} from "@/views/classical/listing";
import { Feather, Music3, Piano, Users } from "@lucide/vue";
import { unrefElement, useResizeObserver } from "@vueuse/core";
import { computed, nextTick, provide, ref, useTemplateRef, watch } from "vue";
import { useRoute } from "vue-router";

defineOptions({ name: "ClassicalView" });

// a little larger than TabsTrigger's text-sm, keeping its line height
const TAB_TRIGGER_CLASS =
  "classical-tab-trigger min-w-0 overflow-hidden text-[0.95rem] leading-[calc(1.25/0.875)]";

const route = useRoute();

// Set by the open tab, so the toolbar shows that tab's menu.
const menu = ref<ClassicalMenu>();
provide(CLASSICAL_MENU_KEY, menu);

const search = computed(() => menu.value?.search);
const activeFilters = computed(() =>
  activeFilterCount(menu.value?.filters ?? []),
);

const searchField = useTemplateRef("searchField");
const searchRow = useTemplateRef("searchRow");

// opening the field from its icon puts the cursor in it
const toggleSearch = () => {
  const opening = !search.value?.open;
  search.value?.toggle();
  if (!opening) return;
  nextTick(() =>
    (store.mobileLayout || compactControls.value
      ? searchRow
      : searchField
    ).value?.focus(),
  );
};

const activeTab = computed<ClassicalTab>(() => {
  const segment = route.path.split("/")[2];
  return isClassicalTab(segment) ? segment : CLASSICAL_DEFAULT_TAB;
});

// Detail routes open on their own banner (ClassicalHero), which carries the
// back arrow, menu and section links, so the toolbar and padding go.
const fullBleedContent = computed(() =>
  route.matched.some((r) => r.meta?.fullBleed === true),
);

// The tabs drop their labels for just the icons as soon as one label no longer
// fits, and take them back once the tabs are as wide as all of them need.
const tabs = useTemplateRef("tabs");
const iconsOnly = ref(false);
let labelsWidth = 0;

const tabsElement = () => tabs.value?.$el as HTMLElement | undefined;

const fitTabLabels = () => {
  const el = tabsElement();
  if (!el) return;
  const width = el.clientWidth;
  if (iconsOnly.value) {
    if (width < labelsWidth) return;
    iconsOnly.value = false;
    // the labels may still not fit, e.g. in another language
    nextTick(fitTabLabels);
    return;
  }
  const labels = [...el.querySelectorAll<HTMLElement>(".classical-tab-label")];
  const overflow = Math.max(
    0,
    ...labels.map((label) => label.scrollWidth - label.clientWidth),
  );
  if (!overflow) return;
  // the tabs share the width equally, so each needs the widest one's shortfall
  labelsWidth = width + labels.length * overflow;
  iconsOnly.value = true;
};

useResizeObserver(tabsElement, fitTabLabels);
// the serif font widens the labels once it has loaded
document.fonts?.ready.then(fitTabLabels);

// When the toolbar runs out of room, with the tabs already down to their
// icons, the sort and filter buttons shrink to icons as on a phone, until the
// toolbar is again as wide as they need.
const toolbar = useTemplateRef("toolbar");
const controls = useTemplateRef("controls");
const compactControls = ref(false);
let controlsWidth = 0;

const toolbarContent = () =>
  (toolbar.value?.$el as HTMLElement | undefined)?.querySelector<HTMLElement>(
    ".v-toolbar__content",
  ) ?? undefined;

const fitControls = () => {
  const el = toolbarContent();
  if (!el) return;
  if (compactControls.value) {
    if (el.clientWidth < controlsWidth) return;
    compactControls.value = false;
    nextTick(fitControls);
    return;
  }
  if (el.scrollWidth <= el.clientWidth) return;
  controlsWidth = el.scrollWidth;
  compactControls.value = true;
};

// an open field that no longer fits moves to the row, taking the cursor along
watch(compactControls, (compact) => {
  if (compact && search.value?.open) nextTick(() => searchRow.value?.focus());
});

// the controls widen as the search field opens, so they are watched as well
useResizeObserver(
  () => [toolbarContent(), unrefElement(controls)],
  fitControls,
);

// reka-ui's Tabs only emits update:modelValue on a value change, so clicking
// the tab already active wouldn't navigate. Drive navigation from a direct
// click handler.
const goToTab = useClassicalTabNavigation();
</script>

<style scoped>
/* Inherited by all child routes; referenced by inner components for movement titles. */
.classical-typography {
  --font-classical-serif:
    "Roboto Serif", ui-serif, Georgia, "Times New Roman", serif;
}

.classical-typography :deep(.classical-tab-trigger),
.classical-typography :deep(.classical-tab-trigger span) {
  font-family: var(--font-classical-serif);
  font-optical-sizing: auto;
}

.classical-typography :deep(.v-card-title) {
  font-family: var(--font-classical-serif);
  font-optical-sizing: auto;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.classical-typography :deep(.header.v-toolbar) {
  font-family: var(--font-classical-serif);
  font-optical-sizing: auto;
}

/* Toolbar's title is a native <button>; no classical view wires titleClicked. */
.classical-typography :deep(.v-toolbar-title button) {
  cursor: default;
}

.classical-toolbar :deep(.v-toolbar__content) {
  gap: 0.75rem;
}

/* The title gives way to the tabs: its gap first, then its text. */
.classical-toolbar :deep(.v-toolbar-title) {
  flex: 0 1 auto;
  min-width: 0;
  font-weight: 600;
  padding-right: 2rem;
}

.classical-toolbar :deep(.v-toolbar-title button) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

/* Vuetify wraps the title slot in v-toolbar-title__placeholder; override its
   internal padding so the trailing space matches the leading icon gap. */
.classical-toolbar :deep(.v-toolbar-title__placeholder) {
  padding-right: 2rem;
}

@media (max-width: 768px) {
  .classical-toolbar :deep(.v-toolbar-title),
  .classical-toolbar :deep(.v-toolbar-title__placeholder) {
    padding-right: 0.5rem;
  }
}

.icons-only .classical-tab-label {
  display: none;
}
</style>
