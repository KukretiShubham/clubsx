import type { UndefinedOr } from '@devprotocol/util-ts'
import type {
  ClubsFunctionGetAdminPaths,
  ClubsFunctionGetLayout,
  ClubsFunctionGetPagePaths,
  ClubsFunctionThemePlugin,
  ClubsThemePluginMeta,
} from '@devprotocol/clubs-core'
import { ClubsPluginCategory } from '@devprotocol/clubs-core'
import { default as Layout } from './layouts/Default.astro'
import { default as Index } from './pages/index.astro'
import { default as Admin } from './admin.astro'
import type { HomeConfig } from '../../constants/homeConfig'
import type { NavLink } from '@constants/navLink'
import type { Membership } from '@plugins/memberships'
import PreviewImage from './assets/preview.png'
import { default as Icon } from '@assets/CaseStudyMedia1.png'
import { default as Readme } from './README.md'

export const colorPresets = {
  Purple: {
    bg: 'rgba(131, 138, 176, 1)',
    backgroundGradient: ['rgba(204, 0, 255, 0.2)', 'rgba(204, 0, 255, 0)'],
  },
  Grey: {
    bg: 'rgba(173, 173, 173, 1)',
  },
  Black: {
    bg: 'rgba(29, 36, 38, 1)',
  },
  Brown: {
    bg: 'rgba(68, 59, 45, 1)',
    backgroundGradient: ['rgba(255, 201, 119, 0.2)', 'rgba(255, 201, 119, 0)'],
  },
  Stone: {
    bg: 'rgba(96, 119, 124, 1)',
    backgroundGradient: ['rgba(196, 196, 196, 0.5)', 'rgba(196, 196, 196, 0)'],
  },
  Matcha: {
    bg: 'rgba(63, 78, 38, 1)',
  },
  Pink: {
    bg: 'rgba(255, 187, 195, 1)',
    backgroundGradient: ['rgba(255, 173, 217, 1)', 'rgba(255, 173, 217, 0)'],
  },
}

export type GlobalConfigValue = {
  bg?: string
  backgroundGradient?: [string, string]
}

export type HomeConfigValue = {
  hero?: {
    image?: string
  }
  description?: string
  body?: string
}

export const getPagePaths: ClubsFunctionGetPagePaths = async (
  options,
  config,
  { getPluginConfigById }
) => {
  const { name, propertyAddress, rpcUrl, chainId } = config

  const [membershipConfig] = getPluginConfigById(
    'devprotocol:clubs:simple-memberships'
  )
  const memberships = membershipConfig?.options.find(
    (opt) => opt.key === 'memberships'
  )?.value as UndefinedOr<Membership[]>

  const homeConfig = options.find((opt) => opt.key === 'homeConfig')
    ?.value as UndefinedOr<HomeConfig>

  const sidebarPrimaryLinks =
    config.options?.find((option) => option.key === 'sidebarPrimaryLinks')
      ?.value ?? ([] as NavLink[])

  const sidebarLinks =
    config.options?.find((option) => option.key === 'sidebarLinks')?.value ??
    ([] as NavLink[])

  const avatarImgSrc = config.options?.find(
    (option) => option.key === 'avatarImgSrc'
  )?.value

  return homeConfig
    ? [
        {
          paths: [],
          component: Index,
          props: {
            name,
            propertyAddress,
            memberships,
            homeConfig,
            rpcUrl,
            chainId,
            sidebarPrimaryLinks,
            sidebarLinks,
            avatarImgSrc,
            signals: ['connection-button-hide'],
          },
        },
      ]
    : []
}

export const getAdminPaths: ClubsFunctionGetAdminPaths = async (
  options,
  config
) => [
  {
    paths: ['theme'],
    component: Admin,
    props: { options, config, colorPresets },
  },
]

export const getLayout: ClubsFunctionGetLayout = async (options, config) => {
  const globalConfig = options.find((opt) => opt.key === 'globalConfig')?.value
  const homeConfig = options.find((opt) => opt.key === 'homeConfig')?.value
  return {
    layout: Layout,
    props: { config, homeConfig, globalConfig },
  }
}

export const meta: ClubsThemePluginMeta = {
  id: 'devprotocol:clubs:theme-1',
  displayName: 'Default theme',
  category: ClubsPluginCategory.Theme,
  theme: {
    previewImage: PreviewImage,
  },
  icon: Icon,
  offer: {
    price: 0,
    priceCurrency: 'DEV',
  },
  description: `is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`,
  previewImages: [Icon, Icon, Icon],
  readme: Readme,
}

export default {
  getPagePaths,
  getAdminPaths,
  getLayout,
  meta,
} as ClubsFunctionThemePlugin
