<template>
  <section>
    <ClassicalHero :item="artist" section="performers" show-favorite />
    <DetailTextRow
      v-if="artist?.metadata.description"
      :text="artist.metadata.description"
      :dialog-title="artist.name"
      markdown
    />
    <WorksSection
      v-slot="{ filtered }"
      :title="$t('works_performed')"
      :works="works"
      :loading="loading"
      :artist-id="id"
    >
      <ClassicalPlayRow
        v-for="w in filtered"
        :key="w.work.item_id"
        tag="li"
        class="flex cursor-pointer items-center gap-[0.5rem] py-[0.5rem]"
        :label="`${$t('play')} ${w.work.name}`"
        :disabled="!w.recording_count"
        @click="navigateOnRowClick($event, router, workLink(w.work.item_id))"
        @menu="(e: Event) => onMenuWork(w, e)"
        @play="(e: Event) => onPlayWork(w, e)"
      >
        <div class="flex min-w-0 flex-1 flex-col text-inherit no-underline">
          <!-- Only the name is the link, so the underline marks just what is
               clicked. -->
          <router-link
            v-if="w.work.composers[0]"
            :to="`/classical/composers/${w.work.composers[0].item_id}`"
            class="max-w-full self-start text-[0.8rem] text-muted-foreground no-underline [&:focus-visible]:underline [&:hover]:underline"
          >
            {{ w.work.composers[0].name }}
          </router-link>
          <router-link
            :to="workLink(w.work.item_id)"
            class="text-[0.95rem] font-semibold text-inherit no-underline"
          >
            {{ w.work.name }}
            <span
              v-if="w.work.catalog_numbers[0]"
              class="ml-[0.4rem] text-[0.875rem] text-muted-foreground tabular-nums"
            >
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
            v-if="w.co_performers?.length"
            class="text-[0.8rem] text-muted-foreground"
          >
            {{ coPerformersLabel(w.co_performers) }}
          </span>
        </div>
        <span class="text-[0.875rem] whitespace-nowrap text-muted-foreground">
          {{ recordingCountLabel(w.recording_count) }}
        </span>
        <template #actions>
          <ClassicalRowActions
            :name="w.work.name"
            :favorite="w.liked ?? undefined"
            @toggle-favorite="toggleWorkFavorite(w)"
            @menu="(e: Event) => onMenuWork(w, e)"
          />
        </template>
      </ClassicalPlayRow>
    </WorksSection>

    <OtherTracksSection :artist-id="id" />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import { subscribeOwnFavorites } from "@/helpers/favorites";
import {
  MediaType,
  type ClassicalWorkEntry,
  type Recording,
} from "@/plugins/api/interfaces";
import {
  getArtistWorks,
  getPerformerWorkRecordings,
} from "@/services/classical";
import { useClassicalArtistPage } from "@/views/classical/artistPage";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import { navigateOnRowClick } from "@/views/classical/rowClick";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import WorksSection from "@/views/classical/components/WorksSection.vue";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
import { recordingCountLabel } from "@/views/classical/labels";
import { playRecording } from "@/views/classical/playback";
import { openRecordingMenu } from "@/views/classical/menu";
import { $t } from "@/plugins/i18n";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "PerformerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

// co-performers named on a work row before the rest are counted
const CO_PERFORMERS_SHOWN = 3;
// how long the user's own likes and unlikes are left to settle before the
// works' hearts are read again
const LIKES_SETTLE_MS = 1000;

const { artist, works, loading } = useClassicalArtistPage(
  () => props.id,
  "performer",
);

// A like or unlike of a track may change a work's heart, so the hearts are
// read again once the user's changes settle.
const refreshLikes = useDebounceFn(async () => {
  const id = props.id;
  const entries = await getArtistWorks("performer", id).catch(() => undefined);
  if (entries && id === props.id) works.value = entries;
}, LIKES_SETTLE_MS);
onBeforeUnmount(
  subscribeOwnFavorites((update) => {
    if (update.media_type === MediaType.TRACK && !loading.value)
      void refreshLikes();
  }),
);

// e.g. with Wiener Philharmoniker, Mirella Freni, Luciano Pavarotti +2
const coPerformersLabel = (names: string[]) =>
  names.length > CO_PERFORMERS_SHOWN
    ? $t("classical_with_performers_more", {
        names: names.slice(0, CO_PERFORMERS_SHOWN).join(", "),
        count: names.length - CO_PERFORMERS_SHOWN,
      })
    : $t("classical_with_performers", { names: names.join(", ") });

// Open the Work detail page with this performer pre-applied as the
// contextual filter so the recordings list defaults to ones they appear on.
const workLink = (workId: string) => ({
  path: `/classical/works/${workId}`,
  query: { filterByArtistId: props.id },
});

// This performer's recordings of a work, fetched when a row is acted on; none
// when that fails, which the api layer already reports.
const workRecordings = (w: ClassicalWorkEntry): Promise<Recording[]> =>
  getPerformerWorkRecordings(props.id, w.work.item_id).catch(() => []);

const toggleWorkFavorite = async (w: ClassicalWorkEntry) => {
  const previous = w.liked;
  w.liked = !previous;
  const tracks = (await workRecordings(w)).flatMap((r) => r.tracks);
  if (!tracks.length) {
    w.liked = previous;
    return;
  }
  await setTracksLiked(tracks, !previous);
  // tracks that did not save are back to their previous state
  w.liked = allLiked(tracks);
};

const onPlayWork = async (w: ClassicalWorkEntry, evt: Event) => {
  const tracks = (await workRecordings(w)).flatMap((r) => r.tracks);
  if (tracks.length) playRecording(tracks, evt);
};

// A "Works performed" row really points at this performer's recordings of
// the work, so reuse the recording menu rather than rolling a parallel work
// menu. It covers all of them, like the row's play and heart.
const onMenuWork = async (w: ClassicalWorkEntry, evt: Event) => {
  const recordings = await workRecordings(w);
  if (!recordings.length) return;
  openRecordingMenu(
    recordings,
    { router, work: w.work, composer: w.work.composers[0] },
    evt,
  );
};
</script>
