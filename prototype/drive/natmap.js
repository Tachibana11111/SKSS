// Bản đồ toàn quốc (phím D hoặc nút trên bản đồ nhỏ): nền 47 tỉnh (japanmap.js), 10 tuyến Shinkansen theo màu Wikipedia, ga theo toạ độ thật,
// mọi đoàn tàu chạy theo lịch thật (cùng danh mục tàu với giao diện lái: LINES[...].trains) và tàu của người chơi (vị trí thật từ mô phỏng).
// Đường giữa hai ga vẽ thẳng theo toạ độ ga [I] (không phải hình học đường ray thật). Chưa có thời tiết/thiên tai (giai đoạn 3).
(function (root) {
  // màu: Wikipedia, Module:Adjacent stations/JR_* (tra 28/10/2026) [N]; Nishi-Kyushu không có màu riêng nên lấy màu hệ thống JR Kyushu [I]
  const SEGS = [
    { key: 'tohoku', name: 'Tohoku', line: 'toh', a: 0, b: 22, col: '#41934c' }, { key: 'hokkaido', name: 'Hokkaido', line: 'toh', a: 22, b: 25, col: '#9ACD32' },
    { key: 'joetsu', name: 'Joetsu', line: 'jts', a: 2, b: 11, col: '#f58d79' }, { key: 'hokuriku', name: 'Hokuriku', line: 'hok', a: 5, b: 23, col: '#800080' },
    { key: 'yamagata', name: 'Yamagata', line: 'yam', a: 8, b: 18, col: '#f36221' }, { key: 'akita', name: 'Akita', line: 'aki', a: 17, b: 22, col: '#ED4399' },
    { key: 'tokaido', name: 'Tokaido', line: 'tsk', a: 0, b: 16, col: '#1153af' }, { key: 'sanyo', name: "San'yo", line: 'tsk', a: 16, b: 34, col: '#24197c' },
    { key: 'kyushu', name: 'Kyushu', line: 'tsk', a: 34, b: 45, col: '#FF69B4' }, { key: 'nishikyushu', name: 'Nishi-Kyushu', line: 'nks', a: 0, b: 4, col: '#E50012' }];
  const SHARED = { jts: [[0, 2, 'tohoku']], hok: [[0, 2, 'tohoku'], [2, 5, 'joetsu']], yam: [[0, 8, 'tohoku']], aki: [[0, 17, 'tohoku']] };      // đoạn đi chung: lấy màu tuyến cha
  const MEDIUM = ['Omiya', 'Takasaki', 'Fukushima', 'Morioka', 'Shin-Osaka', 'Hakata', 'Shin-Aomori'];
  const KX = Math.cos(36.5 * Math.PI / 180), BYKEY = {}; for (const s of SEGS) BYKEY[s.key] = s;
  const V = { cx: 138.5, cy: 37.4, s: 44, light: false, sel: null, drag: null, rect: [0, 0, 1, 1], ready: false };
  let ST = null, CAT = null;

  function build() {
    const LN = root.LINES; if (!LN) return false;
    ST = {}; CAT = [];
    for (const sg of SEGS) { const L = LN[sg.line]; if (!L) continue; for (let i = sg.a; i <= sg.b && i < L.stations.length; i++) { const s = L.stations[i]; if (!ST[s.en]) ST[s.en] = { en: s.en, jp: s.jp, lat: s.lat, lon: s.lon, col: sg.col, big: s.en === 'Tokyo', mid: MEDIUM.includes(s.en) }; } }
    for (const id of Object.keys(LN)) for (const rec of LN[id].trains) {
      const stops = rec.s.filter(e => !e[3]).map(e => ({ i: e[0], arr: e[1], dep: e[2] })); if (stops.length < 2) continue;
      const ta = p => p.arr != null ? p.arr : p.dep, td = p => p.dep != null ? p.dep : p.arr;
      CAT.push({ line: id, rec, stops, ta, td, t0: td(stops[0]) - 10, t1: ta(stops[stops.length - 1]) + 10 });
    }
    return true;
  }
  const colAt = (line, i) => { for (const [a, b, k] of SHARED[line] || []) if (i >= a && i < b) return BYKEY[k].col; for (const sg of SEGS) if (sg.line === line && i >= sg.a && i <= sg.b) return sg.col; return '#9fb3c8'; };
  const wx = lon => lon * KX, P = (lon, lat, r) => [r[0] + r[2] / 2 + (wx(lon) - wx(V.cx)) * V.s, r[1] + r[3] / 2 + (V.cy - lat) * V.s];
  const hhmm = t => { t = Math.round(t); const h = Math.floor(t / 3600) % 24, m = Math.floor(t % 3600 / 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
  // vị trí theo km trên một tuyến: nội suy giữa hai ga kề nhau (km tăng dần theo chỉ số ga)
  function atKm(L, km) {
    const S = L.stations; let j = 0; while (j < S.length - 2 && S[j + 1].km < km) j++;
    const a = S[j], b = S[j + 1], f = Math.max(0, Math.min(1, (km - a.km) / ((b.km - a.km) || 1)));
    return { lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f, dx: (b.lon - a.lon) * KX, dy: -(b.lat - a.lat), idx: f < 0.5 ? j : j + 1 };
  }
  // trạng thái một đoàn theo lịch tại giờ `now`: null nếu chưa hiện / đã biến mất (hiện sớm và biến mất muộn 10 s)
  function stateOf(c, now) {
    if (now < c.t0 || now > c.t1) return null; const L = root.LINES[c.line], S = c.stops, K = i => L.stations[i].km;
    const pos = (i) => { const s = L.stations[i]; return { lon: s.lon, lat: s.lat, idx: i }; };
    for (let k = 0; k < S.length; k++) {
      const p = S[k], q = S[k + 1];
      if (now >= c.ta(p) - (k === 0 ? 10 : 0) && now <= c.td(p) + (k === S.length - 1 ? 10 : 0)) { const nb = q || S[k - 1], d = L.stations[nb.i]; return Object.assign(pos(p.i), { dwell: k === 0 ? 'wait' : k === S.length - 1 ? 'end' : 'stop', k, dx: (d.lon - L.stations[p.i].lon) * KX * (q ? 1 : -1), dy: -(d.lat - L.stations[p.i].lat) * (q ? 1 : -1), km: K(p.i) }); }
      if (q && now > c.td(p) && now < c.ta(q)) { const f = (now - c.td(p)) / ((c.ta(q) - c.td(p)) || 1), km = K(p.i) + (K(q.i) - K(p.i)) * f, a = atKm(L, km), sg = Math.sign(K(q.i) - K(p.i)) || 1; return { lon: a.lon, lat: a.lat, idx: a.idx, dx: a.dx * sg, dy: a.dy * sg, k, km, moving: true, kmh: Math.abs(K(q.i) - K(p.i)) / ((c.ta(q) - c.td(p)) / 3600) }; }
    }
    return null;
  }
  function gather(W, T) {
    const now = W.trip.t0 + W.t, out = [], me = W.trip.rec;
    for (const c of CAT) { if (c.rec === me || (c.line === W.lineId && me && c.rec.t === me.t && c.rec.n === me.n && c.rec.d === me.d)) continue; const s = stateOf(c, now); if (s) out.push({ c, s, col: colAt(c.line, s.idx), label: c.rec.t + ' ' + c.rec.n }); }
    const L = root.LINES[W.lineId]; if (L && T) { const km = root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd), a = atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km))), sg = W.dir === 'down' ? 1 : -1;
      out.push({ me: true, s: { lon: a.lon, lat: a.lat, idx: a.idx, dx: a.dx * sg, dy: a.dy * sg, moving: T.v > 0.5, kmh: T.v * 3.6, km }, col: colAt(W.lineId, a.idx), label: (W.trip.label || 'Tàu của bạn'), line: W.lineId }); }
    return out;
  }
  function stationRows(en, W) {
    const now = W.trip.t0 + W.t, rows = [];
    for (const c of CAT) {
      const L = root.LINES[c.line], j = L.stations.findIndex(s => s.en === en); if (j < 0) continue; const km = L.stations[j].km, S = c.stops; let ev = null;
      for (let k = 0; k < S.length && !ev; k++) {
        if (S[k].i === j) ev = { stop: true, arr: c.ta(S[k]), dep: c.td(S[k]), first: k === 0, last: k === S.length - 1 };
        else if (k < S.length - 1) { const k0 = L.stations[S[k].i].km, k1 = L.stations[S[k + 1].i].km; if (km > Math.min(k0, k1) && km < Math.max(k0, k1)) { const f = (km - k0) / (k1 - k0), t = c.td(S[k]) + (c.ta(S[k + 1]) - c.td(S[k])) * f; ev = { stop: false, arr: t, dep: t }; } }
      }
      if (!ev || now < ev.arr - 1800 || now > ev.dep + 300) continue;
      const stt = !ev.stop ? 'thông qua ' + hhmm(ev.arr) : now < ev.arr ? (ev.first ? 'chờ xuất phát ' + hhmm(ev.dep) : 'sắp tới, ETA ' + hhmm(ev.arr)) : now <= ev.dep ? (ev.last ? 'vừa đến, đang đỗ' : 'đang đỗ, đi ' + hhmm(ev.dep)) : 'vừa rời ' + hhmm(ev.dep);
      rows.push([ev.arr, c.rec.t + ' ' + c.rec.n + ' · ' + stt, colAt(c.line, j)]);
    }
    rows.sort((x, y) => x[0] - y[0]); return rows;
  }

  function draw(ctx, x, y, w, h, W, T, o) {
    if (!ST && !build()) { ctx.fillStyle = '#0b0f14'; ctx.fillRect(x, y, w, h); return; }
    const r = V.rect = [x, y, w, h], dk = !V.light, txt = o.txt, btn = o.button;
    if (!V.fit) { V.fit = true; V.s = h / 15.5; V.cx = 137.6; V.cy = 38.0; }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = dk ? '#0d1a28' : '#cfe3f3'; ctx.fillRect(x, y, w, h);
    const M = root.JPMAP; if (M) {
      ctx.beginPath(); for (const p of M) for (const ring of p.r) { for (let i = 0; i < ring.length; i += 2) { const q = P(ring[i] / 1000, ring[i + 1] / 1000, r); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.closePath(); }
      ctx.fillStyle = dk ? '#1c2b3b' : '#f3f0e6'; ctx.fill('evenodd'); ctx.strokeStyle = dk ? '#2c3f54' : '#c9c4b4'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    const z = Math.min(1.8, Math.max(0.8, Math.sqrt(V.s / 44)));
    for (const sg of SEGS) { const L = root.LINES[sg.line]; if (!L) continue; ctx.beginPath(); for (let i = sg.a; i <= sg.b && i < L.stations.length; i++) { const q = P(L.stations[i].lon, L.stations[i].lat, r); i === sg.a ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = dk ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.4)'; ctx.lineWidth = 5.4 * z; ctx.stroke(); ctx.strokeStyle = sg.col; ctx.lineWidth = 3.2 * z; ctx.stroke(); }
    // ga: Tokyo to (pha màu cả 10 tuyến), ga rẽ nhánh/đổi tuyến vừa, còn lại nhỏ
    const names = Object.keys(ST), lab = V.s > 120;
    for (const en of names) { const s = ST[en], q = P(s.lon, s.lat, r); if (q[0] < x - 20 || q[0] > x + w + 20 || q[1] < y - 20 || q[1] > y + h + 20) continue;
      const rad = (s.big ? 8 : s.mid ? 5.2 : 3.2) * z;
      if (s.big) { const n = SEGS.length; for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.arc(q[0], q[1], rad, k / n * 6.2832 - 1.5708, (k + 1) / n * 6.2832 - 1.5708); ctx.closePath(); ctx.fillStyle = SEGS[k].col; ctx.fill(); } ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 7); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 7); ctx.fillStyle = s.col; ctx.fill(); ctx.strokeStyle = dk ? '#fff' : '#223'; ctx.lineWidth = 1.2; ctx.stroke(); }
      if (V.sel && V.sel.en === en) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(q[0], q[1], rad + 4, 0, 7); ctx.stroke(); }
      if (s.big || s.mid || lab || (V.sel && V.sel.en === en)) txt(s.en, q[0] + rad + 4, q[1] + 4, dk ? '#e8eef5' : '#1b2633', (s.big ? 'bold 13px' : '11px') + ' system-ui'); }
    // tàu: tam giác chỉ hướng
    const tr = gather(W, T), hits = []; V.trains = hits;
    for (const t of tr) { const q = P(t.s.lon, t.s.lat, r); if (q[0] < x - 20 || q[0] > x + w + 20 || q[1] < y - 20 || q[1] > y + h + 20) continue; const ang = Math.atan2(t.s.dy, t.s.dx), sz = (t.me ? 8.5 : 5.2) * z;
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.8, sz * 0.7); ctx.lineTo(-sz * 0.8, -sz * 0.7); ctx.closePath(); ctx.fillStyle = t.s.dwell || !t.s.moving && !t.me ? (dk ? '#8896a6' : '#6b7886') : t.col; ctx.fill(); ctx.strokeStyle = t.me ? '#fff' : dk ? 'rgba(255,255,255,.85)' : 'rgba(20,30,40,.85)'; ctx.lineWidth = t.me ? 2.2 : 1; ctx.stroke(); ctx.restore();
      if (t.me) { const k = 1 + 0.25 * Math.sin(performance.now() / 300); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], 15 * z * k, 0, 7); ctx.stroke(); }
      hits.push({ x: q[0], y: q[1], t }); }
    // chú giải và nút
    const lx = x + 14; let ly = y + h - 14 - SEGS.length * 17; ctx.fillStyle = dk ? 'rgba(8,12,18,.78)' : 'rgba(255,255,255,.82)'; ctx.fillRect(lx - 8, ly - 18, 150, SEGS.length * 17 + 24);
    txt('Tuyến', lx, ly - 4, dk ? '#8aa0b5' : '#445', 'bold 11px system-ui'); for (const sg of SEGS) { ctx.fillStyle = sg.col; ctx.fillRect(lx, ly + 6, 22, 5); txt(sg.name, lx + 30, ly + 12, dk ? '#e8eef5' : '#1b2633', '11px system-ui'); ly += 17; }
    btn(x + w - 130, y + 10, 120, 28, '✕ Đóng (D)', () => { o.close(); }, true, '#7a2d2d', 13);
    btn(x + w - 260, y + 10, 120, 28, dk ? '☀ Nền sáng' : '🌙 Nền tối', () => { V.light = !V.light; o.save && o.save(V.light); }, false, null, 13);
    btn(x + w - 400, y + 10, 130, 28, '📍 Tàu của tôi', () => { const me = tr.find(t => t.me); if (me) { V.cx = me.s.lon; V.cy = me.s.lat; V.s = Math.max(V.s, 160); } }, true, '#2a8f5a', 13);
    txt('BẢN ĐỒ TOÀN QUỐC · ' + hhmm(W.trip.t0 + W.t) + ' · con lăn: zoom · kéo: di chuyển · bấm ga/tàu: chi tiết', x + 14, y + 22, dk ? '#cfe0f0' : '#1b2633', 'bold 13px system-ui');
    // thẻ chi tiết
    if (V.sel) {
      const rows = []; let title = '', sub = '';
      if (V.sel.en) { title = V.sel.en + ' ' + (V.sel.jp || ''); const rr = stationRows(V.sel.en, W); sub = rr.length ? 'Tàu quanh giờ hiện tại:' : 'Không có tàu nào trong 30 phút tới.'; for (const q of rr.slice(0, 12)) rows.push([q[1], q[2]]); }
      else if (V.sel.t) { const t = V.sel.t, L = t.me ? root.LINES[t.line] : root.LINES[t.c.line]; title = t.label; const st = t.s;
        if (t.me) { sub = 'TÀU CỦA BẠN · ' + Math.round(st.kmh) + ' km/h'; rows.push(['km ' + st.km.toFixed(1) + ' / ' + L.stations[L.stations.length - 1].km.toFixed(0), t.col]); }
        else { const S = t.c.stops, a = L.stations[S[0].i].en, b = L.stations[S[S.length - 1].i].en, nxt = S[Math.min(S.length - 1, (st.k || 0) + (st.dwell === 'wait' || st.dwell === 'stop' ? 0 : 1))];
          sub = (t.c.rec.v || '') + ' · ' + a + ' → ' + b; rows.push([st.dwell === 'wait' ? 'chờ xuất phát tại ' + a : st.dwell === 'end' ? 'đã tới ' + b : st.dwell ? 'đang đỗ tại ' + L.stations[S[st.k].i].en : 'đang chạy ~' + Math.round(st.kmh) + ' km/h', t.col]); if (!st.dwell && nxt) rows.push(['tới ' + L.stations[nxt.i].en + ' lúc ' + hhmm(t.c.ta(nxt)), t.col]); } }
      const cw = 360, ch = 54 + rows.length * 18 + (rows.length ? 6 : 0), cx = x + 14, cy = y + 40; ctx.fillStyle = dk ? 'rgba(8,12,18,.9)' : 'rgba(255,255,255,.92)'; ctx.fillRect(cx, cy, cw, ch); ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, cw, ch);
      txt(title, cx + 12, cy + 22, dk ? '#fff' : '#111', 'bold 15px system-ui'); txt(sub, cx + 12, cy + 42, dk ? '#8aa0b5' : '#445', '12px system-ui'); rows.forEach((q, i) => { ctx.fillStyle = q[1]; ctx.fillRect(cx + 12, cy + 55 + i * 18, 8, 8); txt(q[0], cx + 26, cy + 63 + i * 18, dk ? '#e8eef5' : '#1b2633', '12px system-ui'); });
    }
    ctx.restore();
  }
  // tương tác: kéo, zoom, bấm
  const inRect = (px, py) => { const r = V.rect; return px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3]; };
  function wheel(px, py, dy) { if (!inRect(px, py)) return false; const r = V.rect, f = Math.exp(-dy * 0.0016), s2 = Math.max(18, Math.min(1200, V.s * f)), wxm = wx(V.cx) + (px - r[0] - r[2] / 2) / V.s, lat = V.cy - (py - r[1] - r[3] / 2) / V.s;
    V.s = s2; V.cx = (wxm - (px - r[0] - r[2] / 2) / V.s) / KX; V.cy = lat + (py - r[1] - r[3] / 2) / V.s; return true; }
  function down(px, py) { if (!inRect(px, py)) return false; V.drag = { x: px, y: py, cx: V.cx, cy: V.cy, moved: false }; return true; }
  function move(px, py) { const d = V.drag; if (!d) return; const dx = px - d.x, dy = py - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; V.cx = d.cx - dx / V.s / KX; V.cy = d.cy + dy / V.s; }
  function up() { const d = V.drag; V.drag = null; return d && d.moved; }
  function click(px, py) {
    if (!inRect(px, py)) return false; let best = null, bd = 100;      // ga (bán kính ~10 px) ưu tiên hơn tàu đang đỗ ở đó; tàu tìm trong 14 px
    for (const en of Object.keys(ST || {})) { const s = ST[en], q = P(s.lon, s.lat, V.rect), d = (q[0] - px) ** 2 + (q[1] - py) ** 2; if (d < bd) { bd = d; best = s; } }
    if (!best) { bd = 196; for (const h of V.trains || []) { const d = (h.x - px) ** 2 + (h.y - py) ** 2; if (d < bd) { bd = d; best = { t: h.t }; } } }
    V.sel = best; return true;
  }
  root.NatMap = { V, draw, wheel, down, move, up, click, setLight: v => { V.light = !!v; }, playerCol: (W, T) => { const L = root.LINES && root.LINES[W.lineId]; if (!L) return null; const km = root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd); return colAt(W.lineId, atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km))).idx); }, colors: () => SEGS.map(s => [s.key, s.name, s.col]), colAt, SEGS };
})(typeof window !== 'undefined' ? window : globalThis);
