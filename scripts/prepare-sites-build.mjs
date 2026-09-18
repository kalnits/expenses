import { copyFile, cp, mkdir, readdir, rename } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distributionDirectory = resolve(projectDirectory, 'dist')
const clientDirectory = resolve(distributionDirectory, 'client')
const serverDirectory = resolve(projectDirectory, 'dist/server')
const metadataDirectory = resolve(projectDirectory, 'dist/.openai')

await mkdir(clientDirectory, { recursive: true })
for (const entry of await readdir(distributionDirectory)) {
  if (['.openai', 'client', 'server'].includes(entry)) continue
  await rename(resolve(distributionDirectory, entry), resolve(clientDirectory, entry))
}

await Promise.all([
  mkdir(serverDirectory, { recursive: true }),
  mkdir(metadataDirectory, { recursive: true }),
])

await Promise.all([
  copyFile(resolve(projectDirectory, 'sites/worker.js'), resolve(serverDirectory, 'index.js')),
  copyFile(
    resolve(projectDirectory, '.openai/hosting.json'),
    resolve(metadataDirectory, 'hosting.json'),
  ),
  cp(
    resolve(projectDirectory, 'drizzle'),
    resolve(metadataDirectory, 'drizzle'),
    { recursive: true },
  ),
])
