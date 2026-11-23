import SortDirectionToggle from "@/components/listing-toolbar/SortDirectionToggle.vue";
import { SortDirection } from "@/plugins/api/interfaces";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

enableAutoUnmount(afterEach);

function mountToggle(direction: SortDirection) {
  return mount(SortDirectionToggle, {
    props: { label: "Date", direction, description: "Sorted by date" },
  });
}

describe("SortDirectionToggle", () => {
  it("names the sort with an arrow for its order", () => {
    const up = mountToggle(SortDirection.ASC);
    expect(up.text()).toBe("Date");
    expect(up.find(".lucide-arrow-up").exists()).toBe(true);
    const down = mountToggle(SortDirection.DESC);
    expect(down.find(".lucide-arrow-down").exists()).toBe(true);
  });

  it("describes the order and asks to flip it on a click", async () => {
    const wrapper = mountToggle(SortDirection.ASC);
    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("Sorted by date");
    await button.trigger("click");
    expect(wrapper.emitted("toggle")).toHaveLength(1);
  });
});
