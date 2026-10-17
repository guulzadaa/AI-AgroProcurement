import type { User } from './auth'

export const categories = ['Fertilizers', 'Seeds', 'Crop Protection'] as const
export type Category = typeof categories[number]
export const units = ['tonnes', 'kg', 'litres', 'bags'] as const
export type RequestInput = { product: string; category: string; quantity: string; unit: string; specifications: string; deadline: string; description: string }
export type PurchaseRequest = Omit<RequestInput, 'quantity'> & { quantity: number; id: string; buyerId: string; company: string; status: 'Open' | 'Closed'; offers: number; createdAt: string; demo: boolean }
export const REQUESTS_KEY = 'agroprocure.requests.v1'
export const sampleRequests: PurchaseRequest[] = [
  { id: 'demo-npk', buyerId: 'demo-buyer', company: 'Greenfield Agriculture', product: 'NPK 16:16:16 fertilizer', category: 'Fertilizers', quantity: 10, unit: 'tonnes', specifications: 'Granular NPK 16:16:16; sealed 50 kg bags; certificate of analysis required.', deadline: '2027-03-15', description: 'Delivery to a demonstration farm near Kostanay. Please include transport in your quotation.', status: 'Open', offers: 4, createdAt: '2026-10-18T08:00:00Z', demo: true },
  { id: 'demo-wheat', buyerId: 'demo-buyer', company: 'Greenfield Agriculture', product: 'Spring wheat seeds — Steppe 27', category: 'Seeds', quantity: 120, unit: 'tonnes', specifications: 'Certified spring wheat seed; germination ≥ 95%; purity ≥ 99%; untreated.', deadline: '2027-03-25', description: 'Pre-season procurement for a fictional Akmola farm. Quote in KZT with delivery.', status: 'Open', offers: 6, createdAt: '2026-10-18T09:00:00Z', demo: true },
  { id: 'demo-protection', buyerId: 'demo-buyer', company: 'Greenfield Agriculture', product: 'FieldGuard herbicide — demo formulation', category: 'Crop Protection', quantity: 600, unit: 'litres', specifications: 'Sealed 5 L containers; product documentation and batch traceability required.', deadline: '2027-04-01', description: 'Fictional crop protection procurement in Petropavl. Product is illustrative, not application advice.', status: 'Open', offers: 2, createdAt: '2026-10-18T10:00:00Z', demo: true },
]
export const suppliers = [
  { id: 'steppe', name: 'Steppe Nutrients KZ', location: 'Kostanay, Kostanay Region', email: 'sales@steppe-nutrients.example', phone: '+7 (XXX) XXX-01-01', contact: 'Aida S. · Demo sales contact', products: [{ name: 'NPK 16:16:16 fertilizer', category: 'Fertilizers', price: 245000, unit: 'tonne', details: 'Granular · 50 kg bags · Demo stock: 240 tonnes' }, { name: 'Urea 46% nitrogen', category: 'Fertilizers', price: 198000, unit: 'tonne', details: 'Prilled · 50 kg bags · Demo stock: 180 tonnes' }] },
  { id: 'akmola', name: 'Akmola Seed Collective', location: 'Kokshetau, Akmola Region', email: 'hello@akmola-seeds.example', phone: '+7 (XXX) XXX-02-02', contact: 'Timur K. · Demo sales contact', products: [{ name: 'Spring wheat seeds — Steppe 27', category: 'Seeds', price: 165000, unit: 'tonne', details: 'Fictional variety · Germination 95% · Demo stock: 200 tonnes' }, { name: 'Winter wheat seeds — Dala 12', category: 'Seeds', price: 172000, unit: 'tonne', details: 'Fictional variety · Cleaned seed · Demo stock: 90 tonnes' }] },
  { id: 'zhetysu', name: 'Zhetysu Field Partners', location: 'Taldykorgan, Zhetysu Region', email: 'catalog@zhetysu-fields.example', phone: '+7 (XXX) XXX-03-03', contact: 'Dana M. · Demo sales contact', products: [{ name: 'FieldGuard herbicide — demo formulation', category: 'Crop Protection', price: 6400, unit: 'litre', details: 'Illustrative product · 5 L packs · Demo stock: 2,000 litres' }, { name: 'LeafShield fungicide — demo formulation', category: 'Crop Protection', price: 8900, unit: 'litre', details: 'Illustrative product · 5 L packs · Demo stock: 800 litres' }] },
  { id: 'ertis', name: 'Ertis Agro Supply', location: 'Pavlodar, Pavlodar Region', email: 'team@ertis-agro.example', phone: '+7 (XXX) XXX-04-04', contact: 'Murat B. · Demo sales contact', products: [{ name: 'Ammonium nitrate 34%', category: 'Fertilizers', price: 184000, unit: 'tonne', details: 'Bagged fertilizer · Demo stock: 150 tonnes' }, { name: 'Spring wheat seeds — Ertis 8', category: 'Seeds', price: 158000, unit: 'tonne', details: 'Fictional variety · Germination 94% · Demo stock: 110 tonnes' }] },
]
export function filterSuppliers(query: string, category: string) {
  const term = query.trim().toLocaleLowerCase()
  return suppliers.map(s => ({ ...s, products: s.products.filter(p => (category === 'All' || p.category === category) && (!term || s.name.toLocaleLowerCase().includes(term) || p.name.toLocaleLowerCase().includes(term))) })).filter(s => s.products.length)
}
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function validateRequest(input: RequestInput, today = todayISO()): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.product.trim()) errors.product = 'Enter a product name.'
  if (!(categories as readonly string[]).includes(input.category)) errors.category = 'Select a category.'
  if (!input.quantity.trim() || !Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) errors.quantity = 'Quantity must be greater than zero.'
  if (!(units as readonly string[]).includes(input.unit)) errors.unit = 'Select a unit.'
  if (!input.specifications.trim()) errors.specifications = 'Enter the required specifications.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) || !Number.isFinite(Date.parse(input.deadline)) || new Date(input.deadline).toISOString().slice(0, 10) !== input.deadline || input.deadline < today) errors.deadline = 'Choose a valid deadline today or later.'
  if (!input.description.trim()) errors.description = 'Enter a description.'
  return errors
}
function isRequest(value: unknown): value is PurchaseRequest {
  if (!value || typeof value !== 'object') return false
  const r = value as PurchaseRequest
  return ['id', 'buyerId', 'company', 'product', 'category', 'unit', 'specifications', 'deadline', 'description', 'createdAt'].every(k => typeof r[k as keyof PurchaseRequest] === 'string') && (categories as readonly string[]).includes(r.category) && (units as readonly string[]).includes(r.unit) && Number.isFinite(Date.parse(r.createdAt)) && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline) && Number.isFinite(Date.parse(r.deadline)) && new Date(r.deadline).toISOString().slice(0, 10) === r.deadline && Number.isFinite(r.quantity) && r.quantity > 0 && Number.isInteger(r.offers) && r.offers >= 0 && (r.status === 'Open' || r.status === 'Closed') && typeof r.demo === 'boolean'
}
export function getRequests(storage: Storage): PurchaseRequest[] {
  const raw = storage.getItem(REQUESTS_KEY)
  if (raw !== null) {
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { throw new Error('Saved requests could not be read. Your stored data has not been overwritten.') }
    if (!Array.isArray(parsed) || !parsed.every(isRequest)) throw new Error('Saved requests have an invalid format. Your stored data has not been overwritten.')
    const migrated = parsed.map(r => r.id === 'demo-npk' && r.demo && r.buyerId === 'demo-buyer' ? { ...r, quantity: 10 } : r)
    if (JSON.stringify(migrated) !== raw) storage.setItem(REQUESTS_KEY, JSON.stringify(migrated))
    return migrated
  }
  storage.setItem(REQUESTS_KEY, JSON.stringify(sampleRequests))
  return [...sampleRequests]
}
export const visibleRequests = (requests: PurchaseRequest[], user: User) => requests.filter(r => user.role === 'supplier' ? r.status === 'Open' : r.buyerId === user.id)
export function createRequest(storage: Storage, user: User, input: RequestInput): PurchaseRequest {
  if (user.role !== 'buyer') throw new Error('Only buyers can create purchase requests.')
  if (Object.keys(validateRequest(input)).length) throw new Error('Please correct the highlighted fields.')
  const all = getRequests(storage)
  const request: PurchaseRequest = { ...input, product: input.product.trim(), specifications: input.specifications.trim(), description: input.description.trim(), quantity: Number(input.quantity), id: crypto.randomUUID(), buyerId: user.id, company: user.company, status: 'Open', offers: 0, createdAt: new Date().toISOString(), demo: false }
  storage.setItem(REQUESTS_KEY, JSON.stringify([request, ...all]))
  return request
}
