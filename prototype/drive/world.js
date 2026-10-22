// Cảnh vật thật từ OpenStreetMap dọc đường ray (© OpenStreetMap contributors, ODbL 1.0; dữ liệu đã biên dịch trong world/, chỉ dùng cá nhân).
// Dữ liệu chia đoạn 4 km theo s của game (km·1000, chiều xuống); toạ độ (s, d): d dương = bên TRÁI đường xuống. Xem tools/osm_*.py.
// Chiều lên: s' = kmEnd·1000 − s, bên trái/phải đảo, đường ta là đường ray chiều lên (lệch ADJ so với đường xuống).
// Nếu không có dữ liệu (hoặc mở bằng file://) thì mọi hàm vẽ bỏ qua êm: bản đồ nhỏ dùng nền cũ.
(function (root) {
  const CH = 4000, SHARE = { jts: ['toh', 30300], hok: ['jts', 105000], yam: ['toh', 255100], aki: ['toh', 496500] }, ADJ = -4.3;
  const cache = new Map(), have = {};                // 'lid/k' -> {b, a, r, w, x} | null (không có) | 'loading'
  const srcOf = (lid, s) => { for (;;) { const sh = SHARE[lid]; if (sh && s < sh[1]) lid = sh[0]; else return lid; } };

  function parse(buf) {
    const dv = new DataView(buf); if (dv.getUint8(0) !== 87 || dv.getUint8(1) !== 49) return null; let p = 2;
    const nb = dv.getUint32(p, true), na = dv.getUint32(p + 4, true), nr = dv.getUint32(p + 8, true), nw = dv.getUint32(p + 12, true), nx = dv.getUint32(p + 16, true); p += 20;
    const o = { b: [], a: [], r: [], w: [], x: [] };
    for (let i = 0; i < nb; i++, p += 10) o.b.push({ s: dv.getUint16(p, true) / 10, d: dv.getInt16(p + 2, true) / 10, w: dv.getUint8(p + 4) / 2, l: dv.getUint8(p + 5) / 2, a: dv.getUint8(p + 6) / 255 * Math.PI, lev: dv.getUint8(p + 7), t: dv.getUint8(p + 8) });
    const pts = n => { const s = new Float32Array(n), d = new Float32Array(n); for (let i = 0; i < n; i++, p += 6) { s[i] = dv.getInt32(p, true) / 10; d[i] = dv.getInt16(p + 4, true) / 10; } return { s, d }; };
    for (let i = 0; i < na; i++) { const c = String.fromCharCode(dv.getUint8(p)), n = dv.getUint16(p + 2, true); p += 4; o.a.push({ c, ...pts(n) }); }
    for (const [k, cnt] of [['r', nr], ['w', nw], ['x', nx]]) for (let i = 0; i < cnt; i++) { const cl = dv.getUint8(p), br = dv.getUint8(p + 1), n = dv.getUint16(p + 2, true); p += 4; o[k].push({ cl, br, ...pts(n) }); }
    if (p + 4 <= buf.byteLength) { const n = dv.getUint32(p, true); o.g = new Uint8Array(buf, p + 4, n); }
    return o;
  }
  function chunk(lid, k) {
    const key = lid + '/' + k, c = cache.get(key); if (c !== undefined) return c === 'loading' ? undefined : c;
    if (have[lid] === false) return null;
    cache.set(key, 'loading');
    fetch(`world/${lid}/${k}.bin`).then(r => r.ok ? r.arrayBuffer() : null).then(b => { const d = b ? parse(b) : null; cache.set(key, d); if (d) have[lid] = true; }).catch(() => { cache.set(key, null); });
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
      for (const c of cs) for (const A of c.d.a) { if (A.c !== cls) continue; for (let i = 0; i < A.s.length; i++) { const [x, y] = P(c.s0 + A.s[i], A.d[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
      ctx.fill();
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const strokeLines = (key, colf, wf) => { for (const c of cs) for (const R of c.d[key]) { ctx.strokeStyle = colf(R); ctx.lineWidth = Math.max(1, wf(R) * o.ky); ctx.beginPath(); for (let i = 0; i < R.s.length; i++) { const [x, y] = P(c.s0 + R.s[i], R.d[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } };
    strokeLines('w', R => pal.water, R => R.cl === 1 ? 2.5 : 8);
    strokeLines('x', R => pal.rail, R => 2.2);
    strokeLines('r', R => R.br === 2 ? pal.road[1] : pal.road[R.cl], R => ROAD_W[R.cl] + (R.br === 1 ? 1.5 : 0));
    // toà nhà: hình chữ nhật xoay; nhà cao tầng đậm hơn và có bóng đổ
    const fx = o.ky * 0; void fx;
    for (const c of cs) for (const B of c.d.b) {
      const s = c.s0 + B.s, ca = Math.cos(B.a), sa = Math.sin(B.a), hw = B.w / 2, hl = B.l / 2, cor = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
      ctx.fillStyle = pal.bldg[B.t] || pal.bldg[0]; ctx.beginPath();
      cor.forEach(([u, v], i) => { const [x, y] = P(s + u * ca - v * sa, B.d + u * sa + v * ca); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
      if (B.lev >= 6) { ctx.strokeStyle = o.dark ? 'rgba(0,0,0,.5)' : 'rgba(40,40,50,.45)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
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
    for (const c of chunks(lid, a - 40, b + 40)) for (const B of c.d.b) {
      const s = c.s0 + B.s; if (s < a - 40 || s > b + 40) continue;
      const e = up ? (dOurs || 0) - B.d : B.d - (dOurs || 0); if (Math.abs(e) > lat) continue;
      const ca = Math.abs(Math.cos(B.a)), sa = Math.abs(Math.sin(B.a)), ds = B.w * ca + B.l * sa, dd = B.w * sa + B.l * ca;      // hộp bao theo trục s và trục d
      const z = (up ? Lm - s - Tx : s - Tx) - ds / 2;
      const lev = B.lev || (B.t === 1 ? 4 : B.t === 2 ? 2 : B.t === 3 ? 1 : B.t === 4 ? 1.5 : 2);
      out.push({ z, e, w: dd, dz: ds, h: lev * 3.2 + 1.5, t: B.t, lev: B.lev });
    }
    return out;
  }
  root.World = { drawTop, chunks, srcOf, landAt, buildings, toSD, has, ready: () => Object.values(have).some(v => v) };
})(typeof window !== 'undefined' ? window : globalThis);
