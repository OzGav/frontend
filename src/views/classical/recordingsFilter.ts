import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { normalizeForFilter } from "@/helpers/utils";
import type { Recording, Work } from "@/plugins/api/interfaces";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import { useBackFilter } from "@/views/classical/backFilter";
import { useSectionSearch } from "@/views/classical/sectionSearch";
import { useYearRange, yearBounds } from "@/views/classical/yearRange";
import { CalendarRange } from "@lucide/vue";
import { computed, markRaw, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";

/** The route props of a work's page. */
interface WorkRoute {
  id: string;
  // the performer the page was opened for
  filterByArtistId?: string;
}

/**
 * The filters of a work's recordings: the search, the performer, the year
 * recorded and the chosen movements and arias. They start afresh for each
 * work the page opens, unless the user went back to it, and a performer in
 * the route shows that performer's recordings alone.
 *
 * :param route: The page's route props.
 * :param work: The page's work.
 * :param recordings: All recordings of the work.
 */
export function useRecordingsFilter(
  route: WorkRoute,
  work: Ref<Work | undefined>,
  recordings: Ref<Recording[]>,
) {
  const router = useRouter();

  const query = ref("");
  const {
    open: searchOpen,
    field: searchField,
    row: searchRow,
    toggle: toggleSearch,
    close: closeSearch,
  } = useSectionSearch(query);
  // the performer the page was opened for, whose recordings alone show
  const performerArtistId = ref<string | null>(null);

  // Recordings carry the year they were performed, so the range filters on that.
  const {
    from: yearFrom,
    to: yearTo,
    isActive: yearRangeActive,
    matches: matchesYear,
    clear: clearYearRange,
  } = useYearRange();

  // The chosen movements, which replace the recordings list with those
  // movements from each shown recording.
  const selectedMovements = ref<number[]>([]);

  // The chosen arias of an opera's acts, by key.
  const selectedArias = ref<string[]>([]);

  const recordedBounds = computed(() =>
    yearBounds(recordings.value.map((r) => r.year)),
  );

  const recordingsMenu = computed<ToolBarMenuItem[]>(() => {
    const { earliest, latest } = recordedBounds.value;
    if (earliest === undefined) return [];
    return [
      {
        label: "classical_year_recorded",
        icon: CalendarRange,
        active: yearRangeActive.value,
        subItems: [
          {
            label: "classical_year_recorded",
            // markRaw, as the menu items land in a reactive array
            component: markRaw(YearRangeFilter),
            componentProps: {
              from: yearFrom.value,
              to: yearTo.value,
              earliest,
              latest,
              "onUpdate:from": (value: string) => (yearFrom.value = value),
              "onUpdate:to": (value: string) => (yearTo.value = value),
            },
          },
        ],
      },
    ];
  });

  const performerName = computed(() => {
    const id = performerArtistId.value;
    if (!id) return "";
    for (const r of recordings.value) {
      const credit = r.credits.find((c) => c.artist.item_id === id);
      if (credit) return credit.artist.name;
    }
    return "";
  });

  // Every piece of text the card can surface for a recording, folded for
  // case-insensitive, diacritic-blind substring matching.
  const recordingHaystack = (r: Recording): string => {
    const parts: string[] = [];
    // on a work with parts, the part's name, shown above its recordings
    if (r.work.item_id !== work.value?.item_id) parts.push(r.work.name);
    for (const c of r.credits) parts.push(c.artist.name);
    for (const a of r.albums) parts.push(a.name);
    if (r.year != null) parts.push(String(r.year));
    return normalizeForFilter(parts.join(" "));
  };

  // Folded once per load, so typing against a heavily recorded work doesn't
  // rebuild it per keystroke.
  const searchable = computed(() =>
    recordings.value.map((r) => ({ r, haystack: recordingHaystack(r) })),
  );

  const matchesArtist = (r: Recording, id: string): boolean =>
    r.credits.some((c) => c.artist.item_id === id);

  const matchedRecordings = computed(() => {
    const term = normalizeForFilter(query.value.trim());
    const id = performerArtistId.value;
    return searchable.value
      .filter(
        (s) =>
          (!id || matchesArtist(s.r, id)) &&
          (!term || s.haystack.includes(term)),
      )
      .map((s) => s.r);
  });

  const displayedRecordings = computed(() =>
    matchedRecordings.value.filter((r) => matchesYear(r.year)),
  );

  const restoreFilter = useBackFilter(
    () => ({
      query: query.value,
      performerArtistId: performerArtistId.value,
      yearFrom: yearFrom.value,
      yearTo: yearTo.value,
      movements: selectedMovements.value,
      arias: selectedArias.value,
    }),
    (saved) => {
      query.value = saved.query;
      performerArtistId.value = saved.performerArtistId;
      yearFrom.value = saved.yearFrom;
      yearTo.value = saved.yearTo;
      selectedMovements.value = saved.movements;
      selectedArias.value = saved.arias;
    },
  );

  // Registered before the performer watch below, so a performer in the route
  // survives the reset.
  watch(
    () => route.id,
    () => {
      clearYearRange();
      closeSearch();
      performerArtistId.value = null;
      selectedMovements.value = [];
      selectedArias.value = [];
      restoreFilter();
    },
    { immediate: true },
  );

  // A performer-context arrival shows that performer's recordings alone. Only
  // truthy values drive this, as Show all clears the performer itself.
  watch(
    () => route.filterByArtistId,
    (id) => {
      if (id) performerArtistId.value = id;
    },
    { immediate: true },
  );

  const clearPerformer = () => {
    if (route.filterByArtistId)
      router.replace({ path: `/classical/works/${route.id}` });
    performerArtistId.value = null;
  };

  return {
    query,
    searchOpen,
    searchField,
    searchRow,
    toggleSearch,
    closeSearch,
    yearRangeActive,
    recordingsMenu,
    performerName,
    clearPerformer,
    displayedRecordings,
    selectedMovements,
    selectedArias,
  };
}
