<template>
  <section>
    <ClassicalHero :item="artistItem" show-favorite />
    <DetailTextRow
      v-if="artistItem?.metadata.description"
      :text="artistItem.metadata.description"
      :dialog-title="artistItem.name"
      markdown
    />
    <ClassicalSection
      :title="$t('works_performed')"
      :meta="works.length ? workCountLabel(filteredWorks.length) : undefined"
    >
      <template v-if="works.length" #append>
        <WorksFilterInput v-model="worksFilter" />
      </template>
      <div v-if="loading">
        <ListViewSkeleton v-for="n in 4" :key="n" />
      </div>
      <ul v-else-if="filteredWorks.length" class="performer-works-list">
        <li
          v-for="w in filteredWorks"
          :key="w.work.item_id"
          v-hold="(e: TouchEvent) => onHold(e, w)"
          class="performer-work-row classical-play-row"
          @click.capture="swallowClickAfterHold"
          @click="navigateOnRowClick($event, router, workLink(w.work.item_id))"
          @contextmenu.prevent="onMenuWork(w, $event)"
          @touchstart.passive="onTouchStart"
        >
          <RowPlayButton
            side="start"
            :label="`${$t('play')} ${w.work.name}`"
            :disabled="!tracksByWork[w.work.item_id]?.length"
            @play="(e: Event) => onPlayWork(w.work.item_id, e)"
          />
          <div class="performer-work-link">
            <router-link
              v-if="w.work.composers[0]"
              :to="`/classical/composers/${w.work.composers[0].item_id}`"
              class="performer-work-composer performer-work-composer-link"
            >
              {{ w.work.composers[0].name }}
            </router-link>
            <router-link
              :to="workLink(w.work.item_id)"
              class="performer-work-title"
            >
              {{ w.work.name }}
              <span
                v-if="w.work.catalog_numbers[0]"
                class="performer-work-meta"
              >
                [{{ w.work.catalog_numbers[0] }}]
              </span>
            </router-link>
          </div>
          <span class="meta-recordings">
            {{ recordingCountLabel(w.recording_count) }}
          </span>
          <RowPlayButton
            side="end"
            :label="`${$t('play')} ${w.work.name}`"
            :disabled="!tracksByWork[w.work.item_id]?.length"
            @play="(e: Event) => onPlayWork(w.work.item_id, e)"
          />
          <ClassicalRowActions
            :name="w.work.name"
            :source-item="tracksByWork[w.work.item_id]?.[0]"
            :favorite="
              tracksByWork[w.work.item_id]?.length
                ? allLiked(tracksByWork[w.work.item_id])
                : undefined
            "
            @toggle-favorite="toggleWorkFavorite(w.work.item_id)"
            @menu="(e: Event) => onMenuWork(w, e)"
          />
        </li>
      </ul>
      <ClassicalEmpty v-else :filtered="works.length > 0" />
    </ClassicalSection>

    <OtherTracksSection
      v-if="!loading"
      :tracks="otherTracks"
      @play-track="onPlayOtherTrack"
      @menu-track="onMenuOtherTrack"
    />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import { useHoldToOpenMenu } from "@/composables/useHoldToOpenMenu";
import { normalizeForFilter } from "@/helpers/utils";
import type {
  Artist,
  ClassicalWorkEntry,
  Recording,
  Track,
} from "@/plugins/api/interfaces";
import {
  getClassicalArtist,
  getOtherTracks,
  getPerformerRecordings,
  getPerformerWorks,
} from "@/services/classical";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import {
  navigateOnRowClick,
  useArtistPageMenu,
} from "@/views/classical/listing";
import ClassicalEmpty from "@/views/classical/components/ClassicalEmpty.vue";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalSection from "@/views/classical/components/ClassicalSection.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import WorksFilterInput from "@/views/classical/components/WorksFilterInput.vue";
import {
  allLiked,
  setTracksLiked,
  useOwnFavorites,
} from "@/views/classical/favorites";
import { recordingCountLabel, workCountLabel } from "@/views/classical/labels";
import { playTracks } from "@/views/classical/playback";
import { openOtherTrackMenu, openRecordingMenu } from "@/views/classical/menu";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "PerformerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

const artistItem = ref<Artist | undefined>();

useArtistPageMenu(artistItem, router);

const works = ref<ClassicalWorkEntry[]>([]);
const worksFilter = ref("");
const recordings = ref<Recording[]>([]);
const otherTracks = ref<Track[]>([]);
const loading = ref(true);

useOwnFavorites(() => recordings.value.flatMap((r) => r.tracks));

// This performer's recordings of each work, and all their tracks, by work id.
const recordingsByWork = computed(() => {
  const byWork: Record<string, Recording[]> = {};
  for (const r of recordings.value) (byWork[r.work.item_id] ??= []).push(r);
  return byWork;
});
const tracksByWork = computed(() => {
  const byWork: Record<string, Track[]> = {};
  for (const [workId, list] of Object.entries(recordingsByWork.value))
    byWork[workId] = list.flatMap((r) => r.tracks);
  return byWork;
});

// Title, catalog numbers and composer of each work, folded for the filter.
const searchableWorks = computed(() =>
  works.value.map((entry) => ({
    entry,
    haystack: normalizeForFilter(
      [
        entry.work.name,
        ...entry.work.catalog_numbers,
        ...entry.work.composers.map((c) => c.name),
      ].join(" "),
    ),
  })),
);

const filteredWorks = computed(() => {
  const q = normalizeForFilter(worksFilter.value.trim());
  if (!q) return works.value;
  return searchableWorks.value
    .filter((s) => s.haystack.includes(q))
    .map((s) => s.entry);
});

// Open the Work detail page with this performer pre-applied as the
// contextual filter so the recordings list defaults to ones they appear on.
const workLink = (workId: string) => ({
  path: `/classical/works/${workId}`,
  query: { filterByArtistId: props.id },
});

const toggleWorkFavorite = (workId: string) => {
  const tracks = tracksByWork.value[workId] ?? [];
  setTracksLiked(tracks, !allLiked(tracks));
};

const onPlayWork = (workId: string, evt: Event) => {
  playTracks(tracksByWork.value[workId] ?? [], evt);
};

// A "Works performed" row really points at this performer's recordings of
// the work, so reuse the recording menu rather than rolling a parallel work
// menu. It covers all of them, like the row's play and heart.
const onMenuWork = (w: ClassicalWorkEntry, evt: Event) => {
  const workRecordings = recordingsByWork.value[w.work.item_id] ?? [];
  if (!workRecordings.length) return;
  openRecordingMenu(
    workRecordings,
    { router, work: w.work, composer: w.work.composers[0] },
    evt,
  );
};

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event, w: ClassicalWorkEntry) => onMenuWork(w, evt),
);

const load = async (id: string) => {
  // the previous performer must not stay actionable under the new route
  artistItem.value = undefined;
  works.value = [];
  recordings.value = [];
  otherTracks.value = [];
  loading.value = true;
  worksFilter.value = "";
  try {
    const [artist, entries, performed, tracks] = await Promise.all([
      getClassicalArtist(id),
      getPerformerWorks(id),
      // without them the rows show no play, heart or menu
      getPerformerRecordings(id).catch(() => []),
      // without them the page still shows, minus its Other tracks
      getOtherTracks(id, false).catch(() => []),
    ]);
    // a newer load has taken over the page
    if (id !== props.id) return;
    works.value = entries;
    recordings.value = performed;
    otherTracks.value = tracks;
    artistItem.value = artist;
  } catch {
    // an unknown id leaves the page on its placeholder, as the artist page does
    return;
  }
  loading.value = false;
};

const onPlayOtherTrack = (t: Track, evt: Event) => {
  playTracks([t], evt);
};

const onMenuOtherTrack = (t: Track, evt: Event) => {
  openOtherTrackMenu(t, router, evt);
};

watch(
  () => props.id,
  (id) => load(id),
  { immediate: true },
);
</script>

<style scoped>
.performer-works-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.performer-work-row {
  cursor: pointer;
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding: 0.5rem 0 0.5rem 7px;
  margin-left: -7px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.performer-work-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

.performer-work-link {
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
  flex: 1;
  min-width: 0;
}

.performer-work-composer {
  font-size: 0.8rem;
  color: var(--muted-foreground, #aaa);
}

/* Only the name is the link, so the underline marks just what is clicked. */
.performer-work-composer-link {
  align-self: flex-start;
  max-width: 100%;
  text-decoration: none;
}

.performer-work-composer-link:hover,
.performer-work-composer-link:focus-visible {
  text-decoration: underline;
}

.performer-work-title {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
}

.meta-recordings,
.performer-work-meta {
  color: var(--muted-foreground, #888);
  font-size: 0.875rem;
}

.meta-recordings {
  white-space: nowrap;
}

.performer-work-meta {
  font-variant-numeric: tabular-nums;
  margin-left: 0.4rem;
}
</style>
