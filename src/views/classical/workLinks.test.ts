import { LinkType } from "@/plugins/api/interfaces";
import { workLinks } from "@/views/classical/workLinks";
import { describe, expect, it } from "vitest";

const link = (type: LinkType) => ({ type, url: `https://${type}.example` });

describe("workLinks", () => {
  it("keeps Wikipedia, AllMusic and IMSLP in that order", () => {
    const links = [
      link(LinkType.IMSLP),
      link(LinkType.WEBSITE),
      link(LinkType.WIKIPEDIA),
      link(LinkType.ALLMUSIC),
    ];
    expect(workLinks(links)).toEqual([
      { ...link(LinkType.WIKIPEDIA), label: "classical_link_wikipedia" },
      { ...link(LinkType.ALLMUSIC), label: "classical_link_allmusic" },
      { ...link(LinkType.IMSLP), label: "classical_link_imslp" },
    ]);
  });

  it("shows one link per site", () => {
    const links = [
      link(LinkType.IMSLP),
      { type: LinkType.IMSLP, url: "https://other.example" },
    ];
    expect(workLinks(links).map((l) => l.url)).toEqual([
      "https://imslp.example",
    ]);
  });

  it("is empty without any of the three", () => {
    expect(workLinks([link(LinkType.DISCOGS)])).toEqual([]);
    expect(workLinks(null)).toEqual([]);
    expect(workLinks(undefined)).toEqual([]);
  });
});
