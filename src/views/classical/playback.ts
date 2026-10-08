import api from "@/plugins/api";
import { getWorkRecordings } from "@/services/classical";

/** Play the first recording of a work in the server's order, if it has one. */
export async function playFirstRecording(workId: string): Promise<void> {
  const [first] = await getWorkRecordings(workId);
  if (first) api.playMedia(first.tracks.map((t) => t.uri));
}
