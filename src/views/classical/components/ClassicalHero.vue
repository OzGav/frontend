<template>
  <DetailHero
    class="classical-hero"
    :class="{ 'classical-hero--phone': isPhone }"
    :item="item"
    :backdrop="backdrop"
    :editable-rows="false"
    :leading-menu-items="leadingMenuItems"
  >
    <template #toolbar-append>
      <ClassicalSectionLinks :current="section" />
      <DetailHeroFavorite v-if="favoriteItem" :item="favoriteItem" />
    </template>

    <template v-if="item" #main>
      <DetailHeroTitle :item="item" />

      <div v-if="$slots.meta" class="classical-hero__meta">
        <slot name="meta"></slot>
      </div>
    </template>

    <template v-if="item" #aside>
      <!-- on phones they would take a line of their own -->
      <DetailHeroProviders v-if="!isPhone" :item="item" />
    </template>
  </DetailHero>
</template>

<script setup lang="ts">
import DetailHero from "@/components/details/DetailHero.vue";
import DetailHeroFavorite from "@/components/details/DetailHeroFavorite.vue";
import DetailHeroProviders from "@/components/details/DetailHeroProviders.vue";
import DetailHeroTitle from "@/components/details/DetailHeroTitle.vue";
import { canHoldFavorite } from "@/helpers/favorites";
import type { ContextMenuItem } from "@/helpers/context_menu_item";
import { heroBackdrop } from "@/helpers/hero_backdrop";
import { MediaType, type Artist, type Work } from "@/plugins/api/interfaces";
import { isPhoneSizedScreen } from "@/plugins/breakpoint";
import ClassicalSectionLinks from "@/views/classical/components/ClassicalSectionLinks.vue";
import { artistShowInfoEntry } from "@/views/classical/menu";
import type { ClassicalTab } from "@/views/classical/tabs";
import { computed } from "vue";
import { useRouter } from "vue-router";

export interface Props {
  item?: Artist | Work;
  // the banner heart, as on the artist page; a work cannot be liked
  showFavorite?: boolean;
  // the Classical section the page belongs to, highlighted in the section links
  section?: ClassicalTab;
}
const props = defineProps<Props>();

const router = useRouter();

// A composer or performer gets the artist page menu, led by Show info.
const artist = computed(() =>
  props.item?.media_type === MediaType.ARTIST
    ? (props.item as Artist)
    : undefined,
);

const leadingMenuItems = computed<ContextMenuItem[]>(() =>
  artist.value ? [artistShowInfoEntry(artist.value, router)] : [],
);

const isPhone = computed(() => isPhoneSizedScreen());

const favoriteItem = computed(() =>
  props.showFavorite && props.item && canHoldFavorite(props.item)
    ? props.item
    : undefined,
);

const backdrop = computed(() => heroBackdrop(props.item));
</script>

<style scoped>
.classical-hero__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: stretch;
  min-width: 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
}

.classical-hero--phone .classical-hero__meta {
  font-size: 14px;
}
</style>
