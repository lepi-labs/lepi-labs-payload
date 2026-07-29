import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Config, S3Config, LocalMediaConfig, CliFlags } from './types.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const projectRoot = path.resolve(dirname, '..', '..')

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

async function loadEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return parseEnvFile(content)
  } catch {
    return {}
  }
}

function parseCliFlags(argv: string[]): CliFlags {
  return {
    yes: argv.includes('--yes'),
    dryRun: argv.includes('--dry-run'),
    skipS3: argv.includes('--skip-s3'),
    noBackupDev: argv.includes('--no-backup-dev'),
    verbose: argv.includes('--verbose'),
  }
}

function parsePositionalArg(argv: string[]): string {
  const positional = argv.filter((arg) => !arg.startsWith('-') && arg !== 'tsx')
  if (positional.length === 0) {
    throw new Error(
      'Usage: pnpm refresh-dev <path-to-mongodump.zip> [--yes] [--dry-run] [--skip-s3] [--no-backup-dev] [--verbose]',
    )
  }
  return positional[0]
}

function parseDatabaseName(uri: string): string {
  const url = new URL(uri)
  const dbName = url.pathname.slice(1)
  if (!dbName) {
    throw new Error(`Could not parse database name from DATABASE_URL: ${uri}`)
  }
  return dbName
}

function buildS3Config(
  prefix: string,
  env: Record<string, string | undefined>,
): S3Config | null {
  const bucket = env[`${prefix}_BUCKET`]
  const endpoint = env[`${prefix}_ENDPOINT`]
  const accessKeyId = env[`${prefix}_ACCESS_KEY_ID`]
  const secretAccessKey = env[`${prefix}_SECRET_ACCESS_KEY`]
  const region = env[`${prefix}_REGION`] || ''

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null
  }

  const normalizedEndpoint = endpoint.replace(/\/+$/, '')
  const explicitPublicUrl = env[`${prefix}_PUBLIC_URL`]
  const publicUrlBase = (explicitPublicUrl || `${normalizedEndpoint}/${bucket}`).replace(/\/+$/, '')

  return { bucket, endpoint: normalizedEndpoint, accessKeyId, secretAccessKey, region, publicUrlBase }
}

function buildLocalMediaConfig(
  env: Record<string, string | undefined>,
  projectRoot: string,
): LocalMediaConfig {
  const dir = env.MEDIA_LOCAL_DIR
    ? path.resolve(env.MEDIA_LOCAL_DIR)
    : path.resolve(projectRoot, 'public', 'media')
  const urlPrefix = (env.MEDIA_LOCAL_URL_PREFIX || '/api/media/file').replace(/\/+$/, '')
  return { dir, urlPrefix }
}

export async function buildConfig(): Promise<Config> {
  const argv = process.argv.slice(2)
  const dumpZipPath = parsePositionalArg(argv)
  const flags = parseCliFlags(argv)

  const devEnv = await loadEnvFile(path.resolve(projectRoot, '.env'))
  const refreshEnv = await loadEnvFile(path.resolve(projectRoot, '.env.refresh'))

  const mergedEnv: Record<string, string | undefined> = {
    ...devEnv,
    ...refreshEnv,
    ...process.env,
  }

  const databaseUrl = mergedEnv.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env')
  }

  const devDb = {
    uri: databaseUrl,
    name: parseDatabaseName(databaseUrl),
  }

  const devS3 = buildS3Config('S3', mergedEnv)
  const prodS3 = buildS3Config('PROD_S3', mergedEnv)

  // Local download mode is enabled when prod S3 is configured but dev S3 is not.
  // In that case, prod bucket objects are downloaded to a local directory and
  // media URLs are rewritten to point to the local prefix.
  const localMedia = prodS3 && !devS3 ? buildLocalMediaConfig(mergedEnv, projectRoot) : null

  const resolvedDumpPath = path.resolve(process.cwd(), dumpZipPath)

  return {
    dumpZipPath: resolvedDumpPath,
    devDb,
    devS3,
    prodS3,
    localMedia,
    flags,
  }
}
