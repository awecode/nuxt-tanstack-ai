<script setup lang="ts">
import type { UIMessage } from '@tanstack/ai-client'

const props = defineProps<{
  message: UIMessage
  assistantName?: string
  assistantImage?: string
  userName?: string
  userImage?: string
}>()

const isUser = computed(() => props.message.role === 'user')
const participantName = computed(() =>
  isUser.value
    ? (props.userName ?? 'You')
    : (props.assistantName ?? 'Assistant')
)
const participantImage = computed(() =>
  isUser.value ? props.userImage : props.assistantImage
)
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
      <UAvatar
        v-if="participantImage"
        :src="participantImage"
        :alt="participantName"
        size="md"
      />
      <UIcon
        v-else
        name="i-lucide-bot"
        class="size-4 text-muted"
      />
    </div>

    <UCard
      class="max-w-[min(100%,40rem)] shrink"
      :variant="isUser ? 'subtle' : 'outline'"
    >
      <div class="px-3 py-2 sm:px-4 sm:py-3">
        <p class="mb-1 text-xs font-medium text-muted">
          {{ participantName }}
        </p>
        <slot />
      </div>
    </UCard>

    <div
      v-if="isUser"
      class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated ring ring-default"
      aria-hidden="true"
    >
      <UAvatar
        v-if="participantImage"
        :src="participantImage"
        :alt="participantName"
        size="md"
      />
      <UIcon
        v-else
        name="i-lucide-user"
        class="size-4 text-muted"
      />
    </div>
  </div>
</template>
