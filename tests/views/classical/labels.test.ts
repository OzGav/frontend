import { shortMovementName } from "@/views/classical/labels";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
  canonicalizeLocale: (locale: string) => locale,
  i18n: { global: { locale: { value: "en" } } },
}));
vi.mock("@/helpers/utils", () => ({
  normalizeForFilter: (s: string) => s.toLowerCase(),
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
  ])("keeps the score number of %s", (name, shown) => {
    expect(shortMovementName(name)).toBe(shown);
  });

  it.each([
    ["“E lucevan le stelle” (Cavaradossi)", "E lucevan le stelle"],
    ["no. 6. Che gelida manina", "no. 6. Che gelida manina"],
    ["IV", "IV"],
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
