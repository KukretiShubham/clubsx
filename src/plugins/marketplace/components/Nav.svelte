<script lang="ts">
  import type { PluginMeta } from '@constants/plugins'
  import { allTags } from '@constants/plugin-tags'
  import { onMount } from 'svelte'
  import sticky from '../utils/sticky'

  export let plugins: PluginMeta[]
  let navEl: HTMLElement
  let isStuck: boolean = false
  let navInitialHeight: number | undefined

  const navs = allTags.map((tag) => ({
    tag,
    exists: plugins.some((x) => x.tag === tag),
    anchor: `#${tag.toLowerCase().replace(/\W/g, '')}`,
  }))

  const handleStuck = (e: any) => {
    isStuck = e.detail.isStuck
  }

  onMount(() => {
    // `on:stuck` expression is alerting an error, so use this
    navEl.addEventListener('stuck', handleStuck)
    navInitialHeight = navEl.clientHeight
  })
</script>

<nav
  bind:this={navEl}
  use:sticky={{ stickToTop: true }}
  class="sticky top-0 mx-[calc((100vw-100%)/-2)] grid items-start lg:mx-0"
  style={navInitialHeight && isStuck ? `height: ${navInitialHeight}px` : ''}
>
  <ul
    class={`flex items-start justify-start gap-4 overflow-x-auto rounded-b-[0.5rem] rounded-t-[0.5rem] bg-surface-300 px-5 py-4 ${
      isStuck ? 'rounded-t-none border-b border-b-black/20' : 'lg:flex-wrap'
    }`}
  >
    {#each navs.filter((x) => x.exists) as nav}
      <li>
        <a
          href={nav.anchor}
          class="inline-block whitespace-nowrap break-keep rounded-full border px-4 py-2 text-sm capitalize transition {nav.tag ===
          'New & Upcoming'
            ? 'border-[#fdad00] bg-[#fdad00] text-black hover:border-[#ffc751]'
            : 'border-surface-200 bg-surface-200 text-surface-ink hover:border-accent-200'}"
        >
          {nav.tag}
        </a>
      </li>
    {/each}
    {#each navs.filter((x) => !x.exists) as nav}
      <li>
        <span
          class="inline-flex items-center gap-2 whitespace-nowrap break-keep rounded-full border border-[var(--hs-theme-disabled)] bg-[var(--hs-theme-disabled)] px-4 py-2 text-sm capitalize text-[var(--hs-theme-disabled-ink)]"
        >
          {nav.tag}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-4 w-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
      </li>
    {/each}
  </ul>
</nav>
