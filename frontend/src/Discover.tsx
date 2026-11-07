import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from './api';

const UWC: [number, number] = [-33.9328, 18.6288];
const Rr = (n: number) => 'R' + n.toLocaleString('en-ZA');
const AM: [string, string][] = [['wifi', 'Wi-Fi'], ['furnished', 'Furnished'], ['laundry', 'Laundry'], ['cleaning', 'Cleaning'], ['parking', 'Parking'], ['security', 'Security'], ['study', 'Study areas']];
const F0 = { q: '', min_price: '', max_price: '', max_km: '10', min_rating: '', room_type: [] as string[], amenities: [] as string[] };
const tog = (a: string[], v: string) => (a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
const yn = (v: boolean) => (v ? 'Yes' : 'No');
// listing fields are user-controlled, so escape anything that goes into an HTML string
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const tag = (a: string) => `<span class="tag ${a === 'Available' ? '' : 'y'}">${esc(a)}</span>`;
const ico = (h: boolean) => L.divIcon({ className: '', html: `<div class="pin ${h ? 'hl' : ''}"></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
const chips = (x: any) => ([['wifi', 'Wi-Fi'], ['furnished', 'Furnished'], ['laundry', 'Laundry'], ['cleaning', 'Cleaning'], ['parking', 'Parking'], ['study', 'Study area'], ['recreation', 'Recreation']] as [string, string][]).filter(([k]) => x[k]).map(([, l]) => l).concat(x.security.length ? ['Security'] : []).map(l => `<span>${esc(l)}</span>`).join('');
const pop = (x: any, inCmp: boolean) => `<div class="pop"><h4>${esc(x.title)}</h4><small>${esc(x.area)} &middot; ${esc(x.prop_type)}</small><div style="margin:6px 0"><b class="mono">${Rr(x.rent)}</b> / month ${tag(x.availability)}</div>
<small>${esc(x.distance_km)} km from UWC (straight line)<br>Rooms: ${esc(x.rooms.join(', '))}<br>Wi-Fi: ${yn(x.wifi)} &middot; Security: ${esc(x.security.join(', ') || 'None listed')} &middot; Cleaning: ${yn(x.cleaning)}<br>&#9733; ${esc(x.rating)} (${esc(x.reviews)} reviews)</small><div class="chips">${chips(x)}</div>
<div class="r2" style="margin-top:8px"><button class="btn p s" data-act="details" data-id="${x.id}">View details</button><button class="btn s" data-act="cmp" data-id="${x.id}">${inCmp ? 'Remove' : 'Add to compare'}</button></div></div>`;

export default function Discover() {
  const [f, setF] = useState(F0);
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [cmp, setCmp] = useState<number[]>([]);
  const [table, setTable] = useState<any[] | null>(null);
  const [fo, setFo] = useState(true);
  const [msg, setMsg] = useState('');
  const [sug, setSug] = useState(false);
  const [total, setTotal] = useState(0);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const grp = useRef<L.LayerGroup | null>(null);
  const mk = useRef<Map<number, L.Marker>>(new Map());
  const names = useRef<Record<number, string>>({});
  const H = useRef<{ rows: any[]; pick: (x: any) => void; toggle: (id: number) => void }>({ rows: [], pick: () => {}, toggle: () => {} });
  const set = (p: Partial<typeof F0>) => { setView('list'); setMsg(''); setF({ ...f, ...p }); };

  useEffect(() => { // fetch listings; ignore stale / out-of-order responses
    let dead = false;
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { const s = Array.isArray(v) ? v.join(',') : v; if (s) p.set(k, s); });
    api('/listings/?' + p).then(r => { if (dead) return; r.forEach((x: any) => { names.current[x.id] = x.title; }); setRows(r); }).catch(e => { if (!dead) setMsg(e.message); });
    return () => { dead = true; };
  }, [f]);

  useEffect(() => { api('/listings/').then(l => setTotal(l.length)).catch(() => {}); }, []);
  useEffect(() => { // close suggestions when clicking outside the search box
    const h = (e: Event) => { if (!(e.target as HTMLElement).closest('.sb')) setSug(false); };
    document.addEventListener('click', h); return () => document.removeEventListener('click', h);
  }, []);

  useEffect(() => { // create map once
    if (!el.current) return;
    const m = L.map(el.current).setView(UWC, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    L.marker(UWC, { icon: L.divIcon({ className: '', html: '<div class="uwc">UWC campus</div>', iconAnchor: [40, 12] }), zIndexOffset: 1000 }).addTo(m).bindTooltip('University of the Western Cape (reference point)');
    grp.current = L.layerGroup().addTo(m); map.current = m;
    const t = setTimeout(() => m.invalidateSize(), 250);
    return () => { clearTimeout(t); m.remove(); map.current = null; grp.current = null; mk.current.clear(); };
  }, []);

  useEffect(() => { // rebuild markers ONLY when the result set changes
    const g = grp.current; if (!g) return;
    g.clearLayers(); mk.current.clear();
    rows.forEach(x => {
      const m = L.marker([x.lat, x.lng], { icon: ico(false) }).addTo(g).bindPopup(pop(x, false));
      m.on('click', () => setSel(x));
      m.on('popupopen', ev => { // Leaflet stops click bubbling out of popups, so listen on the popup itself
        const pe = ev.popup.getElement(); if (!pe) return;
        pe.onclick = e => {
          const a = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null; if (!a) return;
          const r = H.current.rows.find(r => r.id === +a.dataset.id!); if (!r) return;
          if (a.dataset.act === 'details') H.current.pick(r); else H.current.toggle(r.id);
        };
      });
      mk.current.set(x.id, m);
    });
  }, [rows]);
  useEffect(() => { mk.current.forEach((m, id) => m.setIcon(ico(id === sel?.id))); }, [sel, rows]); // highlight without closing popups
  useEffect(() => { rows.forEach(x => mk.current.get(x.id)?.setPopupContent(pop(x, cmp.includes(x.id)))); }, [rows, cmp]);
  useEffect(() => { // fit all visible markers whenever the result set changes
    if (map.current && rows.length) map.current.fitBounds([UWC, ...rows.map(x => [x.lat, x.lng] as [number, number])], { padding: [40, 40], maxZoom: 15 });
  }, [rows]);

  const pick = (x: any) => { setSel(x); setView('details'); setSug(false); map.current?.closePopup(); }; // popup "View details"
  const openRow = (x: any) => { setSel(x); setView('list'); setSug(false); map.current?.flyTo([x.lat, x.lng], 16); setTimeout(() => mk.current.get(x.id)?.openPopup(), 600); }; // list / suggestion click, as in the demo
  const toggleCmp = (id: number) => { setMsg(''); if (cmp.includes(id)) setCmp(cmp.filter(i => i !== id)); else if (cmp.length < 3) setCmp([...cmp, id]); else alert('You can compare up to 3 properties.'); };
  H.current = { rows, pick, toggle: toggleCmp };
  const apply = async (id: number) => { try { await api('/applications/', { body: { listing: id } }); setMsg('Application submitted.'); } catch (e: any) { setMsg(e.message); } };
  const openCmp = () => api('/listings/compare/?ids=' + cmp.join(',')).then(setTable).catch(e => setMsg(e.message));
  const sugg = f.q ? rows.slice(0, 6) : [];
  const o = sel && `https://www.openstreetmap.org/directions?route=${UWC[0]}%2C${UWC[1]}%3B${sel.lat}%2C${sel.lng}`;
  const CR: [string, (x: any) => string, 'low' | 'high' | '', (x: any) => number][] = [['Monthly rent', x => Rr(x.rent), 'low', x => x.rent], ['Distance from UWC', x => x.distance_km + ' km', 'low', x => x.distance_km],
    ['Rating', x => '\u2605 ' + x.rating + ' (' + x.reviews + ')', 'high', x => x.rating], ['Room types', x => x.rooms.join(', '), '', () => 0], ['Availability', x => x.availability, '', () => 0],
    ['Wi-Fi', x => yn(x.wifi), '', () => 0], ['Furnished', x => yn(x.furnished), '', () => 0], ['Security', x => x.security.join(', ') || 'None listed', '', () => 0], ['Cleaning', x => yn(x.cleaning), '', () => 0], ['Parking', x => yn(x.parking), '', () => 0]];

  return (
    <div className="pg dx">
      <div className="dxh">
        <div className="sb">
          <input placeholder="Search by name, e.g. Park Central" value={f.q} autoComplete="off" onChange={e => { set({ q: e.target.value }); setSug(true); }} />
          <button className="x" title="Clear search" onClick={() => { set({ q: '' }); setSug(false); }}>&times;</button>
          {sug && sugg.length > 0 && <div id="dsug" style={{ display: 'block' }}>{sugg.map(x => <div key={x.id} onClick={() => openRow(x)}>{x.title} <small>{x.area}</small></div>)}</div>}
        </div>
        <button className="btn s" onClick={() => setFo(!fo)}>Filters</button>
      </div>
      {msg && <p className="er">{msg}</p>}
      <div className={'c ' + (fo ? '' : 'hide')} id="dfil">
        <div className="fg">
          <div><b>Rent (R)</b><div className="r2"><input type="number" placeholder="Min" min="0" step="100" value={f.min_price} onChange={e => set({ min_price: e.target.value })} /><input type="number" placeholder="Max" min="0" step="100" value={f.max_price} onChange={e => set({ max_price: e.target.value })} /></div></div>
          <div><b>Max distance: {f.max_km} km</b><input type="range" min="1" max="10" step="0.5" value={f.max_km} onChange={e => set({ max_km: e.target.value })} /><small>Straight line from UWC</small></div>
          <div><b>Room type</b>{['single', 'shared', 'bachelor'].map(t => <label key={t}><input type="checkbox" checked={f.room_type.includes(t)} onChange={() => set({ room_type: tog(f.room_type, t) })} />{t[0].toUpperCase() + t.slice(1)}</label>)}</div>
          <div><b>Rating</b><select value={f.min_rating} onChange={e => set({ min_rating: e.target.value })}><option value="">Any</option><option value="3">3 stars and above</option><option value="4">4 stars and above</option><option value="4.5">4.5 stars and above</option></select></div>
          <div className="am"><b>Amenities</b>{AM.map(([k, l]) => <label key={k}><input type="checkbox" checked={f.amenities.includes(k)} onChange={() => set({ amenities: tog(f.amenities, k) })} />{l}</label>)}</div>
        </div>
        <div className="r2" style={{ marginTop: 8 }}><button className="btn p s" onClick={() => setFo(window.innerWidth > 700)}>Apply filters</button><button className="btn s" onClick={() => { setF(F0); setView('list'); setMsg(''); }}>Clear all</button></div>
      </div>
      <div className="dxm">
        <div id="dmapw"><div id="dmap" ref={el} />
          {cmp.length > 0 && <div id="dtray" style={{ display: 'flex' }}><b>Compare ({cmp.length}/3)</b>{cmp.map(i => <span className="tag" key={i}>{names.current[i] ?? i} <a href="#" onClick={e => { e.preventDefault(); toggleCmp(i); }}>&times;</a></span>)}<span style={{ flex: 1 }} />{cmp.length > 1 ? <button className="btn p s" onClick={openCmp}>Compare side by side</button> : <small>Select at least 2</small>}</div>}
        </div>
        <div id="dres" className="c">
          {view === 'details' && sel ? <>
            <button className="btn s" onClick={() => setView('list')}>&larr; Back to results</button>
            <h3 style={{ margin: '10px 0 2px' }}>{sel.title}</h3><small>{sel.area} &middot; {sel.prop_type}</small>
            <div style={{ margin: '8px 0' }}><b className="mono" style={{ fontSize: 20 }}>{Rr(sel.rent)}</b> / month <span className={'tag ' + (sel.availability === 'Available' ? '' : 'y')}>{sel.availability}</span></div>
            <table><tbody>
              <tr><th>Distance</th><td>{sel.distance_km} km straight line from UWC<br /><a href={o + '&engine=fossgis_osrm_foot'} target="_blank" rel="noopener">Walking route</a> &middot; <a href={o + '&engine=fossgis_osrm_car'} target="_blank" rel="noopener">Driving route</a><br /><small>Road distances come from OpenStreetMap.</small></td></tr>
              <tr><th>Rooms</th><td>{sel.rooms.join(', ')}</td></tr><tr><th>Furnished</th><td>{yn(sel.furnished)}</td></tr><tr><th>Wi-Fi</th><td>{yn(sel.wifi)}</td></tr>
              <tr><th>Security</th><td>{sel.security.join(', ') || 'None listed'}</td></tr><tr><th>Cleaning</th><td>{yn(sel.cleaning)}</td></tr><tr><th>Laundry</th><td>{yn(sel.laundry)}</td></tr>
              <tr><th>Parking</th><td>{yn(sel.parking)}</td></tr><tr><th>Study areas</th><td>{yn(sel.study)}</td></tr><tr><th>Recreation</th><td>{yn(sel.recreation)}</td></tr><tr><th>Rating</th><td>&#9733; {sel.rating} from {sel.reviews} reviews</td></tr>
            </tbody></table>
            <div className="r2" style={{ marginTop: 10 }}><button className="btn p s" onClick={() => toggleCmp(sel.id)}>{cmp.includes(sel.id) ? 'Remove from compare' : 'Add to compare'}</button><button className="btn s" onClick={() => apply(sel.id)}>Apply</button></div>
          </> : <>
            <div className="cnt">{rows.length} of {total || rows.length} properties match</div>
            {rows.map(x => <div key={x.id} className={'it ' + (x.id === sel?.id ? 'sel' : '')} onClick={() => openRow(x)}><div className="row" style={{ border: 0, padding: 0 }}><b>{x.title}</b><span className="mono">{Rr(x.rent)}</span></div><small>&#9733; {x.rating} &middot; {x.distance_km} km &middot; {x.rooms.join('/')} &middot; <span className={'tag ' + (x.availability === 'Available' ? '' : 'y')}>{x.availability}</span></small></div>)}
            {!rows.length && <div className="empty"><b>No properties match</b><br />Try a wider budget or distance.<br /><button className="btn p s" style={{ marginTop: 8 }} onClick={() => setF(F0)}>Clear all filters</button></div>}
          </>}
        </div>
      </div>
      {table && createPortal(<div id="dmodal" style={{ display: 'flex' }} onClick={e => e.target === e.currentTarget && setTable(null)}><div className="box">
        <div className="row" style={{ border: 0 }}><h3 style={{ margin: 0 }}>Compare accommodation</h3><button className="btn s" onClick={() => setTable(null)}>Close</button></div>
        <small>Green = best value, yellow = differs.</small>
        <table><tbody><tr><th></th>{table.map(x => <th key={x.id}>{x.title}</th>)}</tr>
          {CR.map(([n, fn, d, key]) => { const v = table.map(fn), df = new Set(v).size > 1; let b = -1; if (d && df) { const k = table.map(key), t = d === 'low' ? Math.min(...k) : Math.max(...k); b = k.indexOf(t); }
            return <tr key={n}><th>{n}</th>{v.map((s, i) => <td key={i} className={i === b ? 'best' : df ? 'diff' : ''}>{s}</td>)}</tr>; })}
        </tbody></table></div></div>, document.body)}
    </div>
  );
}
