import test from 'node:test'
import assert from 'node:assert/strict'
import { register, login, loginDemo, currentUser, SESSION_KEY, resolveRoute } from '../src/auth.ts'
import { createRequest, getRequests, REQUESTS_KEY, visibleRequests } from '../src/procurement.ts'
import { submitOffer, getOffers, countOffers, visibleOffers } from '../src/offers.ts'
import { comparisonOffers } from '../src/comparison.ts'
import { rankOffers } from '../src/ranking.ts'
class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
  removeItem(key) { this.values.delete(key) }
}
test('complete registered buyer/supplier workflow survives storage reload and role switching', () => {
  const storage = new MemoryStorage()
  const account = role => ({ name: `Test ${role}`, company: `Demo ${role}`, email: `${role}@workflow.example`, password: 'DemoPass123!', confirm: 'DemoPass123!', role })
  const buyer = register(storage, account('buyer'))
  login(storage, buyer.email, buyer.password)
  const request = createRequest(storage, buyer, { product: 'Defense wheat seeds', category: 'Seeds', quantity: '10', unit: 'tonnes', specifications: 'Certified seed', deadline: '2099-03-20', description: 'Fictional defense workflow' })
  const supplier = register(storage, account('supplier'))
  login(storage, supplier.email, supplier.password)
  assert.ok(visibleRequests(getRequests(storage), supplier).some(r => r.id === request.id))
  const offer = submitOffer(storage, supplier, request.id, { price: '160000', quantity: '10', days: '5', match: '100', specifications: 'Certified seed supplied', notes: '' })
  const reopened = new MemoryStorage(); reopened.values = new Map(storage.values)
  assert.equal(currentUser(reopened).id, supplier.id)
  assert.equal(visibleOffers(getOffers(reopened), getRequests(reopened), supplier).filter(o => o.id === offer.id).length, 1)
  assert.equal(countOffers(getOffers(reopened), request.id), 1)
  login(reopened, buyer.email, buyer.password)
  assert.equal(comparisonOffers(getRequests(reopened), getOffers(reopened), buyer, request.id).length, 1)
  assert.equal(rankOffers(getRequests(reopened), getOffers(reopened), buyer, request.id).ranked[0].score, 1)
  assert.equal(resolveRoute('/supplier/my-offers', buyer), '/buyer/overview')
  reopened.removeItem(SESSION_KEY); assert.equal(currentUser(reopened), null)
  assert.equal(resolveRoute('/buyer/ranking', currentUser(reopened)), '/login')
})
test('demo switches preserve created requests, submitted offers, and canonical A/B/C scenario', () => {
  const storage = new MemoryStorage()
  const buyer = loginDemo(storage, 'buyer')
  const request = createRequest(storage, buyer, { product: 'Demo inputs', category: 'Fertilizers', quantity: '10', unit: 'tonnes', specifications: 'Granular', deadline: '2099-03-20', description: 'Demo' })
  const supplier = loginDemo(storage, 'supplier')
  submitOffer(storage, supplier, request.id, { price: '180000', quantity: '10', days: '5', match: '100', specifications: 'Granular', notes: '' })
  loginDemo(storage, 'buyer')
  assert.equal(currentUser(storage).id, buyer.id)
  assert.ok(getRequests(storage).some(r => r.id === request.id))
  assert.equal(countOffers(getOffers(storage), request.id), 1)
  const demo = rankOffers(getRequests(storage), getOffers(storage).filter(o => o.demo), buyer, 'demo-npk')
  assert.deepEqual(demo.ranked.map(r => Number((r.score * 100).toFixed(1))), [70.8, 64, 60])
})
test('malformed stored request dates/categories are reported without data loss', () => {
  const storage = new MemoryStorage()
  const good = getRequests(storage)
  for (const patch of [{ deadline: '2027-02-31' }, { createdAt: 'not-a-date' }, { category: 'Unknown' }, { unit: 'Unknown' }]) {
    const raw = JSON.stringify([{ ...good[0], ...patch }])
    storage.setItem(REQUESTS_KEY, raw)
    assert.throws(() => getRequests(storage), /invalid format/)
    assert.equal(storage.getItem(REQUESTS_KEY), raw)
  }
})
