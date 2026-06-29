const testEnvDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  TZ: 'UTC',
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/gotly_keeper_test',
  REDIS_URL: 'redis://127.0.0.1:6379/0',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
  BETTER_AUTH_URL: 'http://localhost:3000',
}

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}
