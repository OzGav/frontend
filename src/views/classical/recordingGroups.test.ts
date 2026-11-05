import {
  MediaType,
  RecordingHeadingKind,
  type RecordingHeading,
  type WorkMovement,
} from "@/plugins/api/interfaces";
import { describe, expect, it, vi } from "vitest";
import { itemMapping } from "../../../tests/fixtures/itemMapping";
import { recording } from "../../../tests/fixtures/recording";
import { track } from "../../../tests/fixtures/track";
import { work } from "../../../tests/fixtures/work";
import {
  groupByHeading,
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

const heading = (
  kind: RecordingHeadingKind,
  overrides: Partial<RecordingHeading> = {},
): RecordingHeading => ({ kind, order: 0, rank: 0, ...overrides });

describe("movementLineage", () => {
  it("lists each movement followed by those it sits under", () => {
    const lineage = movementLineage([...OPERA, movement(5, { parent: 2 })]);
    expect(lineage.get(1)).toEqual([1]);
    expect(lineage.get(3)).toEqual([3, 1]);
    expect(lineage.get(5)).toEqual([5, 2, 1]);
  });
});

describe("movementRows", () => {
  it("keeps each recording's tracks that count towards the movement", () => {
    const aria = track({ item_id: "a", movement_number: 2 });
    const other = track({ item_id: "b", movement_number: 4 });
    const r = recording({
      tracks: [aria, other],
      track_movements: { [aria.uri]: [2, 1], [other.uri]: [4] },
    });
    expect(movementRows([r], 1)).toEqual([{ recording: r, tracks: [aria] }]);
  });

  it("leaves out recordings without a track of the movement", () => {
    const t = track({ item_id: "b", movement_number: 4 });
    const r = recording({ tracks: [t], track_movements: { [t.uri]: [4] } });
    const bare = recording({ key: "bare", tracks: [track({ item_id: "c" })] });
    expect(movementRows([r, bare], 1)).toEqual([]);
  });
});

describe("groupByHeading", () => {
  const opera = work({
    item_id: "opera",
    composers: [itemMapping({ item_id: "verdi", name: "Verdi" })],
    movements: [
      movement(1, { work_id: "act1" }),
      movement(2, { parent: 1, under_part: true }),
      movement(4),
    ],
    parts: [
      workMapping("act1", "Act 1"),
      work({
        item_id: "act2",
        name: "Act 2",
        version: "1881 version",
        composers: [itemMapping({ item_id: "boito", name: "Boito" })],
      }),
    ],
  });

  const workHeading = (id: string, order: number, rank = 0) =>
    heading(RecordingHeadingKind.WORK, {
      work: workMapping(id, `Opera: ${id}`),
      order,
      rank,
    });

  it("sorts the groups by heading order and each group's recordings by rank", () => {
    const second = recording({
      key: "second",
      heading: workHeading("act1", 1, 1),
    });
    const first = recording({ key: "first", heading: workHeading("act1", 1) });
    const own = recording({ key: "own", heading: workHeading("opera", 0) });
    const groups = groupByHeading(opera, [second, first, own], "verdi");
    expect(groups.map((g) => [g.key, g.recordings.map((r) => r.key)])).toEqual([
      ["opera", ["own"]],
      ["act1", ["first", "second"]],
    ]);
  });

  it("leaves out recordings without a heading", () => {
    const r = recording({ heading: null });
    expect(groupByHeading(opera, [r], "verdi")).toEqual([]);
  });

  it("names a work heading as the page's work or its listed part", () => {
    const own = recording({ key: "own", heading: workHeading("opera", 0) });
    const act2 = recording({ key: "act2", heading: workHeading("act2", 2) });
    const [ownGroup, act2Group] = groupByHeading(opera, [own, act2], "verdi");
    expect(ownGroup).toMatchObject({ name: "Work", link: undefined });
    expect(act2Group).toMatchObject({
      name: "Act 2",
      version: "1881 version",
      link: "/classical/works/act2",
      composer: "Boito",
    });
  });

  it("leaves the page's composer unnamed", () => {
    const own = work({
      item_id: "act2",
      name: "Act 2",
      composers: [itemMapping({ item_id: "verdi", name: "Verdi" })],
    });
    const r = recording({ heading: workHeading("act2", 0) });
    const [group] = groupByHeading(
      work({ ...opera, parts: [own] }),
      [r],
      "verdi",
    );
    expect(group.composer).toBeUndefined();
  });

  it("names a work the page does not list as the heading's work", () => {
    const r = recording({ heading: workHeading("other", 3) });
    const [group] = groupByHeading(opera, [r], "verdi");
    expect(group).toMatchObject({
      key: "other",
      name: "Opera: other",
      link: "/classical/works/other",
    });
  });

  it("names a movement heading after its movement, linking a part's page", () => {
    const complete = recording({
      key: "complete",
      heading: heading(RecordingHeadingKind.COMPLETE),
    });
    const act = recording({
      key: "act",
      heading: heading(RecordingHeadingKind.MOVEMENT, {
        movement: 1,
        order: 1,
      }),
    });
    const plain = recording({
      key: "plain",
      heading: heading(RecordingHeadingKind.MOVEMENT, {
        movement: 4,
        order: 2,
      }),
    });
    const stray = recording({
      key: "stray",
      heading: heading(RecordingHeadingKind.OTHER, { order: 3 }),
    });
    const groups = groupByHeading(opera, [stray, plain, act, complete]);
    expect(groups.map((g) => [g.key, g.name, g.link])).toEqual([
      ["complete", "classical_complete_recordings", undefined],
      ["movement-1", "Movement 1", "/classical/works/act1"],
      ["movement-4", "Movement 4", undefined],
      ["other", "classical_other_recordings", undefined],
    ]);
  });
});
