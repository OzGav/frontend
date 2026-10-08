<template>
  <section>
    <!-- The work has no artwork of its own; the hero borrows the composer's. -->
    <ClassicalHero :item="heroItem" section="works">
      <template v-if="work" #meta>
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
            <template v-if="work.catalog_numbers[0]">
              <span class="work-meta-sep">·</span>{{ work.catalog_numbers[0] }}
            </template>
            <template v-if="work.work_type">
              <span class="work-meta-sep">·</span
              >{{ workTypeLabel(work.work_type) }}
            </template>
            <template v-if="work.composition_year">
              <span class="work-meta-sep">·</span>{{ work.composition_year }}
            </template>
          </span>
        </div>
      </template>
    </ClassicalHero>
    <DetailTextRow
      v-if="work?.metadata.description"
      :text="work.metadata.description"
      :dialog-title="work.name"
      markdown
    />

    <ClassicalSection
      :title="$t('recordings')"
      :meta="
        recordings.length
          ? recordingCountLabel(displayedRecordings.length)
          : undefined
      "
    >
      <div v-if="recordings.length" class="recordings-controls">
        <RecordingsFilter
          v-model="query"
          :committed="committed"
          :count="displayedRecordings.length"
          :performer-name="committedKind === 'performer' ? performerName : ''"
          :term="committedKind === 'text' ? committedTerm : ''"
          :generic-no-match="yearRangeActive"
          class="recordings-filter"
          @commit="commitFilter"
          @edit="editFilter"
          @clear="clearFilter"
        />
        <YearRangeFilter
          v-if="recordedBounds.earliest !== undefined"
          v-model:from="yearFrom"
          v-model:to="yearTo"
          :earliest="recordedBounds.earliest"
          :latest="recordedBounds.latest"
        />
      </div>
      <div v-if="loading">
        <ListViewSkeleton v-for="n in 4" :key="n" />
      </div>
      <div v-else-if="displayedRecordings.length" class="recordings-list">
        <WorkRecordingCard
          v-for="r in displayedRecordings"
          :key="r.key"
          :recording="r"
          @play-recording="playRecording"
          @play-movement="playMovement"
          @menu-recording="onMenuRecording"
          @menu-movement="onMenuMovement"
        />
      </div>
      <ClassicalEmpty
        v-else-if="!committed"
        :filtered="recordings.length > 0"
      />
    </ClassicalSection>

    <ClassicalSection
      v-if="work?.arrangement_of?.length"
      :title="$t('related_works')"
    >
      <ul class="related-list">
        <li v-for="r in work.arrangement_of" :key="r.item_id">
          {{ $t("classical_arrangement_of") }}
          <router-link :to="`/classical/works/${r.item_id}`">
            {{ r.name }}
          </router-link>
        </li>
      </ul>
    </ClassicalSection>
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import { normalizeForFilter } from "@/helpers/utils";
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
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import RecordingsFilter from "@/views/classical/components/RecordingsFilter.vue";
import WorkRecordingCard from "@/views/classical/components/WorkRecordingCard.vue";
import YearRangeFilter from "@/views/classical/components/YearRangeFilter.vue";
import { useOwnFavorites } from "@/views/classical/favorites";
import { recordingCountLabel, workTypeLabel } from "@/views/classical/labels";
import { openMovementMenu, openRecordingMenu } from "@/views/classical/menu";
import { playTracks } from "@/views/classical/playback";
import { useYearRange, yearBounds } from "@/views/classical/yearRange";
import { Music } from "@lucide/vue";
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

useOwnFavorites(() => recordings.value.flatMap((r) => r.tracks));

// Recordings filter state. `query` is the live input text; `committed` swaps
// the input for the status banner. A commit is either user-driven (Enter, kind
// "text") or a performer-context arrival (filterByArtistId, kind "performer").
const query = ref("");
const committed = ref(false);
const committedKind = ref<"text" | "performer" | null>(null);
const committedTerm = ref("");
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

const composerMapping = computed(() => work.value?.composers[0]);

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
  if (
    committed.value &&
    committedKind.value === "performer" &&
    performerArtistId.value
  )
    return recordings.value.filter((r) =>
      matchesArtist(r, performerArtistId.value!),
    );
  const raw =
    committed.value && committedKind.value === "text"
      ? committedTerm.value
      : query.value;
  const term = normalizeForFilter(raw.trim());
  if (!term) return recordings.value;
  return searchable.value
    .filter((s) => s.haystack.includes(term))
    .map((s) => s.r);
});

const displayedRecordings = computed(() =>
  matchedRecordings.value.filter((r) => matchesYear(r.year)),
);

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
  query.value = "";
  committed.value = false;
  committedKind.value = null;
  committedTerm.value = "";
  performerArtistId.value = null;
};

const load = async (id: string) => {
  // the previous work must not stay actionable under the new route
  work.value = undefined;
  composer.value = undefined;
  recordings.value = [];
  loading.value = true;
  resetFilter();
  try {
    const [w, recs] = await Promise.all([getWork(id), getWorkRecordings(id)]);
    const composerId = w.composers[0]?.item_id;
    // the composer only lends the banner its pictures, so the page shows without
    const c = composerId
      ? await getClassicalArtist(composerId).catch(() => undefined)
      : undefined;
    // a newer load has taken over the page
    if (id !== props.id) return;
    composer.value = c;
    work.value = w;
    recordings.value = recs;
  } catch {
    // an unknown id leaves the page on its placeholder, as the artist page does
    return;
  }
  loading.value = false;
};

watch(
  () => props.id,
  (id) => load(id),
  { immediate: true },
);

// A performer-context arrival pre-commits the filter to that performer. Only
// truthy values drive this, as clearing the param (Show all / banner edit) must
// not clobber the local input state those handlers set themselves.
watch(
  () => props.filterByArtistId,
  (id) => {
    if (!id) return;
    performerArtistId.value = id;
    committedKind.value = "performer";
    committed.value = true;
    committedTerm.value = "";
    query.value = "";
  },
  { immediate: true },
);

const dropArtistParam = () => {
  if (props.filterByArtistId)
    router.replace({ path: `/classical/works/${props.id}` });
};

const commitFilter = () => {
  const term = query.value.trim();
  if (!term) return;
  committedTerm.value = term;
  committedKind.value = "text";
  committed.value = true;
};

// Banner → editable input, pre-filled with the active term so it can be tweaked.
const editFilter = () => {
  if (committedKind.value === "performer") {
    query.value = performerName.value;
    dropArtistParam();
  } else {
    query.value = committedTerm.value;
  }
  committed.value = false;
  committedKind.value = null;
  committedTerm.value = "";
  performerArtistId.value = null;
};

const clearFilter = () => {
  dropArtistParam();
  resetFilter();
};

const playRecording = (r: Recording, evt: Event) => {
  playTracks(r.tracks, evt);
};

const playMovement = (m: Track, evt: Event) => {
  playTracks([m], evt);
};

const menuContext = () => ({
  router,
  work: work.value!,
  composer: composerMapping.value,
});

const onMenuRecording = (r: Recording, evt: Event) => {
  if (!work.value) return;
  openRecordingMenu([r], menuContext(), evt);
};

const onMenuMovement = (m: Track, r: Recording, evt: Event) => {
  if (!work.value) return;
  openMovementMenu(m, r, menuContext(), evt);
};
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

.recordings-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
}

.recordings-filter {
  flex: 1;
  min-width: 200px;
}

.recordings-list {
  display: flex;
  flex-direction: column;
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
