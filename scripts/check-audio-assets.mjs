import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
const manifest = JSON.parse(readFileSync(new URL('../src/data/neural-audio.json', import.meta.url)))
for (const [id, entry] of Object.entries(manifest.entries)) {
  const hash = createHash('sha256').update(`${manifest.voice}|${manifest.rate}|${entry.text}`).digest('hex').slice(0, 12)
  if (entry.file !== `${id}-${hash}.mp3`) throw new Error(`Stale audio manifest: ${id}`)
  const path = new URL(`../public/audio/${entry.file}`, import.meta.url)
  let bytes
  try { bytes = readFileSync(path) } catch { throw new Error(`Missing Jenny recording for ${id}. Run npm run audio:generate before building.`) }
  if (statSync(path).size < 2000 || !(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224))) {
    throw new Error(`Invalid MP3: ${id}`)
  }
}
console.log(`Verified ${Object.keys(manifest.entries).length} deployment-only Jenny recordings`)
