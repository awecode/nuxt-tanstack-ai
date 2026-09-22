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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function withoutThoughtSignature(metadata: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(metadata, 'thoughtSignature')) {
    return metadata
  }

  const sanitized = { ...metadata }
  delete sanitized.thoughtSignature
  return sanitized
}

function partForLogging(part: MessagePart): MessagePart {
  if (part.type !== 'tool-call' && part.type !== 'tool-result') return part

  const record = part as MessagePart & { metadata?: unknown }
  if (!isRecord(record.metadata)) return part

  const sanitizedMetadata = withoutThoughtSignature(record.metadata)
  const sanitizedPart = { ...part } as Record<string, unknown>
  if (Object.keys(sanitizedMetadata).length > 0) {
    sanitizedPart.metadata = sanitizedMetadata
  } else {
    delete sanitizedPart.metadata
  }

  return sanitizedPart as MessagePart
}

function sanitizeMessageMetadata(message: UIMessage): UIMessage['metadata'] | undefined {
  if (!isRecord(message.metadata)) return message.metadata

  const metadata = { ...message.metadata }
  const tanstack = metadata.tanstack
  if (!isRecord(tanstack)) return metadata

  const toolCallMetadata = tanstack.toolCallMetadata
  if (!isRecord(toolCallMetadata)) return metadata

  const sanitizedToolCallMetadata: Record<string, unknown> = {}
  for (const [toolCallId, value] of Object.entries(toolCallMetadata)) {
    if (!isRecord(value)) {
      sanitizedToolCallMetadata[toolCallId] = value
      continue
    }
    const cleaned = withoutThoughtSignature(value)
    if (Object.keys(cleaned).length > 0) {
      sanitizedToolCallMetadata[toolCallId] = cleaned
    }
  }

  const sanitizedTanstack = { ...tanstack }
  if (Object.keys(sanitizedToolCallMetadata).length > 0) {
    sanitizedTanstack.toolCallMetadata = sanitizedToolCallMetadata
  } else {
    delete sanitizedTanstack.toolCallMetadata
  }

  if (Object.keys(sanitizedTanstack).length > 0) {
    metadata.tanstack = sanitizedTanstack
  } else {
    delete metadata.tanstack
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function sanitizeMessageForLogging(message: UIMessage): UIMessage {
  return {
    ...message,
    parts: message.parts.map(partForLogging),
    metadata: sanitizeMessageMetadata(message),
  }
}

function messageForLogging(message: UIMessage): UIMessage {
  if (!hasDuplicateToolResultPart(message)) return sanitizeMessageForLogging(message)

  const [toolCallPart] = message.parts
  if (!toolCallPart) return message
  return sanitizeMessageForLogging({
    ...message,
    parts: [toolCallPart],
  })
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

    return [...queuedSentMessages.value.map(messageForLogging), messageToLog]
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
