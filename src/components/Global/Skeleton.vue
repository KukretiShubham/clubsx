<template>
  <div class="h-full animate-pulse rounded bg-gray-500/60 text-transparent" />
</template>

<script>
import { defineComponent } from '@vue/runtime-core'

export default defineComponent({
  name: 'Skeleton',
  props: {
    title: String,
    id: String,
    currency: String,
    amount: String,
    badgeImageSrc: String,
  },
})
</script>
