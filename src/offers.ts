import type { User } from './auth'
import { getRequests, todayISO } from './procurement.ts'
import type { PurchaseRequest } from './procurement'

export const OFFERS_KEY = 'agroprocure.offers.v1'
export const OFFERS_CHANGED = 'agroprocure:offers-changed'
export type OfferInput = { price: string; quantity: string; days: string; specifications: string; match: string; notes: string }
export type Offer = { id: string; requestId: string; supplierId: string; company: string; location: string; email: string; price: number; quantity: number; days: number; specifications: string; match: number; notes: string; submittedAt: string; demo: boolean; label?: string }
const seed = (id: string, requestId: string, supplierId: string, company: string, location: string, price: number, quantity: number, days: number, match: number, label: string): Offer => ({ id, requestId, supplierId, company, location, email: `sales@${supplierId}.example`, price, quantity, days, match, label, specifications: match === 100 ? 'All requested specifications confirmed; supporting documents available (demo).' : 'Partial specification match; some documentation pending (demo).', notes: 'Fictional demonstration offer. Price excludes any unlisted logistics charges.', submittedAt: '2026-10-18T10:00:00Z', demo: true })
export const demoOffers: Offer[] = [
  seed('offer-a', 'demo-npk', 'steppe', 'Steppe Nutrients KZ', 'Kostanay', 182000, 10, 5, 100, 'Offer A'),
  seed('offer-b', 'demo-npk', 'ertis', 'Ertis Agro Supply', 'Pavlodar', 170000, 10, 9, 80, 'Offer B'),
  seed('offer-c', 'demo-npk', 'demo-supplier', 'Harvest Supply Co.', 'Astana', 195000, 10, 3, 100, 'Offer C'),
  seed('offer-d', 'demo-npk', 'dala', 'Dala Inputs', 'Karaganda', 165000, 6, 4, 100, 'Offer D · Insufficient quantity'),
  seed('offer-e', 'demo-npk', 'zhetysu', 'Zhetysu Field Partners', 'Taldykorgan', 178000, 10, 200, 100, 'Offer E · Late delivery'),
  seed('offer-f', 'demo-wheat', 'akmola', 'Akmola Seed Collective', 'Kokshetau', 165000, 120, 7, 100, 'Offer F'),
  seed('offer-g', 'demo-wheat', 'ertis', 'Ertis Agro Supply', 'Pavlodar', 158000, 120, 10, 90, 'Offer G'),
  seed('offer-h', 'demo-wheat', 'demo-supplier', 'Harvest Supply Co.', 'Astana', 172000, 130, 5, 100, 'Offer H'),
  seed('offer-i', 'demo-protection', 'zhetysu', 'Zhetysu Field Partners', 'Taldykorgan', 6400, 600, 6, 100, 'Offer I'),
  seed('offer-j', 'demo-protection', 'demo-supplier', 'Harvest Supply Co.', 'Astana', 6900, 650, 4, 100, 'Offer J'),
  seed('offer-k', 'demo-protection', 'dala', 'Dala Inputs', 'Karaganda', 6100, 400, 8, 80, 'Offer K · Insufficient quantity'),
]
function isOffer(value: unknown): value is Offer {
  if (!value || typeof value !== 'object') return false
  const o = value as Offer
  return ['id', 'requestId', 'supplierId', 'company', 'location', 'email', 'specifications', 'notes', 'submittedAt'].every(k => typeof o[k as keyof Offer] === 'string') && ['price', 'quantity', 'days', 'match'].every(k => Number.isFinite(o[k as keyof Offer])) && o.price > 0 && o.quantity > 0 && Number.isSafeInteger(o.days) && o.days > 0 && o.days <= 3650 && o.match >= 0 && o.match <= 100 && Number.isFinite(Date.parse(o.submittedAt)) && typeof o.demo === 'boolean'
}
export function getOffers(storage: Storage): Offer[] {
  const raw = storage.getItem(OFFERS_KEY)
  if (raw === null) {
    const requests = getRequests(storage)
    const initial = demoOffers.filter(o => requests.some(r => r.id === o.requestId && r.demo && r.buyerId === 'demo-buyer'))
    storage.setItem(OFFERS_KEY, JSON.stringify(initial))
    return initial
  }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('Saved offers could not be read. Stored data has not been overwritten.') }
  if (!Array.isArray(parsed) || !parsed.every(isOffer)) throw new Error('Saved offers have an invalid format. Stored data has not been overwritten.')
  return parsed
}
export function validateOffer(input: OfferInput): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of ['price', 'quantity'] as const) if (!input[key].trim() || !Number.isFinite(Number(input[key])) || Number(input[key]) <= 0) errors[key] = `${key === 'price' ? 'Price' : 'Quantity'} must be greater than zero.`
  if (!input.days.trim() || !Number.isSafeInteger(Number(input.days)) || Number(input.days) <= 0 || Number(input.days) > 3650) errors.days = 'Enter a whole number of delivery days from 1 to 3,650.'
  if (!input.specifications.trim()) errors.specifications = 'Describe your product specifications and matching attributes.'
  if (!input.match.trim() || !Number.isFinite(Number(input.match)) || Number(input.match) < 0 || Number(input.match) > 100) errors.match = 'Enter a declared specification match from 0 to 100%.'
  if (input.specifications.length > 5000) errors.specifications = 'Use at most 5,000 characters.'
  if (input.notes.length > 5000) errors.notes = 'Use at most 5,000 characters.'
  return errors
}
export function eligibility(offer: Offer, request: PurchaseRequest) {
  const submitted = todayISO(new Date(offer.submittedAt))
  const arrival = new Date(`${submitted}T00:00:00Z`)
  arrival.setUTCDate(arrival.getUTCDate() + offer.days)
  const arrivalDate = arrival.toISOString().slice(0, 10)
  const reasons: string[] = []
  if (offer.quantity < request.quantity) reasons.push('Insufficient quantity')
  if (arrivalDate > request.deadline) reasons.push('Delivery after deadline')
  return { eligible: !reasons.length, reasons, arrivalDate }
}
export function visibleOffers(offers: Offer[], requests: PurchaseRequest[], user: User) {
  return offers.filter(o => requests.some(r => r.id === o.requestId && (user.role === 'supplier' ? o.supplierId === user.id : r.buyerId === user.id)))
}
export const countOffers = (offers: Offer[], requestId: string) => offers.filter(o => o.requestId === requestId).length
export function submitOffer(storage: Storage, user: User, requestId: string, input: OfferInput): Offer {
  if (user.role !== 'supplier') throw new Error('Only suppliers can submit offers.')
  if (Object.keys(validateOffer(input)).length) throw new Error('Please correct the highlighted fields.')
  const request = getRequests(storage).find(r => r.id === requestId)
  if (!request || request.status !== 'Open') throw new Error('This request is no longer open or available.')
  if (request.deadline < todayISO()) throw new Error('The delivery deadline has passed. Offers can no longer be submitted.')
  const offers = getOffers(storage)
  if (offers.some(o => o.requestId === requestId && o.supplierId === user.id && !o.demo)) throw new Error('You already submitted an offer for this request. View it in My offers.')
  const offer: Offer = { id: crypto.randomUUID(), requestId, supplierId: user.id, company: user.company, location: 'Kazakhstan · Location not specified', email: user.email, price: Number(input.price), quantity: Number(input.quantity), days: Number(input.days), specifications: input.specifications.trim(), match: Number(input.match), notes: input.notes.trim(), submittedAt: new Date().toISOString(), demo: false }
  storage.setItem(OFFERS_KEY, JSON.stringify([offer, ...offers]))
  return offer
}
