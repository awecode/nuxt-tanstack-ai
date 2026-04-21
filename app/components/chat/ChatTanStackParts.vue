<script setup lang="ts">
import type { ChatClientState, MessagePart, UIMessage } from '@tanstack/ai-client'
import highlight from '@comark/nuxt/plugins/highlight'

const props = withDefaults(
  defineProps<{
    message: UIMessage
    status: ChatClientState
    messageIndex: number
    totalMessages: number
    showToolUsage?: boolean
  }>(),
  { showToolUsage: true }
)

function isLivePart(partIndex: number) {
  return (
    props.status === 'streaming'
    && props.messageIndex === props.totalMessages - 1
    && props.message.role === 'assistant'
    && partIndex === props.message.parts.length - 1
  )
}

function formatUnknown(part: MessagePart) {
  return JSON.stringify(part, null, 0).slice(0, 200)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <template
      v-for="(part, index) in message.parts"
      :key="`${message.id}-${index}-${part.type}`"
    >
      <ChatThinkingPanel
        v-if="part.type === 'thinking'"
        :streaming="isLivePart(index)"
      >
        <Comark
          :markdown="part.content"
          :streaming="isLivePart(index)"
          :plugins="[highlight()]"
          class="*:first:mt-0 *:last:mb-0"
        />
      </ChatThinkingPanel>

      <template v-else-if="part.type === 'tool-call' || part.type === 'tool-result'">
        <ChatToolPanel
          v-if="showToolUsage"
          :part="part"
        />
      </template>

      <template v-else-if="part.type === 'text'">
        <Comark
          v-if="message.role === 'assistant'"
          :markdown="part.content"
          :streaming="isLivePart(index)"
          :plugins="[highlight()]"
          class="*:first:mt-0 *:last:mb-0"
        />
        <p
          v-else
          class="whitespace-pre-wrap text-sm leading-relaxed text-highlighted"
        >
          {{ part.content }}
        </p>
      </template>

      <div
        v-else-if="part.type === 'image'"
        class="overflow-hidden rounded-lg ring ring-default"
      >
        <img
          v-if="part.source.type === 'url'"
          :src="part.source.value"
          :alt="message.role === 'user' ? 'User image' : 'Assistant image'"
          class="max-h-64 w-full object-contain bg-elevated"
        >
        <img
          v-else
          :src="`data:${part.source.mimeType};base64,${part.source.value}`"
          alt="Inline image"
          class="max-h-64 w-full object-contain bg-elevated"
        >
      </div>

      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        :title="`Content: ${part.type}`"
        :description="formatUnknown(part)"
      />
    </template>
  </div>
</template>
