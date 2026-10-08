<template>
  <section v-if="artistItem">
    <ClassicalHero :item="artistItem" />
    <DetailTextRow
      v-if="artistItem.metadata.description"
      :text="artistItem.metadata.description"
      :dialog-title="artistItem.name"
      markdown
    />
    <Toolbar
      :title="$t('works_performed')"
      :count="filteredWorks.length"
      color="transparent"
    >
      <template v-if="works.length" #append>
        <WorksFilterInput v-model="worksFilter" />
      </template>
    </Toolbar>
    <v-divider />

    <ul v-if="filteredWorks.length" class="performer-works-list">
      <li
        v-for="w in filteredWorks"
        :key="w.work.item_id"
        class="performer-work-row classical-play-row"
        @contextmenu.prevent="onMenuWork(w, $event)"
      >
        <RowPlayButton
          side="start"
          :label="`${$t('play')} ${w.work.name}`"
          @play="onPlayWork(w.work.item_id)"
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
            <span v-if="w.work.catalog_numbers[0]" class="performer-work-meta">
              [{{ w.work.catalog_numbers[0] }}]
            </span>
          </router-link>
        </div>
        <span class="meta-recordings">
          {{ w.recording_count }}
          {{
            w.recording_count === 1
              ? $t("classical_recording")
              : $t("classical_recordings_lower")
          }}
        </span>
        <RowPlayButton
          side="end"
          :label="`${$t('play')} ${w.work.name}`"
          @play="onPlayWork(w.work.item_id)"
        />
        <ClassicalRowActions
          :source-item="workTracks(w.work.item_id)[0]"
          :favorite="allLiked(workTracks(w.work.item_id))"
          @toggle-favorite="toggleWorkFavorite(w.work.item_id)"
          @menu="(e: Event) => onMenuWork(w, e)"
        />
      </li>
    </ul>
    <p v-else-if="works.length" class="performer-works-empty">
      {{ $t("classical_no_works_match") }}
    </p>
    <p v-else class="performer-works-empty">
      {{ $t("classical_no_works_for_performer") }}
    </p>

    <OtherTracksSection
      :tracks="otherTracks"
      @play-track="onPlayOtherTrack"
      @menu-track="onMenuOtherTrack"
    />
  </section>
  <section v-else-if="!loading" class="performer-not-found">
    <p>{{ $t("classical_performer_not_found") }}</p>
    <router-link to="/classical/performers">
      {{ $t("classical_back_to_performers") }}
    </router-link>
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import Toolbar from "@/components/Toolbar.vue";
import { normalizeForFilter } from "@/helpers/utils";
import api from "@/plugins/api";
import type {
  Artist,
  ClassicalWorkEntry,
  Recording,
  Track,
} from "@/plugins/api/interfaces";
import {
  getClassicalArtist,
  getOtherTracks,
  getPerformerWorks,
  getWorkRecordings,
} from "@/services/classical";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import { useArtistPageMenu } from "@/views/classical/listing";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import WorksFilterInput from "@/views/classical/components/WorksFilterInput.vue";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
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
// This performer's recordings of each work, by work id.
const recordingsByWork = ref<Record<string, Recording[]>>({});
const otherTracks = ref<Track[]>([]);
const loading = ref(true);

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

const workTracks = (workId: string): Track[] =>
  (recordingsByWork.value[workId] ?? []).flatMap((r) => r.tracks);

const toggleWorkFavorite = (workId: string) => {
  const tracks = workTracks(workId);
  setTracksLiked(tracks, !allLiked(tracks));
};

const onPlayWork = (workId: string) => {
  const tracks = workTracks(workId);
  if (tracks.length) api.playMedia(tracks.map((t) => t.uri));
};

// A "Works performed" row really points at this performer's recordings of
// the work, so reuse the recording menu rather than rolling a parallel work
// menu. It covers all of them, like the row's play and heart.
const onMenuWork = (w: ClassicalWorkEntry, evt: Event) => {
  const recordings = recordingsByWork.value[w.work.item_id] ?? [];
  if (!recordings.length) return;
  openRecordingMenu(
    recordings,
    { router, work: w.work, composer: w.work.composers[0] },
    evt,
  );
};

const load = async (id: string) => {
  loading.value = true;
  worksFilter.value = "";
  try {
    const [artist, entries, tracks] = await Promise.all([
      getClassicalArtist(id),
      getPerformerWorks(id),
      getOtherTracks(id, false),
    ]);
    // a newer load has taken over the page
    if (id !== props.id) return;
    recordingsByWork.value = {};
    works.value = entries;
    otherTracks.value = tracks;
    artistItem.value = artist;
    // Row hearts and play fill in as each work's recordings arrive.
    for (const e of entries) loadWorkRecordings(id, e.work.item_id);
  } catch {
    if (id !== props.id) return;
    // an unknown id leaves the page on its not-found message
    artistItem.value = undefined;
  }
  loading.value = false;
};

const loadWorkRecordings = async (id: string, workId: string) => {
  try {
    const recordings = await getWorkRecordings(workId, id);
    if (id === props.id) recordingsByWork.value[workId] = recordings;
  } catch {
    // the row's heart and play stay without recordings to act on
  }
};

const onPlayOtherTrack = (t: Track) => {
  api.playMedia(t.uri);
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
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
}

.performer-work-row {
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

.meta,
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

.performer-works-empty,
.performer-not-found {
  padding: 1rem;
}
</style>
