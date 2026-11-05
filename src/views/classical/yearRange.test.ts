import { describe, expect, it } from "vitest";
import { useYearRange, yearBounds } from "./yearRange";

describe("yearBounds", () => {
  it("finds the earliest and latest year, skipping missing ones", () => {
    expect(yearBounds([1791, null, 1723, undefined, 1802])).toEqual({
      earliest: 1723,
      latest: 1802,
    });
  });

  it("leaves both out when no year is on file", () => {
    expect(yearBounds([null, undefined])).toEqual({});
    expect(yearBounds([])).toEqual({});
  });
});

describe("useYearRange", () => {
  it("matches every year, also a missing one, while both boxes are empty", () => {
    const { matches, isActive } = useYearRange();
    expect(isActive.value).toBe(false);
    expect(matches(1800)).toBe(true);
    expect(matches(null)).toBe(true);
  });

  it("reads the bounds low to high whichever box holds which", () => {
    const { from, to, bounds, matches } = useYearRange();
    from.value = "1900";
    to.value = "1800";
    expect(bounds.value).toEqual({ low: 1800, high: 1900 });
    expect(matches(1850)).toBe(true);
    expect(matches(1950)).toBe(false);
  });

  it("drops a missing year once either bound is set", () => {
    const { from, matches } = useYearRange();
    from.value = "1800";
    expect(matches(undefined)).toBe(false);
    expect(matches(1800)).toBe(true);
  });

  it("clears both boxes", () => {
    const { from, to, clear, isActive } = useYearRange();
    from.value = "1800";
    to.value = "1900";
    clear();
    expect(isActive.value).toBe(false);
  });
});
