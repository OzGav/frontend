import {
  ArtistRole,
  type ClassicalPerformer,
  type MediaItemImage,
} from "@/plugins/api/interfaces";
import { useArtistGridItems } from "@/views/classical/artistGrid";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { artist } from "../../../tests/fixtures/artist";

vi.mock("@/helpers/utils", () => ({
  getImageThumbForItem: (_item: unknown, _type: unknown, size: number) =>
    `thumb@${size}`,
  getMediaItemImageUrl: (img: MediaItemImage, size: number) =>
    `${img.path}@${size}`,
}));

const performer = (id: string, name: string): ClassicalPerformer => ({
  artist: artist({ item_id: id, name }),
  main_role: ArtistRole.CONDUCTOR,
  work_count: 1,
  recording_count: 2,
});

describe("useArtistGridItems", () => {
  it("links each artist into its section, with its details and images", () => {
    const items = useArtistGridItems({
      rows: () => [performer("7", "Karajan")],
      section: "performers",
      details: (row) => ({ role: row.main_role, lines: ["2 recordings"] }),
    });
    expect(items.value).toEqual([
      expect.objectContaining({
        id: "7",
        name: "Karajan",
        link: "/classical/performers/7",
        role: ArtistRole.CONDUCTOR,
        lines: ["2 recordings"],
        wideImage: "thumb@500",
        squareImage: "thumb@300",
        listImage: "thumb@80",
      }),
    ]);
  });

  it("follows the rows as they change", () => {
    const rows = ref([performer("1", "Abbado")]);
    const items = useArtistGridItems({
      rows: () => rows.value,
      section: "composers",
      details: () => ({ lines: [] }),
    });
    rows.value = [...rows.value, performer("2", "Böhm")];
    expect(items.value.map((i) => i.link)).toEqual([
      "/classical/composers/1",
      "/classical/composers/2",
    ]);
  });
});
