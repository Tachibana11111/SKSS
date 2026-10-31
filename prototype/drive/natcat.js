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
      CAT.push({ line: id, rec, stops, ta, td, t0: td(stops[0]) - 10, t1: ta(stops[stops.length - 1]) + 10, key: id + rec.t + rec.n + rec.d, cid: rec.d + '|' + LN[id].stations[stops[0].i].jp + '|' + Math.round(td(stops[0]) / 5) });      // cid: các đoàn cùng ga đầu, cùng chiều, cùng giờ xuất phát (±5 s) = đoàn ghép, chạy như một đoàn
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
    const H = W.haz = { cells: [], quakes: [], delay: new Map(), lastT: W.trip.t0 - WARM }, seed = W.seed || 1, WL = W.line;
    const at = s => { const km = root.Sim.kmOfS(s, W.dir, WL.kmEnd); return atKm(L, Math.max(L.stations[0].km, Math.min(L.stations[L.stations.length - 1].km, km))); };
    const mid = at((W.trip.M[0].s + W.trip.M[W.trip.M.length - 1].s) / 2);
    if (!(W.real && W.real.wx) && (W.weatherKind === 'rain' || W.weatherKind === 'typhoon' || W.weatherKind === 'snow')) H.cells.push({ kind: W.weatherKind === 'typhoon' ? 'wind' : W.weatherKind, lat: mid.lat, lon: mid.lon, r: 170, t0: -1e9, t1: 1e9 });
    for (const p of W.hazPlan || []) { const a = at(p.s);
      if (p.kind === 'rain' || p.kind === 'wind') H.cells.push({ kind: p.kind, lat: a.lat, lon: a.lon, r: p.r || 60, t0: p.at - 300, t1: p.at + p.dur + 600 });
      else if (p.kind === 'eqk') { const ang = hs(seed, p.at) * 6.283, d = 60 + hs(seed, p.at + 1) * 90, mag = 6.1 + hs(seed, p.at + 2) * 1.0, depth = 10 + hs(seed, p.at + 3) * 40;
        H.quakes.push({ t: p.at - d / VS, lat: a.lat + Math.cos(ang) * d / 111, lon: a.lon + Math.sin(ang) * d / 111 / KX, mag, depth, forPlayer: true }); } }
    if (W.real && W.real.wx) { for (const k of W.realCells || []) H.cells.push(k); return; }      // chế độ thực tế: ô thời tiết lấy từ dữ liệu thật, không thêm hiện tượng giả ngoài tuyến
    // ngoài tuyến của ta: 1–2 ô thời tiết và (đôi khi) một trận động đất, theo hạt giống
    const rl = (u, lo, hi) => lo + hs(seed, u) * (hi - lo);
    for (let k = 0; k < 2; k++) H.cells.push({ kind: hs(seed, 40 + k) < 0.55 ? 'rain' : 'snow', lat: rl(50 + k, 33.5, 43), lon: rl(60 + k, 131, 142), r: rl(70 + k, 50, 110), t0: rl(80 + k, 0, 3600), t1: rl(90 + k, 5400, 12000) });
    if (hs(seed, 99) < 0.6) H.quakes.push({ t: rl(100, 900, 6000), lat: rl(101, 34, 41.5), lon: rl(102, 132, 142.5), mag: rl(103, 5.6, 6.6), depth: rl(104, 10, 60) });
  }
  // các tuyến đi chung đường: Tohoku–Akita–Yamagata (tham chiếu km Tohoku) và Joetsu–Hokuriku (tham chiếu km Joetsu), để tàu khác tuyến cũng không vượt nhau giữa hai ga
  const GR = { toh: [['A', null]], aki: [['A', 'toh']], yam: [['A', 'toh']], jts: [['A', 'toh'], ['B', null]], hok: [['A', 'toh'], ['B', 'jts']] }, pairCache = new Map();      // đoạn Tokyo–Omiya dùng chung cho cả năm tuyến (nhóm A, tham chiếu km Tohoku); sau Omiya Joetsu/Hokuriku vào nhóm B (km Joetsu)
  function pairsOf(LN, line, refLine) { const key = line + refLine; let P = pairCache.get(key); if (!P) { const A = LN[line].stations, B = LN[refLine].stations; P = []; for (const a of A) { const b = B.find(x => x.jp === a.jp); if (b) P.push([a.km, b.km]); } pairCache.set(key, P); } return P; }
  function refOf(LN, line, km) {
    const cands = GR[line]; if (!cands) return { g: line, k: km };
    for (const [g, refLine] of cands) {
      if (!refLine) return { g, k: km };
      const P = pairsOf(LN, line, refLine);
      if (P.length < 2 || km < P[0][0] || km > P[P.length - 1][0]) continue;
      let i = 0; while (i < P.length - 2 && P[i + 1][0] < km) i++; const f = (km - P[i][0]) / ((P[i + 1][0] - P[i][0]) || 1); return { g, k: P[i][1] + (P[i + 1][1] - P[i][1]) * f };
    }
    return { g: line, k: km };
  }
  // ngược của refOf: từ toạ độ tham chiếu của một nhóm về km của một tuyến cụ thể (null nếu tuyến đó không đi qua điểm này)
  function fromRef(LN, line, rf) {
    const cands = GR[line]; if (!cands) return rf.g === line ? rf.k : null;
    for (const [g, refLine] of cands) { if (g !== rf.g) continue; if (!refLine) return rf.k; const P = pairsOf(LN, line, refLine); if (P.length < 2 || rf.k < P[0][1] || rf.k > P[P.length - 1][1]) continue;
      let i = 0; while (i < P.length - 2 && P[i + 1][1] < rf.k) i++; const f = (rf.k - P[i][1]) / ((P[i + 1][1] - P[i][1]) || 1); return P[i][0] + (P[i + 1][0] - P[i][0]) * f; }
    return rf.g === line ? rf.k : null;
  }
  // giờ (theo lịch) mà đoàn c đi qua vị trí km của tuyến mình (nội suy giữa hai ga dừng; null nếu ngoài hành trình)
  function timeAtKm(LN, c, km) { const L = LN[c.line], S = c.stops; for (let k = 0; k < S.length - 1; k++) { const k0 = L.stations[S[k].i].km, k1 = L.stations[S[k + 1].i].km; if (km >= Math.min(k0, k1) && km <= Math.max(k0, k1)) { const f = (km - k0) / ((k1 - k0) || 1); return c.td(S[k]) + (c.ta(S[k + 1]) - c.td(S[k])) * f; } } return null; }
  // tàu đi trước thật của người chơi (W.lead) có vị trí thật trong mô phỏng: ép độ trễ của đoàn đó trong danh mục sao cho vị trí theo lịch trùng vị trí thật, để giãn cách với các tàu khác tính đúng
  function alignLead(W, LN, H, tNow) {
    const Ld = W.lead, lr = W.leadRef; if (!Ld || !lr || Ld.phase !== 'run') return;
    if (W._leadC === undefined) W._leadC = build(LN).find(c => c.rec.t === lr.t && c.rec.n === lr.n && c.rec.d === lr.d) || null; const c = W._leadC; if (!c || !LN[W.lineId]) return;
    const kmP = root.Sim.kmOfS(Ld.x, W.dir, W.line.kmEnd); let km = kmP; if (c.line !== W.lineId) { km = fromRef(LN, c.line, refOf(LN, W.lineId, kmP)); if (km == null) return; }
    const t = timeAtKm(LN, c, km); if (t == null) return; let d = H.delay.get(c.key); if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; H.delay.set(c.key, d); } d.delay = tNow - t; d.hold = 0;
  }
  // ga cho phép vượt tàu đang đỗ: có đường thông qua, hoặc có từ 2 đường dừng cùng chiều (tàu sau vào đường dừng còn trống)
  function canPass(LN, line, idx, dir) { const st = LN[line] && LN[line].stations[idx]; if (!st) return false; if (st.loop) return true; const LY = root.Layout; return !!(LY && LY.stopCount && LY.stopCount(st.lay || '2-2-0', dir) >= 2); }
  // khởi động trước: chạy cơ chế giãn cách từ WARM giây trước giờ xuất phát để các tàu đã sát nhau (lịch nội suy cho vượt nhau giữa hai ga) được giữ thứ tự và chỉ vượt ở ga có đường tránh; trong lúc đó chưa tính tàu của người chơi
  const WARM = 1800, WSLOW = { rain: 0.06, snow: 0.09, wind: 0.2 };
  // cập nhật độ trễ tới giờ hiện tại của game (bước 5 s; mở bản đồ muộn thì tự bù từ đầu chuyến)
  function step(W) {
    const LN = root.LINES; if (!LN || !W.trip) return; if (!W.haz) init(W); const H = W.haz, cat = build(LN), end = W.trip.t0 + W.t;
    while (H.lastT < end - 0.01) { const dt = Math.min(5, end - H.lastT), tNow = H.lastT + dt, wt = tNow - W.trip.t0, act = []; if (tNow >= W.trip.t0) alignLead(W, LN, H, tNow);
      for (const c of cat) { let d = H.delay.get(c.key); const eff = tNow - (d ? d.delay : 0); if (eff < c.t0 || eff > c.t1) continue;
        if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; H.delay.set(c.key, d); }
        d._d0 = d.delay;
        const s = stateOf(LN, c, eff); if (!s) continue; if (d.hold > 0) { act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: true, cid: c.cid }); d.hold -= dt; d.delay += dt; continue; }
        for (let qi = 0; qi < H.quakes.length; qi++) { const q = H.quakes[qi]; if (d.hit[qi] || wt < q.t) continue; const R = hav(s.lat, s.lon, q.lat, q.lon), tS = q.t + Math.hypot(R, q.depth) / VS;
          if (wt >= tS) { d.hit[qi] = 1; const sh = shindoAt(q, R); if (sh >= 4) { d.hold = (sh >= 5 ? 900 : 420) * (0.8 + hs(qi, c.rec.n | 0) * 0.5); d.why = 'eqk'; d.shake = wt; } } }
        if (d.hold <= 0 && !s.dwell) for (const cl of H.cells) if (wt >= cl.t0 && wt <= cl.t1 && hav(s.lat, s.lon, cl.lat, cl.lon) < cl.r) { d.delay += dt * (WSLOW[cl.kind] || 0.05); if (!d.why) d.why = cl.kind; break; }
        act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: false, cid: c.cid, dwell: !!s.dwell, loop: !!(s.dwell && canPass(LN, c.line, s.idx, c.rec.d)) }); }
      { const P0 = W.player; if (P0 && !P0.finished && tNow > W.trip.t0 && LN[W.lineId]) act.push({ d: { delay: 0 }, g: refOf(LN, W.lineId, root.Sim.kmOfS(P0.x, W.dir, W.line.kmEnd)), dir: W.dir, still: false, dwell: P0.phase === 'dwell', loop: P0.phase === 'dwell' && canPass(LN, W.lineId, P0.M[P0.k].i, W.dir), me: true, cid: (function () { const r0 = W.trip.rec, s0 = r0 && r0.s.find(e => !e[3]); return s0 ? r0.d + '|' + LN[W.lineId].stations[s0[0]].jp + '|' + Math.round((s0[2] != null ? s0[2] : s0[1]) / 5) : ''; })() }); }      // tàu của người chơi cũng là vật cản (không bị chậm)
      // một đường mỗi chiều: tàu đi sau không thể vượt tàu phía trước giữa hai ga (chỉ vượt được ở ga khi tàu trước đang đỗ); tiến sát thì bị chậm dần
      const grp = new Map(); for (const a of act) { a.km = a.g.k; const g = a.g.g + a.dir; (grp.get(g) || grp.set(g, []).get(g)).push(a); }
      for (const [g, arr] of grp) { const sg = arr[0].dir === 'down' ? 1 : -1; arr.sort((x, y) => sg * (x.km - y.km));
        // tàu trước đang đỗ ở ga có đường tránh thì tàu sau mới vượt được; ga hai đường (Atami...) vẫn chặn tàu sau
        // đoàn ghép (cùng cid) chạy như một đoàn, không chặn nhau
        for (let i = 0; i < arr.length - 1; i++) { const B = arr[i]; if (B.dwell || B.still) continue; let A = null; for (let j = i + 1; j < arr.length; j++) { if (B.cid && arr[j].cid === B.cid) continue; if (!(arr[j].dwell && arr[j].loop) || arr[j].still) { A = arr[j]; break; } } if (!A) continue; const gap = sg * (A.km - B.km); if (!B.me && gap < 2.5) B.d.delay += dt * Math.min(1, (2.5 - gap) / 1.5); } }
      for (const a of act) if (!a.me && a.d._d0 !== undefined) { const r = Math.max(0, Math.min(1, (a.d.delay - a.d._d0) / dt)); a.d.rate = (a.d.rate || 0) * 0.6 + r * 0.4; }      // tỉ lệ thời gian bị chậm/chặn: tốc độ thực = tốc độ lịch × (1 − rate), giảm dần mượt
      H.lastT = tNow; }
  }
  // vật cản trước tàu người chơi cho ATC: đoàn cùng chiều, cùng đường (cùng nhóm tuyến), đang chạy hoặc dừng giữa đường (không tính tàu đang đỗ ga), gần nhất phía trước trong 15 km; cập nhật 0,5 s một lần
  function updateObstacle(W, T) {
    if (W.obsT !== undefined && W.t - W.obsT < 0.5 && W.t >= W.obsT) return; W.obsT = W.t;
    const LN = root.LINES, L = LN && LN[W.lineId]; if (!L || !W.trip) { W.obs = null; return; } if (!W.haz) init(W);
    if (W.pcid === undefined) { const r0 = W.trip.rec, s0 = r0 && r0.s.find(e => !e[3]); W.pcid = s0 ? r0.d + '|' + L.stations[s0[0]].jp + '|' + Math.round((s0[2] != null ? s0[2] : s0[1]) / 5) : ''; }      // đối tác ghép đoàn của tàu ta không phải vật cản
    const cat = build(LN), now = W.trip.t0 + W.t, sg = W.dir === 'down' ? 1 : -1, me = refOf(LN, W.lineId, root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd)), lr = W.leadRef; let best = null;
    for (const c of cat) { if (c.rec.d !== W.dir || c.rec === W.trip.rec) continue; if (W.pcid && c.cid === W.pcid) continue; if (lr && c.rec.t === lr.t && c.rec.n === lr.n && c.rec.d === lr.d) continue;
      const d = W.haz.delay.get(c.key), s = stateOf(LN, c, now - (d ? d.delay : 0)); if (!s || (s.dwell && canPass(LN, c.line, s.idx, c.rec.d))) continue; const rf = refOf(LN, c.line, s.km); if (rf.g !== me.g) continue;
      const dist = sg * (rf.k - me.k) * 1000; if (dist <= 0 || dist > 15000) continue; if (!best || dist < best.dist) best = { dist, c, d, s }; }
    if (!best) { W.obs = null; return; }
    const veh = root.Sim.VEH[best.c.rec.v] || root.Sim.VEH.N700, held = best.d && best.d.hold > 0, rate = best.d ? best.d.rate || 0 : 0;
    W.obs = { x: T.x + best.dist, len: veh.len, v: held ? 0 : (best.s.kmh || 0) * (1 - rate) / 3.6, t: W.t, label: _tl(best.c.rec.t, best.c.rec.n) };
  }
  const delayOf = (W, key) => { const d = W.haz && W.haz.delay.get(key); return d ? d : null; };
  root.NatCat = { canPass, updateObstacle, refOf, KX, VP, VS, hav, shindoAt, build, atKm, stateOf, init, step, delayOf };
})(typeof window !== 'undefined' ? window : globalThis);
