# Tanstack AI + Nuxt UI

This layer ships a small chat stack built on **@tanstack/ai**, and **@nuxt/ui**. The root component is **`Chat`**, which wires `useChat`, `fetchServerSentEvents`, and the transcript UI.

## Usage

Use `Chat` anywhere you want a full AI chat interface.

```vue
<template>
    <Chat />
</template>
```

Default SSE endpoint is **`POST /api/chat`** (override with the `endpoint` prop). Full props example:

<give full props example here>


## `Chat` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tools` | `readonly AnyClientTool[]` | `[]` | Client tool instances from `toolDefinition(...).client(...)`, wrapped internally with `clientTools`. |
| `endpoint` | `string` | `'/api/chat'` | URL passed to `fetchServerSentEvents` (your Nitro route). |
| `assistantName` | `string` | `'Assistant'` | Shown on assistant bubbles / pending row. |
| `assistantImage` | `string` | — | Optional avatar URL. |
| `userName` | `string` | `'You'` | Shown on user bubbles. |
| `userImage` | `string` | — | Optional avatar URL. |
| `showToolUsage` | `boolean` | `true` | When `false`, tool-call / tool-result parts are hidden. |
| `stickyPrompt` | `boolean` | `true` | Sticky composer + flex-friendly list; set `false` for a simpler stacked layout. |

## Nitro API

Create a route file at:

**`server/api/chat.post.ts`**

That exposes **`POST /api/chat`** to the client (matching the default `endpoint` on `Chat`). Or you can use a custom api path and pass it as `endpoint` prop to the `Chat` component.

Adapt adapter, model name, env vars, and imports to your project. Tool imports below are placeholders; replace with your own `toolDefinition` exports. Refer to [Tanstack AI documentation](https://tanstack.com/ai/latest/docs/getting-started/overview) to elarn more about adapters, tools, and advanced usage,

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

