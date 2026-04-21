<script setup lang="ts">
import type { ToolCallPart, ToolResultPart } from '@tanstack/ai-client'

const props = defineProps<{
  part: ToolCallPart | ToolResultPart
}>()

const isCall = computed(() => props.part.type === 'tool-call')

const title = computed(() => {
  if (isCall.value) {
    const p = props.part as ToolCallPart
    return p.name
  }
  return 'Tool result'
})

const subtitle = computed(() => {
  if (isCall.value) {
    return (props.part as ToolCallPart).state.replace(/-/g, ' ')
  }
  return (props.part as ToolResultPart).state
})

const body = computed(() => {
  if (isCall.value) {
    const p = props.part as ToolCallPart
    return p.arguments
  }
  const p = props.part as ToolResultPart
  return p.error ? `${p.content}\n\n${p.error}` : p.content
})
</script>

<template>
  <UCard
    variant="outline"
    class="border-dashed"
  >
    <template #header>
      <div class="flex flex-wrap items-center gap-2">
        <UIcon
          name="i-lucide-wrench"
          class="size-4 text-muted"
        />
        <span class="font-medium text-highlighted">{{ title }}</span>
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ subtitle }}
        </UBadge>
      </div>
    </template>
    <pre
      v-if="body"
      class="max-h-48 overflow-auto rounded-md bg-elevated p-2 text-xs text-muted ring ring-default"
    >{{ body }}</pre>
  </UCard>
</template>
