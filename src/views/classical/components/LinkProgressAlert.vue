<template>
  <!-- tracks wait under Other tracks until linking reaches them -->
  <Alert v-if="message" variant="info" class="mb-3">
    <Info />
    <AlertDescription>{{ message }}</AlertDescription>
  </Alert>
</template>

<script setup lang="ts">
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ClassicalLinkProgress } from "@/plugins/api/interfaces";
import { getLinkProgress } from "@/services/classical";
import { linkProgressLabel } from "@/views/classical/labels";
import { Info } from "@lucide/vue";
import { useDocumentVisibility, useIntervalFn } from "@vueuse/core";
import { computed, ref, watch } from "vue";

defineOptions({ name: "LinkProgressAlert" });

// ms between checks while the page is on screen
const REFRESH_INTERVAL = 60_000;

const progress = ref<ClassicalLinkProgress>();

const refresh = async () => {
  try {
    progress.value = await getLinkProgress();
  } catch {
    progress.value = undefined;
  }
};

// checks straight away, and again each time the page comes back on screen
const { pause, resume } = useIntervalFn(refresh, REFRESH_INTERVAL, {
  immediateCallback: true,
});

const visibility = useDocumentVisibility();
watch(visibility, (state) => (state === "visible" ? resume() : pause()));

const message = computed(() =>
  progress.value ? linkProgressLabel(progress.value) : "",
);
</script>
