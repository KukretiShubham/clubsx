<script lang="ts">
  import type { ClubsConfiguration } from '@devprotocol/clubs-core'
  import { setConfig } from '@devprotocol/clubs-core'
  import Skeleton from '@components/Global/Skeleton.svelte'
  import { uploadImageAndGetPath } from '@fixtures/imgur'
  export let config: ClubsConfiguration

  const AVATAR_IMG_SRC = 'avatarImgSrc'
  const toggleButtonClasses =
    'rounded-lg disabled:bg-white bg-transparent disabled:text-black text-white p-8 py-4 cursor-pointer'
  let {
    name,
    adminPageVisibility,
    description,
    twitterHandle,
    propertyAddress,
    adminRolePoints,
  } = config
  let avatarPath =
    config.options?.find((opt) => opt.key === AVATAR_IMG_SRC)?.value ?? ''
  let avatarUploading = false
  const MAX_OF_ADMIN_ROLE_HOLDER_POINTS = 95

  const updateConfig = () => {
    adminRolePoints =
      adminRolePoints > MAX_OF_ADMIN_ROLE_HOLDER_POINTS
        ? MAX_OF_ADMIN_ROLE_HOLDER_POINTS
        : adminRolePoints

    const avatarImgSrc = {
      key: AVATAR_IMG_SRC,
      value: avatarPath ?? '',
    }
    const options = [
      ...(config.options?.filter(({ key }) => key !== AVATAR_IMG_SRC) ?? []),
      avatarImgSrc,
    ]

    const updatedConfig = Object.assign(config, {
      name,
      adminPageVisibility,
      description,
      twitterHandle,
      propertyAddress,
      adminRolePoints, // represented in basis points
      options,
    })
    setConfig(updatedConfig)
  }

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
    updateConfig()
  }

  const toggleAdminPageVisibility = () => {
    adminPageVisibility =
      adminPageVisibility !== 'private' ? 'private' : 'public'
    updateConfig()
  }
</script>

<div>
  <div>
    <label class="hs-form-field is-filled is-required mb-10 flex flex-col">
      <span class="hs-form-field__label"> DAO Name </span>
      <input
        class="hs-form-field__input"
        bind:value={name}
        on:change={updateConfig}
        id="dao-name"
        name="dao-name"
      />
    </label>

    <label class="hs-form-field is-filled mb-10 flex flex-col">
      <span class="hs-form-field__label"> Description </span>
      <input
        class="hs-form-field__input"
        bind:value={description}
        on:change={updateConfig}
        id="description"
        name="description"
      />
    </label>

    <label class="hs-form-field is-filled is-required mb-10 flex flex-col">
      <span class="hs-form-field__label"> Editable Role Holder </span>
      <input
        class="hs-form-field__input w-fit"
        bind:value={adminRolePoints}
        on:change={updateConfig}
        id="roleHolder"
        name="roleHolder"
        type="number"
        min="0"
        max={MAX_OF_ADMIN_ROLE_HOLDER_POINTS}
      />
      <span class="hs-form-field__helper">
        This value is the proportion of the tokens minted on Clubs required to
        edit this Club. Note that if you set a higher value than you have, you
        will be locked out.
      </span>
    </label>
    <div class="relative flex flex-col items-start gap-4 p-0 mb-10">
      <p class="font-body text-base font-normal capitalize leading-6">
        Admin Page Visibility
      </p>
      <div class="flex w-full flex-row items-center justify-between gap-4 p-0">
        <div
          class="flex flex-row items-center justify-start gap-8 rounded-lg border-[3px] border-surface-ink p-3"
        >
          <button
            on:click={() => toggleAdminPageVisibility()}
            disabled={adminPageVisibility !== 'private'}
            class={toggleButtonClasses}
          >
            Public
          </button>
          <button
            on:click={() => toggleAdminPageVisibility()}
            disabled={adminPageVisibility === 'private'}
            class={toggleButtonClasses}
          >
            Private
          </button>
        </div>
      </div>
      <span class="text-xs"
        >Keeping the visibilty private restricts viewing to admin & editable
        role holders only</span
      >
    </div>

    <label class="hs-form-field is-filled mb-10 flex flex-col">
      <span class="hs-form-field__label"> Twitter Handle </span>
      <input
        class="hs-form-field__input w-fit"
        bind:value={twitterHandle}
        on:change={updateConfig}
        id="twitter"
        name="twitter"
      />
    </label>

    <div class="hs-form-field">
      <span class="hs-form-field__label">Avatar</span>

      {#if avatarUploading}
        <div class="h-64 w-64"><Skeleton /></div>
      {:else}
        <label
          class="block h-64 w-64 cursor-pointer rounded border border-white/10 bg-black/20 p-3"
        >
          <img
            src={avatarPath.toString()}
            class="h-full w-full rounded object-cover"
            alt=""
          />
          <input
            id="avatarPath"
            name="avatarPath"
            style="display:none"
            type="file"
            on:change={onFileSelected}
          />
        </label>
      {/if}
      <span class="hs-form-field__helper"
        >* Recommended image size is 600px x 600px</span
      >
    </div>
  </div>
</div>
