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
      thread-id="support-chat-xyz123"
      :tools="[getGenderClientTool]"
      endpoint="/api/chat"
      :forwarded-props="{ context: 'optional-extra-for-server' }"
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
| `threadId` | `string` | generated UUID | Thread id for this chat. When omitted, `Chat` creates one with `crypto.randomUUID()`. |
| `endpoint` | `string` | `'/api/chat'` | URL passed to `fetchServerSentEvents` (your Nitro route). |
| `initialMessages` | `readonly UIMessage[] \| UIMessage[]` | — | Seed the thread on first mount. Remount with `:key` to load a different history. |
| `forwardedProps` | `Record<string, unknown>` | — | Extra JSON sent with every chat request. Available on the server from `chatParamsFromRequestBody` as `forwardedProps`. Do not use this for `role: 'system'` via `append`; put system context in your server adapter or `systemPrompts` instead. |
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
| `threadId` | The active thread id (from the `threadId` prop, or a generated UUID). |
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
  threadId: () => chatRef.value?.threadId,
  onLog: async ({ threadId, messages }) => {
    await $fetch('/api/chat-log/', {
      method: 'POST',
      body: {
        threadId,
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
import { chat, chatParamsFromRequestBody, toServerSentEventsResponse } from '@tanstack/ai'
import { getGenderDef } from '~~/app/utils/tools/gender'
// import { getGenderServer } from '~~/server/tools/gender'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { messages, threadId, runId } = await chatParamsFromRequestBody(body)
  const stream = chat({
    adapter: createVertexGatewayChat('gemini-3.1-flash-lite'),
    messages,
    threadId,
    runId,
    systemPrompts: ['You are a helpful assistant'],
    tools: [getGenderDef], // for client tools
    // tools: [getGenderServer] // for server tools
  })
  return toServerSentEventsResponse(stream)
})
```

### Gemini on Vertex AI through AI Gateway

`createVertexGatewayChat(model, options?)` is auto-imported on the server. It returns the `@tanstack/ai-gemini` chat adapter, pointed at Vertex AI through Cloudflare AI Gateway. Store the Google service account in the gateway (Provider Keys); the app sends no Google credential. It works on Workers and in `nuxt dev`.

Set these environment variables:

| Variable | Value |
|----------|-------|
| `NUXT_CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |
| `NUXT_CLOUDFLARE_TOKEN` | Cloudflare API token with AI Gateway access |
| `NUXT_AI_GATEWAY_ID` | Gateway id |
| `NUXT_AI_VERTEX_PROJECT_ID` | Google Cloud project id |
| `NUXT_AI_VERTEX_LOCATION` | Optional, defaults to `global` |

Pass extra gateway headers in `options.headers`, for example `createVertexGatewayChat(model, { headers: { 'cf-aig-skip-cache': 'true' } })`.

Without the gateway, use Vertex express mode with an API key instead: `createGeminiChat(model, apiKey, { vertexai: true })` from `@tanstack/ai-gemini`.

### Client vs server tools

- **Client tools**: Pass client tools to `Chat` component and have their tool definition registered in the server API endpoint as well.
- **Server tools**: Pass server-side tools in chat API endpoint.

See [https://tanstack.com/ai/latest/docs/tools/tools](https://tanstack.com/ai/latest/docs/tools/tools) to learn more about Tanstack AI tools.

