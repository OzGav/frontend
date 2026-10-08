<template>
  <div v-if="loading && !items.length && viewMode === 'list'">
    <ListViewSkeleton v-for="n in 8" :key="n" />
  </div>
  <ul
    v-else
    ref="gridEl"
    class="artist-grid"
    :class="`artist-grid--${viewMode}`"
    :style="gridStyle"
  >
    <template v-if="loading && !items.length">
      <li v-for="n in 12" :key="n">
        <PanelViewSkeleton />
      </li>
    </template>
    <template v-else>
      <li
        v-for="{ item, image } in rows"
        :key="item.id"
        v-hold="(e: TouchEvent) => onHold(e, item.artist)"
        class="artist-card"
        @click.capture="swallowClickAfterHold"
        @click="navigateOnRowClick($event, router, item.link)"
        @contextmenu.prevent="openArtistMenu(item.artist, router, $event)"
        @touchstart.passive="onTouchStart"
      >
        <router-link
          :to="item.link"
          class="artist-card-link"
          :aria-label="item.name"
        >
          <div class="artist-thumb">
            <img v-if="image" :src="image" :alt="item.name" loading="lazy" />
            <div
              v-else
              class="artist-thumb-placeholder"
              :style="{ background: bannerBackground }"
            >
              <component
                :is="placeholderIcon"
                class="artist-placeholder-icon"
                aria-hidden="true"
              />
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
              <div v-if="item.role" class="artist-sub">
                {{ item.role }}
              </div>
              <div v-for="line in item.lines" :key="line" class="artist-sub">
                {{ line }}
              </div>
            </template>
          </div>
        </router-link>
        <!-- the actions row of the standard panel cards -->
        <div class="artist-actions" @click.stop>
          <FavouriteButton
            v-if="showHeart && canHoldFavorite(item.artist)"
            :item="item.artist"
          />
          <MAButton
            variant="list"
            icon="mdi-dots-vertical"
            class="artist-menu-btn"
            :aria-label="`${$t('more_options')}: ${item.name}`"
            @click.stop="openArtistMenu(item.artist, router, $event)"
          />
        </div>
      </li>
    </template>
  </ul>
</template>

<script setup lang="ts">
import MAButton from "@/components/Button.vue";
import { bannerBackground } from "@/components/discover/editorialArtwork";
import FavouriteButton from "@/components/FavoriteButton.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import PanelViewSkeleton from "@/components/skeletons/PanelViewSkeleton.vue";
import { useHoldToOpenMenu } from "@/composables/useHoldToOpenMenu";
import { canHoldFavorite } from "@/helpers/favorites";
import { GRID_SIZE_DEFAULT } from "@/helpers/grid_size";
import type { Artist } from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import {
  classicalGridColumns,
  navigateOnRowClick,
  type ClassicalViewMode,
} from "@/views/classical/listing";
import { openArtistMenu } from "@/views/classical/menu";
import { useElementSize } from "@vueuse/core";
import { computed, ref, type Component } from "vue";
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
  listImage?: string;
  // a performer's role, the first line below the name
  role?: string;
  // text below the name, one line each in the picture views
  lines: string[];
}

const props = withDefaults(
  defineProps<{
    items: ClassicalArtistGridItem[];
    viewMode: ClassicalViewMode;
    gridSize?: number;
    // narrowest wide card, in pixels
    minCardWidth: number;
    // shows placeholder cards until the first items arrive
    loading?: boolean;
    // drawn on the cards of artists without a picture
    placeholderIcon: Component;
  }>(),
  { gridSize: GRID_SIZE_DEFAULT, loading: false },
);

const router = useRouter();
const gridEl = ref<HTMLElement | null>(null);
const { width } = useElementSize(gridEl);

// The heart's own menu checks the permission, as on the standard panel cards.
const showHeart = computed(() => getBreakpointValue("bp3"));

// The image for the current view, picked once per item rather than per use.
const rows = computed(() =>
  props.items.map((item) => ({
    item,
    image:
      props.viewMode === "fanart"
        ? item.wideImage
        : props.viewMode === "thumbs"
          ? item.squareImage
          : item.listImage,
  })),
);

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
// matches the grid gap
const GRID_GAP = 8;
</script>

<style scoped>
/* The card's 8px padding sits outside the line the rest of the page uses. */
.artist-grid {
  list-style: none;
  margin: 0 -8px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--artist-card-min, 220px), 1fr)
  );
  gap: 8px;
}

/* The standard panel card, padded with a hover tile. */
.artist-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.artist-card:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.artist-card-link {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.artist-thumb {
  position: relative;
  display: block;
  /* fanart.tv background art proportions */
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
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
  /* the standard banner artwork, kept quiet in grey */
  filter: grayscale(1);
}

/* sized from the picture box, so it scales with the card */
.artist-placeholder-icon {
  position: absolute;
  inset: 0;
  margin: auto;
  height: 34%;
  width: auto;
  aspect-ratio: 1;
  color: rgba(255, 255, 255, 0.7);
}

.artist-meta {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.artist-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-sub {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.artist-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  height: 32px;
}

.artist-menu-btn {
  margin-left: auto;
}

@media (max-width: 500px) {
  .artist-card {
    padding: 4px;
  }
  .artist-meta {
    margin-top: 4px;
  }
  .artist-sub {
    margin-top: 0;
  }
}

/* Multi-column list, laid out like an artist's top tracks. */
.artist-grid--list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 56px;
  gap: 0 16px;
}

.artist-grid--list .artist-card {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 8px;
}

.artist-grid--list .artist-card:hover {
  background: rgba(
    var(--v-theme-on-surface),
    calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier))
  );
}

.artist-grid--list .artist-card-link {
  flex: 1;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.artist-grid--list .artist-thumb {
  width: 40px;
  height: 40px;
  flex: none;
  aspect-ratio: auto;
  border-radius: 6px;
  box-shadow: none;
}

.artist-grid--list .artist-meta {
  margin-top: 0;
  flex: 1;
}

.artist-grid--list .artist-name {
  font-weight: 500;
}

.artist-grid--list .artist-sub {
  margin-top: 0;
}

.artist-grid--list .artist-actions {
  margin-top: 0;
  flex: none;
}

@media (max-width: 768px) {
  .artist-grid--list {
    grid-template-columns: minmax(0, 1fr);
    margin: 0;
  }
}
</style>
