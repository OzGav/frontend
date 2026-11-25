import {
  ListingType,
  SortDirection,
  SortField,
  type SortOptionInfo,
} from "@/plugins/api/interfaces";
import { useClassicalSort } from "@/views/classical/classicalSort";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSortOptions, prefsMock, toastError } = vi.hoisted(() => ({
  getSortOptions: vi.fn(),
  prefsMock: {
    preferences: {} as { sortBy?: string },
    save: vi.fn(),
  },
  toastError: vi.fn(),
}));

vi.mock("@/plugins/api", () => ({ api: { getSortOptions } }));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));
vi.mock("vue-sonner", () => ({ toast: { error: toastError } }));
vi.mock("@/views/classical/preferences", () => ({
  useClassicalPreferences: () => prefsMock,
}));

const option = (
  field: SortField,
  supportsDirection = true,
): SortOptionInfo => ({
  field,
  supports_direction: supportsDirection,
  default_direction: SortDirection.ASC,
  label_key: field,
});

const setup = (extra: Partial<Parameters<typeof useClassicalSort>[0]> = {}) => {
  const onChange = vi.fn();
  const sort = useClassicalSort({
    itemtype: "works",
    listing: ListingType.CLASSICAL_WORKS,
    onChange,
    ...extra,
  });
  return { ...sort, onChange };
};

describe("useClassicalSort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefsMock.preferences = {};
    getSortOptions.mockResolvedValue([
      option(SortField.NAME),
      option(SortField.YEAR),
      option(SortField.RECORDING_COUNT, false),
    ]);
  });

  it("falls back to the first choice when none is kept", async () => {
    const { ready, sort, sortBy } = setup();
    await ready;
    expect(getSortOptions).toHaveBeenCalledWith(ListingType.CLASSICAL_WORKS);
    expect(sortBy.value).toBe("name:asc");
    expect(sort.value).toEqual({
      sort_field: SortField.NAME,
      sort_direction: SortDirection.ASC,
    });
  });

  it("restores the kept choice, leaving out a direction it has none of", async () => {
    prefsMock.preferences = { sortBy: SortField.RECORDING_COUNT };
    const { ready, sort } = setup();
    await ready;
    expect(sort.value).toEqual({
      sort_field: SortField.RECORDING_COUNT,
      sort_direction: undefined,
    });
  });

  it("keeps a new choice and reloads, ignoring the current one", async () => {
    const { ready, setSort, sortBy, onChange } = setup();
    await ready;
    setSort("name:asc");
    setSort(undefined);
    expect(onChange).not.toHaveBeenCalled();
    setSort("year:desc");
    expect(sortBy.value).toBe("year:desc");
    expect(prefsMock.save).toHaveBeenCalledWith("sortBy", "year:desc");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("offers the choices without the excluded ones", async () => {
    const { ready, options } = setup({
      exclude: () => [SortField.RECORDING_COUNT],
    });
    await ready;
    expect(options.value.map((o) => o.field)).toEqual([
      SortField.NAME,
      SortField.YEAR,
    ]);
  });

  it("says so and sorts by the server's default when the choices fail", async () => {
    getSortOptions.mockRejectedValue(new Error("offline"));
    const { ready, sort } = setup();
    await ready;
    expect(toastError).toHaveBeenCalledWith(
      "settings.error_loading_sort_options",
      expect.anything(),
    );
    expect(sort.value).toEqual({});
  });
});
