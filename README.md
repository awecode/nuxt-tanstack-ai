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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Chat
      :tools="[getGenderClientTool]"
      endpoint="/api/chat"
      assistant-name="Assistant"
      assistant-image="https://example.com/assistant.png"
      :user-name="user.name"
      :user-image="user.profile_picture"
      :show-tool-usage="true"
      :sticky-prompt="true"
    >
      <p class="text-muted text-sm">
        Optional default slot: intro, disclaimer, anything; shown when no chat messages.
      </p>
    </Chat>
  </div>
</template>
```

### Default slot

`Chat` accepts an optional **default slot**: content rendered when there are no chat messages. Use it for onboarding text, disclaimers, empty-state hints, or custom controls like new suggested chat prompts. If you pass no default slot, that region is omitted.

## `Chat` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tools` | `readonly AnyClientTool[]` | `[]` | Client tool instances from `toolDefinition(...).client(...)` |
| `endpoint` | `string` | `'/api/chat'` | URL passed to `fetchServerSentEvents` (your Nitro route). |
| `assistantName` | `string` | `'Assistant'` | Shown on assistant bubbles. |
| `assistantImage` | `string` | — | Optional avatar URL for assistant. |
| `userName` | `string` | `'You'` | Shown on user bubbles. |
| `userImage` | `string` | — | Optional avatar URL for user. |
| `showToolUsage` | `boolean` | `true` | When `false`, tool-call / tool-result parts are hidden. |
| `stickyPrompt` | `boolean` | `true` | Sticky prompt textarea/composer ; set `false` for a simpler stacked layout. |

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

