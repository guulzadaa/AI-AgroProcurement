import { focusFirstError } from './formFocus'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, MapPin, Plus, Search, Sprout } from 'lucide-react'
import type { User } from './auth'
import { countOffers, getOffers, OFFERS_CHANGED, OFFERS_KEY, visibleOffers } from './offers'
import type { Offer } from './offers'
import { OfferCards, SubmitOfferForm } from './OfferPages'
import { categories, createRequest, filterSuppliers, getRequests, REQUESTS_KEY, todayISO, units, validateRequest, visibleRequests } from './procurement'
import type { PurchaseRequest, RequestInput } from './procurement'

const currency = (value: number) => `${new Intl.NumberFormat('en-KZ').format(value)} KZT`
export function DemoNote() { return <div className="demo-note">Demonstration workspace · All suppliers, contacts, products, prices, and sample offers are fictional. Prices are in KZT. No real orders are placed.</div> }
export function SupplierCatalog() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const results = filterSuppliers(query, category)
  return <><DemoNote/><div className="module-toolbar"><label className="search-field"><Search size={18}/><input aria-label="Search suppliers or products" placeholder="Search suppliers or products…" value={query} onChange={e => setQuery(e.target.value)}/></label><button className="secondary-button" onClick={() => { setQuery(''); setCategory('All') }}>Reset filters</button></div><div className="category-filters" aria-label="Product categories">{['All', ...categories].map(c => <button key={c} aria-pressed={c === category} className={c === category ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><p className="result-count" role="status">{results.length} supplier{results.length === 1 ? '' : 's'} found</p>{!results.length ? <div className="empty-state"><Search size={28}/><h2>No suppliers found</h2><p>Try another supplier or product name, or reset your filters.</p></div> : <div className="catalog-grid">{results.map(s => <article className="supplier-card" key={s.id}><div className="supplier-card-heading"><span className="product-icon green"><Sprout size={24}/></span><span className="sample-tag">Demo supplier</span></div><h2>{s.name}</h2><p className="location"><MapPin size={14}/>{s.location}</p><div className="supplier-tags">{Array.from(new Set(s.products.map(p => p.category))).map(c => <span key={c}>{c}</span>)}</div><div className="supplier-contact"><strong>{s.contact}</strong><span>{s.email}</span><span>{s.phone} · Fictional number</span></div><h3>Available products <small>Demonstration stock & prices</small></h3>{s.products.map(p => <div className="catalog-product" key={p.name}><strong>{p.name}</strong><p>{p.details}</p><span>{currency(p.price)} <small>/ {p.unit}</small></span></div>)}</article>)}</div>}</>
}

export function RequestModule({ user, route, go }: { user: User; route: string; go: (route: string) => void }) {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [error, setError] = useState('')
  const [offers, setOffers] = useState<Offer[]>([])
  const base = user.role === 'buyer' ? '/buyer/requests' : '/supplier/opportunities'
  const load = () => { try { const saved = getOffers(localStorage); setOffers(saved); setRequests(getRequests(localStorage).map(r => ({ ...r, offers: countOffers(saved, r.id) }))); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Could not access browser storage.') } }
  useEffect(() => {
    load()
    const sync = (e: StorageEvent) => { if (e.key === REQUESTS_KEY || e.key === OFFERS_KEY || e.key === null) load() }
    window.addEventListener('storage', sync)
    window.addEventListener(OFFERS_CHANGED, load)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(OFFERS_CHANGED, load) }
  }, [route])
  const visible = visibleRequests(requests, user)
  if (error) return <div className="empty-state" role="alert"><h2>Unable to load requests</h2><p>{error}</p><button className="secondary-button" onClick={load}>Retry</button></div>
  if (route === '/buyer/requests/new' && user.role === 'buyer') return <CreateRequest user={user} onCancel={() => go(base)} onCreated={request => { load(); go(`${base}/${request.id}`) }}/>
  const id = route.startsWith(`${base}/`) ? route.slice(base.length + 1).split('/')[0] : ''
  if (id) {
    const request = visible.find(r => r.id === id)
    if (route.endsWith('/submit') && user.role === 'supplier' && request) return <SubmitOfferForm key={request.id} request={request} user={user} go={go} onSaved={load}/>
    return <><button className="text-button back-link" onClick={() => go(base)}><ArrowLeft size={16}/>Back to {user.role === 'buyer' ? 'my requests' : 'open requests'}</button>{request ? <><RequestDetails request={request}/>{user.role === 'supplier' && <button className="primary-button dark-button" onClick={() => go(`${base}/${request.id}/submit`)}>Submit offer<ArrowRight size={16}/></button>}<h2 className="offers-section-heading">{user.role === 'buyer' ? 'Offers received' : 'Your offers for this request'}</h2><OfferCards offers={visibleOffers(offers, requests, user).filter(o => o.requestId === request.id)} requests={requests} user={user} go={go}/></> : <div className="empty-state"><h2>Request unavailable</h2><p>This request does not exist or is not accessible to your account.</p></div>}</>
  }
  return <><DemoNote/><div className="module-toolbar"><div><h2>{user.role === 'buyer' ? 'My requests' : 'Open procurement requests'}</h2><p className="module-subtitle">{user.role === 'buyer' ? 'Your saved requests, ready for supplier responses.' : 'Browse buyer demand and submit your supply proposal.'}</p></div>{user.role === 'buyer' && <button className="primary-button dark-button" onClick={() => go('/buyer/requests/new')}><Plus size={16}/>Create purchase request</button>}</div>{!visible.length ? <div className="empty-state"><Sprout size={30}/><h2>{user.role === 'buyer' ? 'Your next season starts with a request.' : 'No open procurement requests yet.'}</h2><p>{user.role === 'buyer' ? 'Create your first request to share what you need with suppliers.' : 'New buyer requests will appear here when published.'}</p>{user.role === 'buyer' && <button className="secondary-button" onClick={() => go('/buyer/requests/new')}>Create your first request<Plus size={16}/></button>}</div> : <section className="requests-panel"><div className="table-scroll"><table><thead><tr><th>PRODUCT / BUYER</th><th>QUANTITY</th><th>DEADLINE</th><th>STATUS</th><th>OFFERS</th><th>DETAILS</th></tr></thead><tbody>{visible.map(r => <tr key={r.id}><td><div className="request-product"><strong>{r.product}</strong><small>{r.company} · {r.category}</small><p className="request-spec-preview">{r.specifications}</p><span className="sample-tag">{r.demo ? 'Demonstration data' : 'Prototype request'}</span></div></td><td>{r.quantity.toLocaleString()} {r.unit}</td><td>{r.deadline}</td><td><span className="status"><i/>{r.status}</span></td><td>{r.offers} offers</td><td><button className="text-button" onClick={() => go(`${base}/${r.id}`)} aria-label={`View details for ${r.product}`}>View details<ArrowRight size={15}/></button>{user.role === 'supplier' && <button className="secondary-button submit-row-button" onClick={() => go(`${base}/${r.id}/submit`)}>Submit offer</button>}</td></tr>)}</tbody></table></div></section>}</>
}
function RequestDetails({ request: r }: { request: PurchaseRequest }) {
  return <article className="request-details"><div className="module-toolbar"><span className="sample-tag">{r.demo ? 'Demonstration data · Fictional sample offers' : 'Locally saved prototype request'}</span><span className="status"><i/>{r.status}</span></div><h2>{r.product}</h2><p className="module-subtitle">Requested by {r.company}</p><dl className="detail-grid">{[['Category', r.category], ['Quantity', `${r.quantity.toLocaleString()} ${r.unit}`], ['Delivery deadline', r.deadline], ['Supplier offers', String(r.offers)], ['Quote currency', 'KZT'], ['Created', todayISO(new Date(r.createdAt))]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Required specifications</h3><p className="preserve-text">{r.specifications}</p><h3>Description</h3><p className="preserve-text">{r.description}</p><p className="demo-note">Prototype request only. Offer prices use KZT; declared match is supplier-provided. No ranking is applied.</p></article>
}
function CreateRequest({ user, onCancel, onCreated }: { user: User; onCancel: () => void; onCreated: (r: PurchaseRequest) => void }) {
  const [form, setForm] = useState<RequestInput>({ product: '', category: '', quantity: '', unit: '', specifications: '', deadline: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (key: keyof RequestInput, value: string) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: '' })); setMessage('') }
  function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const next = validateRequest(form); setErrors(next)
    if (Object.keys(next).length) { focusFirstError(next, 'request-'); setMessage('Please correct the highlighted fields.'); return }
    setSaving(true)
    try { onCreated(createRequest(localStorage, user, form)) } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save. Check browser storage and try again.'); setSaving(false) }
  }
  return <><button className="text-button back-link" onClick={onCancel}><ArrowLeft size={16}/>Back to my requests</button><section className="request-form-panel"><span className="eyebrow">PLANT THE SEED FOR YOUR NEXT PURCHASE</span><h2>Create purchase request</h2><p className="module-subtitle">All fields are required. New requests are published as Open and visible to supplier accounts in this browser.</p><form onSubmit={submit} noValidate><div className="request-form-grid">{(['product', 'category', 'quantity', 'unit', 'deadline', 'specifications', 'description'] as const).map(key => <div className={`form-field ${key === 'specifications' || key === 'description' ? 'full-width' : ''}`} key={key}><label htmlFor={`request-${key}`}>{{ product: 'Product name', category: 'Category', quantity: 'Quantity', unit: 'Unit', specifications: 'Required specifications', deadline: 'Delivery deadline', description: 'Description' }[key]}</label>{key === 'category' || key === 'unit' ? <select id={`request-${key}`} value={form[key]} onChange={e => update(key, e.target.value)} required aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined}><option value="">Select {key}</option>{(key === 'category' ? categories : units).map(v => <option key={v}>{v}</option>)}</select> : key === 'specifications' || key === 'description' ? <textarea id={`request-${key}`} value={form[key]} onChange={e => update(key, e.target.value)} required rows={3} maxLength={5000} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined}/> : <input id={`request-${key}`} type={key === 'quantity' ? 'number' : key === 'deadline' ? 'date' : 'text'} min={key === 'quantity' ? '0' : key === 'deadline' ? todayISO() : undefined} step={key === 'quantity' ? 'any' : undefined} maxLength={key === 'product' ? 200 : undefined} value={form[key]} onInput={e => update(key, e.currentTarget.value)} onChange={e => update(key, e.target.value)} required aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined}/>} {errors[key] && <p id={`${key}-error`} className="field-error">{errors[key]}</p>}</div>)}</div>{message && <div className="form-alert" role="alert">{message}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button disabled={saving} className="primary-button dark-button" type="submit">{saving ? 'Saving…' : 'Publish request'}<ArrowRight size={16}/></button></div></form></section></>
}
