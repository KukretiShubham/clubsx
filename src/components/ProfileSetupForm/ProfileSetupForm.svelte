<script lang="ts">
  import Skeleton from '@components/Global/Skeleton.svelte'
  import type { DraftOptions } from '@constants/draft'
  import { i18nFactory, setConfig } from '@devprotocol/clubs-core'
  import type { ClubsConfiguration } from '@devprotocol/clubs-core'
  import type { UndefinedOr } from '@devprotocol/util-ts'
  import { uploadImageAndGetPath } from '@fixtures/imgur'
  import { onMount } from 'svelte'
  import { Strings } from './i18n'

  export let config: ClubsConfiguration

  let { name, twitterHandle } = config
  const i18nBase = i18nFactory(Strings)
  let i18n = i18nBase(['en'])

  const projectCategories = [
    {
      label: 'Discord',
      value: 'DISCORD',
    },
    {
      label: 'YouTube',
      value: 'YOUTUBE',
    },
    {
      label: 'GitHub',
      value: 'GITHUB',
    },
  ]

  let projectCategory =
    (
      config?.options?.find(
        (option) => option.key === '__draft',
      ) as UndefinedOr<DraftOptions>
    )?.value?.category?.toUpperCase() || 'DISCORD'

  let avatarPath =
    config.options?.find((opt) => opt.key === 'avatarImgSrc')?.value ?? ''
  let avatarUploading = false

  const onFileSelected = async (
    e: Event & {
      currentTarget: EventTarget & HTMLInputElement
    },
  ) => {
    if (!e.currentTarget.files) {
      return
    }

    avatarUploading = true

    const file = e.currentTarget.files[0]

    avatarPath = await uploadImageAndGetPath(file)

    avatarUploading = false
    update()
  }

  const update = async () => {
    if (!config.options) {
      config = Object.assign({}, config, { options: [] })
    }

    const sourceDraft = (config.options?.find(
      (opt) => opt.key === '__draft',
    ) as UndefinedOr<DraftOptions>) ?? { key: '__draft', value: {} }

    const avatarImgSrc = {
      key: 'avatarImgSrc',
      value: avatarPath ?? '',
    }
    const __draft = {
      ...sourceDraft,
      value: {
        ...sourceDraft.value,
        category: projectCategory,
      },
    }
    const options = [
      ...(config.options?.filter(
        ({ key }) => key !== 'avatarImgSrc' && key !== '__draft',
      ) ?? []),
      avatarImgSrc,
      __draft,
    ]

    config = { ...config, name, twitterHandle, options }

    setConfig(config)
  }

  onMount(() => {
    update()
    i18n = i18nBase(navigator.languages)
  })
</script>

<form on:change|preventDefault={(e) => update()} class="grid gap-16">
  <label class="hs-form-field is-filled is-required">
    <span class="hs-form-field__label"> {i18n('ClubName')} </span>
    <input
      class="hs-form-field__input min-w-full max-w-full"
      bind:value={name}
      id="club-name"
      name="club-name"
    />
  </label>

  <label class="hs-select-field is-filled is-required">
    <span class="hs-select-field__label"> {i18n('ProjectCategory')} </span>
    <select
      bind:value={projectCategory}
      id="project-category"
      name="project-category"
      class="hs-select-field__input"
    >
      {#each projectCategories as cat}
        <option value={cat.value}>{cat.label}</option>
      {/each}
    </select>
    <span class="mt-1 text-sm opacity-60"
      >{i18n('PublishingRecommendation')}
      <a
        href="https://support.discord.com/hc/en-us/articles/204849977"
        class="hs-link text-sm text-white"
        target="_blank"
        rel="noopener noreferrer">{i18n('CreatingDiscord')}</a
      >.</span
    >
  </label>

  <label class="hs-form-field is-filled">
    <span class="hs-form-field__label"> {i18n('TwitterHandle')} </span>
    <input
      class="hs-form-field__input min-w-full max-w-full"
      bind:value={twitterHandle}
      id="twitter-handle"
      name="twitter-handle"
    />
    <span class="mt-1 text-sm opacity-60"
      >{i18n('ForExampleTwitterHandle')}</span
    >
  </label>

  <div class="flex flex-col items-start">
    <span class="hs-form-field">
      <span class="hs-form-field__label">{i18n('Avatar')}</span>
    </span>

    {#if avatarUploading}
      <div class="mb-4 h-64 w-64"><Skeleton /></div>
    {:else if avatarPath && avatarPath != ''}
      <div class="bg-dp-blue-grey-600 mb-4 w-64 rounded p-3">
        <img src={avatarPath.toString()} class="rounded" alt="" />
      </div>
    {/if}
    <label class="hs-form-field w-fit" for="avatarPath">
      <span class="hs-button is-filled is-large w-fit cursor-pointer"
        >{i18n('ImageSelect')}</span
      >
      <input
        id="avatarPath"
        name="avatarPath"
        style="display:none"
        type="file"
        on:change={onFileSelected}
      />
    </label>
    <span class="mt-1 text-xs opacity-60">* {i18n('RecommendedImageSize')}</span
    >
  </div>
</form>
