<template>
  <section>
    <ClassicalHero :item="artistItem" section="composers" show-favorite>
      <template v-if="heroMeta" #meta>{{ heroMeta }}</template>
    </ClassicalHero>
    <DetailTextRow
      v-if="artistItem?.metadata.description"
      :text="artistItem.metadata.description"
      :dialog-title="artistItem.name"
      markdown
    />
    <WorksSection
      v-slot="{ filtered }"
      :title="$t('works')"
      :works="works"
      :loading="loading"
      :artist-id="id"
    >
      <ClassicalPlayRow
        v-for="w in filtered"
        :key="w.item_id"
        tag="li"
        class="composer-work-row"
        :label="`${$t('play')} ${w.name}`"
        @click="navigateOnRowClick($event, router, workLink(w.item_id))"
        @play="(e: Event) => playWork(w.item_id, e)"
      >
        <!-- the details on their own line, under the title -->
        <span class="composer-work-text">
          <router-link :to="workLink(w.item_id)" class="composer-work-link">
            {{ w.name }}
          </router-link>
          <span v-if="w.version" class="meta">{{ w.version }}</span>
          <span class="meta">
            {{ workDetails(w) }}
          </span>
        </span>
      </ClassicalPlayRow>
    </WorksSection>

    <OtherTracksSection
      :artist-id="id"
      as-composer
      @play-track="onPlayOtherTrack"
      @menu-track="onMenuOtherTrack"
    />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import { useDetailItemUpdates } from "@/composables/useDetailItemUpdates";
import type { Artist, Track, WorkType } from "@/plugins/api/interfaces";
import {
  getClassicalArtist,
  getComposer,
  getComposerWorks,
} from "@/services/classical";
import { normalizeForFilter } from "@/helpers/utils";
import { navigateOnRowClick } from "@/views/classical/listing";
import { useBackScroll } from "@/views/classical/backScroll";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import WorksSection from "@/views/classical/components/WorksSection.vue";
import { openOtherTrackMenu } from "@/views/classical/menu";
import {
  countryLabel,
  lifeYearsLabel,
  periodLabel,
  recordingCountLabel,
  workTypeLabel,
} from "@/views/classical/labels";
import { playWork, playTracks } from "@/views/classical/playback";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ComposerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

// Flattened to the fields the rows show and sort on.
interface WorkRow {
  item_id: string;
  name: string;
  // tells apart works sharing a title, e.g. 1888 version
  version: string;
  catalog_number: string;
  work_type?: WorkType | null;
  recording_count: number;
  // title, catalog numbers and part names, folded for the works filter
  haystack: string;
}

const artistItem = ref<Artist | undefined>();

useDetailItemUpdates(artistItem);

const country = ref<string | null>();

// e.g. Romantic · 1810–1849 · Poland
const heroMeta = computed(() =>
  [
    artistItem.value?.period ? periodLabel(artistItem.value.period) : "",
    lifeYearsLabel(artistItem.value?.metadata.life_span),
    country.value ? countryLabel(country.value) : "",
  ]
    .filter(Boolean)
    .join(" · "),
);

const works = ref<WorkRow[]>([]);
const loading = ref(true);
useBackScroll(() => loading.value);
const workLink = (workId: string) => `/classical/works/${workId}`;

// e.g. op. 27 no. 2 · Sonata · 3 recordings
const workDetails = (w: WorkRow) =>
  [
    w.catalog_number,
    w.work_type && workTypeLabel(w.work_type),
    recordingCountLabel(w.recording_count),
  ]
    .filter(Boolean)
    .join(" · ");

const load = async (id: string) => {
  // the previous composer must not stay actionable under the new route
  artistItem.value = undefined;
  country.value = undefined;
  works.value = [];
  loading.value = true;
  try {
    const [artist, list, composer] = await Promise.all([
      getClassicalArtist(id),
      getComposerWorks(id),
      // only the header's country needs it
      getComposer(id).catch(() => undefined),
    ]);
    // a newer load has taken over the page
    if (id !== props.id) return;
    // Sort by catalog number so Op./BWV/K. order is preserved; empty catalogs last.
    works.value = list
      .map(({ work, recording_count, part_names }) => ({
        item_id: work.item_id,
        name: work.name,
        version: work.version,
        catalog_number: work.catalog_numbers[0] ?? "",
        work_type: work.work_type,
        recording_count,
        haystack: normalizeForFilter(
          [work.name, ...work.catalog_numbers, ...(part_names ?? [])].join(" "),
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
    artistItem.value = artist;
    country.value = composer?.country;
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
.composer-work-row {
  padding-block: 0.5rem;
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
  flex-direction: column;
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
