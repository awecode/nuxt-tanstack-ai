<script setup lang="ts">
import type { ChatClientState, UIMessage } from '@tanstack/ai-client'

const props = withDefaults(
  defineProps<{
    message: UIMessage
    assistantName?: string
    assistantImage?: string
    userName?: string
    userImage?: string
    showAssistantName?: boolean
    /** When false, assistant rows with only hidden tool parts stay collapsed (no empty chrome). */
    showToolUsage?: boolean
    chatStatus?: ChatClientState
    messageIndex?: number
    totalMessages?: number
  }>(),
  {
    showToolUsage: true,
    chatStatus: 'ready',
    messageIndex: 0,
    totalMessages: 0
  }
)

function hasAssistantVisibleSurface(parts: UIMessage['parts']): boolean {
  for (const p of parts) {
    if (p.type === 'text' && typeof p.content === 'string' && p.content.trim().length > 0) return true
    if (p.type === 'thinking' && typeof p.content === 'string' && p.content.trim().length > 0) return true
    if (p.type === 'image') return true
  }
  return false
}

const isUser = computed(() => props.message.role === 'user')
const participantName = computed(() =>
  isUser.value
    ? (props.userName ?? 'You')
    : (props.assistantName ?? 'Assistant')
)
const participantImage = computed(() =>
  isUser.value ? props.userImage : props.assistantImage
)
const shouldShowName = computed(() => {
  if (isUser.value) return true
  return props.showAssistantName ?? true
})

const isLastMessage = computed(
  () => props.totalMessages > 0 && props.messageIndex === props.totalMessages - 1
)
const assistantTurnInFlight = computed(
  () => props.chatStatus === 'submitted' || props.chatStatus === 'streaming'
)

const shouldRenderBubble = computed(() => {
  if (isUser.value) return true
  if (props.showToolUsage) return true
  if (hasAssistantVisibleSurface(props.message.parts)) return true
  // Stay mounted on the active assistant message through tools → text (no flicker).
  if (
    isLastMessage.value
    && assistantTurnInFlight.value
    && props.message.parts.length > 0
  ) return true
  return false
})
</script>

<template>
  <div
    v-if="shouldRenderBubble"
    class="flex w-full gap-1.5"
    :class="isUser ? 'justify-end' : 'justify-start'"
    :data-message-id="message.id"
    :data-role="message.role"
  >
    <div v-if="!isUser"
      class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-elevated ring ring-default"
      aria-hidden="true">
      <UAvatar v-if="participantImage" :src="participantImage" :alt="participantName" size="md" />
      <UIcon v-else name="i-lucide-bot" class="size-4 text-muted" />
    </div>

    <UCard class="max-w-[min(100%,36rem)] shrink" :variant="isUser ? 'subtle' : 'soft'"
      :class="!isUser ? 'border-0 bg-transparent shadow-none' : ''" :ui="{
        body: 'p-0!',
      }">
      <div class="px-2.5 py-2 sm:px-3 sm:py-2.5">
        <p v-if="shouldShowName" class="mb-0.5 text-[11px] font-medium text-muted">
          {{ participantName }}
        </p>
        <slot />
      </div>
    </UCard>

    <div v-if="isUser"
      class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-elevated ring ring-default"
      aria-hidden="true">
      <UAvatar v-if="participantImage" :src="participantImage" :alt="participantName" size="md" />
      <UIcon v-else name="i-lucide-user" class="size-4 text-muted" />
    </div>
  </div>
</template>
