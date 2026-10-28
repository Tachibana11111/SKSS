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
  const NC = () => root.NatCat;

  function build() {
    const LN = root.LINES; if (!LN || !NC()) return false;
    ST = {}; CAT = NC().build(LN);
    for (const sg of SEGS) { const L = LN[sg.line]; if (!L) continue; for (let i = sg.a; i <= sg.b && i < L.stations.length; i++) { const s = L.stations[i]; if (!ST[s.en]) ST[s.en] = { en: s.en, jp: s.jp, lat: s.lat, lon: s.lon, col: sg.col, big: s.en === 'Tokyo', mid: MEDIUM.includes(s.en) }; } }
    return true;
  }
  const colAt = (line, i) => { for (const [a, b, k] of SHARED[line] || []) if (i >= a && i < b) return BYKEY[k].col; for (const sg of SEGS) if (sg.line === line && i >= sg.a && i <= sg.b) return sg.col; return '#9fb3c8'; };
  const wx = lon => lon * KX, P = (lon, lat, r) => [r[0] + r[2] / 2 + (wx(lon) - wx(V.cx)) * V.s, r[1] + r[3] / 2 + (V.cy - lat) * V.s];
  const hhmm = t => { t = Math.round(t); const h = Math.floor(t / 3600) % 24, m = Math.floor(t % 3600 / 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
  const atKm = (L, km) => NC().atKm(L, km);
  function gather(W, T) {
    const LN = root.LINES, now = W.trip.t0 + W.t, out = [], me = W.trip.rec;
    for (const c of CAT) { if (c.rec === me || (c.line === W.lineId && me && c.rec.t === me.t && c.rec.n === me.n && c.rec.d === me.d)) continue;
      const d = NC().delayOf(W, c.key), s = NC().stateOf(LN, c, now - (d ? d.delay : 0)); if (!s) continue;
      const held = !!(d && d.hold > 0); if (held) { s.moving = false; s.kmh = 0; }
      const Ld = W.lead, lr = W.leadRef; let s0km = null;
      if (Ld && lr && Ld.phase !== 'end' && c.rec.t === lr.t && c.rec.n === lr.n && c.rec.d === lr.d && LN[W.lineId]) {      // tàu đi trước của ta: vẽ đúng vị trí thật trong mô phỏng thay vì theo lịch, để không bị ta vượt mặt
        const L2 = LN[W.lineId], km2 = root.Sim.kmOfS(Ld.x, W.dir, W.line.kmEnd), a2 = atKm(L2, Math.max(L2.stations[0].km, Math.min(L2.stations[L2.stations.length - 1].km, km2))), sg2 = W.dir === 'down' ? 1 : -1; s0km = s.km;
        s.lon = a2.lon; s.lat = a2.lat; s.idx = a2.idx; s.dx = a2.dx * sg2; s.dy = a2.dy * sg2; s.moving = Ld.v > 0.5; s.kmh = Ld.v * 3.6; s.km = km2; s.dwell = Ld.phase === 'dwell' ? 'stop' : undefined; if (!s.dwell && s.k === undefined) s.k = 0; }
      out.push({ c, s, s0km, d, held, col: colAt(c.line, s.idx), label: c.rec.t + ' ' + c.rec.n }); }
    const L = LN[W.lineId]; if (L && T) { const km = root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd), a = atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km))), sg = W.dir === 'down' ? 1 : -1;
      out.push({ me: true, s: { lon: a.lon, lat: a.lat, idx: a.idx, dx: a.dx * sg, dy: a.dy * sg, moving: T.v > 0.5, kmh: T.v * 3.6, km }, col: colAt(W.lineId, a.idx), label: (W.trip.label || 'Tàu của bạn'), line: W.lineId }); }
    return out;
  }
  function stationRows(en, W, T) {
    const now = W.trip.t0 + W.t, rows = [], me = W.trip.rec, fmtKm = v => (v < 10 ? v.toFixed(1) : Math.round(v)) + ' km';
    for (const c of CAT) { if (c.rec === me) continue;
      const L = root.LINES[c.line], j = L.stations.findIndex(s => s.en === en); if (j < 0) continue; const km = L.stations[j].km, S = c.stops; let ev = null;
      for (let k = 0; k < S.length && !ev; k++) {
        if (S[k].i === j) ev = { stop: true, arr: c.ta(S[k]), dep: c.td(S[k]), first: k === 0, last: k === S.length - 1 };
        else if (k < S.length - 1) { const k0 = L.stations[S[k].i].km, k1 = L.stations[S[k + 1].i].km; if (km > Math.min(k0, k1) && km < Math.max(k0, k1)) { const f = (km - k0) / (k1 - k0), t = c.td(S[k]) + (c.ta(S[k + 1]) - c.td(S[k])) * f; ev = { stop: false, arr: t, dep: t }; } }
      }
      if (!ev || now < ev.arr - 1800 || now > ev.dep + 300) continue;
      const dly = NC().delayOf(W, c.key); if (dly) { ev.arr += dly.delay; ev.dep += dly.delay; } if (!ev || now < ev.arr - 1800 || now > ev.dep + 300) continue;
      const stt = (dly && dly.hold > 0 ? '[DỪNG do ' + (dly.why === 'eqk' ? 'động đất' : 'thời tiết') + '] ' : dly && dly.delay > 90 ? '[trễ ' + Math.round(dly.delay / 60) + ' ph] ' : '') + (!ev.stop ? 'thông qua ' + hhmm(ev.arr) : now < ev.arr ? (ev.first ? 'chờ xuất phát ' + hhmm(ev.dep) : 'sắp tới, ETA ' + hhmm(ev.arr)) : now <= ev.dep ? (ev.last ? 'vừa đến, đang đỗ' : 'đang đỗ, đi ' + hhmm(ev.dep)) : 'vừa rời ' + hhmm(ev.dep));
      const sNow = NC().stateOf(root.LINES, c, now - (dly ? dly.delay : 0)), dist = sNow ? Math.abs(sNow.km - km) : null;      // khoảng cách thật từ tàu tới ga (km đường), cả hai chiều
      rows.push([ev.arr, c.rec.t + ' ' + c.rec.n + ' (' + (c.rec.d === 'down' ? 'xuống' : 'lên') + ') · ' + stt + (dist == null ? '' : dist < 0.05 ? ' · tại ga' : ' · cách ' + fmtKm(dist)), colAt(c.line, j)]);
    }
    { const L = root.LINES[W.lineId], j = L && T ? L.stations.findIndex(s => s.en === en) : -1; if (j >= 0) { const kmP = root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd), dist = Math.abs(kmP - L.stations[j].km); if (dist < 60) rows.push([now - 1e6, 'TÀU CỦA BẠN · ' + (dist < 0.05 ? 'tại ga' : 'cách ' + fmtKm(dist)), '#ffffff']); } }
    rows.sort((x, y) => x[0] - y[0]); return rows;
  }

  function draw(ctx, x, y, w, h, W, T, o) {
    if (!ST && !build()) { ctx.fillStyle = '#0b0f14'; ctx.fillRect(x, y, w, h); return; }
    const r = V.rect = [x, y, w, h], dk = !V.light, txt0 = o.txt, btn0 = o.button, mini = !!o.mini, U = mini ? 1 : 1.35;      // U: hệ số phóng chữ và phần tử (bản đồ lớn dễ đọc hơn; ô nhỏ giữ nguyên)
    const txt = U === 1 ? txt0 : (t, tx, ty, col, f, al) => txt0(t, tx, ty, col, f ? f.replace(/(\d+)px/, (m, n) => Math.round(n * U) + 'px') : f, al), btn = (bx0, by0, bw0, bh0, lab, fn, on, col, fs) => btn0(bx0, by0, Math.round(bw0 * U), Math.round(bh0 * U), lab, fn, on, col, Math.round((fs || 12) * U));
    NC().step(W); const H = W.haz || { cells: [], quakes: [] }, wt = W.t, kmPx = V.s / 111;
    if (!V.fit) { V.fit = true; V.s = h / 15.5; V.cx = 137.6; V.cy = 38.0; }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = dk ? '#0d1a28' : '#cfe3f3'; ctx.fillRect(x, y, w, h);
    const M = root.JPMAP; if (M) {
      ctx.beginPath(); for (const p of M) for (const ring of p.r) { for (let i = 0; i < ring.length; i += 2) { const q = P(ring[i] / 1000, ring[i + 1] / 1000, r); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.closePath(); }
      ctx.fillStyle = dk ? '#1c2b3b' : '#f3f0e6'; ctx.fill('evenodd'); ctx.strokeStyle = dk ? '#2c3f54' : '#c9c4b4'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    for (const cl of H.cells) { if (wt < cl.t0 || wt > cl.t1) continue; const q = P(cl.lon, cl.lat, r), rad = cl.r * kmPx; if (q[0] + rad < x || q[0] - rad > x + w || q[1] + rad < y || q[1] - rad > y + h) continue;
      const col = cl.kind === 'rain' ? '59,130,246' : cl.kind === 'snow' ? '226,238,255' : '170,180,190'; const g = ctx.createRadialGradient(q[0], q[1], rad * 0.2, q[0], q[1], rad); g.addColorStop(0, 'rgba(' + col + ',.34)'); g.addColorStop(1, 'rgba(' + col + ',.08)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(' + col + ',.6)'; ctx.lineWidth = 1; ctx.setLineDash(cl.kind === 'wind' ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]); txt(cl.kind === 'rain' ? 'mưa lớn' : cl.kind === 'snow' ? 'tuyết' : 'gió mạnh', q[0], q[1] + 4, dk ? 'rgba(220,235,255,.9)' : 'rgba(20,40,80,.9)', '11px system-ui', 'center'); }
    const z = Math.min(1.8, Math.max(0.8, Math.sqrt(V.s / 44)));
    for (const sg of SEGS) { const L = root.LINES[sg.line]; if (!L) continue; ctx.beginPath(); for (let i = sg.a; i <= sg.b && i < L.stations.length; i++) { const q = P(L.stations[i].lon, L.stations[i].lat, r); i === sg.a ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = dk ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.4)'; ctx.lineWidth = 5.4 * z * (U > 1 ? 1.2 : 1); ctx.stroke(); ctx.strokeStyle = sg.col; ctx.lineWidth = 3.2 * z * (U > 1 ? 1.2 : 1); ctx.stroke(); }
    // ga: Tokyo to (pha màu cả 10 tuyến), ga rẽ nhánh/đổi tuyến vừa, còn lại nhỏ
    const names = Object.keys(ST), lab = V.s > 120;
    for (const en of names) { const s = ST[en], q = P(s.lon, s.lat, r); if (q[0] < x - 20 || q[0] > x + w + 20 || q[1] < y - 20 || q[1] > y + h + 20) continue;
      const rad = (s.big ? 8 : s.mid ? 5.2 : 3.2) * z * (U > 1 ? 1.3 : 1);
      if (s.big) { const n = SEGS.length; for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.arc(q[0], q[1], rad, k / n * 6.2832 - 1.5708, (k + 1) / n * 6.2832 - 1.5708); ctx.closePath(); ctx.fillStyle = SEGS[k].col; ctx.fill(); } ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 7); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, 7); ctx.fillStyle = s.col; ctx.fill(); ctx.strokeStyle = dk ? '#fff' : '#223'; ctx.lineWidth = 1.2; ctx.stroke(); }
      if (V.sel && V.sel.en === en) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(q[0], q[1], rad + 4, 0, 7); ctx.stroke(); }
      if (s.big || s.mid || lab || (V.sel && V.sel.en === en)) txt(s.en, q[0] + rad + 4, q[1] + 4, dk ? '#e8eef5' : '#1b2633', (s.big ? 'bold 13px' : '11px') + ' system-ui'); }
    // tàu: tam giác chỉ hướng
    const tr = gather(W, T), hits = []; V.trains = hits;
    for (const t of tr) { const q = P(t.s.lon, t.s.lat, r); if (q[0] < x - 20 || q[0] > x + w + 20 || q[1] < y - 20 || q[1] > y + h + 20) continue; const ang = Math.atan2(t.s.dy, t.s.dx), sz = (t.me ? 8.5 : 5.2) * z * (U > 1 ? 1.3 : 1);
      if (t.held) { ctx.strokeStyle = 'rgba(255,80,60,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(q[0], q[1], 9 * z, 0, 7); ctx.stroke(); }
      const shk = t.d && wt - (t.d.shake - W.trip.t0 * 0 ) < 6 && t.d.shake > -1e8 && wt >= t.d.shake ? (Math.random() - 0.5) * 4 : 0; q[0] += shk; q[1] += shk;
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.8, sz * 0.7); ctx.lineTo(-sz * 0.8, -sz * 0.7); ctx.closePath(); ctx.fillStyle = t.s.dwell || !t.s.moving && !t.me ? (dk ? '#8896a6' : '#6b7886') : t.col; ctx.fill(); ctx.strokeStyle = t.me ? '#fff' : dk ? 'rgba(255,255,255,.85)' : 'rgba(20,30,40,.85)'; ctx.lineWidth = t.me ? 2.2 : 1; ctx.stroke(); ctx.restore();
      if (t.me) { const k = 1 + 0.25 * Math.sin(performance.now() / 300); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], 15 * z * k, 0, 7); ctx.stroke(); }
      hits.push({ x: q[0], y: q[1], t }); }
    for (const qk of H.quakes) { const age = wt - qk.t; if (age < 0 || age > 420) continue; const q = P(qk.lon, qk.lat, r), fade = Math.max(0, Math.min(1, (420 - age) / 120)), rp = NC().VP * age * kmPx, rs = NC().VS * age * kmPx;
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,210,74,' + 0.85 * fade + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], rp, 0, 7); ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,70,50,' + 0.9 * fade + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], rs, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0] - 7, q[1] - 7); ctx.lineTo(q[0] + 7, q[1] + 7); ctx.moveTo(q[0] + 7, q[1] - 7); ctx.lineTo(q[0] - 7, q[1] + 7); ctx.stroke();
      txt('ĐỘNG ĐẤT M' + qk.mag.toFixed(1) + ' · sâu ' + Math.round(qk.depth) + ' km · shindo ~' + Math.max(1, Math.round(NC().shindoAt(qk, 0))), q[0] + 12, q[1] - 10, dk ? '#ff8a7a' : '#a01808', 'bold 12px system-ui');
      txt('sóng P (vàng, đi trước) · sóng S (đỏ, theo sau)', q[0] + 12, q[1] + 6, dk ? '#e8d27a' : '#665500', '10px system-ui'); }
    if (!mini) {
    // chú giải và nút
    const bwU = Math.round(120 * U), bx = x + w - 390 - bwU, lx = x + 14, rowH = Math.round(17 * U); let ly = y + h - 14 - SEGS.length * rowH; ctx.fillStyle = dk ? 'rgba(8,12,18,.78)' : 'rgba(255,255,255,.82)'; ctx.fillRect(lx - 8, ly - 20 * U, Math.round(150 * U), SEGS.length * rowH + 26 * U);
    txt('Tuyến', lx, ly - 4, dk ? '#8aa0b5' : '#445', 'bold 11px system-ui'); for (const sg of SEGS) { ctx.fillStyle = sg.col; ctx.fillRect(lx, ly + 6 * U, 22 * U, 5 * U); txt(sg.name, lx + 30 * U, ly + 12 * U, dk ? '#e8eef5' : '#1b2633', '11px system-ui'); ly += rowH; }
    btn(bx, y + 10, 120, 28, '✕ Đóng (D)', () => { o.close(); }, true, '#7a2d2d', 13);
    btn(bx - bwU - 10, y + 10, 120, 28, dk ? '☀ Nền sáng' : '🌙 Nền tối', () => { V.light = !V.light; o.save && o.save(V.light); }, false, null, 13);
    btn(bx - 2 * bwU - 20 - Math.round(10 * U), y + 10, 130, 28, '📍 Tàu của tôi', () => { const me = tr.find(t => t.me); if (me) { V.cx = me.s.lon; V.cy = me.s.lat; V.s = Math.max(V.s, 160); } }, true, '#2a8f5a', 13);
    txt('BẢN ĐỒ TOÀN QUỐC · ' + hhmm(W.trip.t0 + W.t) + ' · con lăn: zoom · kéo: di chuyển · bấm ga/tàu: chi tiết', x + 14, y + 22, dk ? '#cfe0f0' : '#1b2633', 'bold 13px system-ui');
    // thẻ chi tiết
    const selT = V.sel && V.sel.tk ? tr.find(t => (t.me ? 'me' : t.c.key) === V.sel.tk) : null; if (V.sel && V.sel.tk && !selT) V.sel = null;
    if (V.sel) {
      const rows = []; let title = '', sub = '';
      if (V.sel.en) { title = V.sel.en + ' ' + (V.sel.jp || ''); const rr = stationRows(V.sel.en, W, T); sub = rr.length ? 'Tàu quanh giờ hiện tại:' : 'Không có tàu nào trong 30 phút tới.'; for (const q of rr.slice(0, 12)) rows.push([q[1], q[2]]); }
      else if (selT) { const t = selT, L = t.me ? root.LINES[t.line] : root.LINES[t.c.line]; title = t.label; const st = t.s;
        if (t.me) { sub = 'TÀU CỦA BẠN · ' + Math.round(st.kmh) + ' km/h'; rows.push(['km ' + st.km.toFixed(1) + ' / ' + L.stations[L.stations.length - 1].km.toFixed(0), t.col]); { const jN = root.Sim.nextTarget(T), mN = T.M[jN]; if (mN && T.phase !== 'dwell') { const rem = Math.max(0, (mN.s - T.x) / 1000); rows.push(['tới ' + mN.name + (mN.arr != null ? ' lúc ' + hhmm(W.trip.t0 + mN.arr) : '') + ' · còn ' + (rem < 10 ? rem.toFixed(1) : Math.round(rem)) + ' km', t.col]); } } }
        else { if (t.held) rows.push(['ĐANG DỪNG do ' + (t.d.why === 'eqk' ? 'động đất' : 'thời tiết') + ' (còn ~' + Math.max(1, Math.round(t.d.hold / 60)) + ' phút)', '#ff6b5a']); else if (t.d && t.d.delay > 90) rows.push(['trễ ~' + Math.round(t.d.delay / 60) + ' phút' + (t.d.why ? ' (' + (t.d.why === 'eqk' ? 'động đất' : t.d.why === 'rain' ? 'mưa' : t.d.why === 'snow' ? 'tuyết' : 'gió') + ')' : ''), '#ffb84a']); const S = t.c.stops, a = L.stations[S[0].i].en, b = L.stations[S[S.length - 1].i].en, nxt = S[Math.min(S.length - 1, (st.k || 0) + (st.dwell === 'wait' || st.dwell === 'stop' ? 0 : 1))];
          sub = (t.c.rec.v || '') + ' · ' + a + ' → ' + b; rows.push([st.dwell === 'wait' ? 'chờ xuất phát tại ' + a : st.dwell === 'end' ? 'đã tới ' + b : st.dwell ? 'đang đỗ tại ' + L.stations[S[st.k].i].en : 'đang chạy ~' + Math.round(st.kmh) + ' km/h', t.col]); if (!st.dwell && nxt) { const remK = Math.abs(L.stations[nxt.i].km - (t.s0km != null ? t.s0km : st.km)); rows.push(['tới ' + L.stations[nxt.i].en + ' lúc ' + hhmm(t.c.ta(nxt) + (t.d ? t.d.delay : 0)) + ' · còn ' + (remK < 10 ? remK.toFixed(1) : Math.round(remK)) + ' km', t.col]); } } }
      if (selT) { const LNs = root.LINES, rf = o2 => NC().refOf(LNs, o2.me || o2.s0km != null ? W.lineId : o2.c.line, o2.s.km), dirOf = o2 => o2.me ? W.dir : o2.c.rec.d, keyOf = o2 => rf(o2).g + dirOf(o2), sg = dirOf(selT) === 'down' ? 1 : -1, grp = tr.filter(o2 => o2 !== selT && keyOf(o2) === keyOf(selT)), k0 = rf(selT).k; let ah = null, bh = null;
        for (const o2 of grp) { const dd = sg * (rf(o2).k - k0); if (dd > 0 && (!ah || dd < ah.d)) ah = { o: o2, d: dd }; else if (dd <= 0 && (!bh || dd > bh.d)) bh = { o: o2, d: dd }; }
        const fk = v => (v < 10 ? v.toFixed(1) : Math.round(v)) + ' km'; rows.push([ah ? 'Tàu phía trước: ' + ah.o.label + ' · ' + fk(ah.d) : 'Không có tàu phía trước (cùng chiều, cùng tuyến)', ah ? ah.o.col : '#8896a6']); rows.push([bh ? 'Tàu phía sau: ' + bh.o.label + ' · ' + fk(-bh.d) : 'Không có tàu phía sau (cùng chiều, cùng tuyến)', bh ? bh.o.col : '#8896a6']); }
      const cw = Math.round(440 * U), rh = Math.round(18 * U), ch = Math.round(54 * U) + rows.length * rh + (rows.length ? 6 : 0) + (selT && o.checkin ? Math.round(34 * U) : 0), ax = V.sel.en ? P(V.sel.lon, V.sel.lat, r) : (() => { const hh = (V.trains || []).find(h => h.t === selT); return hh ? [hh.x, hh.y] : [x + 30, y + 60]; })(); let cx = ax[0] + 16, cy = ax[1] + 16; if (cx + cw > x + w - 8) cx = ax[0] - 16 - cw; if (cy + ch > y + h - 8) cy = y + h - 8 - ch; cx = Math.max(x + 8, cx); cy = Math.max(y + 8, cy); ctx.fillStyle = dk ? 'rgba(8,12,18,.9)' : 'rgba(255,255,255,.92)'; ctx.fillRect(cx, cy, cw, ch); ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, cw, ch);
      txt(title, cx + 12, cy + 22 * U, dk ? '#fff' : '#111', 'bold 15px system-ui'); txt(sub, cx + 12, cy + 42 * U, dk ? '#8aa0b5' : '#445', '12px system-ui'); rows.forEach((q, i) => { ctx.fillStyle = q[1]; ctx.fillRect(cx + 12, cy + 55 * U + i * rh, 8 * U, 8 * U); txt(q[0], cx + 26 * U, cy + 63 * U + i * rh, dk ? '#e8eef5' : '#1b2633', '12px system-ui'); });
      if (selT && o.checkin) btn(cx + 12, cy + ch - Math.round(32 * U), 200, 26, '📍 Check-in địa điểm', () => o.checkin(selT), true, '#2a8f5a', 12);      // chụp cảnh buồng lái phía trước của đoàn này ngay lúc bấm (xem tạm, không lưu)
    }
    }
    ctx.restore();
  }
  // ô nhỏ cạnh khung 2D: bản đồ toàn quốc bám theo tam giác của ta (không nút, không thẻ chi tiết)
  function drawMini(ctx, x, y, w, h, W, T, o) {
    if (!ST && !build()) return; const L = root.LINES[W.lineId]; if (!L) return;
    const sv = { cx: V.cx, cy: V.cy, s: V.s, rect: V.rect, sel: V.sel, trains: V.trains, fit: V.fit, drag: V.drag }, km = root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd), a = NC().atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km)));
    V.cx = a.lon; V.cy = a.lat; V.s = h / 0.55;      // ~60 km theo chiều cao ô: chỉ quan tâm tàu của ta và tàu gặp trên đường; muốn xem rộng thì hoán đổi (D) V.sel = null; V.fit = true;
    try { draw(ctx, x, y, w, h, W, T, Object.assign({}, o, { mini: true })); } finally { Object.assign(V, sv); }
  }
  // tương tác: kéo, zoom, bấm
  const inRect = (px, py) => { const r = V.rect; return px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3]; };
  function wheel(px, py, dy) { if (!inRect(px, py)) return false; const r = V.rect, f = Math.exp(-dy * 0.0016), s2 = Math.max(18, Math.min(120000, V.s * f)), wxm = wx(V.cx) + (px - r[0] - r[2] / 2) / V.s, lat = V.cy - (py - r[1] - r[3] / 2) / V.s;
    V.s = s2; V.cx = (wxm - (px - r[0] - r[2] / 2) / V.s) / KX; V.cy = lat + (py - r[1] - r[3] / 2) / V.s; return true; }
  function down(px, py) { if (!inRect(px, py)) return false; V.drag = { x: px, y: py, cx: V.cx, cy: V.cy, moved: false }; return true; }
  function move(px, py) { const d = V.drag; if (!d) return; const dx = px - d.x, dy = py - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; V.cx = d.cx - dx / V.s / KX; V.cy = d.cy + dy / V.s; }
  function up() { const d = V.drag; V.drag = null; return d && d.moved; }
  function click(px, py) {
    if (!inRect(px, py)) return false; let best = null, bd = 100;      // ga (bán kính ~10 px) ưu tiên hơn tàu đang đỗ ở đó; tàu tìm trong 14 px
    for (const en of Object.keys(ST || {})) { const s = ST[en], q = P(s.lon, s.lat, V.rect), d = (q[0] - px) ** 2 + (q[1] - py) ** 2; if (d < bd) { bd = d; best = s; } }
    if (!best) { bd = 196; for (const h of V.trains || []) { const d = (h.x - px) ** 2 + (h.y - py) ** 2; if (d < bd) { bd = d; best = { tk: h.t.me ? 'me' : h.t.c.key }; } } }
    V.sel = best; return true;
  }
  root.NatMap = { V, stationRows, draw, drawMini, wheel, down, move, up, click, setLight: v => { V.light = !!v; }, playerCol: (W, T) => { const L = root.LINES && root.LINES[W.lineId]; if (!L) return null; const km = root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd); return colAt(W.lineId, atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km))).idx); }, colors: () => SEGS.map(s => [s.key, s.name, s.col]), colAt, SEGS };
})(typeof window !== 'undefined' ? window : globalThis);
