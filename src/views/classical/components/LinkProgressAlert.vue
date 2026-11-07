<template>
  <!-- tracks wait under Other tracks until linking reaches them -->
  <Alert v-if="message" variant="info" class="mb-3">
    <Info />
    <AlertDescription>{{ message }}</AlertDescription>
  </Alert>
</template>

<script setup lang="ts">
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/plugins/api";
import {
  EventType,
  type ClassicalLinkProgress,
  type EventMessage,
} from "@/plugins/api/interfaces";
import { getLinkProgress } from "@/services/classical";
import { linkProgressLabel } from "@/views/classical/labels";
import { Info } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({ name: "LinkProgressAlert" });

const progress = ref<ClassicalLinkProgress>();

onMounted(async () => {
  // the server reports progress after each linking run, so the page asks once
  const unsub = api.subscribe(
    EventType.CLASSICAL_LINK_PROGRESS,
    (evt: EventMessage) => {
      progress.value = evt.data as ClassicalLinkProgress;
    },
  );
  onBeforeUnmount(unsub);
  try {
    // an event that arrived meanwhile is newer
    const current = await getLinkProgress();
    progress.value ??= current;
  } catch {
    // unknown until the next run reports, so no banner meanwhile
  }
});

const message = computed(() =>
  progress.value ? linkProgressLabel(progress.value) : "",
);
</script>
