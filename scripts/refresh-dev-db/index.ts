import { createInterface } from 'node:readline'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { MongoClient } from 'mongodb'

import { buildConfig } from './config.js'
import { anonymizeAll } from './anonymize.js'
import { copyBucket, downloadBucketToLocal } from './s3-copy.js'
import { rewriteMediaUrls } from './media-urls.js'
import {
  checkPrerequisites,
  backupDevDb,
  unzipDump,
  dropAndRestore,
  cleanupTempDir,
} from './mongo-restore.js'
import { createEmptyStats } from './types.js'
import type { Config, RefreshStats } from './types.js'

async function prompt(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().startsWith('y'))
    })
  })
}

function printPlan(config: Config): void {
  console.log('=== Dev DB Refresh Plan ===\n')
  console.log(`Dump archive:  ${config.dumpZipPath}`)
  console.log(`Dev DB:        ${config.devDb.uri}`)

  if (config.prodS3 && config.devS3) {
    console.log(`Prod S3:       ${config.prodS3.endpoint}/${config.prodS3.bucket}`)
    console.log(`Dev S3:        ${config.devS3.endpoint}/${config.devS3.bucket}`)
  } else if (config.prodS3 && config.localMedia) {
    console.log(`Prod S3:       ${config.prodS3.endpoint}/${config.prodS3.bucket}`)
    console.log(`Local media:   ${config.localMedia.dir}`)
    console.log(`URL prefix:    ${config.localMedia.urlPrefix}`)
  } else {
    console.log('S3:            (not configured — S3 steps will be skipped)')
  }

  console.log('\nSteps:')
  console.log('  1. Check prerequisites (mongodump, mongorestore, unzip)')
  if (!config.flags.noBackupDev) {
    console.log('  2. Backup current dev DB to /tmp')
  }
  console.log('  3. Unzip production mongodump archive')
  console.log('  4. Drop and restore dev DB from dump (mongorestore --drop)')
  console.log('  5. Anonymize PII via direct MongoDB updates:')
  console.log('     - Users: keep admins, anonymize customers (email, name, password, Stripe ID)')
  console.log('     - Addresses: Faker names/address/phone (preserve country, state, customer ref)')
  console.log('     - Orders: Faker shippingAddress, null trackingNumber/Url')
  console.log('     - Transactions: Faker billingAddress, null Stripe IDs')
  console.log('     - Form submissions: redact all values')
  console.log('     - Forms: anonymize email configs')
  console.log('     - Carts: null secrets')
  console.log('     - Drop: payload-locked-documents, payload-preferences')

  if (config.prodS3 && config.devS3 && !config.flags.skipS3) {
    console.log('  6. Copy S3 objects from prod bucket to dev bucket')
    console.log('  7. Rewrite media URLs to point to dev S3 endpoint')
  } else if (config.prodS3 && config.localMedia && !config.flags.skipS3) {
    console.log('  6. Download S3 objects from prod bucket to local media dir')
    console.log('  7. Rewrite media URLs to point to local prefix')
  }
  console.log('  8. Cleanup temp files')
  console.log('')
}

function printStats(stats: RefreshStats): void {
  console.log('\n=== Refresh Complete ===\n')

  if (stats.backupPath) {
    console.log(`Dev DB backup:  ${stats.backupPath}`)
  }
  if (stats.sourceDbName) {
    console.log(`Source DB:      ${stats.sourceDbName}`)
  }

  console.log('\nAnonymization:')
  console.log(`  Users:          ${stats.anonymize.usersAnonymized} anonymized, ${stats.anonymize.usersPreserved} admins preserved`)
  console.log(`  Addresses:      ${stats.anonymize.addressesAnonymized}`)
  console.log(`  Orders:          ${stats.anonymize.ordersAnonymized}`)
  console.log(`  Transactions:    ${stats.anonymize.transactionsAnonymized}`)
  console.log(`  Form submissions: ${stats.anonymize.formSubmissionsAnonymized}`)
  console.log(`  Forms:           ${stats.anonymize.formsAnonymized}`)
  console.log(`  Carts scrubbed:  ${stats.anonymize.cartsScrubbed}`)
  if (stats.anonymize.collectionsDropped.length > 0) {
    console.log(`  Collections dropped: ${stats.anonymize.collectionsDropped.join(', ')}`)
  }

  console.log('\nMedia:')
  if (stats.s3.mode === 'copy') {
    console.log(`  Objects copied:   ${stats.s3.objectsCopied}`)
  } else if (stats.s3.mode === 'download') {
    console.log(`  Objects downloaded: ${stats.s3.objectsCopied}`)
  } else {
    console.log(`  Objects: (skipped)`)
  }
  if (stats.s3.objectsFailed > 0) {
    console.log(`  Objects failed:  ${stats.s3.objectsFailed}`)
  }

  console.log('\nMedia URLs:')
  console.log(`  Documents updated: ${stats.mediaUrls.documentsUpdated}`)
  console.log(`  URLs rewritten:    ${stats.mediaUrls.urlsRewritten}`)

  console.log('')
}

async function main(): Promise<void> {
  let config: Config
  try {
    config = await buildConfig()
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`)
    process.exit(1)
  }

  try {
    await fs.access(config.dumpZipPath)
  } catch {
    console.error(`Error: Dump file not found: ${config.dumpZipPath}`)
    process.exit(1)
  }

  printPlan(config)

  if (config.flags.dryRun) {
    console.log('Dry run — no changes will be made.')
    return
  }

  if (!config.flags.yes) {
    const ok = await prompt('This will OVERWRITE the dev database. Continue? [y/N] ')
    if (!ok) {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  const stats = createEmptyStats()
  const tempDir = path.join(os.tmpdir(), `lepi-labs-refresh-${Date.now()}`)

  try {
    console.log('\n[1] Checking prerequisites ...')
    await checkPrerequisites()
    console.log('  All binaries found.')

    if (!config.flags.noBackupDev) {
      console.log('\n[2] Backing up dev DB ...')
      await backupDevDb(config, stats)
    } else {
      console.log('\n[2] Skipping dev DB backup (--no-backup-dev)')
    }

    console.log('\n[3] Unzipping production dump ...')
    const dumpRoot = await unzipDump(config.dumpZipPath, tempDir)

    console.log('\n[4] Dropping and restoring dev DB ...')
    await dropAndRestore(config, dumpRoot, stats)

    console.log('\n[5] Connecting to dev DB for anonymization ...')
    const client = new MongoClient(config.devDb.uri)
    await client.connect()
    const db = client.db(config.devDb.name)

    const ctx = { db, stats, verbose: config.flags.verbose, emailMap: new Map<string, string>() }
    await anonymizeAll(ctx)

    if (config.flags.skipS3) {
      console.log('\n[6-7] Skipping media steps (--skip-s3)')
    } else if (config.prodS3 && config.devS3) {
      console.log('\n[6] Copying S3 objects from prod to dev bucket ...')
      await copyBucket(config, stats)

      console.log('\n[7] Rewriting media URLs ...')
      await rewriteMediaUrls(db, config, stats)
    } else if (config.prodS3 && config.localMedia) {
      console.log('\n[6] Downloading S3 objects from prod bucket to local dir ...')
      await downloadBucketToLocal(config, stats)

      console.log('\n[7] Rewriting media URLs ...')
      await rewriteMediaUrls(db, config, stats)
    } else {
      console.log('\n[6-7] Skipping media steps (S3 not configured)')
      if (!config.prodS3) {
        console.log('  Hint: Set PROD_S3_* vars in .env.refresh to enable media sync.')
      }
    }

    await client.close()

    console.log('\n[8] Cleaning up temp files ...')
    await cleanupTempDir(tempDir)

    printStats(stats)
  } catch (err) {
    console.error(`\nError: ${(err as Error).message}`)
    console.error('\nRefresh failed. The dev DB may be in a partially restored state.')
    if (stats.backupPath) {
      console.error(`You can restore from backup: mongorestore --drop ${stats.backupPath}`)
    }
    process.exit(1)
  }
}

main()
