import {
  ClubsFunctionGetAdminPaths,
  ClubsFunctionGetPagePaths,
  ClubsFunctionPlugin,
  ClubsPluginMeta,
} from '@devprotocol/clubs-core'
import { default as Index } from './index.astro'

export const getPagePaths: ClubsFunctionGetPagePaths = async (
  _,
  { propertyAddress, name }
) => [
  { paths: ['members'], component: Index, props: { propertyAddress, name } },
]

export const getAdminPaths: ClubsFunctionGetAdminPaths = async () => []

export const meta: ClubsPluginMeta = { displayName: 'Members' }

export default {
  getPagePaths,
  getAdminPaths,
  meta,
} as ClubsFunctionPlugin
