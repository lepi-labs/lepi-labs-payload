import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { Config, RefreshStats } from './types.js'

const execFileAsync = promisify(execFile)

async function checkBinary(name: string): Promise<void> {
  try {
    await execFileAsync(name, ['--version'])
  } catch {
    throw new Error(
      `Required binary "${name}" not found. Install it via your package manager or ensure it's on your PATH.`,
    )
  }
}

export async function checkPrerequisites(): Promise<void> {
  await checkBinary('mongorestore')
  await checkBinary('mongodump')
}

export async function backupDevDb(config: Config, stats: RefreshStats): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(os.tmpdir(), `lepi-labs-backup-${timestamp}`)

  console.log(`  Backing up dev DB to ${backupDir} ...`)

  await execFileAsync('mongodump', [
    '--uri', config.devDb.uri,
    '--out', backupDir,
  ])

  stats.backupPath = backupDir
  console.log(`  Dev DB backed up.`)
  return backupDir
}

export async function unzipDump(zipPath: string, tempDir: string): Promise<string> {
  console.log(`  Unzipping ${path.basename(zipPath)} ...`)

  await fs.mkdir(tempDir, { recursive: true })
  await execFileAsync('unzip', ['-o', zipPath, '-d', tempDir])

  const dumpDir = await findDumpRoot(tempDir)
  console.log(`  Dump extracted to ${dumpDir}`)
  return dumpDir
}

async function findDumpRoot(extractDir: string): Promise<string> {
  const entries = await fs.readdir(extractDir, { withFileTypes: true })

  const dbDirs = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== '__MACOSX',
  )

  if (dbDirs.length === 1) {
    const innerPath = path.join(extractDir, dbDirs[0].name)
    const innerEntries = await fs.readdir(innerPath, { withFileTypes: true })
    const hasBson = innerEntries.some((e) => e.isFile() && e.name.endsWith('.bson'))
    if (hasBson) {
      return innerPath
    }
  }

  const hasBsonDirect = entries.some((e) => e.isFile() && e.name.endsWith('.bson'))
  if (hasBsonDirect) {
    return extractDir
  }

  if (dbDirs.length > 0) {
    const candidates: string[] = []
    for (const dir of dbDirs) {
      const dirPath = path.join(extractDir, dir.name)
      const dirEntries = await fs.readdir(dirPath)
      if (dirEntries.some((f) => f.endsWith('.bson'))) {
        candidates.push(dirPath)
      }
    }
    if (candidates.length >= 1) {
      return path.dirname(candidates[0])
    }
  }

  throw new Error(
    `Could not find a valid mongodump directory structure in ${extractDir}. ` +
      'Ensure the zip contains the output of `mongodump --out <dir>`.',
  )
}

export function detectSourceDbName(dumpRoot: string): string {
  return path.basename(dumpRoot)
}

export async function dropAndRestore(
  config: Config,
  dumpRoot: string,
  stats: RefreshStats,
): Promise<void> {
  const sourceDbName = detectSourceDbName(dumpRoot)
  stats.sourceDbName = sourceDbName

  const sameDbName = sourceDbName === config.devDb.name

  console.log(`  Source DB: ${sourceDbName}`)
  console.log(`  Target DB: ${config.devDb.name}`)

  if (sameDbName) {
    console.log(`  Running mongorestore --drop ...`)
    await execFileAsync('mongorestore', [
      '--uri', config.devDb.uri,
      '--drop',
      dumpRoot,
    ])
  } else {
    console.log(`  Running mongorestore with namespace remapping ...`)
    await execFileAsync('mongorestore', [
      '--uri', config.devDb.uri,
      '--nsFrom', `${sourceDbName}.*`,
      '--nsTo', `${config.devDb.name}.*`,
      '--drop',
      dumpRoot,
    ])
  }

  console.log(`  Database restored.`)
}

export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true })
  } catch {
    console.warn(`  Warning: could not remove temp directory ${tempDir}`)
  }
}
