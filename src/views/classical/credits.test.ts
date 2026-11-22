import { ArtistRole, type Credit } from "@/plugins/api/interfaces";
import { describe, expect, it, vi } from "vitest";
import { credit, recording } from "../../../tests/fixtures/recording";
import { recordingCredits, recordingName } from "./credits";

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
          credit("p", "Pianist", ArtistRole.SOLOIST),
          credit("p", "Pianist", ArtistRole.PERFORMER),
        ],
      }),
    );
    expect(names(performers)).toEqual(["Pianist"]);
  });

  describe("performers under a conductor or orchestra", () => {
    const performersOf = (...credits: Credit[]) =>
      recordingCredits(
        recording({
          credits: [credit("o", "Orchestra", ArtistRole.ORCHESTRA), ...credits],
        }),
      ).performers;

    it("shows one soloist's instrument", () => {
      expect(
        performersOf(credit("a", "Argerich", ArtistRole.SOLOIST, "piano")),
      ).toEqual([{ id: "a", name: "Argerich", instrument: "piano" }]);
    });

    it("shows two soloists' instruments", () => {
      expect(
        performersOf(
          credit("o1", "Oistrakh", ArtistRole.SOLOIST, "violin"),
          credit("r", "Rostropovich", ArtistRole.SOLOIST, "cello"),
        ),
      ).toEqual([
        { id: "o1", name: "Oistrakh", instrument: "violin" },
        { id: "r", name: "Rostropovich", instrument: "cello" },
      ]);
    });

    it("leaves out the instruments of three soloists", () => {
      expect(
        performersOf(
          credit("s1", "Soprano", ArtistRole.SOLOIST, "soprano"),
          credit("s2", "Tenor", ArtistRole.SOLOIST, "tenor"),
          credit("s3", "Bass", ArtistRole.SOLOIST, "bass"),
        ),
      ).toEqual([
        { id: "s1", name: "Soprano", instrument: undefined },
        { id: "s2", name: "Tenor", instrument: undefined },
        { id: "s3", name: "Bass", instrument: undefined },
      ]);
    });

    it("names an ensemble without an instrument", () => {
      expect(
        performersOf(
          credit("e", "Ensemble", ArtistRole.ENSEMBLE),
          credit("a", "Argerich", ArtistRole.SOLOIST, "piano"),
        ),
      ).toEqual([
        { id: "e", name: "Ensemble", instrument: undefined },
        { id: "a", name: "Argerich", instrument: "piano" },
      ]);
    });

    it("counts an artist once per instrument", () => {
      expect(
        performersOf(
          credit("p", "Pianist", ArtistRole.SOLOIST, "piano"),
          credit("p", "Pianist", ArtistRole.SOLOIST, "harpsichord"),
        ),
      ).toEqual([
        { id: "p", name: "Pianist", instrument: "piano" },
        { id: "p", name: "Pianist", instrument: "harpsichord" },
      ]);
      expect(
        names(
          performersOf(
            credit("p", "Pianist", ArtistRole.SOLOIST, "piano"),
            credit("p", "Pianist", ArtistRole.SOLOIST, "harpsichord"),
            credit("v", "Violinist", ArtistRole.SOLOIST, "violin"),
          ),
        ),
      ).toEqual(["Pianist", "Violinist"]);
    });
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
