import test from 'node:test'
import assert from 'node:assert/strict'
import { demoUsers, resolveRoute } from '../src/auth.ts'
import { sampleRequests } from '../src/procurement.ts'
import { demoOffers, eligibility } from '../src/offers.ts'
import { comparisonHighlights, comparisonOffers, comparisonRequests } from '../src/comparison.ts'
const buyer = demoUsers[0], supplier = demoUsers[1]
test('comparison requests and linked offers are strictly scoped to buyer ownership', () => {
  const other = { ...buyer, id: 'another-buyer' }
  const requests = [...sampleRequests, { ...sampleRequests[0], id: 'private-request', buyerId: other.id }]
  const offers = [...demoOffers, { ...demoOffers[0], id: 'private-offer', requestId: 'private-request' }]
  assert.equal(comparisonRequests(requests, buyer).length, 3)
  assert.equal(comparisonRequests(requests, supplier).length, 0)
  assert.deepEqual(comparisonOffers(requests, offers, buyer, 'private-request'), [])
  assert.deepEqual(comparisonOffers(requests, offers, supplier, 'demo-npk'), [])
  assert.equal(comparisonOffers(requests, offers, other, 'private-request').length, 1)
  assert.deepEqual(comparisonOffers(requests, offers, buyer, 'unknown'), [])
})
test('fertilizer comparison contains exact A/B/C demo metrics and ineligible reasons', () => {
  const offers = comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-npk')
  assert.equal(offers.length, 5)
  assert.deepEqual(offers.slice(0, 3).map(o => [o.price, o.days, o.match]), [[182000, 5, 100], [170000, 9, 80], [195000, 3, 100]])
  assert.ok(offers.slice(0, 3).every(o => eligibility(o, sampleRequests[0]).eligible))
  assert.deepEqual(eligibility(offers[3], sampleRequests[0]).reasons, ['Insufficient quantity'])
  assert.deepEqual(eligibility(offers[4], sampleRequests[0]).reasons, ['Delivery after deadline'])
})
test('all sort modes order a copy and retain all eligible and ineligible offers', () => {
  const snapshot = JSON.stringify(demoOffers)
  const price = comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-npk', 'price')
  assert.deepEqual(price.map(o => o.price), [165000, 170000, 178000, 182000, 195000])
  const delivery = comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-npk', 'delivery')
  assert.deepEqual(delivery.map(o => o.days), [3, 4, 5, 9, 200])
  const match = comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-npk', 'match')
  assert.deepEqual(match.map(o => o.match), [100, 100, 100, 100, 80])
  assert.deepEqual(comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-npk').map(o => o.id), demoOffers.slice(0, 5).map(o => o.id))
  assert.equal(JSON.stringify(demoOffers), snapshot)
})
test('highlights include ties and ineligible offers without assigning a rank', () => {
  const offers = comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-npk')
  const highlights = comparisonHighlights(offers)
  assert.deepEqual(highlights, { price: 165000, days: 3, match: 100 })
  assert.equal(offers.filter(o => o.match === highlights.match).length, 4)
  assert.deepEqual(comparisonHighlights([]), null)
  assert.deepEqual(comparisonHighlights([offers[1]]), { price: 170000, days: 9, match: 80 })
})
test('changing requests changes linked offers, including empty request cases', () => {
  assert.equal(comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-wheat').length, 3)
  assert.ok(comparisonOffers(sampleRequests, demoOffers, buyer, 'demo-protection').every(o => o.requestId === 'demo-protection'))
  assert.deepEqual(comparisonOffers(sampleRequests, [], buyer, 'demo-npk'), [])
  assert.deepEqual(comparisonRequests([], buyer), [])
})
test('comparison route is buyer-only and requires authentication', () => {
  assert.equal(resolveRoute('/buyer/comparison', buyer), '/buyer/comparison')
  assert.equal(resolveRoute('/buyer/comparison', supplier), '/supplier/overview')
  assert.equal(resolveRoute('/buyer/comparison', null), '/login')
  assert.equal(resolveRoute('/supplier/comparison', supplier), '/supplier/overview')
})
