import { beforeEach, describe, expect, it, vi } from "vitest";
import { artist } from "../../../tests/fixtures/artist";

const { storeMock, setUserPreferenceMock } = vi.hoisted(() => ({
  storeMock: {
    currentUser: null as { preferences?: Record<string, unknown> } | null,
  },
  setUserPreferenceMock: vi.fn(),
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/composables/userPreferences", () => ({
  setUserPreference: setUserPreferenceMock,
}));

import {
  availableClassicalArtistRowIds,
  composerRows,
  performerRows,
  useClassicalArtistRows,
} from "@/views/classical/artistRows";
import type { Artist } from "@/plugins/api/interfaces";
import { ref } from "vue";

describe("classical artist rows", () => {
  beforeEach(() => {
    storeMock.currentUser = { preferences: {} };
    setUserPreferenceMock.mockReset();
  });

  it("offers the description only when the artist has one", () => {
    expect(
      availableClassicalArtistRowIds(
        artist({ metadata: { description: "Born in Bonn" } }),
      ),
    ).toEqual(["description", "works", "other_tracks"]);
    expect(availableClassicalArtistRowIds(artist())).toEqual([
      "works",
      "other_tracks",
    ]);
  });

  it("resolves the saved composer order and hidden rows", () => {
    storeMock.currentUser = {
      preferences: {
        "classical_composer.rows": {
          order: ["other_tracks", "works", "description"],
          hidden: ["description"],
        },
      },
    };

    const { order, hidden } = composerRows.resolve(
      availableClassicalArtistRowIds(artist({ metadata: { description: "" } })),
    );

    expect(order).toEqual(["other_tracks", "works"]);
    expect(hidden).toEqual(new Set());
  });

  it.each([
    { registry: composerRows, key: "classical_composer.rows" },
    { registry: performerRows, key: "classical_performer.rows" },
  ])("keeps the rows of $key under their own preference", async (row) => {
    await row.registry.setHidden("other_tracks", true);

    expect(setUserPreferenceMock).toHaveBeenCalledWith(
      row.key,
      expect.objectContaining({ hidden: ["other_tracks"] }),
    );
  });

  it("names the works row after what the page lists", () => {
    expect(composerRows.definition("works").labelKey).toBe("works");
    expect(performerRows.definition("works").labelKey).toBe("works_performed");
  });

  it("shows the works and other tracks while the artist loads", () => {
    const shown = ref<Artist>();
    const { visibleRows } = useClassicalArtistRows(shown, performerRows);

    expect(visibleRows.value).toEqual(["works", "other_tracks"]);

    shown.value = artist({ metadata: { description: "Pianist" } });
    expect(visibleRows.value).toEqual(["description", "works", "other_tracks"]);
  });

  it("leaves out the rows the user hid", () => {
    storeMock.currentUser = {
      preferences: { "classical_performer.rows": { hidden: ["works"] } },
    };
    const { visibleRows } = useClassicalArtistRows(
      ref(artist()),
      performerRows,
    );

    expect(visibleRows.value).toEqual(["other_tracks"]);
  });
});
