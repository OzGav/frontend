import { ContextMenuItemId } from "@/helpers/context_menu_item";
import type { ContextMenuDialogEvent } from "@/plugins/eventbus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Router } from "vue-router";
import { artist } from "../../../tests/fixtures/artist";
import { recording } from "../../../tests/fixtures/recording";
import { track } from "../../../tests/fixtures/track";
import { openArtistMenu, openMovementMenu, openRecordingMenu } from "./menu";

const { emit, getContextMenuItems } = vi.hoisted(() => ({
  emit: vi.fn(),
  getContextMenuItems: vi.fn(),
}));

vi.mock("@/layouts/default/ItemContextMenu.vue", () => ({
  getContextMenuItems,
  getPlaybackContextMenuItems: vi.fn(async () => [{ label: "play" }]),
}));
vi.mock("@/plugins/eventbus", () => ({ eventbus: { emit } }));
vi.mock("@/plugins/api", () => ({ default: {} }));
vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
  canonicalizeLocale: (locale: string) => locale,
  i18n: { global: { locale: { value: "en" } } },
}));
vi.mock("@/helpers/classical_track_menu", () => ({
  classicalMenuEntries: () => [{ label: "classical" }],
}));

const router = { push: vi.fn() } as unknown as Router;
const evt = new MouseEvent("contextmenu");

// labels differ from the translation keys, so only the ids can match them
const showInfo = { id: ContextMenuItemId.SHOW_INFO, label: "info" };
const gotoArtist = { id: ContextMenuItemId.GOTO_ARTIST, label: "artist" };
const gotoAlbum = { id: ContextMenuItemId.GOTO_ALBUM, label: "album" };
const removeLibrary = { id: ContextMenuItemId.REMOVE_LIBRARY, label: "remove" };
const favorite = { label: "favorite" };

function shownLabels(): string[] {
  const event = emit.mock.calls[0][1] as ContextMenuDialogEvent;
  return event.items.map((item) => item.label);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("classical track menus", () => {
  it("swap Go to artist for the classical entries after Go to album", async () => {
    getContextMenuItems.mockResolvedValue([
      showInfo,
      gotoArtist,
      gotoAlbum,
      removeLibrary,
      favorite,
    ]);

    await openMovementMenu(track(), recording(), { router }, evt);

    expect(shownLabels()).toEqual([
      "play",
      "info",
      "album",
      "classical",
      "remove",
      "favorite",
    ]);
  });

  it("leave Show info and Remove from library off a recording, leading with the classical entries", async () => {
    getContextMenuItems.mockResolvedValue([showInfo, removeLibrary, favorite]);

    await openRecordingMenu(
      [recording({ tracks: [track()] })],
      { router },
      evt,
    );

    expect(shownLabels()).toEqual(["play", "classical", "favorite"]);
  });
});

describe("classical artist menu", () => {
  it("leads with the standard Show info", async () => {
    getContextMenuItems.mockResolvedValue([favorite, showInfo]);

    await openArtistMenu(artist(), router, evt);

    expect(shownLabels()).toEqual(["info", "favorite"]);
  });

  it("leads with its own Show info when the standard menu has none", async () => {
    getContextMenuItems.mockResolvedValue([favorite]);

    await openArtistMenu(artist(), router, evt);

    expect(shownLabels()).toEqual(["show_info", "favorite"]);
  });
});
