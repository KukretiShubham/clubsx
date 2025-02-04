<script setup lang="ts">
import MediaCard from '@pages/passport/components/MediaCard.vue'
import { MediaEmbed } from '@devprotocol/clubs-plugin-passports/vue'
import type { PassportItemAssetType } from '@devprotocol/clubs-plugin-passports/types'
import type { FeedType } from '@fixtures/api/feed'

const props = defineProps<FeedType>()

const SKIN: FeedType['tag'][] = ['css', 'stylesheet-link']
const CLIP: FeedType['tag'][] = [
  'image',
  'image-link',
  'image-playable',
  'image-playable-link',
]
const BGM: FeedType['tag'][] = ['bgm', 'bgm-link']
const VIDEO: FeedType['tag'][] = [
  'video',
  'video-link',
  'short-video',
  'short-video-link',
]
</script>

<template>
  <div
    class="flex gap-3 p-2 rounded-xl"
    :class="{
      'bg-indigo-600':
        !frameHexColor || frameHexColor === '' ? CLIP.includes(tag) : false,
      'bg-fuchsia-500':
        !frameHexColor || frameHexColor === '' ? SKIN.includes(tag) : false,
      'bg-orange-500':
        !frameHexColor || frameHexColor === '' ? BGM.includes(tag) : false,
      'bg-yellow-500':
        !frameHexColor || frameHexColor === '' ? VIDEO.includes(tag) : false,
    }"
    :style="{
      backgroundColor: frameHexColor,
    }"
  >
    <div class="flex flex-col flex-grow">
      <div class="flex items-center gap-3">
        <a :href="`/passport/${address}`">
          <img
            class="w-14 h-14 rounded-full object-cover aspect-square bg-lightgray bg-cover bg-center bg-no-repeat _p-avatar"
            :src="avatarSrc"
            alt="avatar"
          />
        </a>
        <div class="flex flex-col flex-grow gap-0">
          <div class="text-xs font-bold">
            {{ name }}
          </div>
          <div
            v-if="tag !== 'ugc'"
            class="flex items-center gap-2 p-1 rounded-sm bg-white"
            style="width: fit-content"
          >
            <img
              v-if="!!badgeSrc && badgeSrc !== ''"
              class="w-7 rounded-sm"
              style="aspect-ratio: 16 / 9"
              :src="badgeSrc"
              alt="image"
            />
            <p v-if="!!badgeName && badgeName !== ''" class="text-xs font-bold">
              {{ badgeName }}
            </p>
          </div>
        </div>
      </div>
      <div
        v-if="description"
        class="h-16 w-full text-2xl font-bold text-ellipsis overflow-hidden line-clamp-2"
      >
        {{ description }}
      </div>
    </div>
    <div class="flex items-end max-w-16 min-w-16">
      <a :href="assetLink" target="_blank">
        <video v-if="VIDEO.includes(tag)">
          <source :src="assetSrc" type="video/mp4" />
        </video>
        <img v-else-if="CLIP.includes(tag)" :src="assetSrc" alt="clip" />
        <MediaCard
          v-else-if="SKIN.includes(tag as PassportItemAssetType)"
          class="w-full rounded"
          style="aspect-ratio: 1 / 1"
          :src="assetSrc"
          :type="tag as PassportItemAssetType"
          :found="!!assetSrc"
        />
        <MediaEmbed
          v-else
          class="w-full rounded"
          style="aspect-ratio: 1 / 1"
          :found="!!assetSrc"
          :src="assetSrc"
          :type="tag"
        />
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
