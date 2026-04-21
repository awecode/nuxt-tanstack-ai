<script setup lang="ts">
import type { InferChatMessages } from '@tanstack/ai-client'
import { clientTools, createChatClientOptions } from '@tanstack/ai-client'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-vue'
import { getGenderDef, getGender } from '~~/app/utils/tools/gender'

type ClientTools = ReturnType<typeof clientTools>

const props = withDefaults(
  defineProps<{
    tools?: ClientTools
    endpoint?: string
    assistantName?: string
    assistantImage?: string
    userName?: string
    userImage?: string
  }>(),
  {
    endpoint: '/api/chat',
    assistantName: 'Assistant',
    userName: 'You'
  }
)

const input = ref('')

const getGenderTool = getGenderDef.client(getGender)
const tools = props.tools ?? clientTools(getGenderTool)

const chatOptions = createChatClientOptions({
  connection: fetchServerSentEvents(props.endpoint),
  tools
})
type ChatMessages = InferChatMessages<typeof chatOptions>
const { messages, sendMessage, status, error, stop, reload } = useChat(chatOptions)

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
    >
      <template #default="{ message, messageIndex, totalMessages }">
        <ChatMessageBubble
          :message="message"
          :assistant-name="assistantName"
          :assistant-image="assistantImage"
          :user-name="userName"
          :user-image="userImage"
          :show-assistant-name="messageIndex === 0 || messages[messageIndex - 1]?.role !== 'assistant'"
        >
          <ChatTanStackParts
            :message="message"
            :status="status"
            :message-index="messageIndex"
            :total-messages="totalMessages"
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
