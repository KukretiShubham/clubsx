import useSWR from 'swr'
import type { UndefinedOr } from '@devprotocol/util-ts'
import {
  decode,
  encode,
  i18nFactory,
  type ClubsI18nFunction,
} from '@devprotocol/clubs-core'
import React, {
  type FunctionComponent,
  useState,
  useEffect,
  useMemo,
  type SyntheticEvent,
} from 'react'

import { Strings } from '../i18n'
import { Market } from '../types'
import { useQuery } from '../utils'

interface IDiscordAuthCallbackProps {
  market: UndefinedOr<Market>
}

const REQUIRED_PERMISSIONS = 8 // Administrator

const YoutubeAuthCallbackPage: FunctionComponent<IDiscordAuthCallbackProps> = (
  props: IDiscordAuthCallbackProps,
) => {
  let i18nBase = i18nFactory(Strings)
  let i18n: ClubsI18nFunction<typeof Strings> = i18nBase(['en'])

  const [assetName, setAssetName] = useState<string>('')
  const [isVerify, setIsVerify] = useState<boolean>(false)
  const [error, setError] = useState<UndefinedOr<string>>('')
  const [market, setMarket] = useState<UndefinedOr<Market>>(undefined)
  const [personalAccessToken, setPersonalAccessToken] = useState<string>('')

  useEffect(() => {
    i18n = i18nBase(navigator.languages)
  }, [navigator])

  const [queryParams, redirectURI] = useMemo(
    () => [
      useQuery(
        window.location.search ? window.location.search : window.location.hash,
      ),
      `${location.protocol}//${location.host}/auth/callback/youtube`,
    ],
    [useQuery, window, location],
  )

  const clientId = useMemo(
    () => import.meta.env.PUBLIC_YOUTUBE_CLIENT_ID,
    [import.meta.env],
  )

  const clubsDomain = useMemo(() => {
    const encodedStateParam: string = queryParams.state
    const decodedStateParam: { clubsDomain: string } = JSON.parse(
      window.atob(decodeURIComponent(encodedStateParam)),
    )
    return decodedStateParam.clubsDomain || ''
  }, [queryParams])

  const swrOptions = {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    focusThrottleInterval: 0,
  }

  const verifyData = useSWR(
    queryParams && queryParams.access_token !== '' ? 'google/verify' : null,
    async () => {
      const verifyUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${queryParams.access_token}`
      return fetch(verifyUrl)
        .then(
          (res) => {
            if (!res || !res.ok) {
              throw new Error('Error ' + res.status + ': ' + res.statusText)
            }
            return res
          },
          (err) => {
            throw new Error(err?.message || 'Error occured')
          },
        )
        .then(
          (res) => res.json(),
          (err) => {
            throw new Error(err?.message || 'Error occured')
          },
        )
        .then(
          (res) => {
            if (res.audience !== clientId) {
              throw new Error('Invalid audience!')
            }
            setIsVerify(true)
            return { email: res.email }
          },
          (err) => {
            throw new Error(err?.message || 'Error occured')
          },
        )
        .catch((err) => {
          setError(err?.message || 'Error occured try again')
          return undefined
        })
    },
    swrOptions,
  )

  const youtubeData = useSWR(
    queryParams && queryParams.access_token !== '' ? 'youtube/dataapi' : null,
    async () => {
      const youtubeDataApiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet,brandingSettings,statistics&mine=true&access_token=${queryParams.access_token}`
      return fetch(youtubeDataApiUrl)
        .then(
          (res) => {
            if (!res || !res.ok) {
              throw new Error('Error ' + res.status + ': ' + res.statusText)
            }
            return res
          },
          (err) => {
            throw new Error(err?.message || 'Error occured')
          },
        )
        .then(
          (res) => res.json(),
          (err) => {
            throw new Error(err?.message || 'Error occured')
          },
        )
        .then(
          (res) => {
            return res.items.map((item: any) => {
              const channelId = item.id
              const videoCount = item.statistics.videoCount
              const viewCount = item.statistics.viewCount
              const keywords = item.brandingSettings.channel.keywords
              const title = item.snippet.title
              const description = item.snippet.description
              return {
                channelId,
                videoCount,
                viewCount,
                keywords,
                title,
                description,
              }
            })
          },
          (err) => {
            throw new Error(err?.message || 'Error occured')
          },
        )
        .catch((err) => {
          setError(err?.message || 'Error occured try again')
          return undefined
        })
    },
    swrOptions,
  )

  useEffect(() => {
    setMarket(Market.DISCORD)

    if (props.market !== Market.DISCORD) {
      return setError('Invalid verification market!')
    }

    if (
      !queryParams ||
      !queryParams.access_token ||
      !verifyData?.data ||
      !youtubeData?.data
    ) {
      return
    }

    if (!isVerify) {
      return setError('Invalid Authentication!')
    }

    setAssetName(youtubeData?.data.pop().channelId)
    setPersonalAccessToken(queryParams.access_token)
  }, [
    setMarket,
    market,
    verifyData,
    isVerify,
    personalAccessToken,
    youtubeData,
    assetName,
  ])

  return (
    <>
      <div className="relative flex gap-16 flex-col justify-center p-4 md:p-0 w-[36%] max-w-[36%] ml-auto mr-auto">
        <section className="mt-16 grid gap-8 md:mt-32 min-w-full w-full max-w-full">
          <h1 className="text-2xl font-bold md:text-5xl text-center">
            {i18n('DiscordAuthCallbackHeader')}
          </h1>
        </section>

        {error ? (
          <section className="grid gap-16 w-full max-w-full mb-16 md:mb-32">
            <span className="text-base font-normal text-center">
              {i18n('DiscordAuthCallbackNoGuild')}
            </span>
          </section>
        ) : (
          <section className="grid gap-16 w-full max-w-full mb-16 md:mb-32">
            <span className="text-base font-normal text-center">
              {i18n('DiscordAuthCallbackNoGuild')}
            </span>
          </section>
        )}
      </div>
    </>
  )
}

export default YoutubeAuthCallbackPage
