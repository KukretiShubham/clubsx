<template>
  <div class="bg-cover bg-center">
    <h3 class="my-8 text-2xl">Creators</h3>
    <div v-if="creators.length > 0" class="rounded border border-dp-black-200">
      <ul role="list">
        <li
          v-for="creator in creators"
          :key="creator.ownerAddress"
          class="flex items-center border border-x-0 border-t-0 border-dp-black-200 outline-white first:border-solid last:border-none"
        >
          <Avator
            :accountAddress="creator.accountAddress"
            :displayName="true"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { JsonRpcProvider, ZeroAddress } from 'ethers'
import { getBalances } from '@fixtures/dev-kit'
import Avator from '@components/Members/Avator.vue'

export default {
  props: {
    propertyAddress: String,
    rpcUrl: String,
  },
  data() {
    return {
      creators: [],
    }
  },
  async created() {
    const providerURL = this.rpcUrl
    const provider = new JsonRpcProvider(providerURL)
    const balances =
      this.propertyAddress !== ZeroAddress &&
      this.propertyAddress !== '' &&
      this.propertyAddress
        ? await getBalances(provider, this.propertyAddress)
        : []
    this.creators = balances.map((balance) => ({
      accountAddress: balance.account,
    }))
  },
  components: {
    Avator,
  },
}
</script>
