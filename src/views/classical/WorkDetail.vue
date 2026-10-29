<template>
  <section>
    <!-- The work has no artwork of its own; the hero borrows the composer's. -->
    <ClassicalHero :item="heroItem" section="works">
      <template v-if="work" #meta>
        <WorkHeroMeta :work="work" :composer="composer" />
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
      <MovementGroupList
        v-else-if="movementGroups.length"
        :groups="movementGroups"
        @menu="onMenuMovement"
      />
      <RecordingGroupList
        v-else-if="
          !selectedMovements.length &&
          !selectedArias.length &&
          displayedRecordings.length
        "
        :groups="recordingGroups"
        :movements="work?.movements"
        :act-movements-of="actMovementsOf"
        @menu-recording="onMenuRecording"
        @menu-movement="onMenuMovement"
      />
      <ClassicalEmpty v-else :filtered="recordings.length > 0" />
    </ClassicalSection>

    <RelatedWorksSection :work="work" />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import ListingSearchRow from "@/components/listing-toolbar/ListingSearchRow.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import ToolbarOverflowMenu from "@/components/ToolbarOverflowMenu.vue";
import { useDetailItemUpdates } from "@/composables/useDetailItemUpdates";
import {
  ImageType,
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
import { useBackScroll } from "@/views/classical/backScroll";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import MovementGroupList from "@/views/classical/components/MovementGroupList.vue";
import PerformerFilterLine from "@/views/classical/components/PerformerFilterLine.vue";
import RecordingGroupList from "@/views/classical/components/RecordingGroupList.vue";
import RelatedWorksSection from "@/views/classical/components/RelatedWorksSection.vue";
import SectionSearch from "@/views/classical/components/SectionSearch.vue";
import WorkHeroMeta from "@/views/classical/components/WorkHeroMeta.vue";
import WorkMovements from "@/views/classical/components/WorkMovements.vue";
import { useActArias } from "@/views/classical/actArias";
import { useOwnFavorites } from "@/views/classical/favorites";
import { recordingCountLabel } from "@/views/classical/labels";
import { openMovementMenu, openRecordingMenu } from "@/views/classical/menu";
import {
  groupByMovement,
  groupByPart,
  movementLineage,
  movementRows,
  type MovementGroup,
  type RecordingGroup,
} from "@/views/classical/recordingGroups";
import { useRecordingsFilter } from "@/views/classical/recordingsFilter";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "WorkDetail" });

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

const {
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
} = useRecordingsFilter(props, work, recordings);

const composerMapping = computed(() => work.value?.composers[0]);

const lineage = computed(() => movementLineage(work.value?.movements ?? []));

const lineageOf = (n: number) => lineage.value.get(n) ?? [n];

// How many shown recordings have each movement, by movement number; an act
// counts the recordings of its arias too.
const movementCounts = computed(() => {
  const counts: Record<number, number> = {};
  for (const r of displayedRecordings.value)
    for (const n of new Set((r.movement_numbers ?? []).flatMap(lineageOf)))
      counts[n] = (counts[n] ?? 0) + 1;
  return counts;
});

const { arias, ariaCounts, ariaRows, actMovementsOf } = useActArias(
  work,
  displayedRecordings,
);

// Each chosen movement in movement order, followed by its chosen arias, with
// their tracks from each shown recording in the list's order.
const movementGroups = computed<MovementGroup[]>(() =>
  (work.value?.movements ?? [])
    .flatMap((movement) => [
      ...(selectedMovements.value.includes(movement.number)
        ? [
            {
              key: `movement-${movement.number}`,
              name: movement.name,
              rows: movementRows(
                displayedRecordings.value,
                movement.number,
                lineageOf,
              ),
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

// The shown recordings in groups: by the movement list on a work whose
// movements are its parts, otherwise by the work they are of.
const recordingGroups = computed<RecordingGroup[]>(() => {
  const w = work.value;
  if (!w) return [];
  return w.movements?.some((m) => m.work_id)
    ? groupByMovement(
        w.movements,
        w.item_id,
        displayedRecordings.value,
        lineageOf,
      )
    : groupByPart(w, displayedRecordings.value, composerMapping.value?.item_id);
});

// Skip the composer's logo so the hero shows the work title.
const heroItem = computed<Work | undefined>(() => {
  const w = work.value;
  if (!w) return undefined;
  const images = (composer.value?.metadata.images ?? []).filter(
    (img) => img.type !== ImageType.LOGO,
  );
  return { ...w, metadata: { ...w.metadata, images } };
});

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
