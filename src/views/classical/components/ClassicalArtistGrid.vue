<template>
  <ul
    ref="gridEl"
    class="artist-grid"
    :class="`artist-grid--${viewMode}`"
    :style="gridStyle"
  >
    <li
      v-for="item in items"
      :key="item.id"
      v-hold="(e: TouchEvent) => onHold(e, item.artist)"
      class="artist-card"
      @click.capture="swallowClickAfterHold"
      @contextmenu.prevent="openArtistMenu(item.artist, router, $event)"
      @touchstart.passive="onTouchStart"
    >
      <router-link
        :to="item.link"
        class="artist-card-link"
        :aria-label="item.name"
      >
        <div class="artist-thumb">
          <img
            v-if="image(item)"
            :src="image(item)"
            :alt="item.name"
            loading="lazy"
          />
          <div v-else class="artist-thumb-placeholder">
            <span v-if="item.initials && viewMode !== 'list'">
              {{ item.initials }}
            </span>
          </div>
        </div>
        <div class="artist-meta">
          <div class="artist-name">{{ item.name }}</div>
          <template v-if="viewMode === 'list'">
            <div v-if="item.role || item.lines.length" class="artist-sub">
              {{ [item.role, ...item.lines].filter(Boolean).join(" · ") }}
            </div>
          </template>
          <template v-else>
            <div v-if="item.role" class="artist-sub artist-role">
              {{ item.role }}
            </div>
            <div v-for="line in item.lines" :key="line" class="artist-sub">
              {{ line }}
            </div>
          </template>
        </div>
      </router-link>
      <MAButton
        variant="list"
        icon="mdi-dots-vertical"
        class="artist-menu-btn"
        :aria-label="`${$t('more_options')}: ${item.name}`"
        @click.stop="openArtistMenu(item.artist, router, $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import MAButton from "@/components/Button.vue";
import { useHoldToOpenMenu } from "@/composables/useHoldToOpenMenu";
import { GRID_SIZE_DEFAULT } from "@/helpers/grid_size";
import type { Artist } from "@/plugins/api/interfaces";
import {
  classicalGridColumns,
  type ClassicalViewMode,
} from "@/views/classical/listing";
import { openArtistMenu } from "@/views/classical/menu";
import { useElementSize } from "@vueuse/core";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ClassicalArtistGrid" });

/** A composer or performer as the grid shows it. */
export interface ClassicalArtistGridItem {
  id: string;
  // the artist the item's menu acts on
  artist: Artist;
  name: string;
  link: string;
  wideImage?: string;
  squareImage?: string;
  // a performer's role, the first line below the name
  role?: string;
  // text below the name, one line each in the picture views
  lines: string[];
  // shown on the placeholder when there is no image
  initials?: string;
}

const props = withDefaults(
  defineProps<{
    items: ClassicalArtistGridItem[];
    viewMode: ClassicalViewMode;
    gridSize?: number;
    // narrowest wide card, in pixels
    minCardWidth: number;
  }>(),
  { gridSize: GRID_SIZE_DEFAULT },
);

const router = useRouter();
const gridEl = ref<HTMLElement | null>(null);
const { width } = useElementSize(gridEl);

const image = (item: ClassicalArtistGridItem) =>
  props.viewMode === "fanart" ? item.wideImage : item.squareImage;

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event, artist: Artist) => openArtistMenu(artist, router, evt),
);

// Until the grid is measured the stylesheet's auto-fill columns apply.
const gridStyle = computed(() => {
  if (props.viewMode === "list") return undefined;
  const minWidth =
    props.viewMode === "thumbs" ? SQUARE_MIN_WIDTH : props.minCardWidth;
  const style = { "--artist-card-min": `${minWidth}px` };
  if (!width.value) return style;
  const columns = classicalGridColumns(
    width.value,
    minWidth,
    GRID_GAP,
    props.gridSize,
  );
  return {
    ...style,
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };
});

const SQUARE_MIN_WIDTH = 160;
// matches the 1rem grid gap
const GRID_GAP = 16;
</script>

<style scoped>
.artist-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--artist-card-min, 220px), 1fr)
  );
  gap: 1rem;
}

.artist-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: transform 0.15s ease;
}

.artist-card:hover,
.artist-card:focus-within {
  transform: translateY(-2px);
}

/* Bottom right of the card, beside the name and its lines. */
.artist-menu-btn {
  position: absolute;
  right: 0;
  bottom: 0;
}

.artist-card-link {
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
}

.artist-thumb {
  display: block;
  /* fanart.tv background art proportions */
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  background: var(--muted, #2a2a2a);
}

.artist-grid--thumbs .artist-thumb {
  aspect-ratio: 1 / 1;
}

.artist-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.artist-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--muted-foreground, #888);
  background: linear-gradient(135deg, #4a4a4a, #1a1a1a);
}

.artist-meta {
  margin-top: 0.5rem;
  /* room for the menu button */
  padding-right: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.artist-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.artist-sub {
  color: var(--muted-foreground, #888);
  font-size: 0.8125rem;
}

.artist-role {
  text-transform: capitalize;
}

/* Multi-column list, laid out like an artist's top tracks. */
.artist-grid--list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 56px;
  gap: 0 16px;
  margin-left: -8px;
}

.artist-grid--list .artist-card {
  transition: none;
}

.artist-grid--list .artist-card:hover,
.artist-grid--list .artist-card:focus-within {
  transform: none;
}

.artist-grid--list .artist-card-link {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 8px;
  border-radius: 8px;
}

.artist-grid--list .artist-card-link:hover,
.artist-grid--list .artist-card-link:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.artist-grid--list .artist-thumb {
  width: 40px;
  height: 40px;
  flex: none;
  aspect-ratio: auto;
  border-radius: 6px;
}

.artist-grid--list .artist-menu-btn {
  bottom: 8px;
}

.artist-grid--list .artist-meta {
  margin-top: 0;
  flex: 1;
  gap: 0;
}

.artist-grid--list .artist-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-grid--list .artist-sub {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .artist-grid--list {
    grid-template-columns: minmax(0, 1fr);
    margin-left: 0;
  }
}
</style>
