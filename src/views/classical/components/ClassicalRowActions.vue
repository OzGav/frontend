<template>
  <!-- Now playing / source / favourite / menu affordances for a list row, matching
       the existing ListviewItem layout. Click handlers stop propagation so
       they don't trigger the row's primary action. -->
  <div class="row-actions">
    <NowPlayingBadge v-if="playing" :show-badge="getBreakpointValue('bp7')" />
    <span v-if="duration && !$vuetify.display.mobile" class="track-duration">
      {{ formatDuration(duration) }}
    </span>
    <ProviderIcon
      v-if="sourceItem && getBreakpointValue('bp2')"
      :domain="getListItemProviderIconDomain(sourceItem)"
      :size="24"
      class="mx-[10px]"
    />
    <div
      v-if="getBreakpointValue('bp3') && !$vuetify.display.mobile"
      class="favorite-button-wrapper"
    >
      <FavouriteButton v-if="favoriteItem" :item="favoriteItem" />
      <!-- a row of several tracks gets the same heart, liking or clearing them all -->
      <Button
        v-else-if="canEditLibrary && favorite !== undefined"
        type="button"
        variant="ghost-icon"
        size="icon-xs"
        class="opacity-70 hover:opacity-100 data-[active=true]:opacity-100"
        :data-active="favorite || undefined"
        :title="$t(favorite ? 'favorites_remove' : 'favorites_add')"
        :aria-label="$t(favorite ? 'favorites_remove' : 'favorites_add')"
        @click.stop.prevent="$emit('toggle-favorite')"
      >
        <Heart class="size-5.5" :fill="favorite ? 'currentColor' : 'none'" />
      </Button>
    </div>
    <MAButton
      variant="icon"
      icon="mdi-dots-vertical"
      :aria-label="name ? `${$t('more_options')}: ${name}` : $t('more_options')"
      @click.stop.prevent="(e: Event) => $emit('menu', e)"
    />
  </div>
</template>

<script setup lang="ts">
import MAButton from "@/components/Button.vue";
import FavouriteButton from "@/components/FavoriteButton.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import { Button } from "@/components/ui/button";
import type { FavoritableItem } from "@/helpers/favorites";
import { formatDuration } from "@/helpers/utils";
import { getListItemProviderIconDomain } from "@/plugins/api/helpers";
import {
  Scope,
  type ItemMapping,
  type MediaItemType,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { Heart } from "@lucide/vue";
import { computed } from "vue";

defineOptions({ name: "ClassicalRowActions" });

withDefaults(
  defineProps<{
    // the row's title, which names its menu button for screen readers
    name?: string;
    // the row's track is playing, marked as on the standard list rows
    playing?: boolean;
    // seconds, shown before the source icon as on the standard list rows
    duration?: number;
    // the item whose source icon shows, as on the standard list rows
    sourceItem?: MediaItemType | ItemMapping;
    // a single track, which gets the standard heart with its like menu
    favoriteItem?: FavoritableItem;
    // the liked state of a row standing for several tracks, left out when the
    // row has no tracks to like
    favorite?: boolean;
  }>(),
  {
    name: undefined,
    playing: false,
    duration: undefined,
    sourceItem: undefined,
    favoriteItem: undefined,
    favorite: undefined,
  },
);

// as the standard heart, only for those who may change the library
const canEditLibrary = computed(() =>
  authManager.hasScope(Scope.LIBRARY_WRITE),
);

defineEmits<{
  (e: "toggle-favorite"): void;
  (e: "menu", evt: Event): void;
}>();
</script>

<style scoped>
/* as the standard list rows space their duration */
.track-duration {
  font-size: 0.875rem;
  opacity: 0.7;
  margin-left: 16px;
  margin-right: 12px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.favorite-button-wrapper {
  margin-inline: 10px;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
}
</style>
