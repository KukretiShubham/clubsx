<script lang="ts">
  import { ClubsEvents, i18nFactory, setOptions } from '@devprotocol/clubs-core'
  import MembershipOptionCard from './MembershipOption.svelte'
  import { uploadImageAndGetPath } from '@fixtures/imgur'
  import type { Membership } from '@plugins/memberships/index'
  import { isUnpriced, isPriced } from '@plugins/memberships/utils/is'
  import { JsonRpcProvider, ZeroAddress, type Signer } from 'ethers'
  import { onMount } from 'svelte'
  import BigNumber from 'bignumber.js'
  import { clientsSTokens } from '@devprotocol/dev-kit'
  import type { connection as Connection } from '@devprotocol/clubs-core/connection'
  import { buildConfig } from '@devprotocol/clubs-core'
  import {
    DEV_TOKEN_PAYMENT_TYPE_FEE,
    MAX_CUSTOM_FEE,
    MIN_CUSTOM_FEE,
    PAYMENT_TYPE_INSTANT_FEE,
    PAYMENT_TYPE_STAKE_FEE,
  } from '@constants/memberships'
  import { bytes32Hex } from '@devprotocol/clubs-core'
  import { equals } from 'ramda'
  import { emptyDummyImage } from '@plugins/collections/fixtures'
  import { Strings } from './i18n'

  export let site: string = ''
  export let useOnFinishCallback: boolean = false
  export let currentPluginIndex: number
  export let membership: Membership
  export let existingMemberships: Membership[]
  export let base: string = '/admin'
  export let mode: 'edit' | 'create' = 'create'
  export let rpcUrl: string
  export let propertyAddress: string | null | undefined = undefined
  export let clubName: string | undefined = undefined
  const metaOfPayload = bytes32Hex(membership.payload)
  const originalBeneficiary = membership.fee?.beneficiary

  type MembershipPaymentType = 'instant' | 'stake' | 'custom' | ''

  let newMemberships: Membership[]
  let usingAccessControl = Boolean(
    membership.accessControl &&
      membership.accessControl.url &&
      membership.accessControl.description,
  )
  let membershipPaymentType: MembershipPaymentType =
    membership.paymentType ??
    (membership.currency === 'DEV'
      ? 'custom'
      : membership.fee?.percentage === PAYMENT_TYPE_INSTANT_FEE
        ? 'instant'
        : membership.fee?.percentage === PAYMENT_TYPE_STAKE_FEE
          ? 'stake'
          : 'custom')
  let membershipCustomFee100: number = membership.fee
    ? membership.fee.percentage * 100
    : membership.currency === 'DEV'
      ? DEV_TOKEN_PAYMENT_TYPE_FEE * 100
      : 0
  let updatingMembershipsStatus: boolean = false
  let noOfPositions: number = 0
  let invalidPriceMsg: string = ''
  let invalidFeeMsg: string = ''
  let accessControl = membership.accessControl ?? { url: '', description: '' }

  const originalId = membership.id
  const provider = new JsonRpcProvider(rpcUrl)
  let loading = false

  let connection: typeof Connection
  let signer: Signer | undefined
  let currentAddress: string | undefined

  const minPrice = 0.000001
  const maxPrice = 1e20
  const minCustomFee100 = MIN_CUSTOM_FEE
  const maxCustomFee100 = MAX_CUSTOM_FEE
  const i18nBase = i18nFactory(Strings)
  let i18n = i18nBase(['en'])

  const beneficiary = () =>
    (originalBeneficiary === ZeroAddress ? undefined : originalBeneficiary) ??
    currentAddress ??
    ZeroAddress

  const deleteMembership = (selectedMembership: Membership) => {
    updatingMembershipsStatus = true

    const membership = existingMemberships.find(
      (m: Membership) =>
        JSON.stringify(m.payload) ===
        JSON.stringify(selectedMembership.payload), // Using only payload for check handles membership name, id edits as well.
    )

    if (!membership) {
      return
    }

    setOptions(
      [
        {
          key: 'memberships',
          value: [
            ...existingMemberships.filter(
              (m: Membership) => m.id !== membership.id, // We use m.id and membership.id because selectedMembership.id might have changed (if edited)
            ),
            { ...selectedMembership, deprecated: true }, // Using `selectedMembership` handles edit membership while activating/deleting
          ],
        },
      ],
      currentPluginIndex,
    )

    setTimeout(buildConfig, 50)
  }

  const setMembershipToUnpriced = () => {
    membership = {
      ...membership,
      price: undefined,
      currency: undefined,
    }
    membershipCustomFee100 = 0
    membershipPaymentType = 'custom'
    update()
  }

  const updateMembershipPriceType = (unpriced: boolean = false) => {
    if (unpriced) {
      setMembershipToUnpriced()
    } else {
      membership = {
        ...membership,
        price: 0,
        currency: 'USDC',
      }
      update()
    }
  }

  const activateMembership = (selectedMembership: Membership) => {
    updatingMembershipsStatus = true

    const membership = existingMemberships.find(
      (m: Membership) =>
        JSON.stringify(m.payload) ===
        JSON.stringify(selectedMembership.payload),
    )

    if (!membership) {
      return
    }

    setOptions(
      [
        {
          key: 'memberships',
          value: [
            ...existingMemberships.filter(
              (m: Membership) => m.id !== membership.id,
            ),
            { ...selectedMembership, deprecated: false },
          ],
        },
      ],
      currentPluginIndex,
    )

    setTimeout(buildConfig, 50)
  }

  const changeMembershipPaymentType = async (type: MembershipPaymentType) => {
    if (!isPriced(membership)) {
      setMembershipToUnpriced()
      return // Further action is not allowed for unpriced membership.
    }

    if (membership.currency === 'DEV') {
      // Update the membership fee in case of currency change to dev token.
      membershipPaymentType = 'custom'
      membershipCustomFee100 = 0
      membership = {
        ...membership,
        fee: {
          percentage: DEV_TOKEN_PAYMENT_TYPE_FEE,
          beneficiary: beneficiary(),
        },
        paymentType: 'custom',
      }

      update() // Trigger update manually as this corresponsing field doesn't trigger <form> on change event.
      return
    }

    if (type === 'instant') {
      // Update the membership state directly
      membership = {
        ...membership,
        fee: {
          percentage: PAYMENT_TYPE_INSTANT_FEE,
          beneficiary: beneficiary(),
        },
        paymentType: 'instant',
      }
    }

    // Update the membership state directly
    if (type === 'stake') {
      membership = {
        ...membership,
        fee: {
          percentage: PAYMENT_TYPE_STAKE_FEE,
          beneficiary: beneficiary(),
        },
        paymentType: 'stake',
      }
    }

    if (type === 'custom') {
      membership = {
        ...membership,
        fee: {
          percentage: membershipCustomFee100 / 100,
          beneficiary: beneficiary(),
        },
        paymentType: 'custom',
      }
    }

    membershipPaymentType = type
    update() // Trigger update manually as this corresponsing field doesn't trigger <form> on change event.
  }

  const connectOnMount = async () => {
    const _connection = await import('@devprotocol/clubs-core/connection')
    connection = _connection.connection
    connection().signer.subscribe((s) => {
      signer = s
    })
    connection().account.subscribe((a) => {
      currentAddress = a
      update()
    })
  }

  onMount(() => {
    onChangePrice()
    onChangeName()
    fetchPositionsOfProperty()
    update()
    connectOnMount()
    i18n = i18nBase(navigator.languages)

    const membershipDescriptionElement = document.getElementById(
      'membership-description',
    )
    if (membershipDescriptionElement) {
      membershipDescriptionElement!.style.height =
        membershipDescriptionElement!.scrollHeight + 'px'
      membershipDescriptionElement!.oninput = async () => {
        membershipDescriptionElement!.style.height = 'auto'
        membershipDescriptionElement!.style.height =
          membershipDescriptionElement!.scrollHeight + 'px'
      }
    }

    if (useOnFinishCallback) {
      document.body.addEventListener(
        ClubsEvents.FinishConfiguration,
        onFinishCallback,
      )
    }
  })

  const validateMembershipPrice = (event: Event) => {
    const value = Number((event.target as HTMLInputElement)?.value || 0)

    if (value < minPrice) {
      invalidPriceMsg = `${i18n('MaximumPrice')} ${minPrice}`
    } else if (value > maxPrice) {
      invalidPriceMsg = `${i18n('MaximumPrice')} ${maxPrice.toExponential(3)}`
    } else {
      invalidPriceMsg = ''
    }
  }

  const validateCustomMembershipFee = (event: Event) => {
    const value = Number((event.target as HTMLInputElement)?.value || 0)

    if (value < minCustomFee100) {
      invalidFeeMsg = `${i18n('MinimumFee')} ${minCustomFee100}`
    } else if (value > maxCustomFee100) {
      invalidFeeMsg = `${i18n('MaximumPrice')} ${maxCustomFee100}`
    } else {
      invalidFeeMsg = ''
    }
  }

  const update = () => {
    if (
      isPriced(membership) &&
      (membership.price < minPrice ||
        membership.price > maxPrice ||
        membershipPaymentType === '')
    ) {
      return
    }

    const search = mode === 'edit' ? originalId : membership.id
    membership.accessControl = usingAccessControl ? accessControl : undefined

    if (membership.fee && membership.fee.percentage > 0) {
      membership = {
        ...membership,
        fee: {
          ...membership.fee,
          beneficiary: beneficiary(),
        },
      }
    }

    newMemberships = existingMemberships.some(({ id }) => id === search)
      ? // If the ID is already exists, override it. This is a safeguard to avoid duplicate data.
        existingMemberships.map((_mem) =>
          _mem.id === search ? membership : _mem,
        )
      : // If not, add it.
        [...existingMemberships, membership]

    setOptions(
      [{ key: 'memberships', value: newMemberships }],
      currentPluginIndex,
    )
  }

  const onFileSelected = async (
    e: Event & {
      currentTarget: EventTarget & HTMLInputElement
    },
  ) => {
    if (!e.currentTarget.files || !membership) {
      return
    }

    const file = e.currentTarget.files[0]

    const updatedImagepath =
      (await uploadImageAndGetPath(file)) || emptyDummyImage(400, 400)

    membership.imageSrc = updatedImagepath
    membership = {
      ...membership,
    }

    update()
  }

  const onChangeName = () => {
    let id = membership.name.toLowerCase().replace(/\W/g, '-')
    // Duplication detection
    let count = 1
    let _id = id
    while (
      existingMemberships
        .filter((m) => equals(m.payload, membership.payload) === false)
        .some((x) => x.id === id)
    ) {
      count = count + 1
      id = `${_id}-${count}`
    }

    membership.id = id
  }

  const onChangePrice = async () => {
    if (!isPriced(membership)) {
      setMembershipToUnpriced()
      return // Not allowed when membership is unpriced.
    }

    const value = membership.price

    if (value < minPrice) {
      membership.price = minPrice
      invalidPriceMsg = `${i18n('PriceSetMin')} - ${minPrice}`
    } else if (value > maxPrice) {
      membership.price = maxPrice
      invalidPriceMsg = `${i18n('PriceSetMax')} - ${maxPrice.toExponential(3)}`
    } else {
      invalidPriceMsg = ''
    }

    if (membership.price === 0 || !membership.price) {
      return
    }
  }

  const onChangeCustomFee = async () => {
    if (!isPriced(membership)) {
      setMembershipToUnpriced()
      return // Futher steps are not allowed for unpriced memberships.
    }

    if (membership.currency === 'DEV') {
      // Update the membership fee in case of currency change to dev token.
      membershipPaymentType = 'custom'
      membershipCustomFee100 = 0
      invalidFeeMsg = ''
      membership = {
        ...membership,
        fee: {
          beneficiary: beneficiary(),
          percentage: DEV_TOKEN_PAYMENT_TYPE_FEE,
        },
        paymentType: 'custom',
      }

      // Trigger update manually as this corresponsing field doesn't trigger <form> on change event.
      update()
      return
    }

    const value = membershipCustomFee100

    if (value < minCustomFee100) {
      membershipCustomFee100 = minCustomFee100
      invalidFeeMsg = `${i18n('FeeSetMin')} - ${minCustomFee100}`
    } else if (value > maxCustomFee100) {
      membershipCustomFee100 = maxCustomFee100
      invalidFeeMsg = `${i18n('FeeSetMax')} - ${maxCustomFee100}`
    } else {
      invalidFeeMsg = ''
    }

    // Update the membership state.
    membership = {
      ...membership,
      fee: {
        percentage: membershipCustomFee100 / 100,
        beneficiary: beneficiary(),
      },
      paymentType: 'custom',
    }

    // Trigger update manually as this corresponsing field doesn't trigger <form> on change event.
    update()

    if (membershipCustomFee100 === 0 || !membershipCustomFee100) {
      return
    }
  }

  const cancel = () => {
    const preset = existingMemberships.find(
      (preset) => preset.id === membership.id,
    )

    if (!preset) {
      console.error('no matching preset found for: ', membership.id)
      return
    }

    membership = preset
    // Redirect to base page
    window.location.href = base
  }

  const fetchPositionsOfProperty = async () => {
    loading = true

    if (mode === 'create' || !provider || !propertyAddress) {
      loading = false
      return
    }

    const [l1, l2] = await clientsSTokens(provider)

    const contract = l1 ?? l2
    const positions = await contract?.positionsOfProperty(propertyAddress)

    if (!positions || !positions?.length) {
      loading = false
      return
    }

    const filter = await Promise.all(
      positions.map(async (position) => {
        const positionPayload = await contract?.payloadOf(position)
        return (
          bytes32Hex(
            typeof membership.payload === typeof {} // If membership.payload is an object
              ? new Uint8Array(Object.values(membership.payload)) // then we use only values
              : membership.payload, // else we use the array/string directly
          ) === positionPayload
        )
      }),
    )
    noOfPositions = filter.filter((x) => x).length
    loading = false
  }

  const toggleAccessControl = (v: boolean) => () => {
    usingAccessControl = v
    update()
  }

  const onFinishCallback = async (ev: any) => {
    updatingMembershipsStatus = false

    if (!ev.detail.success) {
      return
    }

    location.href = new URL(
      '/admin/memberships/?ping=publish',
      location.origin,
    ).toString()
  }

  const resetMembershipFee = () => {
    if (!isPriced(membership)) {
      setMembershipToUnpriced()
      return // Futher steps are not allowed for unpriced memberships.
    }

    if (membership.currency !== 'DEV') return

    membershipCustomFee100 = 0
    membershipPaymentType = 'custom'
    invalidFeeMsg = ''
    // Update the membership state.
    membership = {
      ...membership,
      fee: {
        percentage: membershipCustomFee100,
        beneficiary: beneficiary(),
      },
      paymentType: 'custom',
    }
  }
</script>

<div class="relative grid gap-16">
  <!-- Form no editable message -->
  {#if loading}
    <p class="animate-pulse bg-gray-500/60 rounded text-transparent">.</p>
  {/if}
  {#if !loading && noOfPositions > 0}
    <p class="text-center bg-dp-yellow-200 rounded text-dp-yellow-ink">
      ⚠️ {i18n('MembershipInUse')}
    </p>
  {/if}
  <form on:change|preventDefault={(_) => update()} class="grid gap-16">
    <div class="grid gap-16 lg:grid-cols-[3fr_2fr]">
      <!-- Form -->
      <div class="grid gap-8">
        <!-- Name -->
        <label class="hs-form-field is-filled is-required">
          <span class="hs-form-field__label"> Name </span>
          <input
            class="hs-form-field__input"
            bind:value={membership.name}
            on:change={onChangeName}
            id="membership-name"
            name="membership-name"
          />
        </label>

        <!-- Image -->
        <div class="hs-form-field">
          <span class="hs-form-field__label">{i18n('Image')}</span>

          <label
            class="hs-button is-filled w-fit cursor-pointer rounded-lg px-12 py-4"
          >
            <span class="hs-button__label">{i18n('UploadToChangeImage')}</span>
            <input
              id="avatarPath"
              name="avatarPath"
              style="display:none"
              type="file"
              accept=".jpg, .jpeg, .png, .gif, .apng, .tiff"
              on:change={onFileSelected}
            />
          </label>
          <p class="hs-form-field__helper mt-2">
            * JPEG, PNG, GIF, TIFF and animated PNG
          </p>
          <span class="hs-form-field__helper"
            >* {i18n('RecommendedImageSize')}</span
          >

          <p>
            <a
              href="https://docs.google.com/presentation/d/1bbQhOktQoaA5ynQB1RgvOc4eMWlMHFDliw1DmS35w8Y/edit?usp=sharing"
              target="_blank"
              class="hs-button is-filled is-small mt-8 w-fit"
              rel="noopener noreferrer"
            >
              <span class="hs-button__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 13.5l3 3m0 0l3-3m-3 3v-6m1.06-4.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
              </span>
              <span class="hs-button__label">
                {i18n('UseGoogleSlidesTemplate')}
              </span>
            </a>
          </p>
        </div>

        <!-- Price -->
        <div class="hs-form-field is-filled is-required">
          <span class="hs-form-field__label"> {i18n('Price')} </span>
          <div
            class="flex w-full max-w-full items-center justify-start gap-1 mb-2"
          >
            <button
              on:click|preventDefault={() => updateMembershipPriceType(false)}
              class={`hs-button is-large is-filled flex max-w-[33%] grow items-center justify-center gap-2 ${
                isUnpriced(membership) ? 'opacity-50' : ''
              }`}
              id="membership-priced"
              name="membership-priced"
            >
              {i18n('Priced')}
            </button>
            <button
              on:click|preventDefault={() => updateMembershipPriceType(true)}
              class={`hs-button is-large is-filled flex max-w-[33%] grow items-center justify-center gap-2 ${
                isUnpriced(membership) ? '' : 'opacity-50'
              }`}
              id="membership-unpriced"
              name="membership-unpriced"
            >
              {i18n('Unpriced')}
            </button>
          </div>
          {#if isUnpriced(membership)}
            <div
              class="flex w-full max-w-full items-center justify-start gap-1"
            >
              <p class="hs-form-field__helper mt-2">
                * {i18n('UnpricedCannotBeBought')},
                <u>{i18n('AvailableInviteOnly')}</u>
              </p>
            </div>
          {/if}
          {#if isPriced(membership)}
            <div
              class="flex w-full max-w-full items-center justify-start gap-1"
            >
              <input
                class="hs-form-field__input grow"
                bind:value={membership.price}
                on:change={onChangePrice}
                on:keyup={validateMembershipPrice}
                id="membership-price"
                name="membership-price"
                type="number"
                min={minPrice}
                max={maxPrice}
              />
              <select
                bind:value={membership.currency}
                name="membership-currency"
                class="hs-form-field__input w-fit"
                id="membership-currency"
                on:change={resetMembershipFee}
              >
                <option value="USDC" class="bg-primary-200 text-primary-ink"
                  >USDC</option
                >
                <option value="ETH" class="bg-primary-200 text-primary-ink"
                  >ETH</option
                >
                <option value="MATIC" class="bg-primary-200 text-primary-ink"
                  >MATIC</option
                >
                <option value="DEV" class="bg-primary-200 text-primary-ink"
                  >DEV</option
                >
              </select>
            </div>
            <p class="hs-form-field__helper mt-2">
              *
              <a
                class="hs-form-field__helper"
                target="”_blank”"
                href={`http://${site}.clubs.place/admin/marketplace/devprotocol:clubs:plugin:pay-by-card`}
                >{@html i18n('ChoosingUSDC')}
                {@html i18n('CreditCardPlugin')}</a
              >
            </p>
            {#if invalidPriceMsg !== ''}
              <p class="text-danger-300">* {invalidPriceMsg}</p>
            {/if}
          {/if}
        </div>

        {#if isPriced(membership)}
          <!-- Earning model -->
          <div class="hs-form-field is-filled is-required">
            <span class="hs-form-field__label"> {i18n('EarningModel')} </span>
            <div
              class="flex w-full max-w-full items-center justify-start gap-2"
            >
              <button
                on:click|preventDefault={() =>
                  changeMembershipPaymentType('instant')}
                class={`hs-button is-large is-filled flex max-w-[33%] grow items-center justify-center gap-2 ${
                  membershipPaymentType !== 'instant' && 'opacity-50'
                }`}
                id="membership-fee-instant"
                name="membership-fee-instant"
                disabled={membership.currency === 'DEV'}
              >
                <span class="h-auto w-auto max-w-[48%]">
                  <svg
                    width="22"
                    height="19"
                    viewBox="0 0 22 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.69141 1.75H5.60341C5.12236 1.75009 4.654 1.90435 4.26705 2.19015C3.8801 2.47595 3.59494 2.87824 3.45341 3.338L1.04141 11.177C0.975343 11.3911 0.941638 11.6139 0.941406 11.838V16C0.941406 16.5967 1.17846 17.169 1.60042 17.591C2.02237 18.0129 2.59467 18.25 3.19141 18.25H18.1914C18.7881 18.25 19.3604 18.0129 19.7824 17.591C20.2044 17.169 20.4414 16.5967 20.4414 16V11.838C20.4414 11.614 20.4074 11.391 20.3414 11.177L17.9314 3.338C17.7899 2.87824 17.5047 2.47595 17.1178 2.19015C16.7308 1.90435 16.2625 1.75009 15.7814 1.75H13.6914M0.941406 11.5H4.80141C5.2192 11.5001 5.62872 11.6165 5.98408 11.8363C6.33944 12.056 6.6266 12.3703 6.81341 12.744L7.06941 13.256C7.25628 13.6299 7.54361 13.9443 7.89916 14.164C8.25471 14.3837 8.66444 14.5001 9.08241 14.5H12.3004C12.7184 14.5001 13.1281 14.3837 13.4837 14.164C13.8392 13.9443 14.1265 13.6299 14.3134 13.256L14.5694 12.744C14.7563 12.3701 15.0436 12.0557 15.3992 11.836C15.7547 11.6163 16.1644 11.4999 16.5824 11.5H20.4414M10.6914 1V9.25M10.6914 9.25L7.69141 6.25M10.6914 9.25L13.6914 6.25"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                Instant
              </button>
              <button
                on:click|preventDefault={() =>
                  changeMembershipPaymentType('stake')}
                class={`hs-button is-large is-filled flex max-w-[33%] grow items-center justify-center gap-2 ${
                  membershipPaymentType !== 'stake' && 'opacity-50'
                }`}
                id="membership-fee-stake"
                name="membership-fee-stake"
                disabled={membership.currency === 'DEV'}
              >
                <span class="h-auto w-auto max-w-[48%]">
                  <svg
                    width="22"
                    height="20"
                    viewBox="0 0 22 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.32422 1V12.25C2.32422 12.8467 2.56127 13.419 2.98323 13.841C3.40519 14.2629 3.97748 14.5 4.57422 14.5H6.82422M2.32422 1H0.824219M2.32422 1H18.8242M6.82422 14.5H14.3242M6.82422 14.5L5.82422 17.5M18.8242 1H20.3242M18.8242 1V12.25C18.8242 12.8467 18.5872 13.419 18.1652 13.841C17.7433 14.2629 17.171 14.5 16.5742 14.5H14.3242M14.3242 14.5L15.3242 17.5M5.82422 17.5H15.3242M5.82422 17.5L5.32422 19M15.3242 17.5L15.8242 19M6.07422 10L9.07422 7L11.2222 9.148C12.2314 7.69929 13.5464 6.48982 15.0742 5.605"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                Stake
              </button>
              <div class="max-w-[33%] grow">
                {#if membershipPaymentType !== 'custom'}
                  <button
                    on:click|preventDefault={() =>
                      changeMembershipPaymentType('custom')}
                    class="hs-button is-large is-filled w-full max-w-full opacity-50"
                    id="membership-fee-custom"
                    name="membership-fee-custom"
                    disabled={membership.currency === 'DEV'}>Custom</button
                  >
                {/if}
                {#if membershipPaymentType === 'custom'}
                  <input
                    bind:value={membershipCustomFee100}
                    on:change={onChangeCustomFee}
                    on:keyup={validateCustomMembershipFee}
                    class="hs-form-field__input w-full max-w-full"
                    id="membership-fee-value"
                    name="membership-fee-value"
                    type="number"
                    disabled={membership.currency === 'DEV'}
                    min={minCustomFee100}
                    max={maxCustomFee100}
                  />
                {/if}
              </div>
            </div>
            {#if membership.currency === 'DEV'}
              <p class="hs-form-field__helper mt-2">
                * {i18n('DEVEarningModelDisabled')}
              </p>
            {/if}
            {#if invalidFeeMsg !== ''}
              <p class="text-danger-300">* {invalidFeeMsg}</p>
            {/if}
          </div>

          <!-- Earning info -->
          <div class="hs-form-field">
            <div class="flex w-full max-w-full gap-0 p-0">
              <div
                style="width: {(membership.fee?.percentage || 0) *
                  100}% !important"
                class="h-6 max-w-full rounded-[99px] bg-[#00D0FD]"
              ></div>
              <div
                style="width: {100 -
                  (membership.fee?.percentage || 0) * 100}% !important"
                class="h-6 max-w-full rounded-[99px] bg-[#43C451]"
              ></div>
            </div>
            <p class="mt-1">
              <span class="text-[#00D0FD]"
                >{BigNumber(
                  membership.price * (membership.fee?.percentage || 0),
                )
                  .dp(5)
                  .toString()}
                {membership.currency} ({BigNumber(
                  (membership.fee?.percentage || 0) * 100,
                )
                  .dp(3)
                  .toString()}%)</span
              >
              {i18n('WillEarnAtOnce')}
              <span class="text-[#43C451]"
                >{BigNumber(
                  membership.price * (1 - (membership.fee?.percentage || 0)),
                )
                  .dp(5)
                  .toString()} ({BigNumber(
                  (1 - (membership.fee?.percentage || 0)) * 100,
                )
                  .dp(3)
                  .toString()}%)
              </span>
              {i18n('WillBeStaked')}
            </p>
            <p class="hs-form-field__helper mt-2">
              * <a
                class="hs-form-field__helper"
                target="”_blank”"
                href={`${i18n('WhatIsStakingLink')}`}
                ><u>{i18n('WhatIsStaking')}</u></a
              >
            </p>
          </div>
        {/if}
      </div>

      <!-- Preview -->
      <div class="relative top-0">
        <h3>Preview</h3>
        <div class="sticky top-4">
          <MembershipOptionCard
            clubName={clubName ?? 'Your Club'}
            id={membership.id}
            name={membership.name}
            imagePath={membership.imageSrc}
            price={membership.price?.toString()}
            currency={membership.currency}
            description={membership.description}
          />
        </div>
      </div>
    </div>

    <!-- Description -->
    <label class="hs-form-field is-filled is-required">
      <span class="hs-form-field__label"> {i18n('Description')} </span>
      <textarea
        class="hs-form-field__input"
        bind:value={membership.description}
        id="membership-description"
        name="membership-description"
      />
      <span class="hs-form-field__helper">
        {i18n('MarkdownAvailable')}
        <a
          href="https://www.markdownguide.org/basic-syntax"
          target="_blank"
          class="underline [font-size:inherit]"
          rel="noopener noreferrer">({i18n('WhatIsMarkdown')} ↗)</a
        >
      </span>
    </label>

    <!-- Display payload as string -->
    <label class="hs-form-field">
      <span class="hs-form-field__label"> {i18n('Payload')} </span>
      <input class="hs-form-field__input" value={metaOfPayload} readonly />
    </label>

    <!-- Access control -->
    <div class="hs-form-field is-filled">
      <span class="hs-form-field__label"> {i18n('AccessControl')} </span>
      <div class="grid max-w-md grid-cols-2 items-center justify-start gap-2">
        <button
          on:click|preventDefault={toggleAccessControl(false)}
          data-is-selected={usingAccessControl === false}
          class="hs-button is-large is-filled data-[is-selected=false]:opacity-50"
        >
          {i18n('Public')}
        </button>
        <button
          on:click|preventDefault={toggleAccessControl(true)}
          data-is-selected={usingAccessControl === true}
          class="hs-button is-large is-filled data-[is-selected=false]:opacity-50"
        >
          {i18n('Private')}
        </button>
      </div>
    </div>

    {#if usingAccessControl}
      <label class="hs-form-field is-filled is-required">
        <span class="hs-form-field__label"> {i18n('AccessControlURL')} </span>
        <input
          class="hs-form-field__input"
          bind:value={accessControl.url}
          on:change={update}
        />
        <span class="hs-form-field__helper">
          App requests <pre class="inline">[GET] /?account=0x...</pre>
          are expected to be returned 1 if verified.
        </span>
      </label>

      <label class="hs-form-field is-filled is-required">
        <span class="hs-form-field__label">
          {i18n('DescriptionOfVerification')}
        </span>
        <textarea
          class="hs-form-field__input"
          bind:value={accessControl.description}
          on:change={update}
        />
        <span class="hs-form-field__helper">
          {i18n('MarkdownAvailable')}
          <a
            href="https://www.markdownguide.org/basic-syntax"
            target="_blank"
            class="underline [font-size:inherit]"
            rel="noopener noreferrer">({i18n('WhatIsMarkdown')} ↗)</a
          >
        </span>
      </label>
    {/if}

    <div class="flex w-full justify-end gap-[20px]">
      {#if mode === 'edit' && !membership.deprecated}
        <button
          class={`hs-button is-filled is-error w-fit ${
            updatingMembershipsStatus ? 'animate-pulse bg-gray-500/60' : ''
          }`}
          on:click|preventDefault={() => deleteMembership(membership)}
        >
          <span class="hs-button__label"> Delete </span>
        </button>
      {/if}
      {#if mode === 'edit' && membership.deprecated}
        <button
          class={`hs-button is-filled w-fit ${
            updatingMembershipsStatus ? 'animate-pulse bg-gray-500/60' : ''
          }`}
          on:click|preventDefault={() => activateMembership(membership)}
        >
          <span class="hs-button__label"> {i18n('Activate')} </span>
        </button>
      {/if}
      <button
        class="hs-button is-outlined is-error"
        on:click|preventDefault={() => cancel()}
      >
        <span class="hs-button__label">{i18n('Cancel')}</span>
      </button>
    </div>
  </form>
</div>
