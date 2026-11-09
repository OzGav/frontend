import { setUserPreference } from "@/composables/userPreferences";
import { store } from "@/plugins/store";
import { Feather, Music3, Users } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";

/** The Classical tabs in order, each with its label key and icon. */
export const CLASSICAL_TABS = [
  { tab: "composers", label: "composers", icon: Feather },
  { tab: "works", label: "works", icon: Music3 },
  { tab: "performers", label: "performers", icon: Users },
] as const;

export type ClassicalTab = (typeof CLASSICAL_TABS)[number]["tab"];

export const CLASSICAL_DEFAULT_TAB: ClassicalTab = "composers";

const CLASSICAL_LAST_TAB_KEY = "classical_last_tab";

/** Whether a value names a Classical tab. */
export function isClassicalTab(value: unknown): value is ClassicalTab {
  return CLASSICAL_TABS.some(({ tab }) => tab === value);
}

/** The Classical tab last opened, or the default tab before any. */
export function getLastVisitedClassicalTab(): ClassicalTab {
  const stored = store.currentUser?.preferences?.[CLASSICAL_LAST_TAB_KEY];
  return isClassicalTab(stored) ? stored : CLASSICAL_DEFAULT_TAB;
}

/**
 * A function that opens a Classical tab and remembers it as the last one
 * visited. Clicking the tab already shown does nothing.
 */
export function useClassicalTabNavigation(): (tab: ClassicalTab) => void {
  const route = useRoute();
  const router = useRouter();
  return (tab) => {
    const target = `/classical/${tab}`;
    if (getLastVisitedClassicalTab() !== tab)
      void setUserPreference(CLASSICAL_LAST_TAB_KEY, tab);
    if (route.path !== target) router.push(target);
  };
}
