<template>
  <article class="recording-card" :class="{ expanded }">
    <div
      class="recording-header-row"
      @contextmenu.prevent="$emit('menu-recording', recording, $event)"
    >
      <!-- Not a <button>, as the credited names inside are links. -->
      <div
        role="button"
        tabindex="0"
        class="recording-header"
        :aria-expanded="expanded"
        @click="toggle"
        @keydown.enter.self.prevent="toggle"
        @keydown.space.self.prevent="toggle"
      >
        <ChevronRight class="chevron" :class="{ rotated: expanded }" />
        <div class="recording-title">
          <div class="recording-credits">
            <span v-if="conductors.length" class="conductor">
              <CreditLinks :artists="conductors" separator=", " />
            </span>
            <span v-if="conductors.length && orchestras.length"> / </span>
            <span v-if="orchestras.length" class="orchestra">
              <CreditLinks :artists="orchestras" separator=", " />
            </span>
            <span v-if="leadPerformers.length" class="performers">
              <CreditLinks :artists="leadPerformers" separator=", " />
            </span>
            <span v-if="recording.year" class="year">
              ({{ recording.year }})
            </span>
            <span class="duration-inline">
              [{{ formatDuration(recording.duration) }}]
            </span>
          </div>
          <span
            v-if="performers.length && !leadPerformers.length"
            class="performer-credits"
          >
            <CreditLinks :artists="performers" separator=" · " />
          </span>
        </div>
      </div>
      <ClassicalRowActions
        :in-library="true"
        :favorite="favorite"
        @toggle-favorite="setTracksLiked(recording.tracks, !favorite)"
        @play="$emit('play-recording', recording)"
        @menu="(e: Event) => $emit('menu-recording', recording, e)"
      />
    </div>
    <div v-if="expanded" class="recording-body">
      <ol class="movements">
        <li
          v-for="m in recording.tracks"
          :key="m.item_id"
          class="movement"
          @contextmenu.prevent.stop="
            $emit('menu-movement', m, recording, $event)
          "
        >
          <button
            type="button"
            class="movement-play"
            :title="$t('play')"
            @click="$emit('play-movement', m)"
          >
            <span class="movement-title">{{ m.movement_name || m.name }}</span>
            <span class="duration-inline">
              [{{ formatDuration(m.duration) }}]
            </span>
          </button>
          <ClassicalRowActions
            :in-library="true"
            :favorite="m.favorite === true"
            @toggle-favorite="setTracksLiked([m], m.favorite !== true)"
            @play="$emit('play-movement', m)"
            @menu="(e: Event) => $emit('menu-movement', m, recording, e)"
          />
        </li>
      </ol>
      <div
        v-for="album in recording.albums"
        :key="album.item_id"
        class="source-album"
      >
        <span class="source-album-arrow">→</span>
        <router-link :to="`/albums/library/${album.item_id}`">
          {{ album.year ? `${album.name} (${album.year})` : album.name }}
        </router-link>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { formatDuration } from "@/helpers/utils";
import {
  ArtistRole,
  type Recording,
  type Track,
} from "@/plugins/api/interfaces";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import CreditLinks from "@/views/classical/components/CreditLinks.vue";
import { creditedArtists } from "@/views/classical/credits";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
import { ChevronRight } from "@lucide/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkRecordingCard" });

const props = defineProps<{
  recording: Recording;
}>();

defineEmits<{
  (e: "play-recording", recording: Recording): void;
  (e: "play-movement", movement: Track): void;
  (e: "menu-recording", recording: Recording, evt: Event): void;
  (e: "menu-movement", movement: Track, recording: Recording, evt: Event): void;
}>();

const expanded = ref(false);

const toggle = () => {
  expanded.value = !expanded.value;
};

// Recording is favourited only when every member movement is. Partial state
// renders as unfavourited.
const favorite = computed(() => allLiked(props.recording.tracks));

const conductors = computed(() =>
  creditedArtists(props.recording.credits, [ArtistRole.CONDUCTOR]),
);

const orchestras = computed(() =>
  creditedArtists(props.recording.credits, [ArtistRole.ORCHESTRA]),
);

const PERFORMING_ROLES = [
  ArtistRole.ENSEMBLE,
  ArtistRole.CHOIR,
  ArtistRole.SOLOIST,
  ArtistRole.PERFORMER,
];

// Ensembles, choirs, soloists and other performers, below the header line.
const performers = computed(() =>
  creditedArtists(props.recording.credits, PERFORMING_ROLES),
);

// Without a conductor or orchestra the performers lead the header instead,
// each with their instrument.
const leadPerformers = computed(() =>
  conductors.value.length || orchestras.value.length
    ? []
    : creditedArtists(props.recording.credits, PERFORMING_ROLES, true),
);
</script>

<style scoped>
.recording-card:not(:last-child) {
  border-bottom: 1px solid var(--border, #2a2a2a);
}

.recording-header-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.recording-header {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.25rem 0.7rem 0;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.recording-header:hover {
  background: var(--muted, rgba(255, 255, 255, 0.04));
}

.chevron {
  width: 1.1rem;
  height: 1.1rem;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.chevron.rotated {
  transform: rotate(90deg);
}

.recording-title {
  flex: 1;
  min-width: 0;
}

.recording-credits {
  font-weight: 600;
  font-size: 0.95rem;
}

.year {
  color: var(--muted-foreground, #888);
  font-weight: 400;
  margin-left: 0.25rem;
}

.duration-inline {
  color: var(--muted-foreground, #888);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  margin-left: 0.4rem;
}

.performer-credits {
  display: block;
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--muted-foreground, #888);
  margin-top: 0.1rem;
}

.recording-body {
  padding: 0 0 0.8rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.movements {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.movement {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.movement-play {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0.25rem 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 0;
}

.movement-play:hover .movement-title {
  text-decoration: underline;
}

.movement-title {
  font-family: var(
    --font-classical-serif,
    "Roboto Serif",
    ui-serif,
    Georgia,
    serif
  );
  font-optical-sizing: auto;
  font-style: italic;
  font-size: 0.95rem;
}

.source-album {
  font-size: 0.85rem;
  color: var(--muted-foreground, #888);
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.source-album-arrow {
  opacity: 0.6;
}
</style>
