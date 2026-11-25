import { MediaType, type Work } from "@/plugins/api/interfaces";
import { withUri } from "./mediaItem";

/**
 * A complete work, for tests that only care about a few of its fields but
 * should still model a payload the server can send.
 */
export function work(overrides: Partial<Work> = {}): Work {
  return withUri<Omit<Work, "uri">>({
    item_id: "1",
    provider: "library",
    name: "Work",
    version: "",
    external_ids: [],
    is_playable: true,
    media_type: MediaType.WORK,
    provider_mappings: [],
    metadata: {},
    favorite: null,
    composers: [],
    catalog_numbers: [],
    arrangement_of: [],
    ...overrides,
  });
}
