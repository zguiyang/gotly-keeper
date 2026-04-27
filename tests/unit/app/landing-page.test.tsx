import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LandingPage from '@/app/page'

vi.mock('@/server/modules/auth/session', () => ({
  getSignedInUser: vi.fn(async () => null),
}))

describe('landing page', () => {
  it('renders the new brand narrative and manifesto without a footer CTA button', async () => {
    const page = await LandingPage()
    const markup = renderToStaticMarkup(page)

    expect(markup.match(/<h1/g)?.length).toBe(1)
    expect(markup).toContain('把零碎想法，收进一处安静的入口。')
    expect(markup).toContain('你先交给我，我替你安静收好。')
    expect(markup).toMatch(/<a[^>]+href="\/auth\/sign-in"[^>]*>登录后进入工作区/)
    expect(markup).toContain('查看核心能力')
    expect(markup).toContain('href="/auth/sign-in"')
    expect(markup).toContain('href="#capabilities"')
    expect(markup).toContain('id="capabilities"')
    expect(markup).toContain('id="scenarios"')
    expect(markup).toContain('id="principles"')
    expect(markup).toContain('href="#manifesto"')
    expect(markup).toContain('id="manifesto"')
    expect(markup).toContain('aria-label="页面导航"')
    expect(markup).toContain('核心能力')
    expect(markup).toContain('使用场景')
    expect(markup).toContain('产品原则')
    expect(markup).toContain('品牌宣言')
    expect(markup).toContain('<header')
    expect(markup).toContain('<main')
    expect(markup).toContain('<footer')
    expect(markup).toMatch(/<header class="[^"]+"/)
    expect(markup).toMatch(/<nav class="[^"]+" aria-label="页面导航"/)
    expect(markup).toMatch(/<section id="capabilities" class="[^"]+"/)
    expect(markup).toMatch(/<article class="[^"]+" data-index="0"/)
    expect(markup).toContain('AI 统一入口优先')
    expect(markup).toContain('Gotly Keeper 更像一处安静入口。')
    expect(markup).toContain('Quietly keeping what matters')
    expect(markup).toContain('轻量记录')
    expect(markup).toContain('智能归档')
    expect(markup).toContain('自然找回')

    const manifestoIndex = markup.indexOf('你先交给我，我替你安静收好。')
    const trailingMarkup = markup.slice(manifestoIndex)

    expect(trailingMarkup).not.toContain('<button')
    expect(trailingMarkup).not.toContain('href="/workspace"')
  })
})
