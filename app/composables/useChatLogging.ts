import type { MessagePart, UIMessage } from '@tanstack/ai-client'
import type { MaybeRefOrGetter } from 'vue'
import { ref, toValue, watch } from 'vue'

type MaybePromise<T> = T | Promise<T>
type ChatMessagesSource = MaybeRefOrGetter<readonly UIMessage[] | UIMessage[] | null | undefined>

export interface ChatLoggingPayload {
  chatId?: string
  messages: UIMessage[]
}

export interface UseChatLoggingOptions {
  messages: ChatMessagesSource
  chatId?: MaybeRefOrGetter<string | undefined>
  onLog?: (payload: ChatLoggingPayload) => MaybePromise<void>
}

function hasToolOutput(part: MessagePart): part is MessagePart & { output: unknown } {
  return Object.prototype.hasOwnProperty.call(part, 'output')
}

function hasPendingToolOutput(message: UIMessage) {
  return message.parts.some(part => part.type === 'tool-call' && !hasToolOutput(part))
}

function findMessageById(messages: ChatMessagesSource, messageId: string) {
  return toValue(messages)?.find(message => message.id === messageId)
}

function hasDuplicateToolResultPart(message: UIMessage) {
  const [toolCallPart, toolResultPart] = message.parts
  if (!toolCallPart || !toolResultPart) return false
  return (
    message.parts.length === 2
    && toolCallPart.type === 'tool-call'
    && toolResultPart.type === 'tool-result'
    && toolResultPart.content === JSON.stringify(toolCallPart.output)
  )
}

function messageForLogging(message: UIMessage): UIMessage {
  if (!hasDuplicateToolResultPart(message)) return message

  const [toolCallPart] = message.parts
  if (!toolCallPart) return message
  return {
    ...message,
    parts: [toolCallPart],
  }
}

export function useChatLogging(options: UseChatLoggingOptions) {
  const queuedSentMessages = ref<UIMessage[]>([])

  function onMessageSend(message: UIMessage) {
    queuedSentMessages.value.push(message)
  }

  function waitForToolOutput(message: UIMessage): Promise<UIMessage> {
    const currentMessage = findMessageById(options.messages, message.id) ?? message
    if (!hasPendingToolOutput(currentMessage)) {
      return Promise.resolve(messageForLogging(currentMessage))
    }

    return new Promise((resolve) => {
      const stop = watch(
        () => findMessageById(options.messages, message.id),
        (currentMessage) => {
          if (!currentMessage || hasPendingToolOutput(currentMessage)) return

          stop()
          resolve(messageForLogging(currentMessage))
        },
        { deep: true },
      )
    })
  }

  async function collectMessagesToLog(message: UIMessage) {
    const messageToLog = hasPendingToolOutput(message)
      ? await waitForToolOutput(message)
      : messageForLogging(message)

    return [...queuedSentMessages.value, messageToLog]
  }

  async function onMessageFinish(message: UIMessage) {
    const messages = await collectMessagesToLog(message)

    await options.onLog?.({
      chatId: toValue(options.chatId),
      messages,
    })

    queuedSentMessages.value = []
  }

  function resetQueuedSentMessages() {
    queuedSentMessages.value = []
  }

  return {
    queuedSentMessages,
    collectMessagesToLog,
    onMessageFinish,
    onMessageSend,
    resetQueuedSentMessages,
    waitForToolOutput,
  }
}
