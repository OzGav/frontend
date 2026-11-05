import type { Artist } from "@/plugins/api/interfaces";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { artist } from "../../tests/fixtures/artist";
import { useClassicalArtistLinks } from "./useClassicalArtistLinks";

const { getClassicalRoles, push } = vi.hoisted(() => ({
  getClassicalRoles: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/services/classical", () => ({ getClassicalRoles }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

const classical = (overrides: Partial<Artist> = {}) =>
  artist({ item_id: "5", is_classical: true, ...overrides });

describe("useClassicalArtistLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClassicalRoles.mockResolvedValue({ composer: {}, performer: {} });
  });

  it("links to the composer and performer pages the artist has", async () => {
    const links = useClassicalArtistLinks(() => classical());
    await flushPromises();
    expect(getClassicalRoles).toHaveBeenCalledWith("5");
    expect(links.value.map((l) => l.label)).toEqual([
      "classical_show_composer",
      "classical_show_performer",
    ]);
    links.value[1].action!();
    expect(push).toHaveBeenCalledWith("/classical/performers/5");
  });

  it("leaves out a role the artist does not hold", async () => {
    getClassicalRoles.mockResolvedValue({ composer: {} });
    const links = useClassicalArtistLinks(() => classical());
    await flushPromises();
    expect(links.value.map((l) => l.label)).toEqual([
      "classical_show_composer",
    ]);
  });

  it("has no links for a non-classical or non-library artist", async () => {
    const plain = useClassicalArtistLinks(() =>
      classical({ is_classical: false }),
    );
    const remote = useClassicalArtistLinks(() =>
      classical({ provider: "spotify" }),
    );
    await flushPromises();
    expect(getClassicalRoles).not.toHaveBeenCalled();
    expect(plain.value).toEqual([]);
    expect(remote.value).toEqual([]);
  });

  it("drops an answer for an artist no longer shown", async () => {
    let answer!: (roles: object) => void;
    getClassicalRoles.mockReturnValue(new Promise((r) => (answer = r)));
    const shown = ref(classical());
    const links = useClassicalArtistLinks(() => shown.value);
    shown.value = classical({ item_id: "6", is_classical: false });
    await flushPromises();
    answer({ composer: {} });
    await flushPromises();
    expect(links.value).toEqual([]);
  });
});
