// Kiểm tra bền (soak test): chạy tự lái cả chuyến với sự kiện ngẫu nhiên, thời tiết xấu và sự cố chèn thêm, rồi rà các bất biến của thế giới.
// Khác tests/run.js: không có đáp án đúng cho từng tình huống, chỉ tìm những điều không bao giờ được xảy ra (xuyên tàu, đứng mãi, nhảy vị trí, ngoại lệ, NaN...).
// Cách dùng: node tests/soak.js [--lines=aki,yam] [--n=2] [--seeds=1] [--diff=hard] [--step=5] [--json=đường_dẫn]
const path = require('path');
const DRIVE = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global;
global.localStorage = (() => { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
require(path.join(DRIVE, 'data-lines.js')); require(path.join(DRIVE, 'i18n.js'));
const Sim = require(path.join(DRIVE, 'sim.js')); global.Sim = Sim; require(path.join(DRIVE, 'natcat.js')); require(path.join(DRIVE, 'layout.js')); require(path.join(DRIVE, 'store.js'));
const NC = global.NatCat, LN = global.LINES;
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const LINES = (arg('lines', Object.keys(LN).join(',')) || '').split(',').filter(x => LN[x]), PER = +arg('n', 2), SEEDS = +arg('seeds', 1), DIFF = arg('diff', 'hard'), STEP = +arg('step', 5), JSONP = arg('json', '');
const TRACE2 = +arg('trace2', 0), TRACE = +arg('trace', 0), ONLYTAG = arg('tag', ''), ONLYSEED = +arg('seed', 0), WEATHER = ['rain', 'snow', 'typhoon', undefined], DT = 0.05, finite = x => typeof x === 'number' && isFinite(x);
const ALL = [];      // mọi vấn đề phát hiện được

function runOne(lineId, rec, seed, wx, tag) {
  const L = Sim.lineOf(lineId), st = rec.s.filter(e => !e[3]).map(e => e[0]); if (st.length < 2) return null;
  const issues = [], seen = new Map(), note = (type, key, info, W) => { const k = type + '|' + key; if (seen.has(k)) return; seen.set(k, 1); if (issues.filter(i => i.type === type).length < 4) issues.push({ type, tag, seed, wx: wx || '-', t: W ? Math.round(W.t) : null, info }); };
  let W, T, trip;
  try {
    trip = Sim.makeTrip(lineId, rec, st[0], st[st.length - 1]);
    W = Sim.createWorld(lineId, trip, { diff: DIFF, seed, weather: wx, lead: true, events: true }); T = W.player;
  } catch (e) { return { tag, seed, wx, issues: [{ type: 'ngoại lệ khi dựng thế giới', tag, seed, wx: wx || '-', info: String(e.stack || e).split('\n').slice(0, 4).join(' | ') }], finished: false, simT: 0, wall: 0 }; }
  const planned = (trip.M[trip.M.length - 1].arr || 0) - (trip.M[0].dep || 0), limit = Math.max(3600, planned * 1.6 + 7200), sg = W.dir === 'down' ? 1 : -1, S = L.stations, cat = NC.build(LN), H0 = () => W.haz;
  const single = i => !!(L.single && i >= 0 && i < S.length - 1 && L.single.some(([a, b]) => Math.min(S[i + 1].km, b) - Math.max(S[i].km, a) > 0.05));
  const segOf = km => { for (let i = 0; i < S.length - 1; i++) if (km >= S[i].km - 1e-4 && km <= S[i + 1].km + 1e-4) return i; return -1; };
  const byRec = new Map(cat.map(c => [c.rec, c])), cur = new Map(), prevK = new Map(), pord = new Map(), holdT = new Map(); let lastSamp = -1, stuckRun = 0, stuckDw = 0, lastX = T.x, injDone = 0, wall0 = Date.now(), n = 0, ownKey = null;
  const injAt = [0.25 + 0.1 * ((seed * 37) % 5), 0.6 + 0.05 * ((seed * 11) % 5)].map(f => f * planned), injKinds = ['eqk', 'hold'];
  try {
    while (!T.finished && W.t < limit) {
      Sim.tick(W, DT, {}, true); n++;
      if (injDone < injAt.length && W.t > injAt[injDone] && T.phase !== 'dwell') { try { const k = injKinds[(injDone + seed) % 2]; if (k === 'eqk') Sim.inject(W, 'eqk', { sec: 240 }); else Sim.inject(W, 'hold', { sec: 600 }); } catch (e) { note('ngoại lệ khi chèn sự cố', 'inj', String(e.stack || e).split('\n').slice(0, 3).join(' | '), W); } injDone++; }
      // --- người chơi (tàu tự lái): trạng thái số hợp lệ, không lùi, không đứng mãi
      if (!finite(T.x) || !finite(T.v) || !finite(W.t)) { note('NaN/vô hạn ở tàu ta', 'nan', `x=${T.x} v=${T.v}`, W); break; }
      if (T.collision) { note('va chạm', 'col', `x=${T.x.toFixed(0)} v=${(T.v * 3.6).toFixed(0)}km/h lead: ${W.lead ? `x=${W.lead.x.toFixed(0)} v=${(W.lead.v * 3.6).toFixed(0)} phase=${W.lead.phase} k=${W.lead.k} ${W.leadLabel}` : '-'} obs=${W.obs ? JSON.stringify({ x: Math.round(W.obs.x), v: Math.round(W.obs.v * 3.6), dw: W.obs.dw, label: W.obs.label }) : '-'} atc=${T.atcCount} phase=${T.phase} cut=${T.cut} eqk=${W.eqkActive}`, W); break; }
      if (T.x < lastX - 0.5 && T.phase === 'run') note('tàu ta lùi', 'back', `x ${lastX.toFixed(1)} → ${T.x.toFixed(1)}`, W); lastX = T.x;
      if (T.phase === 'run' && T.v < 0.1) { stuckRun += DT; if (stuckRun > 2400) note('đứng giữa đường quá 40 phút', 'stuck' + T.k, `km=${Sim.kmOfS(T.x, W.dir, W.line.kmEnd).toFixed(1)} k=${T.k} obs=${W.obsLabel || '-'} holds=${JSON.stringify(T.holds).slice(0, 80)}`, W); } else stuckRun = 0;
      if (T.phase === 'dwell') { stuckDw += DT; if (stuckDw > 3600) note('đỗ ở ga quá 60 phút', 'dw' + T.k, `ga=${T.M[T.k] && T.M[T.k].name} cp=${T.cp ? T.cp.kind + (T.cp.done ? '+' : '-') : '-'} | lý do giữ: ${(Sim.departBlock && Sim.departBlock(T)) || '-'} | holds=${JSON.stringify(T.holds).slice(0, 120)} zones=${(W.zones || []).filter(z => z.kind !== 'snow').map(z => z.kind + (z.hold ? '+hold' : '')).slice(0, 6).join(',')} dep=${T.M[T.k] && T.M[T.k].dep} t=${Math.round(W.t)} dwellT=${Math.round(T.dwellT || 0)}`, W); } else stuckDw = 0;
      if (TRACE && W.t > TRACE && n % Math.round(1 / DT) === 0 && W.lead) console.log(`  trace t=${W.t.toFixed(0)} ta: x=${T.x.toFixed(0)} v=${(T.v * 3.6).toFixed(0)} ${T.phase} k=${T.k} why=${W.obsLabel || ''} | lead: x=${W.lead.x.toFixed(0)} v=${(W.lead.v * 3.6).toFixed(0)} ${W.lead.phase} k=${W.lead.k} len=${W.lead.veh.len} | gap=${(W.lead.x - W.lead.veh.len - T.x).toFixed(0)} obs=${W.obs ? Math.round(W.obs.x - T.x) : '-'}`);
      if (TRACE2 && W.t > TRACE2 && W.t < TRACE2 + 200 && n % Math.round(2 / DT) === 0) { const H = W.haz, so = H && H.segOwner && H.segOwner[lineId], fm = o => o ? [...o.entries()].map(([k, v]) => k + ':' + (v.label || '?')).join(',') : '-'; const nj = Sim.nextTarget(T), nm = T.M[nj]; console.log(`  tr2 t=${W.t.toFixed(0)} nt=${nm && nm.name} stop=${nm && nm.stop} sdisp=${nm && nm.sdisp} pt=${nm && nm.pt} d=${nm ? Math.round(nm.s - T.x) : '-'} j=${nj}/${T.M.length - 1} i=${nm && nm.i} ta km=${Sim.kmOfS(T.x, W.dir, W.line.kmEnd).toFixed(2)} v=${(T.v * 3.6).toFixed(0)} ${T.phase} k=${T.k} dep=${(Sim.departBlock && T.phase === 'dwell' ? Sim.departBlock(T) : '') || ''} | owner up[${so ? fm(so.up) : '-'}] down[${so ? fm(so.down) : '-'}] claim=${H && H.claim ? JSON.stringify(H.claim[lineId] || {}) : '-'} intent=${H && H.intent ? JSON.stringify(H.intent) : '-'}`); }
      if (n % Math.round(STEP / DT)) continue;
      // --- lấy mẫu toàn mạng mỗi STEP giây
      const H = H0(), now = W.trip.t0 + W.t; if (!H) continue; const rows = [], kmP = Sim.kmOfS(T.x, W.dir, W.line.kmEnd);
      const jg = T.cp && T.cp.kind === 'join' && !T.cp.done ? Sim.joinGate(T) : null; if (jg && T.x > jg.sIn + 3) note('tàu nhánh vào đoạn ghi nối khi đoàn Tohoku chưa về ga', 'gate', `x=${T.x.toFixed(0)} sIn=${jg.sIn.toFixed(0)} ${jg.js.label}`, W);
      for (const c of cat) {
        const d = H.delay.get(c.key), eff = now - (d ? d.delay : 0); if (eff < c.t0 || eff > c.t1) { prevK.delete(c.key); continue; }
        if (d) { if (!finite(d.delay) || !finite(d.hold)) note('NaN ở độ trễ danh mục', 'dn' + c.key, `${c.key} delay=${d.delay} hold=${d.hold}`, W); else { if (d.delay > 14400) note('trễ trên 4 giờ', 'bigd' + c.key, `${c.key} delay=${Math.round(d.delay)} why=${d.why}`, W); if (d.delay < -300) note('độ trễ âm sâu', 'negd' + c.key, `${c.key} delay=${Math.round(d.delay)}`, W);
            if (d.hold > 0) { const h = holdT.get(c.key) || { t: now, why: d.why }; holdT.set(c.key, h); if (now - h.t > 3600) note('tàu danh mục bị giữ liên tục quá 60 phút', 'hold' + c.key, `${c.key} why=${d.why}`, W); } else holdT.delete(c.key); } }
        const s = NC.stateOf(LN, c, eff, d && d.skip); if (!s) { prevK.delete(c.key); continue; } if (!finite(s.km)) { note('vị trí danh mục không hợp lệ', 'pos' + c.key, c.key, W); continue; }
        const dir = c.rec.d === 'down' ? 1 : -1, ka = dir * s.km, pk = prevK.get(c.key);
        if (pk && pk.t === lastSamp) { if (ka < pk.k - 0.1) note('tàu danh mục lùi vị trí', 'bk' + c.key, `${c.key} ${pk.k.toFixed(2)} → ${ka.toFixed(2)} (tại ${Sim.labelAt(c.rec, s.km)}) why=${d && d.why} hold=${d && d.hold} | trước: delay=${Math.round(pk.dl)} hold=${Math.round(pk.hd)} skip=[${pk.sk}] ${pk.st} k=${pk.kk} | sau: delay=${d ? Math.round(d.delay) : 0} skip=[${d && d.skip ? Array.from(d.skip) : ''}] ${s.dwell ? 'đỗ' : 'chạy'} k=${s.k}`, W); else if (ka > pk.k + STEP * 0.12) note('tàu danh mục nhảy vị trí', 'jp' + c.key, `${c.key} ${pk.k.toFixed(2)} → ${ka.toFixed(2)} trong ${STEP}s (tại ${Sim.labelAt(c.rec, s.km)}) why=${d && d.why} | trước: delay=${Math.round(pk.dl)} hold=${Math.round(pk.hd)} skip=[${pk.sk}] ${pk.st} k=${pk.kk} | sau: delay=${d ? Math.round(d.delay) : 0} hold=${d ? Math.round(d.hold) : 0} skip=[${d && d.skip ? Array.from(d.skip) : ''}] ${s.dwell ? 'đỗ' : 'chạy'} k=${s.k}`, W); }
        cur.set(c.key, { s, c, d });
        prevK.set(c.key, { k: ka, t: now, dl: d ? d.delay : 0, hd: d ? d.hold : 0, sk: d && d.skip ? Array.from(d.skip).join(',') : '', st: s.dwell ? 'đỗ' : s.moving ? 'chạy' : '?', kk: s.k });
        if (c.rec === W.trip.rec) { ownKey = c.key; continue; }
        if (Sim.dupHidden(c.rec, s.km)) continue;      /* bản sao mini đang chạy chung với Tohoku: game không vẽ, chỉ vẽ đoàn Tohoku */
        if (W.leadRef && c.rec.t === W.leadRef.t && c.rec.n === W.leadRef.n && c.rec.d === W.leadRef.d) continue;      /* bản sao của tàu đi trước thật: vị trí do alignLead ép khớp, không xét */
        const rf = NC.refOf(LN, c.line, s.km); if (!rf) continue;
        rows.push({ key: c.key, cid: c.cid, rec: c.rec, km: s.km, g: rf.g + '|' + c.rec.d, k: rf.k, dir, dw: !!s.dwell, loop: !!(s.dwell && NC.canPass(LN, c.line, s.idx, c.rec.d)), line: c.line });
      }
      for (const [key, A] of cur) { const ci = Sim.coupleOf(A.c.rec); if (!ci || ci.role !== 'toh') continue; const Bc = byRec.get(ci.partner), B = Bc && cur.get(Bc.key); if (!B) continue; const kt = A.s.km, sp = ci.splitKm, shared = kt < sp - 2;      /* đoạn chạy chung nằm phía nam ga ghép (km nhỏ hơn) với cả hai chiều */ if (!shared) continue; const dist = NC.hav(A.s.lat, A.s.lon, B.s.lat, B.s.lon);
        if (dist > 1.5) note('hai đoàn của đoàn ghép lệch nhau trên đoạn chạy chung', 'cpl' + key, `${Sim.labelAt(A.c.rec, A.s.km)}: cách ${dist.toFixed(1)} km, delay ${Math.round(A.d ? A.d.delay : 0)} vs ${Math.round(B.d ? B.d.delay : 0)}, hold ${Math.round(A.d ? A.d.hold : 0)} vs ${Math.round(B.d ? B.d.hold : 0)} why=${A.d && A.d.why}/${B.d && B.d.why} ${A.s.dwell ? 'đỗ' : 'chạy'}/${B.s.dwell ? 'đỗ' : 'chạy'}`, W); }
      cur.clear();
      { const rf = NC.refOf(LN, lineId, kmP); if (rf) rows.push({ key: '#me', cid: W.pcid, rec: trip.rec, km: kmP, g: rf.g + '|' + W.dir, k: rf.k, dir: sg, dw: T.phase === 'dwell', loop: T.phase === 'dwell' && NC.canPass(LN, lineId, T.M[Math.min(T.k, T.M.length - 1)].i, W.dir), line: lineId, me: true }); }
      // thứ tự giữa hai tàu cùng chiều cùng đường: đổi chỗ nhau khi không ai đỗ ở ga có đường tránh = tàu đi xuyên nhau
      const grp = new Map(); for (const r of rows) (grp.get(r.g) || grp.set(r.g, []).get(r.g)).push(r);
      for (const arr of grp.values()) { arr.sort((a, b) => a.dir * (a.k - b.k)); for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const a = arr[i], b = arr[j]; if (arr[0].dir * (b.k - a.k) > 20) break; if (a.cid && a.cid === b.cid) continue; const A = a.key < b.key ? a : b, B = A === a ? b : a, key = A.key + '~' + B.key, sgn = Math.sign(A.dir * (A.k - B.k)) || 0, pv = pord.get(key);
          if (pv && pv.t === lastSamp && pv.s !== 0 && sgn !== 0 && pv.s !== sgn && !pv.loop && !(a.dw && a.loop) && !(b.dw && b.loop) && !(a.dw || b.dw)) note(a.me || b.me ? 'tàu ta đi xuyên tàu danh mục' : 'hai tàu danh mục đi xuyên nhau', 'x' + key, `${Sim.labelAt(a.rec, a.km)} / ${Sim.labelAt(b.rec, b.km)} km ${(a.km).toFixed(1)} (${a.line}/${b.line}) | trước: ${A.key} k=${pv.ka.toFixed(2)} ${B.key} k=${pv.kb.toFixed(2)} | sau: ${A.key} k=${A.k.toFixed(2)} dw=${A.dw} ${B.key} k=${B.k.toFixed(2)} dw=${B.dw} | dir=${A.dir} delay ${(() => { const x = H.delay.get(A.key), y = H.delay.get(B.key); return (x ? Math.round(x.delay) + '/h' + Math.round(x.hold) : '-') + ' ' + (y ? Math.round(y.delay) + '/h' + Math.round(y.hold) : '-'); })()}`, W);
          pord.set(key, { s: sgn || (pv ? pv.s : 0), t: now, loop: (a.dw && a.loop) || (b.dw && b.loop), ka: A.k, kb: B.k }); } }
      for (const [k, v] of pord) if (v.t < now - 3 * STEP) pord.delete(k);
      // đường đơn: tàu ta và tàu danh mục ngược chiều cùng ở trong một đoạn đường đơn
      { const i = segOf(kmP); if (i >= 0 && single(i) && kmP > S[i].km + 0.02 && kmP < S[i + 1].km - 0.02 && T.phase !== 'dwell') for (const r of rows) { if (r.me || r.line !== lineId || r.dir === sg || r.dw) continue; if (segOf(r.km) === i && r.km > S[i].km + 0.02 && r.km < S[i + 1].km - 0.02) note('đường đơn: tàu ta và tàu ngược chiều cùng đoạn', 's' + i + r.key, `${Sim.labelAt(r.rec, r.km)} đoạn ${S[i].jp || S[i].en}→${S[i + 1].jp || S[i + 1].en} | ta: km=${kmP.toFixed(2)} v=${(T.v * 3.6).toFixed(0)} ${T.phase} k=${T.k} | nó: km=${r.km.toFixed(2)} ${(() => { const dd = H.delay.get(r.key); return dd ? 'delay=' + Math.round(dd.delay) + ' hold=' + Math.round(dd.hold) + ' why=' + dd.why : ''; })()} | đoạn ${S[i].km}–${S[i + 1].km}`, W); } }
      lastSamp = now;
    }
  } catch (e) { note('ngoại lệ trong lúc chạy', 'ex', String(e.stack || e).split('\n').slice(0, 5).join(' | '), W); }
  if (!T.finished && !issues.some(i => i.type === 'va chạm' || i.type.startsWith('ngoại lệ') || i.type.startsWith('NaN'))) note('chuyến không hoàn thành trong thời hạn', 'unf', `W.t=${Math.round(W.t)} k=${T.k}/${T.M.length} km=${Sim.kmOfS(T.x, W.dir, W.line.kmEnd).toFixed(1)} limit=${Math.round(limit)}`, W);
  return { tag, seed, wx, issues, finished: !!T.finished, simT: Math.round(W.t), wall: (Date.now() - wall0) / 1000 };
}

const picks = [];
for (const ln of LINES) { const L = Sim.lineOf(ln); for (const dir of ['down', 'up']) {
  const recs = L.trains.filter(t => t.d === dir && t.s.filter(e => !e[3]).length >= 3); if (!recs.length) continue;
  const cp = recs.filter(t => Sim.coupleOf && Sim.coupleOf(t)), rest = recs.filter(t => !cp.includes(t)), sel = [];
  const pickEven = (a, k) => { for (let q = 0; q < k && q < a.length; q++) { const r = a[Math.min(a.length - 1, Math.floor((q + 0.5) * a.length / k))]; if (!sel.includes(r)) sel.push(r); } };
  if (cp.length) { pickEven(cp, Math.ceil(PER / 2)); pickEven(rest, PER - Math.ceil(PER / 2)); } else pickEven(rest, PER);
  for (const r of sel) picks.push({ ln, dir, rec: r }); } }
console.log(`Soak: ${picks.length} chuyến × ${SEEDS} hạt giống, độ khó ${DIFF}, bước lấy mẫu ${STEP}s`);
let nRun = 0;
for (const p of picks) for (let sd = 1; sd <= SEEDS; sd++) {
  const seed = sd * 7 + (p.rec.n | 0) % 5, wx = WEATHER[(nRun++ + sd) % WEATHER.length], tag = `${p.ln}/${p.dir}/${(Sim.labelAt ? Sim.labelAt(p.rec, Sim.lineOf(p.ln).stations[p.rec.s.find(e => !e[3])[0]].km) : p.rec.t + p.rec.n)}`;
  if ((ONLYTAG && !tag.includes(ONLYTAG)) || (ONLYSEED && seed !== ONLYSEED)) continue;
  const r = runOne(p.ln, p.rec, seed, wx, tag); if (!r) continue; for (const i of r.issues) ALL.push(i);
  console.log(`${r.issues.length ? '✗' : '✓'} ${tag} seed=${seed} wx=${wx || '-'} ${r.finished ? 'xong' : 'KHÔNG xong'} sim=${r.simT}s wall=${r.wall.toFixed(0)}s vấn đề=${r.issues.length}`);
  for (const i of r.issues) console.log(`    [${i.type}] t=${i.t}s ${i.info}`);
}
const byType = {}; for (const i of ALL) (byType[i.type] = byType[i.type] || []).push(i);
console.log('\n== Tổng kết: ' + ALL.length + ' vấn đề, ' + Object.keys(byType).length + ' loại');
for (const [t, a] of Object.entries(byType).sort((x, y) => y[1].length - x[1].length)) console.log(`  ${a.length} × ${t}  (ví dụ: ${a[0].tag} seed=${a[0].seed} t=${a[0].t}s)`);
if (JSONP) require('fs').writeFileSync(JSONP, JSON.stringify(ALL, null, 1));
