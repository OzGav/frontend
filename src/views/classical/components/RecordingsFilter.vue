<template>
  <!-- Stable wrapper carries the outer layout margin so neither inner element
       needs a horizontal margin of its own. A margin combined with the
       input's width:100% would push it past the container edge. -->
  <div class="recordings-filter-root">
    <!-- Editable state, a free-text filter the user can type into. -->
    <SearchInput
      v-if="!committed"
      ref="inputEl"
      :model-value="modelValue"
      clearable
      :placeholder="$t('classical_filter_recordings_placeholder')"
      :aria-label="$t('classical_filter_recordings_placeholder')"
      class="recordings-filter-input"
      @update:model-value="(value: string) => emit('update:modelValue', value)"
      @keydown.enter.prevent="$emit('commit')"
    />
    <!-- Committed state, a status banner driven by a performer context arrival
         or a user-committed term. Clicking the text returns to the input. -->
    <div v-else class="filter-banner">
      <button type="button" class="filter-banner-text" @click="$emit('edit')">
        <i18n-t
          v-if="count > 0"
          :keypath="bannerKey"
          :plural="count"
          tag="span"
        >
          <template #count>
            <strong>{{ count }}</strong>
          </template>
          <template v-if="performerName" #performer>
            <strong>{{ performerName }}</strong>
          </template>
          <template v-else #term>
            <strong>{{ term }}</strong>
          </template>
        </i18n-t>
        <span v-else-if="genericNoMatch">
          {{ $t("classical_no_recordings_match") }}
        </span>
        <i18n-t v-else keypath="classical_filter_no_match" tag="span">
          <template #term>
            <strong>{{ displayTerm }}</strong>
          </template>
        </i18n-t>
      </button>
      <button type="button" class="filter-banner-clear" @click="$emit('clear')">
        {{ $t("classical_filter_show_all") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SearchInput } from "@/components/ui/search-input";
import { computed, nextTick, ref, watch } from "vue";

defineOptions({ name: "RecordingsFilter" });

const props = defineProps<{
  modelValue: string;
  committed: boolean;
  count: number;
  performerName?: string;
  term?: string;
  /**
   * Report an empty list plainly rather than blaming the committed term, for
   * when another filter is also narrowing the list.
   */
  genericNoMatch?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "commit"): void;
  (e: "edit"): void;
  (e: "clear"): void;
}>();

const inputEl = ref<InstanceType<typeof SearchInput> | null>(null);

const bannerKey = computed(() =>
  props.performerName
    ? "classical_filter_showing_by"
    : "classical_filter_showing_matching",
);

// The no-match line names whatever drove the filter, the performer for a
// context arrival, otherwise the typed term.
const displayTerm = computed(() => props.performerName || props.term || "");

// Focus the field when returning from a banner to the editable state so the
// pre-filled term can be edited straight away.
watch(
  () => props.committed,
  (committed, was) => {
    if (was && !committed) nextTick(() => inputEl.value?.focus());
  },
);
</script>

<style scoped>
.recordings-filter-input {
  width: 100%;
}

.filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  /* Sized like YearRangeFilter so the two sit level side by side. */
  padding: 0.25rem 0.4rem 0.25rem 0.7rem;
  border-radius: 8px;
  background: var(--muted, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border, #2a2a2a);
  font-size: 0.9rem;
}

.filter-banner-text {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.filter-banner-clear {
  background: transparent;
  border: 1px solid var(--border, #444);
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font: inherit;
  line-height: normal;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.filter-banner-clear:hover {
  background: var(--accent, rgba(255, 255, 255, 0.08));
}
</style>
