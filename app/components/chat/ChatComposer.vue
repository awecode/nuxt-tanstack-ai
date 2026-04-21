<script setup lang="ts">
import type { ChatClientState } from '@tanstack/ai-client'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    status: ChatClientState
    error?: Error
    disabled?: boolean
    placeholder?: string
    autofocus?: boolean
  }>(),
  { placeholder: 'Message…', autofocus: false }
)

const emit = defineEmits<{
  submit: []
  stop: []
  reload: []
}>()

const blocked = computed(() => Boolean(props.error) || props.disabled)

const showStop = computed(
  () => props.status === 'submitted' || props.status === 'streaming'
)

const showReload = computed(() => props.status === 'error')

function trySubmit() {
  if (!model.value.trim() || blocked.value) return
  emit('submit')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  if (e.isComposing) return
  if (e.shiftKey) return

  e.preventDefault()
  trySubmit()
}

function onActionClick() {
  if (showStop.value) emit('stop')
  else if (showReload.value) emit('reload')
}
</script>

<template>
  <UCard
    variant="subtle"
    class="ring ring-default"
  >
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      class="mb-3"
      :title="error.name"
      :description="error.message"
    />

    <form
      class="flex flex-col gap-2 sm:flex-row sm:items-end"
      @submit.prevent="trySubmit"
    >
      <UTextarea
        v-model="model"
        :placeholder="placeholder"
        :disabled="blocked"
        :autofocus="autofocus"
        variant="outline"
        autoresize
        :maxrows="8"
        class="min-h-11 flex-1"
        @keydown="onKeydown"
      />

      <div class="flex shrink-0 justify-end gap-2">
        <UButton
          v-if="showStop"
          type="button"
          color="neutral"
          variant="soft"
          square
          icon="i-lucide-square"
          aria-label="Stop"
          @click="onActionClick"
        />
        <UButton
          v-else-if="showReload"
          type="button"
          color="error"
          variant="soft"
          square
          icon="i-lucide-refresh-ccw"
          aria-label="Retry"
          @click="onActionClick"
        />
        <UButton
          v-else
          type="submit"
          color="primary"
          square
          icon="i-lucide-arrow-up"
          :disabled="!model.trim() || blocked"
          aria-label="Send"
        />
      </div>
    </form>
  </UCard>
</template>
