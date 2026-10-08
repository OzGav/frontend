import { useRoute, useRouter } from "vue-router";

export const CLASSICAL_TABS = ["composers", "works", "performers"] as const;

export type ClassicalTab = (typeof CLASSICAL_TABS)[number];

export const CLASSICAL_DEFAULT_TAB: ClassicalTab = "composers";

export const CLASSICAL_LAST_TAB_KEY = "frontend.classical.last_tab";

export function isClassicalTab(value: unknown): value is ClassicalTab {
  return (
    typeof value === "string" &&
    (CLASSICAL_TABS as readonly string[]).includes(value)
  );
}

export function getLastVisitedClassicalTab(): ClassicalTab {
  const stored = localStorage.getItem(CLASSICAL_LAST_TAB_KEY);
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
    localStorage.setItem(CLASSICAL_LAST_TAB_KEY, tab);
    if (route.path !== target) router.push(target);
  };
}
