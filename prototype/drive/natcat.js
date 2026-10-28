// Danh mục tàu toàn quốc + thiên tai (dùng chung bản đồ toàn quốc natmap.js và mô phỏng sim.js, để cùng một nguồn kịch bản):
// - danh mục mọi đoàn tàu theo lịch thật (LINES[...].trains), vị trí theo giờ;
// - thời tiết (ô mưa/tuyết/gió theo vùng) và động đất (sóng P đi trước, sóng S theo sau) sinh theo hạt giống chuyến, gắn với các sự kiện của chính tuyến người chơi (W.hazPlan);
// - độ trễ tích luỹ của từng đoàn: chậm lại trong vùng thời tiết xấu, dừng khi sóng S chạm tới và chấn động đủ mạnh (shindo >= 4).
// Các hằng số truyền sóng và công thức shindo là đơn giản hoá [I], không phải mô hình khí tượng/địa chấn thật.
(function (root) {
  const KX = Math.cos(36.5 * Math.PI / 180), VP = 7.0, VS = 4.0;      // km/s
  const hav = (a, b, c, d) => { const R = 6371, p = Math.PI / 180, x = (c - a) * p, y = (d - b) * p * Math.cos((a + c) / 2 * p); return R * Math.hypot(x, y); };
  const hs = (a, b) => { const x = Math.sin(a * 12.9898 + (b || 0) * 78.233) * 43758.5453; return x - Math.floor(x); };
  const shindoAt = (q, km) => { const R = Math.hypot(km, q.depth); return 1.2 * q.mag - 3.0 * Math.log10(R + 10) + 2.2; };
  let CAT = null, LNREF = null;
  function build(LN) {
    if (CAT && LNREF === LN) return CAT; LNREF = LN; CAT = [];
    for (const id of Object.keys(LN)) for (const rec of LN[id].trains) {
      const stops = rec.s.filter(e => !e[3]).map(e => ({ i: e[0], arr: e[1], dep: e[2] })); if (stops.length < 2) continue;
      const ta = p => p.arr != null ? p.arr : p.dep, td = p => p.dep != null ? p.dep : p.arr;
      CAT.push({ line: id, rec, stops, ta, td, t0: td(stops[0]) - 10, t1: ta(stops[stops.length - 1]) + 10, key: id + rec.t + rec.n + rec.d });
    }
    return CAT;
  }
  // vị trí theo km trên một tuyến (nội suy giữa hai ga kề nhau; km tăng theo chỉ số ga)
  function atKm(L, km) {
    const S = L.stations; let j = 0; while (j < S.length - 2 && S[j + 1].km < km) j++;
    const a = S[j], b = S[j + 1], f = Math.max(0, Math.min(1, (km - a.km) / ((b.km - a.km) || 1)));
    return { lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f, dx: (b.lon - a.lon) * KX, dy: -(b.lat - a.lat), idx: f < 0.5 ? j : j + 1 };
  }
  // trạng thái một đoàn theo lịch tại giờ `now` (đã trừ độ trễ): null nếu chưa hiện / đã biến mất (hiện sớm và biến mất muộn 10 s)
  function stateOf(LN, c, now) {
    if (now < c.t0 || now > c.t1) return null; const L = LN[c.line], S = c.stops, K = i => L.stations[i].km;
    const pos = i => { const s = L.stations[i]; return { lon: s.lon, lat: s.lat, idx: i }; };
    for (let k = 0; k < S.length; k++) {
      const p = S[k], q = S[k + 1];
      if (now >= c.ta(p) - (k === 0 ? 10 : 0) && now <= c.td(p) + (k === S.length - 1 ? 10 : 0)) { const nb = q || S[k - 1], d = L.stations[nb.i]; return Object.assign(pos(p.i), { dwell: k === 0 ? 'wait' : k === S.length - 1 ? 'end' : 'stop', k, dx: (d.lon - L.stations[p.i].lon) * KX * (q ? 1 : -1), dy: -(d.lat - L.stations[p.i].lat) * (q ? 1 : -1), km: K(p.i) }); }
      if (q && now > c.td(p) && now < c.ta(q)) { const f = (now - c.td(p)) / ((c.ta(q) - c.td(p)) || 1), km = K(p.i) + (K(q.i) - K(p.i)) * f, a = atKm(L, km), sg = Math.sign(K(q.i) - K(p.i)) || 1; return { lon: a.lon, lat: a.lat, idx: a.idx, dx: a.dx * sg, dy: a.dy * sg, k, km, moving: true, kmh: Math.abs(K(q.i) - K(p.i)) / ((c.ta(q) - c.td(p)) / 3600) }; }
    }
    return null;
  }
  // ---- thiên tai: tạo từ kế hoạch sự kiện của tuyến người chơi (W.hazPlan: {kind, at, dur, s}) + vài hiện tượng ở nơi khác theo hạt giống
  function init(W) {
    const LN = root.LINES, L = LN && LN[W.lineId]; if (!L) { W.haz = { cells: [], quakes: [], delay: new Map(), lastT: 0 }; return; }
    const H = W.haz = { cells: [], quakes: [], delay: new Map(), lastT: W.trip.t0 }, seed = W.seed || 1, WL = W.line;
    const at = s => { const km = root.Sim.kmOfS(s, W.dir, WL.kmEnd); return atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km))); };
    const mid = at((W.trip.M[0].s + W.trip.M[W.trip.M.length - 1].s) / 2);
    if (W.weatherKind === 'rain' || W.weatherKind === 'typhoon' || W.weatherKind === 'snow') H.cells.push({ kind: W.weatherKind === 'typhoon' ? 'wind' : W.weatherKind, lat: mid.lat, lon: mid.lon, r: 170, t0: -1e9, t1: 1e9 });
    for (const p of W.hazPlan || []) { const a = at(p.s);
      if (p.kind === 'rain' || p.kind === 'wind') H.cells.push({ kind: p.kind, lat: a.lat, lon: a.lon, r: p.r || 60, t0: p.at - 300, t1: p.at + p.dur + 600 });
      else if (p.kind === 'eqk') { const ang = hs(seed, p.at) * 6.283, d = 60 + hs(seed, p.at + 1) * 90, mag = 6.1 + hs(seed, p.at + 2) * 1.0, depth = 10 + hs(seed, p.at + 3) * 40;
        H.quakes.push({ t: p.at - d / VS, lat: a.lat + Math.cos(ang) * d / 111, lon: a.lon + Math.sin(ang) * d / 111 / KX, mag, depth, forPlayer: true }); } }
    // ngoài tuyến của ta: 1–2 ô thời tiết và (đôi khi) một trận động đất, theo hạt giống
    const rl = (u, lo, hi) => lo + hs(seed, u) * (hi - lo);
    for (let k = 0; k < 2; k++) H.cells.push({ kind: hs(seed, 40 + k) < 0.55 ? 'rain' : 'snow', lat: rl(50 + k, 33.5, 43), lon: rl(60 + k, 131, 142), r: rl(70 + k, 50, 110), t0: rl(80 + k, 0, 3600), t1: rl(90 + k, 5400, 12000) });
    if (hs(seed, 99) < 0.6) H.quakes.push({ t: rl(100, 900, 6000), lat: rl(101, 34, 41.5), lon: rl(102, 132, 142.5), mag: rl(103, 5.6, 6.6), depth: rl(104, 10, 60) });
  }
  // các tuyến đi chung đường: Tohoku–Akita–Yamagata (tham chiếu km Tohoku) và Joetsu–Hokuriku (tham chiếu km Joetsu), để tàu khác tuyến cũng không vượt nhau giữa hai ga
  const GR = { toh: ['A', null], aki: ['A', 'toh'], yam: ['A', 'toh'], jts: ['B', null], hok: ['B', 'jts'] }, pairCache = new Map();
  function refOf(LN, line, km) {
    const g = GR[line]; if (!g) return { g: line, k: km }; if (!g[1]) return { g: g[0], k: km };
    const key = line + g[1]; let P = pairCache.get(key); if (!P) { const A = LN[line].stations, B = LN[g[1]].stations; P = []; for (const a of A) { const b = B.find(x => x.en === a.en); if (b) P.push([a.km, b.km]); } pairCache.set(key, P); }
    if (P.length < 2 || km < P[0][0] || km > P[P.length - 1][0]) return { g: line, k: km };
    let i = 0; while (i < P.length - 2 && P[i + 1][0] < km) i++; const f = (km - P[i][0]) / ((P[i + 1][0] - P[i][0]) || 1); return { g: g[0], k: P[i][1] + (P[i + 1][1] - P[i][1]) * f };
  }
  const WSLOW = { rain: 0.06, snow: 0.09, wind: 0.2 };
  // cập nhật độ trễ tới giờ hiện tại của game (bước 5 s; mở bản đồ muộn thì tự bù từ đầu chuyến)
  function step(W) {
    const LN = root.LINES; if (!LN || !W.trip) return; if (!W.haz) init(W); const H = W.haz, cat = build(LN), end = W.trip.t0 + W.t;
    while (H.lastT < end - 0.01) { const dt = Math.min(5, end - H.lastT), tNow = H.lastT + dt, wt = tNow - W.trip.t0, act = [];
      for (const c of cat) { let d = H.delay.get(c.key); const eff = tNow - (d ? d.delay : 0); if (eff < c.t0 || eff > c.t1) continue;
        if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9 }; H.delay.set(c.key, d); }
        const s = stateOf(LN, c, eff); if (!s) continue; if (d.hold > 0) { act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: true }); d.hold -= dt; d.delay += dt; continue; }
        for (let qi = 0; qi < H.quakes.length; qi++) { const q = H.quakes[qi]; if (d.hit[qi] || wt < q.t) continue; const R = hav(s.lat, s.lon, q.lat, q.lon), tS = q.t + Math.hypot(R, q.depth) / VS;
          if (wt >= tS) { d.hit[qi] = 1; const sh = shindoAt(q, R); if (sh >= 4) { d.hold = (sh >= 5 ? 900 : 420) * (0.8 + hs(qi, c.rec.n | 0) * 0.5); d.why = 'eqk'; d.shake = wt; } } }
        if (d.hold <= 0 && !s.dwell) for (const cl of H.cells) if (wt >= cl.t0 && wt <= cl.t1 && hav(s.lat, s.lon, cl.lat, cl.lon) < cl.r) { d.delay += dt * (WSLOW[cl.kind] || 0.05); if (!d.why) d.why = cl.kind; break; }
        act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: false, dwell: !!s.dwell }); }
      { const P0 = W.player; if (P0 && !P0.finished && LN[W.lineId]) act.push({ d: { delay: 0 }, g: refOf(LN, W.lineId, root.Sim.kmOfS(P0.x, W.dir, W.line.kmEnd)), dir: W.dir, still: false, dwell: P0.phase === 'dwell', me: true }); }      // tàu của người chơi cũng là vật cản (không bị chậm)
      // một đường mỗi chiều: tàu đi sau không thể vượt tàu phía trước giữa hai ga (chỉ vượt được ở ga khi tàu trước đang đỗ); tiến sát thì bị chậm dần
      const grp = new Map(); for (const a of act) { a.km = a.g.k; const g = a.g.g + a.dir; (grp.get(g) || grp.set(g, []).get(g)).push(a); }
      for (const [g, arr] of grp) { const sg = arr[0].dir === 'down' ? 1 : -1; arr.sort((x, y) => sg * (x.km - y.km));
        for (let i = 0; i < arr.length - 1; i++) { const B = arr[i]; if (B.dwell || B.still) continue; let A = null; for (let j = i + 1; j < arr.length; j++) if (!arr[j].dwell || arr[j].still) { A = arr[j]; break; } if (!A) continue; const gap = sg * (A.km - B.km); if (!B.me && gap < 2.5) B.d.delay += dt * Math.min(1, (2.5 - gap) / 1.5); } }
      H.lastT = tNow; }
  }
  const delayOf = (W, key) => { const d = W.haz && W.haz.delay.get(key); return d ? d : null; };
  root.NatCat = { refOf, KX, VP, VS, hav, shindoAt, build, atKm, stateOf, init, step, delayOf };
})(typeof window !== 'undefined' ? window : globalThis);
