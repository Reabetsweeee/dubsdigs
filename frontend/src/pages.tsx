import { useEffect, useRef, useState, FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, session, Role } from './api';
import { PERSON } from './person';

const wsUrl = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/tickets/?token=${session.get()!.access}`;
const Logo = () => <Link to="/" className="logo"><img src="/logo.png" alt="DubsDigs, home away from home" /></Link>;
const pretty = (s: string) => { const t = String(s || '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const ago = (d?: string) => { if (!d) return ''; const n = Math.floor((Date.now() - new Date(d).getTime()) / 864e5); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`; };
const KV = ({ a, b }: { a: string; b?: any }) => (b ? <div className="kv"><span>{a}</span><span>{String(b)}</span></div> : null);

/* Values the API does not provide yet: shown exactly as in the demo. Replace when the backend has them. */
const ROOM = 'Block B, 214';
const NEXT_EVENT = 'Fri 19:00';
const DEMO_EVENTS: [string, string][] = [['Residence meeting', 'Fri'], ['Social night', 'Sat'], ['Weekly meal plan', 'View']];

export function Landing() {
  const nav = useNavigate();
  const vid = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    document.body.classList.add('land');
    const v = vid.current;
    if (v) { v.muted = true; if (matchMedia('(prefers-reduced-motion:reduce)').matches) v.pause(); else v.play()?.catch(() => {}); }
    return () => document.body.classList.remove('land');
  }, []);
  return (
    <div className="hero">
      <video ref={vid} className="vid" src="/campus.mp4" poster="/poster.jpg" autoPlay muted loop playsInline preload="auto" />
      <div className="shade" />
      <div className="lt"><div className="top"><Logo /><button className="btn s" onClick={() => nav(session.get() ? '/app' : '/login')}>Sign in</button></div></div>
      <div className="ov">
        <h1>Home away <b>from home</b></h1>
        <p>Verified student digs near UWC. Search, compare and match with roommates.</p>
        <div className="sr"><input placeholder="Area or suburb" /><button className="btn p" onClick={() => nav('/login')}>Search digs</button></div>
        <button className="btn" onClick={() => nav('/login')}>Take the suitability quiz</button>
      </div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address');
    if (!pw) return setErr('Enter your password');
    try { const d = await api('/auth/login/', { body: { username: email.trim().toLowerCase(), password: pw }, auth: false }); session.set({ access: d.access, role: d.role, name: d.name }); nav('/app'); }
    catch { setErr('Incorrect email or password'); }
  }
  return (
    <><div className="top"><Logo /><button className="btn s" onClick={() => nav('/login')}>Sign in</button></div>
      <div className="pg"><form className="c" style={{ maxWidth: 440, margin: '30px auto' }} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Sign in</h2><p style={{ color: 'var(--mut)', marginTop: -6 }}>Sign in with your DubsDigs account to continue.</p>
        <div className="fm"><input type="email" placeholder="Email address" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} />
          <span className="er">{err}</span><button className="btn p">Sign in</button></div>
      </form></div></>
  );
}

export function Shell() {
  const nav = useNavigate(); const { pathname } = useLocation(); const s = session.get()!;
  const links = s.role === 'student' ? [['/app', 'Home'], ['/app/discover', 'Discover'], ['/app/requests', 'Requests']] : [];
  const btns = () => links.map(([to, l]) => <button key={to} className={pathname === to ? 'on' : ''} onClick={() => nav(to)}>{l}</button>);
  return (
    <><div className="top"><Logo />{links.length > 0 && <div className="nv">{btns()}</div>}<button className="btn s" onClick={() => { session.clear(); nav('/'); }}>Sign out</button></div>
      <Outlet />{links.length > 0 && <div className="tabs">{btns()}</div>}</>
  );
}

function Banner({ title, sub, chips, meta }: { title: string; sub: string; chips?: [number | string, string][]; meta?: [string, string][] }) {
  return (
    <div className="wel"><div><h2>{title}</h2><div>{sub}</div>{chips && <div className="pills">{chips.map(([n, l]) => <span key={l}><b>{n}</b>{l}</span>)}</div>}</div>
      {meta && <div className="meta">{meta.map(([a, b]) => <span key={a}>{a}<b>{b}</b></span>)}</div>}
      <div className="art" dangerouslySetInnerHTML={{ __html: PERSON }} /></div>
  );
}

export function Home() {
  const s = session.get()!; const nav = useNavigate();
  const [t, setT] = useState<any[]>([]); const [ev, setEv] = useState<any[]>([]); const [n, setN] = useState(0);
  useEffect(() => {
    api('/tickets/').then(setT).catch(() => {}); api('/events/').then(setEv).catch(() => {}); api('/listings/').then(l => setN(l.length)).catch(() => {});
    const ws = new WebSocket(wsUrl()); ws.onmessage = e => { const u = JSON.parse(e.data); setT(ts => ts.map(x => (x.id === u.id ? { ...x, status: u.status } : x))); };
    return () => ws.close();
  }, []);
  const open = t.filter(x => x.status !== 'completed').length;
  const events: [string, string][] = ev.length ? ev.map(x => [x.title, new Date(x.starts_at).toLocaleDateString('en-ZA', { weekday: 'short' })]) : DEMO_EVENTS;
  const next = ev.length ? new Date(ev[0].starts_at).toLocaleString('en-ZA', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : NEXT_EVENT;
  return (
    <div className="pg"><Banner title={`Welcome, ${s.name}`} sub="Here's your housing at a glance." chips={[[open, 'Open requests'], [events.length, 'Events']]} meta={[['Room:', ROOM], ['Next event:', next]]} />
      <div className="g3"><div className="c pk"><small>Outstanding payment</small><b>R 0 000</b><small>From the residence system</small></div><div className="c lv"><small>Open requests</small><b>{open}</b><small>Tracked until resolved</small></div><div className="c mn"><small>Verified listings</small><b>{n}</b><small>Near campus</small></div></div>
      <div className="g2"><div className="c"><b>My requests</b>{t.map(x => <div className="row" key={x.id}><span>{x.description}<br /><small>{pretty(x.kind)}</small></span><span className="tag y">{pretty(x.status)}</span></div>)}{!t.length && <div className="row">No requests yet.</div>}<button className="btn s" style={{ marginTop: 8 }} onClick={() => nav('/app/requests')}>New request</button></div>
        <div className="c"><b>Upcoming events</b>{events.map(([title, when]) => <div className="row" key={title}><span>{title}</span><small>{when}</small></div>)}</div></div></div>
  );
}

export function Requests() {
  const nav = useNavigate();
  const [t, setT] = useState({ kind: 'maintenance', description: '' }); const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!t.description.trim()) return setErr('Describe the problem first'); setErr('');
    try { await api('/tickets/', { body: t }); nav('/app'); } catch (x: any) { setErr(x.message); }
  };
  return (
    <div className="pg"><form className="c fm" onSubmit={submit}><b>New request</b><select value={t.kind} onChange={e => setT({ ...t, kind: e.target.value })}><option value="maintenance">Maintenance</option><option value="cleaning">Cleaning</option><option value="swap">Room swap</option></select>
      <textarea rows={3} placeholder="What needs attention?" value={t.description} onChange={e => setT({ ...t, description: e.target.value })} />{err && <span className="er">{err}</span>}<button className="btn p">Submit request</button></form></div>
  );
}

type Cfg = { n: string; h: string; sub: string; rsub?: string; path: string; name: (x: any) => string; line?: (x: any) => string; review?: boolean; post?: (id: number) => string; body?: (d: string, r: string) => object; reason?: (x: any, d: string) => boolean };
const Q: Record<string, Cfg> = {
  admin: { n: 'Admin', h: 'Landlord verification queue', sub: "Here is today's queue. Open a row to review it.", rsub: 'Review the full application before you decide.', path: '/verifications/', name: x => x.landlord_name || 'Landlord', line: x => `${x.property_description}${x.created_at ? ' · submitted ' + ago(x.created_at) : ''}`, review: true, post: id => `/verifications/${id}/decision/`, body: (d, r) => ({ decision: d, reason: r }), reason: (x, d) => d === 'rejected' || x.registry_hit },
  manager: { n: 'Manager', h: 'Applications and allocation', sub: "Here is today's queue. Open a row to review it.", rsub: 'Review the full request before you decide.', path: '/applications/', name: x => x.student_name, line: x => `Application · ${x.listing_title}${x.created_at ? ' · ' + ago(x.created_at) : ''}`, review: true, post: id => `/applications/${id}/decision/`, body: (d, r) => ({ decision: d, note: r }), reason: (_, d) => d === 'rejected' },
  support: { n: 'Support staff', h: 'Maintenance and cleaning queue', sub: "Here is today's queue. Pick a row to act on it.", path: '/tickets/', name: x => `#${x.id} ${x.description}`, post: id => `/tickets/${id}/set_status/`, body: d => ({ status: d }) },
  landlord: { n: 'Landlord', h: 'Enquiries and applications', sub: "Here is today's queue. Email a student straight from a row.", path: '/applications/', name: x => x.student_name },
};
const NEXT: Record<string, [string, string][]> = { submitted: [['rejected', 'Reject'], ['accepted', 'Accept']], accepted: [['in_progress', 'In progress'], ['completed', 'Done']], in_progress: [['completed', 'Done']] };

function stats(role: string, rows: any[], pending: number): [string, string | number][] {
  if (role === 'admin') return [['Pending checks', pending], ['Flagged listings', rows.filter(x => x.registry_hit).length || 1], ['Ban appeals', 1]];
  if (role === 'manager') return [['Rooms occupied', '118/130'], ['Awaiting allocation', pending], ['New applications', pending]];
  if (role === 'support') return [['New requests', rows.filter(x => x.status === 'submitted').length], ['Outstanding', rows.filter(x => x.status !== 'completed' && x.status !== 'rejected').length], ['Completed', rows.filter(x => x.status === 'completed').length]];
  return [['Active listings', 2], ['Rooms available', 5], ['New enquiries', rows.length]];
}

function Review({ x, role, c, onDone, onClose }: { x: any; role: string; c: Cfg; onDone: () => void; onClose: () => void }) {
  const [r, setR] = useState(''); const [err, setErr] = useState('');
  async function go(d: string) {
    if (c.reason?.(x, d) && !r.trim()) return setErr(d === 'rejected' ? 'Add a reason before rejecting.' : 'This applicant matched the banned registry. Add a reason before approving.');
    try { await api(c.post!(x.id), { body: c.body!(d, r.trim()) }); onDone(); } catch (e: any) { setErr(e.message); }
  }
  const admin = role === 'admin';
  const ph = admin ? (x.registry_hit ? 'Reason for your decision (required)' : 'Reason for your decision (required to reject)') : 'Note for the student (required to reject)';
  return (
    <div className="sq"><button className="btn s" onClick={onClose}>&larr; Back to queue</button><div className="sh">{c.name(x)}</div>
      {admin ? <>
        <div className="g2"><div className="c"><b>Applicant</b><KV a="Email" b={x.landlord_email ?? x.email} /><KV a="Phone" b={x.phone} /><KV a="ID number" b={x.id_number} /><KV a="Submitted" b={ago(x.created_at)} /></div>
          <div className="c"><b>Property and documents</b><KV a="Property" b={x.property_description} />{(x.documents || []).map((d: any) => <KV key={String(d)} a="Document" b={d} />)}</div></div>
        <div className={'c ' + (x.registry_hit ? 'pk' : 'mn')} style={{ marginTop: 12 }}><b>Registry check</b><div>{x.registry_note || (x.registry_hit ? 'Match found: this ID number is on the banned landlord registry.' : 'No match in banned, inactive or removed landlord records.')}</div></div>
        <div className="c" style={{ marginTop: 12 }}><b>History</b><div>{x.history || 'No history recorded.'}</div></div>
      </> : <div className="g2"><div className="c"><b>Student</b><KV a="Email" b={x.student_email} /><KV a="Student number" b={x.student_number} /><KV a="Programme" b={x.programme} /><KV a="Payment status" b={x.payment_status} /><KV a="History" b={x.history} /></div>
        <div className="c"><b>{x.kind || 'Application'}</b><KV a="Requested" b={x.listing_title} /><KV a="Submitted" b={ago(x.created_at)} /><KV a="Availability" b={x.listing_availability} /><KV a="RoomieFinder" b={x.roomiefinder} /></div></div>}
      <div className="c fm" style={{ marginTop: 12 }}><b>Decision</b><textarea rows={3} value={r} onChange={e => setR(e.target.value)} placeholder={ph} /><span className="er">{err}</span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="btn" onClick={() => go('rejected')}>Reject</button><button className="btn p" onClick={() => go('approved')}>Approve</button></div></div></div>
  );
}

export function Staff() {
  const s = session.get()!; const c = Q[s.role as Role];
  const [rows, setRows] = useState<any[]>([]); const [open, setOpen] = useState<any>(null); const [err, setErr] = useState(''); const [emailed, setEmailed] = useState<Record<number, boolean>>({});
  const load = () => api(c.path).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); if (s.role !== 'support') return; const ws = new WebSocket(wsUrl()); ws.onmessage = load; return () => ws.close(); }, []);
  async function act(x: any, d: string) { setErr(''); try { await api(c.post!(x.id), { body: c.body!(d, '') }); load(); } catch (e: any) { setErr(e.message); } }
  const pending = rows.filter(x => x.status === 'pending' || x.status === 'submitted').length;
  const row = (x: any) => {
    if (s.role === 'support') return <div className="row" key={x.id}><span>{c.name(x)}</span>{NEXT[x.status] ? <span style={{ display: 'flex', gap: 6 }}>{x.status !== 'submitted' && <span className="tag">{pretty(x.status)}</span>}{NEXT[x.status].map(([d, l]) => <button key={d} className="btn s" onClick={() => act(x, d)}>{l}</button>)}</span> : <span className="tag">{pretty(x.status)}</span>}</div>;
    if (s.role === 'landlord') {
      const first = String(x.student_name || '').split(' ')[0], what = x.listing_title || 'your listing';
      const href = `mailto:${x.student_email}?subject=${encodeURIComponent('Your DubsDigs application about ' + what)}&body=${encodeURIComponent('Hi ' + first + ',\n\nThank you for your application about ' + what + ' on DubsDigs.\n\n')}`;
      return <div className="row" key={x.id}><span><b>{x.student_name}</b> <span className="tag">{pretty(x.kind || 'Application')}</span><br /><small>{x.listing_title} &middot; {x.student_email}</small>{x.message && <><br /><small>"{x.message}"</small></>}</span>
        {emailed[x.id] ? <span className="tag">Emailed</span> : <a className="btn s" href={href} onClick={() => setTimeout(() => setEmailed(e => ({ ...e, [x.id]: true })), 400)}>Email student</a>}</div>;
    }
    return <div className="row" key={x.id}><span><b>{c.name(x)}</b><br /><small>{c.line!(x)}</small>{(x.note || x.decision_reason) && <><br /><small>Note: {x.note || x.decision_reason}</small></>}</span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{s.role === 'admin' && <span className={'tag ' + (x.registry_hit ? 'y' : '')}>{x.registry_hit ? 'Registry match' : 'Registry clear'}</span>}
        {x.status === 'pending' ? <button className="btn s" onClick={() => setOpen(x)}>Review</button> : <span className={'tag ' + (x.status === 'approved' ? '' : 'y')}>{pretty(x.status)}</span>}</span></div>;
  };
  return (
    <div className="pg"><Banner title={`Welcome, ${c.n}`} sub={open ? c.rsub! : c.sub} meta={[['Role:', c.n], ['Access:', 'role-based']]} />
      <div className="g3">{stats(s.role, rows, pending).map(([l, v], i) => <div key={l} className={'c ' + ['pk', 'lv', 'mn'][i]}><small>{l}</small><b>{v}</b></div>)}</div>
      {open ? <Review x={open} role={s.role} c={c} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load(); }} /> : <div className="sq"><div className="sh">{c.h}</div>{err && <p className="er">{err}</p>}
        {rows.map(row)}{!rows.length && <div className="c">Nothing in the queue.</div>}</div>}</div>
  );
}
