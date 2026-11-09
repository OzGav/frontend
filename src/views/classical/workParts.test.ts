import type { Recording, Work, WorkMovement } from "@/plugins/api/interfaces";
import { useWorkParts } from "@/views/classical/workParts";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { recording } from "../../../tests/fixtures/recording";
import { track } from "../../../tests/fixtures/track";
import { work } from "../../../tests/fixtures/work";

vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));

const movement = (
  number: number,
  extra: Partial<WorkMovement> = {},
): WorkMovement => ({ number, name: `${number}`, mbid: null, ...extra });

// an opera with an act holding two arias, and an overture of its own
const opera = work({
  movements: [
    movement(1),
    movement(2),
    movement(3, { parent: 2, under_part: true }),
    movement(4, { parent: 2, under_part: true }),
  ],
});

const aria = track({ item_id: "t3" });
const overture = track({ item_id: "t1" });
const shown = ref<Recording[]>([
  recording({
    tracks: [overture, aria],
    track_movements: { [overture.uri]: [1], [aria.uri]: [3, 2] },
  }),
]);

describe("useWorkParts", () => {
  const parts = useWorkParts(ref<Work | undefined>(opera), shown);

  it("splits the work's own movements from those listed under its parts", () => {
    expect(parts.ownMovements.value.map((m) => m.number)).toEqual([1, 2]);
    expect([...parts.partEntries.value]).toEqual([3, 4]);
  });

  it("follows a movement up to the parts above it", () => {
    expect(parts.lineageOf(3)).toEqual([3, 2]);
    expect(parts.lineageOf(9)).toEqual([9]);
  });

  it("gives each shown recording with its tracks of a movement", () => {
    expect(parts.rowsOf(movement(2))[0].tracks).toEqual([aria]);
    expect(parts.rowsOf(movement(4))).toEqual([]);
  });

  it("is empty without a work", () => {
    const none = useWorkParts(ref<Work | undefined>(), shown);
    expect(none.ownMovements.value).toEqual([]);
    expect(none.partEntries.value.size).toBe(0);
  });
});
