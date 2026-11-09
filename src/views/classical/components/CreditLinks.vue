<template>
  <!-- Several names share one row, so the underline shows which one is hovered. -->
  <template v-for="(a, i) in artists" :key="`${a.id}|${a.instrument ?? ''}`">
    <template v-if="i">{{ separator }}</template>
    <router-link
      :to="`/classical/performers/${a.id}`"
      class="text-inherit no-underline [&:focus-visible]:underline [&:hover]:underline"
      @click.stop
      >{{ a.name }}</router-link
    >
    <template v-if="a.instrument"> ({{ a.instrument }})</template>
  </template>
</template>

<script setup lang="ts">
import type { CreditedArtist } from "@/views/classical/credits";

defineOptions({ name: "CreditLinks" });

defineProps<{
  artists: CreditedArtist[];
  separator: string;
}>();
</script>
