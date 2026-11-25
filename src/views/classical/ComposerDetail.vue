<template>
  <section ref="pageRoot">
    <ClassicalHero
      :item="artist"
      section="composers"
      show-favorite
      editable-rows
      @edit-rows="rowsEditorOpen = true"
    >
      <template v-if="heroMeta" #meta>{{ heroMeta }}</template>
    </ClassicalHero>
    <template v-for="rowId in visibleRows" :key="rowId">
      <DetailTextRow
        v-if="rowId === 'description' && artist?.metadata.description"
        :text="artist.metadata.description"
        :dialog-title="artist.name"
        markdown
        @edit-rows="rowsEditorOpen = true"
      />
      <WorksSection
        v-else-if="rowId === 'works'"
        v-slot="{ filtered }"
        :title="$t('works')"
        :works="works"
        :loading="loading"
        :artist-id="id"
        @edit-rows="rowsEditorOpen = true"
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
      <OtherTracksSection
        v-else-if="rowId === 'other_tracks'"
        :artist-id="id"
        as-composer
        @edit-rows="rowsEditorOpen = true"
      />
    </template>

    <RowsEditor
      v-if="artist"
      v-model:open="rowsEditorOpen"
      :item="artist"
      :registry="composerRows"
      :available-ids="availableRows"
      :subtitle="$t('edit_rows_subtitle_composer')"
      round-avatar
    />
  </section>
</template>

<script setup lang="ts">
import DetailTextRow from "@/components/details/DetailTextRow.vue";
import RowsEditor from "@/components/details/RowsEditor.vue";
import { useHistoryScrollRestore } from "@/composables/useHistoryScrollRestore";
import type { ClassicalWorkEntry } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { useClassicalArtistPage } from "@/views/classical/artistPage";
import {
  composerRows,
  useClassicalArtistRows,
} from "@/views/classical/artistRows";
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
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ComposerDetail" });

const props = defineProps<{ id: string }>();

const router = useRouter();

const pageRoot = ref<HTMLElement>();
useHistoryScrollRestore(pageRoot);

// the server lists a composer's works in catalogue order
const { artist, works, loading } = useClassicalArtistPage(
  () => props.id,
  "composer",
);

// e.g. Romantic · 1810 – 1849 · Poland
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

const { rowsEditorOpen, availableRows, visibleRows } = useClassicalArtistRows(
  artist,
  composerRows,
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
