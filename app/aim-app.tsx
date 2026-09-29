'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Check, Sparkles, Layers, Bookmark, ShieldCheck, Clock3, TriangleAlert, ChevronLeft, ChevronRight, X, Compass, Play, SlidersHorizontal, Database, Users, EyeOff, RotateCcw, Info, LoaderCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from 'sonner';
import { diversify } from '@/lib/recommendations';
import type { AppState, RankedApp, Domain } from '@/lib/domain';
function eventId() { return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), v => v.toString(16).padStart(2, '0')).join(''); }
const domains: Domain[] = ['Manufacturing', 'Quality', 'Supply chain', 'Engineering', 'Data platform', 'Finance'];
async function api<T = AppState>(path: string, method = 'GET', payload?: unknown): Promise<T> { const r = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) }); const d = await r.json() as {
    error?: string;
}; if (!r.ok)
    throw new Error(d.error ?? 'Unable to complete request.'); return d as T; }
function Trend({ values, color = '#ad94ff', large = false }: {
    values: number[];
    color?: string;
    large?: boolean;
}) { const max = Math.max(...values, 1); const min = Math.min(...values, 0); const pts = values.map((v, i) => `${12 + i * 376 / Math.max(1, values.length - 1)},${104 - (v - min) / (max - min || 1) * 84}`).join(' '); return <svg className={large ? 'trend large' : 'trend'} viewBox="0 0 400 120" preserveAspectRatio="none" role="img" aria-label="Synthetic trend"><path d="M0 30H400 M0 60H400 M0 90H400" stroke="currentColor" strokeWidth=".5" opacity=".22"/><polygon points={`12,120 ${pts} 388,120`} fill={color} opacity=".09"/><polyline points={pts} fill="none" stroke={color} strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></svg>; }
function MiniDashboard({ app, hero = false }: {
    app: RankedApp;
    hero?: boolean;
}) { return <div className={`mini-dashboard ${hero ? 'hero-dashboard' : ''}`} style={{ '--app-color': app.color } as React.CSSProperties}><div className="mini-top"><span className="mini-appmark"><Layers size={13}/></span><span>{app.name}</span><span className="mini-dots">•••</span></div><div className="mini-body"><div className="mini-metric"><div><small>{app.metric.label}</small><strong>{app.metric.value}</strong></div><span className="mini-change">{app.metric.change}</span></div><Trend values={app.series} color={app.color} large={hero}/><div className="mini-axis"><span>Earlier</span><span>Latest</span></div></div></div>; }
function WarningBadge({ app }: {
    app: RankedApp;
}) { return app.warning ? <span className={`status-chip warning ${app.warning.level}`}><TriangleAlert size={12}/>{app.warning.level === 'notice' ? 'In review' : 'Data delay'}</span> : app.certified ? <span className="status-chip"><ShieldCheck size={12}/>Certified</span> : null; }
function AppCard({ app, onOpen, onSave, busy, onImpression }: {
    app: RankedApp;
    onOpen: (a: RankedApp) => void;
    onSave: (a: RankedApp) => Promise<void>;
    busy: boolean;
    onImpression: (id: string, position?: number, surface?: string) => void;
}) { const ref = useRef<HTMLElement>(null); useEffect(() => { const node = ref.current; if (!node)
    return; const observer = new IntersectionObserver(entries => { if (entries.some(x => x.isIntersecting)) {
    onImpression(app.id);
    observer.disconnect();
} }, { threshold: .65 }); observer.observe(node); return () => observer.disconnect(); }, [app.id, onImpression]); return <article className="app-card" ref={ref}><div className="card-art"><button className="preview-button" onClick={() => onOpen(app)} aria-label={`View ${app.name}`}><MiniDashboard app={app}/><span className="card-preview"><span className="preview-question">{app.question}</span><span><Clock3 size={12}/>{app.freshness} · {app.owner}</span><span className="preview-reason"><Sparkles size={12}/>{app.reason}</span></span></button><div className="art-badges"><WarningBadge app={app}/>{app.newApp && <span className="new-badge">NEW</span>}</div></div><div className="card-heading"><button className="text-button" onClick={() => onOpen(app)}><h3>{app.name}</h3></button><Tooltip><TooltipTrigger asChild><button className={`save-icon ${app.saved ? 'saved' : ''}`} aria-label={`${app.saved ? 'Remove' : 'Save'} ${app.name}${app.saved ? ' from' : ' to'} My List`} aria-pressed={app.saved} disabled={busy} onClick={() => void onSave(app)}>{busy ? <LoaderCircle size={18} className="spin"/> : app.saved ? <Check size={18}/> : <Plus size={18}/>}</button></TooltipTrigger><TooltipContent>{app.saved ? 'Remove from My List' : 'Add to My List'}</TooltipContent></Tooltip></div><div className="card-meta"><span>{app.domain}</span><span>{app.weeklyUsers} weekly users</span></div><p className="card-reason"><Sparkles size={12}/>{app.reason}</p></article>; }
function Shelf({ title, subtitle, apps, ...props }: {
    title: string;
    subtitle: string;
    apps: RankedApp[];
    onOpen: (a: RankedApp) => void;
    onSave: (a: RankedApp) => Promise<void>;
    busyIds: Set<string>;
    onImpression: (id: string, position?: number, surface?: string) => void;
}) { const ref = useRef<HTMLDivElement>(null); if (!apps.length)
    return null; return <section className="shelf"><div className="section-head"><div><h2>{title}<span>{apps.length}</span></h2><p>{subtitle}</p></div><div className="shelf-nav"><button aria-label={`Scroll ${title} left`} onClick={() => ref.current?.scrollBy({ left: -640, behavior: 'smooth' })}><ChevronLeft size={17}/></button><button aria-label={`Scroll ${title} right`} onClick={() => ref.current?.scrollBy({ left: 640, behavior: 'smooth' })}><ChevronRight size={17}/></button></div></div><div className="card-rail" ref={ref}>{apps.map((a, index) => <AppCard key={a.id} app={a} onOpen={props.onOpen} onSave={props.onSave} busy={props.busyIds.has(a.id)} onImpression={id => props.onImpression(id, index, title)}/>)}</div></section>; }
export default function AimApp() {
    const [state, setState] = useState<AppState | null>(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('discover');
    const [domain, setDomain] = useState('All domains');
    const [query, setQuery] = useState('');
    const [warningOnly, setWarningOnly] = useState(false);
    const [selected, setSelected] = useState<RankedApp | null>(null);
    const [launched, setLaunched] = useState<RankedApp | null>(null);
    const [period, setPeriod] = useState('12');
    const [busy, setBusy] = useState<Set<string>>(new Set());
    const [profileBusy, setProfileBusy] = useState(false);
    const [about, setAbout] = useState(false);
    const seen = useRef(new Set<string>());
    const stateRef = useRef<AppState | null>(state);
    stateRef.current = state;
    const requestId = useRef('');
    const refresh = useCallback(async () => { try {
        const d = await api('state');
        setState(d);
        setError('');
        requestId.current = eventId();
    }
    catch (e) {
        setError((e as Error).message);
    } }, []);
    useEffect(() => { void refresh(); }, [refresh]);
    const track = useCallback(async (appId: string, type: string, position?: number, surface?: string) => { await api('events', 'POST', { id: eventId(), appId, type, requestId: requestId.current, position, surface }); }, []);
    const impression = useCallback((id: string, position = 0, surface = 'catalog') => { const key = surface + ':' + id; if (seen.current.has(key))
        return; seen.current.add(key); void track(id, 'impression', position, surface).catch(() => seen.current.delete(key)); }, [track]);
    const save = useCallback(async (app: RankedApp) => { if (busy.has(app.id))
        return; setBusy(s => new Set(s).add(app.id)); const current = stateRef.current?.myList.includes(app.id) ?? false; try {
        await api('list', current ? 'DELETE' : 'PUT', { appId: app.id });
        setState(s => s ? { ...s, myList: current ? s.myList.filter(id => id !== app.id) : [app.id, ...s.myList], apps: s.apps.map(a => a.id === app.id ? { ...a, saved: !current } : a) } : s);
        setSelected(a => a?.id === app.id ? { ...a, saved: !current } : a);
        toast.success(current ? 'Removed from My List' : 'Added to My List');
        const d = await api('state');
        setState(d);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(s => { const n = new Set(s); n.delete(app.id); return n; });
    } }, [busy]);
    const open = useCallback((a: RankedApp) => { setSelected(a); void track(a.id, 'detail').catch(() => { }); }, [track]);
    async function dismiss(app: RankedApp) { const hidden = state?.dismissed.includes(app.id); try {
        await track(app.id, hidden ? 'restore' : 'dismiss');
        setSelected(null);
        await refresh();
        toast.success(hidden ? 'Recommendations restored' : 'Hidden from recommendations');
    }
    catch (e) {
        toast.error((e as Error).message);
    } }
    async function launch(app: RankedApp) { try {
        await track(app.id, 'launch');
        setSelected(null);
        setPeriod('12');
        setLaunched(app);
        void refresh();
    }
    catch (e) {
        toast.error((e as Error).message);
    } }
    async function changeProfile(id: string) { setProfileBusy(true); try {
        const d = await api('state', 'PATCH', { persona: id });
        seen.current.clear();
        requestId.current = eventId();
        setState(d);
        setSelected(null);
        setDomain('All domains');
        toast.success('Recommendations updated');
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setProfileBusy(false);
    } }
    useEffect(() => { const context = (document as any).modelContext; if (!context?.registerTool)
        return; const lifecycle = new AbortController(); const tool = { name: 'aim_set_saved_app', title: 'Update My List', description: 'Save or remove an available app in the current user’s My List.', inputSchema: { type: 'object', properties: { appId: { type: 'string' }, saved: { type: 'boolean' } }, required: ['appId', 'saved'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => { const x = input as {
            appId: string;
            saved: boolean;
        }; if (!x || typeof x.appId !== 'string' || typeof x.saved !== 'boolean')
            throw new Error('appId and saved are required'); const a = stateRef.current?.apps.find(a => a.id === x.appId); if (!a)
            throw new Error('App is unavailable'); if (a.saved !== x.saved) {
            await api('list', x.saved ? 'PUT' : 'DELETE', { appId: x.appId });
            const d = await api('state');
            setState(d);
            stateRef.current = d;
        } return { appId: x.appId, saved: x.saved }; } }; try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => { });
    }
    catch { } return () => lifecycle.abort(); }, []);
    const filtered = useMemo(() => state?.apps.filter(a => (domain === 'All domains' || a.domain === domain) && (!warningOnly || a.warning) && `${a.name} ${a.summary} ${a.tags.join(' ')} ${a.domain}`.toLowerCase().includes(query.toLowerCase())) ?? [], [state, domain, warningOnly, query]);
    const recommendations = diversify(filtered.filter(a => !state?.dismissed.includes(a.id)), 6);
    const featured = recommendations[0];
    const featureRef = useRef<HTMLElement>(null);
    useEffect(() => { const el = featureRef.current; if (!el || !featured)
        return; const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) {
        impression(featured.id, 0, 'featured');
        o.disconnect();
    } }, { threshold: .6 }); o.observe(el); return () => o.disconnect(); }, [featured?.id, tab, impression]);
    const isFiltering = query !== '' || domain !== 'All domains' || warningOnly;
    const shared = { onOpen: open, onSave: save, busyIds: busy, onImpression: impression };
    const current = selected ? state?.apps.find(a => a.id === selected.id) ?? selected : null;
    return <TooltipProvider><Toaster position="bottom-right" theme="dark" richColors/><div className="starfield" aria-hidden="true">{Array.from({ length: 55 }, (_, i) => <i key={i} style={{ left: `${(i * 37.17) % 100}%`, top: `${(i * 23.79) % 100}%`, width: i % 7 === 0 ? 3 : 1, height: i % 7 === 0 ? 3 : 1, animationDelay: `${i % 9}s` }}/>)}</div><header className="topbar"><a href="/" className="brand" aria-label="AIM home"><span className="brand-symbol">✦</span><span>AIM</span><span className="brand-divider"/><span className="brand-parent">dreamcatcher</span></a><div className="searchbox"><Search size={17}/><input aria-label="Search apps" placeholder="Find an app, a question, a data domain…" value={query} onChange={e => setQuery(e.target.value)}/>{query ? <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button> : <kbd>⌕</kbd>}</div><button className="demo-pill" onClick={() => setAbout(true)}><span />Synthetic demo <Info size={13}/></button></header>
 <main className="main"><div className="intro"><div className="intro-copy"><span className="eyebrow">YOUR ANALYTICS CENTER</span><h1>Find your next advantage<span>.</span></h1><p>The right apps for the work in front of you.</p></div><div className="profile-select"><label>DEMO PROFILE</label><Select value={state?.persona.id ?? 'architect'} onValueChange={changeProfile} disabled={profileBusy || busy.size > 0 || !state}><SelectTrigger aria-label="Demo profile" className="profile-trigger"><span className="profile-avatar">{state?.persona.initials ?? 'DA'}</span><SelectValue /></SelectTrigger><SelectContent>{state?.personas.map(p => <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div></div>
 <Tabs value={tab} onValueChange={setTab} className="main-tabs"><div className="navline"><TabsList className="app-tabs" variant="line"><TabsTrigger value="discover"><Compass />For you</TabsTrigger><TabsTrigger value="list"><Bookmark />My List <span className="tab-count">{state?.myList.length ?? 0}</span></TabsTrigger><TabsTrigger value="catalog"><Layers />All apps</TabsTrigger></TabsList><span className="catalog-summary">{state?.counts.available ?? '—'} available apps <span>·</span> {state?.counts.certified ?? '—'} certified</span></div>
 <div className="filterline"><div className="domain-chips">{['All domains', ...domains].map(d => <button className={domain === d ? 'active' : ''} key={d} onClick={() => setDomain(d)}>{d}</button>)}</div><button className={`warning-filter ${warningOnly ? 'active' : ''}`} onClick={() => setWarningOnly(!warningOnly)} aria-label="Show apps with warnings" aria-pressed={warningOnly}><TriangleAlert size={15}/><span>Warnings</span><b>{state?.counts.warnings ?? 0}</b></button></div>
 {error ? <div className="empty-state"><TriangleAlert size={30}/><h2>We couldn’t load your apps.</h2><p>{error}</p><button className="primary-button" onClick={() => void refresh()}>Try again</button>{error.includes('Sign in') && <a href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in</a>}</div> : !state ? <div className="loading-grid">{[1, 2, 3, 4].map(x => <Skeleton key={x} className="loading-card"/>)}</div> : <>
 <TabsContent value="discover">
 {!isFiltering && featured && <section className="featured" ref={featureRef}><div className="featured-copy"><div className="feature-eyebrow"><Sparkles size={14}/>SELECTED FOR YOU<span className="feature-line"/></div><h2>{featured.name}</h2><p>{featured.summary}</p><div className="feature-reason"><span className="reason-icon"><Database size={14}/></span>{featured.reason}</div><div className="feature-actions"><button className="primary-button" onClick={() => void launch(featured)}><Play size={15} fill="currentColor"/>Open demo</button><button className={`secondary-button ${featured.saved ? 'is-saved' : ''}`} onClick={() => void save(featured)} disabled={busy.has(featured.id)}>{featured.saved ? <Check size={16}/> : <Plus size={16}/>}My List</button><button className="round-button" aria-label={`Why ${featured.name}?`} onClick={() => open(featured)}><Info size={19}/></button></div><div className="feature-footer"><WarningBadge app={featured}/><span><Clock3 size={12}/>{featured.freshness}</span><span>{featured.domain}</span></div></div><button className="featured-visual" onClick={() => open(featured)} aria-label={`Preview ${featured.name}`}><span className="visual-orbit orbit-one"/><span className="visual-orbit orbit-two"/><MiniDashboard app={featured} hero/><span className="preview-caption">APP PREVIEW <span>·</span> SYNTHETIC DATA</span></button></section>}
 {recommendations.length ? <Shelf title={isFiltering ? 'Matching your work' : 'Recommended for you'} subtitle="Selected from your role, data activity, and saved apps." apps={recommendations} {...shared}/> : <Empty title="No recommendations here" message="Try another domain or search. Hidden apps are still available in All apps."/>}
 {!isFiltering && <><Shelf title="Pick up where you left off" subtitle="Recently used in this synthetic profile." apps={state.persona.recent.map(id => state.apps.find(a => a.id === id)).filter(Boolean) as RankedApp[]} {...shared}/><Shelf title="Worth exploring" subtitle="New apps and useful connections across your data domains." apps={diversify(state.apps.filter(a => !state.dismissed.includes(a.id) && (a.newApp || !recommendations.slice(0, 4).some(r => r.id === a.id))), 6)} {...shared}/></>}
 </TabsContent>
 <TabsContent value="list"><div className="section-head list-heading"><div><h2>Your saved apps<span>{state.myList.length}</span></h2><p>A personal collection, ready whenever you need it.</p></div><Bookmark size={22}/></div>{filtered.filter(a => a.saved).length ? <div className="catalog-grid">{state.myList.map(id => filtered.find(a => a.id === id)).filter(Boolean).map((a, index) => <AppCard key={a!.id} app={a!} onOpen={open} onSave={save} busy={profileBusy || busy.has(a!.id)} onImpression={id => impression(id, index, 'my-list')}/>)}</div> : <Empty title={isFiltering ? 'No saved apps match' : 'Make this space yours'} message={isFiltering ? 'Try clearing your filters.' : 'Save an app with the + button and it will be waiting here.'} action={() => { setTab('discover'); setDomain('All domains'); setQuery(''); setWarningOnly(false); }}/>}</TabsContent>
 <TabsContent value="catalog"><div className="section-head list-heading"><div><h2>Explore the catalog<span>{filtered.length}</span></h2><p>Every app available to this profile, including hidden recommendations.</p></div><SlidersHorizontal size={20}/></div>{filtered.length ? <div className="catalog-grid">{filtered.map((a, index) => <AppCard key={a.id} app={a} onOpen={open} onSave={save} busy={profileBusy || busy.has(a.id)} onImpression={id => impression(id, index, 'catalog')}/>)}</div> : <Empty title="No apps found" message="Try a different name, question, or domain."/>}</TabsContent>
 </>}
 </Tabs><footer className="footer"><span className="footer-brand">✦ <b>dreamcatcher</b> <span>/</span> AIM</span><span>Sample catalog & activity <span>·</span> Your saved list is persistent</span><button onClick={() => setAbout(true)}>About this demo</button></footer></main>
 <Sheet open={!!current} onOpenChange={v => { if (!v)
        setSelected(null); }}><SheetContent className="detail-sheet">{current && <><div className="detail-art"><MiniDashboard app={current} hero/></div><div className="detail-body"><div className="detail-chips"><span>{current.domain}</span><WarningBadge app={current}/></div><SheetTitle className="detail-title">{current.name}</SheetTitle><SheetDescription className="detail-description">{current.summary}</SheetDescription><div className="detail-actions"><button className="primary-button" onClick={() => void launch(current)}><Play size={15}/>Open demo</button><button className="secondary-button" disabled={busy.has(current.id)} onClick={() => void save(current)}>{current.saved ? <Check size={16}/> : <Plus size={16}/>}My List</button></div><div className="question-block"><small>THE QUESTION IT ANSWERS</small><p>{current.question}</p></div>{current.warning && <div className="warning-box"><TriangleAlert size={18}/><div><strong>{current.warning.title}</strong><p>{current.warning.detail}</p></div></div>}<h3 className="detail-section-title"><Sparkles size={16}/>Why this app?</h3><p className="detail-note">{current.reason}. {current.score} relevance points from the current rules; this is not a probability.</p><div className="signals">{current.signals.map(s => <div key={s.label}><span>{s.label}</span><b className={s.points < 0 ? 'negative' : ''}>{s.points > 0 ? '+' : ''}{s.points}</b></div>)}</div><dl className="app-facts"><div><dt>Owner</dt><dd>{current.owner}</dd></div><div><dt>Data updated</dt><dd>{current.freshness} <small>(sample)</small></dd></div><div><dt>Weekly users</dt><dd>{current.weeklyUsers} <small>(sample)</small></dd></div></dl><h3 className="detail-section-title"><Database size={16}/>Connected data</h3><div className="dataset-tags">{current.datasets.map(d => <span key={d}>{d}</span>)}</div><button className="hide-button" onClick={() => void dismiss(current)}>{state?.dismissed.includes(current.id) ? <RotateCcw size={15}/> : <EyeOff size={15}/>} {state?.dismissed.includes(current.id) ? 'Restore recommendations' : 'Hide from recommendations'}</button></div></>}</SheetContent></Sheet>
 <Dialog open={!!launched} onOpenChange={v => { if (!v)
        setLaunched(null); }}><DialogContent className="launch-dialog">{launched && <><span className="eyebrow">SYNTHETIC APP PREVIEW</span><DialogTitle className="launch-title">{launched.name}</DialogTitle><DialogDescription>{launched.question}</DialogDescription>{launched.warning && <div className="warning-box"><TriangleAlert size={17}/><div><strong>{launched.warning.title}</strong><p>{launched.warning.detail}</p></div></div>}<div className="launch-kpi"><div><small>{launched.metric.label}</small><strong style={{ color: launched.color }}>{launched.metric.value}</strong></div><p>{launched.metric.change}</p></div><div className="chart-toolbar"><span>Sample trend · normalized index</span><div>{['6', '12'].map(p => <button key={p} className={period === p ? 'active' : ''} onClick={() => { setPeriod(p); void track(launched.id, 'meaningful_use').catch(() => { }); }}>Last {p} points</button>)}</div></div><Trend values={launched.series.slice(-Number(period))} color={launched.color} large/><div className="data-strip">{launched.series.slice(-Number(period)).map((v, i) => <div key={i}><small>P{i + 1}</small><strong>{v}</strong></div>)}</div><p className="launch-note">This is a working sample. Your work handoff maps each app to its real launch URL and governed data.</p></>}</DialogContent></Dialog>
 <Dialog open={about} onOpenChange={setAbout}><DialogContent className="about-dialog"><span className="brand-symbol">✦</span><DialogTitle>AIM, connected to your work.</DialogTitle><DialogDescription>A working discovery app with a synthetic catalog and activity profiles.</DialogDescription><div className="about-list"><p><ShieldCheck size={19}/><span><strong>Your list is real.</strong> Saves and preferences are stored for your signed-in account.</span></p><p><Users size={19}/><span><strong>Profiles are examples.</strong> Switching the demo profile changes relevance and sample app eligibility.</span></p><p><Sparkles size={19}/><span><strong>Recommendations are explainable.</strong> Role, data affinity, team use, saved apps, and recent launches contribute to ranking.</span></p><p><Database size={19}/><span><strong>Work connections come next.</strong> The source package includes data contracts and a Claude handoff for your real environment.</span></p></div></DialogContent></Dialog>
 </TooltipProvider>;
}
function Empty({ title, message, action }: {
    title: string;
    message: string;
    action?: () => void;
}) { return <div className="empty-state"><Bookmark size={30}/><h2>{title}</h2><p>{message}</p>{action && <button className="primary-button" onClick={action}>Explore apps</button>}</div>; }
