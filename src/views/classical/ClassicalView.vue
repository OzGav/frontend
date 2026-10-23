<template>
  <section class="classical-view classical-typography">
    <Toolbar
      v-if="!fullBleedContent"
      :icon="Piano"
      :title="$t('classical')"
      :menu-items="menu?.items"
      :menu-active="menu?.active"
      :enforce-overflow-menu="true"
      class="classical-toolbar"
    >
      <Tabs
        ref="tabs"
        :model-value="activeTab"
        class="classical-tabs-inline"
        :class="{ 'icons-only': iconsOnly }"
      >
        <TabsList class="classical-tabs w-full h-auto">
          <TabsTrigger
            value="composers"
            class="classical-tab-trigger"
            @click="goToTab('composers')"
          >
            <Feather class="classical-tab-icon" />
            <span class="classical-tab-label">{{ $t("composers") }}</span>
          </TabsTrigger>
          <TabsTrigger
            value="works"
            class="classical-tab-trigger"
            @click="goToTab('works')"
          >
            <Music3 class="classical-tab-icon" />
            <span class="classical-tab-label">{{ $t("works") }}</span>
          </TabsTrigger>
          <TabsTrigger
            value="performers"
            class="classical-tab-trigger"
            @click="goToTab('performers')"
          >
            <Users class="classical-tab-icon" />
            <span class="classical-tab-label">{{ $t("performers") }}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <template v-if="search && !store.mobileLayout" #append>
        <Transition name="classical-search">
          <div v-if="search.open" class="classical-search-slot">
            <SearchInput
              :ref="search.bindInput"
              :model-value="search.text"
              clearable
              class="classical-search"
              :placeholder="search.placeholder"
              :aria-label="search.placeholder"
              @update:model-value="search.setText"
              @keydown.esc="search.close"
            />
          </div>
        </Transition>
      </template>
    </Toolbar>
    <div
      v-if="!fullBleedContent && search?.open && store.mobileLayout"
      class="classical-search-row"
    >
      <SearchInput
        :ref="search.bindInput"
        :model-value="search.text"
        clearable
        class="min-w-0 flex-1"
        :placeholder="search.placeholder"
        :aria-label="search.placeholder"
        @update:model-value="search.setText"
        @keydown.esc="search.close"
      />
      <Button
        variant="ghost"
        size="icon"
        class="size-10 shrink-0"
        :aria-label="$t('close')"
        :title="$t('close')"
        @click="search.close"
      >
        <X class="size-[22px]" />
      </Button>
    </div>
    <v-divider v-if="!fullBleedContent" />
    <div
      class="classical-tab-content"
      :class="{ 'full-bleed': fullBleedContent }"
    >
      <LinkProgressAlert v-if="!fullBleedContent" />
      <router-view />
    </div>
  </section>
</template>

<script setup lang="ts">
import Toolbar from "@/components/Toolbar.vue";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type ClassicalMenu,
} from "@/views/classical/listing";
import { Feather, Music3, Piano, Users, X } from "@lucide/vue";
import { unrefElement, useResizeObserver } from "@vueuse/core";
import { computed, nextTick, provide, ref, useTemplateRef } from "vue";
import { useRoute } from "vue-router";

defineOptions({ name: "ClassicalView" });

const route = useRoute();

// Set by the open tab, so the toolbar shows that tab's menu.
const menu = ref<ClassicalMenu>();
provide(CLASSICAL_MENU_KEY, menu);

const search = computed(() => menu.value?.search);

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

const fitTabLabels = () => {
  const el = unrefElement(tabs) as HTMLElement | undefined;
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

useResizeObserver(tabs, fitTabLabels);
// the serif font widens the labels once it has loaded
document.fonts?.ready.then(fitTabLabels);

// reka-ui's Tabs only emits update:modelValue on a value change, so clicking
// the tab already active wouldn't navigate. Drive navigation from a direct
// click handler.
const goToTab = useClassicalTabNavigation();
</script>

<style scoped>
.classical-view {
  /* every Classical search box is this wide, narrowing with the window */
  --classical-search-width: clamp(160px, calc(100vw - 640px), 260px);
  display: flex;
  flex-direction: column;
}

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

.classical-tabs-inline {
  flex: 1 1 auto;
  /* room for the three tab icons */
  min-width: 8rem;
  padding-right: 0.75rem;
}

.classical-tabs {
  width: 100%;
}

.classical-tab-trigger {
  font-weight: 600;
  line-height: 1.1;
  padding: 0.35rem 0.6rem;
  gap: 0.4rem;
  min-width: 0;
  overflow: hidden;
}

.classical-tab-label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.classical-tab-icon {
  flex-shrink: 0;
}

/* Pin icon size and font size against TabsTrigger's baked-in defaults
   (text-sm and [&_svg]:size-4). */
:deep(.classical-tab-trigger svg) {
  width: 1.05rem !important;
  height: 1.05rem !important;
}

:deep(.classical-tab-trigger),
:deep(.classical-tab-trigger span) {
  font-size: 0.95rem !important;
}

@media (max-width: 768px) {
  .classical-toolbar :deep(.v-toolbar-title),
  .classical-toolbar :deep(.v-toolbar-title__placeholder) {
    padding-right: 0.5rem;
  }
  .classical-tabs-inline {
    padding-right: 0;
  }
}

.icons-only .classical-tab-label {
  display: none;
}

.icons-only .classical-tab-trigger {
  padding: 0.3rem 0.5rem;
}

.classical-search-slot {
  display: flex;
  width: var(--classical-search-width);
}

.classical-search {
  width: var(--classical-search-width);
  flex-shrink: 0;
  font-size: 0.9375rem;
  font-weight: 400;
}

.classical-search-enter-active,
.classical-search-leave-active {
  overflow: hidden;
  transition: width 320ms cubic-bezier(0.32, 0.72, 0, 1);
}

.classical-search-enter-from,
.classical-search-leave-to {
  width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .classical-search-enter-active,
  .classical-search-leave-active {
    transition: none;
  }
}

.classical-search-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0.625rem 0.625rem 0;
}

.classical-tab-content {
  flex: 1;
  min-height: 0;
  padding: 0.75rem 1rem 1rem;
}

.classical-tab-content.full-bleed {
  padding: 0;
}
</style>
