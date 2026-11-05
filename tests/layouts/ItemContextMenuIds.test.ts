/**
 * The standard entries that other menus build on carry a stable id.
 */
import { ContextMenuItemId } from "@/helpers/context_menu_item";
import { getContextMenuItems } from "@/layouts/default/ItemContextMenu.vue";
import { MediaType, type Scope } from "@/plugins/api/interfaces";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemMapping } from "../fixtures/itemMapping";
import { providerMapping } from "../fixtures/providerMapping";
import { BUILTIN_ROLE_SCOPES, scopeChecker } from "../fixtures/scopes";
import { track } from "../fixtures/track";

const { apiMock, hasScope } = vi.hoisted(() => ({
  apiMock: {
    providers: {
      "test_provider--1": { available: true, supported_features: [] },
    } as Record<string, unknown>,
    getProvider: vi.fn(),
    getLibraryItem: vi.fn(),
    getTrack: vi.fn(async () => undefined),
    sendCommand: vi.fn(),
    players: {},
    state: { value: "initialized" },
  },
  hasScope: vi.fn<(scope: Scope) => boolean>(),
}));

vi.mock("@/plugins/api", () => ({
  default: apiMock,
  api: apiMock,
  ConnectionState: { INITIALIZED: "initialized" },
}));
vi.mock("@/plugins/store", () => ({
  store: { enabledPlugins: new Set<string>() },
}));
vi.mock("@/plugins/auth", () => ({
  authManager: { hasScope },
}));
vi.mock("@/plugins/eventbus", () => ({
  eventbus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));

// a library track with one artist and an album
const libraryTrack = track({
  provider_mappings: [providerMapping({ in_library: true })],
  artists: [itemMapping({ item_id: "a1", media_type: MediaType.ARTIST })],
  album: itemMapping({ item_id: "al1" }),
});

beforeEach(() => {
  vi.clearAllMocks();
  hasScope.mockImplementation(scopeChecker(BUILTIN_ROLE_SCOPES.user));
  apiMock.getProvider.mockReturnValue({ supported_features: [] });
  apiMock.getLibraryItem.mockResolvedValue(libraryTrack);
});

describe("item context menu ids", () => {
  it("are set on Show info, Go to artist, Go to album and Remove from library", async () => {
    const ids = (await getContextMenuItems([libraryTrack]))
      .map((item) => item.id)
      .filter((id) => id !== undefined);

    expect(ids).toEqual([
      ContextMenuItemId.SHOW_INFO,
      ContextMenuItemId.GOTO_ARTIST,
      ContextMenuItemId.GOTO_ALBUM,
      ContextMenuItemId.REMOVE_LIBRARY,
    ]);
  });
});
