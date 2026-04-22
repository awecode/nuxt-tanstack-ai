<script setup lang="ts">
import type { ChatClientState, MessagePart, UIMessage } from '@tanstack/ai-client'

const props = withDefaults(
  defineProps<{
    messages: readonly UIMessage[] | UIMessage[]
    status: ChatClientState
    assistantName?: string
    assistantImage?: string
    /** When false, keep the bottom skeleton through `ready` until the last assistant has text (tool → text gap). */
    showToolUsage?: boolean
    /** Tailwind max-height for the scroll viewport */
    maxHeightClass?: string
  }>(),
  {
    maxHeightClass: 'max-h-none',
    assistantName: 'Assistant',
    showToolUsage: true
  }
)

const contentWrap = ref<HTMLElement | null>(null)
const bottomAnchor = ref<HTMLElement | null>(null)

const showJump = ref(false)
/** Updated by IntersectionObserver on `bottomAnchor`; works for inner OR window scrolling. */
let atBottom = true
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null

function scrollToBottom(smooth: boolean) {
  const anchor = bottomAnchor.value
  if (!anchor) return
  anchor.scrollIntoView({
    block: 'end',
    inline: 'nearest',
    behavior: smooth ? 'smooth' : 'auto'
  })
}

function onJumpClick() {
  scrollToBottom(true)
}

const lastMessage = computed(() => props.messages.at(-1))

/** Latest assistant message has something the transcript bubble would show (not hidden tools). */
const lastAssistantHasVisibleSurface = computed(() => {
  const last = lastMessage.value
  if (!last || last.role !== 'assistant' || !last.parts?.length) return false
  return last.parts.some(
    (p: MessagePart) =>
      (p.type === 'text' && typeof p.content === 'string' && p.content.trim().length > 0)
      || (p.type === 'thinking' && typeof p.content === 'string' && p.content.trim().length > 0)
      || p.type === 'image'
  )
})

/**
 * Bottom assistant row: avatar + skeleton until the latest assistant message shows
 * real content in the transcript (text, thinking, or image). With tools hidden,
 * `status` can sit on `ready` between tool end and the next chunk — keep this row
 * so there is no empty gap or a second empty bubble above the skeleton.
 */
const showPendingAssistant = computed(() => {
  if (lastAssistantHasVisibleSurface.value) return false
  if (props.status === 'submitted' || props.status === 'streaming') return true
  if (
    props.showToolUsage === false
    && props.status === 'ready'
  ) {
    const last = lastMessage.value
    if (last?.role !== 'assistant') return false
    return (last.parts?.length ?? 0) > 0
  }
  return false
})

watch(
  () => props.messages.length,
  (len, prevLen) => {
    if (len === prevLen) return
    const last = props.messages.at(-1)
    nextTick(() => {
      // Newly-sent user message: always follow to bottom.
      if (last?.role === 'user') {
        atBottom = true
        scrollToBottom(true)
        return
      }
      if (atBottom) scrollToBottom(false)
    })
  }
)

watch(
  () => props.status,
  (s) => {
    if (s === 'submitted') {
      atBottom = true
      nextTick(() => scrollToBottom(true))
    }
  }
)

onMounted(() => {
  const anchor = bottomAnchor.value
  const content = contentWrap.value

  // IntersectionObserver against the real viewport. Works for either
  // inner-scrollport or window-scrollport layouts (it honors every ancestor's
  // clipping). A small positive bottom rootMargin gives a ~32px "near bottom"
  // tolerance so the chip doesn't flicker on tiny scroll jitter.
  if (anchor) {
    io = new IntersectionObserver(
      ([entry]) => {
        atBottom = entry.isIntersecting
        showJump.value = !atBottom && props.messages.length > 0
      },
      { root: null, threshold: 0, rootMargin: '0px 0px 32px 0px' }
    )
    io.observe(anchor)
  }

  // Follow streaming content growth while pinned at bottom. Works for either
  // inner-scrollport or window-scrollport layouts.
  if (content) {
    ro = new ResizeObserver(() => {
      if (atBottom) scrollToBottom(false)
    })
    ro.observe(content)
  }

  nextTick(() => scrollToBottom(false))
  setTimeout(() => scrollToBottom(false), 80)
})

onUnmounted(() => {
  io?.disconnect()
  io = null
  ro?.disconnect()
  ro = null
})
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div
      data-slot="chat-scroll"
      :class="['min-h-0 overflow-y-auto pb-6 pr-1', maxHeightClass]"
    >
      <div ref="contentWrap" class="flex flex-col gap-3">
        <template
          v-for="(message, messageIndex) in messages"
          :key="message.id"
        >
          <slot
            :message="message"
            :message-index="messageIndex"
            :total-messages="messages.length"
          />
        </template>

        <div
          v-if="showPendingAssistant"
          class="mt-8 pt-1"
          aria-live="polite"
          :aria-busy="'true'"
          :aria-label="`${assistantName} is responding`"
        >
          <div class="flex w-full gap-1.5">
            <div
              class="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-elevated ring ring-default"
              aria-hidden="true"
            >
              <span
                class="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-primary/25 motion-safe:animate-pulse"
              />
              <UAvatar
                v-if="assistantImage"
                :src="assistantImage"
                :alt="assistantName"
                size="sm"
                class="relative"
              />
              <UIcon
                v-else
                name="i-lucide-bot"
                class="relative size-4 text-muted motion-safe:animate-pulse"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
              <span class="text-[11px] font-medium text-muted">{{ assistantName }}</span>
              <div class="flex flex-col gap-2">
                <div
                  class="h-2.5 max-w-md w-[88%] rounded-full bg-muted/45 motion-safe:animate-pulse"
                />
                <div
                  class="h-2.5 max-w-sm w-[62%] rounded-full bg-muted/35 motion-safe:animate-pulse motion-safe:[animation-delay:120ms]"
                />
                <div
                  class="h-2.5 max-w-xs w-[42%] rounded-full bg-muted/30 motion-safe:animate-pulse motion-safe:[animation-delay:240ms]"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          ref="bottomAnchor"
          class="h-px w-full shrink-0 scroll-mb-24"
          aria-hidden="true"
        />
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showJump"
        class="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center"
      >
        <UButton
          class="pointer-events-auto shadow-md"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-arrow-down"
          label="Latest"
          @click="onJumpClick"
        />
      </div>
    </Transition>
  </div>
</template>
