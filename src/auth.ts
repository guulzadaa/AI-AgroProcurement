export type Role = 'buyer' | 'supplier'
export type User = { id: string; name: string; company: string; email: string; password: string; role: Role }
export const USERS_KEY = 'agroprocure.demo.users.v1'
export const SESSION_KEY = 'agroprocure.demo.session.v1'
export const demoUsers: User[] = [
  { id: 'demo-buyer', name: 'Alex Kim', company: 'Greenfield Agriculture', email: 'buyer@agro.demo', password: 'Buyer123!', role: 'buyer' },
  { id: 'demo-supplier', name: 'Sam Taylor', company: 'Harvest Supply Co.', email: 'supplier@agro.demo', password: 'Supplier123!', role: 'supplier' },
]
const isUser = (u: unknown): u is User => {
  if (!u || typeof u !== 'object') return false
  const v = u as User
  return ['id', 'name', 'company', 'email', 'password'].every(k => typeof v[k as keyof User] === 'string' && Boolean(v[k as keyof User])) && (v.role === 'buyer' || v.role === 'supplier')
}
export function getUsers(storage: Storage): User[] {
  let users: User[] = []
  try { const data: unknown = JSON.parse(storage.getItem(USERS_KEY) || '[]'); if (Array.isArray(data)) users = data.filter(isUser) } catch { /* Recover malformed demo data. */ }
  const merged = [...demoUsers, ...users.filter(u => !demoUsers.some(d => d.email === u.email || d.id === u.id))]
  storage.setItem(USERS_KEY, JSON.stringify(merged))
  return merged
}
export function currentUser(storage: Storage): User | null {
  const users = getUsers(storage)
  try {
    const session: unknown = JSON.parse(storage.getItem(SESSION_KEY) || 'null')
    if (session && typeof session === 'object' && 'userId' in session) return users.find(u => u.id === session.userId) || null
  } catch { /* Invalid sessions are treated as signed out. */ }
  return null
}
export function login(storage: Storage, email: string, password: string): User {
  const user = getUsers(storage).find(u => u.email === email.trim().toLowerCase() && u.password === password)
  if (!user) throw new Error('Email or password is incorrect.')
  storage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }))
  return user
}
export type Registration = { name: string; company: string; email: string; password: string; confirm: string; role: Role }
export function validateRegistration(input: Registration): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.name.trim().length < 2) errors.name = 'Enter your full name (at least 2 characters).'
  if (input.company.trim().length < 2) errors.company = 'Enter your company name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = 'Enter a valid email address.'
  if (input.password.length < 8 || !/[a-zA-Z]/.test(input.password) || !/\d/.test(input.password)) errors.password = 'Use at least 8 characters, including a letter and a number.'
  if (!input.confirm || input.confirm !== input.password) errors.confirm = 'Passwords do not match.'
  if (!['buyer', 'supplier'].includes(input.role)) errors.role = 'Choose Buyer or Supplier.'
  return errors
}
export function register(storage: Storage, input: Registration): User {
  if (Object.keys(validateRegistration(input)).length) throw new Error('Please correct the highlighted fields.')
  const users = getUsers(storage)
  const email = input.email.trim().toLowerCase()
  if (users.some(u => u.email === email)) throw new Error('An account with this email already exists. Please sign in.')
  const user: User = { id: crypto.randomUUID(), name: input.name.trim(), company: input.company.trim(), email, password: input.password, role: input.role }
  storage.setItem(USERS_KEY, JSON.stringify([...users, user]))
  return user
}
export const homeRoute = (role: Role) => `/${role}/overview`
export function loginDemo(storage: Storage, role: Role): User {
  const demo = demoUsers.find(u => u.role === role)
  if (!demo) throw new Error('Choose a valid demo role.')
  return login(storage, demo.email, demo.password)
}
export function resolveRoute(path: string, user: User | null): string {
  if (!user) return path === '/register' ? path : '/login'
  const allowed = user.role === 'buyer' ? ['overview', 'requests', 'offers', 'suppliers', 'comparison', 'ranking', 'settings', 'help'] : ['overview', 'opportunities', 'my-offers', 'company', 'settings', 'help']
  if (user.role === 'buyer' && /^\/buyer\/requests\/(new|[a-zA-Z0-9-]+)$/.test(path)) return path
  if (user.role === 'supplier' && /^\/supplier\/opportunities\/[a-zA-Z0-9-]+$/.test(path)) return path
  if (user.role === 'supplier' && /^\/supplier\/opportunities\/[a-zA-Z0-9-]+\/submit$/.test(path)) return path
  if (user.role === 'buyer' && /^\/buyer\/ranking\/[a-zA-Z0-9-]+$/.test(path)) return path
  return allowed.some(slug => path === `/${user.role}/${slug}`) ? path : homeRoute(user.role)
}
