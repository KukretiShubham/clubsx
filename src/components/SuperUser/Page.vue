<script lang="ts" setup>
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { randomBytes, ZeroAddress } from 'ethers'
import { combineLatest } from 'rxjs'
import { onMounted, ref } from 'vue'
import type { ContractRunner, Signer } from 'ethers'
import { clientsSTokens } from '@devprotocol/dev-kit'
import {
  decode,
  encode,
  membershipToStruct,
  type ClubsConfiguration,
} from '@devprotocol/clubs-core'
import {
  whenDefined,
  whenDefinedAll,
  type UndefinedOr,
} from '@devprotocol/util-ts'

import type { RefApiCalling } from './utils'
import { bytes32Hex } from '@devprotocol/clubs-core'
import type { Membership } from '@plugins/memberships'
import type { PassportItemIndexDoc } from '@pages/passport/types'
import type { ReqBodyAchievement } from '@plugins/achievements/handlers/addAchievement'
import {
  address,
  callSimpleCollections,
} from '@plugins/memberships/utils/simpleCollections'
import {
  callAddAchievement,
  changeMaxRedemptions,
  changeMetaDescription,
  changeMetaImage,
  changeMetaName,
  changeRecipients,
  resetMaxRedemptions,
  resetRecipients,
} from './utils/achievements'

dayjs.extend(utc)

const props = defineProps<{ plugins: { id: string; name: string }[] }>()

let chainId: UndefinedOr<number>
let signerObj: UndefinedOr<Signer>
let providerObj: UndefinedOr<ContractRunner>

const club = ref<string>()
const account = ref<string>()
const message = () => `I'm a superuser @ts:${dayjs().utc().toDate().getTime()}`
const apiCalling: RefApiCalling = ref<{
  result?: any
  error?: string
  progress?: boolean
  status?: string
}>()
const plugins = ref(
  props.plugins.map((plg) => ({
    ...plg,
    willInstall: false,
    willUninstall: false,
  })),
)
const achievement = ref<Partial<ReqBodyAchievement['achievement']>>({})
const passportItem = ref<{
  membership: Partial<Membership>
  item: Partial<PassportItemIndexDoc>
}>({ membership: {}, item: {} })

const sign = async () => {
  const msg = message()
  const sig = await signerObj?.signMessage(msg)
  return { signature: sig, message: msg }
}

const fetchClubs = async (
  site: string,
): Promise<{ content: string | null; message: string }> =>
  fetch(`/api/config/${site}`).then((r) => r.json())

const install = async () => {
  const { signature: sig, message: msg } = await sign()
  apiCalling.value = { progress: true }
  const installPlugins = plugins.value.filter(
    ({ willInstall }) => willInstall === true,
  )
  const ids = installPlugins.map(({ id }) => id)
  const currentConfig = whenDefined(
    (await whenDefined(club.value, fetchClubs))?.content,
    decode,
  )
  const nextConfig = whenDefined(currentConfig, (base) => ({
    ...base,
    plugins: [
      ...base.plugins.filter(({ id }) => ids.includes(id) === false),
      ...installPlugins.map(({ id }) => ({ id, options: [] })),
    ],
  }))
  console.log({
    installPlugins,
    currentConfig,
    nextConfig,
  })
  const api = await whenDefined(nextConfig, (conf) =>
    fetch('/api/superuser/config', {
      method: 'POST',
      body: JSON.stringify({
        site: club.value,
        message: msg,
        signature: sig,
        config: encode(conf),
      }),
    }),
  )
  const res = (await api?.json()) as { result: string; error?: string }
  apiCalling.value = { progress: false, result: res.result, error: res.error }
}

const addAchievement = async () => {
  const { signature: sig, message: msg } = await sign()
  callAddAchievement(achievement, apiCalling, {
    site: club.value ?? '',
    signature: sig ?? '',
    message: msg,
  })
}

const setTokenURIDescriptor = async (
  currentConfig: UndefinedOr<ClubsConfiguration>,
) => {
  if (!providerObj || !signerObj) {
    return false
  }

  const [l1, l2] = await clientsSTokens(providerObj ?? signerObj)
  const sTokensManager = l1 ?? l2
  const customDescriptorAddress = address.find(
    ({ chainId: chainId_ }) => chainId_ === chainId,
  )?.address
  return (
    (await whenDefinedAll(
      [
        sTokensManager,
        currentConfig,
        customDescriptorAddress,
        passportItem.value.membership.payload,
      ],
      ([cont, conf, descriptorAddress, payload]) =>
        cont
          .setTokenURIDescriptor(conf.propertyAddress, descriptorAddress, [
            bytes32Hex(payload),
          ])
          .then((res) => res.wait())
          .then((res) => res?.status)
          .then((res) => (res ? true : false))
          .catch((err: Error) => {
            console.error('Error in setTokenURIDescriptor:', err)
            return err
          }),
    )) ?? false
  )
}

const setInConfig = async (
  currentConfig: UndefinedOr<ClubsConfiguration>,
  sig: string | undefined,
  msg: string,
) => {
  apiCalling.value = { progress: true, status: 'Setting value in config' }

  const nextConfig = whenDefined(currentConfig, (base) => ({
    ...base,
    offerings: [
      ...(base?.offerings?.filter(
        (offering) =>
          bytes32Hex(offering.payload) !==
          bytes32Hex(passportItem.value.membership.payload ?? ''),
      ) ?? []),
      {
        ...passportItem.value.membership,
      } as Membership,
    ],
  }))

  console.log({
    currentConfig,
    nextConfig,
  })

  // TODO: remove this to call the API.
  const api = await whenDefined(nextConfig, (conf) =>
    fetch('/api/superuser/config', {
      method: 'POST',
      body: JSON.stringify({
        site: club.value,
        message: msg,
        signature: sig,
        config: encode(conf),
      }),
    }),
  )
  const res = (await api?.json()) as { result: string; error?: string }
  apiCalling.value = {
    progress: false,
    result: res.result,
    error: res.error,
    status: res.error ? '' : 'Set in config check it now',
  }
}

const setImage = async (currentConfig: UndefinedOr<ClubsConfiguration>) => {
  return (
    (await whenDefinedAll(
      [
        callSimpleCollections,
        currentConfig,
        passportItem.value.membership.payload,
        signerObj,
      ],
      ([func, conf, payload, signer]) =>
        func(signer, 'setImages', [
          conf.propertyAddress,
          [
            membershipToStruct(
              {
                ...passportItem.value.membership,
              } as Membership,
              chainId as number,
            ),
          ],
          [bytes32Hex(payload)],
        ])
          .then((res) => res.wait())
          .then((res) => res?.status)
          .then((res) => (res ? true : false))
          .catch((err: Error) => err),
    )) ?? false
  )
}

const deploySToken = async () => {
  if (!providerObj || !signerObj) {
    return
  }

  apiCalling.value = { progress: true, status: 'Started adding passport item' }

  const currentConfig = whenDefined(
    (await whenDefined(club.value, fetchClubs))?.content,
    decode,
  )

  apiCalling.value = {
    progress: true,
    status: 'Started setting setTokenURIDescriptor for item',
  }
  const isDescriptorSet = await setTokenURIDescriptor(currentConfig)
  if (!isDescriptorSet || isDescriptorSet instanceof Error) {
    apiCalling.value = {
      progress: true,
      status: '',
      error: 'Failed in setting setTokenURIDescriptor for item',
    }

    return
  }

  apiCalling.value = {
    progress: true,
    status: 'Started setting setImage for item',
  }
  const isImageSet = await setImage(currentConfig)
  if (!isImageSet || isImageSet instanceof Error) {
    apiCalling.value = {
      progress: true,
      status: '',
      error: 'Failed in setting setImage for item',
    }
    return
  }

  const { signature: sig, message: msg } = await sign()
  await setInConfig(currentConfig, sig, msg)
  await setInPassportIndex(sig, msg)
}

const setInPassportIndex = async (sig: string | undefined, msg: string) => {
  apiCalling.value = {
    progress: true,
    status: 'Setting value in passportindex',
  }

  const pluginId =
    plugins.value.find((plgn) => plgn.name.toLowerCase() === 'passport')?.id ??
    'devprotocol:clubs:plugin:passport'
  const api = await whenDefined(pluginId, (conf) =>
    fetch(
      `${window.location.host.includes('clubs.place') ? 'https' : 'http'}://${club.value}.${window.location.host}/api/${pluginId}/passport/add`,
      {
        method: 'POST',
        body: JSON.stringify({
          site: club.value,
          message: msg,
          signature: sig,
          passportItem: {
            itemAssetType: passportItem.value.item.itemAssetType,
            itemAssetValue: passportItem.value.item.itemAssetValue,
            sTokenPayload: bytes32Hex(passportItem.value.membership.payload),
          },
        }),
      },
    ),
  )
  const res = (await api?.json()) as { result: string; error?: string }
  apiCalling.value = {
    progress: false,
    result: res.result,
    error: res.error,
    status: res.error ? '' : 'Set in config check it now',
  }
}

const onChangeFeePercentage = async (ev: Event) => {
  passportItem.value.membership.fee = {
    beneficiary: (passportItem.value.membership.fee?.beneficiary ??
      account ??
      ZeroAddress) as string,
    percentage: Number((ev.target as HTMLInputElement).value) ?? 10,
  }
}

const onChangeBeneficiary = async (ev: Event) => {
  passportItem.value.membership.fee = {
    percentage: (passportItem.value.membership.fee?.percentage ?? 10) as number,
    beneficiary: (String((ev.target as HTMLInputElement).value) ??
      account ??
      ZeroAddress) as string,
  }
}

const onChangeMaxRedemptions = changeMaxRedemptions(achievement)
const onChangeRecipients = changeRecipients(achievement)
const onChangeName = changeMetaName(achievement)
const onChangeImage = changeMetaImage(achievement)
const onChangeDesc = changeMetaDescription(achievement)
const onResetRecipients = resetRecipients(achievement)
const onResetMaxRedemptions = resetMaxRedemptions(achievement)

onMounted(async () => {
  passportItem.value.membership.payload = randomBytes(8)

  const { connection } = await import('@devprotocol/clubs-core/connection')
  combineLatest([
    connection().signer,
    connection().account,
    connection().provider,
    connection().chain,
  ]).subscribe(([_signer, _account, _provider, _chain]) => {
    signerObj = _signer
    account.value = _account
    providerObj = _provider
    chainId = _chain
  })
})
</script>

<template>
  <div class="grid gap-8 grid-cols-2">
    <div class="grid gap-8 justify-start justify-items-start">
      <label class="hs-form-field is-filled">
        <span class="hs-form-field__label">Target Club</span>
        <input type="text" v-model="club" class="hs-form-field__input" />
      </label>

      <h2 class="font-mono text-xl mt-8">Install Plugins</h2>
      <form class="grid gap-2">
        <label v-for="plugin of plugins" :for="plugin.id"
          ><input
            type="checkbox"
            v-model="plugin.willInstall"
            :id="plugin.id"
            :name="plugin.name"
            :checked="plugin.willInstall"
          />
          {{ plugin.name }}</label
        >
      </form>

      <h2 class="font-mono text-xl mt-8">Add Acheievement</h2>
      <div class="grid gap-2">
        <label class="hs-form-field">
          <span class="hs-form-field__label">Contract</span>
          <input
            type="text"
            class="hs-form-field__input"
            v-model="achievement.contract"
          />
        </label>
        <label class="hs-form-field">
          <span class="hs-form-field__label">Conditions - maxRedemptions</span>
          <span class="flex gap-2 items-center">
            <input
              type="number"
              class="hs-form-field__input"
              :value="achievement.conditions?.maxRedemptions"
              @change="onChangeMaxRedemptions"
              @keyup="onChangeMaxRedemptions"
            />
            <button
              class="hs-button is-outlined is-small"
              @click="onResetMaxRedemptions"
            >
              Reset
            </button>
          </span>
        </label>
        <label class="hs-form-field">
          <span class="hs-form-field__label">Conditions - recipients</span>
          <span class="flex gap-2 items-center">
            <textarea
              class="hs-form-field__input"
              :value="achievement.conditions?.recipients?.join('\n')"
              @keyup="onChangeRecipients"
            />
            <button
              class="hs-button is-outlined is-small"
              @click="onResetRecipients"
            >
              Reset
            </button>
          </span>
        </label>
        <label class="hs-form-field">
          <span class="hs-form-field__label">Name</span>
          <input
            type="text"
            class="hs-form-field__input"
            @change="onChangeName"
            @keyup="onChangeName"
          />
        </label>
        <label class="hs-form-field">
          <span class="hs-form-field__label">Image URL</span>
          <input
            type="text"
            class="hs-form-field__input"
            @change="onChangeImage"
            @keyup="onChangeImage"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Description</span>
          <input
            type="text"
            class="hs-form-field__input"
            @change="onChangeDesc"
            @keyup="onChangeDesc"
          />
        </label>
      </div>

      <h2 class="font-mono text-xl mt-8">Add Passport Item</h2>
      <div class="grid gap-2 mb-20">
        <label class="hs-form-field">
          <span class="hs-form-field__label">sToken name: </span>
          <input
            type="text"
            class="hs-form-field__input"
            v-model="passportItem.membership.name"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">sToken image URL: </span>
          <input
            type="text"
            class="hs-form-field__input"
            v-model="passportItem.membership.imageSrc"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">sToken description: </span>
          <input
            type="text"
            class="hs-form-field__input"
            v-model="passportItem.membership.description"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Price: </span>
          <input
            type="number"
            class="hs-form-field__input"
            v-model="passportItem.membership.price"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Currency: </span>

          <div class="flex flex-col gap-4 items-center justify-start">
            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="USDC"
                v-model="passportItem.membership.currency"
              />
              <label for="USDC">USDC</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="MATIC"
                v-model="passportItem.membership.currency"
              />
              <label for="MATIC">MATIC</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="ETH"
                v-model="passportItem.membership.currency"
              />
              <label for="ETH">ETH</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="DEV"
                v-model="passportItem.membership.currency"
              />
              <label for="DEV">DEV</label>
            </div>
          </div>
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Fee: </span>
          <input
            type="number"
            class="hs-form-field__input"
            :value="passportItem.membership.fee?.percentage"
            @change="onChangeFeePercentage"
            placeholder="Enter value between 0 to 1"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Beneficiary (Gateway): </span>
          <input
            type="text"
            class="hs-form-field__input"
            :value="passportItem.membership.fee?.beneficiary"
            @change="onChangeBeneficiary"
            placeholder="Enter wallet address"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">sToken payload: </span>
          <input
            type="text"
            disabled="true"
            class="hs-form-field__input"
            :value="bytes32Hex(passportItem.membership.payload ?? '')"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Passport item asset value: </span>
          <input
            type="text"
            class="hs-form-field__input"
            v-model="passportItem.item.itemAssetValue"
          />
        </label>

        <label class="hs-form-field">
          <span class="hs-form-field__label">Passport item asset type: </span>

          <div class="flex flex-col gap-4 items-center justify-start">
            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="css"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="css">css</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="stylesheet-link"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="stylesheet-link">stylesheet-link</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="image"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="image">image</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="image-link"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="image-link">image-link</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="video"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="video">video</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="video-link"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="video-link">video-link</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="bgm"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="bgm">bgm</label>
            </div>

            <div class="w-full flex flex-row gap-2 items-center justify-start">
              <input
                type="radio"
                value="bgm-link"
                v-model="passportItem.item.itemAssetType"
              />
              <label for="bgm-link">bgm-link</label>
            </div>
          </div>
        </label>
      </div>
    </div>

    <aside class="grid gap-2">
      <div class="border border-1 rounded-xl p-4">
        <dl class="grid grid-cols-[auto,1fr] gap-2 gap-y-4">
          <dt class="font-bold">Club</dt>
          <dd>{{ club }}</dd>
          <dt class="font-bold">Install Plugins</dt>
          <dd>
            <p v-for="plugin of plugins.filter((x) => x.willInstall)">
              {{ plugin.name }}
            </p>
            <p>
              <button class="hs-button is-small is-filled" @click="install">
                Install
              </button>
            </p>
          </dd>

          <dt class="font-bold">Add Achievement</dt>
          <dd>
            <pre class="text-sm">{{
              achievement ? JSON.stringify(achievement, null, 2) : ''
            }}</pre>
            <p>
              <button
                class="hs-button is-small is-filled"
                @click="addAchievement"
              >
                Add
              </button>
            </p>
          </dd>

          <dt class="font-bold">Add Passport Item</dt>
          <dd>
            <pre class="text-sm">{{
              passportItem ? JSON.stringify(passportItem, null, 2) : ''
            }}</pre>
            <p>
              <button
                :disabled="!club"
                class="hs-button is-small is-filled"
                @click="deploySToken"
              >
                Update onchain and add to db
              </button>
            </p>
          </dd>
        </dl>
      </div>
      <div
        v-if="apiCalling && apiCalling.progress !== undefined"
        class="rounded-xl p-4 font-mono"
        :class="
          apiCalling?.error
            ? 'bg-dp-red-300 text-dp-red-ink'
            : apiCalling?.result
              ? 'bg-dp-green-300 text-dp-green-ink'
              : 'bg-surface-300'
        "
      >
        <span v-if="apiCalling?.progress">Now calling API...</span>
        <span v-if="apiCalling?.result">{{ apiCalling.result }}</span>
        <span v-if="apiCalling?.error">{{ apiCalling.error }}</span>
      </div>
    </aside>
  </div>
</template>
