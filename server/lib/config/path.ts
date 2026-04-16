import 'server-only'
import path from 'node:path'

export const SERVER_ROOT = process.cwd()
export const TEMPLATES_DIR = path.resolve(SERVER_ROOT, 'server', 'prompts')
