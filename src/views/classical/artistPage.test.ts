import type { Artist, ClassicalWorkEntry } from "@/plugins/api/interfaces";
import { useClassicalArtistPage } from "@/views/classical/artistPage";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref, type Ref } from "vue";

const { getClassicalArtist, getArtistWorks } = vi.hoisted(() => ({
  getClassicalArtist: vi.fn(),
  getArtistWorks: vi.fn(),
}));

vi.mock("@/services/classical", () => ({ getClassicalArtist, getArtistWorks }));
vi.mock("@/composables/useDetailItemUpdates", () => ({
  useDetailItemUpdates: vi.fn(),
}));
vi.mock("@/views/classical/backScroll", () => ({ useBackScroll: vi.fn() }));

const artist = (id: string) => ({ item_id: id }) as Artist;
const entry = (id: string) =>
  ({ work: { item_id: id }, recording_count: 1 }) as ClassicalWorkEntry;

const mountPage = (id: Ref<string>) => {
  let page!: ReturnType<typeof useClassicalArtistPage>;
  mount(
    defineComponent({
      setup() {
        page = useClassicalArtistPage(() => id.value, "performer");
        return () => null;
      },
    }),
  );
  return page;
};

beforeEach(() => {
  vi.clearAllMocks();
  getClassicalArtist.mockImplementation(async (id: string) => artist(id));
  getArtistWorks.mockImplementation(async (_role: string, id: string) => [
    entry(`w${id}`),
  ]);
});

describe("useClassicalArtistPage", () => {
  it("loads the artist and their works in the given role", async () => {
    const page = mountPage(ref("1"));
    expect(page.loading.value).toBe(true);
    await flushPromises();
    expect(getArtistWorks).toHaveBeenCalledWith("performer", "1");
    expect(page.artist.value).toEqual(artist("1"));
    expect(page.works.value).toEqual([entry("w1")]);
    expect(page.loading.value).toBe(false);
  });

  it("keeps only the artist the page opened last", async () => {
    const id = ref("1");
    const page = mountPage(id);
    id.value = "2";
    await nextTick();
    await flushPromises();
    expect(page.artist.value).toEqual(artist("2"));
    expect(page.works.value).toEqual([entry("w2")]);
  });

  it("stays loading for an unknown artist", async () => {
    getClassicalArtist.mockRejectedValue(new Error("unknown"));
    const page = mountPage(ref("9"));
    await flushPromises();
    expect(page.artist.value).toBeUndefined();
    expect(page.loading.value).toBe(true);
  });
});
