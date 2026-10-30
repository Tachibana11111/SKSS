// Khung nhìn thẳng phía trước từ buồng lái (giả 3D, phối cảnh một điểm tụ). Dùng ảnh mặt trước thật của từng dòng tàu (rail.kychung.com) cho tàu phía trước,
// tàu ngược chiều; tàu vượt dùng dải ảnh nhìn ngang chiếu phối cảnh. Mọi thứ khác (ray, sân ga, trụ điện, nhà cửa, cây, người, biển) vẽ bằng code [I].
// Toạ độ mô hình: Z = khoảng cách phía trước (m, theo chiều chạy), X = ngang (m), Y = cao (m). Nhật chạy bên TRÁI: proj() lật X (MIR=-1) nên X dương hiện bên trái màn hình.
// Đường thông qua của ta ở X=0, đường thông qua ngược chiều ở X=-4,3 (ADJ); bố trí từng ga (số đường, sân đảo/hai bên) lấy từ layout.js; đường cong và cao độ (nền/cầu cạn/cầu/hầm) từ dữ liệu tuyến.
(function (root) {
  const CAMH = 2.9, GAUGE = 1.435, MIR = -1, ADJ = -4.3, ADJ0 = -4.3, PEDGE = 1.75, PH = 1.25, ZN = 3.5, ZF = 2600, STEP = 10;
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
  const mixc = (c1, c2, t) => 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
  const SMAP = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5', E7: 'e7', H5: 'h5', E6: 'e6', E8: 'e8', T4: 't4', E926: 'e926', E2: 'e2', 'E5+E6': 'e5', 'E5+E8': 'e5', 'E6+E5': 'e6', 'E8+E5': 'e8', 'N700S-6': 'kamome' };
  const stCache = {};
  // vị trí hai đèn (đèn pha / đèn đuôi) trên ảnh mặt trước từng mẫu tàu: [x trái, x phải, y] theo tỉ lệ rộng/cao ảnh; đo bằng mắt từ front_*.png [I]; s800 và t4 đo từ ảnh phóng to
  const LAMPS = { e2: [0.38, 0.62, 0.22], e5: [0.42, 0.58, 0.21], h5: [0.42, 0.58, 0.21], e6: [0.22, 0.78, 0.45], e7: [0.19, 0.80, 0.53], e8: [0.10, 0.88, 0.35], e926: [0.30, 0.72, 0.53], n700: [0.17, 0.82, 0.61], n700s: [0.18, 0.81, 0.60], kamome: [0.18, 0.81, 0.60], s800: [0.32, 0.68, 0.46], t4: [0.36, 0.62, 0.40] };

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
    // camera sau: toạ độ phản chiếu nên vùng toả đường của ga (trước vạch 1150 m, sau vạch 630 m) và ghi chữ X đảo phía; spread phải tính trong hệ toạ độ gốc
    const ADJ = W.rear ? -ADJ0 : ADJ0;       // nhìn lùi: ta chạy làn trái nên đường ngược chiều nằm bên TRÁI của camera
    // camera sau rẽ sớm hơn thực tế một đoạn rearShift (m) cho dễ nhìn
    const rr = !!W.rear, Lm2 = L.kmEnd * 1000, physLoZ = (rr ? -15 : -440) - T.x, physHiZ = (rr ? Lm2 + 440 : Lm2 + 15) - T.x, spreadF = rr ? (a, b) => { const so = Lm2 - a, sm = Lm2 - b, se = so <= sm + 30 ? Math.min(so + (W.rearShift || 0), sm + 30) : so; return LAY.spread(se, sm); } : LAY.spread, trackWF = rr ? (t, a, b) => { const so = Lm2 - a, sm = Lm2 - b, se = so <= sm + 30 ? Math.min(so + (W.rearShift || 0), sm + 30) : so; return LAY.trackW(t, se, sm); } : (t, a, b) => LAY.trackW(t, a, b), FA = rr ? 630 : 1150, FB = rr ? 1150 : 630, XA = rr ? 720 : 1300, XB = rr ? 1300 : 720;
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600;
    const day = smooth(5.3, 7.3, hour) * (1 - smooth(16.8, 19.0, hour)), night = 1 - day, dusk = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.2) + Math.max(0, 1 - Math.abs(hour - 17.8) / 1.3);
    const inSnow = W.zones.some(z => z.kind === 'snow' && T.x >= z.s0 - 3000 && T.x < z.s1), rain = W.rainHere;
    const windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    const wx = rain ? 0.55 : inSnow ? 0.4 : 0, fogZ = rain ? 700 : inSnow ? 900 : 3500;
    const dirS = W.dir === 'up' ? -1 : 1;
    let sh = 0; if (W.eqkAt !== undefined && W.eqkActive) sh = 5 * Math.exp(-(W.t - W.eqkAt) / 40) + 0.8; if (W.shakeAt !== undefined && W.t - W.shakeAt < 4) sh = Math.max(sh, (W.shakeAmp || 4) * Math.exp(-(W.t - W.shakeAt) / 1.2));
    const sway = 0.1 * Math.sin(T.x / 90) * Math.min(1, v / 70) + (sh > 0.1 ? (Math.random() - 0.5) * sh * 0.05 : 0);
    const bob = Math.min(1, v / 80) * (Math.sin(now / 90) * 0.4) + (sh > 0.1 ? (Math.random() - 0.5) * sh * 2 : 0);
    const c = { cx: px + pw / 2, hy: py + ph * 0.40, f: Math.min(pw * 0.92, ph * 1.45), camX: sway, pitch: bob - T.grade * 0.4, lane: 0, off: null };

    // ---- hình học phía trước: đường cong (độ lệch ngang theo khoảng cách) và cao độ tuyến so với mặt đất
    const latT = LAY.lateralTable(L, S, W.dir, T.x, ZF, STEP), elvT = LAY.elevTable(L, S, W.dir, T.x, ZF, STEP);
    const tab = (a, z) => { const f = Math.max(0, z) / STEP, i = Math.min(a.length - 2, Math.floor(f)); return a[i] + (a[i + 1] - a[i]) * (f - i); };
    c.off = z => tab(latT, z); const elAt = z => tab(elvT, z);
    // lực ly tâm khi vào cong: camera dịch ngang nhẹ ra phía ngoài (độ cong làm mượt trên ±90 m nên vào/ra cong không bị giật). Không còn xoay cả khung hình (ctx.rotate khiến mọi nét vẽ ở đoạn cong chậm hẳn trên máy yếu)
    { const kapS = LAY.curvatureSmooth(L, S, W.dir, T.x, 90); c.camX -= clamp(kapS * v * v / 9.8 * 0.6, -0.35, 0.35); }

    // ---- các ga trong tầm nhìn: bố trí đường, vị trí đường dừng của ta
    const target = S.nextTarget(T), tIdx = T.phase === 'dwell' ? T.k : target;
    const sts = [];
    M.forEach((m0, i) => { const gs = m0.sOrig !== undefined ? m0.sOrig : m0.s, m = gs === m0.s ? m0 : Object.assign({}, m0, { s: gs }), d = gs - T.x, dm = m0.s - T.x; if (d < -1000 || d > 3600) return;      // d: hình học ga (sân ga, toả đường) theo vị trí GỐC; dm: vạch dừng thật của tàu (có thể lùi lại khi chờ ghép)      // giữ ga tới 1 km phía sau để ghi chữ X lúc rời ga không biến mất sớm
       const key = W.lineId + ':' + m.i + ':' + W.dir + (W.rearPick ? ':r' : '') + (W.termPick && W.termPick[m.i] !== undefined ? ':t' + W.termPick[m.i] : ''); const st = stCache[key] || (stCache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.rearOf || W.dir, W.rearPick ? W.rearPick(m.i) : LAY.pickOf(L.stations[m.i], m.i, W), !!W.rearOf)); sts.push({ m, i, d, dm, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')),   // ga vừa dừng (kể cả dừng khẩn không có lịch) vẫn giữ đường sân ga cho tới khi tàu rời hẳn
         isT: i === tIdx }); });
    for (const q of sts) if (q.stopHere && !q.m.mainStop) { const o = q.st.ours, w = trackWF(o, T.x, q.m.s); if (o.own ? w > 0 : true) c.lane += LAY.laneOf(o, T.x, q.m.s, w, spreadF(T.x, q.m.s), XA, XB); }      // đường của ta thuộc nhóm đường chính ngược chiều (ga cuối): đi qua ghi chữ X
    const hasSingle = !!(L.single && L.single.length);
    const oppAt = z => { let x = ADJ; for (const q of sts) x += (q.st.opp - ADJ) * spreadF(T.x + z, q.m.s); return hasSingle ? x * (1 - S.singleEff(W, T.x + z)) : x; };   // đoạn đường đơn: đường ngược chiều nhập vào đường ta   // đường thông qua ngược chiều (nơi tàu ngược chiều chạy)
    const inStationZone = (za, zb) => { const qs = sts.filter(q => zb > q.d - (FA + 50) && za < q.d + (FB + 20)); return qs.length ? { st: { extent: [Math.min(...qs.map(q => q.st.extent[0])), Math.max(...qs.map(q => q.st.extent[1]))] } } : null; };   // hợp các ga trong tầm (ga vừa qua và ga sắp tới)

    const inTun = S.inTunnel(W, T.x);
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.save();
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
    // cảnh thật OpenStreetMap (world.js) nếu đã có dữ liệu tại đây: toà nhà đúng vị trí, rừng/ruộng/nước theo lớp phủ đất; không thì phong cảnh sinh ngẫu nhiên theo vùng
    const WD = root.World, wdOurs = (W.rearOf || W.dir) === 'up' ? -4.3 : 0, wdOn = !!(WD && WD.has(W.lineId, W.dir, L.kmEnd, T.x));
    const landCls = (z, e) => { const sd = WD.toSD(W.dir, L.kmEnd, T.x, z, e, wdOurs); return WD.landAt(W.lineId, sd[0], sd[1]); };
    const CLS_TREE = 'fsep', CLS_FIELD = 'a', CLS_NONE = 'hcizwmr';
    const rgbOf = s => s.match(/\d+/g).map(Number);

    // trạng thái hầm: zExit = khoảng cách tới cửa ra khi đang ở trong hầm; zLim = chân trời vẽ hiện tại (trong hầm cắt ở cửa ra, phần ngoài hầm vẽ riêng trong khung cửa ra)
    let zExit = null; for (const [k0, k1] of L.meta.tunnels) { const a = S.sOfKm(k0, W.dir, L.kmEnd), b = S.sOfKm(k1, W.dir, L.kmEnd), lo = Math.min(a, b), hi = Math.max(a, b); if (T.x >= lo && T.x <= hi) zExit = hi - T.x; }
    let zLim = zExit !== null ? zExit : ZF, zMin = ZN, sink = null;
    // cửa hầm sắp tới (khi đang ở ngoài hầm): cắt mọi thứ ở mặt cửa hầm; phần bên trong hầm vẽ riêng qua khung cửa
    let entryZ = null, entryEnd = ZF; if (zExit === null) for (const [k0, k1] of L.meta.tunnels) { const a = S.sOfKm(k0, W.dir, L.kmEnd), b = S.sOfKm(k1, W.dir, L.kmEnd), z = Math.min(a, b) - T.x; if (z > ZN && z < ZF && (entryZ === null || z < entryZ)) { entryZ = z; entryEnd = Math.max(a, b) - T.x; } }
    if (entryZ !== null) zLim = entryZ;
    const top = mixc([6, 12, 24], [92, 160, 224], day), hor = mixc([14, 24, 42], [183, 214, 240], day);
    let gb = biomeAt(60);
    if (wdOn) { const cl = [landCls(60, 40), landCls(60, -40), landCls(150, 60)].map(x => String.fromCharCode(x || 0)); const ct = k => cl.filter(x => k.includes(x) && x !== ' ').length; if (ct('hci') >= 2) gb = 'urban'; else if (ct('fsepw') >= 2) gb = 'mountain'; else if (ct('aog') >= 1) gb = 'field'; }
    const gcol0 = inSnow ? [214, 222, 232] : gb === 'urban' ? [58, 62, 66] : gb === 'mountain' ? [34, 62, 40] : [64, 96, 52];
    // nền đất cố định màu xi măng / đá dăm đúng trong đoạn hàng rào của ga (từ đầu rào tới cuối rào, cùng hằng số FA/FB với tường rào; chuyển êm 60 m nằm bên trong đoạn rào), không đổi theo quần xã xung quanh
    let gwS = 0; for (const q of sts) gwS = Math.max(gwS, LAY.smooth(q.d - FA, q.d - FA + 60, 0) * (1 - LAY.smooth(q.d + FB - 60, q.d + FB, 0)));
    const gcol = gwS > 0 ? [0, 1, 2].map(k => gcol0[k] + ([inSnow ? 214 : 82, inSnow ? 222 : 84, inSnow ? 232 : 84][k] - gcol0[k]) * gwS) : gcol0;
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
    // mặt cầu rộng thêm để chứa đường nhánh / đường chính của tuyến cha khi còn sát đường ta (< 28 m), thu lại êm khi chúng tách xa
    const jw = o => Math.max(0, Math.min(1, (28 - Math.abs(o)) / 6));
    const xr = z => { const base = Math.max(0, oppAt(z)) + 2.9; let x = base; for (const q of sts) { x = Math.max(x, lerp(base, q.st.extent[1] + 0.4, spreadF(T.x + z, q.m.s))); for (const t of q.st.tracks) if (!t.main) x = Math.max(x, lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)) + 2.9); } const o = S.trunkOff(W, T.x + z); if (o > 0.3) x = Math.max(x, lerp(base, o + 2.9, jw(o))); return x; };
    const xl = z => { const base = Math.min(0, oppAt(z)) - 2.9; let x = base; for (const q of sts) { x = Math.min(x, lerp(base, q.st.extent[0] - 0.4, spreadF(T.x + z, q.m.s))); for (const t of q.st.tracks) if (!t.main) x = Math.min(x, lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)) - 2.9); } const o = S.trunkOff(W, T.x + z); if (o < -0.3) x = Math.min(x, lerp(base, o + ADJ - 2.9, jw(o))); return x; };
    if (zExit === null) backdrop();
    // ---- dải tranh phong cảnh OSM hai bên (strips.js): thay các khối nhà 3D rời rạc; chỉ vẽ khi đã có dữ liệu và không ở trong hầm
    const useStrips = wdOn && !!root.Strips;
    if (zExit === null && useStrips) root.Strips.draw(ctx, { WD, lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, dO: wdOurs, Tx: T.x, c, el: elAt, CAMH, MIR, f: c.f, px, pw, zStart: 4, zEnd: 3000, lite: root.SCENERY === 'lite' || !!R.tile, tile: !!R.tile, edge: (side, z) => side > 0 ? Math.max(xr(z), 0) : Math.max(-xl(z), 0),
      tunnel: z => S.structAt(L, km(z)) === 't', alpha: z => fadeA(z), t: day * (1 - wx * 0.4) });

    // ---- cầu (sông bên dưới) và cầu cạn: bản mặt cầu bê tông rộng ra theo sân ga, lan can và gờ bệ
    if (zExit === null) {
      const runs = []; let prev = null; for (let z = 0; z <= ZF; z += 20) { const k = S.structAt(L, km(z)); if (k === prev) runs[runs.length - 1][1] = z + 20; else { runs.push([z, z + 20, k]); prev = k; } }
      const colTop = mixc([22, 26, 32], [150, 156, 160], day * (1 - wx * 0.35)), colSide = mixc([14, 16, 20], [104, 110, 116], day * (1 - wx * 0.35)), colDeck = mixc([20, 24, 28], [112, 116, 118], day * (1 - wx * 0.35));
      for (const [za, zb, k] of runs) {
        if (k === 'b') strip(() => -70, () => 70, -LAY.ELEV.b, za, zb, mixc([10, 22, 34], [66, 104, 132], day * (1 - wx * 0.4)));
        if (k === 'v' || k === 'b') { strip(xl, xr, -0.02, za, zb, colDeck); for (const xf of [xr, xl]) { wall(xf, 0, 1.0, za, zb, colTop); wall(xf, -1.4, 0, za, zb, colSide); }
          const zmid = (za + zb) / 2, urban = wdOn ? [landCls(zmid, 40), landCls(zmid, -40)].some(v => 'hci'.includes(String.fromCharCode(v || 0)) && v) : biomeAt(zmid) === 'urban';
          if (k === 'v' && urban) for (const xf of [xr, xl]) wall(xf, 1.0, 3.4, za, zb, day > 0.4 ? 'rgba(190,212,226,.20)' : 'rgba(80,110,140,.2)');      // tấm chắn ồn trong suốt trên cầu cạn khu dân cư
        }
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
      for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x; let a = W.dir === 'down' ? sj : sj - 3200, b = W.dir === 'down' ? sj + 3200 : sj;
        if (b > zf && a < ZF) { const cl = trunkClip(sj, a, b, zf); if (!cl) continue; [a, b] = cl; }      // trong hầm: đường của nhánh kia bị khối đá che cho tới chỗ hai vỏ hầm nhập
        if (b > zf && a < ZF) parts.push([z => S.trunkOff(W, T.x + z), Math.max(zf, a), Math.min(ZF, b), 0.95], [z => S.trunkOff(W, T.x + z) + ADJ, Math.max(zf, a), Math.min(ZF, b), 0.95]); }       // đường chính của tuyến cha (Tohoku / Joetsu)
      for (const q of sts) for (const t of q.st.tracks) { if (t.main || t.in0 === undefined) continue; const za = rr ? q.d - t.out0 - t.len : q.d - t.in0, zb = rr ? q.d + t.in0 : q.d + t.out0 + t.len; if (zb < ZN || za > ZF) continue; parts.push([z => lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)), Math.max(zf, za), zb, 0.95]); }      // mỗi đường ga chỉ tồn tại giữa điểm tách và điểm nhập (hình chữ Y)
      for (const [xf, z0, z1, a] of parts) ballastStrip(xf, Math.max(z0, physLoZ), Math.min(z1, physHiZ), a);       // đá dăm trước: đường nhánh không còn đè lên ray đường chính; đường ray dừng ở chắn cuối đường
      for (const [xf, z0, z1] of parts) railStrip(xf, Math.max(z0, physLoZ), Math.min(z1, physHiZ), true);
      // ghi chữ X (hai ghi bắt chéo) nối đường ta và đường ngược chiều ở hai đầu mỗi ga
      for (const q of sts) for (const zc of [q.d - XA, q.d + XB]) { if (zc + 150 < zf || zc > ZF) continue; const sm = u => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
        railStrip(z => lerp(0, oppAt(z), sm((z - zc) / 150)), Math.max(zc, physLoZ), Math.min(zc + 150, physHiZ), false); railStrip(z => lerp(oppAt(z), 0, sm((z - zc) / 150)), Math.max(zc, physLoZ), Math.min(zc + 150, physHiZ), false); }
      // chắn cuối đường (giảm chấn) và tường chắn ở hai đầu tuyến (ga cuối): mọi đường ray đều kết thúc ở đây
      if (zExit === null) for (const zb of [physLoZ, physHiZ]) if (zb > ZN + 2 && zb < ZF) {
        const near = sts.filter(q => Math.abs(q.d - zb) < 1600), xs = [0, oppAt(zb)]; for (const q of near) for (const t of q.st.tracks) if (!t.main) xs.push(lerp(t.plain, t.x, trackWF(t, T.x + zb, q.m.s)));
        const uniq = []; for (const x of xs) if (!uniq.some(u => Math.abs(u - x) < 1.2)) uniq.push(x);
        items.push({ z: zb, fn: () => { const steel = mixc([40, 30, 28], [150, 50, 40], day * (1 - wx * 0.3)), post = mixc([26, 28, 32], [96, 100, 104], day * (1 - wx * 0.3)), cb = mixc([22, 26, 30], [170, 174, 174], day * (1 - wx * 0.3));
          const xl0 = Math.min(...uniq) - 3.2, xr0 = Math.max(...uniq) + 3.2; quad(P(xl0, 0, zb + 4), P(xr0, 0, zb + 4), P(xr0, 4.6, zb + 4), P(xl0, 4.6, zb + 4), cb); quad(P(xl0, 4.6, zb + 4), P(xr0, 4.6, zb + 4), P(xr0, 4.9, zb + 4), P(xl0, 4.9, zb + 4), mixc([30, 34, 40], [206, 210, 210], day));
          for (const x of uniq) { quad(P(x - 1.1, 0.6, zb), P(x + 1.1, 0.6, zb), P(x + 1.1, 1.25, zb), P(x - 1.1, 1.25, zb), steel); quad(P(x - 1.05, 0, zb), P(x - 0.8, 0, zb), P(x - 0.8, 0.6, zb), P(x - 1.05, 0.6, zb), post); quad(P(x + 0.8, 0, zb), P(x + 1.05, 0, zb), P(x + 1.05, 0.6, zb), P(x + 0.8, 0.6, zb), post); quad(P(x - 1.1, 1.0, zb - 0.01), P(x + 1.1, 1.0, zb - 0.01), P(x + 1.1, 1.1, zb - 0.01), P(x - 1.1, 1.1, zb - 0.01), '#e8c93a'); } } });
      }
    };
    // khung cửa ra hầm: hầm thường là vòm; ga ngầm (Tokyo, Ueno của Tohoku) mở rộng bằng cả bề ngang sân ga
    // vỏ hầm hẹp ôm sát các đường ray: biên trái/phải = đường ngoài cùng (đường ngược chiều, đường ga, đường chính tuyến cha ở đoạn rẽ nhánh) ± chừa 2,7 m; rộng ra/hẹp lại theo ghi
    const TRUNK_SEP = 5.4;
    // trong hầm, đường/dây/cổng của nhánh kia bị khối đá che: chỉ còn đoạn hai đường đã sát nhau (độ lệch < TRUNK_SEP); trả null nếu không còn gì
    const trunkClip = (sj, a, b, zf) => { if (!(zExit !== null || S.inTunnel(W, T.x + sj))) return [a, b]; let lo = Infinity, hi = -Infinity; for (let z = Math.max(a, zf - 40); z <= Math.min(b, ZF); z += 15) if (Math.abs(S.trunkOff(W, T.x + z)) < TRUNK_SEP) { if (z < lo) lo = z; hi = z; } return lo === Infinity ? null : [Math.max(a, lo - 15), Math.min(b, hi + 15)]; };
    const spanMemo = new Map(), tunSpan = z => { const key = Math.round(z * 2); let r = spanMemo.get(key); if (r) return r; let lo = 0, hi = 0; const add = x => { if (x < lo) lo = x; if (x > hi) hi = x; }; add(oppAt(z));
      for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x, a = W.dir === 'down' ? sj : sj - 3200, b = W.dir === 'down' ? sj + 3200 : sj; if (z >= a && z <= b) { const o = S.trunkOff(W, T.x + z); if (Math.abs(o) < TRUNK_SEP) { add(o); add(o + ADJ); } } }      // hai vỏ hầm riêng (hướng A): vỏ của nhánh kia chỉ nhập vào khi hai đường đã sát nhau; khối đá giữa che đường của nhánh kia
      for (const q of sts) for (const t of q.st.tracks) { if (t.main || t.in0 === undefined) continue; const za = rr ? q.d - t.out0 - t.len : q.d - t.in0, zb = rr ? q.d + t.in0 : q.d + t.out0 + t.len; if (z >= za && z <= zb) add(lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s))); }
      r = [lo - 2.7, hi + 2.7]; spanMemo.set(key, r); return r; };
    const openingPoly = () => { if (zExit === null || zExit <= ZN) return null; const z = zExit, near = sts.filter(q => Math.abs(q.d - z) < 150 && q.st.extent), wide = near.length ? [Math.min(...near.map(q => q.st.extent[0])) - 0.8, Math.max(...near.map(q => q.st.extent[1])) + 0.8] : null, pts = [];
      { const [x0, x1] = wide || tunSpan(z), h = wide ? 8.0 : 6.6, r = wide ? 1.4 : 1.6; pts.push(P(x1, 0, z)); for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 * i / 6; pts.push(P(x1 - r + Math.cos(a) * r, h - r + Math.sin(a) * r, z)); } for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / 6; pts.push(P(x0 + r + Math.cos(a) * r, h - r + Math.sin(a) * r, z)); } pts.push(P(x0, 0, z)); }
      return pts; };
    const polyPath = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const outItems = [];
    if (zExit !== null) {
      const op = openingPoly();
      if (op) { ctx.save(); polyPath(op); ctx.clip(); backdrop(); zLim = ZF; drawTracks(zExit); outItems.length = 0; zLim = zExit; ctx.restore(); }
    }
    if (zExit !== null) {   // lòng hầm: tường tối có khoét lỗ ở cửa ra (nhìn thấy phong cảnh bên ngoài), đèn trần (chỉ ở hầm đô thị và quanh ga ngầm; hầm vùng đồi núi không có đèn)
      const tw = ctx.createLinearGradient(0, py, 0, py + ph); tw.addColorStop(0, '#2a3038'); tw.addColorStop(0.5, '#0c0f13'); tw.addColorStop(1, '#1a1f26'); ctx.fillStyle = tw;
      const op = openingPoly(); ctx.beginPath(); ctx.rect(px - 60, py - 60, pw + 120, ph + 120); if (op) op.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill('evenodd');
      // vỏ hầm: hai vách thẳng đứng, vát góc, trần; chia theo khoảng cách để xa thì tối dần
      { const zE = Math.min(zExit, 900), bands = [[ZN, 40, 1], [40, 120, 0.72], [120, 300, 0.5], [300, zE, 0.34]], xl = z => tunSpan(z)[0], xr = z => tunSpan(z)[1], lit = 0.5 + 0.5 * Math.max(night, 0.4), hasL = z => biomeAt(z) === 'urban' || sts.some(q => Math.abs(z - q.d) < 600);
        for (const [b0, b1, f] of bands) { if (b0 >= zE) break; const a = Math.max(b0, zMin), e = Math.min(b1, zE), g = Math.round(60 * f * lit);
          wall(xl, 0, 4.8, a, e, 'rgb(' + (g + 6) + ',' + (g + 9) + ',' + (g + 13) + ')'); wall(xr, 0, 4.8, a, e, 'rgb(' + (g + 6) + ',' + (g + 9) + ',' + (g + 13) + ')');
          strip(z => xl(z), z => xl(z) + 1.5, 6.3, a, e, 'rgb(' + (g + 2) + ',' + (g + 4) + ',' + (g + 7) + ')'); strip(z => xr(z) - 1.5, z => xr(z), 6.3, a, e, 'rgb(' + (g + 2) + ',' + (g + 4) + ',' + (g + 7) + ')');
          strip(z => xl(z) + 1.5, z => xr(z) - 1.5, 6.3, a, e, 'rgb(' + (g - 4) + ',' + (g - 2) + ',' + (g + 1) + ')'); }
        for (const side of [0, 1]) for (let k = Math.ceil((T.x + ZN) / 18), z = k * 18 - T.x; z < Math.min(420, zExit); k++, z = k * 18 - T.x) { if (!hasL(z)) continue; const X = side ? xr(z) - 0.15 : xl(z) + 0.15, a = P(X, 4.3, z), r = Math.max(1.2, 0.16 * c.f / z), gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 5); gl.addColorStop(0, 'rgba(255,236,170,.95)'); gl.addColorStop(0.35, 'rgba(255,230,160,.35)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 5, a[1] - r * 5, r * 10, r * 10); } }
    }
    drawTracks();
    // đèn pha: chỉ bật khi tối, trong hầm, hoặc mưa/tuyết lúc nhá nhem; ban ngày ngoài hầm thì tắt. Chùm sáng bám đường đang chạy (kể cả đường nhánh/đường cong)
    const lampOn = S.lampOn(W, T), lightLvl = lampOn ? Math.max(0.55, night * (1 - wx * 0.2), zExit !== null ? 0.9 : 0) : 0;
    if (lampOn && !W.rear) { const lg = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); lg.addColorStop(0, 'rgba(255,246,210,' + 0.75 * lightLvl + ')'); lg.addColorStop(0.45, 'rgba(255,246,210,' + 0.32 * lightLvl + ')'); lg.addColorStop(1, 'rgba(255,246,210,0)');
      const cx0 = c.lane; strip(z => cx0 - 3.4, z => cx0 + 3.4, 0, ZN, 900, lg);
      const lg2 = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); lg2.addColorStop(0, 'rgba(255,246,210,' + 0.2 * lightLvl + ')'); lg2.addColorStop(0.6, 'rgba(255,246,210,0)'); strip(z => cx0 - 9, z => cx0 + 9, 0.02, ZN, 260, lg2); }

    // camera sau: đèn đuôi đỏ của chính đoàn tàu ta (luôn có, rõ hơn ở vùng tối): hai đèn đỏ nhỏ và vệt đỏ mờ trên đường ngay sau đuôi
    if (W.rear) { const dk = clamp(night * 0.9 + (zExit !== null ? 0.9 : 0) + wx * 0.5, 0, 1), lvl = 0.5 + 0.5 * dk, cx0 = c.lane;
      const rg = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); rg.addColorStop(0, 'rgba(255,40,30,' + (0.10 + 0.34 * dk) + ')'); rg.addColorStop(0.35, 'rgba(255,40,30,' + (0.04 + 0.14 * dk) + ')'); rg.addColorStop(1, 'rgba(255,40,30,0)'); strip(z => cx0 - 2.2, z => cx0 + 2.2, 0.01, ZN, 70, rg);
}
    // ---- sân ga theo bố trí thật của từng ga (hàm: vẽ được cả bên ngoài lẫn nhìn qua cửa hầm vào ga ngầm)
    sink = items;
    // ---- tường bao quanh ga: hai bên phạm vi sân ga là tường bê tông + tấm chắn trong suốt cao (không còn hở ra ngoài), đoạn cổ ga (đường toả ra) là hàng rào thấp hơn;
    //      tường bám theo mép hành lang xr/xl (đã gồm các đường của ga đang toả ra), nên ga đỗ ở đường rìa nhánh cũng được bọc kín
    const enclose = (q, z0, z1) => {
      const concrete = mixc([22, 26, 30], [170, 174, 174], day * (1 - wx * 0.3)), concrete2 = mixc([18, 22, 26], [150, 154, 156], day * (1 - wx * 0.3)), cap = mixc([30, 34, 40], [206, 210, 210], day * (1 - wx * 0.3)), glass = day > 0.4 ? 'rgba(150,205,235,.16)' : 'rgba(60,90,120,.18)';
      const za = z0 - 25, zb = z1 + 25, ta = Math.max(q.d - FA, ZN), tb = Math.min(q.d + FB, ZF);
      for (const side of [1, -1]) {
        const ex = q.st.extent[side > 0 ? 1 : 0] + side * 1.4, zS = q.d - FA + 100, zE = q.d + FB - 150, wf = z => LAY.smooth(zS, zS + 150, z) * (1 - LAY.smooth(zE - 150, zE, z)),
          e = z => side > 0 ? Math.max(lerp(Math.max(0, oppAt(z)) + 2.9, ex, wf(z)), xr(z) + 1.2) : Math.min(lerp(Math.min(0, oppAt(z)) - 2.9, ex, wf(z)), xl(z) - 1.2), th = 0.3 * side;      // tường đứng yên theo toạ độ ga (không trượt theo đường toả ra), chỉ nhường chỗ cho đường thật
        for (let a = Math.max(ta, ZN); a < tb; a += 12) { const b = Math.min(tb, a + 12), inSt = b > za && a < zb, h = inSt ? 4.4 : 1.9, zm = (a + b) / 2, odd = Math.floor((T.x + a) / 12) % 2;
          sink.push({ z: zm, fn: () => { const ea = e(a), eb = e(b);
            quad(P(ea, 0, a), P(eb, 0, b), P(eb, h, b), P(ea, h, a), odd ? concrete : concrete2);
            quad(P(ea, h, a), P(eb, h, b), P(eb + th, h, b), P(ea + th, h, a), cap);
            if (inSt) { quad(P(ea, h, a), P(eb, h, b), P(eb, h + 2.2, b), P(ea, h + 2.2, a), glass); const pa = P(ea, 0, a), pb = P(ea, h + 2.2, a), w = Math.max(1, 0.18 * c.f / a); ctx.strokeStyle = 'rgba(70,80,92,.7)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
          } }); }
      }
    };
    // ---- cầu bộ hành trên cao bắc ngang qua mọi đường ray, nối các sân ga (chỉ ở khung buồng lái; vật cố định theo toạ độ ga, không kẹp theo camera)
    // số cầu theo cỡ ga: ≥ 3 sân ga: 3 lối (1/6, 1/2, 5/6 độ dài sân ga); 2 sân ga và ≥ 4 đường: 2 lối (1/4, 3/4); 2 sân ga ít đường: 1 lối giữa; ga 1 sân ga hoặc ga ngầm: không có
    const bridgeN = {}, bridgeCount = i => { const key = W.lineId + ':' + i; if (bridgeN[key] !== undefined) return bridgeN[key]; const stn = L.stations[i];
      let n = LAY.bridgeCountOf(stn.lay || '2-2-0'); if (n && S.inTunnel({ line: L, dir: 'down' }, S.sOfKm(stn.km, 'down', L.kmEnd))) n = 0; return (bridgeN[key] = n); };
    const BY = 9.4, BH = 2.4, BD = 3.2;       // mặt cầu cao hơn cổng đỡ dây (7,6 m); thân cầu cao 2,4 m; bề dày theo chiều tàu 3,2 m
    const drawBridge = (st, zc, xl, xr) => {
      const zn = zc - BD / 2, zf = zc + BD / 2, k = day * (1 - wx * 0.3), wallC = mixc([34, 38, 44], [178, 176, 160], k), under = mixc([14, 16, 20], [88, 90, 92], k), roofC = mixc([24, 30, 40], [78, 88, 106], k), glass = mixc([12, 20, 32], [92, 124, 156], k), pil = mixc([24, 28, 34], [148, 150, 146], k), dark = mixc([6, 8, 12], [40, 42, 46], k);
      if (zn < ZN + 0.6) return;
      const Ls = (BY - PH) / 0.55, zl = zf + Ls, lane = c.lane || 0;
      // thang bậc có mái xuống từng sân ga: dốc 0,55 theo chiều tàu chạy, từ mặt cầu xuống mặt sân ga; hai bên có tường và cửa sổ nhỏ
      for (const p of st.plats) { const xc = (p.xa + p.xb) / 2, hw = 1.15, a = P(xc - hw, BY, zf), b = P(xc + hw, BY, zf), d = P(xc + hw, PH, zl), e = P(xc - hw, PH, zl);
        quad(a, b, d, e, under);                                                       // mặt dưới thang (nhìn từ dưới lên)
        const sides = [xc - hw, xc + hw].sort((u, v) => Math.abs(v - (-lane)) - Math.abs(u - (-lane)));
        for (const xs of sides) { const a0 = P(xs, BY, zf), a1 = P(xs, BY + BH, zf), b0 = P(xs, PH, zl), b1 = P(xs, PH + BH, zl); quad(a0, a1, b1, b0, wallC);
          const w0 = P(xs, BY + 1.0, zf + 0.5), w1 = P(xs, BY + 1.9, zf + 0.5), v0 = P(xs, PH + 1.0 + (BY - PH) * 0.04, zl - 0.5), v1 = P(xs, PH + 1.9 + (BY - PH) * 0.04, zl - 0.5); quad(w0, w1, v1, v0, glass); }
        const r0 = P(xc - hw - 0.25, BY + BH + 0.5, zf), r1 = P(xc + hw + 0.25, BY + BH + 0.5, zf), r2 = P(xc + hw + 0.25, PH + BH + 0.5, zl), r3 = P(xc - hw - 0.25, PH + BH + 0.5, zl); quad(r0, r1, r2, r3, roofC);
        const o0 = P(xc - hw, PH, zl), o1 = P(xc + hw, PH, zl), o2 = P(xc + hw, PH + BH, zl), o3 = P(xc - hw, PH + BH, zl); quad(o0, o1, o2, o3, dark);       // cửa vào thang ở đầu dưới
      }
      // trụ đỡ mặt cầu: ở hai đầu và hai bên mỗi thang
      const cols = [xl, xr]; for (const p of st.plats) { const xc = (p.xa + p.xb) / 2; cols.push(xc - 1.9, xc + 1.9); }
      for (const xc of cols) { const y0 = st.plats.some(p => xc >= p.xa && xc <= p.xb) ? PH : -2, a = P(xc - 0.3, y0, zn + 0.5), b = P(xc + 0.3, y0, zn + 0.5), d = P(xc + 0.3, BY, zn + 0.5), e = P(xc - 0.3, BY, zn + 0.5); quad(a, b, d, e, pil); }
      // thân cầu: sàn bê tông, tường có dải cửa sổ, mái tôn nhô ra
      quad(P(xl, BY - 0.5, zn), P(xr, BY - 0.5, zn), P(xr, BY - 0.5, zf), P(xl, BY - 0.5, zf), under);
      quad(P(xl, BY - 0.5, zn), P(xr, BY - 0.5, zn), P(xr, BY, zn), P(xl, BY, zn), pil);
      quad(P(xl, BY, zn), P(xr, BY, zn), P(xr, BY + BH, zn), P(xl, BY + BH, zn), wallC);
      quad(P(xl, BY + 0.9, zn), P(xr, BY + 0.9, zn), P(xr, BY + 1.8, zn), P(xl, BY + 1.8, zn), glass);
      for (let x = xr; x < xl; x += 4.0) quad(P(x - 0.1, BY, zn), P(x + 0.1, BY, zn), P(x + 0.1, BY + BH, zn), P(x - 0.1, BY + BH, zn), pil);      // cột đứng giữa các ô cửa sổ
      quad(P(xl + 0.6, BY + BH, zn - 0.5), P(xr - 0.6, BY + BH, zn - 0.5), P(xr - 0.6, BY + BH + 0.7, zn - 0.5), P(xl + 0.6, BY + BH + 0.7, zn - 0.5), roofC);
    };
    const bridgesFor = q => {
      const n = zExit === null ? bridgeCount(q.m.i) : 0; if (!n) return; const fr = n === 3 ? [1 / 6, 1 / 2, 5 / 6] : n === 2 ? [0.25, 0.75] : [0.5], ext = q.st.extent, z0p = rr ? q.d - 20 : q.d - 420;
      for (const f of fr) { const zc = z0p + 440 * f; if (zc < ZN + 3 || zc > 1600 || zc < physLoZ || zc > physHiZ) continue; sink.push({ z: zc, fn: () => drawBridge(q.st, zc, ext[1] + 1.4, ext[0] - 1.4) }); }
    };
    const drawStations = () => {
    for (const q of sts) {
      const { m, i, d, st } = q;
      const sgR = rr ? -1 : 1;       // camera sau: sân ga nằm phía SAU vạch dừng của tàu ta nên khi nhìn lùi nó nằm xa hơn vạch (z lớn hơn), không phải gần hơn
      if (zExit === null) enclose(q, rr ? d - 20 : d - 420, rr ? d + 420 : d + 20);
      bridgesFor(q);
      if (zExit === null) for (const t of st.tracks) {        // ghi: thanh nối lưỡi ghi, hộp máy chuyển ghi và đèn báo ở chỗ đường ga rẽ khỏi đường chính
        if (t.main || t.in0 === undefined) continue; const zs = rr ? d + t.in0 : d - t.in0, sgn = t.x >= t.plain ? 1 : -1; if (zs < ZN + 1 || zs > 700) continue;
        sink.push({ z: zs, fn: () => { const xs = lerp(t.plain, t.x, 0.0), steel = mixc([40, 44, 50], [196, 202, 208], day * (1 - wx * 0.3)), box = mixc([20, 30, 24], [70, 98, 78], day * (1 - wx * 0.3));
          quad(P(xs - 1.05, 0.1, zs), P(xs + 1.05, 0.1, zs), P(xs + 1.05, 0.16, zs), P(xs - 1.05, 0.16, zs), steel);
          quad(P(xs + sgn * 1.7, 0, zs), P(xs + sgn * 2.4, 0, zs), P(xs + sgn * 2.4, 0.8, zs), P(xs + sgn * 1.7, 0.8, zs), box);
          const lp = P(xs + sgn * 2.05, 1.05, zs), s = c.f / zs; ctx.fillStyle = night > 0.3 ? '#9fe8a8' : '#58b86a'; ctx.beginPath(); ctx.arc(lp[0], lp[1], Math.max(1, 0.1 * s), 0, 7); ctx.fill(); } });
      }
      const z0 = Math.max(zMin, rr ? d - 20 : d - 420), z1 = rr ? d + 420 : d + 20; if (z1 <= zMin || z0 > ZF) continue;
      const dwellHere = T.phase === 'dwell' && T.k === i, openDoors = dwellHere && T.door === 'open';
      const topc = mixc([40, 52, 68], [120, 134, 150], day * (1 - wx * 0.3));
      for (const p of st.plats) {
        const isOurs = q.stopHere && st.plat === p;
        // mặt trên, mặt đứng hai mép, vạch vàng an toàn ở mép kề đường
        // mặt trên, mặt đứng và vạch vàng vẽ theo từng đoạn 30 m vào danh sách xa → gần (như mái ga), để vật ở phía sau/phía dưới (cảnh, cột cầu) bị mặt sân ga che đúng, không nhìn xuyên qua
        for (let za = z0; za < z1; za += 30) { const zb = Math.min(z1, za + 30); sink.push({ z: zb, fn: () => {
          strip(() => p.xa, () => p.xb, PH, za, zb + 0.4, topc);
          for (const e of [p.xa, p.xb]) { const adj = st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01); wall(() => e, 0, PH, za, zb + 0.4, '#3a4a5c'); if (adj) { const inward = e === p.xa ? 1 : -1; strip(() => e, () => e + inward * 0.55, PH, za, zb + 0.4, '#e8c93a'); strip(() => e + inward * 0.6, () => e + inward * 0.72, PH, za, zb + 0.4, '#d6b21e'); } } } }); }      // vạch trong liên tục (内方線) cạnh dải gạch cảnh báo
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
        const gone = dwellHere && isOurs ? clamp(T.dwellT / 22, 0, 1) : 0, count = Math.round((isOurs ? 30 : q.stopHere ? 14 : 5) * (p.xb - p.xa) / 9 * clamp(0.5 + st.tracks.length * 0.28, 0.6, 2.4)), sd = Math.round(p.xa);       // ga lớn (nhiều đường) đông người hơn ga nhỏ
        for (let k = 0; k < count; k++) { if (hash(i * 977 + k * 13 + 5 + sd) < gone) continue; const zz = (rr ? d - 10 : d - 400) + hash(i * 131 + k * 7 + 1 + sd) * 410, X = lerp(p.xa + 1.0, p.xb - 1.0, hash(i * 53 + k * 11 + 3 + sd)); if (zz < ZN || zz > 700) continue;
          sink.push({ z: zz, fn: () => { const s = c.f / zz, a = P(X, PH, zz); ctx.fillStyle = personColor(k + i); ctx.fillRect(a[0] - 0.22 * s, a[1] - 1.45 * s, 0.44 * s, 0.75 * s); ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, 0.1 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.1 * s, a[1]); ctx.moveTo(a[0] + 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.1 * s, a[1]); ctx.stroke(); ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.58 * s, 0.12 * s, 0, 7); ctx.fill(); } }); }
        // ---- chi tiết sân ga: gạch nổi ở mép, đèn cột, ghế, máy bán hàng, cầu thang, số toa trên nền, đồng hồ (chỉ vẽ khi ở gần để nhẹ)
        { const adjs = [p.xa, p.xb].filter(e => st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01)), xm = (p.xa + p.xb) / 2, wdt = p.xb - p.xa, zA = Math.max(z0, ZN), zB = Math.min(z1, 260), litA = night > 0.25 ? 1 : 0;
          const grey = mixc([40, 44, 50], [150, 152, 150], day * (1 - wx * 0.3)), dark = mixc([14, 16, 20], [60, 64, 70], day * (1 - wx * 0.3));
          for (const e of adjs) { const inward = e === p.xa ? 1 : -1;       // gạch cảnh báo nổi ở mép (hàng chấm) và số toa trên nền
            for (let zz = Math.ceil(zA / 0.9) * 0.9; zz < Math.min(zB, 70); zz += 0.9) { const zq = zz; sink.push({ z: zq, fn: () => { const a = P(e + inward * 0.12, PH, zq), b = P(e + inward * 0.5, PH, zq + 0.35); ctx.fillStyle = 'rgba(150,118,20,.75)'; ctx.fillRect(Math.min(a[0], b[0]), b[1], Math.max(1, Math.abs(b[0] - a[0])), Math.max(1, a[1] - b[1])); } }); }
            if (isOurs) for (let car = 1; car <= 16; car++) { const zz = q.dm - sgR * ((car - 0.5) * 25) + 0; if (zz < ZN || zz > 150) continue; sink.push({ z: zz, fn: () => { const a = P(e + inward * 1.4, PH, zz), s = c.f / zz; if (s < 1.2) return; ctx.fillStyle = 'rgba(240,240,240,.85)'; ctx.font = 'bold ' + Math.min(26, 0.7 * s) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(car), a[0], a[1]); } }); } }
          for (let zz = Math.ceil((zA - d) / 15) * 15 + d; zz < zB; zz += 15) { const zq = zz, lampX = xm; sink.push({ z: zq, fn: () => { const b = P(lampX, PH, zq), t = P(lampX, 5.0, zq), s = c.f / zq; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); if (litA) { const g = ctx.createRadialGradient(t[0], t[1], 0, t[0], t[1], 1.6 * s); g.addColorStop(0, 'rgba(255,236,170,.9)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(t[0] - 1.6 * s, t[1] - 1.6 * s, 3.2 * s, 3.2 * s); } else { ctx.fillStyle = '#f2f0e4'; ctx.fillRect(t[0] - 0.25 * s, t[1] - 0.1 * s, 0.5 * s, 0.2 * s); } } }); }
          for (let zz = Math.ceil((zA - d) / 38) * 38 + d + 9; zz < zB; zz += 38) { const zq = zz, bx = xm + (hash(Math.round(zq) + sd * 3) < 0.5 ? -1 : 1) * Math.min(wdt * 0.28, 1.9);       // ghế dài hoặc máy bán hàng
            const kind = hash(Math.round(zq / 38) + sd) < 0.55 ? 'bench' : 'vend', hue = hash(Math.round(zq / 38) * 7 + sd) < 0.5 ? [200, 50, 50] : [50, 100, 190];
            sink.push({ z: zq, fn: () => { if (kind === 'bench') { const a = P(bx - 0.35, PH + 0.45, zq), b = P(bx + 0.35, PH, zq + 2.2); ctx.fillStyle = grey; ctx.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), Math.max(1, b[1] - a[1])); } else { const a = P(bx - 0.4, PH + 1.9, zq), b = P(bx + 0.4, PH, zq); ctx.fillStyle = grey; ctx.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1]); ctx.fillStyle = mixc(hue.map(v => v * 0.25), hue, litA ? 1 : day); ctx.fillRect(Math.min(a[0], b[0]) + 1, a[1] + 1, Math.max(1, Math.abs(b[0] - a[0]) - 2), (b[1] - a[1]) * 0.6); } } }); }
          // ---- thiết bị an toàn và thông tin trên sân ga: VẬT CỐ ĐỊNH theo toạ độ ga, mọi vị trí tính bằng khoảng cách b (m) phía sau vạch dừng, camera tính z = dm − sgR·b (không kẹp theo camera nên không bị kéo lê)
          { const zAt = b => q.dm - sgR * b, midC = (x0, x1) => (x0 + x1) / 2, fogK = day * (1 - wx * 0.3);
            const redC = mixc([90, 20, 20], [212, 44, 40], fogK), whiteC = mixc([120, 124, 130], [240, 240, 236], fogK), blueC = mixc([14, 36, 70], [24, 80, 150], fogK), signBg = mixc([8, 10, 14], [20, 24, 30], fogK), yellowC = mixc([120, 100, 20], [240, 200, 40], fogK), binC = mixc([22, 40, 30], [60, 110, 80], fogK);
            const tag = (xa, xb, y0, y1, z, bg, fg, text, minPx) => { const a = P(xa, y1, z), b = P(xb, y0, z), w2 = Math.abs(b[0] - a[0]), hh = b[1] - a[1]; if (w2 < (minPx || 6) || hh < 4) return; ctx.fillStyle = bg; ctx.fillRect(Math.min(a[0], b[0]), a[1], w2, hh); if (!text) return; ctx.fillStyle = fg; ctx.textAlign = 'center'; let fs = hh * 0.62; ctx.font = 'bold ' + fs + 'px system-ui'; const tw = ctx.measureText(text).width; if (tw > w2 * 0.92) { fs *= w2 * 0.92 / tw; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(text, (a[0] + b[0]) / 2, a[1] + hh * 0.5 + fs * 0.34); };
            const box = (x, y0, y1, hw, z, col) => quad(P(x - hw, y0, z), P(x + hw, y0, z), P(x + hw, y1, z), P(x - hw, y1, z), col);
            const live = b => { const zz = zAt(b); return zz > ZN + 0.5 && zz < 330 ? zz : null; };
            for (const e of adjs) { const inward = e === p.xa ? 1 : -1, ex = e + inward * 0.7;
              // nút dừng khẩn (cột nhỏ, nút đỏ, nhãn trắng): mỗi 50 m dọc mép sân ga [N: khoảng 50 m một nút ở ga Shinkansen Kyushu]
              for (let k = 0; k < 9; k++) { const zz = live(15 + 50 * k); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(ex, PH, PH + 1.3, 0.04, zz, '#3c4650'); box(ex, PH + 0.9, PH + 1.28, 0.15, zz, redC); box(ex, PH + 1.0, PH + 1.18, 0.09, zz - 0.02, whiteC); } }); }
              // vạch xếp hàng lên tàu trên sàn (hai vạch dọc mỗi cửa toa) và gạch dẫn đường: vạch trong liên tục (内方線) ở mép phía trong dải gạch nổi
              if (e === (isOurs ? adjs[0] : e)) for (let car = 0; car < 16; car++) for (const off of [3.5, 21.5]) { const zz = live(car * 25 + (25 - off)); if (zz === null || zz > 160) continue; sink.push({ z: zz, fn: () => { for (const xo of [1.25, 2.05]) { const a0 = P(e + inward * xo, PH, zz - 1.4), a1 = P(e + inward * (xo + 0.1), PH, zz - 1.4), b0 = P(e + inward * xo, PH, zz + 1.4), b1 = P(e + inward * (xo + 0.1), PH, zz + 1.4); quad(a0, a1, b1, b0, whiteC); } } }); }
            }
            if (isOurs && adjs.length) { const e = adjs[0], inward = e === p.xa ? 1 : -1;
              // biển dừng của lái tàu (停止位置目標): treo dưới mái ở mép kề đường, ghi số toa của đoàn; một biển đúng vạch dừng
              { const zz = live(0); if (zz !== null) sink.push({ z: zz, fn: () => { box(e + inward * 0.5, 4.95, 5.2, 0.02, zz, '#2c3d52'); tag(e + inward * 0.5 - 0.7, e + inward * 0.5 + 0.7, 4.2, 4.95, zz, yellowC, '#10151c', String(T.veh.cars), 6); } }); }
              // biển số toa treo từ mái trước mỗi toa (1 → 16)
              for (let car = 1; car <= 16; car++) { const zz = live((car - 0.5) * 25); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(e + inward * 1.2, 4.9, 5.2, 0.02, zz, '#2c3d52'); tag(e + inward * 1.2 - 0.55, e + inward * 1.2 + 0.55, 4.25, 4.9, zz, blueC, '#fff', String(car), 5); } }); }
            }
            // bảng giờ tàu đi (発車標): treo giữa sân ga, hai bảng; sân ga của ta ghi chuyến và giờ khởi hành kế hoạch, sân ga khác ghi đồng hồ
            for (const b of [110, 300]) { const zz = live(b); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(xm - 1.4, 5.0, 5.3, 0.02, zz, '#2c3d52'); box(xm + 1.4, 5.0, 5.3, 0.02, zz, '#2c3d52');
              const a = P(xm - 1.7, 5.0, zz), bb = P(xm + 1.7, 4.0, zz), w2 = Math.abs(bb[0] - a[0]), hh = bb[1] - a[1]; if (w2 < 14 || hh < 8) return; ctx.fillStyle = signBg; ctx.fillRect(Math.min(a[0], bb[0]), a[1], w2, hh); ctx.fillStyle = '#ffb347'; ctx.textAlign = 'center';
              const mk2 = T.M[Math.min(T.k, T.M.length - 1)], dep = mk2 && mk2.dep != null ? mk2.dep : 0, tt = ((W.trip.t0 + dep) % 86400 + 86400) % 86400, hm = String(Math.floor(tt / 3600)).padStart(2, '0') + ':' + String(Math.floor(tt % 3600 / 60)).padStart(2, '0'), last = T.M[T.M.length - 1];
              const l1 = isOurs ? W.trip.label : hhmm((((W.trip.t0 + W.t) % 86400) + 86400) % 86400), l2 = isOurs ? (last.jp || last.name) + '  ' + hm : ''; let fs = hh * 0.36; ctx.font = 'bold ' + fs + 'px system-ui'; const t1 = ctx.measureText(l1).width; if (t1 > w2 * 0.92) { fs *= w2 * 0.92 / t1; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(l1, (a[0] + bb[0]) / 2, a[1] + hh * 0.42);
              if (l2) { ctx.fillStyle = '#9fe8a8'; let f2 = hh * 0.34; ctx.font = 'bold ' + f2 + 'px system-ui'; const t2 = ctx.measureText(l2).width; if (t2 > w2 * 0.92) { f2 *= w2 * 0.92 / t2; ctx.font = 'bold ' + f2 + 'px system-ui'; } ctx.fillText(l2, (a[0] + bb[0]) / 2, a[1] + hh * 0.84); } } }); }
            // thùng rác (ở mép giữa sân ga, so le với ghế), loa phát thanh và camera giám sát gắn trên cột mái
            for (let k = 0; k < 7; k++) { const zz = live(37 + 60 * k); if (zz === null || zz > 260) continue; const bx = xm + (hash(k * 7 + sd) < 0.5 ? -1 : 1) * Math.min(wdt * 0.2, 1.4); sink.push({ z: zz, fn: () => { box(bx, PH, PH + 0.85, 0.28, zz, binC); box(bx, PH + 0.85, PH + 0.95, 0.31, zz, '#2f3a34'); } }); }
            for (let k = 0; k < 14; k++) { const zz = live(15 + 30 * k); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(xm, 4.6, 5.1, 0.3, zz - 0.4, '#3b4655'); if (k % 3 === 0) { box(xm, 5.15, 5.45, 0.18, zz - 0.3, '#1a1f26'); const lp = P(xm, 5.3, zz - 0.32), s = c.f / zz; ctx.fillStyle = '#6fb0ff'; ctx.beginPath(); ctx.arc(lp[0], lp[1], Math.max(0.8, 0.05 * s), 0, 7); ctx.fill(); } } }); }
          }
            // ánh sáng đèn cột trên sàn ban đêm: vệt sáng ấm dưới mỗi đèn (cùng vị trí với đèn cột, cố định theo ga)
            if (night > 0.25) for (let zz = Math.ceil((zA - d) / 15) * 15 + d; zz < zB; zz += 15) { const zq = zz; if (zq < ZN + 0.5) continue; sink.push({ z: zq + 0.5, fn: () => { const lit = 0.14 * Math.min(1, (night - 0.25) * 2); quad(P(xm - wdt * 0.45, PH, zq - 4.2), P(xm + wdt * 0.45, PH, zq - 4.2), P(xm + wdt * 0.45, PH, zq + 4.2), P(xm - wdt * 0.45, PH, zq + 4.2), 'rgba(255,226,150,' + lit + ')'); } }); }
          if (isOurs) {                // biển số đường (番線) treo dưới mái và nhân viên sân ga (đồng phục xanh, găng trắng, giơ tay chỉ tay xác nhận khi tàu vào)
            const zb = q.dm - sgR * 140, nth = Math.max(1, st.stops.indexOf(st.ours) + 1) + (hash(i * 31) < 0.5 ? 0 : 1);
            if (zb > ZN + 2 && zb < 420) sink.push({ z: zb, fn: () => { const a = P(xm - 1.6, 4.9, zb), b = P(xm + 1.6, 4.0, zb), w2 = Math.abs(b[0] - a[0]); if (w2 < 6) return; const hh = b[1] - a[1]; ctx.fillStyle = '#103a6a'; ctx.fillRect(Math.min(a[0], b[0]), a[1], w2, hh); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold ' + hh * 0.6 + 'px system-ui'; ctx.fillText(nth + '番線', (a[0] + b[0]) / 2, a[1] + hh * 0.72); } });
            const zs = q.dm - sgR * 10, zs2 = q.dm - sgR * 180;
            for (const [zz, pt] of [[zs, 1], [zs2, 0]]) if (zz > ZN + 0.5 && zz < 320) { const ex = adjs[0] === undefined ? xm : adjs[0] + (adjs[0] === p.xa ? 1 : -1) * 1.1;
              sink.push({ z: zz, fn: () => { const s = c.f / zz, a = P(ex, PH, zz), arm = T.v > 0.5 || T.phase === 'run' ? 1 : 0; ctx.fillStyle = '#1b2f55'; ctx.fillRect(a[0] - 0.24 * s, a[1] - 1.45 * s, 0.48 * s, 0.78 * s); ctx.strokeStyle = '#141f38'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.1 * s, a[1]); ctx.moveTo(a[0] + 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.1 * s, a[1]); ctx.stroke(); ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.6 * s, 0.13 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(a[0] - 0.15 * s, a[1] - 1.78 * s, 0.3 * s, 0.1 * s);
                ctx.strokeStyle = '#1b2f55'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] + 0.22 * s, a[1] - 1.35 * s); const ang = arm && pt ? (-0.9 + 0.12 * Math.sin(now / 250)) : 0.5; ctx.lineTo(a[0] + 0.22 * s + Math.sin(ang) * 0.6 * s, a[1] - 1.35 * s - Math.cos(ang) * 0.6 * s * (arm && pt ? 1 : -1)); ctx.stroke(); ctx.fillStyle = '#fff'; const gx = a[0] + 0.22 * s + Math.sin(ang) * 0.6 * s, gy = a[1] - 1.35 * s - Math.cos(ang) * 0.6 * s * (arm && pt ? 1 : -1); ctx.fillRect(gx - 0.07 * s, gy - 0.07 * s, 0.14 * s, 0.14 * s); } }); }
          }
          if (isOurs) for (const zq of [q.dm - sgR * 60, q.dm - sgR * 180, q.dm - sgR * 300, q.dm + sgR * 60]) if (zq > ZN + 0.5) sink.push({ z: zq, fn: () => { const x0 = xm - 0.2, b = P(x0, PH, zq), t = P(x0, 3.1, zq), s = c.f / zq; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); const cx2 = t[0], cy2 = t[1] - 0.45 * s; ctx.fillStyle = '#f4f4ee'; ctx.beginPath(); ctx.arc(cx2, cy2, 0.42 * s, 0, 7); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, 0.05 * s); ctx.beginPath(); ctx.arc(cx2, cy2, 0.42 * s, 0, 7); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + 0.25 * s * Math.sin(now / 60000 * 6.283), cy2 - 0.25 * s * Math.cos(now / 60000 * 6.283)); ctx.stroke(); } });       // đồng hồ cột (cố định trên sân ga, không đi theo camera)
        }
      }
      // cửa chắn kính, cửa tàu, tên ga, vạch dừng và biển khoảng cách ở sân ga kề đường dừng của ta
      if (st.plat && !m.mainStop) {
        const sg = st.platSign, Xe = st.ours.x + sg * PEDGE;
        // cửa chắn sân ga nửa chiều cao (1,4 m) ở MỌI mép sân ga kề đường ray: đế, kính cố định, thanh ngang trên (vẽ theo đoạn 30 m cùng danh sách sắp theo độ xa) và cột đứng ở ranh giữa các cửa; cánh cửa (mở/đóng theo cửa tàu) chỉ ở mép kề đường dừng của ta
        const doorZ = []; for (let car = 0; car < 16; car++) for (const off of [3.5, 21.5]) doorZ.push(q.dm - sgR * (car * 25 + (25 - off)));
        const glassC = day > 0.4 ? 'rgba(160,210,235,.20)' : 'rgba(70,100,130,.22)', baseC = mixc([30, 34, 40], [112, 118, 124], day * (1 - wx * 0.3)), railC = mixc([40, 46, 54], [176, 184, 190], day * (1 - wx * 0.3)), postC = mixc([36, 42, 50], [138, 146, 152], day * (1 - wx * 0.3)), openC = 'rgba(8,12,18,.88)';
        for (const p of st.plats) for (const e of [p.xa, p.xb]) { if (!st.tracks.some(t => !t.thr && Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01)) continue;
          const inward = e === p.xa ? 1 : -1, xd = e + inward * 0.2, mine = Math.abs(e - Xe) < 0.01;
          for (let za = z0; za < z1; za += 30) { const zb = Math.min(z1, za + 30); sink.push({ z: zb, fn: () => { wall(() => xd, PH, PH + 0.3, za, zb + 0.4, baseC); wall(() => xd, PH + 0.3, PH + 1.35, za, zb + 0.4, glassC); wall(() => xd, PH + 1.35, PH + 1.45, za, zb + 0.4, railC); } }); }
          for (const zz of doorZ) { if (zz < ZN || zz > 700) continue;
            sink.push({ z: zz, fn: () => { const hw = 0.8;
              if (mine && openDoors) wall(() => xd, PH + 0.3, PH + 1.35, zz - hw, zz + hw, openC);                                                              // cửa chắn mở cùng cửa tàu
              for (const zp of [zz - hw, zz + hw]) quad(P(xd - 0.07, PH, zp - 0.06), P(xd + 0.07, PH, zp - 0.06), P(xd + 0.07, PH + 1.45, zp - 0.06), P(xd - 0.07, PH + 1.45, zp - 0.06), postC); } }); } }
        if (q.stopHere || q.isT) for (const zz of [q.dm - sgR * 70, q.dm - sgR * 170, q.dm - sgR * 270, q.dm + sgR * 30]) if (zz > ZN + 0.5) sink.push({ z: zz, fn: () => { const xc = (st.plat.xa + st.plat.xb) / 2, a = P(xc + 3.4, 4.6, zz), b = P(xc - 3.4, 3.7, zz), x0 = Math.min(a[0], b[0]), ww = Math.abs(b[0] - a[0]); if (ww < 8) return; ctx.fillStyle = '#1f6f4a'; ctx.fillRect(x0, a[1], ww, b[1] - a[1]); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; const label = (m.jp || '') + '  ' + m.name; let fs = Math.max(7, (b[1] - a[1]) * 0.42); ctx.font = 'bold ' + fs + 'px system-ui'; const tw = ctx.measureText(label).width; if (tw > ww * 0.92) { fs *= ww * 0.92 / tw; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(label, x0 + ww / 2, a[1] + (b[1] - a[1]) * 0.66); } });
        if (q.isT) { const d = q.dm;
          sink.push({ z: d, fn: () => { const x1 = Xe, x2 = Xe + sg * 7; quad(P(x1, PH, d), P(x2, PH, d), P(x2, PH, d + 0.4), P(x1, PH, d + 0.4), '#4cd68a'); const a = P(Xe + sg * 1.3, PH + 3.6, d), b = P(Xe + sg * 1.3, PH, d); ctx.strokeStyle = '#4cd68a'; ctx.lineWidth = Math.max(1, 0.12 * c.f / d); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const pl = P(Xe + sg * 0.4, PH + 3.8, d), pr = P(Xe + sg * 2.6, PH + 3.0, d); ctx.fillStyle = '#4cd68a'; ctx.fillRect(Math.min(pl[0], pr[0]), pl[1], Math.abs(pr[0] - pl[0]), pr[1] - pl[1]); const hh = pr[1] - pl[1]; if (hh > 5) { ctx.fillStyle = '#082016'; ctx.textAlign = 'center'; ctx.font = 'bold ' + hh * 0.62 + 'px system-ui'; ctx.fillText(_t('VẠCH'), (pl[0] + pr[0]) / 2, pl[1] + hh * 0.72); } } });
          for (const mm of [300, 200, 100, 50, 25, 10]) { const zz = d - sgR * mm; if (zz < ZN) continue; sink.push({ z: zz, fn: () => { const onP = rr ? zz < q.d + 420 : zz > q.d - 420, Yb = onP ? PH : 0, X = onP ? Xe + sg * 1.1 : st.ours.x + sg * 1.6, a = P(X, Yb + 2.3, zz), b = P(X, Yb + 1.3, zz), wpx = (b[1] - a[1]) * 1.2; ctx.strokeStyle = '#7a8ea5'; ctx.lineWidth = Math.max(1, 0.07 * c.f / zz); const bt = P(X, Yb, zz); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = '#ffc247'; ctx.fillRect(a[0] - wpx / 2, a[1], wpx, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.62 + 'px system-ui'; ctx.fillText(mm, a[0], b[1] - (b[1] - a[1]) * 0.25); } } }); }
        }
      }
    }
    };
    drawStations();

    // ---- dây điện trên cao (mỗi đường) và trụ điện giữa hai đường chính
    // cổng đỡ dây điện: hai cột thép ở hai mép (xa trái dương, xb phải âm), xà ngang kép và dây treo xuống từng dây tiếp điện (heads: các X của dây)
    const gantry = (zq, xa, xb, heads) => zq >= physLoZ && zq <= physHiZ && items.push({ z: zq, fn: () => { if (S.structAt(L, km(zq)) === 't') return; const s = c.f / zq, col = mixc([24, 30, 38], [96, 108, 122], day * (1 - wx * 0.3)), a0 = P(xa, 0, zq), a1 = P(xa, 7.6, zq), b0 = P(xb, 0, zq), b1 = P(xb, 7.6, zq), a2 = P(xa, 6.8, zq), b2 = P(xb, 6.8, zq);
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 0.3 * s); ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
      ctx.lineWidth = Math.max(1, 0.14 * s); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      if (s > 2.2) { ctx.lineWidth = Math.max(1, 0.07 * s); ctx.beginPath(); for (const hx of heads) { const h0 = P(hx, 6.8, zq), h1 = P(hx, 5.3, zq); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); } ctx.stroke(); }
      if (inSnow) { ctx.fillStyle = '#f2f6fb'; ctx.fillRect(Math.min(a1[0], b1[0]), a1[1] - 1, Math.abs(b1[0] - a1[0]), 2); } } });
    const wire = (xf, z0, z1) => { const zs = zsteps(Math.max(z0, zMin, physLoZ), Math.min(z1, zLim, physHiZ)); if (zs.length < 2) return; ctx.beginPath(); zs.forEach((z, k) => { const p = P(xf(z), 5.2, z); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); };
    ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; wire(() => 0, ZN, ZF); wire(oppAt, ZN, ZF);
    for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x, tx = z => S.trunkOff(W, T.x + z); let a = Math.max(ZN, W.dir === 'down' ? sj : sj - 3200), b = Math.min(ZF, W.dir === 'down' ? sj + 3200 : sj);
      if (b > a) { const cl = trunkClip(sj, a, b, ZN); if (!cl) continue; [a, b] = [Math.max(a, cl[0]), Math.min(b, cl[1])]; }
      if (b > a) { wire(tx, a, b); wire(z => tx(z) + ADJ, a, b); ctx.strokeStyle = 'rgba(214,222,232,.9)'; ctx.lineWidth = 1.5; for (const sx of [-0.72, 0.72, ADJ - 0.72, ADJ + 0.72]) { ctx.beginPath(); for (let z = a, f = true; z <= b; z += z < 400 ? 10 : 40, f = false) { const p = P(tx(z) + sx, 0.15, z); f ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); } ctx.stroke(); }       // ray đường Tohoku luôn thấy được dù ở xa
        for (let k = Math.ceil((T.x + a) / 50), z = k * 50 - T.x; z < b; k++, z = k * 50 - T.x) if (Math.abs(tx(z)) >= 20) gantry(z, tx(z) + 3.9, tx(z) + ADJ - 3.9, [tx(z), tx(z) + ADJ]); }       // cặp đường nhánh / đường chính đã tách xa: cổng riêng; còn sát nhau thì dùng chung cổng của hành lang
      ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; }
    for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; wire(z => lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)), q.d - FA, q.d + FB); }
    for (let k = Math.ceil((T.x + ZN) / 50), z = k * 50 - T.x; z < Math.min(1600, zLim); k++, z = k * 50 - T.x) gantry(z, xr(z) + 1.0, xl(z) - 1.0, [0, oppAt(z)]);       // cổng đỡ dây điện dùng chung cho mọi tuyến: hai cột ở hai mép hành lang (đã gồm đường ga và nhánh còn sát) + xà ngang

    // ---- phong cảnh hai bên (không vẽ trong hầm); giữ hành lang đường sắt và sân ga
    {
      const zMin = zExit === null ? 6 : zExit + 2, tgt = zExit === null ? items : outItems;
      const bands = [[10, 160, 16, 0], [160, 760, 38, 1], [760, 2400, 120, 2]];
      if (wdOn && !useStrips) {                // toà nhà thật 3D (chỉ khi không có dải tranh)
        let cnt = 0;                           // duyệt trực tiếp dữ liệu (không cấp phát, thứ tự cố định theo vị trí => không nhấp nháy)
        WD.forBuildings(W.lineId, W.dir, L.kmEnd, T.x, zMin, 2400, 420, wdOurs, (bz, be, bw, bdz, bh, bt, blev, btone) => {
          if (bz < zMin) return; if (bz > 2400 || cnt >= 420) return false;
          if (!(bz < 150 || (bz < 500 && bw * bdz > 80) || (bz < 1000 && (bh > 14 || bw * bdz > 500)) || bh > 28)) return; cnt++;
          const b = { z: bz, e: be, w: bw, dz: bdz, h: bh, t: bt, lev: blev, tone: btone };
          const qz = inStationZone(b.z, b.z + b.dz), ext = qz ? qz.st.extent : [Math.min(0, oppAt(b.z)), Math.max(0, oppAt(b.z))];
          if (b.e > 0 ? b.e - b.w / 2 < ext[1] + 8 : b.e + b.w / 2 > ext[0] - 8) return;
          const o = { kind: 'jp', t: b.t, lev: b.lev, w: Math.max(4, b.w), d: Math.max(4, b.dz), h: b.h, tone: b.tone, lat: 0 }, X = b.e, zz = b.z;
          tgt.push({ z: zz, fn: () => drawCell(ctx, c, o, X, zz, day, wx, night, inSnow, windy, now, fadeA, quad, PG) });
        });
      }
      if (wdOn && !useStrips) {                // cột điện và dây điện dọc phố 3D (chỉ khi không có dải tranh)
        const seen = new Set();
        for (const g of WD.poles(W.lineId, W.dir, L.kmEnd, T.x, Math.max(zMin, 4), 420, 150, wdOurs)) {
          if (g.z0 < zMin || g.z1 < zMin) continue; const qz = inStationZone(g.z0, g.z1), ext = qz ? qz.st.extent : [Math.min(0, oppAt(g.z0)), Math.max(0, oppAt(g.z0))];
          if (g.e0 > ext[0] - 6 && g.e0 < ext[1] + 6) continue;
          if (seen.has(g.id)) continue; seen.add(g.id);
          tgt.push({ z: Math.min(g.z0, g.z1), fn: () => { const A = fadeA(g.z0); ctx.globalAlpha = A; const b0 = P(g.e0, 0, g.z0), t0 = P(g.e0, 9, g.z0), t1 = P(g.e1, 9, g.z1); ctx.strokeStyle = night > 0.35 ? '#1c1c20' : '#5d5a55'; ctx.lineWidth = Math.max(1, 0.28 * c.f / g.z0); ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(t0[0], t0[1]); ctx.stroke();
            ctx.lineWidth = Math.max(0.6, 0.07 * c.f / g.z0); ctx.strokeStyle = night > 0.35 ? '#26262a' : '#4a4743'; for (const dy of [0, -0.7, -1.4]) { const q0 = P(g.e0, 9 + dy, g.z0), q1 = P(g.e1, 9 + dy, g.z1); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.quadraticCurveTo((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2 + 3 * c.f / g.z0, q1[0], q1[1]); ctx.stroke(); } ctx.globalAlpha = 1; } });
        }
      }
      if (!useStrips) for (const [za, zb, step, bi] of bands) for (let ci = Math.floor((T.x + za) / step); ci * step - T.x < zb; ci++) {
        const z = ci * step - T.x; if (z < za * 0.9) continue; const bio = biomeAt(z);
        for (const side of [-1, 1]) { let o = cellObject(ci + bi * 100000, bio, side); if (wdOn) o = null; for (const bw of wdOn ? ['mountain', 'field'] : []) { const o2 = cellObject(ci + bi * 100000, bw, side); if (!o2 || o2.kind === 'building' || o2.kind === 'house') continue;      // có dữ liệu thật: cây ở rừng/công viên, ruộng và cây thưa ở đất nông nghiệp; nhà đã lấy từ toà nhà thật
            const zq = z + (hash(ci * 3 + side) - 0.5) * step * 0.6, ofs = o2.w / 2 + o2.lat * 0.5 + 8, Xq = (side > 0 ? 1 : -1) * (Math.abs(side > 0 ? Math.max(0, oppAt(zq)) : Math.min(0, oppAt(zq), ADJ)) + ofs + 12), cls = String.fromCharCode(landCls(zq, Xq) || 0);
            if (bw === 'mountain' ? CLS_TREE.includes(cls) : (o2.kind === 'field' ? cls === CLS_FIELD : (cls === CLS_FIELD || cls === 'g' || cls === 'o' || cls === ' '))) { o = o2; break; } }
          if (!o) continue; const zz = z + (hash(ci * 3 + side) - 0.5) * step * 0.6; if (zz < zMin) continue; if (S.structAt(L, km(zz)) === 'b' || S.structAt(L, km(zz + (o.d || 0))) === 'b') continue;      // trên sông không có nhà, ruộng, cây
          const half = o.w / 2, qz = inStationZone(zz, zz + (o.d || 0)), ext = qz ? qz.st.extent : [Math.min(0, oppAt(zz)), Math.max(0, oppAt(zz))];
          const margin = qz ? (o.kind === 'building' ? 14 : 12) : (o.kind === 'building' ? 12 : o.kind === 'field' ? 14 : 8), off = half + o.lat * 0.5, X = side > 0 ? Math.max(ext[1], 0) + margin + off : Math.min(ext[0], ADJ) - margin - off;
          tgt.push({ z: zz, fn: () => drawCell(ctx, c, o, X, zz, day, wx, night, inSnow, windy, now, fadeA, quad, PG) }); } }
    }
    // ---- mốc km mỗi 1 km (cổng đỡ dây điện dùng chung cho cả tuyến nằm ở phần dây điện bên dưới)
    if (zExit === null) {
      const k0 = Math.ceil(Math.min(km(0), km(1500))), k1 = Math.floor(Math.max(km(0), km(1500)));
      for (let kk = k0; kk <= k1; kk++) { const zq = (S.sOfKm(kk, W.dir, L.kmEnd)) - T.x; if (zq < ZN + 5 || zq > 1500 || S.structAt(L, kk) === 't') continue;
        items.push({ z: zq, fn: () => { const X = xl(zq) - 0.9, b = P(X, 0, zq), t = P(X, 1.5, zq), s = c.f / zq; ctx.strokeStyle = '#6a7684'; ctx.lineWidth = Math.max(1, 0.1 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); ctx.fillStyle = '#f4f4ee'; ctx.fillRect(t[0] - 0.4 * s, t[1] - 0.55 * s, 0.8 * s, 0.6 * s); if (s > 3) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.min(30, 0.36 * s) + 'px system-ui'; ctx.fillText(String(kk), t[0], t[1] - 0.15 * s); } } }); }
    }
    // ---- biển chạy chậm, công nhân, hươu, dây điện hỏng
    for (const zn of W.zones.concat(S.turnoutZones(T).map(z => ({ s0: z.s0, s1: z.s1, v: z.v, tA: -1e9, tB: 1e9 })))) {   // gồm biển tốc độ qua ghi vào/ra đường sân ga
      if (zn.hold || W.t > zn.tB || W.t < zn.tA - 1 || zn.v * 3.6 >= 284 || zn.s1 - zn.s0 > 5e8) continue;
      const num = Math.round(zn.v * 3.6 / 10) * 10;
      for (const [s, txt, col] of [[zn.s0, String(num), '#ffd23a'], [zn.s1, '解除', '#e8eef5']]) { const z = s - T.x; if (z < ZN || z > 1800) continue;
        items.push({ z, fn: () => { const X = 3.4, a = P(X, 3.3, z), b = P(X, 2.3, z), w = (b[1] - a[1]) * 1.25, bt = P(X, 0, z); ctx.strokeStyle = '#6b7f95'; ctx.lineWidth = Math.max(1, 0.1 * c.f / z); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(a[0] - w / 2, a[1], w, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.62 + 'px system-ui'; ctx.fillText(txt, a[0], b[1] - (b[1] - a[1]) * 0.22); } } }); }
    }
    for (const d of W.dead || []) {       // biển báo đoạn cách điện: dự báo (vàng) trước 500 m, 惰行 (xanh) ở đầu đoạn, 力行 (trắng) sau đoạn
      for (const [s, txt, col] of [[d.s0 - 500, '予告', '#ffd23a'], [d.s0, '惰行', '#2fbf71'], [d.s1 + 30, '力行', '#e8eef5']]) { const z = s - T.x; if (z < ZN || z > 2200) continue;
        items.push({ z, fn: () => { const X = 3.4, a = P(X, 3.3, z), b = P(X, 2.3, z), w = (b[1] - a[1]) * 1.25, bt = P(X, 0, z); ctx.strokeStyle = '#6b7f95'; ctx.lineWidth = Math.max(1, 0.1 * c.f / z); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(a[0] - w / 2, a[1], w, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.5 + 'px system-ui'; ctx.fillText(txt, a[0], b[1] - (b[1] - a[1]) * 0.27); } } }); }
    }
    for (const g of W.xings || []) {       // đường ngang: mặt đường nhựa cắt qua ray, rào chắn hạ khi tàu tới gần, đèn đỏ nhấp nháy, xe kẹt và đèn tín hiệu đặc biệt (特殊信号発光機)
      const zc = g.s - T.x; if (zc < ZN - 6 || zc > 1800) continue; const closing = zc < 750 || g.blocked, flash = Math.floor(now / 450) % 2;
      items.push({ z: Math.max(zc, ZN + 0.5), fn: () => {
        strip(z => Math.min(oppAt(z), 0) - 3.6, z => Math.max(oppAt(z), 0) + 3.6, 0.03, zc - 3.2, zc + 3.2, mixc([22, 24, 28], [74, 76, 80], day * (1 - wx * 0.3)));
        railStrip(() => 0, zc - 3.2, zc + 3.2, false); if (Math.abs(oppAt(zc)) > 1) railStrip(oppAt, zc - 3.2, zc + 3.2, false);
        const xo = Math.min(oppAt(zc), 0) - 3.4, zz = Math.max(zc - 3.8, ZN + 0.2), sc = Math.max(1, c.f / Math.max(zz, 2));
        for (const [Xp, side] of [[3.5, 1], [xo, -1]]) { const a = P(Xp, 0, zz), b = P(Xp, 2.0, zz); ctx.strokeStyle = '#d8dde3'; ctx.lineWidth = Math.max(1, 0.12 * sc); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          if (closing) { for (const lk of [0, 1]) { const q = P(Xp + side * (lk ? -0.5 : 0.5) * 0.0, 1.7 - lk * 0.45, zz); ctx.fillStyle = (flash ^ lk) ? 'rgba(255,50,40,1)' : 'rgba(110,20,20,1)'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.2, 0.2 * sc), 0, 7); ctx.fill(); } } }
        // thanh chắn: nằm trên ĐƯỜNG BỘ (vuông góc với ray), mỗi bên một thanh đưa từ trụ ra phía ngoài; hạ ngang khi tàu tới, dựng đứng khi chưa
        for (const zz2 of [Math.max(zc - 3.8, ZN + 0.2), zc + 3.8]) for (const [Xp, dirx] of [[3.5, 1], [xo, -1]]) { const A = closing ? P(Xp, 1.1, zz2) : P(Xp, 1.9, zz2), B = closing ? P(Xp + dirx * 6.0, 1.1, zz2) : P(Xp, 3.6, zz2), n = closing ? 8 : 1; ctx.lineWidth = Math.max(1.4, 0.16 * Math.max(1, c.f / Math.max(zz2, 2)));
          for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; ctx.strokeStyle = i % 2 ? '#f2f2f2' : '#d63a2f'; ctx.beginPath(); ctx.moveTo(A[0] + (B[0] - A[0]) * t0, A[1] + (B[1] - A[1]) * t0); ctx.lineTo(A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1); ctx.stroke(); } }
        if (g.blocked) { const zq = Math.max(zc - 0.9, ZN + 0.3), a = P(-2.2, 0.25, zq), b = P(2.2, 0.25, zq), d = P(2.2, 1.5, zq), e = P(-2.2, 1.5, zq); quad(a, b, d, e, '#b3322d'); const w1 = P(-1.7, 0.95, zq), w2 = P(1.7, 0.95, zq), w3 = P(1.7, 1.4, zq), w4 = P(-1.7, 1.4, zq); quad(w1, w2, w3, w4, 'rgba(20,28,38,.85)'); }
      } });
      if (g.blocked && !g.hit) { const zl = g.s - 600 - T.x; if (zl > ZN && zl < 1800) items.push({ z: zl, fn: () => { const a = P(3.6, 0, zl), b = P(3.6, 4.2, zl), sc = Math.max(1, c.f / zl); ctx.strokeStyle = '#8c98a6'; ctx.lineWidth = Math.max(1, 0.15 * sc); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.fillStyle = flash ? 'rgba(255,40,30,1)' : 'rgba(120,20,20,1)'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(2, 0.5 * sc), 0, 7); ctx.fill(); if (flash) { ctx.fillStyle = 'rgba(255,60,40,.25)'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(6, 2.4 * sc), 0, 7); ctx.fill(); } } }); }
    }
    for (const wk of W.workers) { if (T.x > wk.s1 + 40) continue; for (let q = 0; q < 6; q++) { const z = wk.s0 + (wk.s1 - wk.s0) * (q / 5) - T.x; if (z < ZN || z > 1600) continue;
      items.push({ z, fn: () => { const X = 3.0 + (q % 2) * 0.9, s = Math.max(c.f / z, 5.5), a = P(X, 0, z); ctx.fillStyle = '#ff8c1a'; ctx.fillRect(a[0] - 0.24 * s, a[1] - 1.5 * s, 0.48 * s, 0.8 * s); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.68 * s, 0.17 * s, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#d9b99b'; ctx.fillRect(a[0] - 0.1 * s, a[1] - 1.7 * s, 0.2 * s, 0.1 * s); ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.12 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.12 * s, a[1]); ctx.moveTo(a[0] + 0.12 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.12 * s, a[1]); ctx.stroke(); if (q === 0 && Math.floor(now / 350) % 2) { ctx.fillStyle = 'rgba(255,60,30,.9)'; ctx.beginPath(); ctx.arc(a[0] + 0.6 * s, a[1] - 1.2 * s, 0.16 * s, 0, 7); ctx.fill(); } } }); } }
    for (const an of W.animals) { if (!an.active) continue; const z = an.s - T.x; if (z < ZN - 30 || z > 1800) continue; const fl = an.fleeT0 !== undefined ? W.t - an.fleeT0 : -1; if (fl > 2.4) continue;
      items.push({ z: Math.max(z, ZN), fn: () => { const X = 3.8 + (fl > 0 ? fl * 9 : 0), zz = Math.max(z + (fl > 0 ? fl * 6 : 0), ZN), s = Math.max(c.f / zz, 6), a = P(X, fl > 0 ? Math.min(1.2, fl * 1.2) : 0, zz), h = 1.5 * s; ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.ellipse(a[0], a[1] - h * 0.55, h * 0.5, h * 0.22, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#4a321c'; ctx.lineWidth = Math.max(1, h * 0.07); ctx.beginPath(); for (const dx of [-0.32, -0.12, 0.18, 0.34]) { ctx.moveTo(a[0] + h * dx, a[1] - h * 0.4); ctx.lineTo(a[0] + h * dx, a[1]); } ctx.moveTo(a[0] + h * 0.38, a[1] - h * 0.7); ctx.lineTo(a[0] + h * 0.55, a[1] - h * 1.0); ctx.moveTo(a[0] + h * 0.55, a[1] - h * 1.0); ctx.lineTo(a[0] + h * 0.46, a[1] - h * 1.22); ctx.moveTo(a[0] + h * 0.55, a[1] - h * 1.0); ctx.lineTo(a[0] + h * 0.66, a[1] - h * 1.2); ctx.stroke(); } }); }
    for (const wr of W.wires || []) { const z = wr.s - T.x; if (W.t > wr.tB || z < ZN || z > 2000) continue; items.push({ z, fn: () => { const a = P(0, 5.2, z - 40), b = P(0, 5.2, z + 40), m = P(0, 1.4, z); ctx.strokeStyle = '#8a98a8'; ctx.lineWidth = Math.max(1, 1.6 * c.f / z * 0.3); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1] + 0.8 * c.f / z, b[0], b[1]); ctx.stroke(); if (Math.floor(now / 120) % 3) { ctx.fillStyle = '#ffd24a'; for (let i = 0; i < 7; i++) ctx.fillRect(m[0] + (Math.random() - 0.5) * 4 * c.f / z, m[1] + (Math.random() - 0.5) * 3 * c.f / z, 2, 2); } } }); }
    // ---- tàu: phía trước (mặt tàu), ngược chiều, và tàu vượt (dải nhìn ngang chiếu phối cảnh)
    const iconFor = key => { const k = SMAP[key] || 'n700'; const f = R.fronts && (R.fronts[k] || R.fronts[k === 'kamome' ? 'n700s' : 'e5']); return f && f.ready ? { img: f.img, k } : null; };
    const drawFront = (ic, X, z, alpha, mode) => { const w = Math.max(3.4 * c.f / z, 9), h = w * ic.img.height / ic.img.width, a = P(X, 0.1, z); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(ic.img, a[0] - w / 2, a[1] - h, w, h); ctx.globalAlpha = 1; if (mode && LAMPS[ic.k]) { const Lp = LAMPS[ic.k], dk = clamp(night * 0.9 + (zExit !== null ? 0.9 : 0) + wx * 0.5, 0, 1), r = Math.max(1.1, w * 0.032), lvl = mode === 'tail' ? 0.55 + 0.45 * dk : dk; if (lvl > 0.05) for (const fx of [Lp[0], Lp[1]]) { const lx = a[0] - w / 2 + fx * w, ly = a[1] - h + Lp[2] * h, gr = r * (mode === 'tail' ? 1.6 + 3.2 * dk : 3 + 4 * dk), g = ctx.createRadialGradient(lx, ly, 0, lx, ly, gr); const col = mode === 'tail' ? '255,40,30' : '255,244,200'; g.addColorStop(0, 'rgba(' + col + ',' + Math.min(1, 0.95 * lvl) + ')'); g.addColorStop(0.35, 'rgba(' + col + ',' + 0.45 * lvl + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(lx - gr, ly - gr, gr * 2, gr * 2); } } };
    const Ld = W.lead;
    if (Ld && Ld.phase !== 'end') { const tail = Ld.x - Ld.veh.len - T.x, ic = iconFor(Ld.veh.key); if (tail > ZN && tail < 6000) { /* tàu phía trước đỗ ở đường dừng KHÁC của ta nếu ga có từ 2 đường dừng */ const qL = Ld.phase === 'dwell' ? sts.find(q => Math.abs(q.m.s - Ld.x) < 60) : null, other = qL && qL.st.tracks.find(t => t.own && !t.thr && t !== qL.st.ours && qL.st.stops.includes(t)), X = qL ? (other ? other : qL.st.ours).x : (Ld.fj !== undefined ? S.trunkOff(W, Ld.x - Ld.veh.len / 2, Ld.fj) : 0);      items.push({ z: tail, fn: () => { if (ic) drawFront(ic, X, tail, fadeA(tail), 'tail'); else { const w = 3.4 * c.f / tail, a = P(X, 0.1, tail); ctx.fillStyle = '#d8dee6'; ctx.fillRect(a[0] - w / 2, a[1] - w * 1.1, w, w * 1.1); } if (Ld.phase === 'run') { const a = P(X, 1.1, tail), w = 3.4 * c.f / tail; ctx.fillStyle = 'rgba(255,40,30,.95)'; ctx.beginPath(); ctx.arc(a[0] - w * 0.3, a[1], Math.max(1, w * 0.04), 0, 7); ctx.arc(a[0] + w * 0.3, a[1], Math.max(1, w * 0.04), 0, 7); ctx.fill(); } } }); } }
    const ricon = iconFor(W.line.meta.defVeh);
    // vẽ thân tàu bằng các lát ảnh nhìn ngang chiếu phối cảnh. sign=-1: thân kéo về phía sau mũi (tàu vượt); sign=+1: thân kéo ra xa mũi (tàu ngược chiều)
    const WL = root.WinLit, winLv = WL ? WL.level(night, zExit !== null, wx) : 0;      // ô cửa sổ tàu sáng đèn khi tối / trong hầm / mưa tuyết dày
    const glowAt = (X, Y, Z, rgb, r, al) => { if (Z < ZN || Z > 1500 || al < 0.03) return; const a = P(X, Y, Z), gr = Math.max(2.5, r * c.f / Z), g = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], gr); g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, al) + ')'); g.addColorStop(0.4, 'rgba(' + rgb + ',' + 0.4 * al + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(a[0] - gr, a[1] - gr, gr * 2, gr * 2); };
    const slices = (sp, lenM, zRef, fxp, sign) => {
      if (!sp || !sp.ready) return; const m = sp.meta, xrel = Math.max(0.5, Math.abs(fxp - c.lane)), lo = sign < 0 ? Math.max(zRef - lenM, ZN) : Math.max(zRef, ZN), hi = sign < 0 ? zRef : zRef + lenM; if (hi <= lo) return;
      const tOf = z => sign < 0 ? (zRef - z) / lenM : (z - zRef) / lenM;           // 0 ở mũi tàu, 1 ở đuôi
      let z = lo, n = 0;
      while (z < hi && n++ < 700) {
        const dz = clamp(z * z * 3 / (c.f * xrel), 0.04, 8), z2 = Math.min(hi, z + dz), zm = (z + z2) / 2, xa = P(fxp, 0, z)[0], xb = P(fxp, 0, z2)[0];   // lát mảnh ≤ ~3 px nên thân tàu liền một khối, không bậc thang
        const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
        if (x1 > px - 40 && x0 < px + pw + 40) { const s0 = (1 - tOf(z)) * m.width, s1 = (1 - tOf(z2)) * m.width, sx = Math.min(s0, s1), sw = Math.max(0.5, Math.abs(s1 - s0)), hgt = c.f * 3.7 / zm, a0 = P(fxp, 0.1, zm); ctx.fillStyle = 'rgba(30,35,42,.96)'; ctx.fillRect(x0, a0[1] - hgt * 0.27, x1 - x0 + 0.8, hgt * 0.25); ctx.drawImage(sp.img, sx, 0, Math.min(sw, m.width - sx), m.height, x0, a0[1] - hgt, x1 - x0 + 0.8, hgt);
          if (winLv > 0.06 && WL) { const ex = Math.min(sx + sw, m.width), ddx = (x1 - x0 + 0.8) / Math.max(0.5, Math.min(sw, m.width - sx)), top0 = a0[1] - hgt; WL.overlap(WL.get(sp), sx, ex, (wa, wb, ya, yb, id) => { const ax = Math.max(wa, sx), bx = Math.min(wb, ex); ctx.fillStyle = WL.fill(id, winLv); ctx.fillRect(x0 + (ax - sx) * ddx, top0 + ya / m.height * hgt, (bx - ax) * ddx + 0.5, (yb - ya) / m.height * hgt); }); } }      // gầm tàu đặc (tối): ảnh có khe hở giữa các bánh nên nếu không chèn thì thấy tà vẹt/ray của đường đó xuyen qua thân
        z = z2;
      }
    };
    if ((T.v > 20 || W.oppCat) && !S.oppHidden(W, T)) for (const t0 of W.opposing || []) { const VR = 200, zN = (t0 - W.t) * VR, key = S.oppKey(W, T, t0), veh = S.VEH[key] || S.VEH.N700; if (zN > 900 || zN < -veh.len - 20) continue;
      const fxp = ADJ + (c.lane > ADJ ? 1.85 : -1.85), oic = iconFor(veh.parts ? veh.parts[0] : key);
      items.push({ z: Math.max(zN, ZN + 1), fn: () => { if (zN > ZN && oic) drawFront(oic, oppAt(zN), zN, 1, 'head'); if (zN < 60) slicesVeh(veh, zN, fxp, 1); const u = 1 - Math.abs(zN) / 400; if (u > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.1 * u + ')'; ctx.fillRect(px, py, pw, ph); } } }); }
    // camera sau: tàu ngược chiều đã lướt qua đầu tàu ta, chạy dọc thân rồi xa dần ra phía sau (mũi tàu ở xa, thân kéo về phía camera)
    if (W.rear && (T.v > 20 || W.oppCat) && !S.oppHidden(W, T)) for (const o of W.oppRear || []) { const VR = 200, veh = S.VEH[o.key] || S.VEH.N700, zN = (W.t - o.t0) * VR - W.rearLen; if (zN < -veh.len - 20 || zN > 900) continue;
      const fxp = ADJ + (c.lane > ADJ ? 1.85 : -1.85), ric = iconFor(veh.parts ? veh.parts[veh.parts.length - 1] : o.key), zTail = zN - veh.len;
      items.push({ z: Math.max(zN, ZN + 1), fn: () => { slicesVeh(veh, zN, fxp, -1); if (zTail > ZN && ric) drawFront(ric, oppAt(zTail), zTail, 1, 'tail'); const u = 1 - Math.abs(zN) / 400; if (u > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.1 * u + ')'; ctx.fillRect(px, py, pw, ph); } } }); }
    function slicesVeh(veh, zRef, fxp, sign, mv) {      // đoàn ghép: vẽ lần lượt từng đoàn, đoàn sau cách đoàn trước một khe nối
      if (!veh.parts) { slices(R.sprites && R.sprites[SMAP[veh.key] || 'n700'], veh.len, zRef, fxp, sign); return; }
      let off = 0; for (const pk of veh.parts) { const pv = S.VEH[pk]; slices(R.sprites && R.sprites[SMAP[pk] || 'n700'], pv.len, zRef + sign * -1 * 0 + (sign < 0 ? -off : off), fxp, sign); off += pv.len + veh.gap; }
      if (winLv > 0.08) { const zT = zRef + sign * veh.len, mvF = mv === false ? 0.45 : 1; glowAt(fxp, 1.1, zRef, '255,246,215', 1.3 + 1.2 * winLv, 0.9 * winLv * mvF); glowAt(fxp - 0.4, 1.1, zT, '255,40,30', 0.6, 0.55 + 0.45 * winLv); glowAt(fxp + 0.4, 1.1, zT, '255,40,30', 0.6, 0.55 + 0.45 * winLv); }      // đèn pha dịu ở đầu (tàu đang đứng chỉ còn đèn nhận dạng), hai đèn đuôi đỏ ở cuối
    }
    // đoàn Tohoku đang chờ ở sân ga (phía trước, cùng đường): thấy đuôi nó; phần đã tách ở lại thì nằm sau lưng
    for (const pk of W.parked || []) { const pv = S.VEH[pk.key], tail0 = pk.front - pv.len - T.x, tail = Math.max(tail0, 8); if (pk.kind !== 'wait' || tail0 < 0 || tail0 > 4000) continue;
      const qL = sts.find(q => Math.abs(q.m.s - pk.front) < 400), X = (pk.own ? c.lane : qL ? qL.st.ours.x : 0) + (pk.jn !== undefined ? S.trunkOff(W, pk.front - pv.len, pk.jn) : 0), pic = iconFor(pk.key);
      items.push({ z: tail, fn: () => { if (pic) drawFront(pic, X, tail, fadeA(tail), W.rear ? 'head' : 'tail'); else { const w = 3.4 * c.f / tail, a = P(X, 0.1, tail); ctx.fillStyle = '#d8dee6'; ctx.fillRect(a[0] - w / 2, a[1] - w * 1.1, w, w * 1.1); } } }); }
    for (const sb of W.stabled || []) { const veh = S.VEH[sb.key], hi = sb.front - T.x, lo = hi - veh.len; if (lo > 1700 || hi < -20) continue; const X = sb.track.x, headHi = sb.face === 1;       // tàu đỗ ở đường phụ của ga: đầu tàu (đoàn thứ nhất) ở đầu cao nếu quay theo chiều chạy, ở đầu thấp nếu quay ngược
      items.push({ z: Math.max(lo, ZN + 1), fn: () => headHi ? slicesVeh(veh, hi, X, -1, false) : slicesVeh(veh, lo, X, 1, false) }); }
    const pl = T.phase === 'dwell' ? S.passersAt(W, T.k) : null;
    if (pl) for (const p of pl) { const u = (W.t - (p.t - 4.5)) / 9, lo = W.rear ? -1.7 : 0; if (u > lo && u < 1) { const key = p.v || (W.line.meta.defVeh), veh = S.VEH[key] || S.VEH.N700, sp = R.sprites && R.sprites[SMAP[key] || 'n700'], fxp = 0 + (c.lane > 0 ? 1.85 : -1.85);
      // camera sau nhìn ngược từ đuôi tàu ta: tàu cùng chiều tới từ xa phía sau, mũi (đầu tàu) ở gần camera nhất rồi lướt qua; vị trí tính từ cùng mô hình với camera trước (mũi tàu cách mũi ta -len..520 m) cộng quãng từ mũi ta tới camera
      const zF0 = -veh.len + u * (veh.len + 520), zFront = W.rear ? -(W.rearLen || 0) - zF0 : zF0;
      if (W.rear && (zFront + veh.len < ZN || zFront > 1500)) continue;
      const fic = iconFor(veh.parts ? (W.rear ? veh.parts[0] : veh.parts[veh.parts.length - 1]) : key), zT = zFront - veh.len;      // mặt đầu tàu (camera sau: tàu tới gần) hoặc mặt đuôi (camera trước: tàu đã vượt lên phía trước), giống tàu ngược chiều có mặt đầu
      items.push({ z: Math.max(zFront, ZN + 2), fn: () => { slices(sp, veh.len, zFront, fxp, W.rear ? 1 : -1); if (W.rear) { if (zFront > ZN && fic) drawFront(fic, 0, zFront, 1, 'head'); } else if (zT > ZN && fic) drawFront(fic, 0, zT, 1, 'tail'); } }); } }

    // phong cảnh bên ngoài hầm, nhìn qua cửa ra (vẽ sau cùng nhưng chỉ trong khung cửa ra, đè lên tường hầm tối)
    if (zExit !== null && outItems.length) { const op = openingPoly(); if (op) { ctx.save(); polyPath(op); ctx.clip(); outItems.sort((a, b) => b.z - a.z); for (const it of outItems) it.fn(); ctx.restore(); } }
    // ---- vẽ các vật theo thứ tự xa → gần
    items.sort((a, b) => b.z - a.z);
    for (const it of items) { if (it.z < ZN || it.z > zLim) continue; it.fn(); }

    // ---- cửa hầm phía trước: mặt cửa (toà nhà ở đô thị / sườn đồi), khung cửa chữ nhật hoặc vòm, nhìn thấy ray, đèn trần và sân ga ngầm bên trong
    if (entryZ !== null) {
      const ent = entryZ, urbanEnt = biomeAt(ent) === 'urban', stIn = sts.filter(q => q.d > ent - 50 && q.d < ent + 700), wide = urbanEnt || stIn.length > 0;
      const ex0 = Math.min(Math.min(0, ADJ) - 3.6, ...stIn.map(q => q.st.extent[0] - 0.8)), ex1 = Math.max(Math.max(0, ADJ) + 3.6, ...stIn.map(q => q.st.extent[1] + 0.8)), xc0 = (ex0 + ex1) / 2, hw = (ex1 - ex0) / 2;
      const poly = [], hOpen = wide ? 8.0 : 7.4, rOpen = wide ? 1.4 : 1.8;      // cửa hầm: ô chữ nhật bo góc (không còn vòm tròn)
      for (const [x, y] of [[ex1, 0], [ex1, hOpen - rOpen]]) poly.push(P(x, y, ent)); for (let i = 1; i <= 6; i++) { const a = Math.PI / 2 * i / 6; poly.push(P(ex1 - rOpen + Math.cos(a) * rOpen, hOpen - rOpen + Math.sin(a) * rOpen, ent)); } for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / 6; poly.push(P(ex0 + rOpen + Math.cos(a) * rOpen, hOpen - rOpen + Math.sin(a) * rOpen, ent)); } poly.push(P(ex0, 0, ent));
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
        quad(P(ex0 - 1.2, hOpen, ent), P(ex1 + 1.2, hOpen, ent), P(ex1 + 1.2, hOpen + 1.4, ent), P(ex0 - 1.2, hOpen + 1.4, ent), mixc([30, 40, 52], [150, 158, 170], day * (1 - wx * 0.3)));
      } else {                                // sườn đồi: gò xanh quanh cửa vòm
        const hc = mixc([14, 24, 18], [52, 84, 56], day * (1 - wx * 0.3)), hl = P(xc0 - hw, 0, ent), hr = P(xc0 + hw, 0, ent), ht = P(xc0, 8.0, ent), ww = Math.abs(hr[0] - hl[0]), hhh = hl[1] - ht[1];
        ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(ht[0], hl[1], ww * 2.4, hhh * 1.9, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        { const hw2 = hw + 1.0, h2 = hOpen + 1.0, r2 = rOpen + 0.8; ctx.fillStyle = '#707a86'; ctx.beginPath(); const q0 = P(xc0 + hw2, 0, ent); ctx.moveTo(q0[0], q0[1]); const q1 = P(xc0 + hw2, h2 - r2, ent); ctx.lineTo(q1[0], q1[1]); for (let i = 1; i <= 6; i++) { const a = Math.PI / 2 * i / 6, q = P(xc0 + hw2 - r2 + Math.cos(a) * r2, h2 - r2 + Math.sin(a) * r2, ent); ctx.lineTo(q[0], q[1]); } for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / 6, q = P(xc0 - hw2 + r2 + Math.cos(a) * r2, h2 - r2 + Math.sin(a) * r2, ent); ctx.lineTo(q[0], q[1]); } const q2 = P(xc0 - hw2, 0, ent); ctx.lineTo(q2[0], q2[1]); ctx.closePath(); ctx.fill(); }
      }
      // bên trong cửa
      ctx.save(); ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.clip();
      const ig = ctx.createLinearGradient(0, py, 0, py + ph); ig.addColorStop(0, '#1c2128'); ig.addColorStop(0.5, '#0a0d11'); ig.addColorStop(1, '#161b22'); ctx.fillStyle = ig; ctx.fillRect(px - 60, py - 60, pw + 120, ph + 120);
      const zEndIn = Math.min(ZF, entryEnd, ent + 900);
      for (const sgn of [-1, 1]) for (let k = Math.ceil((T.x + ent) / 18), z = k * 18 - T.x; z < Math.min(ent + 500, zEndIn); k++, z = k * 18 - T.x) { if (biomeAt(z) !== 'urban' && !sts.some(q => Math.abs(z - q.d) < 600)) continue; const a = P(sgn * 2.9, 6.3, z), r = Math.max(1.2, 0.18 * c.f / z), gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 4); gl.addColorStop(0, 'rgba(255,236,170,.9)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 4, a[1] - r * 4, r * 8, r * 8); }
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
    if (rain && !noW) { ctx.strokeStyle = 'rgba(190,210,245,.5)'; ctx.lineWidth = 1; const tt = now / 14; ctx.beginPath(); for (let q = 0; q < 110; q++) { const rx = px + ((q * 83 + tt * (1.5 + v / 40)) % pw), ry = py + ((q * 47 + tt * 9) % ph); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 - v / 12, ry + 10 + v / 8); } ctx.stroke(); }
    if (inSnow && !noW) { ctx.fillStyle = 'rgba(245,250,255,.85)'; const tt = now / 25; ctx.beginPath(); for (let q = 0; q < 130; q++) { const rx = px + ((q * 61 + tt * (1.2 + (q % 3) * 0.5) + Math.sin(tt / 9 + q) * 8) % pw), ry = py + ((q * 37 + tt * (1.5 + (q % 4) * 0.6)) % ph); ctx.rect(rx, ry, 2 + (q % 3 === 0), 2 + (q % 3 === 0)); } ctx.fill(); }
    if (windy && !noW) { ctx.strokeStyle = 'rgba(210,225,240,.3)'; ctx.lineWidth = 1; const tt = now / 6; ctx.beginPath(); for (let q = 0; q < 12; q++) { const ry = py + 20 + (q * 31) % (ph * 0.55), rx = px + pw - ((q * 131 + tt * (2 + q % 3)) % (pw + 80)); ctx.moveTo(rx, ry); ctx.lineTo(rx + 40, ry + Math.sin(tt / 40 + q) * 2); } ctx.stroke(); }
    if (v > 60 && zExit === null) { ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.12, (v - 60) / 400) + ')'; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 0; q < 24; q++) { const ang = hash(q * 17) * Math.PI * 2, r0 = ph * (0.45 + 0.3 * ((now / 220 + q * 0.37) % 1)), r1 = r0 + 30; ctx.moveTo(c.cx + Math.cos(ang) * r0 * 1.6, c.hy + Math.sin(ang) * r0 * 0.5); ctx.lineTo(c.cx + Math.cos(ang) * r1 * 1.6, c.hy + Math.sin(ang) * r1 * 0.5); } ctx.stroke(); }
    if (!noW && R.aud && R.aud.lastThunder) { const dt = now - R.aud.lastThunder; const fl = (dt < 90 ? 1 : 0) + (dt > 220 && dt < 300 ? 0.7 : 0); if (fl > 0) { ctx.fillStyle = 'rgba(235,240,255,' + 0.55 * fl + ')'; ctx.fillRect(px, py, pw, ph); } }
    if (T.cut) { ctx.fillStyle = 'rgba(154,90,214,.18)'; ctx.fillRect(px, py, pw, ph); }
    // kính chắn gió: giọt nước, gạt mưa, mờ khi chưa bật gạt mưa
    if (rain && !noW) { if (!T.wiper) { ctx.fillStyle = 'rgba(165,190,225,.26)'; ctx.fillRect(px, py, pw, ph); ctx.fillStyle = 'rgba(210,225,250,.35)'; ctx.beginPath(); for (let q = 0; q < 50; q++) { const x = px + hash(q * 5 + 1) * pw, y = py + hash(q * 9 + 2) * ph * 0.85, r = 1.5 + hash(q) * 2.5; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7); } ctx.fill(); } }
    if (T.wiper) { for (const [pvx, ph0] of [[px + pw * 0.3, py + ph * 0.93], [px + pw * 0.62, py + ph * 0.93]]) { const a = Math.sin(now / 280) * 0.95 - 0.1; ctx.strokeStyle = 'rgba(15,18,24,.92)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(pvx, ph0); ctx.lineTo(pvx + Math.sin(a) * ph * 0.85, ph0 - Math.cos(a) * ph * 0.85); ctx.stroke(); } }
    // khung buồng lái (gờ kính và bảng đồng hồ phía dưới)
    const fr = ctx.createLinearGradient(0, py + ph * 0.9, 0, py + ph); fr.addColorStop(0, 'rgba(8,10,14,.0)'); fr.addColorStop(0.35, 'rgba(8,10,14,.92)'); fr.addColorStop(1, '#05070a'); ctx.fillStyle = fr; ctx.fillRect(px, py + ph * 0.9, pw, ph * 0.1);
    ctx.fillStyle = '#05070a'; ctx.fillRect(px, py, 5, ph); ctx.fillRect(px + pw - 5, py, 5, ph); ctx.fillRect(px, py, pw, 3);
    { const swAt = W.rear ? W.rearSwitchAt : W.cabSwitchAt, u = swAt !== undefined ? 1 - (W.t - swAt) / 1.8 : 0; if (u > 0 && u <= 1) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, u * 1.3) + ')'; ctx.fillRect(px, py, pw, ph); } }       // chuyển buồng lái sau khi ghép: màn đen mờ dần
    ctx.restore();
  }

  // ---- nhà cửa kiểu Nhật: nhà ở 2 tầng mái ngói thấp, chung cư (mansion) nhiều tầng có dải ban công, toà văn phòng nhỏ, nhà kho tôn, đền chùa
  const WALLS = [[236, 230, 216], [222, 216, 202], [208, 203, 194], [243, 241, 235], [199, 208, 198], [224, 208, 186], [214, 196, 176]];
  const ROOFS = [[72, 78, 88], [92, 88, 84], [62, 68, 84], [108, 76, 60], [76, 94, 100], [84, 66, 62]];
  function drawJP(ctx, c, o, X, z, day, wx, night, quad, P) {
    const t = day * (1 - wx * 0.4), M = (col, k) => { const dk = col.map(v => v * (k || 1)); return mixc(dk.map(v => v * 0.13), dk, t); };
    const tone = o.tone, ty = o.t || 0, lev = o.lev || (ty === 1 ? 4 : 2), mansion = (ty === 1 || ty === 0) && lev >= 3, w = o.w, d = o.d, x0 = X - w / 2, x1 = X + w / 2, za = z, zb = z + d, xin = X > 0 ? x0 : x1, near = z < 230;
    let wall = ty === 1 ? (tone < 0.4 ? [188, 198, 210] : [226, 222, 212]) : ty === 2 ? [168, 172, 170] : ty === 3 ? [150, 158, 150] : ty === 4 ? [236, 230, 220] : WALLS[Math.floor(tone * 997) % WALLS.length];
    const roof = ty === 4 ? [48, 52, 58] : ty === 3 ? [118, 128, 134] : ty === 2 ? [140, 146, 150] : ROOFS[Math.floor(tone * 1531) % ROOFS.length];
    const flat = mansion || ty === 1 || ty === 2, h = flat ? (ty === 2 ? Math.min(o.h, 9) : Math.max(o.h, 6)) : Math.max(5.2, Math.min(o.h, 7)), wallC = M(wall), sideC = M(wall, 0.82), topC = M(wall, 0.94);
    // thân nhà: mặt bên hướng đường ray, mặt trước, mặt trên (mái bằng) hoặc mái dốc
    quad(P(xin, 0, za), P(xin, 0, zb), P(xin, h, zb), P(xin, h, za), sideC);
    if (flat) {
      quad(P(x0, h, za), P(x1, h, za), P(x1, h, zb), P(x0, h, zb), M([150, 154, 156]));
      quad(P(x0, 0, za), P(x1, 0, za), P(x1, h, za), P(x0, h, za), wallC);
      if (lev >= 5) { const bx = X - w * 0.2, bw = w * 0.4, bz = za + d * 0.3, bd = d * 0.4; quad(P(bx, h, bz), P(bx + bw, h, bz), P(bx + bw, h + 2.6, bz), P(bx, h + 2.6, bz), M(wall, 0.9)); }       // phòng kỹ thuật trên mái
      if (near) {                          // dải ban công và cửa sổ theo tầng
        const fl = ty === 2 ? 1 : Math.min(lev, 12), fh = h / fl;
        for (let f = 0; f < fl; f++) { const y = f * fh;
          if (ty === 2 && f === 0) continue; quad(P(xin, y + fh * 0.18, za), P(xin, y + fh * 0.18, zb), P(xin, y + fh * 0.30, zb), P(xin, y + fh * 0.30, za), M(wall, 0.62));
          const y0 = y + fh * 0.42, y1 = y + fh * 0.82, glass = M(ty === 1 && tone < 0.4 ? [96, 126, 156] : [88, 104, 124]);
          quad(P(xin, y0, za + d * 0.06), P(xin, y0, zb - d * 0.06), P(xin, y1, zb - d * 0.06), P(xin, y1, za + d * 0.06), glass);
          quad(P(x0 + w * 0.1, y0, za), P(x1 - w * 0.1, y0, za), P(x1 - w * 0.1, y1, za), P(x0 + w * 0.1, y1, za), glass);
          if (night > 0.35 && Math.sin(f * 7.3 + tone * 31) > 0) { ctx.globalAlpha *= 0.6; quad(P(xin, y0, za + d * 0.3), P(xin, y0, za + d * 0.55), P(xin, y1, za + d * 0.55), P(xin, y1, za + d * 0.3), 'rgba(255,220,130,.9)'); ctx.globalAlpha /= 0.6; } }
      }
      if (ty === 1 && lev <= 4 && near) quad(P(x0, 0, za), P(x1, 0, za), P(x1, 2.6, za), P(x0, 2.6, za), M([tone > 0.5 ? 190 : 70, tone > 0.7 ? 60 : 110, tone > 0.3 ? 70 : 150]));      // biển hiệu tầng trệt
    } else {                               // nhà dốc mái: ngói xám / xanh / nâu, mái đầu hồi hoặc mái hông
      const rh = Math.max(0.9, Math.min(Math.min(w, d) * 0.3, ty === 4 ? 4 : 3.2)), oh = ty === 4 ? 1.3 : 0.45, ridgeZ = d >= w, roofC = M(roof), roofL = M(roof, 1.18), roofD = M(roof, 0.8);
      if (ridgeZ) {
        quad(P(x0 - oh, h - 0.15, za), P(X, h + rh, za), P(X, h + rh, zb), P(x0 - oh, h - 0.15, zb), X > 0 ? roofL : roofC);
        quad(P(x1 + oh, h - 0.15, za), P(X, h + rh, za), P(X, h + rh, zb), P(x1 + oh, h - 0.15, zb), X > 0 ? roofC : roofL);
        ctx.fillStyle = wallC; ctx.beginPath(); let p = P(x0, 0, za); ctx.moveTo(p[0], p[1]); for (const q of [P(x1, 0, za), P(x1, h, za), P(X, h + rh, za), P(x0, h, za)]) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
      } else {
        const zm = za + d / 2;
        quad(P(x0 - oh, h - 0.15, za - oh), P(x1 + oh, h - 0.15, za - oh), P(x1 + oh, h + rh, zm), P(x0 - oh, h + rh, zm), roofL);
        quad(P(x0 - oh, h + rh, zm), P(x1 + oh, h + rh, zm), P(x1 + oh, h - 0.15, zb + oh), P(x0 - oh, h - 0.15, zb + oh), roofD);
        quad(P(x0, 0, za), P(x1, 0, za), P(x1, h, za), P(x0, h, za), wallC);
        ctx.fillStyle = sideC; ctx.beginPath(); let p = P(xin, h, za); ctx.moveTo(p[0], p[1]); for (const q of [P(xin, h, zb), P(xin, h + rh, zm)]) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
      }
      if (near && ty !== 3) {               // cửa sổ tầng 1–2, ban công mảnh, cửa ra vào
        const glass = M([88, 104, 124]), fl = h > 6 ? 2 : 1;
        for (let f = 0; f < fl; f++) { const y0 = 0.9 + f * 2.7, y1 = y0 + 1.5; for (let k = 0; k < Math.max(1, Math.floor(d / 4)); k++) { const a = za + 1 + k * 4, b = a + 2.2; if (b > zb - 0.6) break; quad(P(xin, y0, a), P(xin, y0, b), P(xin, y1, b), P(xin, y1, a), glass);
            if (night > 0.35 && Math.sin(k * 5.1 + f * 3 + tone * 40) > 0.1) quad(P(xin, y0, a + 0.2), P(xin, y0, b - 0.2), P(xin, y1 - 0.2, b - 0.2), P(xin, y1 - 0.2, a + 0.2), 'rgba(255,214,120,.9)'); } }
        if (f1(w) > 0) for (let f = 0; f < fl; f++) { const y0 = 0.9 + f * 2.7; quad(P(x0 + w * 0.15, y0, za), P(x0 + w * 0.5, y0, za), P(x0 + w * 0.5, y0 + 1.5, za), P(x0 + w * 0.15, y0 + 1.5, za), glass); }
        if (h > 6) quad(P(xin, 3.3, za), P(xin, 3.3, zb), P(xin, 3.6, zb), P(xin, 3.6, za), M([96, 96, 96]));       // dải ban công tầng 2
      }
    }
  }
  const f1 = w => w > 6 ? 1 : 0;
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
    } else if (o.kind === 'jp' || o.kind === 'house') {
      drawJP(ctx, c, o.kind === 'house' ? Object.assign({ t: 0, lev: 2 }, o) : o, X, z, day, wx, night, quad, P);
    } else if (o.kind === 'house_old') {
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

  // Camera ở buồng lái CUỐI đoàn nhìn ngược về phía sau: dựng một "thế giới phản chiếu" (hướng chạy đảo, toạ độ s' = chiều dài tuyến − s) rồi vẽ bằng cùng hàm draw
  function drawRear(ctx, px, py, pw, ph, W, T, R) {
    const L = W.line, Lm = L.kmEnd * 1000, W2 = Object.create(W), T2 = Object.create(T), rv = root.Sim.rearVis(T), aLen = rv ? rv.anchorLen : T.veh.len, mz = z => Object.assign({}, z, { s0: Lm - z.s1, s1: Lm - z.s0 });
    W2.dir = W.dir === 'down' ? 'up' : 'down'; W2.zones = (W.zones || []).map(mz); W2.workers = []; W2.wires = []; W2.animals = []; W2.opposing = []; W2.rearLen = aLen; W2.oppRear = (W.opposing || []).map(t0 => ({ t0, key: root.Sim.oppKey(W, T, t0) })); W2.passers = {};
    W2.dead = (W.dead || []).map(d => Object.assign({}, d, { s0: Lm - d.s1, s1: Lm - d.s0, hzA: d.hzB, hzB: d.hzA })); W2.xings = (W.xings || []).map(g => Object.assign({}, g, { s: Lm - g.s })).sort((a, b) => a.s - b.s);
    W2.parked = (W.parked || []).filter(p => p.kind === 'left').map(p => ({ key: p.key, front: Lm - (p.front - root.Sim.VEH[p.key].len), kind: 'wait', jn: p.jn, own: p.cc ? true : undefined }));
    W2.rear = true; W2.rearOf = W.dir; W2.rearShift = 0.85 * aLen; const LAY = root.Layout;
    W2.rearPick = mi => { const code = L.stations[mi].lay || '2-2-0', N = LAY.tokens(code, W.dir).length; return { i: N - 1 - LAY.station(code, W.dir, LAY.pickOf(L.stations[mi], mi, W)).ours.i }; };      // camera ở đúng đường vật lý của ta (chỉ số đảo vì chuỗi bố trí đảo thứ tự)
    W2.stabled = (W.stabled || []).map(sb => { const code = L.stations[sb.i].lay || '2-2-0', N = LAY.tokens(code, W.dir).length, st2 = LAY.station(code, W.dir, W2.rearPick(sb.i), true), t2 = st2.tracks.find(t => t.i === N - 1 - sb.track.i); return t2 ? { key: sb.key, i: sb.i, front: Lm - (sb.front - root.Sim.VEH[sb.key].len), face: -sb.face, track: t2 } : null; }).filter(Boolean);      // cùng một đường vật lý: chỉ số trong chuỗi bố trí đảo ngược
    if (rv) W2.parked.push({ key: rv.key, front: Lm - (T.x - aLen - rv.gap - root.Sim.VEH[rv.key].len), kind: 'wait', own: true }); W2.lead = null; T2.x = Lm - (T.x - aLen); T2.M = T.M.slice().reverse().map(m => { const r = Object.assign({}, m, { s: Lm - (m.sOrig !== undefined ? m.sOrig : m.s) }); delete r.sOrig; return r; });      // bản phản chiếu: s đã là vị trí hình học gốc, bỏ sOrig (nếu giữ lại, ga ghép/tách bị tính lệch cả trăm mét và biến mất khỏi camera sau) T2.k = T.M.length - 1 - T.k; T2.forced = T.forced >= 0 ? T.M.length - 1 - T.forced : -1;      // dừng khẩn ở ga không có lịch dừng cũng phải rẽ vào đường nhánh trong camera sau W2.player = T2;
    draw(ctx, px, py, pw, ph, W2, T2, R);
  }
  root.CabView = { draw, drawRear, proj, cellObject, hash, CAMH, PEDGE, PH, ADJ };
})(typeof window !== 'undefined' ? window : globalThis);
