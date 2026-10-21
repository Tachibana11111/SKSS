// Khung nhìn thẳng phía trước từ buồng lái (giả 3D, phối cảnh một điểm tụ). Dùng ảnh mặt trước thật của từng dòng tàu (rail.kychung.com) cho tàu phía trước,
// tàu ngược chiều; tàu vượt dùng dải ảnh nhìn ngang chiếu phối cảnh. Mọi thứ khác (ray, sân ga, trụ điện, nhà cửa, cây, người, biển) vẽ bằng code [I].
// Toạ độ mô hình: Z = khoảng cách phía trước (m, theo chiều chạy), X = ngang (m), Y = cao (m). Nhật chạy bên TRÁI: proj() lật X (MIR=-1) nên X dương hiện bên trái màn hình.
// Đường thông qua của ta ở X=0, đường thông qua ngược chiều ở X=-4,3 (ADJ); bố trí từng ga (số đường, sân đảo/hai bên) lấy từ layout.js; đường cong và cao độ (nền/cầu cạn/cầu/hầm) từ dữ liệu tuyến.
(function (root) {
  const CAMH = 2.9, GAUGE = 1.435, MIR = -1, ADJ = -4.3, PEDGE = 1.75, PH = 1.25, ZN = 3.5, ZF = 2600, STEP = 10;
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
  const mixc = (c1, c2, t) => 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
  const SMAP = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5' };
  const stCache = {};

  // chiếu điểm (X,Y,Z) lên màn hình; c = {cx, hy, f, camX, pitch, lane, off(Z)}
  function proj(c, X, Y, Z) { return [c.cx + c.f * (MIR * (X - (c.lane || 0) + (c.off ? c.off(Z) : 0)) - c.camX) / Z, c.hy + c.pitch + c.f * (CAMH - Y) / Z]; }

  // mô tả một ô phong cảnh (xác định theo vị trí thế giới): dùng cả cho vẽ lẫn kiểm thử
  function cellObject(seed, biome, side) {
    const r1 = hash(seed * 7919 + side * 31 + 5), r2 = hash(seed * 104729 + side * 17 + 9), r3 = hash(seed * 15485863 + side * 7 + 3), r4 = hash(seed * 32452843 + side + 11);
    if (biome === 'urban') { if (r1 > 0.72) return null; return { kind: 'building', lat: 12 + r2 * 55, w: 10 + r3 * 24, d: 12 + r4 * 18, h: 8 + r1 * 60 / 0.72 * (0.3 + r2 * 0.7), tone: r3 }; }
    if (biome === 'mountain') { if (r1 > 0.85) return null; return { kind: 'tree', lat: 7 + r2 * 60, h: 8 + r3 * 14, w: 4 + r4 * 5, tone: r4, conifer: true }; }
    if (r1 < 0.30) return { kind: 'tree', lat: 6 + r2 * 45, h: 5 + r3 * 7, w: 3 + r4 * 4, tone: r4, conifer: r3 > 0.7 };
    if (r1 < 0.37) return { kind: 'house', lat: 10 + r2 * 40, w: 7 + r3 * 5, d: 8 + r4 * 4, h: 5 + r2 * 3, tone: r3 };
    if (r1 < 0.62) return { kind: 'field', lat: 5 + r2 * 30, w: 18 + r3 * 40, d: 20 + r4 * 40, tone: r4 };
    return null;
  }
  function personColor(i) { return ['#3b4a5e', '#5a3b4a', '#2f5a48', '#6a6a2f', '#4a4a6a', '#6a4a3a'][i % 6]; }

  function draw(ctx, px, py, pw, ph, W, T, R) {
    const now = performance.now(), v = T.v, items = [];
    const L = W.line, S = root.Sim, M = T.M, LAY = root.Layout;
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600;
    const day = smooth(5.3, 7.3, hour) * (1 - smooth(16.8, 19.0, hour)), night = 1 - day, dusk = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.2) + Math.max(0, 1 - Math.abs(hour - 17.8) / 1.3);
    const inSnow = W.zones.some(z => z.kind === 'snow' && T.x >= z.s0 - 3000 && T.x < z.s1), rain = W.rainHere;
    const windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    const wx = rain ? 0.55 : inSnow ? 0.4 : 0, fogZ = rain ? 700 : inSnow ? 900 : 3500;
    const dirS = W.dir === 'up' ? -1 : 1;
    let sh = 0; if (W.eqkAt !== undefined && W.eqkActive) sh = 5 * Math.exp(-(W.t - W.eqkAt) / 40) + 0.8; if (W.shakeAt !== undefined && W.t - W.shakeAt < 4) sh = Math.max(sh, (W.shakeAmp || 4) * Math.exp(-(W.t - W.shakeAt) / 1.2));
    const sway = 0.1 * Math.sin(T.x / 90) * Math.min(1, v / 70) + (sh > 0.1 ? (Math.random() - 0.5) * sh * 0.05 : 0);
    const bob = Math.min(1, v / 80) * (Math.sin(now / 90) * 0.4) + (sh > 0.1 ? (Math.random() - 0.5) * sh * 2 : 0);
    const c = { cx: px + pw / 2, hy: py + ph * 0.40, f: pw * 0.92, camX: sway, pitch: bob - T.grade * 0.4, lane: 0, off: null };

    // ---- hình học phía trước: đường cong (độ lệch ngang theo khoảng cách) và cao độ tuyến so với mặt đất
    const latT = LAY.lateralTable(L, S, W.dir, T.x, ZF, STEP), elvT = LAY.elevTable(L, S, W.dir, T.x, ZF, STEP);
    const tab = (a, z) => { const f = Math.max(0, z) / STEP, i = Math.min(a.length - 2, Math.floor(f)); return a[i] + (a[i + 1] - a[i]) * (f - i); };
    c.off = z => tab(latT, z); const elAt = z => tab(elvT, z);
    const kapNow = LAY.curvatureAt(L, S, W.dir, T.x);
    const roll = v > 5 ? clamp(-kapNow * v * v / 9.8 * 0.5, -0.03, 0.03) : 0;      // nghiêng thân tàu khi vào cong

    // ---- các ga trong tầm nhìn: bố trí đường, vị trí đường dừng của ta
    const target = S.nextTarget(T), tIdx = T.phase === 'dwell' ? T.k : target;
    const sts = [];
    M.forEach((m, i) => { const d = m.s - T.x; if (d < -1000 || d > 3600) return;      // giữ ga tới 1 km phía sau để ghi chữ X lúc rời ga không biến mất sớm
       const key = W.lineId + ':' + m.i + ':' + W.dir; const st = stCache[key] || (stCache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.dir, m.i)); sts.push({ m, i, d, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')),   // ga vừa dừng (kể cả dừng khẩn không có lịch) vẫn giữ đường sân ga cho tới khi tàu rời hẳn
         isT: i === tIdx }); });
    for (const q of sts) if (q.stopHere && !q.m.mainStop) { const w = LAY.spread(T.x, q.m.s); if (w > 0) c.lane = q.st.ours.x * w; }      // mainStop: dừng khẩn quá gần để rẽ ghi -> ở lại đường chính
    const oppAt = z => { let x = ADJ; for (const q of sts) x += (q.st.opp - ADJ) * LAY.spread(T.x + z, q.m.s); return x; };   // đường thông qua ngược chiều (nơi tàu ngược chiều chạy)
    const inStationZone = (za, zb) => { const qs = sts.filter(q => zb > q.d - 1200 && za < q.d + 650); return qs.length ? { st: { extent: [Math.min(...qs.map(q => q.st.extent[0])), Math.max(...qs.map(q => q.st.extent[1]))] } } : null; };   // hợp các ga trong tầm (ga vừa qua và ga sắp tới)

    const inTun = S.inTunnel(W, T.x);
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.save(); if (Math.abs(roll) > 0.001) { ctx.translate(c.cx, c.hy); ctx.rotate(roll); ctx.translate(-c.cx, -c.hy); }
    const P = (X, Y, Z) => proj(c, X, Y, Z), PG = (X, Y, Z) => proj(c, X, Y - elAt(Z), Z);     // PG: vật nằm trên mặt đất (thấp hơn mặt ray khi tuyến đi trên cao)
    const quad = (a, b, d, e, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill(); };
    // lưới điểm lấy mẫu chung theo khoảng cách: mọi dải/tường dùng cùng điểm nên khớp nhau kể cả ở đường cong gấp (không lệch hàng mét như khi mỗi dải tự chia)
    const zgrid = []; { let z = ZN; while (z < ZF) { zgrid.push(z); z += z < 100 ? 8 : z < 400 ? 20 : z < 1000 ? 40 : 80; } zgrid.push(ZF); }
    const zsteps = (z0, z1) => { if (z1 <= z0) return [z0]; const a = [z0]; for (const g of zgrid) if (g > z0 + 0.5 && g < z1 - 0.5) a.push(g); a.push(z1); return a; };
    // dải nằm ngang theo chiều dài (bám đường cong): xa(z), xb(z) là X hai mép tại khoảng cách z; Y cố định
    const strip = (xa, xb, Y, z0, z1, fill) => { const zs = zsteps(Math.max(z0, zMin), Math.min(z1, zLim)); if (zs.length < 2) return; ctx.fillStyle = fill; ctx.beginPath(); zs.forEach((z, k) => { const p = P(xa(z), Y, z); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); for (let k = zs.length - 1; k >= 0; k--) { const p = P(xb(zs[k]), Y, zs[k]); ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.fill(); };
    // tường đứng dọc theo chiều dài ở X(z), từ Y0 đến Y1
    const wall = (xf, Y0, Y1, z0, z1, fill) => { const zs = zsteps(Math.max(z0, zMin), Math.min(z1, zLim)); if (zs.length < 2) return; ctx.fillStyle = fill; ctx.beginPath(); zs.forEach((z, k) => { const p = P(xf(z), Y1, z); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); for (let k = zs.length - 1; k >= 0; k--) { const p = P(xf(zs[k]), Y0, zs[k]); ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.fill(); };
    const fadeA = Z => clamp(1.15 - Z / fogZ, 0.12, 1);
    const km = z => S.kmOfS(T.x + z, W.dir, L.kmEnd), biomeAt = z => S.biomeAt(L, km(z));
    const rgbOf = s => s.match(/\d+/g).map(Number);

    // trạng thái hầm: zExit = khoảng cách tới cửa ra khi đang ở trong hầm; zLim = chân trời vẽ hiện tại (trong hầm cắt ở cửa ra, phần ngoài hầm vẽ riêng trong khung cửa ra)
    let zExit = null; for (const [k0, k1] of L.meta.tunnels) { const a = S.sOfKm(k0, W.dir, L.kmEnd), b = S.sOfKm(k1, W.dir, L.kmEnd), lo = Math.min(a, b), hi = Math.max(a, b); if (T.x >= lo && T.x <= hi) zExit = hi - T.x; }
    let zLim = zExit !== null ? zExit : ZF, zMin = ZN, sink = null;
    // cửa hầm sắp tới (khi đang ở ngoài hầm): cắt mọi thứ ở mặt cửa hầm; phần bên trong hầm vẽ riêng qua khung cửa
    let entryZ = null, entryEnd = ZF; if (zExit === null) for (const [k0, k1] of L.meta.tunnels) { const a = S.sOfKm(k0, W.dir, L.kmEnd), b = S.sOfKm(k1, W.dir, L.kmEnd), z = Math.min(a, b) - T.x; if (z > ZN && z < ZF && (entryZ === null || z < entryZ)) { entryZ = z; entryEnd = Math.max(a, b) - T.x; } }
    if (entryZ !== null) zLim = entryZ;
    const top = mixc([6, 12, 24], [92, 160, 224], day), hor = mixc([14, 24, 42], [183, 214, 240], day);
    const gb = biomeAt(60); const gcol = inSnow ? [214, 222, 232] : gb === 'urban' ? [58, 62, 66] : gb === 'mountain' ? [34, 62, 40] : [64, 96, 52];
    // ---- nền: bầu trời, núi, mặt đất, sương mù (dùng cho phong cảnh thường và cho phần nhìn ra ngoài qua cửa hầm)
    const backdrop = () => {
    const g = ctx.createLinearGradient(0, py - 40, 0, c.hy + 4); g.addColorStop(0, mixc(rgbOf(top), [70, 78, 90], wx)); g.addColorStop(1, mixc(rgbOf(hor), [110, 118, 128], wx));
    ctx.fillStyle = g; ctx.fillRect(px - 60, py - 60, pw + 120, ph + 120);
    if (dusk > 0.05 && wx < 0.3) { ctx.fillStyle = 'rgba(255,140,60,' + Math.min(0.35, dusk * 0.3) + ')'; ctx.fillRect(px - 60, c.hy - 60, pw + 120, 70); }
    if (night > 0.4 && wx < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (night - 0.4)) + ')'; for (let i = 0; i < 40; i++) ctx.fillRect(px + hash(i * 17) * pw, py + hash(i * 31 + 7) * (c.hy - py - 8), 1.2, 1.2); }
    // núi xa (đường chân trời) theo cảnh quan phía trước
    const bFar = biomeAt(4000), hillH = bFar === 'mountain' ? 34 : bFar === 'urban' ? 8 : 14;
    ctx.fillStyle = mixc([24, 36, 54], [76, 104, 124], day * (1 - wx * 0.5)); ctx.beginPath(); ctx.moveTo(px - 60, c.hy + 4);
    for (let x = px - 60; x <= px + pw + 68; x += 6) { const sx = x + T.x * 0.002 * dirS; const hh = hillH * (0.5 + 0.5 * Math.sin(sx / 47) * Math.sin(sx / 113 + 1.3)) + hillH * 0.25 * Math.sin(sx / 19); ctx.lineTo(x, c.hy + 4 - Math.max(2, hh)); }
    ctx.lineTo(px + pw + 68, c.hy + 4); ctx.closePath(); ctx.fill();
    // núi Phú Sĩ ở km ~140: vị trí ngang cố định 25 km cạnh đường (xấp xỉ [I])
    if (W.lineId === 'tsk') { const sF = S.sOfKm(140, W.dir, L.kmEnd), Zf = sF - T.x, Xf = W.dir === 'up' ? 26000 : -26000; if (Zf > 1500 && Zf < 90000) { const dist = Math.hypot(Zf, Xf), sx = c.cx + c.f * (MIR * Xf - c.camX) / Zf, hF = 3776 / dist * c.f * 1.2, wF = hF * 2.3, yb = c.hy + 4;
      if (sx > px - wF && sx < px + pw + wF) { ctx.fillStyle = mixc([32, 44, 78], [86, 112, 150], day * (1 - wx * 0.6)); ctx.beginPath(); ctx.moveTo(sx - wF, yb); ctx.lineTo(sx - wF * 0.07, yb - hF); ctx.lineTo(sx + wF * 0.07, yb - hF); ctx.lineTo(sx + wF, yb); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(245,248,255,' + (0.5 + 0.4 * day) + ')'; ctx.beginPath(); ctx.moveTo(sx - wF * 0.3, yb - hF * 0.72); ctx.lineTo(sx - wF * 0.07, yb - hF); ctx.lineTo(sx + wF * 0.07, yb - hF); ctx.lineTo(sx + wF * 0.3, yb - hF * 0.7); ctx.lineTo(sx + wF * 0.16, yb - hF * 0.78); ctx.lineTo(sx + wF * 0.05, yb - hF * 0.68); ctx.lineTo(sx - wF * 0.07, yb - hF * 0.8); ctx.closePath(); ctx.fill(); } } }

    // ---- mặt đất
    const gg = ctx.createLinearGradient(0, c.hy, 0, py + ph); gg.addColorStop(0, mixc([14, 20, 27], rgbOf(mixc([gcol[0] * 0.8, gcol[1] * 0.85, gcol[2] * 0.9], gcol, 0)), day * (1 - wx * 0.35)) ); gg.addColorStop(1, mixc([8, 12, 16], gcol, day * (1 - wx * 0.3)));
    ctx.fillStyle = gg; ctx.fillRect(px - 60, c.hy + 3, pw + 120, py + ph - c.hy + 60);
    // sương mù/thời tiết kéo màu đường chân trời xuống mặt đất xa
    const fg = ctx.createLinearGradient(0, c.hy, 0, c.hy + 60); fg.addColorStop(0, mixc(rgbOf(hor), [110, 118, 128], wx)); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.55; ctx.fillStyle = fg; ctx.fillRect(px - 60, c.hy + 2, pw + 120, 60); ctx.globalAlpha = 1;

    };
    if (zExit === null) backdrop();

    // ---- cầu (sông bên dưới) và cầu cạn: bản mặt cầu bê tông rộng ra theo sân ga, lan can và gờ bệ
    if (zExit === null) {
      const runs = []; let prev = null; for (let z = 0; z <= ZF; z += 20) { const k = S.structAt(L, km(z)); if (k === prev) runs[runs.length - 1][1] = z + 20; else { runs.push([z, z + 20, k]); prev = k; } }
      const colTop = mixc([22, 26, 32], [150, 156, 160], day * (1 - wx * 0.35)), colSide = mixc([14, 16, 20], [104, 110, 116], day * (1 - wx * 0.35)), colDeck = mixc([20, 24, 28], [112, 116, 118], day * (1 - wx * 0.35));
      const xr = z => { let x = 2.9; for (const q of sts) x += Math.max(0, q.st.extent[1] + 0.4 - 2.9) * LAY.spread(T.x + z, q.m.s); return x; };
      const xl = z => { const base = oppAt(z) - 2.9; let x = base; for (const q of sts) x = Math.min(x, lerp(base, q.st.extent[0] - 0.4, LAY.spread(T.x + z, q.m.s))); return x; };
      for (const [za, zb, k] of runs) {
        if (k === 'b') strip(() => -70, () => 70, -LAY.ELEV.b, za, zb, mixc([10, 22, 34], [66, 104, 132], day * (1 - wx * 0.4)));
        if (k === 'v' || k === 'b') { strip(xl, xr, -0.02, za, zb, colDeck); for (const xf of [xr, xl]) { wall(xf, 0, 1.0, za, zb, colTop); wall(xf, -1.4, 0, za, zb, colSide); } }
      }
    }

    // ---- đường ray và đá dăm (theo đường cong); các đường của ga toả ra từ đường chính
    const ballast = mixc([20, 24, 28], [88, 88, 84], day * (1 - wx * 0.3));
    const ballastStrip = (xf, z0, z1, alpha) => { z0 = Math.max(z0, zMin); z1 = Math.min(z1, zLim); if (z1 <= z0) return; strip(z => xf(z) - 2.1, z => xf(z) + 2.1, 0, z0, z1, ballast.replace('rgb', 'rgba').replace(')', ',' + (alpha == null ? 1 : alpha) + ')')); };
    const railStrip = (xf, z0, z1, sleepers) => {
      z0 = Math.max(z0, zMin); z1 = Math.min(z1, zLim); if (z1 <= z0) return;
      if (sleepers) for (let k = Math.ceil((T.x + z0) / 1.3), z = k * 1.3 - T.x; z < Math.min(z1, 110); k++, z = k * 1.3 - T.x) { const X = xf(z), p = P(X - 1.3, 0, z), q = P(X + 1.3, 0, z), d = P(X + 1.3, 0, z + 0.28), e = P(X - 1.3, 0, z + 0.28); if (d[1] - q[1] < 0.4 && z > 40) continue; quad(p, q, d, e, 'rgba(34,36,40,.85)'); }
      for (const sx of [-GAUGE / 2, GAUGE / 2]) strip(z => xf(z) + sx - 0.075, z => xf(z) + sx + 0.075, 0.15, z0, z1, 'rgba(208,216,226,.9)');
    };
    const drawTracks = (zFrom) => {
      const zf = zFrom || ZN, parts = [[() => 0, zf, ZF, 1], [oppAt, zf, ZF, zExit === null ? 0.95 : 1]];
      for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; if (q.d + 630 < ZN || q.d - 1150 > ZF) continue; parts.push([z => lerp(t.plain, t.x, LAY.spread(T.x + z, q.m.s)), Math.max(zf, q.d - 1150), q.d + 630, 0.95]); }
      for (const [xf, z0, z1, a] of parts) ballastStrip(xf, z0, z1, a);       // đá dăm trước: đường nhánh không còn đè lên ray đường chính
      for (const [xf, z0, z1] of parts) railStrip(xf, z0, z1, true);
      // ghi chữ X (hai ghi bắt chéo) nối đường ta và đường ngược chiều ở hai đầu mỗi ga
      for (const q of sts) for (const zc of [q.d - 1300, q.d + 720]) { if (zc + 150 < zf || zc > ZF) continue; const sm = u => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
        railStrip(z => lerp(0, oppAt(z), sm((z - zc) / 150)), zc, zc + 150, false); railStrip(z => lerp(oppAt(z), 0, sm((z - zc) / 150)), zc, zc + 150, false); }
    };
    // khung cửa ra hầm: hầm thường là vòm; ga ngầm (Tokyo, Ueno của Tohoku) mở rộng bằng cả bề ngang sân ga
    const openingPoly = () => { if (zExit === null || zExit <= ZN) return null; const z = zExit, near = sts.filter(q => Math.abs(q.d - z) < 150 && q.st.extent), wide = near.length ? [Math.min(...near.map(q => q.st.extent[0])) - 0.8, Math.max(...near.map(q => q.st.extent[1])) + 0.8] : null, pts = [];
      if (wide) { const [x0, x1] = wide; for (const [x, y] of [[x1, 0], [x1, 6.2], [x1 - 2.5, 8.0], [x0 + 2.5, 8.0], [x0, 6.2], [x0, 0]]) pts.push(P(x, y, z)); }
      else { for (let i = 0; i <= 28; i++) { const th = Math.PI * i / 28; pts.push(P(5.0 * Math.cos(th), Math.sin(th) * 7.4 + 0.0, z)); } pts.unshift(P(5.0, 0, z)); pts.push(P(-5.0, 0, z)); }
      return pts; };
    const polyPath = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const outItems = [];
    if (zExit !== null) {
      const op = openingPoly();
      if (op) { ctx.save(); polyPath(op); ctx.clip(); backdrop(); zLim = ZF; drawTracks(zExit); outItems.length = 0; zLim = zExit; ctx.restore(); }
    }
    if (zExit !== null) {   // lòng hầm: tường tối có khoét lỗ ở cửa ra (nhìn thấy phong cảnh bên ngoài), đèn trần
      const tw = ctx.createLinearGradient(0, py, 0, py + ph); tw.addColorStop(0, '#2a3038'); tw.addColorStop(0.5, '#0c0f13'); tw.addColorStop(1, '#1a1f26'); ctx.fillStyle = tw;
      const op = openingPoly(); ctx.beginPath(); ctx.rect(px - 60, py - 60, pw + 120, ph + 120); if (op) op.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill('evenodd');
      for (const sgn of [-1, 1]) for (let k = Math.ceil((T.x + ZN) / 18), z = k * 18 - T.x; z < Math.min(420, zExit); k++, z = k * 18 - T.x) { const a = P(sgn * 2.9, 6.3, z); const r = Math.max(1.2, 0.18 * c.f / z); const gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 4); gl.addColorStop(0, 'rgba(255,236,170,.9)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 4, a[1] - r * 4, r * 8, r * 8); }
    }
    drawTracks();
    // đèn pha: chỉ bật khi tối, trong hầm, hoặc mưa/tuyết lúc nhá nhem; ban ngày ngoài hầm thì tắt. Chùm sáng bám đường đang chạy (kể cả đường nhánh/đường cong)
    const lampOn = S.lampOn(W, T), lightLvl = lampOn ? Math.max(0.55, night * (1 - wx * 0.2), zExit !== null ? 0.9 : 0) : 0;
    if (lampOn) { const lg = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); lg.addColorStop(0, 'rgba(255,246,210,' + 0.75 * lightLvl + ')'); lg.addColorStop(0.45, 'rgba(255,246,210,' + 0.32 * lightLvl + ')'); lg.addColorStop(1, 'rgba(255,246,210,0)');
      const cx0 = c.lane; strip(z => cx0 - 3.4, z => cx0 + 3.4, 0, ZN, 900, lg);
      const lg2 = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); lg2.addColorStop(0, 'rgba(255,246,210,' + 0.2 * lightLvl + ')'); lg2.addColorStop(0.6, 'rgba(255,246,210,0)'); strip(z => cx0 - 9, z => cx0 + 9, 0.02, ZN, 260, lg2); }

    // ---- sân ga theo bố trí thật của từng ga (hàm: vẽ được cả bên ngoài lẫn nhìn qua cửa hầm vào ga ngầm)
    sink = items;
    const drawStations = () => {
    for (const q of sts) {
      const { m, i, d, st } = q;
      const z0 = Math.max(zMin, d - 420), z1 = d + 20; if (z1 <= zMin || d - 420 > ZF) continue;
      const dwellHere = T.phase === 'dwell' && T.k === i, openDoors = dwellHere && T.door === 'open';
      const topc = mixc([40, 52, 68], [120, 134, 150], day * (1 - wx * 0.3));
      for (const p of st.plats) {
        const isOurs = q.stopHere && st.plat === p;
        // mặt trên, mặt đứng hai mép, vạch vàng an toàn ở mép kề đường
        strip(() => p.xa, () => p.xb, PH, z0, z1, topc);
        for (const e of [p.xa, p.xb]) { const adj = st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01); wall(() => e, 0, PH, z0, z1, '#3a4a5c'); if (adj) { const inward = e === p.xa ? 1 : -1; strip(() => e, () => e + inward * 0.55, PH, z0, z1, '#e8c93a'); } }
        // mái ga (nửa trong suốt)
        // mái ga đặc, chừa hở phía trên đường ray (lùi 1,2 m khỏi mép kề đường) và nghiêng: mép kề đường thấp 5,2 m, mép ngoài / đỉnh mái cao 6,2 m (đảo: hai mái dốc về hai phía)
        // vẽ theo từng đoạn 30 m vào danh sách xa → gần để phong cảnh phía sau không đè lên mái
        { const under = mixc([22, 28, 38], [104, 116, 132], day * (1 - wx * 0.3)), edge = mixc([30, 38, 50], [150, 160, 172], day * (1 - wx * 0.3)), isAdj = e => st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01),
            adjA = isAdj(p.xa), adjB = isAdj(p.xb), ra = p.xa + (adjA ? 1.2 : 0), rb = p.xb - (adjB ? 1.2 : 0), ya = adjA ? 5.2 : 6.2, yb = adjB ? 5.2 : 6.2, rm = (ra + rb) / 2, ym = adjA && adjB ? 6.2 : (ya + yb) / 2,
            pts = adjA && adjB ? [[ra, ya], [rm, ym], [rb, yb]] : [[ra, ya], [rb, yb]];
          for (let za = Math.max(z0, ZN); za < z1; za += 30) { const zb = Math.min(z1, za + 30);
            sink.push({ z: (za + zb) / 2, fn: () => { for (let k = 0; k + 1 < pts.length; k++) quad(P(pts[k][0], pts[k][1], za), P(pts[k + 1][0], pts[k + 1][1], za), P(pts[k + 1][0], pts[k + 1][1], zb), P(pts[k][0], pts[k][1], zb), under);
              for (const [x, y] of [pts[0], pts[pts.length - 1]]) quad(P(x, y, za), P(x, y + 0.45, za), P(x, y + 0.45, zb), P(x, y, zb), edge); } }); } }
        // cột mái
        const xc = (p.xa + p.xb) / 2; for (let zz = Math.ceil((z0 - d) / 30) * 30 + d; zz < z1; zz += 30) if (zz >= ZN) sink.push({ z: zz, fn: () => { const a = P(xc, PH, zz), b = P(xc, 5.6, zz); ctx.strokeStyle = '#2c3d52'; ctx.lineWidth = Math.max(1, 0.35 * c.f / zz); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } });
        // hành khách trên sân ga (vơi dần khi lên tàu)
        const gone = dwellHere && isOurs ? clamp(T.dwellT / 22, 0, 1) : 0, count = Math.round((isOurs ? 30 : q.stopHere ? 14 : 5) * (p.xb - p.xa) / 9), sd = Math.round(p.xa);
        for (let k = 0; k < count; k++) { if (hash(i * 977 + k * 13 + 5 + sd) < gone) continue; const zz = d - 400 + hash(i * 131 + k * 7 + 1 + sd) * 410, X = lerp(p.xa + 1.0, p.xb - 1.0, hash(i * 53 + k * 11 + 3 + sd)); if (zz < ZN || zz > 700) continue;
          sink.push({ z: zz, fn: () => { const s = c.f / zz, a = P(X, PH, zz); ctx.fillStyle = personColor(k + i); ctx.fillRect(a[0] - 0.22 * s, a[1] - 1.45 * s, 0.44 * s, 0.75 * s); ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, 0.1 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.1 * s, a[1]); ctx.moveTo(a[0] + 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.1 * s, a[1]); ctx.stroke(); ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.58 * s, 0.12 * s, 0, 7); ctx.fill(); } }); }
      }
      // cửa chắn kính, cửa tàu, tên ga, vạch dừng và biển khoảng cách ở sân ga kề đường dừng của ta
      if (st.plat && !m.mainStop) {
        const sg = st.platSign, Xe = st.ours.x + sg * PEDGE;
        wall(() => Xe + sg * 0.2, PH, PH + 1.4, z0, z1, 'rgba(150,205,235,.22)');
        for (let car = 0; car < 16; car++) for (const off of [3.5, 21.5]) { const zz = d - (car * 25 + (25 - off)); if (zz < ZN || zz > 600) continue;
          sink.push({ z: zz, fn: () => { const w2 = 1.7, a = P(Xe + sg * 0.2, PH, zz - w2 / 2), b = P(Xe + sg * 0.2, PH + 1.45, zz + w2 / 2); ctx.fillStyle = openDoors ? 'rgba(10,14,20,.85)' : 'rgba(170,215,240,.35)'; ctx.fillRect(Math.min(a[0], b[0]), b[1], Math.abs(b[0] - a[0]), a[1] - b[1]); ctx.strokeStyle = '#8aa0b5'; ctx.lineWidth = 1; ctx.strokeRect(Math.min(a[0], b[0]), b[1], Math.abs(b[0] - a[0]), a[1] - b[1]); } }); }
        if (q.stopHere || q.isT) sink.push({ z: Math.max(d - 70, ZN + 1), fn: () => { const zz = Math.max(d - 70, ZN + 1), xc = (st.plat.xa + st.plat.xb) / 2, a = P(xc + 3.4, 4.6, zz), b = P(xc - 3.4, 3.7, zz), x0 = Math.min(a[0], b[0]), ww = Math.abs(b[0] - a[0]); if (ww < 8) return; ctx.fillStyle = '#1f6f4a'; ctx.fillRect(x0, a[1], ww, b[1] - a[1]); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; const label = (m.jp || '') + '  ' + m.name; let fs = Math.max(7, (b[1] - a[1]) * 0.42); ctx.font = 'bold ' + fs + 'px system-ui'; const tw = ctx.measureText(label).width; if (tw > ww * 0.92) { fs *= ww * 0.92 / tw; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(label, x0 + ww / 2, a[1] + (b[1] - a[1]) * 0.66); } });
        if (q.isT) {
          sink.push({ z: d, fn: () => { const x1 = Xe, x2 = Xe + sg * 7; quad(P(x1, PH, d), P(x2, PH, d), P(x2, PH, d + 0.4), P(x1, PH, d + 0.4), '#4cd68a'); const a = P(Xe + sg * 1.3, PH + 3.6, d), b = P(Xe + sg * 1.3, PH, d); ctx.strokeStyle = '#4cd68a'; ctx.lineWidth = Math.max(1, 0.12 * c.f / d); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const pl = P(Xe + sg * 0.4, PH + 3.8, d), pr = P(Xe + sg * 2.6, PH + 3.0, d); ctx.fillStyle = '#4cd68a'; ctx.fillRect(Math.min(pl[0], pr[0]), pl[1], Math.abs(pr[0] - pl[0]), pr[1] - pl[1]); const hh = pr[1] - pl[1]; if (hh > 5) { ctx.fillStyle = '#082016'; ctx.textAlign = 'center'; ctx.font = 'bold ' + hh * 0.62 + 'px system-ui'; ctx.fillText('VẠCH', (pl[0] + pr[0]) / 2, pl[1] + hh * 0.72); } } });
          for (const mm of [300, 200, 100, 50, 25, 10]) { const zz = d - mm; if (zz < ZN) continue; sink.push({ z: zz, fn: () => { const onP = zz > d - 420, Yb = onP ? PH : 0, X = onP ? Xe + sg * 1.1 : st.ours.x + sg * 1.6, a = P(X, Yb + 2.3, zz), b = P(X, Yb + 1.3, zz), wpx = (b[1] - a[1]) * 1.2; ctx.strokeStyle = '#7a8ea5'; ctx.lineWidth = Math.max(1, 0.07 * c.f / zz); const bt = P(X, Yb, zz); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = '#ffc247'; ctx.fillRect(a[0] - wpx / 2, a[1], wpx, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.62 + 'px system-ui'; ctx.fillText(mm, a[0], b[1] - (b[1] - a[1]) * 0.25); } } }); }
        }
      }
    }
    };
    drawStations();

    // ---- dây điện trên cao (mỗi đường) và trụ điện giữa hai đường chính
    const wire = (xf, z0, z1) => { const zs = zsteps(Math.max(z0, zMin), Math.min(z1, zLim)); if (zs.length < 2) return; ctx.beginPath(); zs.forEach((z, k) => { const p = P(xf(z), 5.2, z); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); };
    ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; wire(() => 0, ZN, ZF); wire(oppAt, ZN, ZF);
    for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; wire(z => lerp(t.plain, t.x, LAY.spread(T.x + z, q.m.s)), q.d - 1150, q.d + 630); }
    for (let k = Math.ceil((T.x + ZN) / 50), z = k * 50 - T.x; z < Math.min(1600, zLim); k++, z = k * 50 - T.x) items.push({ z, fn: () => { const oz = oppAt(z), X = oz / 2, a = P(X, 0, z), b = P(X, 7.0, z), w = Math.max(1, 0.32 * c.f / z); ctx.strokeStyle = '#4a5c70'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = Math.max(1, w * 0.5); for (const XX of [0, oz]) { const e = P(XX, 5.5, z); ctx.beginPath(); ctx.moveTo(b[0], b[1] + 0.5 * c.f / z); ctx.lineTo(e[0], e[1]); ctx.stroke(); } if (inSnow) { ctx.fillStyle = '#f2f6fb'; ctx.fillRect(b[0] - w, b[1] - 1, w * 2, 2); } } });

    // ---- phong cảnh hai bên (không vẽ trong hầm); giữ hành lang đường sắt và sân ga
    {
      const zMin = zExit === null ? 6 : zExit + 2, tgt = zExit === null ? items : outItems;
      const bands = [[10, 160, 16, 0], [160, 760, 38, 1], [760, 2400, 120, 2]];
      for (const [za, zb, step, bi] of bands) for (let ci = Math.floor((T.x + za) / step); ci * step - T.x < zb; ci++) {
        const z = ci * step - T.x; if (z < za * 0.9) continue; const bio = biomeAt(z);
        for (const side of [-1, 1]) { const o = cellObject(ci + bi * 100000, bio, side); if (!o) continue; const zz = z + (hash(ci * 3 + side) - 0.5) * step * 0.6; if (zz < zMin) continue; if (S.structAt(L, km(zz)) === 'b' || S.structAt(L, km(zz + (o.d || 0))) === 'b') continue;      // trên sông không có nhà, ruộng, cây
          const half = o.w / 2, qz = inStationZone(zz, zz + (o.d || 0)), ext = qz ? qz.st.extent : [Math.min(ADJ, oppAt(zz)), 0];
          const margin = qz ? (o.kind === 'building' ? 14 : 12) : (o.kind === 'building' ? 12 : o.kind === 'field' ? 14 : 8), off = half + o.lat * 0.5, X = side > 0 ? Math.max(ext[1], 0) + margin + off : Math.min(ext[0], ADJ) - margin - off;
          tgt.push({ z: zz, fn: () => drawCell(ctx, c, o, X, zz, day, wx, night, inSnow, windy, now, fadeA, quad, PG) }); } }
    }
    // ---- biển chạy chậm, công nhân, hươu, dây điện hỏng
    for (const zn of W.zones.concat(S.turnoutZones(T).map(z => ({ s0: z.s0, s1: z.s1, v: z.v, tA: -1e9, tB: 1e9 })))) {   // gồm biển tốc độ qua ghi vào/ra đường sân ga
      if (zn.hold || W.t > zn.tB || W.t < zn.tA - 1 || zn.v * 3.6 >= 284 || zn.s1 - zn.s0 > 5e8) continue;
      const num = Math.round(zn.v * 3.6 / 10) * 10;
      for (const [s, txt, col] of [[zn.s0, String(num), '#ffd23a'], [zn.s1, '解除', '#e8eef5']]) { const z = s - T.x; if (z < ZN || z > 1800) continue;
        items.push({ z, fn: () => { const X = 3.4, a = P(X, 3.3, z), b = P(X, 2.3, z), w = (b[1] - a[1]) * 1.25, bt = P(X, 0, z); ctx.strokeStyle = '#6b7f95'; ctx.lineWidth = Math.max(1, 0.1 * c.f / z); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(a[0] - w / 2, a[1], w, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.62 + 'px system-ui'; ctx.fillText(txt, a[0], b[1] - (b[1] - a[1]) * 0.22); } } }); }
    }
    for (const wk of W.workers) { if (T.x > wk.s1 + 40) continue; for (let q = 0; q < 6; q++) { const z = wk.s0 + (wk.s1 - wk.s0) * (q / 5) - T.x; if (z < ZN || z > 1600) continue;
      items.push({ z, fn: () => { const X = 3.0 + (q % 2) * 0.9, s = Math.max(c.f / z, 5.5), a = P(X, 0, z); ctx.fillStyle = '#ff8c1a'; ctx.fillRect(a[0] - 0.24 * s, a[1] - 1.5 * s, 0.48 * s, 0.8 * s); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.68 * s, 0.17 * s, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#d9b99b'; ctx.fillRect(a[0] - 0.1 * s, a[1] - 1.7 * s, 0.2 * s, 0.1 * s); ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.12 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.12 * s, a[1]); ctx.moveTo(a[0] + 0.12 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.12 * s, a[1]); ctx.stroke(); if (q === 0 && Math.floor(now / 350) % 2) { ctx.fillStyle = 'rgba(255,60,30,.9)'; ctx.beginPath(); ctx.arc(a[0] + 0.6 * s, a[1] - 1.2 * s, 0.16 * s, 0, 7); ctx.fill(); } } }); } }
    for (const an of W.animals) { if (!an.active) continue; const z = an.s - T.x; if (z < ZN - 30 || z > 1800) continue; const fl = an.fleeT0 !== undefined ? W.t - an.fleeT0 : -1; if (fl > 2.4) continue;
      items.push({ z: Math.max(z, ZN), fn: () => { const X = 3.8 + (fl > 0 ? fl * 9 : 0), zz = Math.max(z + (fl > 0 ? fl * 6 : 0), ZN), s = Math.max(c.f / zz, 6), a = P(X, fl > 0 ? Math.min(1.2, fl * 1.2) : 0, zz), h = 1.5 * s; ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.ellipse(a[0], a[1] - h * 0.55, h * 0.5, h * 0.22, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#4a321c'; ctx.lineWidth = Math.max(1, h * 0.07); ctx.beginPath(); for (const dx of [-0.32, -0.12, 0.18, 0.34]) { ctx.moveTo(a[0] + h * dx, a[1] - h * 0.4); ctx.lineTo(a[0] + h * dx, a[1]); } ctx.moveTo(a[0] + h * 0.38, a[1] - h * 0.7); ctx.lineTo(a[0] + h * 0.55, a[1] - h * 1.0); ctx.moveTo(a[0] + h * 0.55, a[1] - h * 1.0); ctx.lineTo(a[0] + h * 0.46, a[1] - h * 1.22); ctx.moveTo(a[0] + h * 0.55, a[1] - h * 1.0); ctx.lineTo(a[0] + h * 0.66, a[1] - h * 1.2); ctx.stroke(); } }); }
    for (const wr of W.wires || []) { const z = wr.s - T.x; if (W.t > wr.tB || z < ZN || z > 2000) continue; items.push({ z, fn: () => { const a = P(0, 5.2, z - 40), b = P(0, 5.2, z + 40), m = P(0, 1.4, z); ctx.strokeStyle = '#8a98a8'; ctx.lineWidth = Math.max(1, 1.6 * c.f / z * 0.3); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1] + 0.8 * c.f / z, b[0], b[1]); ctx.stroke(); if (Math.floor(now / 120) % 3) { ctx.fillStyle = '#ffd24a'; for (let i = 0; i < 7; i++) ctx.fillRect(m[0] + (Math.random() - 0.5) * 4 * c.f / z, m[1] + (Math.random() - 0.5) * 3 * c.f / z, 2, 2); } } }); }
    // ---- tàu: phía trước (mặt tàu), ngược chiều, và tàu vượt (dải nhìn ngang chiếu phối cảnh)
    const iconFor = key => { const k = SMAP[key] || 'n700'; const f = R.fronts && R.fronts[k]; return f && f.ready ? f : null; };
    const drawFront = (ic, X, z, alpha) => { const w = Math.max(3.4 * c.f / z, 9), h = w * ic.img.height / ic.img.width, a = P(X, 0.1, z); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(ic.img, a[0] - w / 2, a[1] - h, w, h); ctx.globalAlpha = 1; };
    const Ld = W.lead;
    if (Ld && Ld.phase !== 'end') { const tail = Ld.x - Ld.veh.len - T.x, ic = iconFor(Ld.veh.key); if (tail > ZN && tail < 6000) { /* tàu phía trước đỗ ở đường dừng KHÁC của ta nếu ga có từ 2 đường dừng */ const qL = Ld.phase === 'dwell' ? sts.find(q => Math.abs(q.m.s - Ld.x) < 60) : null, other = qL && qL.st.tracks.find(t => t.own && !t.thr && t !== qL.st.ours && qL.st.stops.includes(t)), X = qL ? (other ? other : qL.st.ours).x : 0;      items.push({ z: tail, fn: () => { if (ic) drawFront(ic, X, tail, fadeA(tail)); else { const w = 3.4 * c.f / tail, a = P(X, 0.1, tail); ctx.fillStyle = '#d8dee6'; ctx.fillRect(a[0] - w / 2, a[1] - w * 1.1, w, w * 1.1); } if (Ld.phase === 'run') { const a = P(X, 1.1, tail), w = 3.4 * c.f / tail; ctx.fillStyle = 'rgba(255,40,30,.95)'; ctx.beginPath(); ctx.arc(a[0] - w * 0.3, a[1], Math.max(1, w * 0.04), 0, 7); ctx.arc(a[0] + w * 0.3, a[1], Math.max(1, w * 0.04), 0, 7); ctx.fill(); } } }); } }
    const ricon = iconFor(W.lineId === 'toh' ? 'E5' : 'N700');
    // vẽ thân tàu bằng các lát ảnh nhìn ngang chiếu phối cảnh. sign=-1: thân kéo về phía sau mũi (tàu vượt); sign=+1: thân kéo ra xa mũi (tàu ngược chiều)
    const slices = (sp, lenM, zRef, fxp, sign) => {
      if (!sp || !sp.ready) return; const m = sp.meta, xrel = Math.max(0.5, Math.abs(fxp - c.lane)), lo = sign < 0 ? Math.max(zRef - lenM, ZN) : Math.max(zRef, ZN), hi = sign < 0 ? zRef : zRef + lenM; if (hi <= lo) return;
      const tOf = z => sign < 0 ? (zRef - z) / lenM : (z - zRef) / lenM;           // 0 ở mũi tàu, 1 ở đuôi
      let z = lo, n = 0;
      while (z < hi && n++ < 700) {
        const dz = clamp(z * z * 3 / (c.f * xrel), 0.04, 8), z2 = Math.min(hi, z + dz), zm = (z + z2) / 2, xa = P(fxp, 0, z)[0], xb = P(fxp, 0, z2)[0];   // lát mảnh ≤ ~3 px nên thân tàu liền một khối, không bậc thang
        const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
        if (x1 > px - 40 && x0 < px + pw + 40) { const s0 = (1 - tOf(z)) * m.width, s1 = (1 - tOf(z2)) * m.width, sx = Math.min(s0, s1), sw = Math.max(0.5, Math.abs(s1 - s0)), hgt = c.f * 3.7 / zm, a0 = P(fxp, 0.1, zm); ctx.drawImage(sp.img, sx, 0, Math.min(sw, m.width - sx), m.height, x0, a0[1] - hgt, x1 - x0 + 0.8, hgt); }
        z = z2;
      }
    };
    if (T.v > 20) for (const t0 of W.opposing || []) { const VR = 200, zN = (t0 - W.t) * VR, key = W.lineId === 'toh' ? 'E5' : 'N700', veh = S.VEH[key] || S.VEH.N700; if (zN > 900 || zN < -veh.len - 20) continue;
      const fxp = ADJ + (c.lane > ADJ ? 1.85 : -1.85), sp = R.sprites && R.sprites[SMAP[key] || 'n700'];
      items.push({ z: Math.max(zN, ZN + 1), fn: () => { if (zN > ZN && ricon) drawFront(ricon, oppAt(zN), zN, 1); if (zN < 60) slices(sp, veh.len, zN, fxp, 1); const u = 1 - Math.abs(zN) / 400; if (u > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.1 * u + ')'; ctx.fillRect(px, py, pw, ph); } } }); }
    const pl = T.phase === 'dwell' ? (W.passers && W.passers[T.k]) : null;
    if (pl) for (const p of pl) { const u = (W.t - (p.t - 4.5)) / 9; if (u > 0 && u < 1) { const key = p.v || (W.lineId === 'toh' ? 'E5' : 'N700'), veh = S.VEH[key] || S.VEH.N700, sp = R.sprites && R.sprites[SMAP[key] || 'n700'], zFront = -veh.len + u * (veh.len + 520), fxp = 0 + (c.lane > 0 ? 1.85 : -1.85);
      items.push({ z: Math.max(zFront, ZN + 2), fn: () => slices(sp, veh.len, zFront, fxp, -1) }); } }

    // phong cảnh bên ngoài hầm, nhìn qua cửa ra (vẽ sau cùng nhưng chỉ trong khung cửa ra, đè lên tường hầm tối)
    if (zExit !== null && outItems.length) { const op = openingPoly(); if (op) { ctx.save(); polyPath(op); ctx.clip(); outItems.sort((a, b) => b.z - a.z); for (const it of outItems) it.fn(); ctx.restore(); } }
    // ---- vẽ các vật theo thứ tự xa → gần
    items.sort((a, b) => b.z - a.z);
    for (const it of items) { if (it.z < ZN || it.z > zLim) continue; it.fn(); }

    // ---- cửa hầm phía trước: mặt cửa (toà nhà ở đô thị / sườn đồi), khung cửa chữ nhật hoặc vòm, nhìn thấy ray, đèn trần và sân ga ngầm bên trong
    if (entryZ !== null) {
      const ent = entryZ, urbanEnt = biomeAt(ent) === 'urban', stIn = sts.filter(q => q.d > ent - 50 && q.d < ent + 700), wide = urbanEnt || stIn.length > 0;
      const ex0 = Math.min(ADJ - 3.6, ...stIn.map(q => q.st.extent[0] - 0.8)), ex1 = Math.max(3.6, ...stIn.map(q => q.st.extent[1] + 0.8)), xc0 = (ex0 + ex1) / 2, hw = (ex1 - ex0) / 2;
      const poly = []; if (wide) { for (const [x, y] of [[ex1, 0], [ex1, 6.6], [ex1 - 1.4, 8.0], [ex0 + 1.4, 8.0], [ex0, 6.6], [ex0, 0]]) poly.push(P(x, y, ent)); } else { for (let i = 0; i <= 28; i++) { const th = Math.PI * i / 28; poly.push(P(xc0 + hw * Math.cos(th), 0.1 + 7.8 * Math.sin(th), ent)); } poly.push(P(xc0 - hw, 0, ent)); poly.unshift(P(xc0 + hw, 0, ent)); }
      // mặt cửa
      if (urbanEnt || stIn.length) {          // toà nhà bê tông nhiều tầng có cửa sổ, ban công, mái, biển hiệu; cửa hầm là ô chữ nhật ở tầng trệt
        for (let xa = -78, ci = 0; xa < 78; xa += 12, ci++) { const hh = (xa + 12 > ex0 - 6 && xa < ex1 + 6) ? 20 + hash(ci * 5 + 1) * 8 : 9 + hash(ci * 7 + Math.floor(ent / 50)) * 26, tone = hash(ci * 11 + 3), bc = mixc([22 + tone * 14, 26 + tone * 12, 34 + tone * 10], [130 + tone * 40, 134 + tone * 34, 142 + tone * 30], day * (1 - wx * 0.35));
          const A = P(xa, 0, ent), B = P(xa + 12, 0, ent), C = P(xa + 12, hh, ent), Dp = P(xa, hh, ent); quad(A, B, C, Dp, bc);
          const edgeC = mixc([14, 16, 22], [96, 100, 110], day * (1 - wx * 0.35)); quad(P(xa, hh, ent), P(xa + 12, hh, ent), P(xa + 12, hh + 0.7, ent), P(xa, hh + 0.7, ent), edgeC);               // mái / gờ trên
          if (hash(ci * 13 + 5) < 0.4) quad(P(xa + 3, hh + 0.7, ent), P(xa + 8, hh + 0.7, ent), P(xa + 8, hh + 2.6, ent), P(xa + 3, hh + 2.6, ent), edgeC);                                    // bồn nước / cầu thang mái
          for (let wy = 3.4, row = 0; wy < hh - 1.6; wy += 3.3, row++) for (let wx_ = xa + 1.2; wx_ < xa + 11; wx_ += 3.4) { if (Math.abs(wx_ - xc0) < hw + 1 && wy < 8.6) continue; const lit = night > 0.35 ? hash(ci * 97 + row * 17 + Math.floor(wx_)) < 0.5 : false, wc = lit ? 'rgba(255,224,130,.92)' : mixc([16, 24, 38], [92, 126, 160], day * (1 - wx * 0.4));
            quad(P(wx_, wy, ent), P(wx_ + 2.0, wy, ent), P(wx_ + 2.0, wy + 1.7, ent), P(wx_, wy + 1.7, ent), wc); if (!lit && row % 2 === 0) quad(P(wx_ - 0.1, wy - 0.18, ent), P(wx_ + 2.1, wy - 0.18, ent), P(wx_ + 2.1, wy, ent), P(wx_ - 0.1, wy, ent), edgeC); }           // cửa sổ + bệ cửa
          if (hh > 16) for (let wy = 6.7; wy < hh - 2; wy += 6.6) quad(P(xa, wy, ent), P(xa + 12, wy, ent), P(xa + 12, wy + 0.3, ent), P(xa, wy + 0.3, ent), edgeC);                                 // dải ban công
        }
        // biển ga / khung viền quanh cửa
        quad(P(ex0 - 1.2, 8.0, ent), P(ex1 + 1.2, 8.0, ent), P(ex1 + 1.2, 9.4, ent), P(ex0 - 1.2, 9.4, ent), mixc([30, 40, 52], [150, 158, 170], day * (1 - wx * 0.3)));
      } else {                                // sườn đồi: gò xanh quanh cửa vòm
        const hc = mixc([14, 24, 18], [52, 84, 56], day * (1 - wx * 0.3)), hl = P(xc0 - hw, 0, ent), hr = P(xc0 + hw, 0, ent), ht = P(xc0, 8.0, ent), ww = Math.abs(hr[0] - hl[0]), hhh = hl[1] - ht[1];
        ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(ht[0], hl[1], ww * 2.4, hhh * 1.9, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#707a86'; ctx.beginPath(); ctx.ellipse(ht[0], hl[1], ww * 0.62, hhh * 1.02, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      }
      // bên trong cửa
      ctx.save(); ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.clip();
      const ig = ctx.createLinearGradient(0, py, 0, py + ph); ig.addColorStop(0, '#1c2128'); ig.addColorStop(0.5, '#0a0d11'); ig.addColorStop(1, '#161b22'); ctx.fillStyle = ig; ctx.fillRect(px - 60, py - 60, pw + 120, ph + 120);
      const zEndIn = Math.min(ZF, entryEnd, ent + 900);
      for (const sgn of [-1, 1]) for (let k = Math.ceil((T.x + ent) / 18), z = k * 18 - T.x; z < Math.min(ent + 500, zEndIn); k++, z = k * 18 - T.x) { const a = P(sgn * 2.9, 6.3, z), r = Math.max(1.2, 0.18 * c.f / z), gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 4); gl.addColorStop(0, 'rgba(255,236,170,.9)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 4, a[1] - r * 4, r * 8, r * 8); }
      zMin = ent; zLim = zEndIn; drawTracks(ent); ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; wire(() => 0, ent, zLim); wire(oppAt, ent, zLim);
      sink = []; drawStations(); sink.sort((a, b) => b.z - a.z); for (const it of sink) if (it.z >= zMin && it.z <= zLim) it.fn();
      zMin = ZN; zLim = ZF; sink = items; ctx.restore();
      // viền khung cửa
      ctx.strokeStyle = mixc([40, 46, 56], [150, 156, 166], day * (1 - wx * 0.3)); ctx.lineWidth = Math.max(2, 0.45 * c.f / ent); ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();                                  // hết phần nghiêng theo đường cong

    // ---- hiệu ứng thời tiết, ban đêm, tốc độ
    if (night > 0.35 && zExit === null) { ctx.fillStyle = 'rgba(4,8,20,' + (0.42 * night * (1 - lightLvl * 0.15)) + ')'; ctx.fillRect(px, py, pw, ph); }
    const noW = zExit !== null;      // trong hầm: không mưa, tuyết, gió, sét
    if (!noW && (rain || (wx > 0 && !inSnow))) { ctx.fillStyle = 'rgba(120,135,150,.12)'; ctx.fillRect(px, py, pw, ph); }
    if (rain && !noW) { ctx.strokeStyle = 'rgba(190,210,245,.5)'; ctx.lineWidth = 1; const tt = now / 14; for (let q = 0; q < 110; q++) { const rx = px + ((q * 83 + tt * (1.5 + v / 40)) % pw), ry = py + ((q * 47 + tt * 9) % ph); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 - v / 12, ry + 10 + v / 8); ctx.stroke(); } }
    if (inSnow && !noW) { ctx.fillStyle = 'rgba(245,250,255,.85)'; const tt = now / 25; for (let q = 0; q < 130; q++) { const rx = px + ((q * 61 + tt * (1.2 + (q % 3) * 0.5) + Math.sin(tt / 9 + q) * 8) % pw), ry = py + ((q * 37 + tt * (1.5 + (q % 4) * 0.6)) % ph); ctx.fillRect(rx, ry, 2 + (q % 3 === 0), 2 + (q % 3 === 0)); } }
    if (windy && !noW) { ctx.strokeStyle = 'rgba(210,225,240,.3)'; ctx.lineWidth = 1; const tt = now / 6; for (let q = 0; q < 12; q++) { const ry = py + 20 + (q * 31) % (ph * 0.55), rx = px + pw - ((q * 131 + tt * (2 + q % 3)) % (pw + 80)); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 40, ry + Math.sin(tt / 40 + q) * 2); ctx.stroke(); } }
    if (v > 60 && zExit === null) { ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.12, (v - 60) / 400) + ')'; ctx.lineWidth = 1; for (let q = 0; q < 24; q++) { const ang = hash(q * 17) * Math.PI * 2, r0 = ph * (0.45 + 0.3 * ((now / 220 + q * 0.37) % 1)), r1 = r0 + 30; ctx.beginPath(); ctx.moveTo(c.cx + Math.cos(ang) * r0 * 1.6, c.hy + Math.sin(ang) * r0 * 0.5); ctx.lineTo(c.cx + Math.cos(ang) * r1 * 1.6, c.hy + Math.sin(ang) * r1 * 0.5); ctx.stroke(); } }
    if (!noW && R.aud && R.aud.lastThunder) { const dt = now - R.aud.lastThunder; const fl = (dt < 90 ? 1 : 0) + (dt > 220 && dt < 300 ? 0.7 : 0); if (fl > 0) { ctx.fillStyle = 'rgba(235,240,255,' + 0.55 * fl + ')'; ctx.fillRect(px, py, pw, ph); } }
    if (T.cut) { ctx.fillStyle = 'rgba(154,90,214,.18)'; ctx.fillRect(px, py, pw, ph); }
    // kính chắn gió: giọt nước, gạt mưa, mờ khi chưa bật gạt mưa
    if (rain && !noW) { if (!T.wiper) { ctx.fillStyle = 'rgba(165,190,225,.26)'; ctx.fillRect(px, py, pw, ph); for (let q = 0; q < 50; q++) { const x = px + hash(q * 5 + 1) * pw, y = py + hash(q * 9 + 2) * ph * 0.85; ctx.fillStyle = 'rgba(210,225,250,.35)'; ctx.beginPath(); ctx.arc(x, y, 1.5 + hash(q) * 2.5, 0, 7); ctx.fill(); } } }
    if (T.wiper) { for (const [pvx, ph0] of [[px + pw * 0.3, py + ph * 0.93], [px + pw * 0.62, py + ph * 0.93]]) { const a = Math.sin(now / 280) * 0.95 - 0.1; ctx.strokeStyle = 'rgba(15,18,24,.92)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(pvx, ph0); ctx.lineTo(pvx + Math.sin(a) * ph * 0.85, ph0 - Math.cos(a) * ph * 0.85); ctx.stroke(); } }
    // khung buồng lái (gờ kính và bảng đồng hồ phía dưới)
    const fr = ctx.createLinearGradient(0, py + ph * 0.9, 0, py + ph); fr.addColorStop(0, 'rgba(8,10,14,.0)'); fr.addColorStop(0.35, 'rgba(8,10,14,.92)'); fr.addColorStop(1, '#05070a'); ctx.fillStyle = fr; ctx.fillRect(px, py + ph * 0.9, pw, ph * 0.1);
    ctx.fillStyle = '#05070a'; ctx.fillRect(px, py, 5, ph); ctx.fillRect(px + pw - 5, py, 5, ph); ctx.fillRect(px, py, pw, 3);
    ctx.restore();
  }

  function drawCell(ctx, c, o, X, z, day, wx, night, inSnow, windy, now, fadeA, quad, P) {
    const A = fadeA(z); ctx.globalAlpha = A;
    if (o.kind === 'building') {
      const x0 = X - o.w / 2, x1 = X + o.w / 2, za = z, zb = z + o.d, body = mixc([22, 28, 40], [96, 108, 126], day * (1 - wx * 0.4));
      const near = [P(x0, 0, za), P(x1, 0, za), P(x1, o.h, za), P(x0, o.h, za)], far = [P(x0, 0, zb), P(x1, 0, zb), P(x1, o.h, zb), P(x0, o.h, zb)];
      const inner = X > 0 ? [P(x0, 0, za), P(x0, 0, zb), P(x0, o.h, zb), P(x0, o.h, za)] : [P(x1, 0, za), P(x1, 0, zb), P(x1, o.h, zb), P(x1, o.h, za)];
      quad(inner[0], inner[1], inner[2], inner[3], mixc([16, 20, 30], [78, 90, 108], day * (1 - wx * 0.4)));
      quad(near[0], near[1], near[2], near[3], body);
      quad(near[3], near[2], far[2], far[3], mixc([30, 38, 52], [120, 132, 150], day * (1 - wx * 0.4)));
      if (night > 0.35 || o.h > 30) { const lit = night > 0.35; const rows = Math.min(14, Math.floor(o.h / 3.2)), cols = Math.max(2, Math.floor(o.w / 4)); for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { if (hash(Math.floor(z) * 13 + r * 7 + q * 3 + (X | 0)) > (lit ? 0.45 : 0.9)) continue; const p = P(x0 + (q + 0.5) * o.w / cols, 2 + r * 3.2, za); const s = 1.1 * c.f / za; ctx.fillStyle = lit ? 'rgba(255,224,130,.9)' : 'rgba(40,60,90,.5)'; ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s * 0.8); } }
    } else if (o.kind === 'house') {
      const x0 = X - o.w / 2, x1 = X + o.w / 2, near = [P(x0, 0, z), P(x1, 0, z), P(x1, o.h, z), P(x0, o.h, z)];
      quad(near[0], near[1], near[2], near[3], mixc([30, 30, 36], [170, 140, 120], day * (1 - wx * 0.4)));
      const rf = P(X, o.h + 2.5, z); ctx.fillStyle = mixc([20, 20, 28], [110, 60, 50], day * (1 - wx * 0.4)); ctx.beginPath(); ctx.moveTo(P(x0 - 0.5, o.h, z)[0], near[3][1]); ctx.lineTo(rf[0], rf[1]); ctx.lineTo(P(x1 + 0.5, o.h, z)[0], near[2][1]); ctx.closePath(); ctx.fill();
      if (night > 0.35) { const w = P(X, 2.0, z); ctx.fillStyle = 'rgba(255,220,120,.9)'; const s = 1.2 * c.f / z; ctx.fillRect(w[0] - s / 2, w[1] - s / 2, s, s * 0.8); }
    } else if (o.kind === 'tree') {
      const lean = windy ? Math.sin(now / 500 + z) * 0.28 + 0.2 : 0, tb = P(X, 0, z), tt = P(X, o.h, z), s = c.f / z; ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = Math.max(1, 0.4 * s); ctx.beginPath(); ctx.moveTo(tb[0], tb[1]); ctx.lineTo(tb[0] + lean * o.h * s * 0.5, tt[1] + o.h * s * 0.3); ctx.stroke();
      ctx.fillStyle = mixc([14, 36, 24], [40 + o.tone * 30, 100 + o.tone * 20, 56], day * (1 - wx * 0.3)); const cx_ = tb[0] + lean * o.h * s * 0.5;
      if (o.conifer) { ctx.beginPath(); ctx.moveTo(cx_, tt[1] - o.h * s * 0.15); ctx.lineTo(cx_ - o.w * s * 0.5, tb[1] - o.h * s * 0.25); ctx.lineTo(cx_ + o.w * s * 0.5, tb[1] - o.h * s * 0.25); ctx.closePath(); ctx.fill(); } else { ctx.beginPath(); ctx.arc(cx_, tt[1] + o.h * s * 0.25, o.w * s * 0.55, 0, 7); ctx.fill(); }
      if (inSnow) { ctx.fillStyle = 'rgba(240,246,255,.85)'; ctx.beginPath(); ctx.arc(cx_, tt[1] + o.h * s * 0.1, o.w * s * 0.3, Math.PI, 0); ctx.fill(); }
    } else if (o.kind === 'field') {
      const x0 = X - o.w / 2, x1 = X + o.w / 2; quad(P(x0, 0, z), P(x1, 0, z), P(x1, 0, z + o.d), P(x0, 0, z + o.d), mixc([18, 30, 18], [90 + o.tone * 50, 130 + o.tone * 30, 60], day * (1 - wx * 0.3)).replace('rgb', 'rgba').replace(')', ',.8)'));
    }
    ctx.globalAlpha = 1;
  }

  root.CabView = { draw, proj, cellObject, hash, CAMH, PEDGE, PH, ADJ };
})(typeof window !== 'undefined' ? window : globalThis);
