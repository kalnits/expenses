import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const serverDirectory = resolve(projectDirectory, 'dist/server')
const metadataDirectory = resolve(projectDirectory, 'dist/.openai')

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
])
