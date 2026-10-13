import { returnedByHistory } from "@/helpers/navigation";
import { nextTick, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRouter,
  type RouteLocationNormalized,
} from "vue-router";

// How far down each page was left, by its address, for as long as the app is
// open.
const kept = new Map<string, number>();

/**
 * Return a classical page to where it was scrolled when the user goes back to
 * it, once it has loaded again.
 *
 * :param loading: Whether the page is still loading its content.
 */
export function useBackScroll(loading: () => boolean) {
  const router = useRouter();

  const save = (_to: unknown, from: RouteLocationNormalized) => {
    kept.set(from.fullPath, scrollContainer()?.scrollTop ?? 0);
  };
  onBeforeRouteLeave(save);
  // a page opening another item of its kind stays mounted
  onBeforeRouteUpdate(save);

  watch(
    loading,
    (isLoading) => {
      if (isLoading || !returnedByHistory(router)) return;
      const top = kept.get(router.currentRoute.value.fullPath);
      if (!top) return;
      nextTick(() => {
        const el = scrollContainer();
        if (el) el.scrollTop = top;
      });
    },
    { immediate: true },
  );
}

// The app's main scroll area, which the classical pages scroll in.
function scrollContainer(): HTMLElement | null {
  return document.querySelector(".content-section");
}
