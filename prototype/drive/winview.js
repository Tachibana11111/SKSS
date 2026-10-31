// Góc nhìn CỬA SỔ HÀNH KHÁCH: camera đặt ở toa giữa của cả đoàn, nhìn vuông góc ra bên TRÁI hoặc bên PHẢI hướng chạy qua cửa sổ có khung.
// Kích cỡ cửa sổ lấy theo từng dòng tàu (đo từ các dải ảnh toa, xem WINSPEC): cửa sổ rộng thì thấy 1 ô, cửa sổ hẹp thì thấy 2–3 ô cạnh nhau (giữa các ô là trụ vách toa).
// Cảnh vật trượt ngược chiều tàu: cửa trái thì cảnh trôi về bên trái màn hình, cửa phải thì trôi về bên phải. Mọi thứ được dựng như nhìn ra cửa TRÁI (phía trước = bên phải màn hình),
// cửa phải = lật gương cả cảnh (chữ vẽ lật lại để không bị ngược).
// Nguồn cảnh: nhà, cây, cột điện, lớp phủ đất từ dữ liệu OSM (world.js / strips.js, © OpenStreetMap contributors, ODbL, chỉ dùng cá nhân); mọi chi tiết khác (cột điện kéo dây, tường hầm, người trên sân ga...) vẽ bằng code [I].
// Toạ độ: s = vị trí dọc tuyến (m, theo chiều chạy); e = khoảng cách ngang TỪ TIM ĐƯỜNG TA ra phía cửa sổ (m); h = độ cao so với mặt ray; d = khoảng cách tới mắt.
(function (root) {
  const EOFF = 0.9, PH = 1.25, ADJ = 4.3, DEYE = 0.55;
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hs = (a, b) => { const x = Math.sin(a * 12.9898 + (b || 0) * 78.233) * 43758.5453; return x - Math.floor(x); };
  const mixc = (c1, c2, t) => 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
  const SMAP = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5', E7: 'e7', H5: 'h5', E6: 'e6', E8: 'e8', T4: 't4', E926: 'e926', E2: 'e2', 'E5+E6': 'e5', 'E5+E8': 'e5', 'E6+E5': 'e6', 'E8+E5': 'e8', 'N700S-6': 'kamome' };
  // kích thước ô cửa sổ (m) đo từ dải ảnh toa giữa của từng dòng (phân tích điểm ảnh tối trong thân toa, quy ra mét theo pxPerMeter): w rộng, h cao, pitch = khoảng cách tâm hai ô liền nhau, sill = mép dưới ô so với mặt ray
  // [I: số đo từ ảnh vẽ 2D, có thể lệch so với tàu thật; n700 dùng số của n700s, t4 dùng số gần E5, kamome lấy rộng/cao theo dải ảnh và sill theo thân N700S]
  const WINSPEC = { e5: { w: 0.58, h: 0.50, pitch: 1.05, sill: 1.95 }, h5: { w: 0.58, h: 0.50, pitch: 1.05, sill: 1.95 }, e6: { w: 0.60, h: 0.52, pitch: 1.00, sill: 1.93 }, e8: { w: 0.60, h: 0.52, pitch: 1.04, sill: 1.93 }, e7: { w: 0.55, h: 0.51, pitch: 1.02, sill: 1.90 },
    n700s: { w: 0.57, h: 0.43, pitch: 1.15, sill: 1.65 }, n700: { w: 0.57, h: 0.43, pitch: 1.15, sill: 1.65 }, s800: { w: 0.58, h: 0.52, pitch: 0.90, sill: 1.67 }, kamome: { w: 0.45, h: 0.50, pitch: 1.00, sill: 1.90 },
    e926: { w: 0.79, h: 0.88, pitch: 2.37, sill: 2.20 }, t4: { w: 0.60, h: 0.50, pitch: 1.05, sill: 1.90 }, e2: { w: 1.55, h: 0.67, pitch: 1.92, sill: 1.70 } };
  const nWindows = sp => sp.w >= 0.75 ? 1 : sp.w >= 0.52 ? 2 : 3;      // rộng: 1 ô; hẹp: 2–3 ô
  const CLS = { f: [34, 78, 44], a: [150, 160, 84], g: [100, 150, 74], o: [104, 150, 70], h: [132, 128, 120], c: [150, 142, 146], i: [120, 122, 128], e: [104, 126, 98], p: [88, 148, 78], w: [60, 125, 176], m: [74, 122, 104], s: [88, 118, 74], r: [138, 130, 121], y: [200, 190, 140], z: [104, 104, 100] };
  const SKIN = ['#e8c4a0', '#d9a97c', '#f0d2b4', '#c99468', '#b9835a'], CLOTH = ['#3b4a5e', '#5a3b4a', '#2f5a48', '#6a6a2f', '#4a4a6a', '#6a4a3a', '#8a8f96', '#a04a4a', '#2a2f3a', '#d8d4c8', '#365f8a', '#8a6a3a'], HAIR = ['#1c1816', '#2a2018', '#4a3a2a', '#a8a8a8', '#12100e'];
  const stCache = {};

  function draw(ctx, px, py, pw, ph, W, T, R, side) {
    const S = root.Sim, LAY = root.Layout, WD = root.World, L = W.line, now = performance.now(), v = T.v;
    side = side || 1;
    // ---- môi trường (cùng công thức với cabview)
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600;
    const day = smooth(5.3, 7.3, hour) * (1 - smooth(16.8, 19.0, hour)), night = 1 - day, dusk = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.2) + Math.max(0, 1 - Math.abs(hour - 17.8) / 1.3);
    const inSnow = W.zones.some(z => z.kind === 'snow' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 3000 && T.x < z.s1), rain = !!W.rainHere;
    const wx = rain ? 0.55 : inSnow ? 0.4 : 0;
    let sh = 0; if (W.eqkAt !== undefined && W.eqkActive) sh = 5 * Math.exp(-(W.t - W.eqkAt) / 40) + 0.8; if (W.shakeAt !== undefined && W.t - W.shakeAt < 4) sh = Math.max(sh, (W.shakeAmp || 4) * Math.exp(-(W.t - W.shakeAt) / 1.2));
    const lit = day * (1 - wx * 0.4);
    const sCam = T.x - T.veh.len / 2, km = s => S.kmOfS(s, W.dir, L.kmEnd), biomeAt = s => S.biomeAt(L, km(s)), tunAt = s => S.inTunnel(W, s), struct = s => S.structAt(L, km(s));
    const wdOurs = W.dir === 'up' ? -4.3 : 0, wdOn = !!(WD && WD.has(W.lineId, W.dir, L.kmEnd, T.x));

    // ---- loại cửa sổ theo toa chứa camera (đoàn ghép: phần đầu hoặc phần sau)
    let camKey = T.veh.key; if (T.veh.parts) camKey = (T.veh.len / 2 < S.VEH[T.veh.parts[0]].len) ? T.veh.parts[0] : T.veh.parts[T.veh.parts.length - 1];
    const spec = WINSPEC[SMAP[camKey] || 'n700s'] || WINSPEC.n700s, nWin = nWindows(spec), totalM = (nWin - 1) * spec.pitch + spec.w;
    const EYE = 2.9;      // độ cao mắt so với mặt ray: nâng lên ngang đầu người đứng ở sân ga (đầu ~2,95 m) để thấy cả người và nhìn qua lan can cầu cạn; sill đo được chỉ để tham khảo
    // ---- hình học các ô cửa sổ trên màn hình (px/m ở mặt kính = scale); mọi ô dùng chung một phép chiếu
    const availW = pw * 0.88, availH = ph * 0.70, scale = Math.min(availW / totalM, availH / spec.h), winW = spec.w * scale, winH = spec.h * scale, pitchPx = spec.pitch * scale;
    const ox0 = px + pw / 2 - (totalM * scale) / 2, ox1 = ox0 + totalM * scale, ow = ox1 - ox0, oy0 = py + ph * 0.42 - winH / 2, oy1 = oy0 + winH, oh = winH, rad = Math.min(winW, winH) * 0.12;
    const f = Math.max(scale * DEYE, ow / 2.4), shx = sh > 0.1 ? (Math.random() - 0.5) * sh * 3 : 0, bob = Math.min(1, v / 80) * Math.sin(now / 70) * 0.9 + (sh > 0.1 ? (Math.random() - 0.5) * sh * 4 : 0);
    const cx = (ox0 + ox1) / 2 + shx, hy = oy0 + oh / 2 - 0.08 * scale + bob;
    const X = (s, d) => cx + (s - sCam) * f / d, Y = (h, d) => hy + (EYE - h) * f / d;
    const sAt = (x, d) => sCam + (x - cx) * d / f;
    const dep = e => Math.max(0.3, e - EOFF);
    const winRects = []; for (let i = 0; i < nWin; i++) winRects.push([ox0 + i * pitchPx, oy0, winW, winH]);

    // cao độ tuyến so với mặt đất (nền đắp / cầu cạn): el > 0 khi ray cao hơn đất
    const el0 = Math.max(0, sCam - 800), elT = LAY.elevTable(L, S, W.dir, el0, 1800, 10);
    const elAt = s => { const q = clamp((s - el0) / 10, 0, elT.length - 1.001), i = Math.floor(q); return elT[i] + (elT[i + 1] - elT[i]) * (q - i); };

    // ---- các ga gần
    const sts = [];
    T.M.forEach((m0, i) => { const gs = m0.sOrig !== undefined ? m0.sOrig : m0.s; if (Math.abs(gs - sCam) > 1300) return;
      const m = gs === m0.s ? m0 : Object.assign({}, m0, { s: gs }), key = W.lineId + ':' + m.i + ':' + W.dir + (W.termPick && W.termPick[m.i] !== undefined ? ':t' + W.termPick[m.i] : '');
      const st = stCache[key] || (stCache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.dir, LAY.pickOf(L.stations[m.i], m.i, W)));
      sts.push({ m, i, gs, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')) }); });
    let lane = 0; for (const q of sts) if (q.stopHere && !q.m.mainStop) { const o = q.st.ours, w = LAY.trackW(o, sCam, q.gs); if (o.own ? w > 0 : true) lane += LAY.laneOf(o, sCam, q.gs, w, LAY.spread(sCam, q.gs), 1300, 720); }
    const out = Xm => side > 0 ? Xm - lane : lane - Xm;      // X mô hình (dương = trái) → khoảng cách ngang ra phía cửa sổ đang xem

    // ---- tường nội thất (vách toa, trụ giữa các ô cửa sổ)
    { const g = ctx.createLinearGradient(px, py, px, py + ph); g.addColorStop(0, mixc([60, 56, 52], [212, 204, 190], 0.55 + 0.25 * day)); g.addColorStop(1, mixc([40, 38, 36], [168, 160, 148], 0.5 + 0.2 * day)); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }

    // ---- vùng thấy được qua các ô cửa sổ
    ctx.save(); ctx.beginPath(); for (const [x, y, w, h] of winRects) ctx.roundRect(x, y, w, h, rad); ctx.clip();
    if (side < 0) { ctx.translate(2 * cx, 0); ctx.scale(-1, 1); }
    const txt = (t, x, y, col, font, al) => { ctx.save(); ctx.translate(x, y); if (side < 0) ctx.scale(-1, 1); ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || 'center'; ctx.fillText(t, 0, 0); ctx.restore(); };
    // bầu trời
    { const skyTop = wx > 0 ? mixc([30, 34, 42], [110, 118, 130], day) : mixc([6, 12, 24], [92, 160, 224], day), skyBot = wx > 0 ? mixc([60, 66, 76], [176, 184, 194], day) : mixc([14, 24, 42], [183, 214, 240], day);
      const g = ctx.createLinearGradient(0, oy0, 0, hy + 4); g.addColorStop(0, skyTop); g.addColorStop(1, skyBot); ctx.fillStyle = g; ctx.fillRect(ox0 - 80, oy0 - 80, ow + 160, hy - oy0 + 84);
      if (dusk > 0.05 && wx < 0.3) { ctx.fillStyle = 'rgba(255,140,60,' + Math.min(0.35, dusk * 0.3) + ')'; ctx.fillRect(ox0 - 80, hy - 70, ow + 160, 74); }
      if (night > 0.4 && wx < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + 0.7 * (night - 0.4) + ')'; for (let i = 0; i < 46; i++) ctx.fillRect(ox0 + hs(i * 17) * ow, oy0 + hs(i * 31, 7) * Math.max(4, hy - oy0 - 8), 1.2, 1.2); } }
    // núi Phú Sĩ (Tokaido, km ~140, cách đường ~26 km; bên phải khi đi xuống, bên trái khi đi lên) [I]
    if (W.lineId === 'tsk') { const sF = S.sOfKm(140, W.dir, L.kmEnd), fSide = W.dir === 'up' ? 1 : -1;
      if (fSide === side) { const dz = sF - sCam, xF = cx + dz * f / 26000, hF = 3776 / 26000 * f * 1.2, wF = hF * 2.3; if (Math.abs(dz) < 70000 && xF > ox0 - wF && xF < ox1 + wF) { const yb = hy + 4;
        ctx.fillStyle = mixc([32, 44, 78], [86, 112, 150], lit); ctx.beginPath(); ctx.moveTo(xF - wF, yb); ctx.lineTo(xF - wF * 0.07, yb - hF); ctx.lineTo(xF + wF * 0.07, yb - hF); ctx.lineTo(xF + wF, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(245,248,255,' + (0.5 + 0.4 * day) + ')'; ctx.beginPath(); ctx.moveTo(xF - wF * 0.21, yb - hF * 0.72); ctx.lineTo(xF - wF * 0.07, yb - hF); ctx.lineTo(xF + wF * 0.07, yb - hF); ctx.lineTo(xF + wF * 0.21, yb - hF * 0.72); ctx.closePath(); ctx.fill(); } } }
    // núi đồi xa (thị sai rất chậm)
    { const D = 3000, base = hy + 4; ctx.fillStyle = mixc([24, 36, 54], [76, 104, 124], lit * (1 - wx * 0.3)); ctx.beginPath(); ctx.moveTo(ox0 - 10, base);
      for (let x = ox0 - 10; x <= ox1 + 14; x += 8) { const s = sAt(x, D), b = biomeAt(s), H = b === 'mountain' ? 420 : b === 'urban' ? 70 : 150, hh = H * (0.5 + 0.5 * Math.sin(s / 470) * Math.sin(s / 1130 + 1.3)) + H * 0.25 * Math.sin(s / 190) + H * 0.1; ctx.lineTo(x, base - Math.max(2, hh * f / D)); }
      ctx.lineTo(ox1 + 14, base); ctx.closePath(); ctx.fill(); }

    // ---- cảnh gần (e 9–60 m) vẽ từng vật ở ĐÚNG độ sâu; cảnh xa (e 60–320 m) là tranh OSM ở độ sâu ~110 m
    const sgn = side > 0 ? 1 : -1, so = { WD, lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, dO: wdOurs, t: lit, layers: [1], lite: root.SCENERY === 'lite' };
    const lvl = wdOn && root.Strips && !so.lite ? root.Strips.prepare(so, sAt(ox0, 110) - 20, sAt(ox1, 110) + 20, [sgn]) : Math.max(0, Math.min(3, Math.round(lit * 3)));
    const clsAt = (s, e) => wdOn ? String.fromCharCode(WD.landG(W.lineId, W.dir, L.kmEnd, s, sgn * e, wdOurs) || 0) : '';
    const gcol = (s, e) => CLS[clsAt(s, e)] || null;
    const gb = biomeAt(sCam), gdef = inSnow ? [214, 222, 232] : gb === 'urban' ? [88, 92, 96] : gb === 'mountain' ? [44, 78, 52] : [76, 110, 60];
    const items = [];
    const tcol = (c, f2) => { const n = 0.13, k = n + (1 - n) * lit; return 'rgb(' + c.map(u => Math.round(u * (f2 || 1) * k)).join(',') + ')'; };
    // mặt đất theo dải độ sâu (màu theo lớp phủ đất thật; cầu thì là mặt nước)
    const BANDS = [3000, 900, 450, 200, 90, 45, 22, 10, 4.5];
    for (let b = 0; b < BANDS.length - 1; b++) items.push({ d: BANDS[b], fn: () => { const dF = BANDS[b], dN = BANDS[b + 1];
      const stp = dF >= 200 ? 20 : 10, fogm = clamp((dF - 60) / 700, 0, 1) * (0.25 + wx * 0.7), fa = fogm * 0.5 * day;      // dải xa: cột rộng gấp đôi; sương trộn thẳng vào màu đất (một lệnh vẽ thay vì hai, kết quả nhìn y hệt vì nền đã đặc)
      for (let x = ox0 - 6; x < ox1 + 6; x += stp) { const s = sAt(x + stp / 2, (dF + dN) / 2), e = (dF + dN) / 2 + EOFF, onBr = struct(s) === 'b', g0 = onBr ? [58, 110, 156] : gcol(s, e), base = g0 || gdef, gh = -elAt(s), y0 = Y(gh, dF), y1 = Y(gh, dN), lt = lit * (1 - wx * 0.15);
        const r = lerp(base[0] * 0.14 + 4, base[0], lt), gg = lerp(base[1] * 0.16 + 6, base[1], lt), bb = lerp(base[2] * 0.18 + 8, base[2], lt);
        ctx.fillStyle = fogm > 0 ? 'rgb(' + Math.round(lerp(r, 150, fa)) + ',' + Math.round(lerp(gg, 160, fa)) + ',' + Math.round(lerp(bb, 170, fa)) + ')' : 'rgb(' + Math.round(r) + ',' + Math.round(gg) + ',' + Math.round(bb) + ')'; ctx.fillRect(x, y0 - 0.5, stp + 0.6, y1 - y0 + 1.5); } } });
    // tranh xa (lớp 1)
    if (wdOn && root.Strips && !so.lite) items.push({ d: 110, fn: () => { const D = 110, sa = sAt(ox0, D), sb = sAt(ox1, D), TILE = root.Strips.TILE, Lh = root.Strips.LAYERS[1], k = f / D;
      for (let ti = Math.floor(sa / TILE); ti <= Math.floor(sb / TILE); ti++) { if (ti < 0) continue; const cv = root.Strips.tile(so, 1, sgn, ti, lvl); if (!cv) continue; const a = Math.max(sa, ti * TILE), b = Math.min(sb, (ti + 1) * TILE); if (b <= a) continue;
        const top = cv.top || 0, sxp = (a - ti * TILE) * Lh.ppm, swp = Math.min((b - a) * Lh.ppm, cv.width - sxp); if (swp <= 0) continue; const gh = -elAt((a + b) / 2), yb = Y(gh, D), hpx = (cv.height - top) / Lh.ppm * k;
        ctx.globalAlpha = 1 - (0.35 * wx + 0.1 * (1 - day)); ctx.drawImage(cv, sxp, top, swp, cv.height - top, X(a, D), yb - hpx, (b - a) * k, hpx); } ctx.globalAlpha = 1; } });
    // cảnh gần: nhà thật (từng toà ở đúng độ sâu), cây theo lớp phủ đất, cột điện dọc phố
    if (wdOn) { const sa = sAt(ox0, 60) - 25, sb = sAt(ox1, 60) + 25, eLo = sgn > 0 ? 9 : -60, eHi = sgn > 0 ? 60 : -9;
      WD.collect(W.lineId, W.dir, L.kmEnd, sa, sb, eLo, eHi, wdOurs, (sg, e, bw, ds, hh, ty, lv, tone) => { const ae = Math.abs(e), dd = dep(ae - bw / 2); if (dd < 3) return; items.push({ d: dd, fn: () => { const k = f / dd, gh = -elAt(sg), x = X(sg - ds / 2, dd), wpx = Math.max(3, ds * k); if (x > ox1 + 20 || x + wpx < ox0 - 20) return; const H = hh / 0.98 + 0.2;
        ctx.save(); ctx.translate(x, Y(gh, dd) - H * k); if (root.Strips && root.Strips.house) root.Strips.house(ctx, { sg, e: ae, bw, ds, h: hh, ty, lev: lv, tone }, 0, wpx, k, H, lit, lit < 0.4, (col, ff) => tcol(col, ff), 0); ctx.restore(); } }); });
      for (let s = Math.floor(sa / 3) * 3; s < sb; s += 3) for (const lyr of [0, 1]) { const id = Math.round(s / 3) * 2 + lyr, e = 9 + 47 * Math.sqrt(hs(id, 17 + lyr)), sT = s + hs(id, 3) * 3, cl = clsAt(sT, e), r = hs(id, 5);
        const dens = cl === 'f' ? 0.8 : cl === 's' ? 0.55 : cl === 'p' || cl === 'e' ? 0.45 : cl === 'o' ? 0.5 : cl === 'g' ? 0.1 : cl === 'a' ? 0.07 : 0; if (r > dens) continue; const dd = dep(e), cr = 2.4 + 3.2 * hs(id, 7), th = cr * (2.2 + hs(id, 9)), conifer = cl === 'f' && hs(id, 13) < 0.5;
        items.push({ d: dd, fn: () => { const k = f / dd, x = X(sT, dd), yb = Y(-elAt(sT), dd); if (x < ox0 - cr * k * 1.5 || x > ox1 + cr * k * 1.5) return; ctx.fillStyle = tcol([70, 52, 36]); ctx.fillRect(x - 0.25 * k, yb - th * 0.45 * k, 0.5 * k, th * 0.45 * k); ctx.fillStyle = tcol(conifer ? [34, 72, 48] : [56 + 40 * hs(id, 17), 108 + 24 * hs(id, 19), 58]);
          if (conifer) { ctx.beginPath(); ctx.moveTo(x, yb - th * k); ctx.lineTo(x - cr * 0.8 * k, yb - th * 0.3 * k); ctx.lineTo(x + cr * 0.8 * k, yb - th * 0.3 * k); ctx.closePath(); ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(x, yb - th * 0.7 * k, cr * k, cr * 0.9 * k, 0, 0, 7); ctx.fill(); ctx.fillStyle = tcol([70 + 30 * hs(id, 21), 124, 66], 1.08); ctx.beginPath(); ctx.ellipse(x - cr * 0.25 * k, yb - th * 0.78 * k, cr * 0.6 * k, cr * 0.5 * k, 0, 0, 7); ctx.fill(); } } }); }
      const seen = new Set(); for (const q of WD.polesG(W.lineId, W.dir, L.kmEnd, sa, sb, eLo, eHi, wdOurs)) { const key = Math.round(q.s0 * 3) + ':' + Math.round(q.e0 * 3); if (seen.has(key)) continue; seen.add(key); const dd = dep(Math.abs(q.e0)); if (dd < 3) continue;
        items.push({ d: dd, fn: () => { const k = f / dd, x = X(q.s0, dd), x1 = X(q.s1, dd), dd1 = dep(Math.abs(q.e1)), yb = Y(-elAt(q.s0), dd), col = tcol([86, 82, 76]); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 0.25 * k); ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - 9 * k); ctx.moveTo(x - 0.9 * k, yb - 9 * k); ctx.lineTo(x + 0.9 * k, yb - 9 * k); ctx.stroke();
          ctx.lineWidth = Math.max(0.7, 0.07 * k); for (const dy of [0, 0.7, 1.4]) { ctx.beginPath(); ctx.moveTo(x, yb - (9 - dy) * k); ctx.quadraticCurveTo((x + x1) / 2, yb - (9 - dy) * k + 2.2 * k * (dd / dd1), x1, Y(-elAt(q.s1), dd1) - (9 - dy) * f / dd1); ctx.stroke(); } } }); } }

    // ---- nền đường: khe cắt / mái taluy, tường chắn, dàn cầu thép, cột điện, cầu vượt đường bộ, mốc km, hộp thiết bị
    items.push({ d: 6, fn: () => { for (let x = ox0 - 8; x < ox1 + 8; x += 6) { const s = sAt(x + 3, 6), k = Math.floor(s / 300), cut = biomeAt(s) === 'mountain' && hs(k * 7.3, 1) < 0.45 && struct(s) === 'g' && !tunAt(s);
        if (!cut) continue; const hgt = 3 + 4 * hs(k, 5), y1 = Y(0, 5.2), y0 = Y(hgt, 5.2); ctx.fillStyle = mixc([20, 24, 20], [112, 96, 78], lit * 0.9); ctx.fillRect(x, y0, 6.6, y1 - y0 + 4); ctx.fillStyle = mixc([14, 30, 18], [58, 96, 52], lit); ctx.fillRect(x, y0 - 2, 6.6, 7 + 8 * hs(Math.floor(s / 9), 3)); } } });
    items.push({ d: 2.7, fn: () => { for (let x = ox0 - 8; x < ox1 + 8; x += 8) { const s = sAt(x + 4, 2.7), kind = struct(s), b = biomeAt(s); if (!((kind === 'v' || kind === 'b') && b === 'urban') || hs(Math.floor(s / 400), 9) < 0.12 || tunAt(s)) continue;
        const y1 = Y(0.15, 2.7), y0 = Y(2.1, 2.7); ctx.fillStyle = mixc([30, 34, 38], [196, 200, 204], lit); ctx.fillRect(x, y0, 8.6, y1 - y0); ctx.fillStyle = mixc([20, 24, 28], [150, 156, 160], lit); ctx.fillRect(x, y0, 8.6, 5); } } });
    items.push({ d: 1.9, fn: () => { for (let x = ox0 - 8; x < ox1 + 8; x += 8) { const s = sAt(x + 4, 1.9); if (struct(s) !== 'b' || tunAt(s)) continue; ctx.fillStyle = mixc([20, 24, 28], [118, 124, 130], lit); ctx.fillRect(x, Y(1.2, 1.9), 8.6, Math.max(3, 0.9 * f / 1.9)); }
      ctx.strokeStyle = mixc([24, 28, 32], [96, 102, 108], lit); ctx.lineWidth = Math.max(2, 0.12 * f / 1.9); const sA = sAt(ox0 - 40, 1.9), sB = sAt(ox1 + 40, 1.9);
      for (let s = Math.floor(sA / 4) * 4; s < sB; s += 4) { if (struct(s) !== 'b' || tunAt(s)) continue; const x0 = X(s, 1.9), x1 = X(s + 4, 1.9); ctx.beginPath(); ctx.moveTo(x0, Y(0.3, 1.9)); ctx.lineTo(x0, Y(4.6, 1.9)); ctx.moveTo(x0, Y(0.3, 1.9)); ctx.lineTo(x1, Y(4.6, 1.9)); ctx.stroke(); } } });
    items.push({ d: 2.1, fn: () => { const sA = sAt(ox0 - 60, 2.1), sB = sAt(ox1 + 60, 2.1), k0 = Math.floor(sA / 50), k1 = Math.floor(sB / 50), col = mixc([30, 32, 36], [150, 156, 160], lit);
      for (let k = k0; k <= k1; k++) { const s = k * 50 + 3 * hs(k, 2); if (tunAt(s)) continue; const gh = -elAt(s), x = X(s, 2.1), yb = Y(gh, 2.1), yt = Y(8.3, 2.1), w = Math.max(3, 0.32 * f / 2.1);
        ctx.fillStyle = col; ctx.fillRect(x - w / 2, yt, w, yb - yt); ctx.fillRect(x - w * 2.4, Y(8.0, 2.1), w * 4.8, Math.max(2, 0.18 * f / 2.1));
        const sn = (k + 1) * 50 + 3 * hs(k + 1, 2), xn = X(sn, 2.1); if (!tunAt(sn)) for (const hh of [5.3, 6.3]) { ctx.strokeStyle = mixc([60, 64, 70], [170, 176, 182], lit); ctx.lineWidth = Math.max(1, 0.03 * f / 2.1); ctx.beginPath(); ctx.moveTo(x, Y(hh, 2.1)); ctx.quadraticCurveTo((x + xn) / 2, Y(hh, 2.1) + 7, xn, Y(hh, 2.1)); ctx.stroke(); } } } });
    // cầu vượt đường bộ cắt ngang (mố cầu bê tông, cao 6,8 m, dài 11 m dọc đường) cách nhau ~1,7 km, không ở trong ga/hầm/vùng núi [I]
    items.push({ d: 6.4, fn: () => { const sA = sAt(ox0 - 40, 6.4), sB = sAt(ox1 + 40, 6.4);
      for (let k = Math.floor(sA / 1700) - 1; k <= Math.floor(sB / 1700) + 1; k++) { const so_ = k * 1700 + 400 + 700 * hs(k, 11); if (hs(k, 13) > 0.55 || tunAt(so_) || struct(so_) !== 'g' || biomeAt(so_) === 'mountain' || sts.some(q => Math.abs(so_ - q.gs) < 700)) continue;
        const x0 = X(so_ - 5.5, 6.4), x1 = X(so_ + 5.5, 6.4), yb = Y(0, 6.4), yt = Y(6.8, 6.4); if (x1 < ox0 || x0 > ox1) continue; ctx.fillStyle = mixc([24, 26, 30], [168, 170, 166], lit); ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0, yt); ctx.lineTo(x1, yt - 14); ctx.lineTo(x1, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = mixc([14, 16, 20], [96, 98, 96], lit); ctx.fillRect(x0, yt, x1 - x0, 10); ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let q = 1; q < 4; q++) ctx.fillRect(x0 + (x1 - x0) * q / 4, yt + 6, 1.6, yb - yt - 6); } } });
    // mốc km (mỗi 1 km, biển trắng số đen) và hộp thiết bị bên đường (mỗi ~600 m)
    items.push({ d: 1.8, fn: () => { const kmC = Math.round(km(sCam)); for (let j = -1; j <= 1; j++) { const kk = kmC + j, s = S.sOfKm(kk, W.dir, L.kmEnd); if (Math.abs(s - sCam) > 120 || tunAt(s)) continue; const x = X(s, 1.8), yb = Y(-elAt(s), 1.8), k = f / 1.8; ctx.fillStyle = mixc([30, 30, 32], [210, 210, 206], lit); ctx.fillRect(x - 0.22 * k, yb - 1.3 * k, 0.44 * k, 0.55 * k); ctx.fillStyle = mixc([60, 60, 62], [150, 150, 148], lit); ctx.fillRect(x - 0.03 * k, yb - 0.75 * k, 0.06 * k, 0.75 * k); txt(String(kk), x, yb - 0.9 * k, '#14181c', 'bold ' + Math.max(8, 0.3 * k) + 'px system-ui'); } } });
    items.push({ d: 3.6, fn: () => { const sA = sAt(ox0 - 30, 3.6), sB = sAt(ox1 + 30, 3.6); for (let k = Math.floor(sA / 600); k <= Math.floor(sB / 600); k++) { const s = k * 600 + 200 * hs(k, 21); if (hs(k, 23) > 0.5 || tunAt(s) || sts.some(q => Math.abs(s - q.gs) < 500)) continue; const x0 = X(s, 3.6), x1 = X(s + 4, 3.6), yb = Y(-elAt(s), 3.6), kk = f / 3.6; ctx.fillStyle = mixc([30, 36, 34], [140, 150, 146], lit); ctx.fillRect(x0, yb - 2.2 * kk, x1 - x0, 2.2 * kk); ctx.fillStyle = mixc([20, 24, 24], [100, 108, 104], lit); ctx.fillRect(x0 + (x1 - x0) * 0.35, yb - 1.9 * kk, (x1 - x0) * 0.3, 1.9 * kk); } } });

    // ---- ga: sân ga, người, thiết bị, thang bộ, trụ cầu vượt, tàu ở đường khác
    const trainSide = (key, sLow, len, flip, d, vrel) => {      // dải ảnh nhìn ngang của một đoàn tàu, cạnh gần ở độ sâu d; sLow..sLow+len là phạm vi s; vrel (m/s) = tốc độ tương đối để làm nhoè chuyển động
      const sp = R.sprites && R.sprites[SMAP[key] || 'n700'], k = f / d, xl = X(sLow, d), xr = X(sLow + len, d); if (xr < ox0 || xl > ox1) return; const yr = Y(0, d);
      if (!sp || !sp.ready) { ctx.fillStyle = mixc([30, 36, 44], [200, 206, 214], lit); ctx.fillRect(xl, yr - 3.6 * k, xr - xl, 3.6 * k); return; }
      const m = sp.meta, u0 = clamp((ox0 - xl) / (xr - xl), 0, 1), u1 = clamp((ox1 - xl) / (xr - xl), 0, 1), sw = (u1 - u0) * m.width, sx0 = flip ? (1 - u1) * m.width : u0 * m.width, dx = xl + u0 * (xr - xl), dw = (u1 - u0) * (xr - xl), dh = m.height / m.pxPerMeter * k, dy = yr - m.railY / m.pxPerMeter * k;
      if (dw < 0.5 || sw < 0.5) return; const bl = clamp((vrel || 0) * 0.0035 * k, 0, 46), passes = bl > 3 ? [[-bl, 0.4], [0, 0.55], [bl, 0.4]] : [[0, 1]];
      for (const [off, al] of passes) { ctx.save(); ctx.globalAlpha = al; if (flip) { ctx.translate(dx + dw + off, 0); ctx.scale(-1, 1); ctx.drawImage(sp.img, sx0, 0, sw, m.height, 0, dy, dw, dh); } else ctx.drawImage(sp.img, sx0, 0, sw, m.height, dx + off, dy, dw, dh); ctx.restore(); }
      if (night > 0.3) { ctx.fillStyle = 'rgba(6,10,24,' + (0.5 * night) + ')'; ctx.fillRect(dx, dy, dw, dh); }
      const WL = window.WinLit, wlv = WL ? WL.level(night, tunAt(sCam), wx) : 0, wl = wlv > 0.06 ? WL.get(sp) : null;      // ô cửa sổ tàu sáng đèn khi tối / trong hầm / mưa tuyết dày
      if (wl) { const q = dw / sw; ctx.save(); if (bl > 3) ctx.globalAlpha = 0.75; WL.overlap(wl, sx0, sx0 + sw, (wa, wb, ya, yb, id) => { const a0 = Math.max(wa, sx0), b0 = Math.min(wb, sx0 + sw); ctx.fillStyle = WL.fill(id, wlv); ctx.fillRect(flip ? dx + dw - (b0 - sx0) * q : dx + (a0 - sx0) * q, dy + ya / m.height * dh, (b0 - a0) * q + 0.5, (yb - ya) / m.height * dh); }); ctx.restore(); } };
    const person = (x, yf, k, sd, o) => {      // người nhìn ngang: tóc/mũ, đầu, thân, tay, chân bước, vali/ba lô/ô; o = { walk, kid, staff, umb }
      o = o || {}; const kid = o.kid, hh = (kid ? 1.12 : 1.55 + 0.25 * hs(sd, 7)) * k, w = (kid ? 0.34 : 0.48) * k, sw = o.walk ? Math.sin(now / 150 + sd) * 0.14 * k : 0, a = 0.4 + 0.6 * Math.max(0.35, lit), ga = ctx.globalAlpha;
      const col = o.staff ? '#24406a' : CLOTH[Math.floor(hs(sd, 3) * CLOTH.length)], skin = SKIN[Math.floor(hs(sd, 5) * SKIN.length)], hair = HAIR[Math.floor(hs(sd, 9) * HAIR.length)], pant = o.staff ? '#1c2230' : mixc([10, 12, 18], [70, 74, 86], hs(sd, 15) * 0.8 + 0.1);
      ctx.globalAlpha = ga * a; ctx.fillStyle = pant; ctx.fillRect(x - w * 0.34 + sw, yf - hh * 0.5, w * 0.3, hh * 0.5); ctx.fillRect(x + w * 0.04 - sw, yf - hh * 0.5, w * 0.3, hh * 0.5);      // chân
      ctx.fillStyle = '#16181c'; ctx.fillRect(x - w * 0.38 + sw, yf - hh * 0.04, w * 0.42, hh * 0.04); ctx.fillRect(x + w * 0.0 - sw, yf - hh * 0.04, w * 0.42, hh * 0.04);      // giày
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2, yf - hh * 0.84, w, hh * 0.38, w * 0.2); ctx.fill();      // thân
      ctx.fillRect(x - w * 0.62 + sw * 0.6, yf - hh * 0.82, w * 0.13, hh * 0.3); ctx.fillRect(x + w * 0.49 - sw * 0.6, yf - hh * 0.82, w * 0.13, hh * 0.3);      // tay
      ctx.fillStyle = skin; ctx.fillRect(x - w * 0.06, yf - hh * 0.9, w * 0.12, hh * 0.07); ctx.beginPath(); ctx.arc(x, yf - hh * 0.95, hh * 0.075, 0, 7); ctx.fill();      // cổ và đầu
      ctx.fillStyle = o.staff ? '#24406a' : hair; ctx.beginPath(); ctx.arc(x, yf - hh * 0.97, hh * 0.08, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); if (o.staff) ctx.fillRect(x - hh * 0.09, yf - hh * 0.99, hh * 0.18, hh * 0.025);      // tóc / mũ nhân viên
      if (!kid && hs(sd, 11) < 0.4) { ctx.fillStyle = mixc([20, 20, 24], [96, 88, 80], lit); ctx.fillRect(x + w * 0.5, yf - hh * 0.34, w * 0.5, hh * 0.3); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + w * 0.5, yf - hh * 0.36, w * 0.5, hh * 0.02); }      // vali
      else if (!kid && hs(sd, 12) < 0.25) { ctx.fillStyle = mixc([20, 30, 40], [70, 100, 130], lit); ctx.fillRect(x - w * 0.62, yf - hh * 0.78, w * 0.22, hh * 0.3); }      // ba lô
      if (o.umb) { ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, 0.03 * k); ctx.beginPath(); ctx.moveTo(x + w * 0.4, yf - hh * 0.6); ctx.lineTo(x + w * 0.4, yf - hh * 1.2); ctx.stroke(); ctx.fillStyle = hs(sd, 13) < 0.5 ? '#2a3c5e' : '#6a2a2a'; ctx.beginPath(); ctx.arc(x + w * 0.4, yf - hh * 1.2, hh * 0.32, Math.PI, 0); ctx.fill(); }
      ctx.globalAlpha = ga; };
    for (const q of sts) {
      const st = q.st, gs = q.gs, sa = gs - 420, sb = gs + 20, isNow = T.phase === 'dwell' && T.k === q.i, openDoors = isNow && T.door === 'open', dwellT = isNow ? T.dwellT : 0;
      if (sb < sAt(ox0, 3) - 30 || sa > sAt(ox1, 3) + 30) continue;
      // tàu đỗ ở đường khác (kể cả tàu đứng ở sân ga bên kia)
      for (const sb2 of W.stabled || []) { if (sb2.i !== q.i) continue; const veh = S.VEH[sb2.key]; if (!veh) continue; const e = out(sb2.track.x); if (e < 2.5) continue; const dd = dep(e - 1.45); items.push({ d: dd, fn: () => { if (veh.parts) { let off = 0; for (const pk of veh.parts) { const pv = S.VEH[pk]; trainSide(pk, sb2.front - veh.len + off, pv.len, sb2.face !== 1, dd, 0); off += pv.len + (veh.gap || 2.5); } } else trainSide(sb2.key, sb2.front - veh.len, veh.len, sb2.face !== 1, dd, 0); } }); }
      // tường rào quanh ga (như cabview): tường bê tông đoạn 12 m so le hai tông; ở cổ ga cao 1,9 m sát hành lang đường, trong phạm vi sân ga cao 4,4 m kèm tấm chắn kính trong suốt cao thêm 2,2 m, lùi ra mép ngoài cùng của ga + 1,4 m (chuyển êm trong 150 m ở hai đầu)
      { const FA = 1150, FB = 630, zS = gs - FA + 100, zE = gs + FB - 150, wf = s => smooth(zS, zS + 150, s) * (1 - smooth(zE - 150, zE, s)), txs = st.tracks.filter(t => !t.main).map(t => t.x), exX = side > 0 ? Math.max(st.extent[1] + 1.4, ...txs.map(x => x + 4.1)) : Math.min(st.extent[0] - 1.4, ...txs.map(x => x - 4.1)), exOut = out(exX), baseE = out(side > 0 ? 2.9 : -ADJ - 2.9), eW = s => lerp(baseE, exOut, wf(s));
        if (sCam > gs - FA - 40 && sCam < gs + FB + 40 && Math.max(baseE, exOut) > 0.8) items.push({ d: dep(Math.max(baseE, exOut)) + 0.4, fn: () => { const concrete = mixc([22, 26, 30], [170, 174, 174], lit), concrete2 = mixc([18, 22, 26], [150, 154, 156], lit), cap = mixc([30, 34, 40], [206, 210, 210], lit), a0 = Math.floor((sCam - 45) / 4) * 4;
          for (let a = a0; a < sCam + 45; a += 4) { const b = a + 4; if (b < gs - FA || a > gs + FB) continue; const ea = eW(a), eb = eW(b), da = dep(Math.max(ea, 1.4)), db = dep(Math.max(eb, 1.4)), inSt = b > gs - 445 && a < gs + 45, h = inSt ? 4.4 : 1.9, xa = X(a, da), xb = X(b, db); if (Math.max(xa, xb) < ox0 - 20 || Math.min(xa, xb) > ox1 + 20) continue;
            ctx.fillStyle = Math.floor(a / 12) % 2 ? concrete : concrete2; ctx.beginPath(); ctx.moveTo(xa, Y(0, da)); ctx.lineTo(xb, Y(0, db)); ctx.lineTo(xb, Y(h, db)); ctx.lineTo(xa, Y(h, da)); ctx.closePath(); ctx.fill();
            ctx.fillStyle = cap; ctx.beginPath(); ctx.moveTo(xa, Y(h, da)); ctx.lineTo(xb, Y(h, db)); ctx.lineTo(xb, Y(h, db) - Math.max(2, 0.3 * f / db)); ctx.lineTo(xa, Y(h, da) - Math.max(2, 0.3 * f / da)); ctx.closePath(); ctx.fill();
            if (inSt) { ctx.fillStyle = day > 0.4 ? 'rgba(150,205,235,.16)' : 'rgba(60,90,120,.18)'; ctx.beginPath(); ctx.moveTo(xa, Y(h, da)); ctx.lineTo(xb, Y(h, db)); ctx.lineTo(xb, Y(h + 2.2, db)); ctx.lineTo(xa, Y(h + 2.2, da)); ctx.closePath(); ctx.fill(); if (Math.floor((a + 3.9) / 12) !== Math.floor((a - 0.1) / 12)) { ctx.strokeStyle = 'rgba(70,80,92,.7)'; ctx.lineWidth = Math.max(1, 0.18 * f / da); ctx.beginPath(); ctx.moveTo(xa, Y(0, da)); ctx.lineTo(xa, Y(h + 2.2, da)); ctx.stroke(); } } } } }); }
      // sân ga phía cửa sổ
      for (const p of st.plats) { const eN = out(p.xa), eF = out(p.xb), eA = Math.min(eN, eF), eB = Math.max(eN, eF); if (eB < 0.5) continue; const e0 = Math.max(eA, 1.45), sA0 = Math.max(sa, sAt(ox0, 3) - 40), sB0 = Math.min(sb, sAt(ox1, 3) + 40), d0 = dep(e0 + 0.05), d1 = dep(eB), ours = q.stopHere && st.plat === p;
        items.push({ d: d1, fn: () => { // mặt sân ga (nhìn chếch từ trên), vạch vàng ở mép, mạch gạch
          const yN = Y(PH, d0), yF = Y(PH, d1), xa = Math.max(ox0, X(sa, d0)), xb = Math.min(ox1, X(sb, d0)); if (xb <= xa) return;
          ctx.fillStyle = mixc([30, 32, 36], [152, 156, 160], lit); ctx.fillRect(xa, Math.max(yF, oy0), xb - xa, Math.max(0, yN - Math.max(yF, oy0)) + 2);
          ctx.fillStyle = mixc([34, 34, 28], [210, 186, 70], lit); ctx.fillRect(xa, Y(PH, d0) - 1, xb - xa, 3); { const g2 = ctx.createLinearGradient(0, Math.max(yF, oy0), 0, oy1); g2.addColorStop(0, 'rgba(255,255,255,.14)'); g2.addColorStop(1, 'rgba(0,0,0,.14)'); ctx.fillStyle = g2; ctx.fillRect(xa, Math.max(yF, oy0), xb - xa, oy1 - Math.max(yF, oy0)); }
          for (let s = Math.ceil(sA0 / 3) * 3; s < sB0; s += 3) { const x0 = X(s, d0), x1 = X(s, d1); ctx.strokeStyle = 'rgba(60,64,70,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yN); ctx.lineTo(x1, yF); ctx.stroke(); } } });
        // cửa chắn sân ga nửa chiều cao ở mép sân ga kề đường: trụ cách 2,5 m, tấm kính mờ xanh; ở sân ga của ta có khoảng hở đúng vị trí cửa toa, mở ra khi cửa tàu mở
        items.push({ d: dep(eA) - 0.01, fn: () => { const dd = dep(eA), k = f / dd, sA1 = Math.max(sa, sAt(ox0 - 40, dd)), sB1 = Math.min(sb, sAt(ox1 + 40, dd)); if (sB1 <= sA1) return; const yB = Y(PH, dd), yT = Y(PH + 1.3, dd), postW = Math.max(3, 0.1 * k), gapAt = s => { if (!ours) return false; const r = (((gs - s) % 25) + 25) % 25; return Math.abs(r - 3.5) < 1.0 || Math.abs(r - 21.5) < 1.0; };
          for (let s = Math.ceil(sA1 / 0.5) * 0.5; s < sB1; s += 0.5) { const gp = gapAt(s); if (gp && openDoors) continue; const x = X(s, dd), wd = 0.5 * k + 1; ctx.fillStyle = gp ? 'rgba(235,240,245,.22)' : 'rgba(150,200,230,.10)'; ctx.fillRect(x, yT, wd, yB - yT); }
          for (let s = Math.ceil(sA1 / 2.5) * 2.5; s < sB1; s += 2.5) { const x = X(s, dd); ctx.fillStyle = mixc([22, 26, 30], [190, 196, 202], lit); ctx.fillRect(x - postW / 2, yT, postW, yB - yT); }
          if (ours) for (let c = 0; c < 17; c++) for (const off of [3.5, 21.5]) { const sd = gs - (c * 25 + 25 - off), x = X(sd, dd); if (x < ox0 - 80 || x > ox1 + 80) continue; ctx.fillStyle = mixc([24, 40, 80], [60, 120, 210], lit); ctx.fillRect(x - 1.0 * k, yT, 0.07 * k + 2, yB - yT); ctx.fillRect(x + 1.0 * k - 0.07 * k - 2, yT, 0.07 * k + 2, yB - yT); } } });
        // mái ga ở sân xa: gờ mái và dầm (thấy được ở mép trên cửa sổ khi sân ga cách xa)
        if (eB - eA > 3) items.push({ d: dep(eB), fn: () => { const dd = dep(eB), x0 = Math.max(ox0, X(sa, dd)), x1 = Math.min(ox1, X(sb, dd)); if (x1 <= x0) return; ctx.fillStyle = mixc([34, 36, 40], [172, 174, 176], lit); ctx.fillRect(x0, Y(5.2, dd), x1 - x0, Math.max(3, 0.5 * f / dd)); ctx.fillStyle = mixc([24, 26, 30], [120, 122, 124], lit); ctx.fillRect(x0, Y(4.7, dd), x1 - x0, Math.max(2, 0.08 * f / dd)); } });
        const eMid = (eA + eB) / 2, dPil = dep(eMid), dP2 = dep(e0 + 1.2);
        // cột đỡ mái ga + đèn (mỗi 20 m); đêm có quầng sáng
        items.push({ d: dPil, fn: () => { for (let s = Math.ceil(Math.max(sa, sAt(ox0 - 80, dPil)) / 20) * 20; s < Math.min(sb, sAt(ox1 + 80, dPil)); s += 20) { const x = X(s, dPil), w = Math.max(4, 0.45 * f / dPil), yb = Y(PH, dPil), yt = Y(5.6, dPil);
          ctx.fillStyle = mixc([28, 30, 34], [168, 172, 176], lit); ctx.fillRect(x - w / 2, yt, w, yb - yt); if (night > 0.3) { const g = ctx.createRadialGradient(x, Y(4.8, dPil), 0, x, Y(4.8, dPil), 60); g.addColorStop(0, 'rgba(255,236,170,.55)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - 60, Y(4.8, dPil) - 60, 120, 120); } } } });
        // người trên sân ga: đông hơn quanh cửa toa khi đang dừng; người đi bộ tới cửa rồi lên tàu, trẻ em, nhân viên, người cầm ô khi mưa
        items.push({ d: dP2, fn: () => { const sA1 = Math.max(sa, sAt(ox0 - 60, dP2)), sB1 = Math.min(sb, sAt(ox1 + 60, dP2));
          for (let s = Math.ceil(sA1 / 1.2) * 1.2; s < sB1; s += 1.2) { const id = Math.round(s / 1.2) + q.i * 977; let near = 0, doorS = 0; if (ours) { const b = gs - s, r = ((b % 25) + 25) % 25, dr = Math.abs(r - 3.5) < Math.abs(r - 21.5) ? 3.5 : 21.5; near = Math.exp(-Math.abs(r - dr) / 2.5); doorS = s + (r - dr); }
            const ph0 = hs(id, 1); if (ph0 > (0.14 + 0.6 * near) * (ours ? 1 : 0.6)) continue; let sx = s + hs(id, 4) * 1.4, walking = false, alpha = 1;
            if (ours && openDoors && ph0 < 0.2) { const dir = doorS - sx, step = clamp(dir, -dwellT * 1.1, dwellT * 1.1); if (Math.abs(dir) > 0.3) { sx += step; walking = Math.abs(step) < Math.abs(dir) - 0.05; } else alpha = smooth(0, 1, 1 - Math.min(1, (dwellT - Math.abs(dir) / 1.1 - 2) / 3)); if (alpha < 0.05) continue; }
            const kid = hs(id, 21) < 0.1, staff = !kid && hs(id, 23) < 0.04, dpp = dP2 + 0.2 + hs(id, 2) * 2.2, kk = f / dpp, xx = X(sx, dpp), yf = Y(PH, dpp); if (xx < ox0 - 80 || xx > ox1 + 80) continue; ctx.globalAlpha = alpha; person(xx, yf, kk, id, { walk: walking, kid, staff, umb: rain && !staff && hs(id, 27) < 0.6 }); ctx.globalAlpha = 1; } } });
        // ghế băng, máy bán hàng, thùng rác, đồng hồ ga ở giữa sân ga
        items.push({ d: dep(eMid + 0.2), fn: () => { const dd = dep(eMid + 0.2), k = f / dd; for (let s = Math.ceil(Math.max(sa, sAt(ox0 - 80, dd)) / 40) * 40; s < Math.min(sb, sAt(ox1 + 80, dd)); s += 40) { const id = Math.round(s / 40) + q.i * 31, kind = hs(id, 6), x = X(s, dd), yb = Y(PH, dd);
          if (kind < 0.4) { ctx.fillStyle = mixc([20, 24, 30], [90, 100, 112], lit); ctx.fillRect(x - 0.9 * k, yb - 0.45 * k, 1.8 * k, 0.1 * k); ctx.fillRect(x - 0.9 * k, yb - 0.9 * k, 1.8 * k, 0.08 * k); ctx.fillRect(x - 0.85 * k, yb - 0.45 * k, 0.07 * k, 0.45 * k); ctx.fillRect(x + 0.78 * k, yb - 0.45 * k, 0.07 * k, 0.45 * k); }
          else if (kind < 0.65) { const c = kind < 0.52 ? [196, 40, 40] : [40, 90, 190]; ctx.fillStyle = mixc([c[0] * 0.2, c[1] * 0.2, c[2] * 0.2], c, lit); ctx.fillRect(x - 0.45 * k, yb - 1.9 * k, 0.9 * k, 1.9 * k); ctx.fillStyle = mixc([40, 44, 50], [230, 236, 240], 0.3 + 0.7 * night); ctx.fillRect(x - 0.35 * k, yb - 1.55 * k, 0.7 * k, 0.8 * k); }
          else if (kind < 0.8) { ctx.fillStyle = mixc([24, 30, 26], [70, 100, 80], lit); ctx.fillRect(x - 0.25 * k, yb - 0.85 * k, 0.5 * k, 0.85 * k); ctx.fillStyle = mixc([20, 24, 22], [50, 70, 58], lit); ctx.fillRect(x - 0.29 * k, yb - 0.92 * k, 0.58 * k, 0.09 * k); }
          else { const yc = Y(3.0, dd), r = 0.32 * k; ctx.fillStyle = mixc([10, 12, 16], [236, 238, 240], 0.6 + 0.4 * day); ctx.beginPath(); ctx.arc(x, yc, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#1b1f24'; ctx.lineWidth = Math.max(1, 0.03 * k); ctx.beginPath(); ctx.moveTo(x, yc); ctx.lineTo(x, yc - r * 0.7); ctx.moveTo(x, yc); ctx.lineTo(x + r * 0.5, yc + r * 0.2); ctx.stroke(); } } } });
        // thang bộ có mái từ cầu vượt xuống sân ga + trụ cầu (vị trí như cabview: 1/6, 1/2, 5/6 hoặc 1/4, 3/4 hoặc 1/2 chiều dài sân ga)
        { const nb0 = LAY.bridgeCountOf(L.stations[q.i].lay || '2-2-0'), nb = nb0 && !tunAt(gs) ? nb0 : 0, fr = nb === 3 ? [1 / 6, 1 / 2, 5 / 6] : nb === 2 ? [0.25, 0.75] : nb === 1 ? [0.5] : [];
          const eC = out((p.xa + p.xb) / 2), BY = 9.4, BH = 2.4, Ls = (BY - PH) / 0.55;
          for (const fq of fr) { const sb0 = gs - 420 + 440 * fq, dS = dep(Math.max(0.6, eC - 1.15)), dPl = dep(Math.max(0.6, eC - 1.9));
            items.push({ d: dPl, fn: () => { const kk = f / dPl, x = X(sb0, dPl), w = Math.max(5, 0.6 * kk); ctx.fillStyle = mixc([26, 28, 32], [150, 152, 148], lit); ctx.fillRect(x - w / 2, Y(BY, dPl), w, Y(PH, dPl) - Y(BY, dPl)); } });
            items.push({ d: dS, fn: () => { const xa = X(sb0 + 1.6, dS), xb = X(sb0 + 1.6 + Ls, dS); if (Math.max(xa, xb) < ox0 || Math.min(xa, xb) > ox1) return; ctx.fillStyle = mixc([30, 34, 40], [178, 176, 160], lit); ctx.beginPath(); ctx.moveTo(xa, Y(BY, dS)); ctx.lineTo(xb, Y(PH, dS)); ctx.lineTo(xb, Y(PH + BH, dS)); ctx.lineTo(xa, Y(BY + BH, dS)); ctx.closePath(); ctx.fill();
              ctx.fillStyle = mixc([12, 20, 32], [92, 124, 156], lit); ctx.beginPath(); ctx.moveTo(xa, Y(BY + 0.9, dS)); ctx.lineTo(xb, Y(PH + 0.9, dS)); ctx.lineTo(xb, Y(PH + 1.8, dS)); ctx.lineTo(xa, Y(BY + 1.8, dS)); ctx.closePath(); ctx.fill(); ctx.fillStyle = mixc([6, 8, 12], [30, 32, 38], lit); ctx.fillRect(Math.min(xb, xb - 4), Y(PH + BH, dS), 4, Y(PH, dS) - Y(PH + BH, dS)); } }); } }
        // biển hiệu tên ga treo ở cột (có chữ, vẽ lật lại khi nhìn cửa phải)
        if (q.m.name) items.push({ d: dPil, fn: () => { const s = gs - 60, x = X(s, dPil); if (x < ox0 - 200 || x > ox1 + 200) return; const bw = 1.7 * f / dPil, bh = 0.5 * f / dPil, y = Y(3.4, dPil); ctx.fillStyle = mixc([8, 36, 20], [28, 120, 66], lit); ctx.fillRect(x - bw / 2, y, bw, bh); txt(q.m.name, x, y + bh * 0.68, '#f2f6f2', 'bold ' + Math.max(8, bh * 0.52) + 'px system-ui'); } });
      }
      // đường ga và đường ngược chiều ở xa hơn: hai ray và đá dăm
      for (const t of st.tracks) { const e = out(t.x); if (e < 2.5) continue; items.push({ d: dep(e), fn: () => { const dd = dep(e), x0 = Math.max(ox0, X(sa - 400, dd)), x1 = Math.min(ox1, X(sb + 400, dd)); if (x1 <= x0) return;
        ctx.fillStyle = mixc([20, 22, 24], [96, 98, 100], lit); ctx.fillRect(x0, Y(0.28, dd), x1 - x0, Math.max(2, 0.28 * f / dd)); ctx.fillStyle = mixc([30, 32, 36], [160, 164, 168], lit); ctx.fillRect(x0, Y(0.2, dd), x1 - x0, Math.max(1, 0.05 * f / dd)); } }); }
    }
    // đường nhánh / đường chính tuyến cha ở gần ngã rẽ (độ lệch ngang theo S.trunkOff): ray và nền ray ở phía cửa sổ, kèm cột điện
    for (let jn = 0; jn < (L.meta.junctions || []).length; jn++) { const jc = L.meta.junctions[jn]; const sj = S.sOfKm(jc.km, W.dir, L.kmEnd); if (Math.abs(sj - sCam) > 3300) continue;
      items.push({ d: 9, fn: () => { for (let x = ox0 - 6; x < ox1 + 6; x += 12) { const s = sAt(x + 6, 12), off = S.trunkOff(W, s, jn), eo = side > 0 ? off : -off; if (Math.abs(off) < 2.2 || eo < 2.2) continue; const dd = dep(eo);
        ctx.fillStyle = mixc([20, 22, 24], [96, 98, 100], lit); ctx.fillRect(x, Y(0.3, dd), 12.6, Math.max(2, 0.3 * f / dd)); ctx.fillStyle = mixc([30, 32, 36], [160, 164, 168], lit); ctx.fillRect(x, Y(0.2, dd), 12.6, Math.max(1, 0.05 * f / dd)); if (Math.floor(s / 50) !== Math.floor((s - 12) / 50)) { const xm = X(Math.floor(s / 50) * 50, dd), kk = f / dd; ctx.fillStyle = mixc([30, 32, 36], [150, 156, 160], lit); ctx.fillRect(xm - 0.1 * kk, Y(7.5, dd), 0.2 * kk, Y(0, dd) - Y(7.5, dd)); } } } }); }
    // tàu trên đường nhánh / đường khác: tàu nhánh vừa tách, phần đoàn đã tách ở lại, tàu chạy trước ở đường khác
    for (const pk of W.parked || []) { if (pk.jn === undefined) continue; const pv = S.VEH[pk.key], off = S.trunkOff(W, pk.front - pv.len, pk.jn), eo = side > 0 ? off : -off; if (eo < 2.2 || Math.abs(pk.front - pv.len / 2 - sCam) > 500) continue; const dd = dep(eo - 1.45); items.push({ d: dd, fn: () => trainSide(pk.key, pk.front - pv.len, pv.len, false, dd, pk.mv ? pk.mv.v : 0) }); }
    { const Ld = W.lead; if (Ld && Ld.phase !== 'end' && Ld.fj !== undefined && Math.abs(Ld.x - Ld.veh.len / 2 - sCam) < 500) { const off = S.trunkOff(W, Ld.x - Ld.veh.len, Ld.fj), eo = side > 0 ? off : -off; if (eo > 2.2) { const dd = dep(eo - 1.45); items.push({ d: dd, fn: () => trainSide(Ld.veh.key, Ld.x - Ld.veh.len, Ld.veh.len, false, dd, Ld.v) }); } } }
    // tàu ngược chiều lướt qua (bên phải đường ta khi nhìn cửa phải), tàu vượt trên đường thông qua khi ta đỗ ở ga tránh
    if ((v > 20 || W.oppCat) && !S.oppHidden(W, T) && side < 0) for (const t0 of W.opposing || []) { const key = S.oppKey(W, T, t0), veh = S.VEH[key] || S.VEH.N700, sn = T.x + (t0 - W.t) * 200, dd = dep(ADJ - 1.45);
      if (sn > sCam + 220 || sn + veh.len < sCam - 220) continue; items.push({ d: dd, fn: () => { const vr = v + 200; if (veh.parts) { let off = 0; for (const pk of veh.parts) { const pv = S.VEH[pk]; trainSide(pk, sn + off, pv.len, true, dd, vr); off += pv.len + (veh.gap || 2.5); } } else trainSide(key, sn, veh.len, true, dd, vr); const u = 1 - Math.abs(sn + veh.len / 2 - sCam) / 140; if (u > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.08 * u + ')'; ctx.fillRect(ox0, oy0, ow, oh); } } }); }
    const pl = T.phase === 'dwell' ? S.passersAt(W, T.k) : null;
    if (pl) for (const p of pl) { const u = (W.t - (p.t - 4.5)) / 9; if (u <= 0 || u >= 1) continue; const key = p.v || L.meta.defVeh, veh = S.VEH[key] || S.VEH.N700, q = sts.find(z => z.i === T.k), thr = q && q.st.tracks.find(t => t.thr && t.own), eo = thr ? out(thr.x) : (side < 0 ? ADJ : -ADJ);
      if (eo <= 0) continue; const sFront = T.x + (-veh.len + u * (veh.len + 520)), dd = dep(eo - 1.45); items.push({ d: dd, fn: () => trainSide(key, sFront - veh.len, veh.len, false, dd, 70) }); }

    // ---- hầm: tường bê tông sát cửa sổ che mọi thứ phía sau; mạch nối vỏ hầm mỗi 10 m; đèn trần chỉ ở hầm đô thị và quanh ga ngầm
    items.push({ d: 2.3, fn: () => { const dd = 2.3; let any = false;
      for (let x = ox0 - 6; x < ox1 + 6; x += 6) { const s = sAt(x + 3, dd); if (!tunAt(s)) continue; any = true; const urbanLamp = biomeAt(s) === 'urban' || sts.some(q => Math.abs(s - q.gs) < 600);
        ctx.fillStyle = mixc([14, 16, 20], [46, 50, 56], 0.2 + 0.5 * (urbanLamp ? 1 : 0.0)); ctx.fillRect(x, oy0 - 4, 6.6, oh + 8);
        const gl = 0.12 + 0.55 * Math.exp(-Math.abs(x - cx) / (ow * 0.5)); ctx.fillStyle = 'rgba(200,205,215,' + gl * (0.25 + 0.45 * (0.35 + 0.65 * night) * 0.4) + ')'; ctx.fillRect(x, oy0 - 4, 6.6, oh + 8);
        if (Math.floor((s + 5) / 10) !== Math.floor((s - 1) / 10)) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, oy0 - 4, 2.2, oh + 8); }
        if (urbanLamp && Math.floor((s + 9) / 18) !== Math.floor((s - 9) / 18)) { ctx.save(); ctx.translate(x, hy - 80); ctx.scale(2.2, 1); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 70); g.addColorStop(0, 'rgba(255,236,170,.75)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(-70, -70, 140, 140); ctx.restore(); ctx.fillStyle = 'rgba(255,246,210,.95)'; ctx.fillRect(x - 9, hy - 82, 18, 4); } }
      if (any) { ctx.fillStyle = 'rgba(70,76,84,.55)'; ctx.fillRect(ox0, Y(EYE + 0.8, dd), ow, Math.max(2, 0.05 * f / dd)); ctx.fillRect(ox0, Y(EYE - 0.9, dd), ow, Math.max(2, 0.05 * f / dd)); } } });

    items.sort((a, b) => b.d - a.d); if (window.__wvProf) { for (const it of items) { window.__wvKey = 'd' + it.d; const t0 = performance.now(); it.fn(); const k = 'd' + it.d; window.__wvProf[k] = (window.__wvProf[k] || 0) + performance.now() - t0; } } else for (const it of items) it.fn();

    // ---- thời tiết trên kính: mưa (vệt xiên về phía sau tàu, hạt nước bám kính), tuyết lướt qua, chớp, động đất
    if (rain) { const sl = Math.min(90, v * 0.55 + 6), nR = 90; ctx.strokeStyle = 'rgba(190,210,235,' + (0.2 + 0.2 * day) + ')'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < nR; i++) { const tt = (now / 14 + i * 53) % 1000, x0 = ox0 + ((i * 97 + tt * 0.9) % ow), y0 = oy0 + ((i * 131 + tt * 2.6) % oh); ctx.moveTo(x0, y0); ctx.lineTo(x0 - sl * 0.6, y0 + 10 + sl * 0.12); } ctx.stroke();
      for (let i = 0; i < 38; i++) { const x = ox0 + hs(i, 41) * ow, y0 = oy0 + hs(i, 43) * oh, slide = ((now / 1700 + hs(i, 47)) % 1) * 26 * (v > 5 ? 1.4 : 0.3), y = y0 + slide; ctx.fillStyle = 'rgba(210,225,240,.42)'; ctx.beginPath(); ctx.ellipse(x - slide * 0.2, y, 2.2 + hs(i, 53) * 2, 3 + hs(i, 59) * 3, -0.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - slide * 0.2 - 1, y - 2, 1.2, 1.4); } }
    if (inSnow && !tunAt(sCam)) { ctx.fillStyle = 'rgba(245,250,255,.85)'; ctx.beginPath(); const sp = 1.2 + Math.min(14, v / 7), tt = now / 25; for (let i = 0; i < 130; i++) { const x = ox0 + ((hs(i, 61) * ow - tt * (sp * (0.6 + hs(i, 67))) * 1.4) % ow + ow) % ow, y = oy0 + ((hs(i, 71) * oh + tt * (1.4 + hs(i, 73))) % oh), r = 0.8 + hs(i, 79) * 2.2; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7); } ctx.fill(); }
    if (R.aud && R.aud.lastThunder) { const dt = now - R.aud.lastThunder, fl = (dt < 90 ? 1 : 0) + (dt > 220 && dt < 300 ? 0.7 : 0); if (fl > 0) { ctx.fillStyle = 'rgba(235,240,255,' + 0.5 * fl + ')'; ctx.fillRect(ox0, oy0, ow, oh); } }
    if (W.eqkActive && sh > 0.5) { ctx.fillStyle = 'rgba(120,100,80,' + Math.min(0.25, sh * 0.05) + ')'; ctx.fillRect(ox0, oy0, ow, oh); ctx.fillStyle = 'rgba(210,190,160,.5)'; for (let i = 0; i < 40; i++) ctx.fillRect(ox0 + hs(i, 83) * ow, oy0 + ((now / 30 + i * 37) % oh), 1.4, 1.4); }
    // phản chiếu nội thất lên kính: đèn trần và lưng ghế, rõ khi bên ngoài tối (đêm, hầm); nhấp nháy khi động đất
    { const dark = clamp(night * 0.8 + (tunAt(sCam) ? 0.6 : 0), 0, 1) * (0.55 + 0.45 * (W.eqkActive ? Math.random() : 1)); if (dark > 0.05) { const g = ctx.createLinearGradient(0, oy0, 0, oy1); g.addColorStop(0, 'rgba(255,244,214,' + 0.22 * dark + ')'); g.addColorStop(0.18, 'rgba(255,244,214,' + 0.06 * dark + ')'); g.addColorStop(1, 'rgba(20,24,34,' + 0.2 * dark + ')'); ctx.fillStyle = g; ctx.fillRect(ox0, oy0, ow, oh);
      ctx.fillStyle = 'rgba(30,40,70,' + 0.35 * dark + ')'; ctx.beginPath(); ctx.roundRect(ox0 + ow * 0.02, oy1 - oh * 0.30, ow * 0.10, oh * 0.4, 18); ctx.fill(); ctx.beginPath(); ctx.roundRect(ox1 - ow * 0.12, oy1 - oh * 0.26, ow * 0.10, oh * 0.4, 18); ctx.fill(); }
      const gg = ctx.createLinearGradient(ox0, oy0, ox1, oy1); gg.addColorStop(0, 'rgba(255,255,255,0.10)'); gg.addColorStop(0.35, 'rgba(255,255,255,0)'); gg.addColorStop(0.7, 'rgba(255,255,255,0.05)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gg; ctx.fillRect(ox0, oy0, ow, oh); }
    ctx.restore();

    // ---- khung: viền nhôm quanh từng ô, trụ vách giữa các ô, gờ dưới (bàn nhỏ), rèm kéo một phần
    ctx.save(); const fr = Math.max(8, Math.min(18, winW * 0.03));
    for (const [x, y, w, h] of winRects) { const g = ctx.createLinearGradient(0, y - fr, 0, y + h + fr); g.addColorStop(0, mixc([70, 72, 76], [200, 202, 206], 0.55 + 0.2 * day)); g.addColorStop(1, mixc([48, 50, 54], [150, 152, 158], 0.5 + 0.2 * day)); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - fr, y - fr, w + 2 * fr, h + 2 * fr, rad + fr); ctx.roundRect(x, y, w, h, rad); ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.stroke();
      const bl = hs(Math.floor(T.x / 5000), 3 + Math.round(x)) < 0.5 ? 0 : 0.13 + 0.10 * hs(Math.floor(T.x / 5000), 5); if (bl > 0) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.clip(); const gb2 = ctx.createLinearGradient(0, y, 0, y + h * bl); gb2.addColorStop(0, mixc([40, 42, 46], [226, 222, 210], 0.55 + 0.3 * day)); gb2.addColorStop(1, mixc([32, 34, 38], [200, 196, 184], 0.55 + 0.3 * day)); ctx.fillStyle = gb2; ctx.fillRect(x, y, w, h * bl); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + h * bl - 2, w, 3); ctx.restore(); } }
    for (let i = 0; i + 1 < nWin; i++) { const xa = winRects[i][0] + winW + fr, xb = winRects[i + 1][0] - fr; if (xb > xa) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(xa, oy0 - fr, xb - xa, oh + 2 * fr); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(xa, oy0 - fr, 2, oh + 2 * fr); ctx.fillRect(xb - 2, oy0 - fr, 2, oh + 2 * fr); } }
    { const sy0 = oy1 + fr, sh0 = py + ph - sy0; if (sh0 > 4) { const g = ctx.createLinearGradient(0, sy0, 0, py + ph); g.addColorStop(0, mixc([66, 62, 58], [226, 220, 206], 0.55 + 0.25 * day)); g.addColorStop(1, mixc([30, 28, 26], [150, 144, 132], 0.5 + 0.2 * day)); ctx.fillStyle = g; ctx.fillRect(px, sy0, pw, sh0); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px, sy0, pw, 3); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px, sy0 + 3, pw, 2); } }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px + 8, py + 8, 360, 22); ctx.fillStyle = '#cfe0f0'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(side > 0 ? _t('CỬA SỔ TRÁI · toa giữa ({0}: {1} ô {2}×{3} m) · , / .', SMAP[camKey] || '?', nWin, spec.w.toFixed(2), spec.h.toFixed(2)) : _t('CỬA SỔ PHẢI · toa giữa ({0}: {1} ô {2}×{3} m) · , / .', SMAP[camKey] || '?', nWin, spec.w.toFixed(2), spec.h.toFixed(2)), px + 14, py + 24);
  }
  root.WinView = { draw, WINSPEC, nWindows };
})(typeof window !== 'undefined' ? window : globalThis);
