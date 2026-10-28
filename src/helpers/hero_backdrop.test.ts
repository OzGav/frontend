import { ImageType } from "@/plugins/api/interfaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { artist } from "../../tests/fixtures/artist";
import { heroBackdrop } from "./hero_backdrop";

// the image url per image type that the item carries
const { images } = vi.hoisted(() => ({ images: new Map<string, string>() }));

vi.mock("@/helpers/utils", () => ({
  getImageThumbForItem: (_item: unknown, type: string) => images.get(type),
}));

describe("heroBackdrop", () => {
  beforeEach(() => images.clear());

  it("prefers fanart", () => {
    images.set(ImageType.FANART, "fanart");
    images.set(ImageType.LANDSCAPE, "landscape");
    images.set(ImageType.THUMB, "thumb");
    expect(heroBackdrop(artist())).toBe("fanart");
  });

  it("falls back to landscape art", () => {
    images.set(ImageType.LANDSCAPE, "landscape");
    images.set(ImageType.THUMB, "thumb");
    expect(heroBackdrop(artist())).toBe("landscape");
  });

  it("falls back to the thumb without wide art", () => {
    images.set(ImageType.THUMB, "thumb");
    expect(heroBackdrop(artist())).toBe("thumb");
  });

  it("is undefined without an item or images", () => {
    expect(heroBackdrop(undefined)).toBeUndefined();
    expect(heroBackdrop(artist())).toBeUndefined();
  });
});
