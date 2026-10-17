import type { User } from './auth'
import type { PurchaseRequest } from './procurement'
import type { Offer } from './offers'
export type SortOrder = 'original' | 'price' | 'delivery' | 'match'
export function comparisonRequests(requests: PurchaseRequest[], user: User) {
  return user.role === 'buyer' ? requests.filter(r => r.buyerId === user.id) : []
}
export function comparisonOffers(requests: PurchaseRequest[], offers: Offer[], user: User, requestId: string, sort: SortOrder = 'original') {
  if (!comparisonRequests(requests, user).some(r => r.id === requestId)) return []
  const result = offers.filter(o => o.requestId === requestId)
  if (sort === 'price') result.sort((a, b) => a.price - b.price)
  if (sort === 'delivery') result.sort((a, b) => a.days - b.days)
  if (sort === 'match') result.sort((a, b) => b.match - a.match)
  return result
}
export function comparisonHighlights(offers: Offer[]) {
  if (!offers.length) return null
  return { price: Math.min(...offers.map(o => o.price)), days: Math.min(...offers.map(o => o.days)), match: Math.max(...offers.map(o => o.match)) }
}
