<script setup lang="ts">
import type { ChatClientState, UIMessage } from '@tanstack/ai-client'

const props = withDefaults(
  defineProps<{
    messages: readonly UIMessage[] | UIMessage[]
    status: ChatClientState
    assistantName?: string
    assistantImage?: string
    /** Tailwind max-height for the scroll viewport */
    maxHeightClass?: string
  }>(),
  {
    maxHeightClass: 'max-h-[min(70vh,32rem)]',
    assistantName: 'Assistant'
  }
)

const scrollRoot = ref<HTMLElement | null>(null)
const showJump = ref(false)
let userScrolledAway = false

function nearBottom(el: HTMLElement, px: number) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < px
}

function onScroll() {
  const el = scrollRoot.value
  if (!el) return
  showJump.value = !nearBottom(el, 140)
  if (!nearBottom(el, 72)) userScrolledAway = true
  else userScrolledAway = false
}

function scrollToBottom(smooth: boolean) {
  const el = scrollRoot.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
}

function onJumpClick() {
  userScrolledAway = false
  scrollToBottom(true)
}

const lastMessage = computed(() => props.messages.at(-1))

/** First assistant text token has arrived on the latest assistant message */
const hasStreamedAssistantText = computed(() => {
  const last = lastMessage.value
  if (!last || last.role !== 'assistant' || !last.parts?.length) return false
  return last.parts.some(
    (p) => p.type === 'text' && typeof p.content === 'string' && p.content.trim().length > 0
  )
})

/**
 * Assistant row: avatar + skeleton while waiting or streaming, until the first
 * text part on the latest assistant message has content (then the bubble shows it).
 */
const showPendingAssistant = computed(() => {
  if (props.status !== 'submitted' && props.status !== 'streaming') return false
  if (hasStreamedAssistantText.value) return false
  return true
})

watch(
  () => props.messages,
  () => {
    nextTick(() => {
      const el = scrollRoot.value
      if (!el) return
      const last = props.messages.at(-1)
      if (last?.role === 'user') {
        userScrolledAway = false
        scrollToBottom(true)
        return
      }
      if (props.status === 'streaming' && !userScrolledAway && nearBottom(el, 160)) {
        scrollToBottom(false)
      }
    })
  },
  { deep: true }
)

watch(
  () => props.status,
  (s) => {
    if (s === 'submitted') {
      userScrolledAway = false
      nextTick(() => scrollToBottom(true))
    }
  }
)

onMounted(() => {
  nextTick(() => scrollToBottom(false))
  setTimeout(() => scrollToBottom(false), 80)
})
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div
      ref="scrollRoot"
      data-slot="chat-scroll"
      :class="['flex flex-col gap-3 overflow-y-auto pr-1', maxHeightClass]"
      @scroll.passive="onScroll"
    >
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
        class="pt-2"
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
        class="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center"
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
