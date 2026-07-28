import type { Db } from 'mongodb'
import type { Config, RefreshStats } from './types.js'

function rewriteUrl(
  url: string | null | undefined,
  prodBase: string,
  devBase: string,
): string | null {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith(prodBase)) {
    return devBase + url.slice(prodBase.length)
  }
  return null
}

export async function rewriteMediaUrls(
  db: Db,
  config: Config,
  stats: RefreshStats,
): Promise<void> {
  if (!config.prodS3 || !config.devS3) {
    console.log('  S3 config missing, skipping media URL rewrite.')
    return
  }

  const prodBase = config.prodS3.publicUrlBase
  const devBase = config.devS3.publicUrlBase

  console.log(`  Rewriting media URLs:`)
  console.log(`    ${prodBase}  →  ${devBase}`)

  const mediaDocs = await db.collection('media').find({}).toArray()
  if (mediaDocs.length === 0) {
    console.log('    No media documents to update.')
    return
  }

  const bulkOps: any[] = []
  let urlsRewritten = 0

  for (const doc of mediaDocs) {
    const setFields: Record<string, string> = {}
    let hasChanges = false

    const newUrl = rewriteUrl(doc.url, prodBase, devBase)
    if (newUrl !== null) {
      setFields.url = newUrl
      hasChanges = true
      urlsRewritten++
    }

    const newThumbnail = rewriteUrl(doc.thumbnailURL, prodBase, devBase)
    if (newThumbnail !== null) {
      setFields.thumbnailURL = newThumbnail
      hasChanges = true
      urlsRewritten++
    }

    if (hasChanges) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: setFields },
        },
      })
    }
  }

  if (bulkOps.length > 0) {
    await db.collection('media').bulkWrite(bulkOps)
  }

  stats.mediaUrls.documentsUpdated = bulkOps.length
  stats.mediaUrls.urlsRewritten = urlsRewritten
  console.log(`    Updated ${bulkOps.length} media documents, rewrote ${urlsRewritten} URLs.`)
}
