<template>
  <div v-if="loading && !items.length && viewMode === 'list'">
    <ListViewSkeleton v-for="n in 8" :key="n" />
  </div>
  <!-- The card's 8px padding sits outside the line the rest of the page uses. -->
  <ul
    v-else
    ref="gridEl"
    class="artist-grid m-[0_-8px] grid list-none p-0"
    :class="layout.grid"
    :style="gridStyle"
  >
    <template v-if="loading && !items.length">
      <li v-for="n in 12" :key="n">
        <PanelViewSkeleton />
      </li>
    </template>
    <template v-else>
      <!-- The standard panel card, padded with a hover tile. -->
      <li
        v-for="{ item, image } in rows"
        :key="item.id"
        v-hold="(e: TouchEvent) => onHold(e, item.artist)"
        class="flex min-w-0 cursor-pointer rounded-[8px] [transition:background_0.15s_ease]"
        :class="layout.card"
        @click.capture="swallowClickAfterHold"
        @click="navigateOnRowClick($event, router, item.link)"
        @contextmenu.prevent="openArtistMenu(item.artist, router, $event)"
        @touchstart.passive="onTouchStart"
      >
        <router-link
          :to="item.link"
          class="flex min-w-0 text-inherit no-underline"
          :class="layout.link"
          :aria-label="item.name"
        >
          <div class="relative block overflow-hidden" :class="layout.thumb">
            <img
              v-if="image"
              :src="image"
              :alt="item.name"
              loading="lazy"
              class="block size-full object-cover"
            />
            <!-- the standard banner artwork, kept quiet in grey -->
            <div
              v-else
              class="size-full [filter:grayscale(1)]"
              :style="{ background: bannerBackground }"
            >
              <!-- sized from the picture box, so it scales with the card -->
              <component
                :is="placeholderIcon"
                class="absolute inset-0 m-auto aspect-[1] h-[34%] w-auto text-[rgba(255,255,255,0.7)]"
                aria-hidden="true"
              />
            </div>
          </div>
          <div class="flex min-w-0 flex-col" :class="layout.meta">
            <div
              class="overflow-hidden text-[14px] text-ellipsis whitespace-nowrap"
              :class="layout.name"
            >
              {{ item.name }}
            </div>
            <template v-if="viewMode === 'list'">
              <div v-if="item.role || item.lines.length" :class="layout.sub">
                {{ [item.role, ...item.lines].filter(Boolean).join(" · ") }}
              </div>
            </template>
            <template v-else>
              <div v-if="item.role" :class="layout.sub">
                {{ item.role }}
              </div>
              <div v-for="line in item.lines" :key="line" :class="layout.sub">
                {{ line }}
              </div>
            </template>
          </div>
        </router-link>
        <!-- the actions row of the standard panel cards -->
        <div
          class="flex h-[32px] items-center gap-[10px]"
          :class="layout.actions"
          @click.stop
        >
          <FavouriteButton
            v-if="showHeart && canHoldFavorite(item.artist)"
            :item="item.artist"
          />
          <MAButton
            variant="list"
            icon="mdi-dots-vertical"
            class="ml-auto"
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

const layout = computed(() => LAYOUTS[props.viewMode]);

const SQUARE_MIN_WIDTH = 160;
// matches the grid gap
const GRID_GAP = 8;

/** The classes of a card's elements that differ between the views. */
interface CardLayout {
  grid: string;
  card: string;
  link: string;
  thumb: string;
  meta: string;
  name: string;
  sub: string;
  actions: string;
}

const SUB_CLASS =
  "overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[color:rgba(var(--v-theme-on-surface),0.6)]";

const PICTURE_LAYOUT: Omit<CardLayout, "thumb"> = {
  grid: "gap-[8px]",
  card: "flex-col p-[8px] max-[501px]:p-[4px] [&:hover]:bg-[color:rgba(var(--v-theme-on-surface),0.08)]",
  link: "flex-col",
  meta: "mt-[10px] max-[501px]:mt-[4px]",
  name: "font-semibold",
  sub: `${SUB_CLASS} mt-[2px] max-[501px]:mt-0`,
  actions: "mt-[8px]",
};

const PICTURE_THUMB_CLASS =
  "rounded-[8px] [box-shadow:0_2px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,255,255,0.04)]";

const LAYOUTS: Record<ClassicalViewMode, CardLayout> = {
  // fanart.tv background art proportions
  fanart: { ...PICTURE_LAYOUT, thumb: `aspect-[16/9] ${PICTURE_THUMB_CLASS}` },
  thumbs: { ...PICTURE_LAYOUT, thumb: `aspect-[1/1] ${PICTURE_THUMB_CLASS}` },
  // Multi-column list, laid out like an artist's top tracks.
  list: {
    grid: "auto-rows-[56px] grid-cols-[repeat(3,minmax(0,1fr))] gap-[0_16px] max-[769px]:m-0 max-[769px]:grid-cols-[minmax(0,1fr)]",
    card: "h-[56px] items-center gap-[12px] p-[0_8px] [&:hover]:bg-[color:rgba(var(--v-theme-on-surface),calc(var(--v-hover-opacity)*var(--v-theme-overlay-multiplier)))]",
    link: "flex-1 items-center gap-[12px]",
    thumb: "size-[40px] flex-none rounded-[6px]",
    meta: "flex-1",
    name: "font-medium",
    sub: SUB_CLASS,
    actions: "flex-none",
  },
};
</script>

<style scoped>
.artist-grid {
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--artist-card-min, 220px), 1fr)
  );
}
</style>
