<script lang="ts">
    import { onMount } from 'svelte'
    let clubsNumber:null | number = null
    let latestClub: null[] | string[] = [null]

    const fetchTotalClubs = async () => {
    const res = await fetch('/api/stats', {
      method: 'POST',
    })
    return res.json()
    }
    onMount(async () => {
        clubsNumber = await fetchTotalClubs().then((res) => res.length)
        latestClub = await fetchTotalClubs().then((res) => res[res.length -1])
    })
    $: console.log('Latest = > ', latestClub);
  </script>
  
  <div>
    <div>
        Total clubs: {clubsNumber}
    </div>
    <div>
        Latest club: {Object.keys(latestClub)}
    </div>
  </div>