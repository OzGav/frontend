import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import {
  useListingSearch,
  type ListingSearchOptions,
} from "./useListingSearch";

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    mobileLayout: false,
    dialogActive: false,
    showPlayersMenu: false,
  },
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));

describe("useListingSearch", () => {
  let scope: EffectScope | undefined;

  beforeEach(() => {
    storeMock.mobileLayout = false;
    storeMock.dialogActive = false;
    storeMock.showPlayersMenu = false;
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
  });

  function setup(options?: ListingSearchOptions) {
    const text = ref("");
    scope = effectScope();
    const search = scope.run(() => useListingSearch(text, options))!;
    const field = { focus: vi.fn() };
    const row = { focus: vi.fn() };
    search.field.value = field;
    search.row.value = row;
    return { text, search, field, row };
  }

  function pressEscape() {
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event;
  }

  it("opens and focuses the field, then closes and clears the text", async () => {
    const { text, search, field, row } = setup();

    search.toggle();
    await nextTick();
    expect(search.open.value).toBe(true);
    expect(field.focus).toHaveBeenCalledOnce();
    expect(row.focus).not.toHaveBeenCalled();

    text.value = "bach";
    search.toggle();
    expect(search.open.value).toBe(false);
    expect(text.value).toBe("");
  });

  it("focuses the row on a phone or a narrow title bar", async () => {
    const narrow = ref(true);
    const { search, field, row } = setup({ narrow: () => narrow.value });

    search.toggle();
    await nextTick();
    expect(row.focus).toHaveBeenCalledOnce();

    search.close();
    narrow.value = false;
    storeMock.mobileLayout = true;
    search.toggle();
    await nextTick();
    expect(row.focus).toHaveBeenCalledTimes(2);
    expect(field.focus).not.toHaveBeenCalled();
  });

  it("opens when text is set", async () => {
    const { text, search } = setup();

    text.value = "bach";
    await nextTick();
    expect(search.open.value).toBe(true);
  });

  it("keeps its open state in the caller's ref", () => {
    const open = ref(false);
    const { search } = setup({ open });

    search.toggle();
    expect(open.value).toBe(true);
  });

  it("closes an open search on Escape", () => {
    const { text, search } = setup();
    search.toggle();
    text.value = "bach";

    const event = pressEscape();
    expect(event.defaultPrevented).toBe(true);
    expect(search.open.value).toBe(false);
    expect(text.value).toBe("");
  });

  it("leaves Escape alone while closed, hidden or behind a dialog", () => {
    const shown = ref(false);
    const { search } = setup({ shown: () => shown.value });

    expect(pressEscape().defaultPrevented).toBe(false);

    search.toggle();
    expect(pressEscape().defaultPrevented).toBe(false);
    expect(search.open.value).toBe(true);

    shown.value = true;
    storeMock.dialogActive = true;
    expect(pressEscape().defaultPrevented).toBe(false);
    expect(search.open.value).toBe(true);
  });
});
