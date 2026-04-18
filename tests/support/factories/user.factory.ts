import type { Session, User } from '@/server/lib/db/schema'

export interface UserFactoryOptions {
  id?: string
  name?: string
  email?: string
  emailVerified?: boolean
  image?: string | null
  role?: 'user' | 'super_admin'
  createdAt?: Date
  updatedAt?: Date
}

export function createUserFixture(options: UserFactoryOptions = {}): User {
  const now = new Date()
  return {
    id: options.id ?? 'user-test-id',
    name: options.name ?? 'Test User',
    email: options.email ?? 'test@example.com',
    emailVerified: options.emailVerified ?? false,
    image: options.image ?? null,
    role: options.role ?? 'user',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  }
}

export interface SessionFactoryOptions {
  id?: string
  userId?: string
  token?: string
  expiresAt?: Date
  ipAddress?: string | null
  userAgent?: string | null
}

export function createSessionFixture(options: SessionFactoryOptions = {}): Session {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  return {
    id: options.id ?? 'session-test-id',
    token: options.token ?? 'test-session-token',
    userId: options.userId ?? 'user-test-id',
    expiresAt: options.expiresAt ?? futureDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: options.ipAddress ?? null,
    userAgent: options.userAgent ?? null,
  }
}

export const userFixtures = {
  default: () => createUserFixture(),
  withEmail: (email: string) => createUserFixture({ email }),
}
