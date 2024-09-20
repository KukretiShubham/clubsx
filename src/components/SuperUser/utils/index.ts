import type { Ref } from 'vue'

export type RefApiCalling = Ref<
  | {
      result?: any
      error?: string
      progress?: boolean
      status?: string
    }
  | undefined
>
