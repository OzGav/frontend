import { MediaType, type Track } from "@/plugins/api/interfaces";
import { setTracksLiked } from "@/views/classical/favorites";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setFavorites, toastError } = vi.hoisted(() => ({
  setFavorites: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/plugins/api", () => ({ default: { setFavorites } }));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));
vi.mock("vue-sonner", () => ({ toast: { error: toastError } }));

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
