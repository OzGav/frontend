<template>
  <section ref="pageRoot">
    <!-- The work has no artwork of its own; the hero borrows the composer's. -->
    <ClassicalHero
      :item="heroItem"
      section="works"
      show-favorite
      editable-rows
      @edit-rows="rowsEditorOpen = true"
    >
      <template v-if="work" #meta>
        <WorkHeroMeta :work="work" :composer="composer" />
      </template>
      <template v-if="work" #aside>
        <WorkHeroLinks :work="work" />
      </template>
    </ClassicalHero>
    <template v-for="rowId in visibleRows" :key="rowId">
      <DetailTextRow
        v-if="rowId === 'description' && work?.metadata.description"
        :text="work.metadata.description"
        :dialog-title="work.name"
        markdown
        @edit-rows="rowsEditorOpen = true"
      />
      <WorkMovements
        v-else-if="rowId === 'movements' && work?.movements?.length"
        :key="work.item_id"
        v-model="selectedMovements"
        :movements="work.movements"
        :counts="movementCounts"
        :part-entries="partEntries"
        :from-library="!work.movements_from_musicbrainz"
        @edit-rows="rowsEditorOpen = true"
      />
      <FilterableSection
        v-else-if="rowId === 'recordings'"
        v-model="query"
        v-model:open="searchOpen"
        :title="$t('recordings')"
        :meta="recordingsMeta"
        :searchable="recordings.length > 0"
        :placeholder="$t('classical_filter_recordings_placeholder')"
        :menu="recordingsMenu"
        :menu-active="yearRangeActive"
        @edit-rows="rowsEditorOpen = true"
      >
        <template #actions>
          <SortDirectionToggle
            :label="$t('classical_sort_date')"
            :direction="sortDirection"
            :description="sortDescription"
            @toggle="toggleSortDirection"
          />
        </template>
        <template #below-search>
          <PerformerFilterLine
            v-if="performerName"
            :performer="performerName"
            :count="shownCount"
            @clear="clearPerformer"
          />
        </template>
        <div v-if="loading">
          <ListViewSkeleton v-for="n in 4" :key="n" />
        </div>
        <MovementGroupList
          v-else-if="movementGroups.length"
          :groups="movementGroups"
          @menu="onMenuMovement"
        />
        <RecordingGroupList
          v-else-if="!selectedMovements.length && displayedRecordings.length"
          :groups="recordingGroups"
          :movements="ownMovements"
          @menu-recording="onMenuRecording"
          @menu-movement="onMenuMovement"
        />
        <ClassicalEmpty v-else :filtered="recordings.length > 0" />
      </FilterableSection>
      <RelatedWorksSection
        v-else-if="rowId === 'related_works'"
        :work="work"
        @edit-rows="rowsEditorOpen = true"
      />
    </template>

    <!-- previewed with the banner's picture, the composer's -->
    <RowsEditor
      v-if="heroItem"
      v-model:open="rowsEditorOpen"
      :item="heroItem"
      :registry="workRows"
      :available-ids="availableRows"
      :subtitle="$t('edit_rows_subtitle_work')"
    />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import RowsEditor from "@/components/details/RowsEditor.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import { useDetailItemUpdates } from "@/composables/useDetailItemUpdates";
import { useHistoryScrollRestore } from "@/composables/useHistoryScrollRestore";
import SortDirectionToggle from "@/components/listing-toolbar/SortDirectionToggle.vue";
import {
  ImageType,
  SortDirection,
  type Artist,
  type Recording,
  type Track,
  type Work,
} from "@/plugins/api/interfaces";
import {
  getClassicalArtist,
  getWork,
  getWorkRecordings,
} from "@/services/classical";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import FilterableSection from "@/views/classical/components/FilterableSection.vue";
import MovementGroupList from "@/views/classical/components/MovementGroupList.vue";
import PerformerFilterLine from "@/views/classical/components/PerformerFilterLine.vue";
import RecordingGroupList from "@/views/classical/components/RecordingGroupList.vue";
import RelatedWorksSection from "@/views/classical/components/RelatedWorksSection.vue";
import WorkHeroLinks from "@/views/classical/components/WorkHeroLinks.vue";
import WorkHeroMeta from "@/views/classical/components/WorkHeroMeta.vue";
import WorkMovements from "@/views/classical/components/WorkMovements.vue";
import { useOwnFavorites } from "@/views/classical/favorites";
import {
  recordingCountLabel,
  shortMovementName,
} from "@/views/classical/labels";
import { openMovementMenu, openRecordingMenu } from "@/views/classical/menu";
import { useClassicalPreferences } from "@/views/classical/preferences";
import { $t } from "@/plugins/i18n";
import {
  groupByHeading,
  type MovementGroup,
  type RecordingGroup,
} from "@/views/classical/recordingGroups";
import { useRecordingsFilter } from "@/views/classical/recordingsFilter";
import { useWorkParts } from "@/views/classical/workParts";
import { useWorkRows, workRows } from "@/views/classical/workRows";
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "WorkDetail" });

const props = defineProps<{
  id: string;
  filterByArtistId?: string;
}>();

const router = useRouter();

// the name the page's choices are stored under
const PREFS_ITEMTYPE = "work";

const work = ref<Work | undefined>();
const composer = ref<Artist | undefined>();
const recordings = ref<Recording[]>([]);
const loading = ref(true);
const { rowsEditorOpen, availableRows, visibleRows } = useWorkRows(work);
const pageRoot = ref<HTMLElement>();
useHistoryScrollRestore(pageRoot);

useOwnFavorites(() => [
  ...(work.value ? [work.value] : []),
  ...recordings.value.flatMap((r) => r.tracks),
]);

const {
  query,
  searchOpen,
  yearRangeActive,
  recordingsMenu,
  performerName,
  clearPerformer,
  displayedRecordings,
  selectedMovements,
} = useRecordingsFilter(props, work, recordings);

// the chosen movements would otherwise keep filtering the recordings while
// hidden
watch(
  () => workRows.resolve(["movements"]).hidden.has("movements"),
  (hidden) => {
    if (hidden) selectedMovements.value = [];
  },
);

const composerMapping = computed(() => work.value?.composers[0]);

const { lineageOf, partEntries, ownMovements, rowsOf } = useWorkParts(
  work,
  displayedRecordings,
);

// How many shown recordings have each movement, by movement number; an act
// counts the recordings of its arias too, and an aria those with its tracks.
const movementCounts = computed(() => {
  const counts: Record<number, number> = {};
  for (const r of displayedRecordings.value)
    for (const n of new Set((r.movement_numbers ?? []).flatMap(lineageOf)))
      counts[n] = (counts[n] ?? 0) + 1;
  for (const m of work.value?.movements ?? [])
    if (partEntries.value.has(m.number)) counts[m.number] = rowsOf(m).length;
  return counts;
});

// Each chosen movement in movement order, an aria under its act, with their
// tracks from each shown recording in the list's order.
const movementGroups = computed<MovementGroup[]>(() =>
  (work.value?.movements ?? [])
    .filter((m) => selectedMovements.value.includes(m.number))
    .map((m) => ({
      key: `movement-${m.number}`,
      name: partEntries.value.has(m.number) ? shortMovementName(m) : m.name,
      rows: rowsOf(m),
    }))
    .filter((g) => g.rows.length),
);

// the work's total, whatever the filters show
const recordingsMeta = computed(() =>
  recordings.value.length
    ? recordingCountLabel(recordings.value.length)
    : undefined,
);

const shownCount = computed(() =>
  selectedMovements.value.length
    ? new Set(
        movementGroups.value.flatMap((g) =>
          g.rows.map((row) => row.recording.key),
        ),
      ).size
    : displayedRecordings.value.length,
);

const recordingGroups = computed<RecordingGroup[]>(() =>
  work.value
    ? groupByHeading(
        work.value,
        displayedRecordings.value,
        composerMapping.value?.item_id,
      )
    : [],
);

// Skip the composer's logo so the hero shows the work title. Reactive, so the
// banner heart shows a like at once.
const heroItem = computed<Work | undefined>(() => {
  const w = work.value;
  if (!w) return undefined;
  const images = (composer.value?.metadata.images ?? []).filter(
    (img) => img.type !== ImageType.LOGO,
  );
  return reactive({ ...w, metadata: { ...w.metadata, images } });
});

// The order of the recordings by year, kept per user for every work.
const { preferences, save } = useClassicalPreferences(PREFS_ITEMTYPE);
const sortDirection = ref(preferences.sortDirection ?? SortDirection.ASC);
const sortDescription = computed(() =>
  $t(
    sortDirection.value === SortDirection.DESC
      ? "classical_sort_date_newest_first"
      : "classical_sort_date_oldest_first",
  ),
);
const toggleSortDirection = () => {
  sortDirection.value =
    sortDirection.value === SortDirection.DESC
      ? SortDirection.ASC
      : SortDirection.DESC;
  save("sortDirection", sortDirection.value);
  fetchPage(props.id);
};

const load = async (id: string) => {
  // the previous work must not stay actionable under the new route
  work.value = undefined;
  composer.value = undefined;
  recordings.value = [];
  loading.value = true;
  if (await fetchPage(id)) loading.value = false;
};

// Fills the page with the work as the server has it now. False when the id is
// unknown or a newer fetch has taken over the page.
let pageFetch = 0;
const fetchPage = async (id: string): Promise<boolean> => {
  const fetchId = ++pageFetch;
  try {
    const [w, recs] = await Promise.all([
      getWork(id),
      // oldest first is the server's own order, so only newest first is sent
      getWorkRecordings(
        id,
        sortDirection.value === SortDirection.DESC
          ? SortDirection.DESC
          : undefined,
      ),
    ]);
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
useDetailItemUpdates(work, {
  keepItem: true,
  onUpdate: () => fetchPage(props.id),
});

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
</script>
