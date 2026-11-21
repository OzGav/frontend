import {
  ArtistRole,
  type Recording,
  type Work,
} from "@/plugins/api/interfaces";
import { useRecordingsFilter } from "@/views/classical/recordingsFilter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";
import { itemMapping } from "../../../tests/fixtures/itemMapping";
import { credit, recording } from "../../../tests/fixtures/recording";
import { work } from "../../../tests/fixtures/work";

const { replace, back } = vi.hoisted(() => ({
  replace: vi.fn(),
  // the filter a back navigation brings back, if any
  back: { saved: undefined as unknown },
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/views/classical/backFilter", () => ({
  useBackFilter:
    (_state: () => unknown, apply: (saved: unknown) => void) => () => {
      if (back.saved !== undefined) apply(back.saved);
    },
}));
vi.mock("@/views/classical/components/YearRangeFilter.vue", () => ({
  default: {},
}));

const piece = work({ item_id: "w1", name: "Violin Concerto" });

const bartok = recording({
  key: "a",
  work: itemMapping({ item_id: "w1", name: "Violin Concerto" }),
  credits: [credit("p1", "Béla Bartók", ArtistRole.SOLOIST)],
  albums: [itemMapping({ name: "Hungarian Sketches" })],
  year: 1940,
});
const oistrakh = recording({
  key: "b",
  work: itemMapping({ item_id: "w2", name: "Cadenza" }),
  credits: [credit("p2", "David Oistrakh", ArtistRole.SOLOIST)],
  year: 1958,
});
const undated = recording({
  key: "c",
  credits: [credit("p2", "David Oistrakh", ArtistRole.SOLOIST)],
});

const setup = (
  route: { id: string; filterByArtistId?: string } = { id: "w1" },
) =>
  useRecordingsFilter(
    reactive(route),
    ref<Work | undefined>(piece),
    ref<Recording[]>([bartok, oistrakh, undated]),
  );

const keys = (recordings: Recording[]) => recordings.map((r) => r.key);

beforeEach(() => {
  vi.clearAllMocks();
  back.saved = undefined;
});

describe("useRecordingsFilter", () => {
  it("shows every recording while nothing is filtered", () => {
    const filter = setup();
    expect(keys(filter.displayedRecordings.value)).toEqual(["a", "b", "c"]);
  });

  it("searches the performers ignoring case and accents", () => {
    const filter = setup();
    filter.query.value = "BARTOK";
    expect(keys(filter.displayedRecordings.value)).toEqual(["a"]);
  });

  it("searches the albums, the year and the name of a part", () => {
    const filter = setup();
    filter.query.value = "sketches";
    expect(keys(filter.displayedRecordings.value)).toEqual(["a"]);
    filter.query.value = "1958";
    expect(keys(filter.displayedRecordings.value)).toEqual(["b"]);
    filter.query.value = "cadenza";
    expect(keys(filter.displayedRecordings.value)).toEqual(["b"]);
  });

  it("does not search the name of the work itself", () => {
    const filter = setup();
    filter.query.value = "violin concerto";
    expect(filter.displayedRecordings.value).toEqual([]);
  });

  it("shows the performer of the route alone, under their name", () => {
    const filter = setup({ id: "w1", filterByArtistId: "p2" });
    expect(keys(filter.displayedRecordings.value)).toEqual(["b", "c"]);
    expect(filter.performerName.value).toBe("David Oistrakh");
  });

  it("clears the performer and drops it from the address", () => {
    const filter = setup({ id: "w1", filterByArtistId: "p2" });
    filter.clearPerformer();
    expect(replace).toHaveBeenCalledWith({ path: "/classical/works/w1" });
    expect(filter.performerName.value).toBe("");
    expect(keys(filter.displayedRecordings.value)).toEqual(["a", "b", "c"]);
  });

  it("offers the year range over the years recorded", () => {
    const filter = setup();
    const [menu] = filter.recordingsMenu.value;
    expect(menu.active).toBe(false);
    expect(menu.subItems?.[0].componentProps).toMatchObject({
      earliest: 1940,
      latest: 1958,
    });
  });

  it("offers no year range when no year is known", () => {
    const filter = useRecordingsFilter(
      reactive({ id: "w1" }),
      ref<Work | undefined>(piece),
      ref<Recording[]>([undated]),
    );
    expect(filter.recordingsMenu.value).toEqual([]);
  });

  it("filters on the year range, dropping recordings without a year", () => {
    const filter = setup();
    const props = filter.recordingsMenu.value[0].subItems?.[0].componentProps;
    if (!props) throw new Error("The year range menu entry has no props");
    (props["onUpdate:from"] as (value: string) => void)("1950");
    expect(filter.yearRangeActive.value).toBe(true);
    expect(keys(filter.displayedRecordings.value)).toEqual(["b"]);
  });

  it("starts afresh when another work opens", async () => {
    const route = reactive({ id: "w1" });
    const filter = useRecordingsFilter(
      route,
      ref<Work | undefined>(piece),
      ref<Recording[]>([bartok, oistrakh, undated]),
    );
    filter.query.value = "bartok";
    filter.searchOpen.value = true;
    filter.selectedMovements.value = [1];
    route.id = "w2";
    await nextTick();
    expect(filter.query.value).toBe("");
    expect(filter.searchOpen.value).toBe(false);
    expect(filter.selectedMovements.value).toEqual([]);
  });

  it("brings back the filter the user went back to", () => {
    back.saved = {
      query: "oistrakh",
      performerArtistId: null,
      yearFrom: "",
      yearTo: "1950",
      movements: [2],
    };
    const filter = setup();
    expect(filter.query.value).toBe("oistrakh");
    expect(filter.selectedMovements.value).toEqual([2]);
    expect(filter.displayedRecordings.value).toEqual([]);
  });
});
