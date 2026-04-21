<script setup lang="ts">
import type { ToolCallPart, ToolResultPart, UIMessage } from '@tanstack/ai-client'

const props = defineProps<{
  message: UIMessage
}>()

/** Latest tool activity in this message (single live line, not a log). */
const tailTool = computed(() => {
  const parts = props.message.parts
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    if (p?.type === 'tool-call' || p?.type === 'tool-result') {
      return { part: p as ToolCallPart | ToolResultPart }
    }
  }
  return null
})

const part = computed(() => tailTool.value?.part)
const isCall = computed(() => part.value?.type === 'tool-call')

const statusLabel = computed(() => {
  const p = part.value
  if (!p) return ''

  if (p.type === 'tool-call') {
    const map: Record<string, string> = {
      'awaiting-input': 'Preparing…',
      'input-streaming': 'Reading inputs…',
      'input-complete': 'Processing inputs…',
      'approval-requested': 'Needs your approval',
      'approval-responded': 'Continuing…'
    }
    return map[p.state] ?? p.state.replace(/-/g, ' ')
  }
  const map: Record<string, string> = {
    streaming: 'Receiving result…',
    complete: 'Processed',
    error: 'Failed'
  }
  return map[p.state] ?? p.state
})

const callState = computed(() =>
  part.value?.type === 'tool-call' ? part.value.state : null
)

const busy = computed(() => {
  const p = part.value
  if (!p) return false

  if (p.type === 'tool-call') {
    const s = p.state
    if (s === 'approval-requested') return false
    return (
      s === 'awaiting-input'
      || s === 'input-streaming'
      || s === 'input-complete'
    )
  }
  return p.state === 'streaming'
})

const icon = computed(() => {
  const p = part.value
  if (!p) return 'i-lucide-wrench'

  if (p.type === 'tool-call') {
    const s = p.state
    if (s === 'approval-requested') return 'i-lucide-hand'
    if (busy.value) return 'i-lucide-loader-circle'
    return 'i-lucide-wrench'
  }
  if (p.state === 'error') return 'i-lucide-circle-alert'
  if (p.state === 'complete') return 'i-lucide-check'
  return 'i-lucide-loader-circle'
})
</script>

<template>
  <div
    v-if="tailTool"
    class="flex min-h-[1.75rem] items-center gap-2 rounded-md bg-elevated/60 px-2 py-1.5 text-xs ring ring-default/40"
    role="status"
    :aria-label="statusLabel"
  >
    <UIcon
      :name="icon"
      class="size-3.5 shrink-0 text-muted"
      :class="{ 'motion-safe:animate-spin': busy }"
    />
    <span class="text-muted">{{ statusLabel }}</span>
  </div>
</template>
