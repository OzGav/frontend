<template>
  <!-- Quick jumps to the Classical tabs, joined like the tab bar on phones. -->
  <Tabs :model-value="current" class="mr-2">
    <!-- the same dark backdrop as the banner's heart and menu buttons -->
    <TabsList class="h-10 rounded-lg bg-black/35">
      <TabsTrigger
        v-for="link in LINKS"
        :key="link.tab"
        :value="link.tab"
        class="px-2.5 text-white/80 hover:text-white dark:text-white/80 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-white/20 dark:data-[state=active]:text-white"
        :title="$t(link.label)"
        :aria-label="$t(link.label)"
        @click="goToTab(link.tab)"
      >
        <component :is="link.icon" class="size-5" />
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>

<script setup lang="ts">
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClassicalTabNavigation,
  type ClassicalTab,
} from "@/views/classical/tabs";
import { Feather, Music3, Users } from "@lucide/vue";

defineOptions({ name: "ClassicalSectionLinks" });

defineProps<{
  // the section the page belongs to, highlighted
  current?: ClassicalTab;
}>();

const LINKS = [
  { tab: "composers", label: "composers", icon: Feather },
  { tab: "works", label: "works", icon: Music3 },
  { tab: "performers", label: "performers", icon: Users },
] as const;

const goToTab = useClassicalTabNavigation();
</script>
