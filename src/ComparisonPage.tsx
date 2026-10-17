import { useEffect, useState } from 'react'
import { ArrowRight, Check, Clock3, SlidersHorizontal, Sparkles } from 'lucide-react'
import type { User } from './auth'
import { getRequests, REQUESTS_KEY } from './procurement'
import type { PurchaseRequest } from './procurement'
import { eligibility, getOffers, OFFERS_CHANGED, OFFERS_KEY } from './offers'
import type { Offer } from './offers'
import { comparisonHighlights, comparisonOffers, comparisonRequests } from './comparison'
import type { SortOrder } from './comparison'

const unitLabel = (unit: string) => ({ tonnes: 'tonne', kg: 'kg', litres: 'litre', bags: 'bag' }[unit] || unit)
export default function ComparisonPage({ user, go }: { user: User; go: (route: string) => void }) {
  const [data, setData] = useState<{ requests: PurchaseRequest[]; offers: Offer[] }>({ requests: [], offers: [] })
  const [requestId, setRequestId] = useState('')
  const [sort, setSort] = useState<SortOrder>('original')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const load = () => {
    try {
      const requests = comparisonRequests(getRequests(localStorage), user)
      const offers = getOffers(localStorage)
      setData({ requests, offers })
      setRequestId(current => requests.some(r => r.id === current) ? current : (requests.find(r => offers.some(o => o.requestId === r.id)) || requests[0])?.id || '')
      setError(''); setReady(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to read comparison data.'); setReady(true) }
  }
  useEffect(() => {
    load()
    const sync = (e: StorageEvent) => { if (!e.key || e.key === REQUESTS_KEY || e.key === OFFERS_KEY) load() }
    window.addEventListener('storage', sync); window.addEventListener(OFFERS_CHANGED, load)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(OFFERS_CHANGED, load) }
  }, [user.id])
  if (user.role !== 'buyer') return <div className="empty-state"><h2>Buyer workspace only</h2></div>
  if (error) return <div className="empty-state" role="alert"><h2>Comparison unavailable</h2><p>{error}</p><button className="secondary-button" onClick={load}>Retry</button></div>
  if (!ready) return <p role="status">Loading your offers…</p>
  if (!data.requests.length) return <div className="empty-state"><SlidersHorizontal size={30}/><h2>Your next decision starts with a request.</h2><p>Create a purchase request to collect supplier offers and compare them here.</p><button className="primary-button dark-button" onClick={() => go('/buyer/requests/new')}>Create purchase request<ArrowRight size={16}/></button></div>
  const request = data.requests.find(r => r.id === requestId)
  const offers = comparisonOffers(data.requests, data.offers, user, requestId, sort)
  const highlights = comparisonHighlights(offers)
  const eligibleCount = request ? offers.filter(o => eligibility(o, request).eligible).length : 0
  return <>
    <section className="comparison-intro"><span className="comparison-symbol"><SlidersHorizontal size={25}/></span><div><span className="eyebrow">CLARITY IN EVERY COLUMN</span><h2>Different offers. One clear view.</h2><p>Compare the details that matter before your next purchasing decision.</p></div></section>
    <div className="comparison-controls"><label htmlFor="comparison-request">Procurement request<select id="comparison-request" value={requestId} onChange={e => { setRequestId(e.target.value) }}>{data.requests.map(r => <option key={r.id} value={r.id}>{r.product}{r.demo ? ' · Demo' : ''} · {r.id.slice(0, 8)}</option>)}</select></label><label htmlFor="comparison-sort">Sort offers<select id="comparison-sort" value={sort} onChange={e => setSort(e.target.value as SortOrder)}><option value="original">Submission order</option><option value="price">Price: low to high</option><option value="delivery">Delivery: fastest first</option><option value="match">Product match: highest first</option></select></label><button className="primary-button dark-button" onClick={() => go(`/buyer/ranking/${requestId}`)}><Sparkles size={16}/>View Smart Ranking</button></div>
    {request && <><div className="comparison-request-summary"><div><span className="sample-tag">{request.demo ? 'Demonstration request' : 'Your prototype request'}</span><h2>{request.product}</h2><p>{request.category} · {request.quantity.toLocaleString()} {request.unit} required · Delivery by {request.deadline}</p><p className="preserve-text">{request.specifications}</p></div><div className="comparison-totals"><strong>{offers.length}</strong><span>offers to compare</span><small>{eligibleCount} eligible · {offers.length - eligibleCount} ineligible</small></div></div>
    <div className="demo-note">All demo offers are fictional and labeled. Highlights cover all displayed offers, including ineligible ones, and include ties. A highlighted metric does not make an offer eligible. Match percentages are supplier-declared; eligibility checks quantity and delivery deadline using each offer’s submission date. Use Smart Ranking for weighted recommendations. Final purchasing decisions remain with you.</div>
    {!offers.length ? <div className="empty-state"><SlidersHorizontal size={28}/><h2>No offers to compare yet.</h2><p>Offers linked to this request will appear here when suppliers submit them.</p><button className="secondary-button" onClick={() => go(`/buyer/requests/${request.id}`)}>View request<ArrowRight size={16}/></button></div> : <><div className="comparison-table-heading"><span role="status">{offers.length} offers · {sort === 'original' ? 'Submission order' : sort === 'price' ? 'Sorted by ascending price' : sort === 'delivery' ? 'Sorted by fastest delivery' : 'Sorted by highest match'}</span><span>Scroll horizontally to compare every offer →</span></div><div className="comparison-scroll" tabIndex={0} role="region" aria-label="Side-by-side supplier offer comparison"><table className="comparison-table"><caption className="sr-only">Offers for {request.product}. Each supplier is a column; each comparison attribute is a row.</caption><thead><tr><th scope="col">COMPARE OFFERS</th>{offers.map(o => <th key={o.id} scope="col"><span className="sample-tag">{o.demo ? `Demo · ${o.label || 'Offer'}` : 'Submitted offer'}</span><strong>{o.company}</strong><span className="comparison-location">{o.location}</span></th>)}</tr></thead><tbody>
      <tr><th scope="row">Eligibility</th>{offers.map(o => { const result = eligibility(o, request); return <td key={o.id}><span className={`status ${result.eligible ? '' : 'review'}`}><i/>{result.eligible ? 'Eligible' : 'Ineligible'}</span>{!result.eligible && <p className="comparison-ineligible">Cannot be selected: {result.reasons.join('; ')}.</p>}</td> })}</tr>
      <tr><th scope="row">Price per {unitLabel(request.unit)}<small>KZT</small></th>{offers.map(o => <td key={o.id} className={o.price === highlights?.price ? 'metric-best' : ''}><strong className="comparison-price">{o.price.toLocaleString('en-KZ')}</strong><span className="comparison-currency"> KZT</span>{o.price === highlights?.price && <span className="metric-badge"><Check size={12}/>Lowest price</span>}</td>)}</tr>
      <tr><th scope="row">Offered quantity<small>{request.quantity.toLocaleString()} {request.unit} required</small></th>{offers.map(o => <td key={o.id}>{o.quantity.toLocaleString()} {request.unit}</td>)}</tr>
      <tr><th scope="row">Delivery time<small>Days from submission</small></th>{offers.map(o => <td key={o.id} className={o.days === highlights?.days ? 'metric-best' : ''}><strong>{o.days} days</strong>{o.days === highlights?.days && <span className="metric-badge"><Clock3 size={12}/>Fastest delivery</span>}</td>)}</tr>
      <tr><th scope="row">Estimated arrival<small>Deadline {request.deadline}</small></th>{offers.map(o => <td key={o.id}>{eligibility(o, request).arrivalDate}</td>)}</tr>
      <tr><th scope="row">Product match<small>Supplier-declared</small></th>{offers.map(o => <td key={o.id} className={o.match === highlights?.match ? 'metric-best' : ''}><strong>{o.match}%</strong><div className="match-track" aria-hidden="true"><span style={{ width: `${o.match}%` }}/></div>{o.match === highlights?.match && <span className="metric-badge"><Check size={12}/>Highest match</span>}</td>)}</tr>
      <tr><th scope="row">Product specifications</th>{offers.map(o => <td key={o.id} className="comparison-copy">{o.specifications}</td>)}</tr>
      <tr><th scope="row">Additional notes</th>{offers.map(o => <td key={o.id} className="comparison-copy">{o.notes || 'No additional notes.'}</td>)}</tr>
    </tbody></table></div></>}</>}
  </>
}
