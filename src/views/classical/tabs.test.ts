import type { User } from "@/plugins/api/interfaces";
import { getLastVisitedClassicalTab } from "@/views/classical/tabs";
import { describe, expect, it, vi } from "vitest";
import { user } from "../../../tests/fixtures/user";

const { storeMock } = vi.hoisted(() => ({
  storeMock: { currentUser: undefined as User | undefined },
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));

describe("the Classical tab last visited", () => {
  it("is the one saved on the account", () => {
    storeMock.currentUser = user({
      preferences: { classical_last_tab: "performers" },
    });
    expect(getLastVisitedClassicalTab()).toBe("performers");
  });

  it.each([undefined, "lyrics"])(
    "is the default tab when the saved value is %s",
    (saved) => {
      storeMock.currentUser = user({
        preferences: { classical_last_tab: saved },
      });
      expect(getLastVisitedClassicalTab()).toBe("composers");
    },
  );

  it("is the default tab before sign-in", () => {
    storeMock.currentUser = undefined;
    expect(getLastVisitedClassicalTab()).toBe("composers");
  });
});
