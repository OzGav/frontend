import {
  MediaType,
  type FavoriteUpdate,
  type Track,
} from "@/plugins/api/interfaces";
import {
  allLiked,
  setTracksLiked,
  useOwnFavorites,
} from "@/views/classical/favorites";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

const { setFavorites, toastError, ownFavorites } = vi.hoisted(() => ({
  setFavorites: vi.fn(),
  toastError: vi.fn(),
  ownFavorites: {
    onUpdate: undefined as ((update: FavoriteUpdate) => void) | undefined,
    unsubscribe: vi.fn(),
  },
}));

vi.mock("@/plugins/api", () => ({ default: { setFavorites } }));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));
vi.mock("vue-sonner", () => ({ toast: { error: toastError } }));
vi.mock("@/helpers/favorites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/helpers/favorites")>()),
  subscribeOwnFavorites: (onUpdate: (update: FavoriteUpdate) => void) => {
    ownFavorites.onUpdate = onUpdate;
    return ownFavorites.unsubscribe;
  },
}));

const track = (n: number, favorite: boolean | null = null) =>
  ({
    uri: `library://track/${n}`,
    media_type: MediaType.TRACK,
    provider_mappings: [],
    favorite,
  }) as unknown as Track;

describe("setTracksLiked", () => {
  beforeEach(() => {
    setFavorites.mockReset();
    toastError.mockReset();
  });

  it("likes every track in one call", async () => {
    const tracks = [track(1), track(2, false)];
    setFavorites.mockResolvedValue(2);
    await setTracksLiked(tracks, true);
    expect(setFavorites).toHaveBeenCalledWith(
      ["library://track/1", "library://track/2"],
      true,
    );
    expect(tracks.map((t) => t.favorite)).toEqual([true, true]);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("clears every track", async () => {
    const tracks = [track(1, true), track(2, true)];
    setFavorites.mockResolvedValue(2);
    await setTracksLiked(tracks, false);
    expect(setFavorites).toHaveBeenCalledWith(expect.any(Array), null);
    expect(tracks.map((t) => t.favorite)).toEqual([null, null]);
  });

  it("puts back the tracks from the one that failed and says so", async () => {
    const tracks = [track(1), track(2, false), track(3)];
    setFavorites.mockResolvedValue(1);
    await setTracksLiked(tracks, true);
    expect(tracks.map((t) => t.favorite)).toEqual([true, false, null]);
    expect(toastError).toHaveBeenCalledWith("favorites_save_failed");
  });

  it("puts every track back when the call fails", async () => {
    const tracks = [track(1, true), track(2)];
    setFavorites.mockRejectedValue(new Error("offline"));
    await setTracksLiked(tracks, false);
    expect(tracks.map((t) => t.favorite)).toEqual([true, null]);
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("allLiked", () => {
  it("is true only when every track is liked", () => {
    expect(allLiked([track(1, true), track(2, true)])).toBe(true);
    expect(allLiked([track(1, true), track(2, false)])).toBe(false);
    expect(allLiked([track(1, true), track(2)])).toBe(false);
  });

  it("is false for no tracks", () => {
    expect(allLiked([])).toBe(false);
  });
});

describe("useOwnFavorites", () => {
  it("updates the matching item until the component goes away", () => {
    const items = [track(1), track(2)];
    const wrapper = mount(
      defineComponent({
        setup() {
          useOwnFavorites(() => items);
          return () => null;
        },
      }),
    );
    ownFavorites.onUpdate!({
      uri: "library://track/2",
      favorite: true,
    } as FavoriteUpdate);
    expect(items.map((t) => t.favorite)).toEqual([null, true]);
    wrapper.unmount();
    expect(ownFavorites.unsubscribe).toHaveBeenCalledOnce();
  });
});
