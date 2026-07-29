import type { Db } from 'mongodb'

export interface DevDbConfig {
  uri: string
  name: string
}

export interface S3Config {
  bucket: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  /**
   * The public URL base that appears in media document `url` fields.
   * Derived from endpoint + bucket unless overridden via env var.
   * Example: "https://nyc3.digitaloceanspaces.com/lepi-labs-payload-storage"
   */
  publicUrlBase: string
}

export interface LocalMediaConfig {
  /**
   * Absolute path to the local media directory (Payload upload `staticDir`).
   * Files from the prod bucket are downloaded here, preserving object key paths.
   */
  dir: string
  /**
   * URL prefix that serves files from `dir`.
   * Used as the replacement base when rewriting media `url` fields.
   * Example: "/api/media/file"
   */
  urlPrefix: string
}

export interface CliFlags {
  yes: boolean
  dryRun: boolean
  skipS3: boolean
  noBackupDev: boolean
  verbose: boolean
}

export interface Config {
  dumpZipPath: string
  devDb: DevDbConfig
  devS3: S3Config | null
  prodS3: S3Config | null
  /**
   * Set when `prodS3` is configured but `devS3` is not — the script downloads
   * prod bucket objects to a local directory and rewrites media URLs to a
   * local prefix. Null when both S3 configs are present (S3→S3 copy mode) or
   * when prod S3 is not configured.
   */
  localMedia: LocalMediaConfig | null
  flags: CliFlags
}

export interface RefreshStats {
  backupPath: string | null
  sourceDbName: string | null
  anonymize: {
    usersAnonymized: number
    usersPreserved: number
    addressesAnonymized: number
    ordersAnonymized: number
    transactionsAnonymized: number
    formSubmissionsAnonymized: number
    formsAnonymized: number
    cartsScrubbed: number
    collectionsDropped: string[]
  }
  s3: {
    mode: 'copy' | 'download' | 'skipped'
    objectsCopied: number
    objectsFailed: number
    objectsSkipped: number
  }
  mediaUrls: {
    documentsUpdated: number
    urlsRewritten: number
  }
}

export function createEmptyStats(): RefreshStats {
  return {
    backupPath: null,
    sourceDbName: null,
    anonymize: {
      usersAnonymized: 0,
      usersPreserved: 0,
      addressesAnonymized: 0,
      ordersAnonymized: 0,
      transactionsAnonymized: 0,
      formSubmissionsAnonymized: 0,
      formsAnonymized: 0,
      cartsScrubbed: 0,
      collectionsDropped: [],
    },
    s3: {
      mode: 'skipped',
      objectsCopied: 0,
      objectsFailed: 0,
      objectsSkipped: 0,
    },
    mediaUrls: {
      documentsUpdated: 0,
      urlsRewritten: 0,
    },
  }
}

export type AnonymizeContext = {
  db: Db
  stats: RefreshStats
  verbose: boolean
  emailMap: Map<string, string>
}
