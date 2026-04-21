<script setup lang="ts">
import type { AnyClientTool, InferChatMessages, UIMessage } from '@tanstack/ai-client'
import { clientTools, createChatClientOptions } from '@tanstack/ai-client'
import { toValue } from 'vue'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-vue'

function assistantHasRenderableSurface(parts: UIMessage['parts']) {
  for (const p of parts) {
    if (p.type === 'text' && typeof p.content === 'string' && p.content.trim().length > 0) return true
    if (p.type === 'thinking' && typeof p.content === 'string' && p.content.trim().length > 0) return true
    if (p.type === 'image') return true
  }
  return false
}

const props = withDefaults(
  defineProps<{
    /** Client tool instances from `toolDefinition(...).client(...)`, passed as an array and wrapped with `clientTools` internally. */
    tools?: readonly AnyClientTool[]
    endpoint?: string
    assistantName?: string
    assistantImage?: string
    userName?: string
    userImage?: string
    /** When false, tool-call / tool-result parts are not shown in the transcript. */
    showToolUsage?: boolean
  }>(),
  {
    endpoint: '/api/chat',
    assistantName: 'Assistant',
    userName: 'You',
    showToolUsage: true
  }
)

const input = ref('')

const tools = clientTools(...(props.tools ?? []))

const chatOptions = createChatClientOptions({
  connection: fetchServerSentEvents(props.endpoint),
  tools
})
type ChatMessages = InferChatMessages<typeof chatOptions>
const { messages, sendMessage, status, error, stop, reload } = useChat(chatOptions)

/** Show assistant label when the visible “thread” breaks (incl. prior bubble was tool-only collapsed). */
function showAssistantNameAt(index: number) {
  if (index === 0) return true
  const list = toValue(messages) as ChatMessages
  const prev = list[index - 1]
  if (!prev || prev.role !== 'assistant') return true
  if (props.showToolUsage) return false
  return !assistantHasRenderableSurface(prev.parts)
}

function onSubmit() {
  if (!input.value.trim()) return
  void sendMessage(input.value)
  input.value = ''
}
</script>

<template>
  <UContainer class="flex flex-1 flex-col gap-3 sm:gap-4">
    <ChatMessageList
      :messages="messages as ChatMessages"
      :status="status"
      :assistant-name="assistantName"
      :assistant-image="assistantImage"
      :show-tool-usage="showToolUsage"
    >
      <template #default="{ message, messageIndex, totalMessages }">
        <ChatMessageBubble
          :message="message"
          :assistant-name="assistantName"
          :assistant-image="assistantImage"
          :user-name="userName"
          :user-image="userImage"
          :show-assistant-name="showAssistantNameAt(messageIndex)"
          :show-tool-usage="showToolUsage"
        >
          <ChatTanStackParts
            :message="message"
            :status="status"
            :message-index="messageIndex"
            :total-messages="totalMessages"
            :show-tool-usage="showToolUsage"
          />
        </ChatMessageBubble>
      </template>
    </ChatMessageList>

    <ChatComposer
      v-model="input"
      autofocus
      :status="status"
      :error="error"
      @submit="onSubmit"
      @stop="stop"
      @reload="reload"
    />
  </UContainer>
</template>
