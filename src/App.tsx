import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Clock3, FileText, LayoutDashboard, Leaf, Menu, Plus, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Sprout, Users, Wheat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AuthPage from './AuthPage'
import { routeUrl } from './routeUrl'
import RankingPage from './RankingPage'
import ComparisonPage from './ComparisonPage'
import { OffersPage } from './OfferPages'
import { getOffers, OFFERS_CHANGED, visibleOffers } from './offers'
import { getRequests, visibleRequests } from './procurement'
import { RequestModule, SupplierCatalog } from './ProcurementPages'
import { currentUser, homeRoute, resolveRoute, loginDemo, SESSION_KEY, USERS_KEY } from './auth'
import type { User } from './auth'

const slugs: Record<string, string> = { 'Overview': 'overview', 'My Requests': 'requests', 'Create Purchase Request': 'requests/new', 'Supplier offers': 'offers', 'Suppliers': 'suppliers', 'Offer comparison': 'comparison', 'Smart Ranking': 'ranking', 'Settings': 'settings', 'Help & support': 'help', 'Opportunities': 'opportunities', 'My offers': 'my-offers', 'Company profile': 'company' }
const supplierNavigation: { label: string; icon: LucideIcon; count?: string }[] = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Opportunities', icon: ClipboardList }, { label: 'My offers', icon: FileText }, { label: 'Company profile', icon: Users }]
const readUser = () => { try { return currentUser(localStorage) } catch { return null } }
const readPath = () => window.location.hash.slice(1) || window.location.pathname


const navigation: { label: string; icon: LucideIcon; count?: string }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'My Requests', icon: ClipboardList },
  { label: 'Supplier offers', icon: FileText }, { label: 'Suppliers', icon: Users }, { label: 'Offer comparison', icon: SlidersHorizontal }, { label: 'Smart Ranking', icon: Sparkles },
]


export default function App() {
  const [user, setUser] = useState<User | null>(readUser)
  const [path, setPath] = useState(readPath)
  const [sessionError, setSessionError] = useState('')
  useEffect(() => {
    const routeChanged = () => setPath(readPath())
    const storageChanged = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === USERS_KEY || event.key === null) setUser(readUser())
    }
    window.addEventListener('hashchange', routeChanged)
    window.addEventListener('popstate', routeChanged)
    window.addEventListener('storage', storageChanged)
    return () => { window.removeEventListener('hashchange', routeChanged); window.removeEventListener('popstate', routeChanged); window.removeEventListener('storage', storageChanged) }
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.title = 'AI AgroProcurement'; }, [path])
  const route = resolveRoute(path, user)
  useEffect(() => {
    if (readPath() !== route || !window.location.hash) {
      window.history.replaceState(null, '', routeUrl(import.meta.env.BASE_URL, route))
      setPath(route)
    }
  }, [route, path])
  const go = (next: string) => { window.location.hash = next; setPath(next) }
  const authenticated = (next: User) => { setUser(next); go(homeRoute(next.role)) }
  if (!user) return <AuthPage key={route} mode={route === '/register' ? 'register' : 'login'} onLogin={authenticated}/>
  return <Workspace key={user.id} user={user} route={route} go={go} sessionError={sessionError} onDemoSwitch={role => { try { authenticated(loginDemo(localStorage, role)); setSessionError('') } catch { setSessionError('Demo switching failed. Enable browser storage and try again.') } }} onLogout={() => {
    try { localStorage.removeItem(SESSION_KEY) } catch { window.alert('Could not clear browser storage. Please enable storage and try again.'); return }
    setUser(null); go('/login')
  }}/>
}

function Workspace({ user, route, go, onLogout, onDemoSwitch, sessionError }: { user: User; route: string; go: (route: string) => void; onLogout: () => void; onDemoSwitch: (role: 'buyer' | 'supplier') => void; sessionError: string }) {
  const isSupplier = user.role === 'supplier'
  const page = route.startsWith('/buyer/ranking') ? 'Smart Ranking' : route.startsWith('/buyer/requests/') ? route.endsWith('/new') ? 'Create Purchase Request' : 'Request details' : route.startsWith('/supplier/opportunities/') ? route.endsWith('/submit') ? 'Submit offer' : 'Request details' : Object.keys(slugs).find(label => route === `/${user.role}/${slugs[label]}`) || 'Overview'
  const initials = user.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notice, setNotice] = useState(false)
  useEffect(() => { setMobileOpen(false); setNotice(false) }, [route])
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMobileOpen(false); setNotice(false) } }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape) }, [])
  const [metrics, setMetrics] = useState({ offers: 0, requests: 0 })
  useEffect(() => {
    const update = () => { try { const requests = getRequests(localStorage); setMetrics({ offers: visibleOffers(getOffers(localStorage), requests, user).length, requests: visibleRequests(requests, user).filter(r => r.status === 'Open').length }) } catch { /* Module views show storage errors. */ } }
    update(); window.addEventListener('storage', update); window.addEventListener(OFFERS_CHANGED, update)
    return () => { window.removeEventListener('storage', update); window.removeEventListener(OFFERS_CHANGED, update) }
  }, [route, user.id])
  const navigate = (label: string) => { go(`/${user.role}/${slugs[label] || 'overview'}`); setMobileOpen(false) }
  return <div className="app-shell"><a className="skip-link" href="#workspace-main" onClick={e => { e.preventDefault(); document.getElementById('workspace-main')?.focus() }}>Skip to content</a>
    {mobileOpen && <button className="backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside id="workspace-navigation" className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <a className="brand" href={`#/${user.role}/overview`} onClick={() => navigate('Overview')}><span className="brand-mark"><Sprout size={25}/></span><span>agro<span className="brand-light">procure</span><small>AI PROCUREMENT PLATFORM</small></span></a>
      <button className="workspace" onClick={() => navigate('Settings')}><span className="workspace-avatar">{user.company[0]}</span><span>{user.company}<small>{isSupplier ? 'Supplier' : 'Buyer'} workspace</small></span><ChevronDown size={15}/></button>
      <p className="nav-caption">WORKSPACE</p>
      <nav aria-label="Main navigation">{(isSupplier ? supplierNavigation : navigation).map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${(page === label || label === 'My Requests' && route.startsWith('/buyer/requests/') || label === 'Opportunities' && route.startsWith('/supplier/opportunities/')) ? 'active' : ''}`} aria-current={page === label || label === 'My Requests' && route.startsWith('/buyer/requests/') || label === 'Opportunities' && route.startsWith('/supplier/opportunities/') ? 'page' : undefined} onClick={() => navigate(label)}><Icon size={19}/><span>{label}</span>{count && <span className="nav-count">{count}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="insight-card"><span className="insight-icon"><Sparkles size={19}/></span><h3>Better decisions, naturally.</h3><p>{isSupplier ? 'Your next buyer connection is just one offer away.' : 'Your next great supplier is just one request away.'}</p><span>Rule-based insights <ArrowUpRight size={14}/></span></div><button className={`nav-item ${page === 'Settings' ? 'active' : ''}`} onClick={() => navigate('Settings')}><Settings size={19}/>Settings</button><button className={`nav-item ${page === 'Help & support' ? 'active' : ''}`} onClick={() => navigate('Help & support')}><CircleHelp size={19}/>Help & support</button><button className="nav-item" onClick={onLogout}><ArrowRight size={19}/>Logout</button><div className="profile"><span className="avatar">{initials}</span><span>{user.name}<small>{isSupplier ? 'Supplier account' : 'Buyer account'}</small></span><ChevronDown size={15}/></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="workspace-navigation" onClick={() => setMobileOpen(true)}><Menu size={21}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="topbar-right"><span className="live-label"><i/>Local demo workspace</span><div className="notification-wrap"><button className="icon-button notification" aria-label="Notifications" aria-expanded={notice} onClick={() => setNotice(!notice)}><Bell size={19}/><i/></button>{notice && <div className="notification-popover"><strong>You’re all caught up</strong><p>Live notifications will appear here when connected.</p></div>}</div><span className="avatar small">{initials}</span></div></header>
    <main id="workspace-main" tabIndex={-1}>{sessionError && <div role="alert" className="form-alert">{sessionError}</div>}<div className="demo-switcher"><span>Fictional demo workspace | Local data only</span><div><button aria-pressed={user.id === 'demo-buyer'} onClick={() => onDemoSwitch('buyer')}>Buyer demo</button><button aria-pressed={user.id === 'demo-supplier'} onClick={() => onDemoSwitch('supplier')}>Supplier demo</button></div></div><div className="page-heading"><div><div className="eyebrow">YOUR PROCUREMENT WORKSPACE</div><h1>{page === 'Overview' ? isSupplier ? 'Your next opportunity starts here.' : 'A growing season starts here.' : page}</h1><p>{page === 'Overview' ? isSupplier ? 'Connect with buyers, discover demand, and grow your business.' : 'A clear view of your requests, offers, and next opportunities.' : 'Everything you need for a more connected procurement process.'}</p></div><span className="preview-label"><span/>Prototype preview</span></div>
    {page === 'Smart Ranking' ? <RankingPage user={user} route={route} go={go}/> : page === 'Offer comparison' ? <ComparisonPage user={user} go={go}/> : page === 'Supplier offers' || page === 'My offers' ? <OffersPage user={user} go={go}/> : page === 'Suppliers' ? <SupplierCatalog/> : route.startsWith('/buyer/requests') || route.startsWith('/supplier/opportunities') ? <RequestModule user={user} route={route} go={go}/> : page === 'Overview' && isSupplier ? <SupplierOverview navigate={navigate} user={user} go={go} metrics={metrics}/> : page === 'Overview' ? <>
      <section className="welcome-banner"><div className="banner-content"><span className="banner-kicker"><Sparkles size={15}/> SMARTER SOURCING. STRONGER GROWTH.</span><h2>Good procurement.<br/>Great possibilities.</h2><p>Connect with the right suppliers and make confident<br className="desktop-break"/> purchasing decisions, all in one place.</p><button className="primary-button" onClick={() => navigate('Create Purchase Request')}><Plus size={17}/>Create purchase request</button></div><div className="banner-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><Wheat className="hero-wheat wheat-one"/><Wheat className="hero-wheat wheat-two"/><div className="art-label"><span><Check size={14}/></span>Better matched. Better sourced.</div></div><span className="banner-number">01 / YOUR NEXT CHAPTER</span></section>
      <section className="stats-grid" aria-label="Demo procurement metrics">{[{ label:'Active requests', value:String(metrics.requests), icon:ClipboardList, change:'Your open requests', note:'Saved in this browser' },{ label:'Offers received', value:String(metrics.offers), icon:FileText, change:'Linked supplier responses', note:'Includes labeled demo offers' },{ label:'Suppliers in network', value:'64', icon:Users, change:'+5 this month', note:'Illustrative demo metric' },{ label:'Avg. potential savings', value:'8.4%', icon:ArrowDownLeft, change:'Based on demo offers', note:'Illustrative demo metric' }].map(({ label, value, icon:Icon, change, note }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><div className="stat-change">{label !== 'Avg. potential savings' && <ArrowUpRight size={14}/>} {change}</div><p>{note}</p></article>)}</section>
      <RequestModule user={user} route="/buyer/requests" go={go}/>
      <section className="next-step"><div className="next-icon"><SlidersHorizontal size={23}/></div><div><span className="eyebrow">LESS GUESSWORK. MORE CLARITY.</span><h3>The best offer is more than the lowest price.</h3><p>Compare price, delivery time, and product match in one clear view.</p></div><button className="secondary-button" onClick={() => navigate('Offer comparison')}>Explore comparison <ArrowRight size={16}/></button></section>
    </> : <section className="placeholder-panel"><span className="placeholder-icon">{page === 'Offer comparison' ? <SlidersHorizontal size={32}/> : <Sprout size={32}/>}</span><span className="eyebrow">A FOUNDATION FOR WHAT’S NEXT</span><h2>{page}</h2><p>{page === 'Offer comparison' ? 'Price, delivery time, and product match will come together here. Offer ranking will be added in the next development phase.' : 'This workspace section is ready for the next development phase.'}</p><span className="coming-soon"><Clock3 size={15}/>Planned feature</span><button className="secondary-button" onClick={() => navigate('Overview')}>Back to overview <ArrowRight size={16}/></button></section>}
    <footer className="page-footer"><span>AI AgroProcurement</span><span>Built for a better way to source.<Leaf size={13}/></span></footer></main></div>
  </div>
}

function SupplierOverview({ navigate, user, go, metrics }: { navigate: (label: string) => void; user: User; go: (route: string) => void; metrics: { offers: number; requests: number } }) {
  return <>
    <section className="welcome-banner"><div className="banner-content"><span className="banner-kicker"><Sparkles size={15}/> YOUR PRODUCTS. NEW POSSIBILITIES.</span><h2>Meet demand.<br/>Grow your business.</h2><p>Discover agricultural purchase opportunities and connect<br className="desktop-break"/> your products with the buyers who need them.</p><button className="primary-button" onClick={() => navigate('Opportunities')}>Explore opportunities<ArrowRight size={17}/></button></div><div className="banner-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><Wheat className="hero-wheat wheat-one"/></div></section>
    <section className="stats-grid" aria-label="Supplier demo metrics">{[{ label: 'Open opportunities', value: String(metrics.requests), icon: ClipboardList }, { label: 'Your offers', value: String(metrics.offers), icon: FileText }, { label: 'Offers in review', value: '3', icon: Clock3 }, { label: 'Buyer connections', value: '8', icon: Users }].map(({ label, value, icon: Icon }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><p>Sample data · Preview only</p></article>)}</section>
    <RequestModule user={user} route="/supplier/opportunities" go={go}/>
    <section className="next-step"><div className="next-icon"><Users size={23}/></div><div><span className="eyebrow">MAKE YOUR FIRST CONNECTION</span><h3>Your company, ready to grow.</h3><p>Your supplier profile will help buyers discover what you offer.</p></div><button className="secondary-button" onClick={() => navigate('Company profile')}>Company profile<ArrowRight size={16}/></button></section>
  </>
}

