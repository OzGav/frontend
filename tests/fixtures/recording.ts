import {
  ArtistRole,
  MediaType,
  type Credit,
  type Recording,
} from "@/plugins/api/interfaces";
import { itemMapping } from "./itemMapping";

/** A recording of a work, without tracks or credits unless given. */
export function recording(overrides: Partial<Recording> = {}): Recording {
  return {
    key: "1",
    work: itemMapping({
      item_id: "w1",
      name: "Work",
      media_type: MediaType.WORK,
    }),
    parent_work: null,
    tracks: [],
    credits: [],
    year: null,
    albums: [],
    duration: 0,
    ...overrides,
  };
}

/** A credit of an artist, by id and name, in a role. */
export function credit(
  id: string,
  name: string,
  role: ArtistRole,
  instrument: string | null = null,
  // as the server shows it; the instrument itself unless given
  instrumentLabel = instrument ?? "",
): Credit {
  return {
    artist: itemMapping({ item_id: id, name, media_type: MediaType.ARTIST }),
    role,
    instrument_label: instrumentLabel,
    position: 0,
  };
}
