<script lang="ts">
  import { onMount } from 'svelte'
  import { JsonRpcProvider } from 'ethers'
  import { i18nFactory } from '@devprotocol/clubs-core'
  import { type UndefinedOr } from '@devprotocol/util-ts'
  import Skeleton from '@components/Global/Skeleton.svelte'
  import type { Clip, Profile } from '@pages/api/profile'
  import { closeAllModals, openModal } from 'svelte-modals'
  import IconSpotlight from './IconSpotlight.svelte'

  import { Strings } from '../i18n'
  import type { PassportItem } from '../types'
  import PassportAsset from './PassportAsset.svelte'
  import PassportClipEditModal from './PassportClipEditModal.svelte'
  import IconPlus from './IconPlus.svelte'
  import { passportSpotlightClass } from '@fixtures/ui/passport'

  const i18nBase = i18nFactory(Strings)
  let i18n = i18nBase(['en'])

  export let skinIndex = 0
  export let isLocal: boolean
  export let profileFetching = true
  export let profileUpdating = false
  export let isFetchingPurchasedClips = true
  export let profile: Profile = {} as Profile
  export let profileFromAPI: Profile = profile
  export let purchasedClips: PassportItem[] = []
  export let eoa: UndefinedOr<string> = undefined
  export let hasSpotlightLimitReadched: boolean = false
  export let onClickCreateButton: () => void

  let spotlightLength: number

  const rpcProvider = new JsonRpcProvider(
    `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.PUBLIC_ALCHEMY_KEY ?? ''}`,
  )

  onMount(async () => {
    i18n = i18nBase(navigator.languages)
  })

  const undoSkinSpotlightUpdate = async () => {
    profile = {
      ...profile, // Retain other modified fields.
      skins: [
        ...(profile?.skins?.map((skin, index) =>
          index === skinIndex
            ? {
                ...skin,
                spotlight:
                  // if all the stored spotlight have correct data, reset to the stored data.
                  // if not, reset to `[]`.
                  (profileFromAPI?.skins
                    ?.at(skinIndex)
                    ?.spotlight?.every((x) => x.sTokenId)
                    ? profileFromAPI?.skins?.at(skinIndex)?.spotlight
                    : undefined) ?? [],
              }
            : skin,
        ) ?? []), // keep all the other skins before skinIndex.
      ],
    }
  }

  const onClickEditSpotlightClip = (item?: PassportItem) => {
    if (
      !item ||
      !profile?.skins
        ?.at(skinIndex)
        ?.spotlight?.find((clip) => clip.payload === item.payload)
    ) {
      return
    }

    document.body.classList.add('overflow-hidden')
    openModal(PassportClipEditModal, {
      item: item,
      hex: profile?.skins
        ?.at(skinIndex)
        ?.spotlight?.find((clip) => clip.payload === item.payload)
        ?.frameColorHex,
      description:
        profile?.skins
          ?.at(skinIndex)
          ?.spotlight?.find((clip) => clip.payload === item.payload)
          ?.description ?? '',
      onClose: async () => {
        document.body.classList.remove('overflow-hidden')
        closeAllModals()
      },
      closeAllOnFinished: true,
      action: async (
        clip: PassportItem,
        description: string,
        frameColorHex: string,
        method,
      ): Promise<boolean> => {
        if (
          !profile?.skins
            ?.at(skinIndex)
            ?.spotlight?.find((clip) => clip.payload === item.payload)
        ) {
          return false
        }

        if (clip.payload !== item.payload) {
          return false
        }

        try {
          profile = {
            ...profile, // Retain other modified fields.
            skins: [
              ...(profile?.skins?.map((skin, index) =>
                index === skinIndex
                  ? {
                      ...skin, // Retain other skin properties irrespective of whether the skin is modified or not.
                      spotlight:
                        method === 'patch'
                          ? [
                              ...(skin.spotlight?.map((clip) =>
                                clip.sTokenId === item.assetId
                                  ? {
                                      payload: item.payload!,
                                      sTokenId: item.assetId,
                                      description,
                                      frameColorHex,
                                    }
                                  : clip,
                              ) ?? ([] as Clip[])),
                            ]
                          : skin.spotlight?.filter(
                              (x) => x.sTokenId !== item.assetId,
                            ),
                    }
                  : skin,
              ) ?? []), // keep all the other skins before skinIndex.
            ],
          }
          return true
        } catch (e) {
          return false
        }
      },
    })
  }

  const spotlight = (prof: Profile) => prof.skins?.at(skinIndex)?.spotlight
  const purchasedClipsBySkinClip = (clip: Clip, items: PassportItem[]) =>
    items.find((x) => x.assetId === clip.sTokenId)

  $: {
    spotlightLength = spotlight(profile)?.length ?? 0
  }
</script>

<!-- Edit passport skin spotlight clips -->
<div class="w-full">
  <span class="hs-form-field is-filled mt-[76px]">
    <div class="hs-form-field__label flex items-center justify-between mb-1">
      <span class="hs-form-field__label flex items-center gap-2">
        {i18n('PassportSpotlightClips')}
        <IconSpotlight />
        ({spotlightLength ?? 0})
      </span>

      <button
        disabled={!eoa ||
          !purchasedClips.length ||
          profileFetching ||
          isFetchingPurchasedClips ||
          profileUpdating}
        on:click|preventDefault={() => undoSkinSpotlightUpdate()}
        class="hs-button is-filled is-large w-fit text-center">Reset</button
      >
    </div>

    {#if !eoa}
      <div class="rounded-md border border-surface-400 p-8 text-accent-200">
        {i18n('ConnectWalletTryAgain')} :)
      </div>
    {:else if isFetchingPurchasedClips || profileFetching}
      <div
        class="rounded-md border border-surface-400 p-8 text-accent-200 h-48"
      >
        <Skeleton />
      </div>
    {:else if !isFetchingPurchasedClips && !profileFetching && !spotlightLength}
      <p class="text-center text-xl font-bold mb-6">
        {i18n('PinClipsToSpotlightHelper')}
      </p>
      <ul class={passportSpotlightClass(0).container}>
        <li
          class={`h-full rounded bg-surface-400 opacity-50 ${passportSpotlightClass(0).child[0]}`}
        ></li>
        <button
          class={`h-full rounded bg-surface-400 flex items-center justify-center ${passportSpotlightClass(0).child[1]}`}
          on:click={onClickCreateButton}
          ><IconPlus classNames="size-12" />
        </button>
        <li
          class={`h-full rounded bg-surface-400 opacity-50 ${passportSpotlightClass(0).child[2]}`}
        ></li>
      </ul>
    {:else if !isFetchingPurchasedClips && !profileFetching && spotlightLength && purchasedClips?.length}
      {#await Promise.resolve(spotlightLength < 3 && spotlightLength > 0 ? spotlightLength + 1 : spotlightLength) then dummyLength}
        <ul class={passportSpotlightClass(dummyLength).container}>
          {#if spotlightLength < 3}
            <button
              class={`h-full rounded bg-surface-400 flex items-center justify-center ${passportSpotlightClass(dummyLength).child[dummyLength === 2 ? 1 : 2]}`}
              on:click={onClickCreateButton}
              ><IconPlus classNames="size-12" />
            </button>
          {/if}
          {#each spotlight(profile) ?? [] as clip, i}
            <li
              id={`assetsPassportItems-${i.toString()}`}
              class={`empty:hidden ${passportSpotlightClass(dummyLength).child[i]}`}
            >
              <PassportAsset
                props={((item) => ({
                  item: item,
                  provider: rpcProvider,
                  local: isLocal,
                  isEditable: true,
                  editAction: () => onClickEditSpotlightClip(item),
                  description: clip.description,
                  frameColorHex: clip.frameColorHex,
                }))(purchasedClipsBySkinClip(clip, purchasedClips))}
              />
            </li>
          {/each}
        </ul>
      {/await}
    {/if}
  </span>
</div>
