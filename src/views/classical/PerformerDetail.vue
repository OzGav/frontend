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
      :count="works.length"
      color="transparent"
    />
    <v-divider />

    <ul v-if="works.length" class="performer-works-list">
      <li
        v-for="w in works"
        :key="w.work.item_id"
        class="performer-work-row"
        @contextmenu.prevent="onMenuWork(w, $event)"
      >
        <router-link :to="workLink(w.work.item_id)" class="performer-work-link">
          <span class="performer-work-composer">
            {{ w.work.composers[0]?.name }}
          </span>
          <span class="performer-work-title">
            {{ w.work.name }}
            <span v-if="w.work.catalog_numbers[0]" class="performer-work-meta">
              [{{ w.work.catalog_numbers[0] }}]
            </span>
          </span>
        </router-link>
        <span class="meta-recordings">
          {{ w.recording_count }}
          {{
            w.recording_count === 1
              ? $t("classical_recording")
              : $t("classical_recordings_lower")
          }}
        </span>
        <ClassicalRowActions
          :favorite="allLiked(workTracks(w.work.item_id))"
          @toggle-favorite="toggleWorkFavorite(w.work.item_id)"
          @play="onPlayWork(w.work.item_id)"
          @menu="(e: Event) => onMenuWork(w, e)"
        />
      </li>
    </ul>
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
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
import { openOtherTrackMenu, openRecordingMenu } from "@/views/classical/menu";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "PerformerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

const artistItem = ref<Artist | undefined>();
const works = ref<ClassicalWorkEntry[]>([]);
// This performer's recordings of each work, by work id.
const recordingsByWork = ref<Record<string, Recording[]>>({});
const otherTracks = ref<Track[]>([]);
const loading = ref(true);

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
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.performer-work-row:last-child {
  border-bottom: 0;
}

.performer-work-link {
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
  flex: 1;
  min-width: 0;
}

.performer-work-link:hover .performer-work-title {
  text-decoration: underline;
}

.performer-work-composer {
  font-size: 0.8rem;
  color: var(--muted-foreground, #aaa);
}

.performer-work-title {
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
