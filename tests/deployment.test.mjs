import test from 'node:test'
import assert from 'node:assert/strict'
import { routeUrl } from '../src/routeUrl.ts'
import { demoUsers, resolveRoute } from '../src/auth.ts'
test('local and Pages hash redirects retain their respective deployment roots', () => {
  for (const base of ['/', '/AI-AgroProcurement/']) {
    for (const route of ['/login', '/register', '/buyer/overview', '/buyer/ranking/demo-npk', '/supplier/opportunities/demo-npk/submit']) {
      const url = new URL(routeUrl(base, route), 'https://example.com')
      assert.equal(url.pathname, base)
      assert.equal(url.hash, `#${route}`)
    }
  }
})
test('Pages redirects preserve base for anonymous and wrong-role visitors', () => {
  const base = '/AI-AgroProcurement/'
  assert.equal(routeUrl(base, resolveRoute('/buyer/ranking/demo-npk', null)), `${base}#/login`)
  assert.equal(routeUrl(base, resolveRoute('/buyer/comparison', demoUsers[1])), `${base}#/supplier/overview`)
  assert.equal(routeUrl(base, resolveRoute('/supplier/my-offers', demoUsers[0])), `${base}#/buyer/overview`)
})
