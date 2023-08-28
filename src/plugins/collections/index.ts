import type {
  ClubsFunctionGetAdminPaths,
  ClubsFunctionGetPagePaths,
  ClubsFunctionPlugin,
  ClubsPluginMeta,
  ClubsPluginOption,
} from '@devprotocol/clubs-core'
import { ClubsPluginCategory } from '@devprotocol/clubs-core'
import { default as Admin } from './admin.astro'
import { default as AdminEdit } from './admin-id.astro'
import { default as AdminNew } from './admin-new.astro'
import { default as Icon } from './assets/icon.svg'
import { Content as Readme } from './README.md'
import Preview1 from './assets/limited-number-of-items.svg'
import Preview2 from './assets/time-limited-collection.svg'
import type { UndefinedOr } from '@devprotocol/util-ts'
import { utils } from 'ethers'

export type Membership = {
  id: string
  name: string
  description: string
  price: number
  currency: 'DEV' | 'ETH' | 'USDC'
  imageSrc: string
  payload: Uint8Array
  fee?: {
    percentage: number
    beneficiary: string
  }
  deprecated?: boolean
  memberCount?: number
}

export type Collection = {
  id: string
  name: string
  imageSrc: string
  startTime?: number
  isTimeLimitedCollection: boolean
  endTime?: number
  description: string
  memberships: Membership[]
}

export const getPagePaths: ClubsFunctionGetPagePaths = async () => []

export const getAdminPaths: ClubsFunctionGetAdminPaths = async (
  options,
  { name, rpcUrl, propertyAddress},
  { getPluginConfigById }
) => {
  const [collectionsConfig] = getPluginConfigById(
    'devprotocol:clubs:collections'
  )

  const presetTimeCollection: Collection = {
    id: 'preset-time-collection',
    name: 'My First Collection',
    imageSrc: 'https://i.ibb.co/RbxFzn8/img.jpg',
    description: 'This is a time-limited collection.',
    isTimeLimitedCollection: true,
    startTime: 0,
    endTime: 0,
    memberships: [
      {
        id: 'preset-time-collection-membership',
        name: 'Membership',
        imageSrc: 'https://i.ibb.co/Kyjr50C/Image.png',
        currency: 'USDC',
        price: 10,
        description: 'This is a time-limited collection.',
        payload: utils.toUtf8Bytes('TimeLimitedCollection'),
      },
    ],
  }

  const presetMemberCollection: Collection = {
    id: 'preset-member-collection',
    name: 'My First Collection',
    imageSrc: 'https://i.ibb.co/RbxFzn8/img.jpg',
    description: 'This is a time-limited collection.',
    isTimeLimitedCollection: true,
    startTime: 0,
    endTime: 0,
    memberships: [
      {
        id: 'preset-member-collection-membership',
        name: 'Membership',
        imageSrc: 'https://i.ibb.co/Kyjr50C/Image.png',
        currency: 'USDC',
        price: 10,
        description: 'This is a member-limited collection.',
        payload: utils.toUtf8Bytes('TimeLimitedCollection'),
        memberCount: 10,
      },
    ],
  }

  const collections =
    (collectionsConfig?.options.find(
      (opt: ClubsPluginOption) => opt.key === 'collections'
    )?.value as UndefinedOr<Collection[]>) ?? []

  return [
    {
      paths: ['collections'],
      component: Admin,
      props: { collections },
    },
    ...(collections.map((collection) => ({
      paths: ['collections', collection.id],
      component: AdminEdit,
      props: { collection, collections, name, rpcUrl, propertyAddress },
    })) ?? []),
    {
      paths: ['collections', 'new'],
      component: AdminNew,
      props: {
        isTimeLimitedCollection: false,
        preset: presetMemberCollection,
        collections,
        rpcUrl,
        propertyAddress,
        name,
      },
    },
    {
      paths: ['collections', 'new', 'time-limited-collection'],
      component: AdminNew,
      props: {
        isTimeLimitedCollection: true,
        preset: presetTimeCollection,
        collections,
        rpcUrl,
        propertyAddress,
        name,
      },
    },
  ]
}

export const meta: ClubsPluginMeta = {
  id: 'devprotocol:clubs:collections',
  displayName: 'Collections',
  category: ClubsPluginCategory.Monetization,
  icon: Icon,
  offer: {
    price: 0,
    priceCurrency: 'DEV',
  },
  description: `Dummy is a content generation toolkit designed to make the development.`,
  previewImages: [Preview1, Preview2],
  readme: Readme,
}

export default {
  getPagePaths,
  getAdminPaths,
  meta,
} as ClubsFunctionPlugin
