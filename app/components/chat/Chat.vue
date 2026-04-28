<script setup lang="ts">
import type { StreamChunk } from '@tanstack/ai'
import type { AnyClientTool, InferChatMessages, ToolCallPart, UIMessage } from '@tanstack/ai-client'
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
    /** Chat thread id. A UUID is generated when omitted. */
    id?: string
    endpoint?: string
    /**
     * Seed the thread when this `Chat` instance is created (e.g. restoring history).
     * Omitted when empty. To load a different transcript later, remount `Chat` (e.g. `:key="conversationId"`).
     */
    initialMessages?: readonly UIMessage[] | UIMessage[]
    /**
     * Merged into every chat request body (e.g. `{ userContext: '...' }`). Read in Nitro with `readBody(event)`.
     */
    body?: Record<string, unknown>
    assistantName?: string
    assistantImage?: string
    userName?: string
    userImage?: string
    /** When false, tool-call / tool-result parts are not shown in the transcript. */
    showToolUsage?: boolean
    /** Placeholder for the composer `UTextarea` (same as `ChatComposer`). */
    placeholder?: string
    /** Pin the composer to the bottom of the chat column (parent should be flex + bounded height, e.g. `min-h-0 flex-1`). */
    stickyPrompt?: boolean
  }>(),
  {
    endpoint: '/api/chat',
    assistantName: 'Assistant',
    userName: 'You',
    showToolUsage: true,
    placeholder: 'Ask me anything...',
    stickyPrompt: true
  }
)

const emit = defineEmits<{
  chunk: [chunk: StreamChunk]
  finish: [message: UIMessage]
  send: [message: UIMessage]
  'tool-call-output': [part: ToolCallPart, message: UIMessage]
}>()

const input = ref('')

const chatId = props.id ?? crypto.randomUUID()

const tools = clientTools(...(props.tools ?? []))

const baseOptions = createChatClientOptions({
  connection: fetchServerSentEvents(props.endpoint),
  id: chatId,
  tools,
  onChunk: chunk => emit('chunk', chunk),
  onFinish: message => emit('finish', message),
  ...(props.initialMessages?.length
    ? { initialMessages: [...props.initialMessages] }
    : {}),
})
type ChatMessages = InferChatMessages<typeof baseOptions>

const chatOptions = {
  ...baseOptions,
  get body() {
    return props.body
  },
}
const { messages, sendMessage, status, error, stop, reload, clear, append } = useChat(chatOptions)
const emittedToolOutputKeys = new Set<string>()

watch(error, (err) => {
  if (!err) return
  console.error('[Chat] useChat error:', err)
})

function hasToolOutput(part: UIMessage['parts'][number]): part is ToolCallPart & { output: unknown } {
  return Object.prototype.hasOwnProperty.call(part, 'output')
}

function getToolOutputKey(message: Pick<UIMessage, 'id'>, part: ToolCallPart, partIndex: number) {
  const record = part as Record<string, unknown>
  const toolCallId = record.id ?? record.toolCallId ?? part.name ?? partIndex
  return `${message.id}:${String(toolCallId)}:${partIndex}`
}

watch(
  messages,
  (messages) => {
    for (const message of messages) {
      for (const [partIndex, part] of message.parts.entries()) {
        if (part.type !== 'tool-call' || !hasToolOutput(part)) continue

        const key = getToolOutputKey(message, part, partIndex)
        if (emittedToolOutputKeys.has(key)) continue

        emittedToolOutputKeys.add(key)
        emit('tool-call-output', part, message as unknown as UIMessage)
      }
    }
  },
  { deep: true }
)

defineExpose({
  sendMessage,
  append,
  stop,
  reload,
  clear,
  chatId,
  messages
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
  emit('send', { id: '', role: 'user', parts: [{ type: 'text', content: input.value }], createdAt: new Date() })
  input.value = ''
}
</script>

<template>
  <UContainer
    :class="[
      'flex flex-1 flex-col p-0',
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
        :placeholder="placeholder"
        :status="status"
        :error="error"
        @submit="onSubmit"
        @stop="stop"
        @reload="reload"
      />
    </div>
  </UContainer>
</template>
