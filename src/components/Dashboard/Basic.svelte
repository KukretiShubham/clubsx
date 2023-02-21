<script lang="ts">
  import { onMount } from 'svelte'
  import { decode } from '@devprotocol/clubs-core'
  import type { DraftOptions } from '@constants/draft'
  import type { ClubsConfiguration } from '@devprotocol/clubs-core'

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
      console.log("before decoded = >", club)
      console.log("decoded = >", decoded)

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
  <div>
    Total Clubs Created: {publishedClubs.length + draftClubs.length}
  </div>
  <div>
    Total Clubs Published: {publishedClubs.length}
  </div>
  <div>
    Total Clubs Draft: {draftClubs.length}
  </div>

</div>
