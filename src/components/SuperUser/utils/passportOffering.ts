import type { Ref } from 'vue'
import type { ContractRunner, Signer } from 'ethers'
import { clientsSTokens } from '@devprotocol/dev-kit'
import { whenDefinedAll, type UndefinedOr } from '@devprotocol/util-ts'
import {
  bytes32Hex,
  membershipToStruct,
  type ClubsConfiguration,
  type ClubsOffering,
  type Membership,
} from '@devprotocol/clubs-core'

import {
  address,
  callSimpleCollections,
} from '@plugins/memberships/utils/simpleCollections'

export type RefPassportOffering = Ref<Partial<ClubsOffering>>

export const changePassportOfferingFee =
  (ref: RefPassportOffering) => (ev: Event) => {
    let value: number = 0
    if (ref.value.currency !== 'DEV') {
      value = Number((ev.target as HTMLInputElement).value)
    }

    ref.value = {
      ...ref.value,
      fee: {
        ...ref.value?.fee,
        percentage: value < 0 ? 0 : value > 1 ? 1 : value,
        beneficiary: ref.value?.fee?.beneficiary as string,
      },
    }
  }

export const changePassportOfferingBeneficiary =
  (ref: RefPassportOffering) => (ev: Event) => {
    ref.value = {
      ...ref.value,
      fee: {
        ...ref.value?.fee,
        percentage: ref.value?.fee?.percentage as number,
        beneficiary: (ev.target as HTMLInputElement).value,
      },
    }
  }

export const setTokenURIDescriptor = async (
  signer: UndefinedOr<Signer>,
  chainId: UndefinedOr<number>,
  passportItem: RefPassportOffering,
  provider: UndefinedOr<ContractRunner>,
  currentConfig: UndefinedOr<ClubsConfiguration>,
) => {
  if (!provider || !signer) {
    return false
  }

  const [l1, l2] = await clientsSTokens(provider ?? signer)
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
        passportItem.value.payload,
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

export const setImage = async (
  signer: UndefinedOr<Signer>,
  chainId: UndefinedOr<number>,
  passportOffering: RefPassportOffering,
  provider: UndefinedOr<ContractRunner>,
  currentConfig: UndefinedOr<ClubsConfiguration>,
) => {
  if (!provider || !signer) {
    return false
  }

  return (
    (await whenDefinedAll(
      [
        callSimpleCollections,
        currentConfig,
        passportOffering.value.payload,
        signer,
      ],
      ([func, conf, payload, _signer]) =>
        func(_signer, 'setImages', [
          conf.propertyAddress,
          [
            membershipToStruct(
              {
                ...passportOffering.value,
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