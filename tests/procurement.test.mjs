import test from 'node:test'
import assert from 'node:assert/strict'
import { demoUsers, resolveRoute } from '../src/auth.ts'
import { categories, createRequest, filterSuppliers, getRequests, REQUESTS_KEY, sampleRequests, todayISO, validateRequest, visibleRequests } from '../src/procurement.ts'
class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
}
const buyer = demoUsers[0], supplier = demoUsers[1]
const valid = { product: 'Spring wheat seeds', category: 'Seeds', quantity: '25.5', unit: 'tonnes', specifications: 'Germination ≥ 95%', deadline: '2099-03-25', description: 'Deliver to Kostanay; quote in KZT.' }
test('catalog searches suppliers and products case-insensitively, combined with categories', () => {
  assert.equal(filterSuppliers('  AKMOLA  ', 'All').length, 1)
  assert.equal(filterSuppliers('wheat', 'Seeds').length, 2)
  assert.equal(filterSuppliers('wheat', 'Fertilizers').length, 0)
  assert.equal(filterSuppliers('not-a-supplier', 'All').length, 0)
  for (const category of categories) {
    const results = filterSuppliers('', category)
    assert.ok(results.length)
    assert.ok(results.every(s => s.products.every(p => p.category === category)))
  }
  assert.equal(filterSuppliers('', 'All').length, 4)
})
test('all request fields required; positive finite quantity; valid future dates', () => {
  assert.equal(Object.keys(validateRequest(valid)).length, 0)
  const empty = Object.fromEntries(Object.keys(valid).map(k => [k, '']))
  assert.equal(Object.keys(validateRequest(empty)).length, 7)
  for (const quantity of ['0', '-1', 'NaN', 'Infinity', ' ', '1e999']) assert.ok(validateRequest({ ...valid, quantity }).quantity)
  for (const deadline of ['2020-01-01', '2099-02-31', 'not-a-date', '']) assert.ok(validateRequest({ ...valid, deadline }).deadline)
  assert.ok(validateRequest({ ...valid, category: 'Unknown' }).category)
  assert.ok(validateRequest({ ...valid, unit: 'Unknown' }).unit)
  assert.equal(validateRequest({ ...valid, deadline: '2027-03-01' }, '2027-03-01').deadline, undefined)
})
test('request creation persists fields, ownership, Open status and zero offers', () => {
  const storage = new MemoryStorage()
  assert.equal(getRequests(storage).length, 3)
  assert.equal(getRequests(storage).length, 3)
  const request = createRequest(storage, buyer, { ...valid, product: ' Spring wheat seeds ' })
  assert.equal(request.product, valid.product)
  assert.equal(request.quantity, 25.5)
  assert.equal(request.buyerId, buyer.id)
  assert.equal(request.status, 'Open')
  assert.equal(request.offers, 0)
  assert.equal(request.demo, false)
  assert.deepEqual(getRequests(storage).find(r => r.id === request.id), request)
  assert.equal(getRequests(storage).length, 4)
})
test('supplier cannot create requests; invalid requests do not mutate storage', () => {
  const storage = new MemoryStorage()
  assert.throws(() => createRequest(storage, supplier, valid), /Only buyers/)
  assert.throws(() => createRequest(storage, buyer, { ...valid, quantity: '0' }), /highlighted/)
  assert.equal(storage.getItem(REQUESTS_KEY), null)
})
test('buyers see only their own requests; suppliers see only open requests', () => {
  const another = { ...buyer, id: 'another-buyer', company: 'Another Farm' }
  const storage = new MemoryStorage()
  const own = createRequest(storage, another, valid)
  const all = [...getRequests(storage), { ...sampleRequests[0], id: 'closed-request', status: 'Closed' }]
  assert.deepEqual(visibleRequests(all, another).map(r => r.id), [own.id])
  assert.ok(!visibleRequests(all, buyer).some(r => r.id === own.id))
  assert.ok(visibleRequests(all, supplier).some(r => r.id === own.id))
  assert.ok(visibleRequests(all, supplier).every(r => r.status === 'Open'))
})
test('new and detail routes respect role boundaries and anonymous protection', () => {
  for (const route of ['/buyer/requests/new', '/buyer/requests/demo-npk']) {
    assert.equal(resolveRoute(route, buyer), route)
    assert.equal(resolveRoute(route, supplier), '/supplier/overview')
    assert.equal(resolveRoute(route, null), '/login')
  }
  assert.equal(resolveRoute('/supplier/opportunities/demo-npk', supplier), '/supplier/opportunities/demo-npk')
  assert.equal(resolveRoute('/supplier/opportunities/demo-npk', buyer), '/buyer/overview')
  assert.equal(resolveRoute('/supplier/requests/new', supplier), '/supplier/overview')
})
test('corrupt storage is reported without overwriting user data; saved empty array stays empty', () => {
  const storage = new MemoryStorage()
  for (const data of ['broken', '{}', '[{}]']) {
    storage.setItem(REQUESTS_KEY, data)
    assert.throws(() => getRequests(storage), /not been overwritten/)
    assert.equal(storage.getItem(REQUESTS_KEY), data)
  }
  storage.setItem(REQUESTS_KEY, '[]')
  assert.deepEqual(getRequests(storage), [])
})
test('write failures never report a saved request', () => {
  const storage = { getItem() { return '[]' }, setItem() { throw new Error('Quota exceeded') } }
  assert.throws(() => createRequest(storage, buyer, valid), /Quota exceeded/)
})
test('date helper respects client timezone at midnight', () => {
  assert.equal(todayISO(new Date('2026-10-17T20:30:00Z')), '2026-10-18')
})
