import { ArtistRole } from "@/plugins/api/interfaces";
import { describe, expect, it, vi } from "vitest";
import { credit, recording } from "../../../tests/fixtures/recording";
import {
  coPerformerNames,
  creditedComposer,
  recordingCredits,
  recordingName,
} from "./credits";

vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
  canonicalizeLocale: (locale: string) => locale,
  i18n: { global: { locale: { value: "en" } } },
}));

const names = (artists: Array<{ name: string }>) => artists.map((a) => a.name);

describe("recordingCredits", () => {
  it("leads with conductors and orchestras, with no lead performers", () => {
    const credits = recordingCredits(
      recording({
        credits: [
          credit("s", "Soloist", ArtistRole.SOLOIST, "violin"),
          credit("o", "Orchestra", ArtistRole.ORCHESTRA),
          credit("c", "Conductor", ArtistRole.CONDUCTOR),
        ],
      }),
    );
    expect(names(credits.conductors)).toEqual(["Conductor"]);
    expect(names(credits.orchestras)).toEqual(["Orchestra"]);
    expect(names(credits.performers)).toEqual(["Soloist"]);
    expect(credits.leadPerformers).toEqual([]);
  });

  it("leads with the performers and their instruments without a conductor or orchestra", () => {
    const { leadPerformers } = recordingCredits(
      recording({
        credits: [
          credit("p", "Pianist", ArtistRole.SOLOIST, "piano"),
          credit("p", "Pianist", ArtistRole.SOLOIST, "harpsichord"),
          credit("p", "Pianist", ArtistRole.SOLOIST, "piano"),
        ],
      }),
    );
    expect(leadPerformers).toEqual([
      { id: "p", name: "Pianist", instrument: "piano" },
      { id: "p", name: "Pianist", instrument: "harpsichord" },
    ]);
  });

  it("names each artist once per role list", () => {
    const { performers } = recordingCredits(
      recording({
        credits: [
          credit("p", "Pianist", ArtistRole.SOLOIST, "piano"),
          credit("p", "Pianist", ArtistRole.PERFORMER, "organ"),
        ],
      }),
    );
    expect(names(performers)).toEqual(["Pianist"]);
  });
});

describe("recordingName", () => {
  it("joins the names leading the header", () => {
    const r = recording({
      credits: [
        credit("c", "Conductor", ArtistRole.CONDUCTOR),
        credit("o", "Orchestra", ArtistRole.ORCHESTRA),
      ],
    });
    expect(recordingName(r)).toBe("Conductor, Orchestra");
  });

  it("falls back to the work's name without credits", () => {
    expect(recordingName(recording())).toBe("Work");
  });
});

describe("coPerformerNames", () => {
  it("names the other performers by role rank, each once", () => {
    const recordings = [
      recording({
        credits: [
          credit("me", "Me", ArtistRole.SOLOIST),
          credit("s", "Soloist", ArtistRole.SOLOIST),
          credit("c", "Conductor", ArtistRole.CONDUCTOR),
        ],
      }),
      recording({
        credits: [
          credit("o", "Orchestra", ArtistRole.ORCHESTRA),
          credit("c", "Conductor", ArtistRole.CONDUCTOR),
        ],
      }),
    ];
    expect(coPerformerNames(recordings, "me")).toEqual([
      "Orchestra",
      "Conductor",
      "Soloist",
    ]);
  });
});

describe("creditedComposer", () => {
  it("finds the first composer credit", () => {
    const composer = creditedComposer([
      credit("c", "Conductor", ArtistRole.CONDUCTOR),
      credit("m", "Mozart", ArtistRole.COMPOSER),
    ]);
    expect(composer?.name).toBe("Mozart");
  });

  it("is absent without one", () => {
    expect(creditedComposer([])).toBeUndefined();
  });
});
