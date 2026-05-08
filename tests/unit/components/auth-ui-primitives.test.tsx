import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AuthCard, AuthHeader, AuthStatusView } from '@/components/auth/auth-card'

describe('auth UI primitives', () => {
  it('renders a consistent auth panel and header structure', () => {
    const markup = renderToStaticMarkup(
      <AuthCard>
        <AuthHeader title="欢迎回来" description="继续管理你的灵感" />
        <button type="button">继续</button>
      </AuthCard>
    )

    expect(markup).toContain('data-slot="auth-panel"')
    expect(markup).toContain('data-slot="auth-header"')
    expect(markup).toContain('欢迎回来')
    expect(markup).toContain('继续管理你的灵感')
  })

  it('renders status screens through the shared auth panel language', () => {
    const markup = renderToStaticMarkup(
      <AuthStatusView
        title="链接已发送"
        description="请前往邮箱查收重置链接。"
        action={<a href="/auth/sign-in">回到登录</a>}
      />
    )

    expect(markup).toContain('data-slot="auth-status"')
    expect(markup).toContain('data-slot="auth-panel"')
    expect(markup).toContain('链接已发送')
    expect(markup).toContain('回到登录')
  })
})
