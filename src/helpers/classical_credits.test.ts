import { ArtistRole } from "@/plugins/api/interfaces";
import { describe, expect, it, vi } from "vitest";
import { credit } from "../../tests/fixtures/recording";
import { creditedComposer, roleLabel } from "./classical_credits";

vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));

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

describe("roleLabel", () => {
  it("names the role through its translation key", () => {
    expect(roleLabel(ArtistRole.CONDUCTOR)).toBe(
      "classical_artist_role.conductor",
    );
  });
});
