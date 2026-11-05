<template>
  <!-- Placed after a list's last row, it asks for the next page once it is in
       view, and again after each page while it stays in view. -->
  <div ref="sentinel" class="flex min-h-[1px] justify-center">
    <Spinner v-if="loading" class="my-4 size-6 text-muted-foreground" />
  </div>
</template>

<script setup lang="ts">
import { Spinner } from "@/components/ui/spinner";
import { useIntersectionObserver } from "@vueuse/core";
import { ref } from "vue";

defineOptions({ name: "LoadMoreSentinel" });

const props = defineProps<{
  // the next page is loading
  loading: boolean;
}>();

const emit = defineEmits<{
  more: [];
}>();

const sentinel = ref<HTMLElement | null>(null);

// Observed afresh after each page, as the first report of a new observation
// tells whether the sentinel is still in view below the added rows.
useIntersectionObserver(
  () => (props.loading ? null : sentinel.value),
  ([entry]) => {
    if (entry?.isIntersecting) emit("more");
  },
);
</script>
