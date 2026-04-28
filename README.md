# Tanstack AI + Nuxt UI

This layer ships a small chat stack built on **@tanstack/ai**, and **@nuxt/ui**. The root component is **`Chat`**, which wires `useChat`, `fetchServerSentEvents`, and the transcript UI.

## Usage

Use `Chat` anywhere you want a full AI chat interface.

In your `nuxt.config.ts`, configure layer usage.

```ts
export default defineNuxtConfig({
  extends: [
    ['github:awecode/nuxt-tanstack-ai', { install: true }],
  ],
})
```

```vue
<template>
    <Chat />
</template>
```

Default SSE endpoint is **`POST /api/chat`** (override with the `endpoint` prop).

Full props example (all props shown; omit or simplify what you do not need):

```vue
<script setup lang="ts">
import { getGenderDef } from '~~/app/utils/tools/gender'
import { getGender } from '~~/app/utils/tools/gender'
const getGenderClientTool = getGenderDef.client(getGender)
const chatRef = useTemplateRef('chatRef')
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Chat
      ref="chatRef"
      id="support-chat-xyz123"
      :tools="[getGenderClientTool]"
      endpoint="/api/chat"
      :body="{ context: 'optional-extra-for-server' }"
      placeholder="Ask something…"
      assistant-name="Assistant"
      assistant-image="https://example.com/assistant.png"
      :user-name="user.name"
      :user-image="user.profile_picture"
      :show-tool-usage="true"
      :sticky-prompt="true"
      @send="onSend"
      @chunk="onChunk"
      @finish="onFinish"
      @tool-call-output="onToolCallOutput"
    >
      <div class="flex flex-col gap-3 text-center text-muted text-sm">
        Pick a starter or type and send a message.
        <div class="flex flex-wrap gap-2 justify-center">
          <UButton
            size="sm"
            variant="soft"
            color="neutral"
            @click="chatRef!.sendMessage('Tell me a joke')"
          >
            Tell me a joke
          </UButton>
        </div>
      </div>
    </Chat>
  </div>
</template>
```

## `Chat` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tools` | `readonly AnyClientTool[]` | `[]` | Client tool instances from `toolDefinition(...).client(...)` |
| `id` | `string` | generated UUID | Chat thread id passed to TanStack `useChat`. When omitted, `Chat` creates one with `crypto.randomUUID()`. |
| `endpoint` | `string` | `'/api/chat'` | URL passed to `fetchServerSentEvents` (your Nitro route). |
| `initialMessages` | `readonly UIMessage[] \| UIMessage[]` | — | Seed the thread on first mount. Remount with `:key` to load a different history. |
| `body` | `Record<string, unknown>` | — | Merged into every request body TanStack sends to `endpoint` (e.g. `{ userContext: '...' }`). Read extra fields in Nitro with `readBody`. Not for `role: 'system'` via `append`—use this or your server adapter for system / side context. |
| `placeholder` | `string` | `'Message…'` | Composer textarea placeholder. |
| `assistantName` | `string` | `'Assistant'` | Shown on assistant bubbles. |
| `assistantImage` | `string` | — | Optional avatar URL for assistant. |
| `userName` | `string` | `'You'` | Shown on user bubbles. |
| `userImage` | `string` | — | Optional avatar URL for user. |
| `showToolUsage` | `boolean` | `true` | When `false`, tool-call / tool-result parts are hidden. |
| `stickyPrompt` | `boolean` | `true` | Sticky prompt textarea/composer ; set `false` for a simpler stacked layout. |


### Default slot

`Chat` accepts an optional **default slot**: content rendered when there are no chat messages. Use it for onboarding text, disclaimers, empty-state hints, or custom controls like new suggested chat prompts. If you pass no default slot, that region is omitted.

### Exposed references

`Chat` exposes these methods and refs on a **template ref** (via `defineExpose`):

| Exposed value | Purpose |
|---------------|---------|
| `sendMessage(message)` | Same as sending from the composer; appends a user message and runs the stream. |
| `append(message)` | TanStack `useChat().append()` — appends a message and runs the stream. |
| `stop()` | Stops the in-flight response (same as the composer’s stop action). |
| `reload()` | Retries the last request when the client is in an error state (same as the composer’s retry). |
| `clear()` | TanStack `useChat().clear()` — wipes messages and related client state so you get an empty thread again (the default slot reappears when `messages` is empty). |
| `chatId` | The active chat id: the passed `id` prop, or the generated UUID fallback. |
| `messages` | The TanStack `useChat().messages` ref for the current transcript. |

### Emitted events

`Chat` emits these events for parent components:

| Event | Payload | Description |
|-------|---------|-------------|
| `send` | `UIMessage` | Fired when the composer submits a user message. |
| `chunk` | `StreamChunk` | Fired for each stream chunk received from TanStack `onChunk`. |
| `finish` | `UIMessage` | Fired when TanStack `onFinish` completes with the assistant message. |
| `tool-call-output` | `ToolCallPart, UIMessage` | Fired once when a tool-call part receives an `output` property. The full tool-call part is emitted. |

### Chat logging composable

Use `useChatLogging` when you want to log the submitted user message plus the final assistant message.

```vue
<script setup lang="ts">
const chatRef = useTemplateRef('chatRef')

const userContext = computed(() => {
  return initialData.value
})

const { onMessageSend, onMessageFinish } = useChatLogging({
  messages: () => chatRef.value?.messages,
  chatId: () => chatRef.value?.chatId,
  onLog: async ({ chatId, messages }) => {
    await $fetch('/api/chat-log/', {
      method: 'POST',
      body: {
        chatId,
        messages,
      },
    })
  },
})

</script>

<template>
  <Chat
    ref="chatRef"
    @send="onMessageSend"
    @finish="onMessageFinish"
  />
</template>
```


## Nitro API

Create a route file at:

**`server/api/chat.post.ts`**

That exposes **`POST /api/chat`** to the client (matching the default `endpoint` on `Chat`). Or you can use a custom api path and pass it as `endpoint` prop to the `Chat` component.

Adapt adapter, model name, env vars, and imports to your project. Tool imports below are placeholders; replace with your own `toolDefinition` exports. Refer to [Tanstack AI documentation](https://tanstack.com/ai/latest/docs/getting-started/overview) to learn more about adapters, tools, and advanced usage.

```ts
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { createGeminiChat } from '@tanstack/ai-gemini'
import { getGenderDef } from '~~/app/utils/tools/gender'
// import { getGenderServer } from '~~/server/tools/gender'

export default defineEventHandler(async (event) => {
  const config = {
    vertexai: true,
  }
  const apiKey = process.env.NUXT_AI_VERTEX_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'NUXT_AI_VERTEX_API_KEY not configured',
    })
  }
  const adapter = createGeminiChat('gemini-3.1-flash-lite-preview', apiKey, config)

  try {
    const { messages, conversationId } = await readBody(event)
    const stream = chat({
      adapter,
      messages,
      conversationId,
      systemPrompts: ["You are a helpful assistant"],
      tools: [getGenderDef], // for client tools
      // tools: [getGenderServer] // for server tools
    })

    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    })

    return toServerSentEventsResponse(stream)
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'An error occurred',
    })
  }
})
```
### Client vs server tools

- **Client tools**: Pass client tools to `Chat` component and have their tool definition registered in the server API endpoint as well.
- **Server tools**: Pass server-side tools in chat API endpoint.

See [https://tanstack.com/ai/latest/docs/tools/tools](https://tanstack.com/ai/latest/docs/tools/tools) to learn more about Tanstack AI tools.

