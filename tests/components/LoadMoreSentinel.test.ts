import LoadMoreSentinel from "@/views/classical/components/LoadMoreSentinel.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick, toValue, type MaybeRefOrGetter } from "vue";

const { observed } = vi.hoisted(() => ({
  observed: {
    target: undefined as unknown,
    callback: undefined as
      ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined,
  },
}));

vi.mock("@vueuse/core", async () => {
  const actual =
    await vi.importActual<typeof import("@vueuse/core")>("@vueuse/core");
  return {
    ...actual,
    useIntersectionObserver: (
      target: unknown,
      callback: typeof observed.callback,
    ) => {
      observed.target = target;
      observed.callback = callback;
    },
  };
});
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));

const target = () => toValue(observed.target as MaybeRefOrGetter<unknown>);

describe("LoadMoreSentinel", () => {
  it("asks for more once in view", () => {
    const wrapper = mount(LoadMoreSentinel, { props: { loading: false } });
    observed.callback?.([{ isIntersecting: false }]);
    expect(wrapper.emitted("more")).toBeUndefined();
    observed.callback?.([{ isIntersecting: true }]);
    expect(wrapper.emitted("more")).toHaveLength(1);
  });

  it("stops observing and shows a spinner while a page loads", async () => {
    const wrapper = mount(LoadMoreSentinel, { props: { loading: false } });
    expect(target()).toBe(wrapper.find("div").element);

    await wrapper.setProps({ loading: true });
    expect(target()).toBeNull();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);

    await wrapper.setProps({ loading: false });
    await nextTick();
    expect(target()).toBe(wrapper.find("div").element);
  });
});
