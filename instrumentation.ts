export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  const [{ checkDatabaseConnection }, { checkRedisConnection }] = await Promise.all([
    import('@/server/lib/db/client'),
    import('@/server/lib/cache/redis'),
  ])

  const checks = await Promise.allSettled([checkDatabaseConnection(), checkRedisConnection()])
  const failures = checks
    .map((result, index) => ({ result, service: index === 0 ? 'Postgres' : 'Redis' }))
    .filter((item) => item.result.status === 'rejected')

  if (failures.length > 0) {
    const detail = failures
      .map(({ service, result }) =>
        `${service}: ${
          result.status === 'rejected'
            ? result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
            : 'unknown'
        }`
      )
      .join('; ')

    throw new Error(`[startup] Infrastructure startup check failed - ${detail}`)
  }
}
