// Cảnh vật thật từ OpenStreetMap dọc đường ray (© OpenStreetMap contributors, ODbL 1.0; dữ liệu đã biên dịch trong world/, chỉ dùng cá nhân).
// Dữ liệu chia đoạn 4 km theo s của game (km·1000, chiều xuống); toạ độ (s, d): d dương = bên TRÁI đường xuống. Xem tools/osm_*.py.
// Chiều lên: s' = kmEnd·1000 − s, bên trái/phải đảo, đường ta là đường ray chiều lên (lệch ADJ so với đường xuống).
// Nếu không có dữ liệu (hoặc mở bằng file://) thì mọi hàm vẽ bỏ qua êm: bản đồ nhỏ dùng nền cũ.
(function (root) {
  const CH = 4000, SHARE = { jts: ['toh', 30300], hok: ['jts', 105000], yam: ['toh', 255100], aki: ['toh', 496500] }, ADJ = -4.3;
  const cache = new Map(), have = {};                // 'lid/k' -> {b, a, r, w, x} | null (không có) | 'loading'
  const srcOf = (lid, s) => { for (;;) { const sh = SHARE[lid]; if (sh && s < sh[1]) lid = sh[0]; else return lid; } };

  // tệp world/<tuyến>/<k>.js gọi World._r(tuyến, k, base64)
  let ver = 0;
  function reg(lid, k, b64) {
    ver++;
    try { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const d = parse(u.buffer, k * CH); cache.set(lid + '/' + k, d); if (d) have[lid] = true; } catch (e) { cache.set(lid + '/' + k, null); }
  }
  function parse(buf, s0) {
    const dv = new DataView(buf); if (dv.getUint8(0) !== 87 || dv.getUint8(1) !== 49) return null; let p = 2;
    const nb = dv.getUint32(p, true), na = dv.getUint32(p + 4, true), nr = dv.getUint32(p + 8, true), nw = dv.getUint32(p + 12, true), nx = dv.getUint32(p + 16, true); p += 20;
    const o = { b: [], a: [], r: [], w: [], x: [] };
    for (let i = 0; i < nb; i++, p += 10) o.b.push({ s: dv.getUint16(p, true) / 10, d: dv.getInt16(p + 2, true) / 10, w: dv.getUint8(p + 4) / 2, l: dv.getUint8(p + 5) / 2, a: dv.getUint8(p + 6) / 255 * Math.PI, lev: dv.getUint8(p + 7), t: dv.getUint8(p + 8) });
    const pts = n => { const s = new Float32Array(n), d = new Float32Array(n); for (let i = 0; i < n; i++, p += 6) { s[i] = dv.getInt32(p, true) / 10; d[i] = dv.getInt16(p + 4, true) / 10; } return { s, d }; };
    for (let i = 0; i < na; i++) { const c = String.fromCharCode(dv.getUint8(p)), n = dv.getUint16(p + 2, true); p += 4; o.a.push({ c, ...pts(n) }); }
    for (const [k, cnt] of [['r', nr], ['w', nw], ['x', nx]]) for (let i = 0; i < cnt; i++) { const cl = dv.getUint8(p), br = dv.getUint8(p + 1), n = dv.getUint16(p + 2, true); p += 4; o[k].push({ cl, br, ...pts(n) }); }
    if (p + 4 <= buf.byteLength) { const n = dv.getUint32(p, true); o.g = new Uint8Array(buf, p + 4, n); }
    o.b.sort((u, v) => u.s - v.s);                                   // tòa nhà theo s: tìm nhị phân đoạn đang nhìn thấy
    for (const B of o.b) { const ca = Math.abs(Math.cos(B.a)), sa = Math.abs(Math.sin(B.a)); B.ds = B.w * ca + B.l * sa; B.dd = B.w * sa + B.l * ca; B.tone = Math.abs(Math.sin((s0 + B.s) * 12.9898 + B.d * 78.233) * 43758.5453) % 1; B.lv = B.lev || (B.t === 1 ? 4 : B.t === 2 ? 2 : B.t === 3 ? 1 : B.t === 4 ? 1.5 : 2); }       // đặc điểm suy ra một lần khi nạp (màu/kiểu nhà cố định theo vị trí thật)
    for (const k of ['a', 'r', 'w', 'x']) for (const f of o[k]) { let lo = 1e9, hi = -1e9; for (let i = 0; i < f.s.length; i++) { if (f.s[i] < lo) lo = f.s[i]; if (f.s[i] > hi) hi = f.s[i]; } f.lo = lo; f.hi = hi; }
    return o;
  }
  function chunk(lid, k) {
    const key = lid + '/' + k, c = cache.get(key); if (c !== undefined) return c === 'loading' ? undefined : c;
    if (have[lid] === false) return null;
    cache.set(key, 'loading');
    if (typeof document === 'undefined') { cache.set(key, null); return null; }
    const sc = document.createElement('script'); sc.src = `world/${lid}/${k}.js`; sc.onerror = () => { cache.set(key, null); sc.remove(); }; sc.onload = () => sc.remove(); document.head.appendChild(sc);      // thẻ script: chạy được cả khi mở bằng file://
    return undefined;
  }
  // các đoạn dữ liệu phủ khoảng s (chiều xuống) [a, b]: [{lid, k, s0, data}]
  function chunks(lid, a, b) {
    const out = [];
    for (let k = Math.floor(a / CH); k <= Math.floor(b / CH); k++) { const id = srcOf(lid, k * CH + CH / 2), d = chunk(id, k); if (d) out.push({ lid: id, k, s0: k * CH, d }); }
    return out;
  }

  const PAL = {
    day: { f: '#2f5f3a', a: '#9aa75a', g: '#6a9a4a', o: '#6f9a45', h: '#8d8a80', c: '#9b8f92', i: '#7e8187', e: '#6b7f62', p: '#58944f', w: '#3d7db0', m: '#4a7a68', s: '#58774a', r: '#8a8279', y: '#c9bd8f', z: '#6a6a66',
           road: ['', '#b8b5ac', '#c4c1b6', '#d2cfc4', '#e0ddd0', '#e8d9a0', '#f0c86a'], rail: '#555a5e', water: '#3f86c0', bldg: ['#c6c0b2', '#a9b1ba', '#a0a0a0', '#c9b79a', '#b05a4a'] },
    night: { f: '#0f2216', a: '#2c3018', g: '#1e3418', o: '#22361a', h: '#2a2a2c', c: '#2d2a30', i: '#25272b', e: '#1f2b20', p: '#1a3a20', w: '#10304e', m: '#173226', s: '#1b2a18', r: '#2a2826', y: '#3d3a2c', z: '#222426',
             road: ['', '#2e2f30', '#38393a', '#444546', '#505152', '#5a5438', '#6a5a32'], rail: '#2a2d30', water: '#143a5c', bldg: ['#4a4842', '#3e464f', '#3a3c40', '#4a4235', '#4a2c26'] }
  };
  const ORDER = ['y', 'a', 'g', 'o', 's', 'm', 'r', 'f', 'p', 'e', 'h', 'c', 'i', 'w', 'z'];
  const ROAD_W = [0, 3, 4.5, 6, 9, 11, 16];

  // Vẽ lên bản đồ nhỏ. o = { lid, dir, kmEnd, Tx, zLo, zHi, X(e,z) -> x, Y(z) -> y, ky, dark }
  function drawTop(ctx, o) {
    const up = o.dir === 'up', Lm = o.kmEnd * 1000, a = up ? Lm - (o.Tx + o.zHi) : o.Tx + o.zLo, b = up ? Lm - (o.Tx + o.zLo) : o.Tx + o.zHi, pal = o.dark ? PAL.night : PAL.day;
    const cs = chunks(o.lid, a - 60, b + 60); if (!cs.length) return false;
    const zOf = s => up ? Lm - s - o.Tx : s - o.Tx, eOf = d => up ? -d + ADJ : d;
    const P = (s, d) => { const z = zOf(s); return [o.X(eOf(d), z), o.Y(z)]; };
    for (const cls of ORDER) {
      ctx.fillStyle = pal[cls]; ctx.beginPath();
      for (const c of cs) for (const A of c.d.a) { if (A.c !== cls || c.s0 + A.hi < a - 60 || c.s0 + A.lo > b + 60) continue; for (let i = 0; i < A.s.length; i++) { const [x, y] = P(c.s0 + A.s[i], A.d[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
      ctx.fill();
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const strokeLines = (key, colf, wf) => { for (const c of cs) for (const R of c.d[key]) { if (c.s0 + R.hi < a - 60 || c.s0 + R.lo > b + 60) continue; ctx.strokeStyle = colf(R); ctx.lineWidth = Math.max(1, wf(R) * o.ky); ctx.beginPath(); for (let i = 0; i < R.s.length; i++) { const [x, y] = P(c.s0 + R.s[i], R.d[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } };
    strokeLines('w', R => pal.water, R => R.cl === 1 ? 2.5 : 8);
    strokeLines('x', R => pal.rail, R => 2.2);
    strokeLines('r', R => R.br === 2 ? pal.road[1] : pal.road[R.cl], R => ROAD_W[R.cl] + (R.br === 1 ? 1.5 : 0));
    // toà nhà: hình chữ nhật xoay; nhà cao tầng đậm hơn và có bóng đổ
    const fx = o.ky * 0; void fx;
    for (const c of cs) {
      const arr = c.d.b; let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.s0 + arr[m].s < a - 60) lo = m + 1; else hi = m; }
      for (let q = lo; q < arr.length; q++) { const B = arr[q]; if (c.s0 + B.s > b + 60) break; if (Math.abs(B.d) > 420) continue;
      const s = c.s0 + B.s, ca = Math.cos(B.a), sa = Math.sin(B.a), hw = B.w / 2, hl = B.l / 2, cor = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
      ctx.fillStyle = pal.bldg[B.t] || pal.bldg[0]; ctx.beginPath();
      cor.forEach(([u, v], i) => { const [x, y] = P(s + u * ca - v * sa, B.d + u * sa + v * ca); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
      if (B.lev >= 6) { ctx.strokeStyle = o.dark ? 'rgba(0,0,0,.5)' : 'rgba(40,40,50,.45)'; ctx.lineWidth = 1; ctx.stroke(); }
    } }
    return true;
  }
  // Lớp phủ đất tại (s, d) theo hệ chiều xuống: mã ký tự của lớp (f rừng, a ruộng, h nhà ở, w nước...) hoặc 0 nếu không có dữ liệu / đất trống
  function landAt(lid, s, d) {
    const k = Math.floor(s / CH), id = srcOf(lid, s), c = chunk(id, k); if (!c || !c.g || d < -800 || d >= 800) return 0;
    return c.g[Math.min(199, Math.floor((s - k * CH) / 20)) * 80 + Math.floor((d + 800) / 20)];
  }
  // đổi toạ độ buồng lái (z phía trước đầu tàu, e ngang: dương = trái) sang (s, d) của dữ liệu, và ngược lại
  // dOurs: độ lệch ngang (hệ d của dữ liệu) của đường tàu ta đang chạy: 0 nếu ta chạy trên đường xuống, ADJ (-4,3) nếu chạy trên đường lên
  const toSD = (dir, kmEnd, Tx, z, e, dOurs) => dir === 'up' ? [kmEnd * 1000 - (Tx + z), (dOurs || 0) - e] : [Tx + z, e + (dOurs || 0)];
  const has = (lid, dir, kmEnd, Tx) => { const s = dir === 'up' ? kmEnd * 1000 - Tx : Tx; return !!chunk(srcOf(lid, s), Math.floor(s / CH)); };
  // các toà nhà thật trong khoảng z [za, zb] phía trước và |e| ≤ lat: [{z, e, w (ngang), dz (dọc), h, t, lev}], z là mép gần
  function buildings(lid, dir, kmEnd, Tx, za, zb, lat, dOurs) {
    const up = dir === 'up', Lm = kmEnd * 1000, a = up ? Lm - (Tx + zb) : Tx + za, b = up ? Lm - (Tx + za) : Tx + zb, out = [];
    for (const c of chunks(lid, a - 40, b + 40)) { const arr = c.d.b; let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.s0 + arr[m].s < a - 40) lo = m + 1; else hi = m; }
     for (let q = lo; q < arr.length; q++) { const B = arr[q];
      const s = c.s0 + B.s; if (s > b + 40) break;
      const e = up ? (dOurs || 0) - B.d : B.d - (dOurs || 0); if (Math.abs(e) > lat) continue;
      const ca = Math.abs(Math.cos(B.a)), sa = Math.abs(Math.sin(B.a)), ds = B.w * ca + B.l * sa, dd = B.w * sa + B.l * ca;      // hộp bao theo trục s và trục d
      const z = (up ? Lm - s - Tx : s - Tx) - ds / 2;
      const lev = B.lev || (B.t === 1 ? 4 : B.t === 2 ? 2 : B.t === 3 ? 1 : B.t === 4 ? 1.5 : 2);
      const tn = Math.abs(Math.sin(s * 12.9898 + B.d * 78.233) * 43758.5453) % 1;      // màu/kiểu nhà cố định theo vị trí thật (không đổi khi tàu chạy)
      out.push({ z, e, w: dd, dz: ds, h: lev * 3.2 + 1.5, t: B.t, lev: B.lev, tone: tn });
    } }
    return out;
  }
  // cột điện dọc đường bộ nhỏ (kiểu Nhật: cột bê tông cách ~35 m, dây chằng chịt): các đoạn cột liên tiếp [{z0, e0, z1, e1}] cho khoảng z [za, zb], |e| ≤ lat
  const polesCache = new Map();
  function polesFor(c) {
    let P = polesCache.get(c.d); if (P) return P; P = [];
    for (const R of c.d.r) { if (R.cl < 2 || R.cl > 4 || R.br) continue; let carry = 17; const pts = [];
      for (let i = 1; i < R.s.length; i++) { const x0 = R.s[i - 1], y0 = R.d[i - 1], x1 = R.s[i], y1 = R.d[i], L = Math.hypot(x1 - x0, y1 - y0); let t = carry; while (t < L) { pts.push([c.s0 + x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L]); t += 35; } carry = t - L; }
      for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) < 60) P.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]); }
    polesCache.set(c.d, P); return P;
  }
  function poles(lid, dir, kmEnd, Tx, za, zb, lat, dOurs) {
    const up = dir === 'up', Lm = kmEnd * 1000, a = up ? Lm - (Tx + zb) : Tx + za, b = up ? Lm - (Tx + za) : Tx + zb, out = [];
    for (const c of chunks(lid, a - 60, b + 60)) {
      const P = polesFor(c);
      for (const g of P) { const sm = Math.max(g[0], g[2]), sn = Math.min(g[0], g[2]); if (sm < a - 20 || sn > b + 20) continue;
        const e0 = up ? (dOurs || 0) - g[1] : g[1] - (dOurs || 0), e1 = up ? (dOurs || 0) - g[3] : g[3] - (dOurs || 0); if (Math.abs(e0) > lat || Math.abs(e1) > lat) continue;
        out.push({ id: Math.round(g[0] * 4) + ':' + Math.round(g[1] * 4), z0: up ? Lm - g[0] - Tx : g[0] - Tx, e0, z1: up ? Lm - g[2] - Tx : g[2] - Tx, e1 }); }
    }
    return out;
  }
  // duyệt các toà nhà thật trong khoảng z [za, zb] phía trước (không cấp phát): cb(z, e, w, dz, h, t, lev, tone), z tăng dần; cb trả false để dừng
  function forBuildings(lid, dir, kmEnd, Tx, za, zb, lat, dOurs, cb) {
    const up = dir === 'up', Lm = kmEnd * 1000, a = up ? Lm - (Tx + zb) : Tx + za, b = up ? Lm - (Tx + za) : Tx + zb, cs = chunks(lid, a - 40, b + 40); if (up) cs.reverse();
    for (const c of cs) {
      const arr = c.d.b; let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.s0 + arr[m].s < a - 40) lo = m + 1; else hi = m; }
      let end = lo; while (end < arr.length && c.s0 + arr[end].s <= b + 40) end++;
      for (let q = up ? end - 1 : lo; up ? q >= lo : q < end; q += up ? -1 : 1) {
        const B = arr[q], s = c.s0 + B.s, e = up ? (dOurs || 0) - B.d : B.d - (dOurs || 0); if (Math.abs(e) > lat) continue;
        const z = (up ? Lm - s - Tx : s - Tx) - B.ds / 2; if (cb(z, e, B.dd, B.ds, B.lv * 3.2 + 1.5, B.t, B.lev, B.tone) === false) return;
      }
    }
  }
  // Thu thập theo hệ toạ độ trò chơi (sg: s dọc chiều chạy; e: ngang, dương = trái đường ta) cho dải tranh phong cảnh (strips.js)
  const dataS = (dir, Lm, sg) => dir === 'up' ? Lm - sg : sg;
  function collect(lid, dir, kmEnd, sg0, sg1, eLo, eHi, dOurs, cb) {      // toà nhà trong [sg0, sg1] × [eLo, eHi]: cb(sg, e, w ngang, ds dọc, h, t, lev, tone)
    const up = dir === 'up', Lm = kmEnd * 1000, a = up ? Lm - sg1 : sg0, b = up ? Lm - sg0 : sg1;
    for (const c of chunks(lid, a - 40, b + 40)) {
      const arr = c.d.b; let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.s0 + arr[m].s < a - 40) lo = m + 1; else hi = m; }
      for (let q = lo; q < arr.length; q++) { const B = arr[q], s = c.s0 + B.s; if (s > b + 40) break;
        const e = up ? (dOurs || 0) - B.d : B.d - (dOurs || 0); if (e < eLo || e > eHi) continue; const sg = up ? Lm - s : s; if (sg < sg0 || sg > sg1) continue;
        cb(sg, e, B.dd, B.ds, B.lv * 3.2 + 1.5, B.t, B.lev, B.tone); }
    }
  }
  function landG(lid, dir, kmEnd, sg, e, dOurs) { const s = dir === 'up' ? kmEnd * 1000 - sg : sg, d = dir === 'up' ? (dOurs || 0) - e : e + (dOurs || 0); return landAt(lid, s, d); }
  function polesG(lid, dir, kmEnd, sg0, sg1, eLo, eHi, dOurs) {       // đoạn dây điện giữa các cột liền kề, trong hệ toạ độ trò chơi
    const up = dir === 'up', Lm = kmEnd * 1000, a = up ? Lm - sg1 : sg0, b = up ? Lm - sg0 : sg1, out = [];
    for (const c of chunks(lid, a - 60, b + 60)) { const P = polesFor(c); for (const g of P) { if (Math.max(g[0], g[2]) < a - 20 || Math.min(g[0], g[2]) > b + 20) continue;
        const e0 = up ? (dOurs || 0) - g[1] : g[1] - (dOurs || 0), e1 = up ? (dOurs || 0) - g[3] : g[3] - (dOurs || 0); if (e0 < eLo || e0 > eHi) continue;
        out.push({ s0: up ? Lm - g[0] : g[0], e0, s1: up ? Lm - g[2] : g[2], e1 }); } }
    return out;
  }
  // đã nạp xong mọi đoạn dữ liệu phủ [sg0, sg1] (hệ trò chơi)? (gọi cũng kích hoạt nạp)
  function loaded(lid, dir, kmEnd, sg0, sg1) {
    const Lm = kmEnd * 1000, a = dir === 'up' ? Lm - sg1 : sg0, b = dir === 'up' ? Lm - sg0 : sg1; let ok = true;
    for (let k = Math.floor((a - 60) / CH); k <= Math.floor((b + 60) / CH); k++) { if (k < 0) continue; const id = srcOf(lid, k * CH + CH / 2), key = id + '/' + k; if (cache.get(key) === undefined || cache.get(key) === 'loading') { chunk(id, k); ok = false; } }
    return ok;
  }
  root.World = { loaded, collect, landG, polesG, forBuildings, version: () => ver, _r: reg, poles, parse, drawTop, chunks, srcOf, landAt, buildings, toSD, has, ready: () => Object.values(have).some(v => v) };
})(typeof window !== 'undefined' ? window : globalThis);
