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
      :title="$t('works')"
      :meta="works.length ? workCountLabel(filteredWorks.length) : undefined"
    >
      <template v-if="works.length" #append>
        <WorksFilterInput v-model="worksFilter" />
      </template>
      <div v-if="loading">
        <ListViewSkeleton v-for="n in 4" :key="n" />
      </div>
      <ul v-else-if="filteredWorks.length" class="composer-works-list">
        <li
          v-for="w in filteredWorks"
          :key="w.item_id"
          class="composer-work-row classical-play-row"
          @click="navigateOnRowClick($event, router, workLink(w.item_id))"
        >
          <RowPlayButton
            side="start"
            :label="`${$t('play')} ${w.name}`"
            @play="(e: Event) => playFirstRecording(w.item_id, e)"
          />
          <span class="composer-work-text">
            <router-link :to="workLink(w.item_id)" class="composer-work-link">
              {{ w.name }}
            </router-link>
            <span v-if="w.catalog_number" class="meta"
              >· {{ w.catalog_number }}</span
            >
            <span v-if="w.work_type" class="meta">
              · {{ workTypeLabel(w.work_type) }}
            </span>
            <span class="meta"
              >· {{ recordingCountLabel(w.recording_count) }}</span
            >
          </span>
          <RowPlayButton
            side="end"
            :label="`${$t('play')} ${w.name}`"
            @play="(e: Event) => playFirstRecording(w.item_id, e)"
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
import type { Artist, Track, WorkType } from "@/plugins/api/interfaces";
import {
  getClassicalArtist,
  getComposerWorks,
  getOtherTracks,
} from "@/services/classical";
import { normalizeForFilter } from "@/helpers/utils";
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
import { openOtherTrackMenu } from "@/views/classical/menu";
import {
  recordingCountLabel,
  workCountLabel,
  workTypeLabel,
} from "@/views/classical/labels";
import { playFirstRecording, playTracks } from "@/views/classical/playback";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ComposerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

// Flattened to the fields the rows show and sort on.
interface WorkRow {
  item_id: string;
  name: string;
  catalog_number: string;
  work_type?: WorkType | null;
  recording_count: number;
  // title and catalog numbers, folded for the works filter
  haystack: string;
}

const artistItem = ref<Artist | undefined>();

useArtistPageMenu(artistItem, router);

const works = ref<WorkRow[]>([]);
const otherTracks = ref<Track[]>([]);
const loading = ref(true);
const worksFilter = ref("");

const filteredWorks = computed(() => {
  const q = normalizeForFilter(worksFilter.value.trim());
  return q ? works.value.filter((w) => w.haystack.includes(q)) : works.value;
});

const workLink = (workId: string) => `/classical/works/${workId}`;

const load = async (id: string) => {
  // the previous composer must not stay actionable under the new route
  artistItem.value = undefined;
  works.value = [];
  otherTracks.value = [];
  loading.value = true;
  worksFilter.value = "";
  try {
    const [artist, list, tracks] = await Promise.all([
      getClassicalArtist(id),
      getComposerWorks(id),
      // without them the page still shows, minus its Other tracks
      getOtherTracks(id, true).catch(() => []),
    ]);
    // a newer load has taken over the page
    if (id !== props.id) return;
    // Sort by catalog number so Op./BWV/K. order is preserved; empty catalogs last.
    works.value = list
      .map(({ work, recording_count }) => ({
        item_id: work.item_id,
        name: work.name,
        catalog_number: work.catalog_numbers[0] ?? "",
        work_type: work.work_type,
        recording_count,
        haystack: normalizeForFilter(
          [work.name, ...work.catalog_numbers].join(" "),
        ),
      }))
      .sort((a, b) => {
        const ac = a.catalog_number;
        const bc = b.catalog_number;
        if (!ac && !bc) return 0;
        if (!ac) return 1;
        if (!bc) return -1;
        return ac.localeCompare(bc, undefined, { numeric: true });
      });
    otherTracks.value = tracks;
    artistItem.value = artist;
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

const onPlayOtherTrack = (t: Track, evt: Event) => {
  playTracks([t], evt);
};

const onMenuOtherTrack = (t: Track, evt: Event) => {
  openOtherTrackMenu(t, router, evt);
};
</script>

<style scoped>
.composer-works-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.composer-work-row {
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding: 0.5rem 0 0.5rem 7px;
  margin-left: -7px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Title and details keep a shared baseline, centred against the play slot. */
.composer-work-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
}

.composer-work-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

.composer-work-link {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.meta {
  color: var(--muted-foreground, #888);
  font-size: 0.875rem;
}
</style>
