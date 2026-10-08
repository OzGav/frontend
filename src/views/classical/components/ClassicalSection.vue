<template>
  <!-- headed like the rows of the standard detail pages -->
  <section class="classical-section">
    <div class="classical-section__head">
      <div class="classical-section__titles">
        <h2 class="classical-section__title">{{ title }}</h2>
        <span v-if="meta" class="classical-section__meta">{{ meta }}</span>
      </div>
      <slot name="append"></slot>
    </div>
    <slot></slot>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: "ClassicalSection" });

defineProps<{
  title: string;
  // short text beside the title, e.g. a count
  meta?: string;
}>();
</script>

<style scoped>
/* MediaRowList's heading and spacing, so lists line up with the text above */
.classical-section {
  padding: 26px 28px 0;
}

.classical-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.classical-section__titles {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.classical-section__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: rgb(var(--v-theme-on-background));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.classical-section__meta {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .classical-section {
    padding: 20px 16px 0;
  }
  .classical-section__title {
    font-size: 19px;
  }
}
</style>
