import type { Track } from "@/plugins/api/interfaces";
import {
  navigateOnRowClick,
  openTrackOnRowClick,
} from "@/views/classical/rowClick";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Router } from "vue-router";

const { handleMediaItemClick } = vi.hoisted(() => ({
  handleMediaItemClick: vi.fn(),
}));

vi.mock("@/helpers/media_item_actions", () => ({ handleMediaItemClick }));

const router = { push: vi.fn() } as unknown as Router;
const track = { uri: "library://track/1" } as Track;

// A click at 10,20 on an element inside a row.
function clickOn(tag: string): MouseEvent {
  const row = document.createElement("div");
  const target = document.createElement("span");
  row.appendChild(document.createElement(tag)).appendChild(target);
  return { target, clientX: 10, clientY: 20 } as unknown as MouseEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("navigateOnRowClick", () => {
  it("opens the page on a click on the row itself", () => {
    navigateOnRowClick(clickOn("div"), router, "/classical/works/1");
    expect(router.push).toHaveBeenCalledWith("/classical/works/1");
  });

  it("leaves a click on the row's links and buttons to them", () => {
    navigateOnRowClick(clickOn("a"), router, "/classical/works/1");
    navigateOnRowClick(clickOn("button"), router, "/classical/works/1");
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("openTrackOnRowClick", () => {
  it("opens the track at the click's position", () => {
    openTrackOnRowClick(clickOn("div"), track);
    expect(handleMediaItemClick).toHaveBeenCalledWith(track, 10, 20);
  });

  it("leaves a click on the row's buttons to them", () => {
    openTrackOnRowClick(clickOn("button"), track);
    expect(handleMediaItemClick).not.toHaveBeenCalled();
  });
});
