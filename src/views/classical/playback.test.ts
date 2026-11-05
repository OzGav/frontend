import { MediaType, QueueOption } from "@/plugins/api/interfaces";
import { playRecording, playTracks } from "@/views/classical/playback";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "../../../tests/fixtures/track";

const { apiMock, menuMock, storeMock } = vi.hoisted(() => ({
  apiMock: { playMedia: vi.fn() },
  menuMock: {
    getDefaultEnqueueOptionFor: vi.fn(),
    showPlayMenuForMediaItem: vi.fn(),
  },
  storeMock: { activePlayer: { available: true } as { available: boolean } },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock, api: apiMock }));
vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/layouts/default/ItemContextMenu.vue", () => menuMock);

beforeEach(() => {
  vi.clearAllMocks();
  storeMock.activePlayer = { available: true };
  apiMock.playMedia.mockResolvedValue(undefined);
  menuMock.getDefaultEnqueueOptionFor.mockResolvedValue(QueueOption.REPLACE);
  menuMock.showPlayMenuForMediaItem.mockResolvedValue(undefined);
});

describe("playRecording", () => {
  it("plays a recording's tracks with the queue option set for albums", async () => {
    const tracks = [track({ item_id: "1" }), track({ item_id: "2" })];

    playRecording(tracks);
    await flushPromises();

    expect(menuMock.getDefaultEnqueueOptionFor).toHaveBeenCalledWith(
      MediaType.ALBUM,
    );
    expect(apiMock.playMedia).toHaveBeenCalledWith(
      tracks.map((t) => t.uri),
      QueueOption.REPLACE,
    );
  });

  it("plays a single-track recording like an album too", async () => {
    const single = track({ item_id: "1" });

    playRecording([single]);
    await flushPromises();

    expect(apiMock.playMedia).toHaveBeenCalledWith(
      [single.uri],
      QueueOption.REPLACE,
    );
  });

  it("opens the player menu when no player is available", async () => {
    storeMock.activePlayer = { available: false };
    const tracks = [track({ item_id: "1" })];

    playRecording(tracks);
    await flushPromises();

    expect(apiMock.playMedia).not.toHaveBeenCalled();
    expect(menuMock.showPlayMenuForMediaItem).toHaveBeenCalledWith(
      tracks,
      undefined,
      0,
      0,
    );
  });
});

describe("playTracks", () => {
  it("plays several tracks without the queue option set for albums", async () => {
    const tracks = [track({ item_id: "1" }), track({ item_id: "2" })];

    playTracks(tracks);
    await flushPromises();

    expect(menuMock.getDefaultEnqueueOptionFor).not.toHaveBeenCalled();
    expect(apiMock.playMedia).toHaveBeenCalledWith(
      tracks.map((t) => t.uri),
      undefined,
    );
  });
});
