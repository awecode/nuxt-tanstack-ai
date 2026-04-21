<script setup lang="ts">
import type { UIMessage } from '@tanstack/ai-client'

const props = defineProps<{
  message: UIMessage
}>()

const isUser = computed(() => props.message.role === 'user')
</script>

<template>
  <div
    class="flex w-full gap-2"
    :class="isUser ? 'justify-end' : 'justify-start'"
    :data-message-id="message.id"
    :data-role="message.role"
  >
    <div
      v-if="!isUser"
      class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated ring ring-default"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-bot"
        class="size-4 text-muted"
      />
    </div>

    <UCard
      class="max-w-[min(100%,40rem)] shrink"
      :variant="isUser ? 'subtle' : 'outline'"
    >
      <div class="px-3 py-2 sm:px-4 sm:py-3">
        <slot />
      </div>
    </UCard>

    <div
      v-if="isUser"
      class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated ring ring-default"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-user"
        class="size-4 text-muted"
      />
    </div>
  </div>
</template>
