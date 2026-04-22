# Chat UI (`Chat` + Nitro API)

This playground ships a small chat stack built on **@tanstack/ai**, **@tanstack/ai-vue**, **@tanstack/ai-client**, and **@nuxt/ui** v4. The root component is **`Chat`**, which wires `useChat`, `fetchServerSentEvents`, and the transcript UI.

## Prerequisites

- **Nuxt** app with **@nuxt/ui** v4 (peer dependency in this package).
- Dependencies (see `.playground/package.json`): `@tanstack/ai`, `@tanstack/ai-client`, `@tanstack/ai-vue`, and an adapter package such as `@tanstack/ai-gemini` if you stream from Gemini / Vertex.

Components live under:

`app/components/chat/`

Nuxt auto-imports them as `Chat`, `ChatComposer`, `ChatMessageList`, etc.

## Mounting `Chat`

Use `Chat` anywhere you want a full thread + composer. Default SSE endpoint is **`POST /api/chat`** (override with the `endpoint` prop).

```vue
<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Chat />
  </div>
</template>
```

### Layout note (`stickyPrompt`)

When **`stickyPrompt`** is `true` (default), the composer is pinned with `sticky bottom-0` and the message list is meant to scroll inside the column. For that to work reliably, a parent should usually provide a **bounded height** and **`min-h-0`** on flex children (for example `min-h-0 flex-1` on a column that fills the viewport). If the page body is the only scroll container, behavior still works, but auto-scroll and the “Latest” chip depend on how the host layout scrolls.

## `Chat` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tools` | `readonly AnyClientTool[]` | `[]` | Client tool instances from `toolDefinition(...).client(...)`, wrapped internally with `clientTools`. |
| `endpoint` | `string` | `'/api/chat'` | URL passed to `fetchServerSentEvents` (your Nitro route). |
| `assistantName` | `string` | `'Assistant'` | Shown on assistant bubbles / pending row. |
| `assistantImage` | `string` | — | Optional avatar URL. |
| `userName` | `string` | `'You'` | Shown on user bubbles. |
| `userImage` | `string` | — | Optional avatar URL. |
| `showToolUsage` | `boolean` | `true` | When `false`, tool-call / tool-result parts are collapsed in the transcript where the UI supports it. |
| `stickyPrompt` | `boolean` | `true` | Sticky composer + flex-friendly list; set `false` for a simpler stacked layout. |

`Chat` forwards **`max-height-class`** to `ChatMessageList` when `stickyPrompt` is true (typically `min-h-0 flex-1`). Override by forking `Chat.vue` or extending the prop surface if you need a fixed max height (for example `max-h-[min(70vh,32rem)]`).

## Nitro API: `POST /api/chat`

Create a route file at:

**`server/api/chat.post.ts`**

That exposes **`POST /api/chat`** to the client (matching the default `endpoint` on `Chat`).

The handler should:

1. Read **`messages`** and optional **`conversationId`** from the request body (same shape TanStack’s client sends).
2. Call **`chat()`** from `@tanstack/ai` with your adapter and optional **`tools`** (server and/or client tool definitions, depending on your setup).
3. Return **`toServerSentEventsResponse(stream)`** so `fetchServerSentEvents` on the client can consume the stream.
4. Set SSE-friendly response headers.

### Example (Gemini / Vertex + optional tools)

Adapt model name, env vars, and imports to your project. Tool imports below are placeholders; replace with your own `toolDefinition` exports.

```ts
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { createGeminiChat } from '@tanstack/ai-gemini'
import { getGenderDef } from '~~/app/utils/tools/gender'
// import { getGenderServer } from '~~/server/tools/gender'

export default defineEventHandler(async (event) => {
  const config = {
    // baseURL: 'https://aiplatform.googleapis.com/v1',
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

### Environment

- Configure whatever secret your adapter needs (here **`NUXT_AI_VERTEX_API_KEY`**) in `.env` and expose it to Nitro via `runtimeConfig` or direct `process.env`, per your Nuxt setup.

### Client vs server tools

- **Client tools**: definitions passed to `chat()` on the server can still drive tool calls that execute on the client when you pass matching **`tools`** into `Chat` from `toolDefinition(...).client(...)`.
- **Server tools**: pass server-side implementations in `tools` on the server only, as in TanStack’s docs for your adapter version.

## Related components

- **`ChatComposer`**: textarea, send / stop / retry; `v-model` for the draft string.
- **`ChatMessageList`**: scroll region, pending assistant skeleton, “Latest” jump control.
- **`ChatMessageBubble`** / **`ChatTanStackParts`**: rendering of message parts (text, thinking, tools, etc.).

For behavior details, read the `<script setup>` blocks in those files; props are documented inline where it matters.
