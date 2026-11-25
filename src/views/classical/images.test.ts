import type {
  ClassicalComposer,
  MediaItemImage,
} from "@/plugins/api/interfaces";
import { ImageType } from "@/plugins/api/interfaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { artist } from "../../../tests/fixtures/artist";
import { cardImage, squareImage } from "./images";

const { thumbMock } = vi.hoisted(() => ({ thumbMock: vi.fn() }));

vi.mock("@/helpers/utils", () => ({
  getImageThumbForItem: thumbMock,
  getMediaItemImageUrl: (img: MediaItemImage, size: number) =>
    `${img.path}@${size}`,
}));

beforeEach(() => {
  thumbMock.mockReset();
});

const fanart: MediaItemImage = {
  type: ImageType.FANART,
  path: "fanart",
  provider: "library",
  remotely_accessible: true,
};

const composer = (withFanart: boolean): ClassicalComposer => ({
  artist: artist(),
  fanart: withFanart ? fanart : null,
  work_count: 1,
  recording_count: 1,
});

describe("cardImage", () => {
  it("takes the fanart at the given width", () => {
    expect(cardImage(composer(true), 500)).toBe("fanart@500");
    expect(thumbMock).not.toHaveBeenCalled();
  });

  it("falls back to the artist's thumb without fanart", () => {
    thumbMock.mockReturnValue("thumb");
    expect(cardImage(composer(false), 500)).toBe("thumb");
    expect(thumbMock).toHaveBeenCalledWith(expect.anything(), undefined, 500);
  });
});

describe("squareImage", () => {
  it("takes the artist's thumb", () => {
    thumbMock.mockReturnValue("thumb");
    expect(squareImage(composer(true), 300)).toBe("thumb");
  });

  it("falls back to the fanart without a thumb", () => {
    expect(squareImage(composer(true), 300)).toBe("fanart@300");
  });
});
