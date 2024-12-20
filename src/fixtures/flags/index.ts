import { whenDefined, type UndefinedOr } from '@devprotocol/util-ts'

export enum FeatureFlags {
  InvitationsOnMarketplace = 'invitations-on-marketplace',
  AchievementsOnMarketplace = 'achievements-on-marketplace',
  DynamicWalletOnMarketplace = 'dynamic-wallet-on-marketplace',
  PassportPluginOnMarketplace = 'passport-plugin-on-marketplace',
  AkibaPluginOnMarketplace = 'akiba-plugin-on-marketplace',
}

export enum FeatureFlagValues {
  Enable = 'enable',
}

export const flags: Map<FeatureFlags, FeatureFlagValues[]> = new Map([
  [FeatureFlags.InvitationsOnMarketplace, [FeatureFlagValues.Enable]],
  [FeatureFlags.AchievementsOnMarketplace, [FeatureFlagValues.Enable]],
  [FeatureFlags.DynamicWalletOnMarketplace, [FeatureFlagValues.Enable]],
  [FeatureFlags.PassportPluginOnMarketplace, [FeatureFlagValues.Enable]],
  [FeatureFlags.AkibaPluginOnMarketplace, [FeatureFlagValues.Enable]],
])

export const getFlagsByParams = ({
  url,
}: {
  url: URL
}): Map<FeatureFlags, UndefinedOr<FeatureFlagValues>> => {
  const _flags: [FeatureFlags, UndefinedOr<FeatureFlagValues>][] = Array.from(
    flags.entries(),
  ).map(([flag, values]) => {
    return [
      flag,
      whenDefined(url.searchParams.get(`flag:${flag}`), (value) =>
        values.includes(value as FeatureFlagValues)
          ? (value as FeatureFlagValues)
          : undefined,
      ),
    ]
  })

  return new Map(_flags)
}
