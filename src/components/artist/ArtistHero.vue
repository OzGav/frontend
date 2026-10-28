<template>
  <DetailHero
    class="artist-hero"
    :class="{ 'artist-hero--phone': isPhone }"
    :item="item"
    :backdrop="backdrop"
    :height="440"
    :phone-height="340"
    :leading-menu-items="classicalLinks"
    @edit-rows="emit('edit-rows')"
  >
    <template #toolbar-append>
      <DetailHeroFavorite v-if="item" :item="item" />
    </template>

    <template v-if="item" #main>
      <DetailHeroTitle :item="item" />

      <div class="artist-hero__actions">
        <DetailHeroPlayButton :item="item" />
        <DetailHeroButton
          :icon="Shuffle"
          :label="$t('shuffle')"
          :disabled="!store.activePlayer"
          @click="api.playMedia(item, undefined, { shuffle: true })"
        />
        <DetailHeroButton
          v-if="radioRelevant(item)"
          :icon="Orbit"
          :label="$t('artist_radio')"
          :disabled="!radioSupported(item)"
          @click="gotoRadio(item)"
        />
        <!-- outside the library the services listed beside already say where it is from -->
        <DetailHeroSourceBadge :item="item" library-only />
      </div>
    </template>

    <template v-if="item" #aside>
      <DetailHeroGenres :item="item" />
      <DetailHeroProviders :item="item" />
    </template>
  </DetailHero>
</template>

<script setup lang="ts">
import DetailHero from "@/components/details/DetailHero.vue";
import DetailHeroButton from "@/components/details/DetailHeroButton.vue";
import DetailHeroFavorite from "@/components/details/DetailHeroFavorite.vue";
import DetailHeroGenres from "@/components/details/DetailHeroGenres.vue";
import DetailHeroPlayButton from "@/components/details/DetailHeroPlayButton.vue";
import DetailHeroProviders from "@/components/details/DetailHeroProviders.vue";
import DetailHeroSourceBadge from "@/components/details/DetailHeroSourceBadge.vue";
import DetailHeroTitle from "@/components/details/DetailHeroTitle.vue";
import { heroBackdrop } from "@/helpers/hero_backdrop";
import { gotoRadio, radioRelevant, radioSupported } from "@/helpers/radio";
import { api } from "@/plugins/api";
import type { Artist } from "@/plugins/api/interfaces";
import { isPhoneSizedScreen } from "@/plugins/breakpoint";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { Orbit, Shuffle } from "@lucide/vue";
import { useClassicalArtistLinks } from "@/views/classical/artistLinks";
import { computed } from "vue";

export interface Props {
  item?: Artist;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "edit-rows"): void;
}>();

const isPhone = computed(() => isPhoneSizedScreen());

const classicalLinks = useClassicalArtistLinks(() => props.item);

const backdrop = computed(() => heroBackdrop(props.item));
</script>

<style scoped>
.artist-hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  /* the shared main column aligns its items to the start, so claim the full
     width here to give the shrinking play button room to work within */
  align-self: stretch;
  min-width: 0;
}

.artist-hero--phone .artist-hero__actions {
  gap: 10px;
}
</style>
