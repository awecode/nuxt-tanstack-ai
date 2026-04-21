<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** When true, panel opens and label shows in-progress wording */
    streaming?: boolean
  }>(),
  { streaming: false }
)

const open = ref<string | undefined>(undefined)

watch(
  () => props.streaming,
  (s) => {
    if (s) open.value = 'think'
  },
  { immediate: true }
)

const items = computed(() => [
  {
    label: props.streaming ? 'Thinking…' : 'Reasoning',
    value: 'think',
    icon: 'i-lucide-sparkles'
  }
])
</script>

<template>
  <UAccordion
    v-model="open"
    type="single"
    collapsible
    :items="items"
    class="rounded-lg border border-default bg-muted/30"
  >
    <template #body>
      <div class="text-sm text-default">
        <slot />
      </div>
    </template>
  </UAccordion>
</template>
