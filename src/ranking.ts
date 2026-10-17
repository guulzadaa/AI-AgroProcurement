import type { User } from './auth'
import type { Offer } from './offers'
import { eligibility } from './offers.ts'
import type { PurchaseRequest } from './procurement'
export type Weights = { price: number; delivery: number; match: number }
export const defaultWeights: Weights = { price: 40, delivery: 30, match: 30 }
export function normalizeWeights(input: Weights): Weights {
  const clean = { price: Number.isFinite(input.price) ? Math.max(0, input.price) : 0, delivery: Number.isFinite(input.delivery) ? Math.max(0, input.delivery) : 0, match: Number.isFinite(input.match) ? Math.max(0, input.match) : 0 }
  const sum = clean.price + clean.delivery + clean.match
  if (!sum) return { price: .4, delivery: .3, match: .3 }
  return { price: clean.price / sum, delivery: clean.delivery / sum, match: clean.match / sum }
}
export function rankOffers(requests: PurchaseRequest[], offers: Offer[], user: User, requestId: string, input: Weights = defaultWeights) {
  const weights = normalizeWeights(input)
  const request = user.role === 'buyer' ? requests.find(r => r.id === requestId && r.buyerId === user.id) : undefined
  if (!request) return { weights, ranked: [], excluded: [], bounds: null }
  const linked = offers.filter(o => o.requestId === requestId)
  const eligible = linked.filter(o => eligibility(o, request).eligible)
  const excluded = linked.filter(o => !eligibility(o, request).eligible).map(offer => ({ offer, ...eligibility(offer, request) }))
  if (!eligible.length) return { weights, ranked: [], excluded, bounds: null }
  const bounds = { minPrice: Math.min(...eligible.map(o => o.price)), maxPrice: Math.max(...eligible.map(o => o.price)), minDays: Math.min(...eligible.map(o => o.days)), maxDays: Math.max(...eligible.map(o => o.days)) }
  const ranked = eligible.map(offer => {
    const price = bounds.maxPrice === bounds.minPrice ? 1 : (bounds.maxPrice - offer.price) / (bounds.maxPrice - bounds.minPrice)
    const delivery = bounds.maxDays === bounds.minDays ? 1 : (bounds.maxDays - offer.days) / (bounds.maxDays - bounds.minDays)
    const match = Math.max(0, Math.min(1, offer.match / 100))
    const contributions = { price: weights.price * price, delivery: weights.delivery * delivery, match: weights.match * match }
    return { offer, normalized: { price, delivery, match }, contributions, score: contributions.price + contributions.delivery + contributions.match, rank: 0 }
  }).sort((a, b) => b.score - a.score || a.offer.id.localeCompare(b.offer.id))
  ranked.forEach((row, i) => { row.rank = i && Math.abs(row.score - ranked[i - 1].score) < 1e-12 ? ranked[i - 1].rank : i + 1 })
  return { weights, ranked, excluded, bounds }
}
