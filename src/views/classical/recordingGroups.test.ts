import {
  ExternalID,
  MediaType,
  type WorkMovement,
} from "@/plugins/api/interfaces";
import { describe, expect, it, vi } from "vitest";
import { itemMapping } from "../../../tests/fixtures/itemMapping";
import { recording } from "../../../tests/fixtures/recording";
import { track } from "../../../tests/fixtures/track";
import { work } from "../../../tests/fixtures/work";
import {
  groupByMovement,
  groupByPart,
  movementLineage,
  movementRows,
} from "./recordingGroups";

vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));

const movement = (
  number: number,
  overrides: Partial<WorkMovement> = {},
): WorkMovement => ({
  number,
  name: `Movement ${number}`,
  mbid: null,
  ...overrides,
});

const workMapping = (id: string, name = id) =>
  itemMapping({ item_id: id, name, media_type: MediaType.WORK });

// an act (1) with two arias (2, 3), and a second act (4)
const OPERA = [
  movement(1),
  movement(2, { parent: 1 }),
  movement(3, { parent: 1 }),
  movement(4),
];

const lineageOf = (n: number) => movementLineage(OPERA).get(n) ?? [n];

describe("movementLineage", () => {
  it("lists each movement followed by those it sits under", () => {
    const lineage = movementLineage([...OPERA, movement(5, { parent: 2 })]);
    expect(lineage.get(1)).toEqual([1]);
    expect(lineage.get(3)).toEqual([3, 1]);
    expect(lineage.get(5)).toEqual([5, 2, 1]);
  });
});

describe("movementRows", () => {
  it("brings an act's arias' tracks along with the act", () => {
    const aria = track({ item_id: "a", movement_number: 2 });
    const other = track({ item_id: "b", movement_number: 4 });
    const r = recording({ tracks: [aria, other] });
    expect(movementRows([r], 1, lineageOf)).toEqual([
      { recording: r, tracks: [aria] },
    ]);
  });

  it("leaves out recordings without a track of the movement", () => {
    const r = recording({
      tracks: [track({ item_id: "b", movement_number: 4 })],
    });
    expect(movementRows([r], 1, lineageOf)).toEqual([]);
  });

  it("falls back to the tracks of the movement's MusicBrainz work", () => {
    const linked = track({
      item_id: "a",
      external_ids: [[ExternalID.MB_WORK, "mbid-1"]],
    });
    const r = recording({ tracks: [linked, track({ item_id: "b" })] });
    expect(movementRows([r], 1, lineageOf, "mbid-1")).toEqual([
      { recording: r, tracks: [linked] },
    ]);
  });
});

describe("groupByPart", () => {
  const opera = work({
    item_id: "opera",
    composers: [itemMapping({ item_id: "verdi", name: "Verdi" })],
    parts: [
      workMapping("act1", "Act 1"),
      work({
        item_id: "act2",
        name: "Act 2",
        composers: [itemMapping({ item_id: "boito", name: "Boito" })],
      }),
    ],
  });

  it("groups the work's own recordings first, then each part in order", () => {
    const own = recording({ key: "own", work: workMapping("opera") });
    const act2 = recording({ key: "act2", work: workMapping("act2") });
    const act1 = recording({ key: "act1", work: workMapping("act1") });
    const groups = groupByPart(opera, [act2, act1, own], "verdi");
    expect(groups.map((g) => g.key)).toEqual(["opera", "act1", "act2"]);
    expect(groups[0].link).toBeUndefined();
    expect(groups[1].link).toBe("/classical/works/act1");
  });

  it("names a part's composer only where it differs from the work's", () => {
    const act2 = recording({ work: workMapping("act2") });
    const [group] = groupByPart(opera, [act2], "verdi");
    expect(group.composer).toBe("Boito");
  });

  it("files a part of a listed part under that part", () => {
    const aria = recording({
      work: workMapping("aria"),
      parent_work: workMapping("act1"),
    });
    const groups = groupByPart(opera, [aria], "verdi");
    expect(groups.map((g) => g.key)).toEqual(["act1"]);
  });

  it("puts a part the work does not list last", () => {
    const listed = recording({ key: "a", work: workMapping("act1") });
    const unlisted = recording({ key: "b", work: workMapping("other") });
    const groups = groupByPart(opera, [unlisted, listed], "verdi");
    expect(groups.map((g) => g.key)).toEqual(["act1", "other"]);
  });
});

describe("groupByMovement", () => {
  it("puts each recording under its top-level movement, in movement order", () => {
    const complete = recording({ key: "complete", work: workMapping("w") });
    const aria = recording({
      key: "aria",
      work: workMapping("w"),
      movement_numbers: [3],
    });
    const act2 = recording({
      key: "act2",
      work: workMapping("w"),
      movement_numbers: [4],
    });
    const stray = recording({ key: "stray", work: workMapping("x") });
    const groups = groupByMovement(
      OPERA,
      "w",
      [stray, act2, aria, complete],
      lineageOf,
    );
    expect(groups.map((g) => [g.key, g.recordings.map((r) => r.key)])).toEqual([
      ["complete", ["complete"]],
      ["movement-1", ["aria"]],
      ["movement-4", ["act2"]],
      ["other", ["stray"]],
    ]);
  });

  it("lists a whole movement before parts of it, then by year", () => {
    const whole = recording({
      key: "whole",
      work: workMapping("w"),
      movement_numbers: [1, 2, 3],
      year: 2000,
    });
    const later = recording({
      key: "later",
      work: workMapping("w"),
      movement_numbers: [2],
      year: 1990,
    });
    const earlier = recording({
      key: "earlier",
      work: workMapping("w"),
      movement_numbers: [2],
      year: 1960,
    });
    const [group] = groupByMovement(
      OPERA,
      "w",
      [later, whole, earlier],
      lineageOf,
    );
    expect(group.recordings.map((r) => r.key)).toEqual([
      "whole",
      "earlier",
      "later",
    ]);
  });
});
