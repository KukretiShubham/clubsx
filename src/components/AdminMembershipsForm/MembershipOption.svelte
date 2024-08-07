<script lang="ts">
  import { onMount } from 'svelte'
  import { CurrencyOption, markdownToHtml } from '@devprotocol/clubs-core'
  import { fade } from 'svelte/transition'
  import { ProseTextInherit } from '@devprotocol/clubs-core'
  import { FastAverageColor } from 'fast-average-color'
  import { i18nFactory } from '@devprotocol/clubs-core'

  import { Strings } from './i18n'

  type SlotLeft = {
    left: number
    total: number
  }

  const i18nBase = i18nFactory(Strings)
  let i18n = i18nBase(['en'])

  export let name: string
  export let clubName: string
  export let imagePath: string
  export let id: string
  export let price: string = '0'
  export let currency: CurrencyOption | Uppercase<CurrencyOption> =
    CurrencyOption.USDC
  export let nonStandardCurrency: string | undefined = undefined
  export let description: string | undefined = undefined
  export let action: string | undefined = undefined
  export let actionLabel: string | undefined = undefined
  export let extendable: boolean = true
  export let className: string = ''
  export let slotOutTotal: SlotLeft | undefined = undefined
  let modal = false
  let modalGroup: Element | undefined
  let isMounted = false
  let img: HTMLImageElement | undefined
  let isImgDark: boolean | undefined
  let imgColor: string | undefined

  const mdToHtml = (str?: string) => markdownToHtml(str ?? '')

  let content: string | undefined

  $: {
    content = isMounted ? mdToHtml(description) : undefined
  }

  const hash = `#membership:${id}`
  const showModal = (open: boolean) => {
    modal = open
    document.body.classList[open ? 'add' : 'remove']('overflow-y-hidden')
  }
  const handleHashChange = (event: HashChangeEvent) => {
    console.log({ event })
    const newUrl = new URL(event.newURL)
    const oldUrl = new URL(event.oldURL)
    if (newUrl.hash === hash) {
      showModal(true)
    }
    if (oldUrl.hash === hash) {
      showModal(false)
    }
  }

  const handleClickOpen = () => {
    window.location.hash = hash
  }
  const handleClickClose = () => {
    window.location.hash = ''
  }

  const RGBToLightness = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255
    const l = Math.max(r, g, b)
    return l
  }

  onMount(async () => {
    isMounted = true
    i18n = i18nBase(navigator.languages)
    window.addEventListener('hashchange', handleHashChange)

    modalGroup && document.body.appendChild(modalGroup)

    if (location.hash === hash) {
      showModal(true)
    }

    if (img) {
      const fac = new FastAverageColor()
      const color = await fac.getColorAsync(img).catch((e) => new Error(e))
      isImgDark =
        color instanceof Error
          ? undefined
          : (([r, g, b]) => {
              const l = RGBToLightness(r, g, b)
              console.log({ l, img })
              return l < 0.75
            })(color.value)
      imgColor = color instanceof Error ? imgColor : color.hex
    }
  })
</script>

<!-- <svelte:head>
  <link rel="prefetch" href={imagePath} />
</svelte:head> -->

<div
  class={`grid grid-rows-[auto_1fr] overflow-hidden rounded-xl shadow-2xl ${className}`}
>
  <img class="w-full bg-black/20" src={imagePath} alt={`${name} Membership`} />

  <div
    class={`relative grid grid-cols-[1fr_auto] content-baseline items-center gap-3 overflow-hidden p-2.5 ${
      isImgDark === undefined
        ? 'animate-pulse'
        : isImgDark
          ? 'text-white'
          : 'text-black'
    }`}
  >
    <img
      bind:this={img}
      class="pointer-events-none absolute -left-1/2 top-1/2 h-auto w-[200%] max-w-none -translate-y-1/2 blur-[120px] will-change-transform"
      src={imagePath}
      role="presentation"
      alt={name}
      crossorigin="anonymous"
    />

    <div
      role="presentation"
      style={`background-color: ${imgColor ? `${imgColor}80` : 'transparent'}`}
      class="pointer-events-none absolute inset-0"
    ></div>

    <div class="relative col-start-1">
      <p>{name}</p>
      {#if price && Number(price)}
        <p
          class="grid grid-cols-[auto_1fr] items-center gap-1 text-sm opacity-70"
        >
          <span class="truncate"
            >{new Intl.NumberFormat(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 3,
            }).format(Number(price))}</span
          >
          {(nonStandardCurrency || currency).toUpperCase()}
        </p>
      {/if}
    </div>

    {#if extendable}
      <button
        class="relative col-start-2 rounded-full bg-white/50 p-2"
        on:click={handleClickOpen}
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-6 w-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </button>
    {/if}
    {#if slotOutTotal !== undefined}
      <div class="relative col-span-2">
        <div class="flex w-full max-w-full gap-0 p-0">
          <div
            style="width: {(slotOutTotal.left / slotOutTotal.total || 0) *
              100}%"
            class="h-2 max-w-full rounded-[99px] bg-[#00D0FD]"
          ></div>
          <div
            style="width:{100 -
              (slotOutTotal.left / slotOutTotal.total || 0) * 100}%"
            class="h-2 max-w-full rounded-[99px] bg-[#FFFFFF4D]"
          ></div>
        </div>
        <span class="text-base font-bold">
          {slotOutTotal.left}/{slotOutTotal.total}
        </span>
      </div>
    {/if}

    {#if description}
      <div
        class={`markdown-small relative col-span-2 opacity-70 ${ProseTextInherit}`}
      >
        {#if content === undefined}
          <div
            role="presentation"
            class="mb-1 h-5 animate-pulse rounded bg-white/60"
          ></div>
          <div
            role="presentation"
            class="h-5 w-3/4 animate-pulse rounded bg-white/60"
          ></div>
        {:else}
          {@html content}
        {/if}
      </div>
    {/if}
  </div>
</div>

<div
  bind:this={modalGroup}
  class={`inset-0 z-[9999] grid items-center justify-center overflow-y-scroll bg-black/20 p-8 backdrop-blur-3xl ${
    modal ? 'fixed' : 'hidden'
  }`}
  transition:fade={{ duration: 100 }}
>
  {#if modal === true}
    <div class="grid max-w-lg gap-4 p-2">
      <span class="flex items-center gap-3 overflow-hidden">
        <button on:click={handleClickClose}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-6 w-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <span class="truncate text-3xl font-bold">{name}</span>
      </span>
      <img
        class="w-full rounded-xl bg-black/20 shadow-xl"
        src={imagePath}
        alt={`${name} Membership`}
      />

      <div class="px-2.5">
        <p class="font-bold">{name}</p>
        <p class="opacity-50">{clubName}</p>
      </div>

      <div
        class="grid grid-cols-[1fr_auto] content-baseline items-center gap-3 overflow-hidden px-2.5"
      >
        {#if price && Number(price)}
          <p class="text-2xl font-bold">
            {price}
            {(nonStandardCurrency || currency).toUpperCase()}
          </p>
        {/if}

        {#if action && actionLabel}
          <a
            class="flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5"
            href={action}
            >{i18n('ActionLabel', [actionLabel])}<svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </a>
        {/if}
      </div>
      {#if slotOutTotal !== undefined}
        <div class="relative">
          <div class="flex w-full max-w-full gap-0 p-0">
            <div
              style="width: {(slotOutTotal.left / slotOutTotal.total || 0) *
                100}%"
              class="h-2 max-w-full rounded-[99px] bg-[#00D0FD]"
            ></div>
            <div
              style="width:{100 -
                (slotOutTotal.left / slotOutTotal.total || 0) * 100}%"
              class="h-2 max-w-full rounded-[99px] bg-[#FFFFFF4D]"
            ></div>
          </div>
          <span class="text-base font-bold">
            {slotOutTotal.left}/{slotOutTotal.total}
          </span>
        </div>
      {/if}

      {#if description}
        <div class={`prose-hr:my-5 ${ProseTextInherit}`}>
          {@html content}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .markdown-small {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    max-height: 4em;
  }
</style>
