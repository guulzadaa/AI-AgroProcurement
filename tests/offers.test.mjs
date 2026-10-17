import test from 'node:test'
import assert from 'node:assert/strict'
import { demoUsers, resolveRoute } from '../src/auth.ts'
import { createRequest, getRequests, REQUESTS_KEY } from '../src/procurement.ts'
import { countOffers, demoOffers, eligibility, getOffers, OFFERS_KEY, submitOffer, validateOffer, visibleOffers } from '../src/offers.ts'
class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
}
const buyer = demoUsers[0], supplier = demoUsers[1]
const valid = { price: '182000', quantity: '10', days: '5', specifications: 'NPK 16:16:16; 50 kg bags; certificate of analysis.', match: '100', notes: '' }
test('seeds at least ten linked fictional offers once with exact A/B/C values', () => {
  const storage = new MemoryStorage()
  const offers = getOffers(storage), requests = getRequests(storage)
  assert.ok(offers.length >= 10)
  assert.equal(getOffers(storage).length, offers.length)
  assert.ok(offers.every(o => requests.some(r => r.id === o.requestId) && o.demo))
  const fertilizer = requests.find(r => r.id === 'demo-npk')
  assert.equal(fertilizer.quantity, 10)
  assert.deepEqual(offers.slice(0, 3).map(o => [o.price, o.days, o.match]), [[182000, 5, 100], [170000, 9, 80], [195000, 3, 100]])
  assert.ok(offers.slice(0, 3).every(o => eligibility(o, fertilizer).eligible))
  assert.ok(!eligibility(offers[3], fertilizer).eligible)
  assert.match(eligibility(offers[4], fertilizer).reasons.join(), /after deadline/)
  assert.equal(countOffers(offers, 'demo-npk'), 5)
})
test('migrates only the existing main demonstration request, preserving user data', () => {
  const storage = new MemoryStorage()
  const requests = getRequests(storage)
  requests[0].quantity = 80
  requests.push({ ...requests[0], id: 'user-request', demo: false, quantity: 44 })
  storage.setItem(REQUESTS_KEY, JSON.stringify(requests))
  assert.equal(getRequests(storage)[0].quantity, 10)
  assert.equal(getRequests(storage).find(r => r.id === 'user-request').quantity, 44)
})
test('validates prices, quantities, whole delivery days, specs and declared match', () => {
  assert.deepEqual(validateOffer(valid), {})
  for (const value of ['', '0', '-1', 'Infinity', 'NaN']) for (const field of ['price', 'quantity']) assert.ok(validateOffer({ ...valid, [field]: value })[field])
  for (const days of ['', '0', '-1', '1.5', 'Infinity', '3651']) assert.ok(validateOffer({ ...valid, days }).days)
  for (const match of ['', '-1', '101', 'NaN']) assert.ok(validateOffer({ ...valid, match }).match)
  assert.ok(validateOffer({ ...valid, specifications: ' ' }).specifications)
  assert.deepEqual(validateOffer({ ...valid, match: '0', notes: '' }), {})
})
test('supplier submits persistent offer linked to request and account; count derives from records', () => {
  const storage = new MemoryStorage()
  const before = countOffers(getOffers(storage), 'demo-npk')
  const offer = submitOffer(storage, supplier, 'demo-npk', valid)
  assert.equal(offer.supplierId, supplier.id)
  assert.equal(offer.company, supplier.company)
  assert.equal(offer.requestId, 'demo-npk')
  assert.equal(offer.demo, false)
  assert.deepEqual(getOffers(storage).find(o => o.id === offer.id), offer)
  assert.equal(countOffers(getOffers(storage), 'demo-npk'), before + 1)
  assert.throws(() => submitOffer(storage, supplier, 'demo-npk', valid), /already submitted/)
})
test('buyers, closed, expired, missing requests, invalid forms cannot submit', () => {
  const storage = new MemoryStorage()
  assert.throws(() => submitOffer(storage, buyer, 'demo-npk', valid), /Only suppliers/)
  assert.throws(() => submitOffer(storage, supplier, 'missing', valid), /available/)
  assert.throws(() => submitOffer(storage, supplier, 'demo-npk', { ...valid, price: '0' }), /highlighted/)
  const requests = getRequests(storage)
  requests[0].status = 'Closed'
  storage.setItem(REQUESTS_KEY, JSON.stringify(requests))
  assert.throws(() => submitOffer(storage, supplier, 'demo-npk', valid), /no longer open/)
  requests[0].status = 'Open'; requests[0].deadline = '2020-01-01'
  storage.setItem(REQUESTS_KEY, JSON.stringify(requests))
  assert.throws(() => submitOffer(storage, supplier, 'demo-npk', valid), /deadline has passed/)
})
test('visibility enforces supplier ownership and buyer request ownership', () => {
  const storage = new MemoryStorage()
  const anotherBuyer = { ...buyer, id: 'new-buyer' }
  const request = createRequest(storage, anotherBuyer, { product: 'Seed', category: 'Seeds', quantity: '10', unit: 'tonnes', deadline: '2099-01-01', specifications: 'Certified', description: 'Test' })
  const offer = submitOffer(storage, supplier, request.id, valid)
  const requests = getRequests(storage), offers = getOffers(storage)
  assert.ok(visibleOffers(offers, requests, supplier).every(o => o.supplierId === supplier.id))
  assert.ok(!visibleOffers(offers, requests, buyer).some(o => o.id === offer.id))
  assert.deepEqual(visibleOffers(offers, requests, anotherBuyer).map(o => o.id), [offer.id])
  assert.equal(visibleOffers(offers, requests, { ...supplier, id: 'unrelated' }).length, 0)
})
test('eligibility uses submission date, inclusive deadline and quantity; match is not ranked', () => {
  const request = { ...getRequests(new MemoryStorage())[0], deadline: '2026-10-23', quantity: 10 }
  const offer = { ...demoOffers[0], submittedAt: '2026-10-18T10:00:00Z', days: 5, quantity: 10, match: 80 }
  assert.deepEqual(eligibility(offer, request), { eligible: true, reasons: [], arrivalDate: '2026-10-23' })
  assert.equal(eligibility({ ...offer, days: 6, quantity: 9 }, request).reasons.length, 2)
})
test('offer submit routes reject buyers and anonymous users', () => {
  const path = '/supplier/opportunities/demo-npk/submit'
  assert.equal(resolveRoute(path, supplier), path)
  assert.equal(resolveRoute(path, buyer), '/buyer/overview')
  assert.equal(resolveRoute(path, null), '/login')
})
test('corrupt offers remain untouched, empty offers persist, write errors propagate', () => {
  const storage = new MemoryStorage()
  for (const raw of ['broken', '{}', '[{}]']) {
    storage.setItem(OFFERS_KEY, raw)
    assert.throws(() => getOffers(storage), /not been overwritten/)
    assert.equal(storage.getItem(OFFERS_KEY), raw)
  }
  storage.setItem(OFFERS_KEY, '[]'); assert.deepEqual(getOffers(storage), [])
  getRequests(storage)
  storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.throws(() => submitOffer(storage, supplier, 'demo-npk', valid), /Quota exceeded/)
})
