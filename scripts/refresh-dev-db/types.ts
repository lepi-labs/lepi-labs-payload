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
