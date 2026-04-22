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
  <div class="flex flex-col gap-2">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error.name"
      :description="error.message"
    />

    <form @submit.prevent="trySubmit">
      <UTextarea
        v-model="model"
        :placeholder="placeholder"
        :disabled="blocked"
        :autofocus="autofocus"
        variant="outline"
        color="neutral"
        autoresize
        :maxrows="8"
        :rows="1"
        class="w-full"
        :ui="{
          root: 'w-full',
          base: 'min-h-10 py-1.5 ps-2.5 text-sm leading-snug'
        }"
        @keydown="onKeydown"
      >
        <template #trailing>
          <div class="flex items-end self-end">
            <UButton
              v-if="showStop"
              type="button"
              color="neutral"
              variant="soft"
              size="sm"
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
              size="sm"
              square
              icon="i-lucide-refresh-ccw"
              aria-label="Retry"
              @click="onActionClick"
            />
            <UButton
              v-else
              type="submit"
              color="neutral"
              size="sm"
              square
              icon="i-lucide-arrow-right"
              variant="soft"
              :disabled="!model.trim() || blocked"
              aria-label="Send"
            />
          </div>
        </template>
      </UTextarea>
    </form>
  </div>
</template>
