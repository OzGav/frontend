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
  it.each([
    [
      'XXXIX. Aria (Alto) "Erbarme dich, mein Gott"',
      "XXXIX. Erbarme dich, mein Gott",
    ],
    [
      'IVa. "Da versammelten sich die Hohenpriester" (Evangelista)',
      "IVa. Da versammelten sich die Hohenpriester",
    ],
    ['VI. Arie (Alt) "Buß und Reu"', "VI. Buß und Reu"],
    ['36a. Chor "Weissage uns"', "36a. Weissage uns"],
    ["no. 6. “Che gelida manina!” (Rodolfo)", "no. 6. Che gelida manina!"],
    [
      'Scene V. "Sankt Krispin, lobet ihn!"',
      "Scene V. Sankt Krispin, lobet ihn!",
    ],
    ['Scene I "Hojotoho! Hojotoho!"', "Scene I. Hojotoho! Hojotoho!"],
    [
      'Scene II "Wo ist Brünnhild\', wo die Verbrecherin?"',
      "Scene II. Wo ist Brünnhild', wo die Verbrecherin?",
    ],
  ])("keeps the score number of %s", (name, shown) => {
    expect(shortMovementName(name)).toBe(shown);
  });

  it.each([
    ["“E lucevan le stelle” (Cavaradossi)", "E lucevan le stelle"],
    ["no. 6. Che gelida manina", "no. 6. Che gelida manina"],
    ["IV", "IV"],
    ["Scene II", "Scene II"],
  ])("shortens %s as before", (name, shown) => {
    expect(shortMovementName(name)).toBe(shown);
  });

  it("does not take a leading word for a number", () => {
    expect(shortMovementName('Il "Lacrimosa"')).toBe("Lacrimosa");
  });

  it.each([
    [
      "LX. Aria (Alto) “Sehet, Jesus hat die Hand”, Coro “Wohin?”",
      "LX. Sehet, Jesus hat die Hand – Wohin?",
    ],
    [
      "LXVII. Recitativo (Soprano, Alto, Tenore, Basso) “Nun ist der Herr zur Ruh gebracht” – Coro “Mein Jesu, gute Nacht”",
      "LXVII. Nun ist der Herr zur Ruh gebracht – Mein Jesu, gute Nacht",
    ],
    ["no. 3. “Si può?” – “Chi è là?” (Rodolfo)", "no. 3. Si può? – Chi è là?"],
    ["« Quel trouble » … Cavatine « Salut ! »", "Quel trouble – Salut !"],
  ])("joins the quoted parts of %s", (name, shown) => {
    expect(shortMovementName(name)).toBe(shown);
  });

  it.each([
    [
      '"Morgenlich leuchtend" (Preislied) (excerpt)',
      "Morgenlich leuchtend (excerpt)",
    ],
    [
      '"Wacht auf! es nahet gen den Tag" (Volk) (excerpt)',
      "Wacht auf! es nahet gen den Tag (excerpt)",
    ],
    ["Tanz der Lehrbuben (excerpt)", "Tanz der Lehrbuben (excerpt)"],
  ])("keeps the excerpt mark of %s", (name, shown) => {
    expect(shortMovementName(name)).toBe(shown);
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
