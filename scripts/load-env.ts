import { config } from 'dotenv'

const envFile =
  process.env.DOTENV_CONFIG_PATH ??
  (process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development')

config({ path: envFile, quiet: true })
