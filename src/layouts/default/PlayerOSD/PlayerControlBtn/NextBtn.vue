<template>
  <!-- next button -->
  <ResponsiveIcon
    v-if="isVisible && player"
    v-bind="icon"
    :disabled="!queueHasNext && !playerHasNext"
    icon="mdi-skip-next-outline"
    :type="'btn'"
    @click="api.playerCommandNext(player.player_id)"
  />
</template>

<script setup lang="ts">
import api from "@/plugins/api";
import { Player, PlayerFeature, PlayerQueue } from "@/plugins/api/interfaces";
import ResponsiveIcon, {
  ResponsiveIconProps,
} from "@/components/mods/ResponsiveIcon.vue";
import { computed } from "vue";

// properties
export interface Props {
  player: Player | undefined;
  playerQueue?: PlayerQueue;
  isVisible?: boolean;
  icon?: ResponsiveIconProps;
}
const compProps = withDefaults(defineProps<Props>(), {
  playerQueue: undefined,
  isVisible: true,
  icon: undefined,
});

const queueHasNext = computed(() => {
  if (!compProps.playerQueue?.active) return false;
  return (
    (compProps.playerQueue.current_index || 0) < compProps.playerQueue.items - 1
  );
});
const playerHasNext = computed(() => {
  if (!compProps.player) return false;
  if (compProps.playerQueue?.active) return false;
  if (!compProps.player.current_media) return false;
  return compProps.player.supported_features.includes(
    PlayerFeature.NEXT_PREVIOUS,
  );
});
</script>
