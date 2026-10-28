<template>
  <img
    v-if="logo"
    class="detail-hero-title__logo"
    :class="{ 'detail-hero-title__logo--phone': isPhone }"
    :src="logo"
    alt=""
  />
  <h1 :class="nameClass">{{ item.name }}</h1>
</template>

<script setup lang="ts">
import { getImageThumbForItem } from "@/helpers/utils";
import { ImageType, type MediaItemType } from "@/plugins/api/interfaces";
import { isPhoneSizedScreen } from "@/plugins/breakpoint";
import { computed } from "vue";

const props = defineProps<{
  // named by its logo when it has one, else by its name clamped to two lines
  item: MediaItemType;
}>();

const isPhone = computed(() => isPhoneSizedScreen());

const logo = computed(() => getImageThumbForItem(props.item, ImageType.LOGO));

// the logo shows the name, so the heading stays for screen readers only
const nameClass = computed(() =>
  logo.value
    ? "sr-only"
    : [
        "detail-hero-title__name",
        { "detail-hero-title__name--phone": isPhone.value },
      ],
);
</script>

<style scoped>
.detail-hero-title__logo {
  height: 80px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  object-position: left;
}
.detail-hero-title__name {
  margin: 0;
  font-size: 48px;
  font-weight: 500;
  letter-spacing: -1.2px;
  line-height: 1.2;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-hero-title__name--phone {
  font-size: 34px;
  letter-spacing: -0.8px;
}
.detail-hero-title__logo--phone {
  height: 56px;
}
</style>
