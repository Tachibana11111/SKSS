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
    const insp = {};      // mỗi loại tàu kiểm tra chỉ có một đoàn (1 Doctor Yellow, 1 East i) nên trên bản đồ chỉ hiện một chuyến mỗi loại
    for (const id of Object.keys(LN)) for (const rec of LN[id].trains) {
      if (rec.v === 'T4' || rec.v === 'E926') { if (insp[rec.v]) continue; insp[rec.v] = 1; }
      const stops = rec.s.filter(e => !e[3]).map(e => ({ i: e[0], arr: e[1], dep: e[2] })); if (stops.length < 2) continue;
      const ta = p => p.arr != null ? p.arr : p.dep, td = p => p.dep != null ? p.dep : p.arr;
      const sidx = []; rec.s.forEach((e, ix) => { if (!e[3]) sidx.push(ix); });
      CAT.push({ line: id, rec, stops, sidx, ta, td, t0: td(stops[0]) - 10, t1: ta(stops[stops.length - 1]) + 10, key: id + rec.t + rec.n + rec.d, cid: rec.d + '|' + LN[id].stations[stops[0].i].jp + '|' + Math.round(td(stops[0]) / 5) });      // cid: các đoàn cùng ga đầu, cùng chiều, cùng giờ xuất phát (±5 s) = đoàn ghép, chạy như một đoàn
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
  // ---- đoạn giữa hai ga dừng của một đoàn: tăng tốc đều, chạy đều, phanh theo đường cong ATC tới vạch dừng; ga có ghi rẽ vào đường sân ga (Sim.G.turnoutIn/Out/V) thì ≤ 80 km/h trong 1.150 m trước và 630 m sau ga như tàu thật;
  // tốc độ chạy đều tìm sao cho tổng thời gian đúng giờ biểu đồ (giờ rời/đến không đổi). Bảng (thời gian → quãng đường, tốc độ) tính một lần cho mỗi đoạn.
  const A_ACC = 0.6, SEGC = new Map();      // m/s² [I]
  function segTable(LN, c, k, kq) {
    const S = c.stops, p = S[k], q = S[kq === undefined ? k + 1 : kq], Ts = c.ta(q) - c.td(p), L = LN[c.line], D = Math.abs(L.stations[q.i].km - L.stations[p.i].km) * 1000, key = c.line + '|' + p.i + '|' + q.i + '|' + c.rec.d + '|' + Math.round(Ts);
    if (SEGC.has(key)) return SEGC.get(key); if (!(Ts > 0) || !(D > 0)) { SEGC.set(key, null); return null; }
    const Sim = root.Sim, G = Sim && Sim.G, Ly = root.Layout, A_DEC = G ? G.aATC : 0.72, dv = i => { try { const st = L.stations[i]; return !!(Ly && st && st.lay && Ly.diverts(st.lay, c.rec.d, Ly.pickOf(st, i, null))); } catch (e) { return false; } };
    const limO = G && dv(p.i) ? G.turnoutOut : 0, limI = G && dv(q.i) ? G.turnoutIn : 0, vT = G ? G.turnoutV : 80 / 3.6, N = Math.max(120, Math.min(1500, Math.round(D / 50))), dx = D / N;
    const vAt = (x, vc) => { let v = Math.min(vc, Math.sqrt(2 * A_ACC * x + 0.0001), Math.sqrt(2 * A_DEC * (D - x) + 0.0001));
      if (limO) v = Math.min(v, x < limO ? vT : Math.sqrt(vT * vT + 2 * A_ACC * (x - limO))); if (limI) v = Math.min(v, x > D - limI ? vT : Math.sqrt(vT * vT + 2 * A_DEC * (D - limI - x))); return Math.max(v, 0.3); };
    const total = vc => { let t = 0; for (let i = 0; i < N; i++) t += dx / vAt((i + 0.5) * dx, vc); return t; };
    let lo = 3, hi = 120; if (total(hi) >= Ts) lo = hi; else { for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (total(mid) > Ts) lo = mid; else hi = mid; } lo = hi; }
    const vc = lo, tt = new Float32Array(N + 1), vv = new Float32Array(N + 1); let t = 0;
    for (let i = 0; i <= N; i++) { vv[i] = i === 0 || i === N ? 0 : vAt(i * dx, vc); if (i < N) { tt[i] = t; t += dx / vAt((i + 0.5) * dx, vc); } else tt[i] = t; }
    const sc = Ts / (t || Ts); for (let i = 0; i <= N; i++) { tt[i] *= sc; vv[i] /= sc; }      // khớp đúng Ts (chuyển động chậm hơn lịch thì kéo giãn)
    const T0 = { Ts, D, N, dx, tt, vv }; SEGC.set(key, T0); return T0;
  }
  function segAt(T0, t) {      // t (giây kể từ lúc rời ga) → { f: phần quãng đường (0..1), v: m/s }
    const tt = T0.tt, N = T0.N; if (t <= 0) return { f: 0, v: 0 }; if (t >= T0.Ts) return { f: 1, v: 0 };
    let a = 0, b = N; while (b - a > 1) { const m = (a + b) >> 1; if (tt[m] <= t) a = m; else b = m; }
    const u = (t - tt[a]) / ((tt[a + 1] - tt[a]) || 1); return { f: (a + u) / N, v: T0.vv[a] + (T0.vv[a + 1] - T0.vv[a]) * u };
  }
  function segTime(T0, x) { const N = T0.N, g = Math.max(0, Math.min(N, x / T0.dx)), a = Math.min(N - 1, Math.floor(g)); return T0.tt[a] + (T0.tt[a + 1] - T0.tt[a]) * (g - a); }
  function stateOf(LN, c, now, skip) {
    if (now < c.t0 || now > c.t1) return null; const L = LN[c.line], S = c.stops, K = i => L.stations[i].km;
    const pos = i => { const s = L.stations[i]; return { lon: s.lon, lat: s.lat, idx: i }; };
    for (let k = 0; k < S.length; k++) {
      if (skip && skip.has(k) && k > 0 && k < S.length - 1) continue;      // ga được cho thông qua: không có thời gian đỗ, đoạn đi nối liền với đoạn sau
      let kq = k + 1; while (skip && skip.has(kq) && kq < S.length - 1) kq++;
      const p = S[k], q = S[kq];
      if (now >= c.ta(p) - (k === 0 ? 10 : 0) && now <= c.td(p) + (k === S.length - 1 ? 10 : 0)) { const nb = q || S[k - 1], d = L.stations[nb.i]; return Object.assign(pos(p.i), { dwell: k === 0 ? 'wait' : k === S.length - 1 ? 'end' : 'stop', k, dx: (d.lon - L.stations[p.i].lon) * KX * (q ? 1 : -1), dy: -(d.lat - L.stations[p.i].lat) * (q ? 1 : -1), km: K(p.i) }); }
      if (q && now > c.td(p) && now < c.ta(q)) { const Ts = c.ta(q) - c.td(p), T0 = segTable(LN, c, k, kq), pr = T0 ? segAt(T0, now - c.td(p)) : { f: (now - c.td(p)) / (Ts || 1), v: Math.abs(K(q.i) - K(p.i)) * 1000 / (Ts || 1) }, km = K(p.i) + (K(q.i) - K(p.i)) * pr.f, a = atKm(L, km), sg = Math.sign(K(q.i) - K(p.i)) || 1; return { lon: a.lon, lat: a.lat, idx: a.idx, dx: a.dx * sg, dy: a.dy * sg, k, nk: kq, km, moving: true, kmh: pr.v * 3.6 }; }
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
      if (p.kind === 'rain' || p.kind === 'wind') {      // ô giữ tàu (mưa ≥ 60 mm/h, gió ≥ 30 m/s): các tàu theo lịch chờ ở ga trước/tại ô tới khi hết hạn
        if (p.kind === 'wind' || p.stop) H.cells.push({ kind: p.kind, stop: true, lat: a.lat, lon: a.lon, r: p.r || 60, t0: p.at, t1: p.at + p.dur });
        if (p.kind === 'rain' && p.stopAt != null) H.cells.push({ kind: 'rain', stop: true, lat: a.lat, lon: a.lon, r: p.r || 60, t0: p.stopAt, t1: p.stopAt + p.stopDur }); }
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
  function timeAtKm(LN, c, km, skip) { const L = LN[c.line], S = c.stops; for (let k = 0; k < S.length - 1;) { let kq = k + 1; while (skip && skip.has(kq) && kq < S.length - 1) kq++; const k0 = L.stations[S[k].i].km, k1 = L.stations[S[kq].i].km; if (km >= Math.min(k0, k1) && km <= Math.max(k0, k1)) { const f = (km - k0) / ((k1 - k0) || 1); const T0 = segTable(LN, c, k, kq); return c.td(S[k]) + (T0 ? segTime(T0, f * Math.abs(k1 - k0) * 1000) : (c.ta(S[kq]) - c.td(S[k])) * f); } k = kq; } return null; }
  // tàu đi trước thật của người chơi (W.lead) có vị trí thật trong mô phỏng: ép độ trễ của đoàn đó trong danh mục sao cho vị trí theo lịch trùng vị trí thật, để giãn cách với các tàu khác tính đúng
  // tàu của ta đang vào buồng lái tàu khác (W.fgnW, chạy thật bằng mô phỏng riêng): bản sao của nó trong danh mục được kéo khớp đúng vị trí/trạng thái đỗ của tàu thật (giống tàu đi trước), nên mọi tàu khác tính giãn cách theo tàu thật;
  // còn sự giữ tàu (động đất, mưa gió) vẫn do bản sao tính (d.hold) và tàu thật tuân theo (NatMap.follow)
  // ---- sự kiện ngẫu nhiên cho MỌI đoàn trong danh mục (cùng hạt giống và độ khó với chuyến của ta): lệnh điều độ, hành khách bệnh, cửa lỗi, nhường tàu vượt, hỏng thiết bị (dừng ở ga dừng), thú va chạm, xe kẹt đường ngang (dừng giữa đường),
  // hiếm: đứt dây điện / cháy. Số sự kiện lấy theo W.diff.events (tỉ lệ theo thời gian chạy), mỗi sự kiện giữ đoàn (d.hold) một lúc rồi đoàn chạy tiếp; thời gian trễ dồn lại như các giữ tàu khác. Thiên tai/động đất/mưa gió vẫn là chung cả bản đồ.
  const strHash = str => { let x = 7; for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) % 100003; return x; };
  function planOf(W, c) {
    const P = W._evPlan || (W._evPlan = new Map()); let p = P.get(c.key); if (p) return p; p = [];
    const D = W.diff, seed = W.seed || 1, kh = strHash(c.key), h = u => hs(seed * 977 + kh, u), span = c.t1 - c.t0;
    const cp = root.Sim.coupleOf && root.Sim.coupleOf(c.rec);      // đoàn ghép (Yamabiko + Tsubasa...): chỉ đoàn Tohoku sinh sự kiện, đoàn mini nhận cùng lúc (partnerOf) để hai đoàn luôn đi chung
    if (D && D.events && span > 600 && c.rec !== W.trip.rec && !(cp && cp.role !== 'toh')) {
      const n0 = D.events[0] + Math.floor(h(1) * (D.events[1] - D.events[0] + 1)), n = Math.round(n0 * Math.min(1, span / 9000)), ST = root.Sim.INSPECT && root.Sim.INSPECT[c.rec.v] ? ['hold', 'overtake', 'planned', 'fault', 'skip'] : ['hold', 'addstop', 'sick', 'doorfault', 'overtake', 'planned', 'fault', 'skip'], RD = ['animal', 'xingcar', 'workers', 'slow'];
      for (let i = 0; i < n; i++) { const u = 10 + i * 5, at = c.t0 + span * (0.12 + 0.6 * h(u + 1));
        if (h(u) < 0.65) { const kind = ST[Math.floor(h(u + 2) * ST.length)]; p.push({ at, kind, st: 'dwell', dur: Math.round(kind === 'sick' ? 180 : kind === 'overtake' ? 90 : kind === 'skip' ? 0 : 60 + 90 * h(u + 3)) }); }
        else { const kind = RD[Math.floor(h(u + 2) * RD.length)]; if (kind === 'animal' && h(u + 3) < 0.3) p.push({ at, kind, st: 'run', dur: Math.round(360 + 240 * h(u + 4)) }); else if (kind === 'xingcar') p.push({ at, kind, st: 'run', dur: Math.round(120 + 180 * h(u + 3)) }); else if (kind === 'slow') p.push({ at, kind, st: 'run', dur: Math.round(600 + 600 * h(u + 3)) }); else if (kind === 'workers') p.push({ at, kind, st: 'run', dur: 90 }); } }
      if (h(80) < (D.rare || 0)) { const wire = h(82) < 0.5; p.push({ at: c.t0 + span * (0.2 + 0.5 * h(81)), kind: wire ? 'wire' : 'fire', st: 'run', dur: Math.round(wire ? 600 + 900 * h(83) : 900) }); }
      p.sort((a, b) => a.at - b.at);
    }
    P.set(c.key, p); return p;
  }
  const partnerOf = (W, c) => { const cp = root.Sim.coupleOf && root.Sim.coupleOf(c.rec); if (!cp) return null; const P = W._cpl || (W._cpl = new Map()); if (!P.has(c.key)) P.set(c.key, build(root.LINES).find(x => x.rec === cp.partner) || null); return P.get(c.key); };
  function applyEv(W, LN, H, c, d, s, ev, tNow) {      // một sự kiện của danh mục: dừng giữ (d.hold), chạy chậm một lúc (d.slowT), hoặc cho thông qua ga kế (d.skip); đoàn ghép: đoàn kia nhận cùng lúc
    const dd = [d], c2 = partnerOf(W, c); if (c2) { let d2 = H.delay.get(c2.key); if (!d2) { d2 = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; H.delay.set(c2.key, d2); } dd.push(d2); }
    for (const x of dd) {
      if (ev.kind === 'slow' || ev.kind === 'workers') { x.slowT = tNow + ev.dur; x.slowV = (ev.kind === 'slow' ? 170 : 230) / 3.6; x.slowK = ev.kind; }
      else if (ev.kind === 'skip') { const kn = s.k + 1, S = c.stops; if (kn < S.length - 1) { const st = (x === d ? c : c2).stops, kk = x === d ? kn : st.findIndex(e => e.i === S[kn].i); if (kk > 0 && kk < st.length - 1) (x.skip || (x.skip = new Set())).add(kk); } }
      else if (!(x.hold > 0)) { x.hold = ev.dur; x.why = ev.kind; }
    }
  }
  // tàu vào buồng lái từ bản đồ: các sự kiện của danh mục dành cho tàu này (chưa xảy ra) được đưa vào thế giới riêng của nó, tàu tự lái xử lý (còi, nhắc lệnh, đóng cửa, hộp thoại); khi sự kiện xảy ra ở đó thì bản đồ không lặp lại
  function bindEvents(Wc, Wh) {
    const c = Wc.fgn && Wc.fgn.c; if (!c || !Wh) return; step(Wh); if (!Wh.haz) return; const nowAbs = Wh.trip.t0 + Wh.t;
    for (const ev of planOf(Wh, c)) { if (ev.done) continue; const e = { at: Math.max(ev.at, nowAbs) - Wc.trip.t0, abs: true, done: false };
      e.fire = w => { if (ev.done) return; if (root.Sim.fgnEvent(w, ev.kind, ev.dur)) { ev.done = true; if (ev.kind === 'skip' && w._lastSkip !== undefined) { let d = Wh.haz.delay.get(c.key); if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; Wh.haz.delay.set(c.key, d); } const kk = c.stops.findIndex(x => x.i === w._lastSkip); if (kk > 0 && kk < c.stops.length - 1) (d.skip || (d.skip = new Set())).add(kk); } } else { e.done = false; e.at = w.t + 5; } };
      Wc.events.push(e); }
  }
  function alignFgn(W, LN, H, tNow) {
    const Wf = W.fgnW, Tf = Wf && Wf.player, c = Wf && Wf.fgn && Wf.fgn.c; if (!Tf || !c || Tf.finished) return;
    let d = H.delay.get(c.key); if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; H.delay.set(c.key, d); }
    if (Tf.phase === 'dwell') { const m = Tf.M[Math.min(Tf.k, Tf.M.length - 1)], p = c.stops.find(e => m && e.i === m.i); if (p) { d.delay = tNow - Math.min(c.td(p) - 1, c.ta(p) + Math.max(0, Tf.dwellT)); d.rate = 0; return; } }
    const t = timeAtKm(LN, c, root.Sim.kmOfS(Tf.x, Wf.dir, Wf.line.kmEnd), d.skip); if (t != null) { d.delay = tNow - t; d.rate = 0; }
  }
  function alignLead(W, LN, H, tNow) {
    const Ld = W.lead, lr = W.leadRef; if (!Ld || !lr || Ld.phase !== 'run') return;
    if (W._leadC === undefined) W._leadC = build(LN).find(c => c.rec.t === lr.t && c.rec.n === lr.n && c.rec.d === lr.d) || null; const c = W._leadC; if (!c || !LN[W.lineId]) return;
    const kmP = root.Sim.kmOfS(Ld.x, W.dir, W.line.kmEnd); let km = kmP; if (c.line !== W.lineId) { km = fromRef(LN, c.line, refOf(LN, W.lineId, kmP)); if (km == null) return; }
    const t = timeAtKm(LN, c, km); if (t == null) return; let d = H.delay.get(c.key); if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; H.delay.set(c.key, d); } d.delay = tNow - t; d.hold = 0;
  }
  // Giữ tàu theo lịch trước ô giữ tàu (mưa ≥ 60 mm/h, gió ≥ 30 m/s), cùng quy tắc với tàu của người chơi: chờ ở ga NGAY TRƯỚC đoạn chạm ô.
  // Các ga phía trước tính cả ga chạy thông qua (rec.s): đoàn đang chạy bị dừng ở ga đó (vị trí đóng băng sát ga), đoàn đang đứng ga (kể cả ga xuất phát) tới giờ rời ga mà chặng đầu đã chạm ô thì ở lại.
  const segTouches = (a, b, cl) => { const n = Math.max(1, Math.ceil(hav(a.lat, a.lon, b.lat, b.lon) / 20)); for (let q = 0; q <= n; q++) { const f = q / n; if (hav(a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f, cl.lat, cl.lon) < cl.r) return true; } return false; };
  function gateFor(LN, c, s, eff, wt, H, d) {
    if (s.dwell === 'end') return; const q = c.stops[s.k + 1]; if (!q) return;
    let act = null; for (const cl of H.cells) if (cl.stop && wt >= cl.t0 && wt <= cl.t1) (act = act || []).push(cl); if (!act) return;
    const L = LN[c.line], p = c.stops[s.k], sg = Math.sign(L.stations[q.i].km - L.stations[p.i].km) || 1, A = [];
    for (let i = c.sidx[s.k] + (s.dwell ? 1 : 0); i <= c.sidx[s.k + 1]; i++) { const st = L.stations[c.rec.s[i][0]]; if (s.dwell || sg * (st.km - s.km) > 0.05) A.push(st); }
    if (!A.length) return;
    const cur = { lat: s.lat, lon: s.lon }; let best = null;      // đoạn đầu tiên chạm ô: j = 0 là từ vị trí hiện tại tới ga phía trước đầu tiên
    for (const cl of act) for (let j = 0; j < A.length; j++) { if (segTouches(j ? A[j - 1] : cur, A[j], cl)) { if (!best || j < best.j || (j === best.j && cl.t1 > best.cl.t1)) best = { j, cl }; break; } }
    if (!best) return;
    if (s.dwell) { if (best.j === 0 && eff >= c.td(p) - 6) { d.hold = Math.max(1, best.cl.t1 - wt); d.why = best.cl.kind; } return; }
    const tg = best.j ? A[best.j - 1] : A[0];
    if (sg * (tg.km - s.km) <= 0.45) { d.hold = Math.max(1, best.cl.t1 - wt); d.why = best.cl.kind; }      // tới sát ga đích: dừng (đóng băng) ở đó tới khi ô hết hạn
  }
  // ga cho phép vượt tàu đang đỗ: có đường thông qua, hoặc có từ 2 đường dừng cùng chiều (tàu sau vào đường dừng còn trống)
  function canPass(LN, line, idx, dir) { const st = LN[line] && LN[line].stations[idx]; if (!st) return false; if (st.loop) return true; const LY = root.Layout; return !!(LY && LY.stopCount && LY.stopCount(st.lay || '2-2-0', dir) >= 2); }
  // khởi động trước: chạy cơ chế giãn cách từ WARM giây trước giờ xuất phát để các tàu đã sát nhau (lịch nội suy cho vượt nhau giữa hai ga) được giữ thứ tự và chỉ vượt ở ga có đường tránh; trong lúc đó chưa tính tàu của người chơi
  const WARM = 1800, WSLOW = { rain: 0.06, snow: 0.09, wind: 0.2 };
  // cập nhật độ trễ tới giờ hiện tại của game (bước 5 s; mở bản đồ muộn thì tự bù từ đầu chuyến)
  function step(W) {
    if (W.fgn) return;      // thế giới của tàu vào buồng lái từ bản đồ dùng bản đồ của tàu ta (không tự cập nhật)
    const LN = root.LINES; if (!LN || !W.trip) return; if (!W.haz) init(W); const H = W.haz, cat = build(LN), end = W.trip.t0 + W.t;
    while (H.lastT < end - 0.01) { const dt = Math.min(5, end - H.lastT), tNow = H.lastT + dt, wt = tNow - W.trip.t0, act = []; if (tNow >= W.trip.t0) alignLead(W, LN, H, tNow); alignFgn(W, LN, H, tNow);
      for (const c of cat) { let d = H.delay.get(c.key); const eff = tNow - (d ? d.delay : 0); if (eff < c.t0 || eff > c.t1) continue;
        if (!d) { d = { delay: 0, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; H.delay.set(c.key, d); }
        d._d0 = d.delay;
        if (d.sacc > 0 && d.hold <= 0) { const rc = Math.min(d.sacc, dt * 0.25); d.delay -= rc; d.sacc -= rc; }      // phần chậm do chờ tránh tàu trên đường đơn được bù dần (chạy nhanh hơn lịch ~25%) để trễ không dồn lại cả ngày
        const s = stateOf(LN, c, eff, d.skip); if (!s) continue; if (d.hold > 0) { act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: true, cid: c.cid, c, s, eff }); d.hold -= dt; d.delay += dt; if (d.why === 'single') d.sacc = (d.sacc || 0) + dt; continue; }
        if (c !== W._leadC) { const plan = planOf(W, c); for (const ev of plan) { if (ev.done || tNow < ev.at) continue; if (ev.st === 'dwell' ? s.dwell !== 'stop' : (s.dwell || !s.moving)) continue; ev.done = true; applyEv(W, LN, H, c, d, s, ev, tNow); break; } }
        if (d.hold > 0) { act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: true, cid: c.cid, c, s, eff }); d.hold -= dt; d.delay += dt; continue; }
        for (let qi = 0; qi < H.quakes.length; qi++) { const q = H.quakes[qi]; if (d.hit[qi] || wt < q.t) continue; const R = hav(s.lat, s.lon, q.lat, q.lon), tS = q.t + Math.hypot(R, q.depth) / VS;
          if (wt >= tS) { d.hit[qi] = 1; const sh = shindoAt(q, R); if (sh >= 4) { const h0 = (sh >= 5 ? 900 : 420) * (0.8 + hs(qi, c.rec.n | 0) * 0.5) - (wt - tS); if (h0 > 0) { d.hold = h0; d.why = 'eqk'; d.shake = wt; } } } }      // đoàn xuất hiện muộn sau trận động đất (kể cả ngay ở ga xuất phát) chỉ bị giữ phần còn lại
        if (d.hold <= 0 && c !== W._leadC) gateFor(LN, c, s, eff, wt, H, d);      // (bản sao của tàu đi trước thật do alignLead ép khớp với mô phỏng, không giữ theo ô)      // mưa/gió giữ tàu: chờ ở ga (kể cả ga xuất phát, ga chạy thông qua) trước ô giữ tàu tới khi hết hạn
        if (d.hold <= 0 && !s.dwell) { let rt = 0, rk = null; if (d.slowT > tNow && s.kmh > d.slowV * 3.6) { rt = 1 - d.slowV * 3.6 / s.kmh; rk = d.slowK; } for (const cl of H.cells) if (wt >= cl.t0 && wt <= cl.t1 && hav(s.lat, s.lon, cl.lat, cl.lon) < cl.r) { const q = cl.kind === 'rain' && cl.t0 > -1e8 && cl.t1 < 1e8 && s.kmh > 70 ? 1 - 70 / s.kmh : (WSLOW[cl.kind] || 0.05); if (q > rt) { rt = q; rk = cl.kind; } } if (rk) { d.delay += dt * rt; if (!d.why) d.why = rk; } }      // nhiều ô chồng nhau: lấy ô chậm nhất; ô mưa của kế hoạch chuyến (chạy chậm 70 km/h như quy định) không bị ô thời tiết chung che mất
        act.push({ d, g: refOf(LN, c.line, s.km), dir: c.rec.d, still: false, cid: c.cid, dwell: !!s.dwell, loop: !!(s.dwell && canPass(LN, c.line, s.idx, c.rec.d)), c, s, eff }); }
      { const P0 = W.player; if (P0 && !P0.foreign && !P0.finished && tNow > W.trip.t0 && LN[W.lineId]) act.push({ d: { delay: 0 }, g: refOf(LN, W.lineId, root.Sim.kmOfS(P0.x, W.dir, W.line.kmEnd)), dir: W.dir, still: false, dwell: P0.phase === 'dwell', loop: P0.phase === 'dwell' && canPass(LN, W.lineId, P0.M[P0.k].i, W.dir), me: true, cid: (function () { const r0 = W.trip.rec, s0 = r0 && r0.s.find(e => !e[3]); return s0 ? r0.d + '|' + LN[W.lineId].stations[s0[0]].jp + '|' + Math.round((s0[2] != null ? s0[2] : s0[1]) / 5) : ''; })() }); }      // tàu của người chơi cũng là vật cản (không bị chậm)
      // một đường mỗi chiều: tàu đi sau không thể vượt tàu phía trước giữa hai ga (chỉ vượt được ở ga khi tàu trước đang đỗ); tiến sát thì bị chậm dần
      const grp = new Map(); for (const a of act) { a.km = a.g.k; const g = a.g.g + a.dir; (grp.get(g) || grp.set(g, []).get(g)).push(a); }
      for (const [g, arr] of grp) { const sg = arr[0].dir === 'down' ? 1 : -1; arr.sort((x, y) => sg * (x.km - y.km));
        // tàu trước đang đỗ ở ga có đường tránh thì tàu sau mới vượt được; ga hai đường (Atami...) vẫn chặn tàu sau
        // đoàn ghép (cùng cid) chạy như một đoàn, không chặn nhau
        for (let i = 0; i < arr.length - 1; i++) { const B = arr[i]; if (B.dwell || B.still) continue; let A = null; for (let j = i + 1; j < arr.length; j++) { if (B.cid && arr[j].cid === B.cid) continue; if (!(arr[j].dwell && arr[j].loop) || arr[j].still) { A = arr[j]; break; } } if (!A) continue; const gap = sg * (A.km - B.km); if (!B.me && gap < 2.5) B.d.delay += dt * Math.min(1, (2.5 - gap) / 1.5); } }
      singleStep(LN, act, H, tNow, dt, W);
      for (const a of act) if (!a.me && a.d._d0 !== undefined && a.d.delay - a.d._d0 > dt) a.d.delay = a.d._d0 + dt;      // độ trễ không tăng nhanh hơn thời gian thực (chặn giãn cách + mưa/gió cộng dồn từng làm vị trí theo lịch lùi về phía Tokyo: mũi tên tàu trên bản đồ chạy ngược)
      for (const a of act) if (!a.me && a.d._d0 !== undefined) { const r = Math.max(0, Math.min(1, (a.d.delay - a.d._d0) / dt)); a.d.rate = (a.d.rate || 0) * 0.6 + r * 0.4; }      // tỉ lệ thời gian bị chậm/chặn: tốc độ thực = tốc độ lịch × (1 − rate), giảm dần mượt
      H.lastT = tNow; }
  }
  // Đường đơn (Yamagata, Akita phần mini-Shinkansen): giữa hai ga kề nhau chỉ một chiều được chiếm. Chỉ xét giữa TÀU CỦA NGƯỜI CHƠI và các đoàn trong danh mục (các đoàn danh mục không chờ nhau: giờ phần mini là ước tính [I] nên chúng
  // hay gặp nhau giữa đường, chặn nhau sẽ làm trễ dồn cả ngày): người chơi đã rời ga vào đoạn nào thì tàu ngược chiều tới sau bị giữ ở ga (dừng sát ga); tàu ngược chiều đang ở trong đoạn thì người chơi phải chờ ở ga (Sim.departBlock → singleBusy).
  // Nhờ vậy hai tàu ngược chiều gặp nhau ở ga chứ không chạy xuyên qua nhau giữa hai ga.
  function singleStep(LN, act, H, tNow, dt, W) {
    H.segOwner = {}; const line = W.lineId; if (line !== 'aki' && line !== 'yam') return; const L = LN[line]; if (!L || !L.single || !L.single.length) return;
    H.claim = H.claim || {}; const S = L.stations, cl = H.claim[line] || (H.claim[line] = {}), cc = H.cclaim = H.cclaim || {}, mine = new Map(), cat = { down: new Map(), up: new Map() };
    const segOf = km => { for (let i = 0; i < S.length - 1; i++) if (km >= S[i].km - 1e-4 && km <= S[i + 1].km + 1e-4) return i; return -1; };
    const single = i => i >= 0 && i < S.length - 1 && L.single.some(([a, b]) => Math.min(S[i + 1].km, b) - Math.max(S[i].km, a) > 0.05), M = 0.2;
    const ent = act.filter(a => a.c ? (a.c.line === line && a.c.rec !== W.trip.rec) : a.me), lab = a => a.me ? null : root.Sim.labelAt(a.c.rec, a.km);
    for (const a of ent) { a.km = a.c ? a.s.km : a.g.k; const i = segOf(a.km); if (i < 0 || !single(i) || a.dwell || (a.d.hold > 0 && a.d.why === 'single')) continue;
      if (a.km > S[i].km + 0.02 && a.km < S[i + 1].km - 0.02) { if (a.me) mine.set(i, { dir: a.dir }); else cat[a.dir].set(i, { dir: a.dir, label: lab(a) }); } }
    for (const k of Object.keys(cl)) { if (tNow - cl[k].t > 25) { delete cl[k]; continue; } if (!mine.has(+k)) mine.set(+k, { dir: cl[k].dir }); }
    { const it = H.intent; if (it && it.line === line && tNow - it.t < 20 && !mine.has(it.seg)) mine.set(it.seg, { dir: it.dir }); }      // người chơi đang chờ ở ga để vào đoạn này: tàu ngược chiều chưa vào đoạn phải nhường (tránh để người chơi chờ mãi khi tàu ngược chiều nối đuôi nhau)
    for (const k of Object.keys(cc)) { if (tNow - cc[k].t > 25) { delete cc[k]; continue; } if (!cat[cc[k].dir].has(cc[k].seg)) cat[cc[k].dir].set(cc[k].seg, { dir: cc[k].dir, label: cc[k].label }); }
    for (const a of ent) {
      if (a.me) continue; const i = segOf(a.km); if (i < 0) continue; let j = -1, ready = false;
      if (a.dwell || (a.s && a.s.dwell)) { if (a.s.dwell === 'end') continue; j = S.findIndex(st => Math.abs(st.km - a.km) < 0.15); const p = a.c.stops[a.s.k]; ready = !!p && a.eff + 2 * dt >= a.c.td(p) - 6; }      // nhìn trước 2 nhịp: giữ tàu trước khi nó kịp nhích khỏi ga
      else if (!a.still || a.d.why === 'single') { const jj = a.dir === 'down' ? i + 1 : i; if (jj >= 0 && jj < S.length && Math.abs(S[jj].km - a.km) <= M) { j = jj; ready = true; } }
      if (j < 0 || !ready) continue; const nx = a.dir === 'down' ? j : j - 1; if (!single(nx)) continue;
      const o = mine.get(nx);
      if (o && o.dir !== a.dir) { a.d.hold = Math.max(a.d.hold, 12); a.d.why = 'single'; }
      else { if (a.d.why === 'single' && a.d.hold > 0) { a.d.hold = 0; a.d.why = ''; } const ck = nx + a.dir; if (!cat[a.dir].has(nx)) { cat[a.dir].set(nx, { dir: a.dir, label: lab(a) }); cc[ck] = { seg: nx, dir: a.dir, t: tNow, label: lab(a) }; } }      // đoạn không bị người chơi chiếm: tàu danh mục đi vào và giữ đoạn cho người chơi biết
    }
    H.segOwner[line] = cat;
  }
  // tàu của người chơi sắp rời ga vào đoạn đường đơn: có tàu danh mục ngược chiều đang chiếm đoạn đó thì trả về tên tàu đó (không thì null); mức nhìn trước cho cả ga đang tới (đường đơn phía sau ga tới)
  function singleBusy(W, T, k) {
    const H = W.haz, line = W.lineId, o = H && H.segOwner && H.segOwner[line]; if (!o || (line !== 'aki' && line !== 'yam')) return null;
    const m = T.M[k === undefined ? T.k : k]; if (!m || m.i === undefined) return null; const nx = W.dir === 'down' ? m.i : m.i - 1, e = o[W.dir === 'down' ? 'up' : 'down'].get(nx); if (e) H.intent = { line, seg: nx, dir: W.dir, t: W.trip.t0 + W.t }; return e ? (e.label || '?') : null;
  }
  function playerClaim(W, T) {
    const H = W.haz, line = W.lineId; if (!H || (line !== 'aki' && line !== 'yam')) return; const m = T.M[T.k]; if (!m || m.i === undefined) return;
    H.claim = H.claim || {}; (H.claim[line] = H.claim[line] || {})[W.dir === 'down' ? m.i : m.i - 1] = { dir: W.dir, t: W.trip.t0 + W.t };
  }
  // vật cản trước tàu người chơi cho ATC: đoàn cùng chiều, cùng đường (cùng nhóm tuyến), đang chạy hoặc dừng giữa đường (không tính tàu đang đỗ ga), gần nhất phía trước trong 15 km; cập nhật 0,5 s một lần
  function updateObstacle(W, T) {
    if (W.obsT !== undefined && W.t - W.obsT < 0.5 && W.t >= W.obsT) return; W.obsT = W.t;
    const LN = root.LINES, L = LN && LN[W.lineId]; if (!L || !W.trip) { W.obs = null; return; } if (!W.haz) init(W);
    if (W.pcid === undefined) { const r0 = W.trip.rec, s0 = r0 && r0.s.find(e => !e[3]); W.pcid = s0 ? r0.d + '|' + L.stations[s0[0]].jp + '|' + Math.round((s0[2] != null ? s0[2] : s0[1]) / 5) : ''; }      // đối tác ghép đoàn của tàu ta không phải vật cản
    const cat = build(LN), now = W.trip.t0 + W.t, sg = W.dir === 'down' ? 1 : -1, me = refOf(LN, W.lineId, root.Sim.kmOfS(T.x, W.dir, W.line.kmEnd)), lr = W.leadRef; let best = null;
    for (const c of cat) { if (c.rec.d !== W.dir || c.rec === W.trip.rec || (W.fgn && W.home && c.rec === W.home.W.trip.rec)) continue; if (W.pcid && c.cid === W.pcid) continue; if (lr && c.rec.t === lr.t && c.rec.n === lr.n && c.rec.d === lr.d) continue;
      const d = delayOf(W, c.key), s = stateOf(LN, c, now - (d ? d.delay : 0), d && d.skip); if (!s || (s.dwell && canPass(LN, c.line, s.idx, c.rec.d))) continue; if (root.Sim.dupHidden(c.rec, s.km)) continue; const rf = refOf(LN, c.line, s.km); if (rf.g !== me.g) continue;
      const dist = sg * (rf.k - me.k) * 1000; if (dist <= 0 || dist > 15000) continue; if (!best || dist < best.dist) best = { dist, c, d, s }; }
    if (W.fgn && W.home) { const Wh = W.home.W, Th = Wh.player;      // tàu của ta (chạy nền) cũng là vật cản thật của tàu đang ngồi, ở vị trí thật chứ không phải bản sao theo lịch
      if (Th && !Th.finished && Wh.dir === W.dir && !(Th.phase === 'dwell' && canPass(LN, Wh.lineId, Th.M[Math.min(Th.k, Th.M.length - 1)].i, Wh.dir))) { const rfh = refOf(LN, Wh.lineId, root.Sim.kmOfS(Th.x, Wh.dir, Wh.line.kmEnd)), dist = sg * (rfh.k - me.k) * 1000;
        if (rfh.g === me.g && dist > 0 && dist < 15000 && (!best || dist < best.dist)) best = { dist, home: Th, Wh }; } }
    if (best && best.home) { const Th = best.home; W.obs = { x: T.x + best.dist, key: Th.veh.key, dw: Th.phase === 'dwell', len: Th.veh.len, v: Th.v, t: W.t, label: best.Wh.trip.label }; return; }
    if (!best) { W.obs = null; return; }
    const veh = root.Sim.VEH[root.Sim.vehAt(best.c.rec, best.s.km)] || root.Sim.VEH[best.c.rec.v] || root.Sim.VEH.N700, held = best.d && best.d.hold > 0, rate = best.d ? best.d.rate || 0 : 0;
    W.obs = { x: T.x + best.dist, key: root.Sim.vehAt(best.c.rec, best.s.km), dw: !!best.s.dwell, len: veh.len, v: held ? 0 : (best.s.kmh || 0) * (1 - rate) / 3.6, t: W.t, label: root.Sim.labelAt(best.c.rec, best.s.km) };
  }
  const delayOf = (W, key) => { const H = W.fgn && W.home ? W.home.W.haz : W.haz, d = H && H.delay.get(key); return d ? d : null; };      // tàu vào buồng lái từ bản đồ: tàu khác (ngược chiều, đỗ ga, thông qua) theo độ trễ/giữ của bản đồ của tàu ta
  root.NatCat = { bindEvents, canPass, updateObstacle, refOf, KX, VP, VS, hav, shindoAt, build, atKm, stateOf, init, step, delayOf, singleBusy, playerClaim };
})(typeof window !== 'undefined' ? window : globalThis);
