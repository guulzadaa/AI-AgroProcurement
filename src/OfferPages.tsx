import { focusFirstError } from './formFocus'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react'
import type { User } from './auth'
import { getRequests, todayISO } from './procurement'
import type { PurchaseRequest } from './procurement'
import { eligibility, getOffers, OFFERS_CHANGED, submitOffer, validateOffer, visibleOffers } from './offers'
import type { Offer, OfferInput } from './offers'

const money = (price: number) => `${price.toLocaleString('en-KZ')} KZT`
const unitLabel = (unit: string) => ({ tonnes: 'tonne', kg: 'kg', litres: 'litre', bags: 'bag' }[unit] || unit)
export function OfferCards({ offers, requests, user, go }: { offers: Offer[]; requests: PurchaseRequest[]; user: User; go: (route: string) => void }) {
  if (!offers.length) return <div className="empty-state"><FileText size={28}/><h2>{user.role === 'buyer' ? 'No offers received yet.' : 'No submitted offers yet.'}</h2><p>{user.role === 'buyer' ? 'Supplier responses will appear here after submission.' : 'Explore open requests to submit your first offer.'}</p>{user.role === 'supplier' && <button className="secondary-button" onClick={() => go('/supplier/opportunities')}>Browse opportunities<ArrowRight size={15}/></button>}</div>
  return <div className="offer-grid">{offers.map(o => {
    const request = requests.find(r => r.id === o.requestId)!
    const result = eligibility(o, request)
    return <article className="supplier-card offer-card" key={o.id}><div className="supplier-card-heading"><span className="sample-tag">{o.demo ? `Demonstration · ${o.label}` : 'Submitted prototype offer'}</span><span className={`status ${result.eligible ? '' : 'review'}`}>{result.eligible ? 'Eligible' : 'Ineligible'}</span></div><h2>{o.company}</h2><p className="module-subtitle">{o.location}<br/>{o.email}</p><button className="text-button offer-request-link" onClick={() => go(`/${user.role}/${user.role === 'buyer' ? 'requests' : 'opportunities'}/${request.id}`)}>{request.product}<ArrowRight size={15}/></button><div className="offer-price">{money(o.price)}<small> / {unitLabel(request.unit)}</small></div><dl className="offer-facts"><div><dt>Offered quantity</dt><dd>{o.quantity.toLocaleString()} {request.unit}</dd></div><div><dt>Delivery time</dt><dd>{o.days} days</dd></div><div><dt>Declared match</dt><dd>{o.match}%</dd></div><div><dt>Estimated arrival</dt><dd>{result.arrivalDate}</dd></div></dl>{!result.eligible && <p className="field-error">{result.reasons.join(' · ')}</p>}<h3>Product specifications / matching attributes</h3><p className="preserve-text">{o.specifications}</p>{o.notes && <><h3>Additional notes</h3><p className="preserve-text">{o.notes}</p></>}<p className="offer-footnote">Submitted {todayISO(new Date(o.submittedAt))} · Match is supplier-declared. Eligibility checks quantity and deadline only; no ranking.</p></article>
  })}</div>
}
export function OffersPage({ user, go }: { user: User; go: (route: string) => void }) {
  const [data, setData] = useState<{ requests: PurchaseRequest[]; offers: Offer[] }>({ requests: [], offers: [] })
  const [error, setError] = useState('')
  const load = () => { try { const requests = getRequests(localStorage); const offers = visibleOffers(getOffers(localStorage), requests, user); setData({ requests, offers }); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Could not read saved offers.') } }
  useEffect(() => { load(); const sync = () => load(); window.addEventListener('storage', sync); window.addEventListener(OFFERS_CHANGED, sync); return () => { window.removeEventListener('storage', sync); window.removeEventListener(OFFERS_CHANGED, sync) } }, [user.id])
  return <><div className="demo-note">Demonstration offers are clearly labeled. All offers use KZT and the request’s unit. No orders are placed and no ranking is applied.</div><div className="module-toolbar"><div><h2>{user.role === 'buyer' ? 'Offers received' : 'My offers'}</h2><p className="module-subtitle">{data.offers.length} offer{data.offers.length === 1 ? '' : 's'} · {user.role === 'buyer' ? 'Responses to your purchase requests only.' : 'Your submissions and demo offers assigned to this account.'}</p></div>{user.role === 'supplier' && <button className="secondary-button" onClick={() => go('/supplier/opportunities')}>Browse requests<ArrowRight size={16}/></button>}</div>{error ? <div className="form-alert" role="alert">{error}<button className="secondary-button" onClick={load}>Retry</button></div> : <OfferCards {...data} user={user} go={go}/>}</>
}
export function SubmitOfferForm({ request, user, go, onSaved }: { request: PurchaseRequest; user: User; go: (route: string) => void; onSaved: () => void }) {
  const [form, setForm] = useState<OfferInput>({ price: '', quantity: '', days: '', specifications: '', match: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const back = () => go(`/supplier/opportunities/${request.id}`)
  const update = (key: keyof OfferInput, value: string) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: '' })); setMessage('') }
  function submit(e: FormEvent) {
    e.preventDefault(); if (saving) return
    const next = validateOffer(form); setErrors(next)
    if (Object.keys(next).length) { focusFirstError(next, 'offer-'); setMessage('Please correct the highlighted fields.'); return }
    setSaving(true)
    try { submitOffer(localStorage, user, request.id, form); window.dispatchEvent(new Event(OFFERS_CHANGED)); onSaved(); go('/supplier/my-offers') } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to save the offer.'); setSaving(false) }
  }
  return <><button className="text-button back-link" onClick={back}><ArrowLeft size={16}/>Back to request</button><section className="request-form-panel"><span className="eyebrow">CONNECT YOUR SUPPLY WITH DEMAND</span><h2>Submit offer</h2><div className="demo-note"><strong>{request.product}</strong><br/>{request.quantity} {request.unit} · {request.category} · Deadline {request.deadline}<br/>{request.specifications}</div><p className="module-subtitle">Quotes are per {unitLabel(request.unit)} in KZT. Match is your declared estimate. Offers below the required quantity or arriving late are saved with an Ineligible label.</p><form noValidate onSubmit={submit}><div className="request-form-grid">{(['price', 'quantity', 'days', 'match', 'specifications', 'notes'] as const).map(key => <div key={key} className={`form-field ${key === 'notes' || key === 'specifications' ? 'full-width' : ''}`}><label htmlFor={`offer-${key}`}>{{ price: `Price per ${unitLabel(request.unit)} (KZT)`, quantity: `Offered quantity (${request.unit})`, days: 'Estimated delivery time (days)', match: 'Declared specification match (%)', specifications: 'Product specifications / matching attributes', notes: 'Additional notes (optional)' }[key]}</label>{key === 'specifications' || key === 'notes' ? <textarea id={`offer-${key}`} rows={4} maxLength={5000} value={form[key]} onChange={e => update(key, e.target.value)} required={key !== 'notes'} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `offer-${key}-error` : undefined}/> : <input id={`offer-${key}`} type="number" min={key === 'match' ? 0 : key === 'days' ? 1 : 0} max={key === 'match' ? 100 : key === 'days' ? 3650 : undefined} step={key === 'days' ? 1 : 'any'} value={form[key]} onInput={e => update(key, e.currentTarget.value)} onChange={e => update(key, e.target.value)} required aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `offer-${key}-error` : undefined}/>} {errors[key] && <p className="field-error" id={`offer-${key}-error`}>{errors[key]}</p>}</div>)}</div>{message && <div className="form-alert" role="alert">{message}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={back}>Cancel</button><button disabled={saving} type="submit" className="primary-button dark-button">{saving ? 'Saving…' : 'Submit offer'}<ArrowRight size={16}/></button></div></form></section></>
}
