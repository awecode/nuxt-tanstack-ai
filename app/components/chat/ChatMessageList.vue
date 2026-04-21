<script setup lang="ts">
import type { ChatClientState, UIMessage } from '@tanstack/ai-client'

const props = withDefaults(
  defineProps<{
    messages: readonly UIMessage[] | UIMessage[]
    status: ChatClientState
    /** Tailwind max-height for the scroll viewport */
    maxHeightClass?: string
  }>(),
  { maxHeightClass: 'max-h-[min(70vh,32rem)]' }
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

const showTypingIndicator = computed(() => {
  if (props.status !== 'submitted') return false
  const last = props.messages.at(-1)
  return Boolean(
    last?.role === 'assistant'
    && (!last.parts || last.parts.length === 0)
  )
})

/** User is waiting on the model: request in flight or tokens arriving */
const showResponseStatus = computed(
  () => props.status === 'submitted' || props.status === 'streaming'
)

const responseStatusLabel = computed(() => {
  if (props.status === 'submitted') return 'Waiting for response…'
  if (props.status === 'streaming') return 'Generating response…'
  return ''
})

const responseStatusIcon = computed(() => {
  if (props.status === 'submitted') return 'i-lucide-loader-circle'
  if (props.status === 'streaming') return 'i-lucide-pen-line'
  return 'i-lucide-minus'
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
        v-if="showResponseStatus || showTypingIndicator"
        class="border-t border-default/60 pt-3 pl-2 sm:pl-10"
        aria-live="polite"
        :aria-busy="showResponseStatus ? 'true' : undefined"
      >
        <div
          v-if="showResponseStatus"
          class="flex items-center gap-2 text-sm text-muted"
        >
          <UIcon
            :name="responseStatusIcon"
            class="size-4 shrink-0 text-muted"
            :class="{ 'animate-spin': status === 'submitted' }"
          />
          <span class="font-medium text-highlighted">{{ responseStatusLabel }}</span>
        </div>
        <div
          v-if="showTypingIndicator"
          class="mt-2 flex items-center gap-1.5"
          aria-label="Assistant is typing"
        >
          <span class="size-2 animate-pulse rounded-full bg-muted" />
          <span class="size-2 animate-pulse rounded-full bg-muted [animation-delay:120ms]" />
          <span class="size-2 animate-pulse rounded-full bg-muted [animation-delay:240ms]" />
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
