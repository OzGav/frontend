import {
  ListingType,
  SortDirection,
  SortField,
  type SortOptionInfo,
} from "@/plugins/api/interfaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSortOptions } from "./sort_options";

const { getSortOptions, toastError } = vi.hoisted(() => ({
  getSortOptions: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/plugins/api", () => ({ api: { getSortOptions } }));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));
vi.mock("vue-sonner", () => ({ toast: { error: toastError } }));

const NAME_OPTION: SortOptionInfo = {
  field: SortField.NAME,
  supports_direction: true,
  default_direction: SortDirection.ASC,
  label_key: SortField.NAME,
};

describe("loadSortOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the options the server offers for the listing", async () => {
    getSortOptions.mockResolvedValue([NAME_OPTION]);

    const options = await loadSortOptions(ListingType.LIBRARY_GENRES);
    expect(options).toEqual([NAME_OPTION]);
    expect(getSortOptions).toHaveBeenCalledWith(ListingType.LIBRARY_GENRES);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows an error toast and returns undefined when loading fails", async () => {
    getSortOptions.mockRejectedValue(new Error("request failed"));

    const options = await loadSortOptions(ListingType.LIBRARY_GENRES);
    expect(options).toBeUndefined();
    expect(toastError).toHaveBeenCalledWith(
      "settings.error_loading_sort_options",
      { id: "library-sort-options-error" },
    );
  });
});
