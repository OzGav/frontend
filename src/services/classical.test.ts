import { ArtistRole, Period, SortField } from "@/plugins/api/interfaces";
import {
  getComposerFilters,
  getComposers,
  getPerformerFilters,
  getPerformers,
  getWorkFilters,
  getWorks,
} from "@/services/classical";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
  apiMock: { sendCommand: vi.fn() },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock, api: apiMock }));

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.sendCommand.mockResolvedValue([]);
});

describe("classical browse lists", () => {
  it("sends a composers page with its search and filters", async () => {
    await getComposers({
      sort_field: SortField.NAME,
      search: "bach",
      favorite: true,
      period: [Period.BAROQUE],
      country: ["DE"],
      country_unknown: true,
      offset: 100,
      limit: 100,
    });
    expect(apiMock.sendCommand).toHaveBeenCalledWith(
      "music/classical/composers",
      {
        sort_field: SortField.NAME,
        search: "bach",
        favorite: true,
        period: [Period.BAROQUE],
        country: ["DE"],
        country_unknown: true,
        offset: 100,
        limit: 100,
      },
    );
  });

  it("sends the performer roles as a list", async () => {
    await getPerformers({ role: [ArtistRole.CONDUCTOR] });
    expect(apiMock.sendCommand).toHaveBeenCalledWith(
      "music/classical/performers",
      { role: [ArtistRole.CONDUCTOR] },
    );
  });

  it("sends a works page with its year range", async () => {
    await getWorks({ year_from: 1700, year_to: 1750, limit: 100 });
    expect(apiMock.sendCommand).toHaveBeenCalledWith("music/classical/works", {
      year_from: 1700,
      year_to: 1750,
      limit: 100,
    });
  });

  it("leaves the server defaults in place without arguments", async () => {
    await getWorks();
    expect(apiMock.sendCommand).toHaveBeenCalledWith(
      "music/classical/works",
      {},
    );
  });
});

describe("classical filter choices", () => {
  it.each([
    ["music/classical/composer_filters", getComposerFilters],
    ["music/classical/performer_filters", getPerformerFilters],
    ["music/classical/work_filters", getWorkFilters],
  ])("fetches the choices with %s", async (command, get) => {
    await get();
    expect(apiMock.sendCommand).toHaveBeenCalledWith(command);
  });
});
