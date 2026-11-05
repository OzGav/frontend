import { Period, WorkType } from "@/plugins/api/interfaces";
import {
  splitUnknown,
  UNKNOWN_COUNTRY,
  UNKNOWN_WORK_TYPE,
  useCountryFilter,
  usePeriodFilter,
  useWorkTypeFilter,
  withUnknown,
} from "@/views/classical/listFilters";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { i18nMock, prefsMock } = vi.hoisted(() => ({
  i18nMock: { global: { locale: { value: "en" } } },
  prefsMock: {
    preferences: {} as Record<string, unknown>,
    save: vi.fn(),
  },
}));

vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
  canonicalizeLocale: (locale: string) => locale,
  i18n: i18nMock,
}));
vi.mock("@/views/classical/preferences", () => ({
  useClassicalPreferences: () => prefsMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  prefsMock.preferences = {};
});

const workChoices = (work_types: WorkType[], work_type_unknown = false) => ({
  periods: [],
  work_types,
  work_type_unknown,
  earliest_year: null,
  latest_year: null,
});

const offered = (filter: { options: Array<{ value: string }> } | undefined) =>
  filter?.options.map((o) => o.value);

describe("withUnknown", () => {
  it("adds the unknown choice only when some item has no value", () => {
    expect(withUnknown(["a"], true, "unknown")).toEqual(["a", "unknown"]);
    expect(withUnknown(["a"], false, "unknown")).toEqual(["a"]);
  });
});

describe("splitUnknown", () => {
  it("separates the unknown choice from the chosen values", () => {
    expect(splitUnknown(["a", "unknown", "b"], "unknown")).toEqual({
      values: ["a", "b"],
      unknown: true,
    });
    expect(splitUnknown(["a"], "unknown")).toEqual({
      values: ["a"],
      unknown: false,
    });
  });
});

describe("usePeriodFilter", () => {
  it("offers the present periods in time order", () => {
    const { filter } = usePeriodFilter("works", () => [
      Period.ROMANTIC,
      Period.BAROQUE,
    ]);
    expect(offered(filter.value)).toEqual([Period.BAROQUE, Period.ROMANTIC]);
  });

  it("hides while fewer than two periods are present and none is chosen", () => {
    const { filter } = usePeriodFilter("works", () => [Period.BAROQUE]);
    expect(filter.value).toBeUndefined();
  });

  it("keeps a chosen period listed, and returns the choice", () => {
    prefsMock.preferences = { periodFilter: [Period.MODERN] };
    const { filter, selected } = usePeriodFilter("works", () => []);
    expect(offered(filter.value)).toEqual([Period.MODERN]);
    expect(selected.value).toEqual([Period.MODERN]);
  });

  it("saves a new choice", () => {
    const { filter, selected } = usePeriodFilter("works", () => [
      Period.BAROQUE,
      Period.ROMANTIC,
    ]);
    filter.value?.toggle(Period.BAROQUE);
    expect(selected.value).toEqual([Period.BAROQUE]);
    expect(prefsMock.save).toHaveBeenCalledWith("periodFilter", [
      Period.BAROQUE,
    ]);
  });
});

describe("useWorkTypeFilter", () => {
  it("offers the unknown choice when some work has no type", () => {
    const { filter } = useWorkTypeFilter("works", () =>
      workChoices([WorkType.MASS], true),
    );
    expect(offered(filter.value)).toEqual([WorkType.MASS, UNKNOWN_WORK_TYPE]);
  });

  it("hides until the choices are loaded", () => {
    const { filter } = useWorkTypeFilter("works", () => undefined);
    expect(filter.value).toBeUndefined();
  });

  it("turns the unknown choice into its own argument", () => {
    prefsMock.preferences = {
      workTypeFilter: [WorkType.MASS, UNKNOWN_WORK_TYPE],
    };
    const { query } = useWorkTypeFilter("works", () => workChoices([]));
    expect(query.value).toEqual({
      work_type: [WorkType.MASS],
      work_type_unknown: true,
    });
  });
});

describe("useCountryFilter", () => {
  const composerChoices = (countries: string[], country_unknown = false) => ({
    periods: [],
    countries,
    country_unknown,
  });

  it("offers the present countries by name with unknown last", () => {
    const { filter } = useCountryFilter("composers", () =>
      composerChoices(["PL", "AT"], true),
    );
    expect(offered(filter.value)).toEqual(["AT", "PL", UNKNOWN_COUNTRY]);
  });

  it("leaves the unknown choice out when every composer has a country", () => {
    const { filter } = useCountryFilter("composers", () =>
      composerChoices(["PL", "AT"]),
    );
    expect(offered(filter.value)).toEqual(["AT", "PL"]);
  });

  it("turns the chosen countries into list arguments", () => {
    prefsMock.preferences = { countryFilter: [UNKNOWN_COUNTRY] };
    const { query } = useCountryFilter("composers", () => undefined);
    expect(query.value).toEqual({ country: [], country_unknown: true });
  });
});
