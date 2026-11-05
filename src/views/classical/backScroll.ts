import { returnedByHistory } from "@/helpers/navigation";
import { nextTick, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRouter,
  type RouteLocationNormalized,
} from "vue-router";

// How far down each page was left, and how many rows it had loaded then, by
// its address, for as long as the app is open.
const kept = new Map<string, { top: number; rows: number }>();

/**
 * Return a classical page to where it was scrolled when the user goes back to
 * it, once it has loaded again.
 *
 * Returns `returnRows`, the number of rows the page had loaded when it was
 * left, when the user has gone back to it, so a paged list can load them
 * again before the scroll is restored.
 *
 * :param loading: Whether the page is still loading its content.
 * :param rows: The number of rows the page has loaded, for a paged list.
 */
export function useBackScroll(loading: () => boolean, rows?: () => number) {
  const router = useRouter();

  const save = (_to: unknown, from: RouteLocationNormalized) => {
    kept.set(from.fullPath, {
      top: scrollContainer()?.scrollTop ?? 0,
      rows: rows?.() ?? 0,
    });
  };
  onBeforeRouteLeave(save);
  // a page opening another item of its kind stays mounted
  onBeforeRouteUpdate(save);

  watch(
    loading,
    (isLoading) => {
      if (isLoading || !returnedByHistory(router)) return;
      const top = kept.get(router.currentRoute.value.fullPath)?.top;
      if (!top) return;
      nextTick(() => {
        const el = scrollContainer();
        if (el) el.scrollTop = top;
      });
    },
    { immediate: true },
  );

  const returnRows = (): number | undefined =>
    returnedByHistory(router)
      ? kept.get(router.currentRoute.value.fullPath)?.rows
      : undefined;

  return { returnRows };
}

// The app's main scroll area, which the classical pages scroll in.
function scrollContainer(): HTMLElement | null {
  return document.querySelector(".content-section");
}
