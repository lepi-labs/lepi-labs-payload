import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'
import type { Config, RefreshStats } from './types.js'

const CONCURRENCY = 10

function createS3Client(s3: Config['devS3'] | Config['prodS3']): S3Client {
  return new S3Client({
    endpoint: s3!.endpoint,
    credentials: {
      accessKeyId: s3!.accessKeyId,
      secretAccessKey: s3!.secretAccessKey,
    },
    region: s3!.region || 'us-east-1',
    forcePathStyle: true,
  })
}

async function listAllObjects(client: S3Client, bucket: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    )
    for (const obj of response.Contents || []) {
      if (obj.Key) keys.push(obj.Key)
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  return keys
}

async function copyObjectSameEndpoint(
  client: S3Client,
  prodBucket: string,
  devBucket: string,
  key: string,
): Promise<void> {
  await client.send(
    new CopyObjectCommand({
      Bucket: devBucket,
      Key: key,
      CopySource: `${prodBucket}/${key}`,
    }),
  )
}

async function copyObjectCrossEndpoint(
  prodClient: S3Client,
  devClient: S3Client,
  prodBucket: string,
  devBucket: string,
  key: string,
): Promise<void> {
  const getResponse = await prodClient.send(
    new GetObjectCommand({ Bucket: prodBucket, Key: key }),
  )

  await devClient.send(
    new PutObjectCommand({
      Bucket: devBucket,
      Key: key,
      Body: getResponse.Body as Readable,
      ContentType: getResponse.ContentType,
      ContentLength: getResponse.ContentLength,
    }),
  )
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<{ succeeded: number; failed: number }> {
  let index = 0
  let succeeded = 0
  let failed = 0

  async function next(): Promise<void> {
    const current = index++
    if (current >= items.length) return
    try {
      await worker(items[current])
      succeeded++
    } catch {
      failed++
    }
    await next()
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next())
  await Promise.all(workers)
  return { succeeded, failed }
}

export async function copyBucket(
  config: Config,
  stats: RefreshStats,
): Promise<void> {
  if (!config.prodS3 || !config.devS3) {
    console.log('  S3 config missing, skipping bucket copy.')
    stats.s3.objectsSkipped++
    return
  }

  const sameEndpoint = config.prodS3.endpoint === config.devS3.endpoint
  console.log(`  Listing objects in prod bucket: ${config.prodS3.bucket}`)

  const prodClient = createS3Client(config.prodS3)
  const keys = await listAllObjects(prodClient, config.prodS3.bucket)

  console.log(`  Found ${keys.length} objects to copy.`)

  if (keys.length === 0) {
    console.log('  No objects to copy.')
    return
  }

  if (sameEndpoint) {
    console.log(`  Same endpoint detected — using server-side CopyObject.`)
    const result = await runWithConcurrency(keys, CONCURRENCY, async (key) => {
      await copyObjectSameEndpoint(prodClient, config.prodS3!.bucket, config.devS3!.bucket, key)
    })
    stats.s3.objectsCopied = result.succeeded
    stats.s3.objectsFailed = result.failed
  } else {
    console.log(`  Different endpoints — using Get+Put with ${CONCURRENCY} concurrent workers.`)
    const devClient = createS3Client(config.devS3)
    const result = await runWithConcurrency(keys, CONCURRENCY, async (key) => {
      await copyObjectCrossEndpoint(
        prodClient,
        devClient,
        config.prodS3!.bucket,
        config.devS3!.bucket,
        key,
      )
    })
    stats.s3.objectsCopied = result.succeeded
    stats.s3.objectsFailed = result.failed
  }

  console.log(`  Copied ${stats.s3.objectsCopied} objects.`)
  if (stats.s3.objectsFailed > 0) {
    console.log(`  Failed to copy ${stats.s3.objectsFailed} objects.`)
  }
}
