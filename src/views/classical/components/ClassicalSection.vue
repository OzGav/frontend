<template>
  <!-- headed like the rows of the standard detail pages, with MediaRowList's
       spacing, so lists line up with the text above -->
  <section class="p-[26px_28px_0] max-[769px]:p-[20px_16px_0]">
    <div
      class="mb-[8px] flex flex-wrap items-center justify-between gap-[10px]"
    >
      <DetailSectionTitle :title="title" :meta="meta" align="baseline">
        <slot name="title-append"></slot>
      </DetailSectionTitle>
      <slot name="append"></slot>
    </div>
    <!-- under the heading, e.g. a phone's search field -->
    <slot name="below-head"></slot>
    <slot></slot>
  </section>
</template>

<script setup lang="ts">
import DetailSectionTitle from "@/components/details/DetailSectionTitle.vue";

defineOptions({ name: "ClassicalSection" });

defineProps<{
  title: string;
  // short text beside the title, e.g. a count
  meta?: string;
}>();
</script>
