import test from 'node:test'
import assert from 'node:assert/strict'
import { demoUsers, resolveRoute } from '../src/auth.ts'
import { sampleRequests } from '../src/procurement.ts'
import { demoOffers } from '../src/offers.ts'
import { defaultWeights, normalizeWeights, rankOffers } from '../src/ranking.ts'
const buyer = demoUsers[0], supplier = demoUsers[1]
const scenario = demoOffers.slice(0, 5)
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`)
test('normalizes default, arbitrary, zero, and invalid weights', () => {
  assert.deepEqual(normalizeWeights(defaultWeights), { price: .4, delivery: .3, match: .3 })
  const w = normalizeWeights({ price: 2, delivery: 3, match: 5 })
  near(w.price + w.delivery + w.match, 1)
  assert.deepEqual(w, { price: .2, delivery: .3, match: .5 })
  assert.deepEqual(normalizeWeights({ price: 0, delivery: 0, match: 0 }), { price: .4, delivery: .3, match: .3 })
  assert.deepEqual(normalizeWeights({ price: NaN, delivery: -5, match: Infinity }), { price: .4, delivery: .3, match: .3 })
})
test('A/B/C reproduce exact formula and expected default ranking', () => {
  const result = rankOffers(sampleRequests, scenario, buyer, 'demo-npk')
  assert.deepEqual(result.ranked.map(r => r.offer.id), ['offer-a', 'offer-b', 'offer-c'])
  near(result.ranked[0].score, .708)
  near(result.ranked[1].score, .64)
  near(result.ranked[2].score, .6)
  near(result.ranked[0].normalized.price, 13 / 25)
  near(result.ranked[0].normalized.delivery, 4 / 6)
  for (const r of result.ranked) near(r.score, Object.values(r.contributions).reduce((a, b) => a + b, 0))
})
test('excludes insufficient and late offers before calculating bounds', () => {
  const result = rankOffers(sampleRequests, scenario, buyer, 'demo-npk')
  assert.deepEqual(result.bounds, { minPrice: 170000, maxPrice: 195000, minDays: 3, maxDays: 9 })
  assert.deepEqual(result.excluded.map(r => r.reasons), [['Insufficient quantity'], ['Delivery after deadline']])
  const boundary = { ...demoOffers[0], id: 'boundary', days: 5, submittedAt: '2027-03-10T00:00:00Z', quantity: 10 }
  assert.equal(rankOffers(sampleRequests, [boundary], buyer, 'demo-npk').ranked.length, 1)
  assert.equal(rankOffers(sampleRequests, [{ ...boundary, days: 6 }], buyer, 'demo-npk').excluded.length, 1)
})
test('changing price/delivery weights changes recommendations immediately', () => {
  assert.equal(rankOffers(sampleRequests, scenario, buyer, 'demo-npk', { price: 100, delivery: 0, match: 0 }).ranked[0].offer.id, 'offer-b')
  assert.equal(rankOffers(sampleRequests, scenario, buyer, 'demo-npk', { price: 0, delivery: 100, match: 0 }).ranked[0].offer.id, 'offer-c')
  const match = rankOffers(sampleRequests, scenario, buyer, 'demo-npk', { price: 0, delivery: 0, match: 100 })
  assert.deepEqual(match.ranked.map(r => r.rank), [1, 1, 3])
})
test('equal values and a single eligible offer avoid zero denominators', () => {
  const same = scenario.slice(0, 3).map(o => ({ ...o, price: 180000, days: 5, match: 100 }))
  const result = rankOffers(sampleRequests, same, buyer, 'demo-npk')
  assert.ok(result.ranked.every(r => r.score === 1 && r.rank === 1))
  assert.ok(result.ranked.every(r => r.normalized.price === 1 && r.normalized.delivery === 1))
  assert.equal(rankOffers(sampleRequests, [same[0]], buyer, 'demo-npk').ranked[0].score, 1)
})
test('empty/all excluded sets never produce recommendations or invalid scores', () => {
  const empty = rankOffers(sampleRequests, [], buyer, 'demo-npk')
  assert.deepEqual(empty.ranked, [])
  assert.equal(empty.bounds, null)
  const excluded = rankOffers(sampleRequests, scenario.slice(3), buyer, 'demo-npk')
  assert.equal(excluded.excluded.length, 2)
  assert.deepEqual(excluded.ranked, [])
  assert.equal(excluded.bounds, null)
})
test('buyer-only ownership enforced by algorithm and route guard', () => {
  for (const user of [supplier, { ...buyer, id: 'other-buyer' }]) {
    const result = rankOffers(sampleRequests, scenario, user, 'demo-npk')
    assert.deepEqual(result.ranked, [])
    assert.deepEqual(result.excluded, [])
  }
  for (const path of ['/buyer/ranking', '/buyer/ranking/demo-npk']) {
    assert.equal(resolveRoute(path, buyer), path)
    assert.equal(resolveRoute(path, supplier), '/supplier/overview')
    assert.equal(resolveRoute(path, null), '/login')
  }
})
test('all saved eligible submissions participate without mutating data', () => {
  const additional = { ...scenario[0], id: 'additional', price: 175000, days: 2 }
  const input = [...scenario, additional]
  const before = JSON.stringify(input)
  const result = rankOffers(sampleRequests, input, buyer, 'demo-npk')
  assert.equal(result.ranked.length, 4)
  assert.equal(result.ranked[0].offer.id, 'additional')
  assert.equal(JSON.stringify(input), before)
  assert.ok(result.ranked.every(r => r.score >= 0 && r.score <= 1))
})

