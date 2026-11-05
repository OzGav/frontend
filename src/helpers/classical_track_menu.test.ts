import { ArtistRole } from "@/plugins/api/interfaces";
import { describe, expect, it, vi } from "vitest";
import type { Router } from "vue-router";
import { credit } from "../../tests/fixtures/recording";
import { classicalMenuEntries } from "./classical_track_menu";

vi.mock("@/plugins/api", () => ({ default: {} }));
vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
  canonicalizeLocale: (locale: string) => locale,
  i18n: { global: { locale: { value: "en" } } },
}));

const router = { push: vi.fn() } as unknown as Router;

const performerEntries = (credits: ReturnType<typeof credit>[]) =>
  classicalMenuEntries({ credits }, router)
    .find((item) => item.label === "classical_goto_performer")
    ?.subItems?.map((item) => [item.label, item.labelArgs]);

describe("classicalMenuEntries", () => {
  it("leads to the composer, the work and the performers", () => {
    const labels = classicalMenuEntries(
      {
        credits: [credit("c", "Conductor", ArtistRole.CONDUCTOR)],
        composer: { item_id: "m", name: "Mozart" },
        work: { item_id: "w", name: "Requiem" },
      },
      router,
    ).map((item) => item.label);
    expect(labels).toEqual([
      "classical_goto_composer",
      "classical_goto_work",
      "classical_goto_performer",
    ]);
  });

  it("leaves out what there is nothing to go to", () => {
    expect(classicalMenuEntries({ credits: [], work: null }, router)).toEqual(
      [],
    );
  });

  it("lists one performer entry per artist, combining their roles and instruments", () => {
    expect(
      performerEntries([
        credit("p", "Pinnock", ArtistRole.PERFORMER, "harpsichord"),
        credit("p", "Pinnock", ArtistRole.CONDUCTOR),
      ]),
    ).toEqual([
      [
        "classical_performer_with_qualifier",
        ["Pinnock", "classical_artist_role.conductor, harpsichord"],
      ],
    ]);
  });

  it("ranks the performers by their most important role", () => {
    const entries = performerEntries([
      credit("s", "Soloist", ArtistRole.SOLOIST, "violin"),
      credit("o", "Orchestra", ArtistRole.ORCHESTRA),
      credit("c", "Conductor", ArtistRole.CONDUCTOR),
    ]);
    expect(entries?.map(([, args]) => (args as string[])[0])).toEqual([
      "Conductor",
      "Orchestra",
      "Soloist",
    ]);
  });

  it("names a performer alone when their name already says the instrument", () => {
    expect(
      performerEntries([
        credit(
          "q",
          "Brodsky Quartet",
          ArtistRole.ENSEMBLE,
          "string quartet",
          "",
        ),
      ]),
    ).toEqual([
      [
        "classical_performer_with_qualifier",
        ["Brodsky Quartet", "classical_artist_role.ensemble"],
      ],
    ]);
  });

  it("leaves out composer credits from the performers", () => {
    expect(
      performerEntries([credit("m", "Mozart", ArtistRole.COMPOSER)]),
    ).toBeUndefined();
  });
});
