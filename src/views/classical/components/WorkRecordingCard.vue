<template>
  <article class="recording-card" :class="{ expanded }">
    <div
      v-hold="(e: TouchEvent) => onHold(e)"
      class="recording-header-row classical-play-row"
      @click.capture="swallowClickAfterHold"
      @contextmenu.prevent="$emit('menu-recording', recording, $event)"
      @touchstart.passive="onTouchStart"
    >
      <RowPlayButton
        side="start"
        :label="`${$t('play')} ${recordingName}`"
        @play="(e: Event) => $emit('play-recording', recording, e)"
      />
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
          </div>
          <span
            v-if="performers.length && !leadPerformers.length"
            class="performer-credits"
          >
            <CreditLinks :artists="performers" separator=" · " />
          </span>
        </div>
      </div>
      <RowPlayButton
        side="end"
        :label="`${$t('play')} ${recordingName}`"
        @play="(e: Event) => $emit('play-recording', recording, e)"
      />
      <ClassicalRowActions
        :name="recordingName"
        :duration="recording.duration"
        :source-item="recording.tracks[0]"
        :favorite="favorite"
        @toggle-favorite="setTracksLiked(recording.tracks, !favorite)"
        @menu="(e: Event) => $emit('menu-recording', recording, e)"
      />
    </div>
    <div v-if="expanded" class="recording-body">
      <ol class="movements">
        <li
          v-for="m in recording.tracks"
          :key="m.item_id"
          v-hold="(e: TouchEvent) => onHold(e, m)"
          class="movement classical-play-row"
          @click.capture="swallowClickAfterHold"
          @click="onMovementClick(m, $event)"
          @contextmenu.prevent.stop="
            $emit('menu-movement', m, recording, $event)
          "
          @touchstart.passive="onTouchStart"
        >
          <RowPlayButton
            side="start"
            :label="`${$t('play')} ${m.movement_name || m.name}`"
            @play="(e: Event) => $emit('play-movement', m, e)"
          />
          <button
            type="button"
            class="movement-play"
            @click="(e: MouseEvent) => openMovement(m, e)"
          >
            <span class="movement-title">{{ m.movement_name || m.name }}</span>
          </button>
          <RowPlayButton
            side="end"
            :label="`${$t('play')} ${m.movement_name || m.name}`"
            @play="(e: Event) => $emit('play-movement', m, e)"
          />
          <ClassicalRowActions
            :name="m.movement_name || m.name"
            :playing="isTrackPlaying(m)"
            :duration="m.duration"
            :source-item="m"
            :favorite-item="m"
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
import {
  getEventPosition,
  useHoldToOpenMenu,
} from "@/composables/useHoldToOpenMenu";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import {
  ArtistRole,
  type Recording,
  type Track,
} from "@/plugins/api/interfaces";
import ClassicalRowActions from "@/views/classical/components/ClassicalRowActions.vue";
import CreditLinks from "@/views/classical/components/CreditLinks.vue";
import RowPlayButton from "@/views/classical/components/RowPlayButton.vue";
import { isRowControlClick } from "@/views/classical/listing";
import { creditedArtists } from "@/views/classical/credits";
import { allLiked, setTracksLiked } from "@/views/classical/favorites";
import { isTrackPlaying } from "@/views/classical/playback";
import { ChevronRight } from "@lucide/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkRecordingCard" });

const props = defineProps<{
  recording: Recording;
}>();

const emit = defineEmits<{
  (e: "play-recording", recording: Recording, evt: Event): void;
  (e: "play-movement", movement: Track, evt: Event): void;
  (e: "menu-recording", recording: Recording, evt: Event): void;
  (e: "menu-movement", movement: Track, recording: Recording, evt: Event): void;
}>();

const expanded = ref(false);

// A long press opens the recording's menu, or a movement's when given one.
const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event, movement?: Track) => {
    if (movement) emit("menu-movement", movement, props.recording, evt);
    else emit("menu-recording", props.recording, evt);
  },
);

// A movement opens or plays the way a click on any track row does.
const openMovement = (track: Track, evt: MouseEvent) => {
  const { x, y } = getEventPosition(evt);
  handleMediaItemClick(track, x, y);
};

const onMovementClick = (track: Track, evt: MouseEvent) => {
  if (isRowControlClick(evt)) return;
  openMovement(track, evt);
};

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

// The names leading the header, which name its buttons for screen readers.
const recordingName = computed(
  () =>
    [...conductors.value, ...orchestras.value, ...leadPerformers.value]
      .map((a) => a.name)
      .join(", ") || props.recording.work.name,
);
</script>

<style scoped>
.recording-header-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding-left: 7px;
  margin-left: -7px;
  border-radius: 4px;
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

.recording-header-row:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
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

.performer-credits {
  display: block;
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--muted-foreground, #888);
  margin-top: 0.1rem;
}

.recording-card {
  /* the play slot in front of each row, absent on touch screens */
  --play-offset: calc(32px + 0.4rem);
}

@media (hover: none) {
  .recording-card {
    --play-offset: 0px;
  }
}

.recording-body {
  padding: 0 0 0.8rem;
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
  /* like the standard rows, the highlight starts 7px before the play slot */
  padding-left: 7px;
  margin-left: -7px;
  border-radius: 4px;
  cursor: pointer;
}

.movement-play {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: 0;
  /* movement titles sit indented under the recording's credits */
  padding: 0.25rem 0 0.25rem 2.5rem;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 0;
}

.movement:hover {
  /* matches the hover overlay of the standard list rows */
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
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
  margin-left: calc(var(--play-offset) + 2.5rem);
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
