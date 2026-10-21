// Bố trí đường và sân ga của một ga (số sân, số đường, đường thông qua, sân đảo/hai bên) và hình học dọc tuyến (đường cong, cao độ).
// Mã ga 'sân-đường-thông qua' lấy từ data-lines.js (Wikipedia JP, xem tools/build_struct.py). Kiểu sân đảo/hai bên chỉ có nguồn ở vài ga; phần còn lại là suy luận [I].
// Chuỗi bố trí viết theo chiều chạy XUỐNG (km tăng), trái -> phải khi nhìn từ buồng lái; Nhật chạy bên trái nên đường xuống nằm bên trái đường lên.
//   d/u = đường dừng chiều xuống/lên, D/U = đường thông qua chiều xuống/lên, P = sân ga.
(function (root) {
  const TOK = { '2-2-0': 'PduP', '2-2-1': 'PdDUuP', '2-3-1': 'PdDUuPu', '2-3-0': 'PduPu', '2-4-0': 'dPduPu', '2-4-1': 'dPdDUuPu', '1-2-1': 'DdPuU', '3-6-0': 'dPddPuuPu', '5-8-0': 'PdPddPduPuuPu' };
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
  function station(code, dir, pick) {
    const s = tokens(code, dir), n = s.length, isT = i => s[i] !== 'P', width = i => (i > 0 && i < n - 1 && isT(i - 1) && isT(i + 1)) ? ISLAND : (i === 0 || i === n - 1) ? SIDE : ISLAND;
    const c = [0];
    for (let i = 1; i < n; i++) c[i] = c[i - 1] + (isT(i) && isT(i - 1) ? TRK_GAP : EDGE + width(isT(i) ? i - 1 : i) / 2);
    const idxT = []; for (let i = 0; i < n; i++) if (isT(i)) idxT.push(i);
    const lc = ch => ch.toLowerCase();
    let ref = idxT.find(i => s[i] === 'D');
    const oppIdx = idxT.filter(i => lc(s[i]) === 'u'), ownIdx = idxT.filter(i => lc(s[i]) === 'd');
    if (ref === undefined) ref = ownIdx.reduce((b, i) => Math.min(...oppIdx.map(o => Math.abs(c[o] - c[i]))) < Math.min(...oppIdx.map(o => Math.abs(c[o] - c[b]))) ? i : b, ownIdx[0]);
    const opp = idxT.find(i => s[i] === 'U') !== undefined ? idxT.find(i => s[i] === 'U') : oppIdx.reduce((b, i) => Math.abs(c[i] - c[ref]) < Math.abs(c[b] - c[ref]) ? i : b, oppIdx[0]);
    const X = i => -(c[i] - c[ref]);                           // X dương = bên trái màn hình (trước khi lật)
    const tracks = idxT.map(i => ({ i, x: X(i), c: s[i], own: lc(s[i]) === 'd', thr: s[i] === 'D' || s[i] === 'U', plain: lc(s[i]) === 'd' ? 0 : ADJ, main: i === ref || i === opp }));
    const plats = []; for (let i = 0; i < n; i++) if (!isT(i)) { const w = width(i); plats.push({ xa: X(i) - w / 2, xb: X(i) + w / 2, side: i === 0 || i === n - 1 }); }
    // đường dừng của ta: đường chiều ta (d) có sân ga kề bên
    const stops = tracks.filter(t => t.own && !t.thr && plats.some(p => Math.abs(Math.min(Math.abs(p.xa - t.x), Math.abs(p.xb - t.x)) - EDGE) < 0.01));
    if (!stops.length) tracks.filter(t => t.own).forEach(t => stops.push(t));
    const ours = stops[Math.abs(pick | 0) % stops.length];
    // sân ga kề đường dừng của ta
    const plat = plats.find(p => Math.abs(Math.min(Math.abs(p.xa - ours.x), Math.abs(p.xb - ours.x)) - EDGE) < 0.01) || null;
    const platSign = plat ? ((plat.xa + plat.xb) / 2 > ours.x ? 1 : -1) : 1;
    return { code, dir, tracks, plats, ref, opp: X(opp), ours, plat, platSign, extent: [Math.min(...tracks.map(t => t.x), ...plats.map(p => p.xa)), Math.max(...tracks.map(t => t.x), ...plats.map(p => p.xb))] };
  }
  // trọng số "đã chia ra các đường của ga" tại vị trí s (m): 0 ở xa, 1 trong phạm vi sân ga; sM = vị trí vạch dừng
  const spread = (s, sM) => smooth(sM - 1150, sM - 450, s) * (1 - smooth(sM + 30, sM + 630, s));

  // đường cong: bảng [km0, km1, R, sg] theo km; trả về độ cong (1/m, dương = rẽ phải theo chiều chạy) tại s (m dọc tuyến theo chiều chạy)
  function curvatureAt(L, Sim, dir, s) {
    const km = Sim.kmOfS(s, dir, L.kmEnd);
    for (const [a, b, R, sg] of L.curves || []) if (km >= a && km < b) return (dir === 'up' ? -sg : sg) / R;
    return 0;
  }
  // độ lệch ngang (m, dương = sang TRÁI màn hình: cùng dấu X mô hình) của đường tại khoảng cách z phía trước so với phương nhìn hiện tại, bảng mỗi `step` m
  function lateralTable(L, Sim, dir, x, zmax, step) {
    const n = Math.ceil(zmax / step) + 1, out = new Float32Array(n); let th = 0, lat = 0;
    for (let i = 1; i < n; i++) { const k = curvatureAt(L, Sim, dir, x + (i - 0.5) * step); th += k * step; lat -= th * step; out[i] = lat; }
    return out;
  }
  // cao độ tuyến so với mặt đất quanh đó (m): nền 2, cầu cạn 9, cầu 13, hầm 0; chuyển tiếp mượt
  const ELEV = { g: 2, v: 9, b: 13, t: 0 };
  function elevTable(L, Sim, dir, x, zmax, step) {
    const n = Math.ceil(zmax / step) + 1, raw = new Float32Array(n);
    for (let i = 0; i < n; i++) raw[i] = ELEV[Sim.structAt(L, Sim.kmOfS(x + i * step, dir, L.kmEnd))] || 0;
    const out = new Float32Array(n), r = Math.max(1, Math.round(80 / step));
    for (let i = 0; i < n; i++) { let a = 0, c = 0; for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) { a += raw[j]; c++; } out[i] = a / c; }
    return out;
  }
  root.Layout = { TOK, ADJ, EDGE, tokens, station, spread, curvatureAt, lateralTable, elevTable, ELEV, smooth };
  if (typeof module !== 'undefined') module.exports = root.Layout;
})(typeof window !== 'undefined' ? window : globalThis);
