<template>
  <section>
    <!-- The work has no artwork of its own; the hero borrows the composer's. -->
    <ClassicalHero :item="heroItem" section="works">
      <template v-if="work" #meta>
        <!-- tells it apart from a work of the same title -->
        <div v-if="work.version" class="work-meta-text">{{ work.version }}</div>
        <div class="work-meta-line">
          <Music :size="16" class="work-meta-icon" />
          <span class="work-meta-text">
            <router-link
              v-if="composerMapping"
              :to="`/classical/composers/${composerMapping.item_id}`"
              class="work-composer-link"
            >
              {{ composerMapping.name }}
            </router-link>
            <template v-for="(detail, i) in workDetails" :key="i">
              <span v-if="composerMapping || i" class="work-meta-sep">·</span
              >{{ detail }}
            </template>
          </span>
        </div>
        <div v-if="work.parent_work" class="work-meta-text work-part-of">
          {{ $t("classical_part_of") }}
          <router-link
            :to="`/classical/works/${work.parent_work.item_id}`"
            class="work-parent-link"
          >
            {{ work.parent_work.name }}
            <span v-if="work.parent_work.version" class="text-muted-foreground">
              ({{ work.parent_work.version }})</span
            >
          </router-link>
        </div>
      </template>
    </ClassicalHero>
    <DetailTextRow
      v-if="work?.metadata.description"
      :text="work.metadata.description"
      :dialog-title="work.name"
      markdown
    />
    <WorkMovements
      v-if="work?.movements?.length"
      :key="work.item_id"
      v-model="selectedMovements"
      v-model:selected-arias="selectedArias"
      :movements="work.movements"
      :counts="movementCounts"
      :arias="arias"
      :aria-counts="ariaCounts"
      :from-library="!work.movements_from_musicbrainz"
    />

    <ClassicalSection
      :title="$t('recordings')"
      :meta="recordings.length ? recordingCountLabel(shownCount) : undefined"
    >
      <template v-if="recordings.length" #append>
        <div class="ms-auto flex items-center">
          <SectionSearch
            ref="searchField"
            v-model="query"
            :open="searchOpen"
            :placeholder="$t('classical_filter_recordings_placeholder')"
            @toggle="toggleSearch"
            @close="closeSearch"
          />
          <ToolbarOverflowMenu
            v-if="recordingsMenu.length"
            :items="recordingsMenu"
            :active="yearRangeActive"
          />
        </div>
      </template>
      <template v-if="recordings.length" #below-head>
        <ListingSearchRow
          ref="searchRow"
          v-model="query"
          :open="searchOpen"
          :placeholder="$t('classical_filter_recordings_placeholder')"
          @close="closeSearch"
        />
        <PerformerFilterLine
          v-if="performerName"
          :performer="performerName"
          :count="displayedRecordings.length"
          @clear="clearPerformer"
        />
      </template>
      <div v-if="loading">
        <ListViewSkeleton v-for="n in 4" :key="n" />
      </div>
      <div v-else-if="movementGroups.length" class="recordings-list">
        <template v-for="g in movementGroups" :key="g.key">
          <div class="movement-heading classical-play-row">
            <RowPlayButton
              side="start"
              :label="`${$t('play')} ${g.name}`"
              @play="(e: Event) => playGroup(g.rows, e)"
            />
            <h3 class="movement-heading-title">{{ g.name }}</h3>
            <RowPlayButton
              side="end"
              :label="`${$t('play')} ${g.name}`"
              @play="(e: Event) => playGroup(g.rows, e)"
            />
          </div>
          <MovementRecordingRow
            v-for="row in g.rows"
            :key="row.recording.key"
            :recording="row.recording"
            :tracks="row.tracks"
            @play="playTracks"
            @menu="onMenuMovement"
          />
        </template>
      </div>
      <div
        v-else-if="
          !selectedMovements.length &&
          !selectedArias.length &&
          displayedRecordings.length
        "
        class="recordings-list"
      >
        <template v-for="g in recordingGroups" :key="g.key">
          <!-- with parts, the work's own recordings get a heading too -->
          <h3 v-if="g.link || recordingGroups.length > 1" class="part-heading">
            <router-link v-if="g.link" :to="g.link" class="part-title">
              {{ g.name }}
              <span v-if="g.version" class="text-muted-foreground">
                ({{ g.version }})</span
              >
            </router-link>
            <span v-else class="part-title">{{ g.name }}</span>
            <span v-if="g.composer" class="part-composer">
              · {{ g.composer }}
            </span>
          </h3>
          <WorkRecordingCard
            v-for="r in g.recordings"
            :key="r.key"
            :recording="r"
            :movements="work?.movements"
            :act-movements="actMovementsOf(r)"
            @play-recording="playRecording"
            @play-movement="playMovement"
            @menu-recording="onMenuRecording"
            @menu-movement="onMenuMovement"
          />
        </template>
      </div>
      <ClassicalEmpty v-else :filtered="recordings.length > 0" />
    </ClassicalSection>

    <ClassicalSection v-if="relatedWorks.length" :title="$t('related_works')">
      <ul class="related-list">
        <li v-for="r in relatedWorks" :key="`${r.label}-${r.work.item_id}`">
          {{ $t(r.label) }}
          <router-link :to="`/classical/works/${r.work.item_id}`">
            {{ r.work.name }}
            <span v-if="r.work.version" class="text-muted-foreground">
              ({{ r.work.version }})</span
            >
          </router-link>
        </li>
      </ul>
    </ClassicalSection>
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import ListingSearchRow from "@/components/listing-toolbar/ListingSearchRow.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import ToolbarOverflowMenu from "@/components/ToolbarOverflowMenu.vue";
import { normalizeForFilter } from "@/helpers/utils";
import api from "@/plugins/api";
import {
  EventType,
  ImageType,
  WorkType,
  type Artist,
  type EventMessage,
  type ItemMapping,
  type Recording,
  type Track,
  type Work,
  type WorkMovement,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import {
  getClassicalArtist,
  getWork,
  getWorkRecordings,
} from "@/services/classical";
import { useBackFilter } from "@/views/classical/backFilter";
import { useBackScroll } from "@/views/classical/backScroll";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import MovementRecordingRow from "@/views/classical/components/MovementRecordingRow.vue";
import PerformerFilterLine from "@/views/classical/components/PerformerFilterLine.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import SectionSearch from "@/views/classical/components/SectionSearch.vue";
import WorkMovements from "@/views/classical/components/WorkMovements.vue";
import WorkRecordingCard from "@/views/classical/components/WorkRecordingCard.vue";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import { useActArias } from "@/views/classical/actArias";
import { useOwnFavorites } from "@/views/classical/favorites";
import {
  periodLabel,
  recordingCountLabel,
  workTypeLabel,
} from "@/views/classical/labels";
import { openMovementMenu, openRecordingMenu } from "@/views/classical/menu";
import { playTracks } from "@/views/classical/playback";
import { useSectionSearch } from "@/views/classical/sectionSearch";
import { useYearRange, yearBounds } from "@/views/classical/yearRange";
import { CalendarRange, Music } from "@lucide/vue";
import { computed, markRaw, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "WorkDetail" });

// waits out the burst of updates a refresh of the work's tree sends
const ITEM_UPDATE_DELAY_MS = 2000;

const props = defineProps<{
  id: string;
  filterByArtistId?: string;
}>();

const router = useRouter();

const work = ref<Work | undefined>();
const composer = ref<Artist | undefined>();
const recordings = ref<Recording[]>([]);
const loading = ref(true);
useBackScroll(() => loading.value);

useOwnFavorites(() => recordings.value.flatMap((r) => r.tracks));

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

const composerMapping = computed(() => work.value?.composers[0]);

// e.g. Romantic · Op. 18 · Concerto · 1901; a type of Other says nothing
const workDetails = computed(() => {
  const w = work.value;
  if (!w) return [];
  return [
    composer.value?.period && periodLabel(composer.value.period),
    w.catalog_numbers[0],
    w.work_type && w.work_type !== WorkType.OTHER && workTypeLabel(w.work_type),
    w.composition_year && String(w.composition_year),
  ].filter((d): d is string => !!d);
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
        (!id || matchesArtist(s.r, id)) && (!term || s.haystack.includes(term)),
    )
    .map((s) => s.r);
});

const displayedRecordings = computed(() =>
  matchedRecordings.value.filter((r) => matchesYear(r.year)),
);

// The chosen movements, which replace the recordings list with those
// movements from each shown recording.
const selectedMovements = ref<number[]>([]);

// Each movement number followed by those of the movements it sits under,
// e.g. an aria's then its act's.
const movementLineage = computed(() => {
  const byNumber = new Map(
    (work.value?.movements ?? []).map((m) => [m.number, m]),
  );
  const lineage = new Map<number, number[]>();
  for (const m of byNumber.values()) {
    const chain = [m.number];
    for (let p = m.parent; p != null; p = byNumber.get(p)?.parent)
      chain.push(p);
    lineage.set(m.number, chain);
  }
  return lineage;
});

const lineageOf = (n: number) => movementLineage.value.get(n) ?? [n];

// How many shown recordings have each movement, by movement number; an act
// counts the recordings of its arias too.
const movementCounts = computed(() => {
  const counts: Record<number, number> = {};
  for (const r of displayedRecordings.value)
    for (const n of new Set((r.movement_numbers ?? []).flatMap(lineageOf)))
      counts[n] = (counts[n] ?? 0) + 1;
  return counts;
});

// The chosen arias of an opera's acts, by key.
const selectedArias = ref<string[]>([]);

const { arias, ariaCounts, ariaRows, actMovementsOf } = useActArias(
  work,
  displayedRecordings,
);

// Each shown recording with its tracks of a movement; an act brings its arias'
// tracks.
const movementRows = (number: number) =>
  displayedRecordings.value
    .map((recording) => ({
      recording,
      tracks: recording.tracks.filter(
        (t) =>
          t.movement_number != null &&
          lineageOf(t.movement_number).includes(number),
      ),
    }))
    .filter((row) => row.tracks.length);

// Each chosen movement in movement order, followed by its chosen arias, with
// their tracks from each shown recording in the list's order.
const movementGroups = computed(() =>
  (work.value?.movements ?? [])
    .flatMap((movement) => [
      ...(selectedMovements.value.includes(movement.number)
        ? [
            {
              key: `movement-${movement.number}`,
              name: movement.name,
              rows: movementRows(movement.number),
            },
          ]
        : []),
      ...arias.value
        .filter(
          (a) =>
            a.act === movement.number && selectedArias.value.includes(a.key),
        )
        .map((a) => ({
          key: `aria-${a.key}`,
          name: a.name,
          rows: ariaRows(a),
        })),
    ])
    .filter((g) => g.rows.length),
);

const shownCount = computed(() =>
  selectedMovements.value.length || selectedArias.value.length
    ? new Set(
        movementGroups.value.flatMap((g) =>
          g.rows.map((row) => row.recording.key),
        ),
      ).size
    : displayedRecordings.value.length,
);

interface RecordingGroup {
  key: string;
  name: string;
  // the group's own work page, absent for the page's work
  link?: string;
  // named only where it differs from the work's composer
  composer?: string;
  // tells apart works sharing a title, e.g. 1888 version
  version?: string;
  recordings: Recording[];
}

// The shown recordings in groups: by the movement list on a work whose
// movements are its parts, otherwise by the work they are of.
const recordingGroups = computed<RecordingGroup[]>(() => {
  const w = work.value;
  if (!w) return [];
  return w.movements?.some((m) => m.work_id)
    ? groupByMovement(w.movements, w.item_id)
    : groupByPart(w);
});

// Works this one is arranged from, then works arranged from it.
const relatedWorks = computed(() => [
  ...(work.value?.arrangement_of ?? []).map((w) => ({
    label: "classical_arrangement_of",
    work: w,
  })),
  ...(work.value?.arrangements ?? []).map((w) => ({
    label: "classical_arranged_as",
    work: w,
  })),
]);

// Skip the composer's logo so the hero shows the work title.
const heroItem = computed<Work | undefined>(() => {
  const w = work.value;
  if (!w) return undefined;
  const images = (composer.value?.metadata.images ?? []).filter(
    (img) => img.type !== ImageType.LOGO,
  );
  return { ...w, metadata: { ...w.metadata, images } };
});

const resetFilter = () => {
  clearYearRange();
  closeSearch();
  performerArtistId.value = null;
};

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

const load = async (id: string) => {
  // the previous work must not stay actionable under the new route
  work.value = undefined;
  composer.value = undefined;
  recordings.value = [];
  loading.value = true;
  resetFilter();
  selectedMovements.value = [];
  selectedArias.value = [];
  restoreFilter();
  if (await fetchPage(id)) loading.value = false;
};

// Fills the page with the work as the server has it now. False when the id is
// unknown or a newer fetch has taken over the page.
let pageFetch = 0;
const fetchPage = async (id: string): Promise<boolean> => {
  const fetchId = ++pageFetch;
  try {
    const [w, recs] = await Promise.all([getWork(id), getWorkRecordings(id)]);
    const composerId = w.composers[0]?.item_id;
    // the composer only lends the banner its pictures, so the page shows without
    const c = composerId
      ? await getClassicalArtist(composerId).catch(() => undefined)
      : undefined;
    if (fetchId !== pageFetch) return false;
    composer.value = c;
    work.value = w;
    recordings.value = recs;
    return true;
  } catch {
    // an unknown id leaves the page on its placeholder, as the artist page does
    return false;
  }
};

watch(
  () => props.id,
  (id) => load(id),
  { immediate: true },
);

// A refresh reloads the whole tree of works, so a part's page updates too. The
// update carries the work alone, so once the updates stop the page fetches its
// movements and recordings again, keeping the filters.
let updateTimer: ReturnType<typeof setTimeout> | undefined;
const unsubUpdates = api.subscribe(
  EventType.MEDIA_ITEM_UPDATED,
  (evt: EventMessage) => {
    const uri = work.value?.uri;
    if (!uri || evt.object_id !== uri) return;
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      // the page may have moved on to another work meanwhile
      if (work.value?.uri === uri) fetchPage(props.id);
    }, ITEM_UPDATE_DELAY_MS);
  },
);
onBeforeUnmount(() => {
  clearTimeout(updateTimer);
  unsubUpdates();
});

// A performer-context arrival shows that performer's recordings alone. Only
// truthy values drive this, as Show all clears the performer itself.
watch(
  () => props.filterByArtistId,
  (id) => {
    if (id) performerArtistId.value = id;
  },
  { immediate: true },
);

const dropArtistParam = () => {
  if (props.filterByArtistId)
    router.replace({ path: `/classical/works/${props.id}` });
};

const clearPerformer = () => {
  dropArtistParam();
  performerArtistId.value = null;
};

const playRecording = (r: Recording, evt: Event) => {
  playTracks(r.tracks, evt);
};

const playMovement = (m: Track, evt: Event) => {
  playTracks([m], evt);
};

const playGroup = (rows: Array<{ tracks: Track[] }>, evt: Event) => {
  playTracks(
    rows.flatMap((row) => row.tracks),
    evt,
  );
};

// On a work with parts, the menu leads to the recording's part and its composer.
const menuContext = (r: Recording) => {
  const part = work.value?.parts?.find((p) => p.item_id === r.work.item_id);
  return {
    router,
    work: r.work,
    composer:
      (part && "composers" in part ? part.composers[0] : undefined) ??
      composerMapping.value,
  };
};

const onMenuRecording = (r: Recording, evt: Event) => {
  if (!work.value) return;
  openRecordingMenu([r], menuContext(r), evt);
};

const onMenuMovement = (m: Track, r: Recording, evt: Event) => {
  if (!work.value) return;
  openMovementMenu(m, r, menuContext(r), evt);
};

// The page's own work first, then, on a work with parts such as an opera,
// each part in the work's order.
function groupByPart(w: Work): RecordingGroup[] {
  const groups = new Map<
    string,
    { work: Work | ItemMapping; recordings: Recording[] }
  >();
  for (const part of [w, ...(w.parts ?? [])])
    groups.set(part.item_id, { work: part, recordings: [] });
  for (const r of displayedRecordings.value) {
    // a part of a listed part, e.g. an aria of an act, goes with that part
    const id =
      !groups.has(r.work.item_id) &&
      r.parent_work &&
      groups.has(r.parent_work.item_id)
        ? r.parent_work.item_id
        : r.work.item_id;
    // a part the work does not list still shows, last
    if (!groups.has(id)) groups.set(id, { work: r.work, recordings: [] });
    groups.get(id)!.recordings.push(r);
  }
  return [...groups.entries()]
    .filter(([, g]) => g.recordings.length)
    .map(([id, g]) => {
      const c = "composers" in g.work ? g.work.composers[0] : undefined;
      return {
        key: id,
        name: g.work.name,
        version: g.work.version,
        link: id === w.item_id ? undefined : `/classical/works/${id}`,
        composer:
          c && c.item_id !== composerMapping.value?.item_id
            ? c.name
            : undefined,
        recordings: g.recordings,
      };
    });
}

// Each recording under the top-level movement it belongs to, e.g. an aria's
// recording under its act, in movement order. Recordings of the whole work
// come first and any that fit nowhere last.
function groupByMovement(
  movements: WorkMovement[],
  workId: string,
): RecordingGroup[] {
  const byWork = new Map(
    movements.filter((m) => m.work_id).map((m) => [m.work_id!, m.number]),
  );
  const byTop = new Map<number, Array<{ r: Recording; rank: number }>>();
  const complete: Recording[] = [];
  const other: Recording[] = [];
  for (const r of displayedRecordings.value) {
    const number =
      byWork.get(r.work.item_id) ??
      (r.parent_work && byWork.get(r.parent_work.item_id)) ??
      r.movement_numbers?.[0];
    if (number != null) {
      const top = lineageOf(number).at(-1)!;
      // the whole movement first, then by the first part held
      const rank = r.movement_numbers?.includes(top)
        ? 0
        : (r.movement_numbers?.find((n) => n !== top) ?? number);
      byTop.set(top, [...(byTop.get(top) ?? []), { r, rank }]);
    } else if (r.work.item_id === workId) complete.push(r);
    else other.push(r);
  }
  const year = (r: Recording) => r.year ?? Number.MAX_SAFE_INTEGER;
  const groups: RecordingGroup[] = [
    {
      key: "complete",
      name: $t("classical_complete_recordings"),
      recordings: complete,
    },
    ...movements
      .filter((m) => byTop.has(m.number))
      .map((m) => ({
        key: `movement-${m.number}`,
        name: m.name,
        link: m.work_id ? `/classical/works/${m.work_id}` : undefined,
        recordings: byTop
          .get(m.number)!
          .sort((a, b) => a.rank - b.rank || year(a.r) - year(b.r))
          .map((x) => x.r),
      })),
    {
      key: "other",
      name: $t("classical_other_recordings"),
      recordings: other,
    },
  ];
  return groups.filter((g) => g.recordings.length);
}
</script>

<style scoped>
.work-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.work-meta-icon {
  flex: none;
}

.work-meta-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-composer-link {
  font-family: var(--font-classical-serif);
  font-optical-sizing: auto;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.work-meta-sep {
  margin: 0 4px;
  opacity: 0.5;
}

.recordings-list {
  display: flex;
  flex-direction: column;
}

.movement-heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  /* lines up with the rows below, whose highlight starts 7px early */
  padding-left: 7px;
  margin: 1rem 0 0.25rem -7px;
}

.movement-heading:first-child {
  margin-top: 0;
}

/* in the movements' own italic, as the Movements section lists them */
.movement-heading-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(
    --font-classical-serif,
    "Roboto Serif",
    ui-serif,
    Georgia,
    serif
  );
  font-optical-sizing: auto;
  font-style: italic;
  font-size: 1.05rem;
  font-weight: 600;
}

.part-heading {
  margin: 1rem 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
}

.part-heading:first-child {
  margin-top: 0;
}

.part-title {
  color: inherit;
  text-decoration: none;
}

a.part-title:hover {
  text-decoration: underline;
}

.part-composer {
  font-weight: 400;
  opacity: 0.7;
}

/* lines up with the text after the icon on the line above */
.work-part-of {
  padding-left: 24px;
}

.work-parent-link {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.related-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
