const testEnvDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  TZ: 'UTC',
  POSTGRES_HOST: '127.0.0.1',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  POSTGRES_DATABASE: 'gotly_test',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
  BETTER_AUTH_URL: 'http://localhost:3000',
}

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}
