// Bố trí đường và sân ga của một ga (số sân, số đường, đường thông qua, sân đảo/hai bên) và hình học dọc tuyến (đường cong, cao độ).
// Mã ga 'sân-đường-thông qua' lấy từ data-lines.js (Wikipedia JP, xem tools/build_struct.py). Kiểu sân đảo/hai bên chỉ có nguồn ở vài ga; phần còn lại là suy luận [I].
// Chuỗi bố trí viết theo chiều chạy XUỐNG (km tăng), trái -> phải khi nhìn từ buồng lái; Nhật chạy bên trái nên đường xuống nằm bên trái đường lên.
//   d/u = đường dừng chiều xuống/lên, D/U = đường thông qua chiều xuống/lên, P = sân ga.
(function (root) {
  const TOK = { '2-2-0': 'PduP', '2-2-1': 'PdDUuP', '2-3-1': 'PdDUuPu', '2-3-0': 'PduPu', '2-4-0': 'dPduPu', '2-4-1': 'dPdDUuPu', '1-2-1': 'DdPuU', '3-6-0': 'dPddPuuPu', '5-8-0': 'PdPddPduPuuPu', '1-2-0': 'dPu', '3-4-0': 'PdPduPu' };
  const ADJ = -4.3, TRK_GAP = 4.3, EDGE = 1.75, ISLAND = 7.2, SIDE = 9.0;       // toạ độ mô hình: X dương = phía "sân ga của đường ta"; đường ngược chiều gần nhất ở X = ADJ
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // chuỗi theo chiều chạy của tàu: chiều lên thì đảo trái-phải và đổi d<->u
  function tokens(code, dir) {
    let s = TOK[code] || TOK['2-2-0'];
    if (dir === 'up') s = s.split('').reverse().map(c => ({ d: 'u', u: 'd', D: 'U', U: 'D' }[c] || c)).join('');
    return s;
  }
  // pick: chọn đường dừng khi có nhiều đường (số nguyên). Trả về {tracks, plats, ref, opp, stops, ours}
  function station(code, dir, pick, rev) {      // rev: nhìn NGƯỢC chiều chạy (camera sau): đảo thứ tự trái-phải, giữ nguyên vai trò đường ta / đường ngược chiều
    const s = rev ? tokens(code, dir).split('').reverse().join('') : tokens(code, dir), n = s.length, isT = i => s[i] !== 'P', width = i => (i > 0 && i < n - 1 && isT(i - 1) && isT(i + 1)) ? ISLAND : (i === 0 || i === n - 1) ? SIDE : ISLAND;
    const c = [0];
    for (let i = 1; i < n; i++) c[i] = c[i - 1] + (isT(i) && isT(i - 1) ? TRK_GAP : EDGE + width(isT(i) ? i - 1 : i) / 2);
    const idxT = []; for (let i = 0; i < n; i++) if (isT(i)) idxT.push(i);
    const lc = ch => ch.toLowerCase();
    let ref = idxT.find(i => s[i] === 'D');
    const oppIdx = idxT.filter(i => lc(s[i]) === 'u'), ownIdx = idxT.filter(i => lc(s[i]) === 'd');
    if (ref === undefined) ref = ownIdx.reduce((b, i) => Math.min(...oppIdx.map(o => Math.abs(c[o] - c[i]))) < Math.min(...oppIdx.map(o => Math.abs(c[o] - c[b]))) ? i : b, ownIdx[0]);
    const opp = idxT.find(i => s[i] === 'U') !== undefined ? idxT.find(i => s[i] === 'U') : oppIdx.reduce((b, i) => Math.abs(c[i] - c[ref]) < Math.abs(c[b] - c[ref]) ? i : b, oppIdx[0]);
    const X = i => -(c[i] - c[ref]);                           // X dương = bên trái màn hình (trước khi lật)
    const tracks = idxT.map(i => ({ i, x: X(i), c: s[i], own: lc(s[i]) === 'd', thr: s[i] === 'D' || s[i] === 'U', plain: lc(s[i]) === 'd' ? 0 : (rev ? -ADJ : ADJ), main: i === ref || i === opp }));
    // ghi thật: mỗi đường rẽ khỏi cặp đường chính bằng một ghi riêng, lần lượt từ đường gần ra đường xa (cách nhau ~85 m); dịch ngang 1 m mất ~13 m chiều dài (ghi #12), nên đường ga thoát ra nhanh và gọn
    { const outer = tracks.filter(t => !t.main).sort((a, b) => Math.abs(a.x - a.plain) - Math.abs(b.x - b.plain));
      outer.forEach((t, k) => { const dx = Math.abs(t.x - t.plain); t.len = clamp(13 * dx + 25, 40, 300); t.in0 = 1130 - 85 * k; t.out0 = 40 + 70 * (outer.length - 1 - k); t.rank = k; }); }
    const oppT = tracks.find(t => t.i === opp);
    const plats = []; for (let i = 0; i < n; i++) if (!isT(i)) { const w = width(i); plats.push({ xa: X(i) - w / 2, xb: X(i) + w / 2, side: i === 0 || i === n - 1 }); }
    // đường dừng của ta: đường chiều ta (d) có sân ga kề bên
    const stops = tracks.filter(t => t.own && !t.thr && plats.some(p => Math.abs(Math.min(Math.abs(p.xa - t.x), Math.abs(p.xb - t.x)) - EDGE) < 0.01));
    if (!stops.length) tracks.filter(t => t.own).forEach(t => stops.push(t));
    const ours = pick === -1 ? (stops.find(t => !t.main) || stops[0]) : pick && typeof pick === 'object' ? (tracks.find(t => t.i === pick.i) || stops[0]) : stops[Math.abs(pick | 0) % stops.length];       // pick là đối tượng {i}: ép chọn đúng đường theo chỉ số trong chuỗi bố trí (camera sau)
    // sân ga kề đường dừng của ta
    const plat = plats.find(p => Math.abs(Math.min(Math.abs(p.xa - ours.x), Math.abs(p.xb - ours.x)) - EDGE) < 0.01) || null;
    const platSign = plat ? ((plat.xa + plat.xb) / 2 > ours.x ? 1 : -1) : 1;
    return { code, dir, tracks, plats, stops, ref, opp: X(opp), oppT, ours, plat, platSign, extent: [Math.min(...tracks.map(t => t.x), ...plats.map(p => p.xa)), Math.max(...tracks.map(t => t.x), ...plats.map(p => p.xb))] };
  }
  // trọng số "đã chia ra các đường của ga" tại vị trí s (m): 0 ở xa, 1 trong phạm vi sân ga; sM = vị trí vạch dừng
  // mức "đã toả hết" của cả ga (theo đường ngoài cùng): dùng cho bề rộng hành lang; từng đường có trackW riêng (ghi riêng)
  const spread = (s, sM) => smooth(sM - 760, sM - 430, s) * (1 - smooth(sM + 40, sM + 380, s));
  const trackW = (t, s, sM) => t.in0 === undefined ? 1 : smooth(sM - t.in0, sM - t.in0 + t.len, s) * (1 - smooth(sM + t.out0, sM + t.out0 + t.len, s));

  // đường cong: bảng [km0, km1, R, sg] theo km; trả về độ cong (1/m, dương = rẽ phải theo chiều chạy) tại s (m dọc tuyến theo chiều chạy)
  function curvatureAt(L, Sim, dir, s) {
    const km = Sim.kmOfS(s, dir, L.kmEnd);
    for (const [a, b, R, sg] of L.curves || []) if (km >= a && km < b) return (dir === 'up' ? -sg : sg) / R;
    return 0;
  }
  // ---- Hồ sơ hình học tính MỘT LẦN cho cả tuyến theo từng chiều (ô 10 m): hướng θ(s), tích phân Θ(s) và cao độ; mọi bảng ngang/cao độ lấy từ đây
  // (trước đây mỗi khung hình dò lại danh sách đường cong/kết cấu hàng trăm lần: tốn vài ms và là một nguồn giật ở đoạn cong)
  const _prof = new WeakMap(), CELL = 10;
  function profile(L, Sim, dir) {
    let m = _prof.get(L); if (!m) _prof.set(L, m = {}); if (m[dir]) return m[dir];
    const Lm = L.kmEnd * 1000, n = Math.ceil(Lm / CELL) + 8, kc = new Float64Array(n), th = new Float64Array(n + 1), Th = new Float64Array(n + 1), raw = new Float64Array(n), el = new Float64Array(n);
    raw.fill(ELEV.g);
    const rng = (a, b) => dir === 'up' ? [(L.kmEnd - b) * 1000, (L.kmEnd - a) * 1000] : [a * 1000, b * 1000];
    for (const [a, b, R, sg] of L.curves || []) { const [s0, s1] = rng(a, b), v = (dir === 'up' ? -sg : sg) / R; for (let j = Math.max(0, Math.floor(s0 / CELL)); j < Math.min(n, Math.ceil(s1 / CELL)); j++) { const ov = Math.min(s1, (j + 1) * CELL) - Math.max(s0, j * CELL); if (ov > 0) kc[j] += v * ov / CELL; } }      // độ cong trung bình trong ô (đường cong không trùng biên ô)
    for (const [a, b, k] of L.struct || []) { const [s0, s1] = rng(a, b), v = ELEV[k] || 0; for (let j = Math.max(0, Math.floor(s0 / CELL)); j < Math.min(n, Math.ceil(s1 / CELL)); j++) raw[j] = v; }
    for (let j = 0; j < n; j++) { th[j + 1] = th[j] + kc[j] * CELL; Th[j + 1] = Th[j] + th[j] * CELL + 0.5 * kc[j] * CELL * CELL; }
    const pre = new Float64Array(n + 1); for (let j = 0; j < n; j++) pre[j + 1] = pre[j] + raw[j]; const r = 8;
    for (let j = 0; j < n; j++) { const a = Math.max(0, j - r), b = Math.min(n - 1, j + r); el[j] = (pre[b + 1] - pre[a]) / (b - a + 1); }
    return (m[dir] = { th, Th, kc, el, n });
  }
  const at = (arr, s) => { const f = Math.max(0, s) / CELL, j = Math.min(arr.length - 2, Math.floor(f)), t = f - j; return arr[j] + (arr[j + 1] - arr[j]) * t; };
  const atTh = (P, s) => { s = Math.max(0, s); const j = Math.min(P.n - 1, Math.floor(s / CELL)), d = s - j * CELL; return P.th[j] + P.kc[j] * d; };                                  // hướng θ(s) (chính xác trong ô)
  const atThh = (P, s) => { s = Math.max(0, s); const j = Math.min(P.n - 1, Math.floor(s / CELL)), d = s - j * CELL; return P.Th[j] + P.th[j] * d + 0.5 * P.kc[j] * d * d; };    // Θ(s)
  // độ cong trung bình trong cửa sổ ±half quanh s (1/m): làm mượt chỗ vào/ra cong (đường cong là cung tròn nên độ cong nhảy bậc; ngoài đời có đoạn chuyển tiếp)
  function curvatureSmooth(L, Sim, dir, s, half) { const P = profile(L, Sim, dir); return (atTh(P, s + half) - atTh(P, s - half)) / (2 * half); }
  // độ lệch ngang (m, dương = sang TRÁI màn hình: cùng dấu X mô hình) của đường tại khoảng cách z phía trước so với phương nhìn hiện tại, bảng mỗi `step` m
  function lateralTable(L, Sim, dir, x, zmax, step) {
    const P = profile(L, Sim, dir), n = Math.ceil(zmax / step) + 1, out = new Float32Array(n), t0 = at(P.th, x), T0 = at(P.Th, x);
    for (let i = 1; i < n; i++) { const z = i * step, s = x + z; out[i] = -(at(P.Th, s) - T0 - t0 * z); }
    return out;
  }
  // độ lệch ngang của đường PHÍA SAU tàu (khoảng cách z = i·step phía sau đầu tàu), cùng quy ước dấu với lateralTable (dương = bên trái hướng đi).
  // Tàu đang trong đường cong thì đoạn đường phía sau cũng cong.
  function lateralTableBack(L, Sim, dir, x, zmax, step) {
    const P = profile(L, Sim, dir), n = Math.ceil(zmax / step) + 1, out = new Float32Array(n), t0 = at(P.th, x), T0 = at(P.Th, x);
    for (let i = 1; i < n; i++) { const u = i * step, s = x - u; out[i] = -(t0 * u - (T0 - at(P.Th, s))); }
    return out;
  }
  // cao độ tuyến so với mặt đất quanh đó (m): nền 2, cầu cạn 9, cầu 13, hầm 0; chuyển tiếp mượt
  const ELEV = { g: 2, v: 9, b: 13, t: 0 };
  function elevTable(L, Sim, dir, x, zmax, step) {
    const P = profile(L, Sim, dir), n = Math.ceil(zmax / step) + 1, out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = at(P.el, x + i * step);
    return out;
  }
  // tàu dừng ở ga này phải rẽ ghi sang đường sân ga (đường dừng khác đường chính)? [I theo bố trí]
  const _div = {};
  function diverts(code, dir, pick) { const k = code + dir + pick; if (_div[k] === undefined) _div[k] = station(code, dir, pick).ours.x !== 0; return _div[k]; }
  const _sc = {};
  function stopCount(code, dir) { const k = code + dir; if (_sc[k] === undefined) _sc[k] = station(code, dir, 0).stops.length; return _sc[k]; }
  // ---- Hướng địa lý của tuyến (độ, theo chiều kim đồng hồ từ hướng Bắc) tại vị trí s theo chiều chạy: lấy từ toạ độ các ga (nội suy giữa trung điểm các đoạn)
  // cộng độ lệch cục bộ khi vào đường cong (đường cong là dữ liệu sinh [I], nên độ lệch chỉ là hiệu ứng, tắt dần trong ~2,5 km sau khi ra cong)
  const _bc = {};
  function brg(a, b) { const r = Math.PI / 180, f1 = a.lat * r, f2 = b.lat * r, dl = (b.lon - a.lon) * r, y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl); return (Math.atan2(y, x) / r + 360) % 360; }
  function baseBearings(L) { if (_bc[L.id]) return _bc[L.id]; const st = L.stations, mids = []; for (let i = 0; i + 1 < st.length; i++) mids.push({ km: (st[i].km + st[i + 1].km) / 2, b: brg(st[i], st[i + 1]) });
    for (let i = 1; i < mids.length; i++) { while (mids[i].b - mids[i - 1].b > 180) mids[i].b -= 360; while (mids[i].b - mids[i - 1].b < -180) mids[i].b += 360; } return (_bc[L.id] = mids); }
  function bearingAt(L, Sim, dir, s) {
    const km = Sim.kmOfS(s, dir, L.kmEnd), mids = baseBearings(L); let b;
    if (!mids.length) b = 0; else if (km <= mids[0].km) b = mids[0].b; else if (km >= mids[mids.length - 1].km) b = mids[mids.length - 1].b; else { let i = 0; while (mids[i + 1].km < km) i++; b = lerp(mids[i].b, mids[i + 1].b, (km - mids[i].km) / (mids[i + 1].km - mids[i].km)); }
    if (dir === 'up') b += 180;
    let dev = 0; for (const [a, c, R, sg] of L.curves || []) { const sgn = dir === 'up' ? -sg : sg, ln = (c - a) * 1000, full = ln / R * 180 / Math.PI * sgn;
      if (dir === 'down') { if (km <= a) continue; dev += km < c ? full * (km - a) / (c - a) : full * Math.exp(-(km - c) / 2.5); } else { if (km >= c) continue; dev += km > a ? full * (c - km) / (c - a) : full * Math.exp(-(a - km) / 2.5); } }
    return ((b + clamp(dev, -35, 35)) % 360 + 360) % 360;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  root.Layout = { pickOf: (st, i) => st && st.side ? -1 : i, lateralTableBack, bearingAt, stopCount, diverts, TOK, ADJ, EDGE, tokens, station, spread, trackW, curvatureAt, curvatureSmooth, lateralTable, elevTable, ELEV, smooth };
  if (typeof module !== 'undefined') module.exports = root.Layout;
})(typeof window !== 'undefined' ? window : globalThis);
