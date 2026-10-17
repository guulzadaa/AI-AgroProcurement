import test from 'node:test'
import assert from 'node:assert/strict'
import { currentUser, demoUsers, getUsers, homeRoute, login, register, resolveRoute, SESSION_KEY, USERS_KEY, validateRegistration } from '../src/auth.ts'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
  removeItem(key) { this.values.delete(key) }
}
const input = role => ({ name: 'Morgan Lee', company: 'Field Partners', email: `${role}@example.com`, password: 'Example123!', confirm: 'Example123!', role })

test('seeds both demo accounts without duplicating them', () => {
  const storage = new MemoryStorage()
  assert.equal(getUsers(storage).length, 2)
  assert.equal(getUsers(storage).length, 2)
  assert.equal(currentUser(storage), null)
})
for (const role of ['buyer', 'supplier']) {
  test(`${role}: demo login, persistent session, and logout`, () => {
    const storage = new MemoryStorage()
    const demo = demoUsers.find(u => u.role === role)
    const user = login(storage, `  ${demo.email.toUpperCase()}  `, demo.password)
    assert.equal(user.role, role)
    assert.equal(currentUser(storage).id, user.id)
    assert.deepEqual(JSON.parse(storage.getItem(SESSION_KEY)), { userId: user.id })
    storage.removeItem(SESSION_KEY)
    assert.equal(currentUser(storage), null)
  })
  test(`${role}: register, normalized email, login and duplicate rejection`, () => {
    const storage = new MemoryStorage()
    const user = register(storage, { ...input(role), email: ` ${role.toUpperCase()}@EXAMPLE.COM ` })
    assert.equal(user.email, `${role}@example.com`)
    assert.equal(user.role, role)
    assert.equal(login(storage, user.email, input(role).password).id, user.id)
    assert.throws(() => register(storage, input(role)), /already exists/)
    assert.equal(getUsers(storage).length, 3)
  })
  test(`${role}: protects routes against opposite role and invalid paths`, () => {
    const user = demoUsers.find(u => u.role === role)
    const other = role === 'buyer' ? 'supplier' : 'buyer'
    for (const path of [`/${other}/overview`, `/${other}/requests`, `/${other}/my-offers`, '/login', '/register', '/unknown']) {
      assert.equal(resolveRoute(path, user), homeRoute(role))
    }
    const valid = role === 'buyer' ? ['overview', 'requests', 'offers', 'suppliers', 'comparison', 'settings', 'help'] : ['overview', 'opportunities', 'my-offers', 'company', 'settings', 'help']
    for (const slug of valid) assert.equal(resolveRoute(`/${role}/${slug}`, user), `/${role}/${slug}`)
  })
}
test('anonymous users cannot access either workspace', () => {
  for (const path of ['/buyer/overview', '/supplier/my-offers', '/buyer/settings', '/unknown']) assert.equal(resolveRoute(path, null), '/login')
  assert.equal(resolveRoute('/register', null), '/register')
})
test('invalid credentials never create a session', () => {
  const storage = new MemoryStorage()
  assert.throws(() => login(storage, 'buyer@agro.demo', 'wrong'), /incorrect/)
  assert.throws(() => login(storage, 'unknown@example.com', 'Example123!'), /incorrect/)
  assert.equal(currentUser(storage), null)
})
test('validates required fields, email, password, confirmation and role', () => {
  const invalid = { name: '', company: ' ', email: 'not-an-email', password: 'short', confirm: 'different', role: 'admin' }
  assert.deepEqual(Object.keys(validateRegistration(invalid)).sort(), ['company', 'confirm', 'email', 'name', 'password', 'role'])
  assert.equal(Object.keys(validateRegistration(input('buyer'))).length, 0)
  assert.ok(validateRegistration({ ...input('buyer'), password: 'abcdefgh', confirm: 'abcdefgh' }).password)
  assert.ok(validateRegistration({ ...input('buyer'), password: '12345678', confirm: '12345678' }).password)
  assert.throws(() => register(new MemoryStorage(), invalid), /highlighted/)
})
test('recovers malformed users and rejects corrupt, unknown or forged sessions', () => {
  const storage = new MemoryStorage()
  for (const invalid of ['broken json', '{}', '[null, {}, {"role":"admin"}]']) {
    storage.setItem(USERS_KEY, invalid)
    assert.equal(getUsers(storage).length, 2)
  }
  for (const session of ['broken', '{}', '{"userId":"missing","role":"buyer"}', '{"role":"supplier"}']) {
    storage.setItem(SESSION_KEY, session)
    assert.equal(currentUser(storage), null)
  }
  storage.setItem(SESSION_KEY, '{"userId":"demo-buyer","role":"supplier"}')
  assert.equal(currentUser(storage).role, 'buyer')
})
test('storage write failure does not report successful authentication', () => {
  const storage = { getItem() { return null }, setItem() { throw new Error('Storage unavailable') } }
  assert.throws(() => login(storage, 'buyer@agro.demo', 'Buyer123!'), /Storage unavailable/)
})
