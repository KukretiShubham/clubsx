<script lang="ts">
  import { onMount } from 'svelte'
  import { decode } from '@devprotocol/clubs-core'
  import type { DraftOptions } from '@constants/draft'
  import type { ClubsConfiguration } from '@devprotocol/clubs-core'
  import Table from './Table.svelte'

  let isLoading = false
  let draftClubs: ClubsConfiguration[] = []
  let publishedClubs: ClubsConfiguration[] = []

  const fetchTotalClubs = async () => {
    const req = await fetch('/api/stats', {
      method: 'POST',
    })
    if (req.status !== 200) {
      isLoading = false
      return
    }

    const clubs = await req.json()
    for (const club of clubs) {
      const decoded = decode(club)
      const isDraft = decoded.options?.find(
        (option: { key: string }) => option.key === '__draft'
      ) as DraftOptions | undefined
      console.log('before decoded = >', club)
      console.log('decoded = >', decoded)

      if (isDraft?.value.isInDraft) {
        draftClubs.push(decoded)
        draftClubs = draftClubs
      } else {
        publishedClubs.push(decoded)
        publishedClubs = publishedClubs
      }
    }
    isLoading = false
  }
  onMount(async () => {
    await fetchTotalClubs()
  })
</script>

<div>
  <div
    class="max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800"
  >
    <h5
      class="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
    >
      Overview
    </h5>
    <p class="text-gray-600 dark:text-gray-400">
      Total Clubs Created: {publishedClubs.length + draftClubs.length}
    </p>
    <p class="text-gray-600 dark:text-gray-400">
      Published: {publishedClubs.length}
    </p>
    <p class="text-gray-600 dark:text-gray-400">
      In Draft: {draftClubs.length}
    </p>
  </div>
  <Table config={[...draftClubs, ...publishedClubs]} />
</div>
