<script>
  import { onMount } from 'svelte'
  import MP4Box from 'mp4box'

  export let url =
    'https://e54a8car3bcq7q8h.public.blob.vercel-storage.com/14c24a03-fe3c-46e9-9c60-b3629b7bd407-AJU9Re3SULCQPsu1txSmrreuXcjdy9.mp4'

  let videoElement
  let mediaSource
  let sourceBuffers = {}
  let mp4boxfile
  let pendingSegments = {}
  let isDownloading = false

  let chunkSize = 1000000 // Bytes per download chunk
  let nextRangeStart = 0
  let totalFileSize = 0

  onMount(() => {
    if (!url) return

    mediaSource = new MediaSource()
    videoElement.src = URL.createObjectURL(mediaSource)

    mediaSource.addEventListener('sourceopen', onSourceOpen)

    setupMp4Box()
    startDownload()
  })

  function onSourceOpen() {
    console.log('MediaSource opened')
  }

  function setupMp4Box() {
    mp4boxfile = MP4Box.createFile()

    mp4boxfile.onMoovStart = function () {
      console.log('Starting to parse movie information')
    }

    mp4boxfile.onReady = function (info) {
      console.log('Movie info:', info)

      // Initialize tracks and segment options
      info.tracks.forEach((track) => {
        mp4boxfile.setSegmentOptions(track.id, { duration: 2 }) // 2-second fragments
        pendingSegments[track.id] = [] // Initialize pending segments queue
      })

      const initSegs = mp4boxfile.initializeSegmentation()
      initSegs.forEach((seg) => {
        const codec =
          seg.codec || info.tracks.find((t) => t.id === seg.id)?.codec
        if (!codec) {
          console.error(`Codec undefined for track ID: ${seg.id}`)
          return
        }

        const mime = `video/mp4; codecs="${codec}"`
        if (MediaSource.isTypeSupported(mime)) {
          const sourceBuffer = mediaSource.addSourceBuffer(mime)
          sourceBuffers[seg.id] = sourceBuffer

          sourceBuffer.addEventListener('updateend', () => onUpdateEnd(seg.id))
          sourceBuffer.appendBuffer(seg.buffer) // Append initialization segment
          console.log(`SourceBuffer added with mime: ${mime}`)
        } else {
          console.error(`Unsupported MIME type: ${mime}`)
        }
      })

      // Start processing the MP4 file
      mp4boxfile.start()
    }

    mp4boxfile.onSegment = function (id, user, buffer, sampleNum, is_last) {
      console.log(
        `Received segment for track ${id}, samples up to #${sampleNum}`,
      )
      if (sourceBuffers[id] && !sourceBuffers[id].updating) {
        sourceBuffers[id].appendBuffer(buffer)
      } else if (pendingSegments[id]) {
        pendingSegments[id].push(buffer)
      } else {
        console.error(
          `Pending segments queue not initialized for track ID: ${id}`,
        )
      }
    }
  }

  function onUpdateEnd(trackId) {
    if (
      pendingSegments[trackId]?.length > 0 &&
      !sourceBuffers[trackId].updating
    ) {
      const buffer = pendingSegments[trackId].shift()
      sourceBuffers[trackId].appendBuffer(buffer)
    }
  }

  function startDownload() {
    isDownloading = true
    fetchFileSize()
      .then((size) => {
        totalFileSize = size
        downloadChunk()
      })
      .catch((err) => {
        console.error('Could not fetch file size', err)
      })
  }

  function fetchFileSize() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('HEAD', url, true)
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const length = parseInt(
            xhr.getResponseHeader('Content-Length') || '0',
          )
          resolve(length)
        } else {
          reject(new Error(`HEAD request failed with status ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send()
    })
  }

  function downloadChunk() {
    if (!isDownloading) return
    if (nextRangeStart >= totalFileSize) {
      console.log('Download complete')
      mp4boxfile.flush() // Finalize processing
      return
    }

    const end = Math.min(nextRangeStart + chunkSize - 1, totalFileSize - 1)
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.setRequestHeader('Range', `bytes=${nextRangeStart}-${end}`)

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        const buffer = xhr.response
        buffer.fileStart = nextRangeStart // Required by MP4Box.js
        nextRangeStart = end + 1

        const next = mp4boxfile.appendBuffer(buffer)
        if (next) {
          setTimeout(downloadChunk, 100) // Adjust as needed
        }
      } else {
        console.error('Error downloading chunk:', xhr.status)
      }
    }

    xhr.onerror = function (e) {
      console.error('XHR error:', e)
    }
    xhr.send()
  }
</script>

<video bind:this={videoElement} controls loop> </video>

<style>
  video {
    width: 600px;
    height: auto;
    background: #000;
  }
</style>
