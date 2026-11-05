import {
  RecordingCoverageKind,
  type WorkMovement,
} from "@/plugins/api/interfaces";
import {
  countryLabel,
  movementCoverageLabel,
  shortMovementName,
} from "@/views/classical/labels";
import { describe, expect, it, vi } from "vitest";

const { i18nMock } = vi.hoisted(() => ({
  i18nMock: { global: { locale: { value: "en" } } },
}));

vi.mock("@/plugins/i18n", () => ({
  // shows the values a text is built from after its key, e.g. key(3, 22)
  $t: (key: string, named?: Record<string, unknown>) =>
    named ? `${key}(${Object.values(named).join(", ")})` : key,
  canonicalizeLocale: (locale: string) => locale,
  i18n: i18nMock,
}));

describe("shortMovementName", () => {
  const movement = (fields: Partial<WorkMovement>): WorkMovement => ({
    number: 1,
    name: 'no. 6. “Che gelida manina!” (Rodolfo)',
    mbid: null,
    ...fields,
  });

  it("shows the server's short name", () => {
    expect(
      shortMovementName(movement({ short_name: "no. 6. Che gelida manina!" })),
    ).toBe("no. 6. Che gelida manina!");
  });

  it("falls back to the full name without a short one", () => {
    expect(shortMovementName(movement({}))).toBe(
      'no. 6. “Che gelida manina!” (Rodolfo)',
    );
  });

  it("marks an excerpt in the user's language", () => {
    expect(
      shortMovementName(
        movement({ short_name: "Tanz der Lehrbuben", excerpt: true }),
      ),
    ).toBe("classical_movement_excerpt(Tanz der Lehrbuben)");
  });
});

describe("countryLabel", () => {
  it("names a country in the user's language, following a change of language", () => {
    expect(countryLabel("PL")).toBe("Poland");
    i18nMock.global.locale.value = "de";
    expect(countryLabel("PL")).toBe("Polen");
    i18nMock.global.locale.value = "en";
  });
  it("names the Soviet Union itself, not as Russia", () => {
    expect(countryLabel("SU")).toBe("classical_country_soviet_union");
  });
});

describe("movementCoverageLabel", () => {
  const MOVEMENTS: WorkMovement[] = [
    { number: 1, name: "Act I", mbid: null, work_id: "act1" },
    { number: 2, name: "Act II", mbid: null, work_id: "act2" },
  ];
  const coverage = (
    kind: RecordingCoverageKind,
    movement: number | null,
    held = 0,
    total = 0,
  ) => ({ kind, movement, held, total });

  it("shows nothing for the whole work", () => {
    expect(movementCoverageLabel(null, MOVEMENTS)).toBe("");
  });

  it("names a movement held whole as complete", () => {
    expect(
      movementCoverageLabel(
        coverage(RecordingCoverageKind.MOVEMENT, 2),
        MOVEMENTS,
      ),
    ).toBe("classical_movement_complete(Act II)");
  });

  it("names a movement and the count of its pieces held", () => {
    expect(
      movementCoverageLabel(
        coverage(RecordingCoverageKind.MOVEMENT_PIECES, 1, 2, 9),
        MOVEMENTS,
      ),
    ).toBe("classical_movement_parts(Act I, classical_movements_of(2, 9))");
  });

  it("names just the movement when its pieces are not counted", () => {
    expect(
      movementCoverageLabel(
        coverage(RecordingCoverageKind.MOVEMENT_PIECES, 1, 2, 0),
        MOVEMENTS,
      ),
    ).toBe("Act I");
  });

  it("counts the movements held", () => {
    expect(
      movementCoverageLabel(
        coverage(RecordingCoverageKind.MOVEMENTS, null, 3, 22),
        MOVEMENTS,
      ),
    ).toBe("classical_movements_of(3, 22)");
  });
});
