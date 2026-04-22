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
    /** Pin the composer to the bottom of the chat column (parent should be flex + bounded height, e.g. `min-h-0 flex-1`). */
    stickyPrompt?: boolean
  }>(),
  {
    endpoint: '/api/chat',
    assistantName: 'Assistant',
    userName: 'You',
    showToolUsage: true,
    stickyPrompt: true
  }
)

const input = ref('')

const tools = clientTools(...(props.tools ?? []))

const chatOptions = createChatClientOptions({
  connection: fetchServerSentEvents(props.endpoint),
  tools
})
type ChatMessages = InferChatMessages<typeof chatOptions>
const { messages, sendMessage, status, error, stop, reload, clear } = useChat(chatOptions)

defineExpose({
  sendMessage,
  stop,
  reload,
  clear
})

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
  <UContainer
    :class="[
      'flex flex-1 flex-col',
      stickyPrompt ? 'min-h-0 h-full gap-0' : 'gap-3 sm:gap-4',
    ]"
  >
    <div
      v-if="$slots.default && messages.length === 0"
      class="shrink-0 pb-2"
    >
      <slot :send-message="sendMessage"/>
    </div>
    <ChatMessageList
      :class="stickyPrompt ? 'min-h-0 flex-1' : undefined"
      :messages="messages as ChatMessages"
      :status="status"
      :assistant-name="assistantName"
      :assistant-image="assistantImage"
      :show-tool-usage="showToolUsage"
      :max-height-class="stickyPrompt ? 'min-h-0 flex-1' : undefined"
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

    <div
      :class="
        stickyPrompt
          ? 'sticky bottom-0 z-10 shrink-0 bg-default/95 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-default/80 pb-[max(0.5rem,env(safe-area-inset-bottom))]'
          : undefined
      "
    >
      <ChatComposer
        v-model="input"
        autofocus
        :status="status"
        :error="error"
        @submit="onSubmit"
        @stop="stop"
        @reload="reload"
      />
    </div>
  </UContainer>
</template>
