<template>
  <section>
    <ClassicalHero :item="artist" section="composers" show-favorite>
      <template v-if="heroMeta" #meta>{{ heroMeta }}</template>
    </ClassicalHero>
    <DetailTextRow
      v-if="artist?.metadata.description"
      :text="artist.metadata.description"
      :dialog-title="artist.name"
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
        :key="w.work.item_id"
        tag="li"
        class="flex cursor-pointer items-center gap-[0.4rem] py-[0.5rem]"
        :label="`${$t('play')} ${w.work.name}`"
        @click="navigateOnRowClick($event, router, workLink(w.work.item_id))"
        @play="(e: Event) => playWork(w.work, e)"
      >
        <!-- the details on their own line, under the title; title and details
             keep a shared baseline, centred against the play slot -->
        <span class="flex min-w-0 flex-1 flex-col">
          <router-link
            :to="workLink(w.work.item_id)"
            class="font-semibold text-inherit no-underline"
          >
            {{ w.work.name }}
          </router-link>
          <span
            v-if="w.work.version"
            class="text-[0.875rem] text-muted-foreground"
            >{{ w.work.version }}</span
          >
          <span class="text-[0.875rem] text-muted-foreground">
            {{ workDetails(w) }}
          </span>
        </span>
      </ClassicalPlayRow>
    </WorksSection>

    <OtherTracksSection :artist-id="id" as-composer />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import type { ClassicalWorkEntry } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { useClassicalArtistPage } from "@/views/classical/artistPage";
import ClassicalHero from "@/views/classical/components/ClassicalHero.vue";
import ClassicalPlayRow from "@/views/classical/components/ClassicalPlayRow.vue";
import OtherTracksSection from "@/views/classical/components/OtherTracksSection.vue";
import WorksSection from "@/views/classical/components/WorksSection.vue";
import {
  countryLabel,
  lifeYearsLabel,
  periodLabel,
  recordingCountLabel,
  workTypeKey,
} from "@/views/classical/labels";
import { playWork } from "@/views/classical/playback";
import { navigateOnRowClick } from "@/views/classical/rowClick";
import { computed } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ComposerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

// the server lists a composer's works in catalogue order
const { artist, works, loading } = useClassicalArtistPage(
  () => props.id,
  "composer",
);

// e.g. Romantic · 1810–1849 · Poland
const heroMeta = computed(() =>
  [
    artist.value?.period ? periodLabel(artist.value.period) : "",
    lifeYearsLabel(artist.value?.metadata.life_span),
    artist.value?.metadata.country
      ? countryLabel(artist.value.metadata.country)
      : "",
  ]
    .filter(Boolean)
    .join(" · "),
);

const workLink = (workId: string) => `/classical/works/${workId}`;

// e.g. op. 27 no. 2 · Sonata · 3 recordings
const workDetails = ({ work, recording_count }: ClassicalWorkEntry) =>
  [
    work.catalog_numbers[0],
    work.work_type && $t(workTypeKey(work.work_type)),
    recordingCountLabel(recording_count),
  ]
    .filter(Boolean)
    .join(" · ");
</script>
