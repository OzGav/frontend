<template>
  <section>
    <ClassicalHero :item="artistItem" section="performers" show-favorite />
    <DetailTextRow
      v-if="artistItem?.metadata.description"
      :text="artistItem.metadata.description"
      :dialog-title="artistItem.name"
      markdown
    />
    <WorksSection
      v-slot="{ filtered }"
      :title="$t('works_performed')"
      :works="searchableWorks"
      :loading="loading"
      :artist-id="id"
    >
      <ClassicalPlayRow
        v-for="{ entry: w } in filtered"
        :key="w.work.item_id"
        tag="li"
        class="performer-work-row"
        :label="`${$t('play')} ${w.work.name}`"
        :disabled="!tracksByWork[w.work.item_id]?.length"
        @click="navigateOnRowClick($event, router, workLink(w.work.item_id))"
        @menu="(e: Event) => onMenuWork(w, e)"
        @play="(e: Event) => onPlayWork(w.work.item_id, e)"
      >
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
          <span
            v-if="w.work.version"
            class="text-[0.8rem] text-muted-foreground"
          >
            {{ w.work.version }}
          </span>
          <span
            v-if="coPerformers[w.work.item_id]?.length"
            class="performer-work-composer"
          >
            {{ coPerformersLabel(coPerformers[w.work.item_id]) }}
          </span>
        </div>
        <span class="meta-recordings">
          {{ recordingCountLabel(w.recording_count) }}
        </span>
        <template #actions>
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
        </template>
      </ClassicalPlayRow>
    </WorksSection>

    <OtherTracksSection
      :artist-id="id"
      @play-track="onPlayOtherTrack"
      @menu-track="onMenuOtherTrack"
    />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import { useDetailItemUpdates } from "@/composables/useDetailItemUpdates";
import { normalizeForFilter } from "@/helpers/utils";
import type {
  Artist,
  ClassicalWorkEntry,
  Recording,
  Track,
} from "@/plugins/api/interfaces";
import {
  getClassicalArtist,
  getPerformerRecordings,
  getPerformerWorks,
} from "@/services/classical";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import { navigateOnRowClick } from "@/views/classical/listing";
import { useBackScroll } from "@/views/classical/backScroll";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import WorksSection from "@/views/classical/components/WorksSection.vue";
import { coPerformerNames } from "@/views/classical/credits";
import {
  allLiked,
  setTracksLiked,
  useOwnFavorites,
} from "@/views/classical/favorites";
import { recordingCountLabel } from "@/views/classical/labels";
import { playTracks } from "@/views/classical/playback";
import { openOtherTrackMenu, openRecordingMenu } from "@/views/classical/menu";
import { $t } from "@/plugins/i18n";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "PerformerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

// co-performers named on a work row before the rest are counted
const CO_PERFORMERS_SHOWN = 3;

const artistItem = ref<Artist | undefined>();

useDetailItemUpdates(artistItem);

const works = ref<ClassicalWorkEntry[]>([]);
const recordings = ref<Recording[]>([]);
const loading = ref(true);
useBackScroll(() => loading.value);

useOwnFavorites(() => recordings.value.flatMap((r) => r.tracks));

// This performer's recordings of each work, and all their tracks, by work id.
// A part's recordings count towards its parent, the row the works list shows.
const recordingsByWork = computed(() => {
  const byWork: Record<string, Recording[]> = {};
  for (const r of recordings.value)
    (byWork[(r.parent_work ?? r.work).item_id] ??= []).push(r);
  return byWork;
});
const tracksByWork = computed(() => {
  const byWork: Record<string, Track[]> = {};
  for (const [workId, list] of Object.entries(recordingsByWork.value))
    byWork[workId] = list.flatMap((r) => r.tracks);
  return byWork;
});

// Everyone else on this performer's recordings of each work, by work id.
const coPerformers = computed(() => {
  const byWork: Record<string, string[]> = {};
  for (const [workId, list] of Object.entries(recordingsByWork.value))
    byWork[workId] = coPerformerNames(list, props.id);
  return byWork;
});

// e.g. with Wiener Philharmoniker, Mirella Freni, Luciano Pavarotti +2
const coPerformersLabel = (names: string[]) =>
  names.length > CO_PERFORMERS_SHOWN
    ? $t("classical_with_performers_more", {
        names: names.slice(0, CO_PERFORMERS_SHOWN).join(", "),
        count: names.length - CO_PERFORMERS_SHOWN,
      })
    : $t("classical_with_performers", { names: names.join(", ") });

// Title, catalog numbers, composer, part names and co-performers of each work,
// folded for the filter.
const searchableWorks = computed(() =>
  works.value.map((entry) => ({
    entry,
    work_type: entry.work.work_type,
    haystack: normalizeForFilter(
      [
        entry.work.name,
        ...entry.work.catalog_numbers,
        ...entry.work.composers.map((c) => c.name),
        ...(entry.part_names ?? []),
        ...(coPerformers.value[entry.work.item_id] ?? []),
      ].join(" "),
    ),
  })),
);

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

const load = async (id: string) => {
  // the previous performer must not stay actionable under the new route
  artistItem.value = undefined;
  works.value = [];
  recordings.value = [];
  loading.value = true;
  try {
    const [artist, entries, performed] = await Promise.all([
      getClassicalArtist(id),
      getPerformerWorks(id),
      // without them the rows show no play, heart or menu
      getPerformerRecordings(id).catch(() => []),
    ]);
    // a newer load has taken over the page
    if (id !== props.id) return;
    works.value = entries;
    recordings.value = performed;
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
.performer-work-row {
  cursor: pointer;
  padding-block: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
