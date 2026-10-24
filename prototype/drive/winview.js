// Góc nhìn CỬA SỔ HÀNH KHÁCH: camera đặt ở toa giữa của cả đoàn, nhìn vuông góc ra bên TRÁI hoặc bên PHẢI hướng chạy qua một ô cửa sổ có khung.
// Cảnh vật trượt ngược chiều tàu: cửa trái thì cảnh trôi về bên trái màn hình, cửa phải thì trôi về bên phải. Mọi thứ được dựng như nhìn ra cửa TRÁI (phía trước = bên phải màn hình),
// cửa phải = lật gương cả cảnh (chữ vẽ lật lại để không bị ngược).
// Nguồn cảnh: dải tranh OSM (strips.js, dữ liệu © OpenStreetMap contributors, ODbL, chỉ dùng cá nhân); mọi chi tiết khác (cột điện, tường hầm, người trên sân ga...) vẽ bằng code [I].
// Toạ độ: s = vị trí dọc tuyến (m, theo chiều chạy); e = khoảng cách ngang TỪ TIM ĐƯỜNG TA ra phía cửa sổ (m); h = độ cao so với mặt ray; d = khoảng cách tới mắt.
(function (root) {
  const EYE = 2.35, EOFF = 0.9, PH = 1.25, ADJ = 4.3;
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hs = (a, b) => { const x = Math.sin(a * 12.9898 + (b || 0) * 78.233) * 43758.5453; return x - Math.floor(x); };
  const mixc = (c1, c2, t) => 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
  const SMAP = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5', E7: 'e7', H5: 'h5', E6: 'e6', E8: 'e8', T4: 't4', E926: 'e926', E2: 'e2', 'E5+E6': 'e5', 'E5+E8': 'e5', 'E6+E5': 'e6', 'E8+E5': 'e8', 'N700S-6': 'kamome' };
  const CLS = { f: [34, 78, 44], a: [150, 160, 84], g: [100, 150, 74], o: [104, 150, 70], h: [132, 128, 120], c: [150, 142, 146], i: [120, 122, 128], e: [104, 126, 98], p: [88, 148, 78], w: [60, 125, 176], m: [74, 122, 104], s: [88, 118, 74], r: [138, 130, 121], y: [200, 190, 140], z: [104, 104, 100] };
  const SKIN = ['#e8c4a0', '#d9a97c', '#f0d2b4', '#c99468'], CLOTH = ['#3b4a5e', '#5a3b4a', '#2f5a48', '#6a6a2f', '#4a4a6a', '#6a4a3a', '#8a8f96', '#a04a4a', '#2a2f3a', '#d8d4c8'];
  const stCache = {};

  function draw(ctx, px, py, pw, ph, W, T, R, side) {
    const S = root.Sim, LAY = root.Layout, WD = root.World, L = W.line, now = performance.now(), v = T.v;
    side = side || 1;
    // ---- môi trường (cùng công thức với cabview)
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600;
    const day = smooth(5.3, 7.3, hour) * (1 - smooth(16.8, 19.0, hour)), night = 1 - day, dusk = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.2) + Math.max(0, 1 - Math.abs(hour - 17.8) / 1.3);
    const inSnow = W.zones.some(z => z.kind === 'snow' && T.x >= z.s0 - 3000 && T.x < z.s1), rain = !!W.rainHere;
    const wx = rain ? 0.55 : inSnow ? 0.4 : 0, windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    let sh = 0; if (W.eqkAt !== undefined && W.eqkActive) sh = 5 * Math.exp(-(W.t - W.eqkAt) / 40) + 0.8; if (W.shakeAt !== undefined && W.t - W.shakeAt < 4) sh = Math.max(sh, (W.shakeAmp || 4) * Math.exp(-(W.t - W.shakeAt) / 1.2));
    const lit = day * (1 - wx * 0.4);
    const sCam = T.x - T.veh.len / 2, km = s => S.kmOfS(s, W.dir, L.kmEnd), biomeAt = s => S.biomeAt(L, km(s)), tunAt = s => S.inTunnel(W, s);
    const wdOurs = W.dir === 'up' ? -4.3 : 0, wdOn = !!(WD && WD.has(W.lineId, W.dir, L.kmEnd, T.x));

    // ---- hình học ô cửa sổ và phép chiếu (cửa trái: phía trước = bên phải màn hình)
    const ox0 = px + pw * 0.07, ox1 = px + pw * 0.93, oy0 = py + ph * 0.07, oy1 = py + ph * 0.80, ow = ox1 - ox0, oh = oy1 - oy0;
    const f = ow * 0.52, shx = sh > 0.1 ? (Math.random() - 0.5) * sh * 3 : 0, bob = Math.min(1, v / 80) * Math.sin(now / 70) * 0.9 + (sh > 0.1 ? (Math.random() - 0.5) * sh * 4 : 0);
    const cx = (ox0 + ox1) / 2 + shx, hy = oy0 + oh * 0.42 + bob;
    const X = (s, d) => cx + (s - sCam) * f / d, Y = (h, d) => hy + (EYE - h) * f / d;
    const sAt = (x, d) => sCam + (x - cx) * d / f;          // ngược lại: vị trí dọc s tại cột màn hình x ở độ sâu d
    const dep = e => Math.max(0.3, e - EOFF);

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

    // ---- tường nội thất (phần ngoài ô cửa sổ)
    const lampA = 0.35 + 0.65 * night;
    { const g = ctx.createLinearGradient(px, py, px, py + ph); g.addColorStop(0, mixc([60, 56, 52], [212, 204, 190], 0.55 + 0.25 * day)); g.addColorStop(1, mixc([40, 38, 36], [168, 160, 148], 0.5 + 0.2 * day)); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }

    // ---- vùng thấy được qua ô cửa sổ
    ctx.save(); ctx.beginPath(); ctx.roundRect(ox0, oy0, ow, oh, 22); ctx.clip();
    if (side < 0) { ctx.translate(2 * cx, 0); ctx.scale(-1, 1); }
    const txt = (t, x, y, col, font, al) => { ctx.save(); ctx.translate(x, y); if (side < 0) ctx.scale(-1, 1); ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || 'center'; ctx.fillText(t, 0, 0); ctx.restore(); };
    const top = mixc([6, 12, 24], [92, 160, 224], day), hor = mixc([14, 24, 42], [183, 214, 240], day);
    // bầu trời
    { const g = ctx.createLinearGradient(0, oy0, 0, hy + 4); g.addColorStop(0, mixc([6, 12, 24], [70, 78, 90], wx) === top ? top : mixc([6, 12, 24], [92, 160, 224], day * (1 - wx * 0.6))); g.addColorStop(1, mixc([14, 24, 42], [183, 214, 240], day * (1 - wx * 0.5))); ctx.fillStyle = wx > 0 ? mixc([40, 46, 56], [130, 140, 152], day) : g; ctx.fillRect(ox0 - 80, oy0 - 80, ow + 160, hy - oy0 + 84);
      if (wx > 0) { const g2 = ctx.createLinearGradient(0, oy0, 0, hy + 4); g2.addColorStop(0, mixc([30, 34, 42], [110, 118, 130], day)); g2.addColorStop(1, mixc([60, 66, 76], [176, 184, 194], day)); ctx.fillStyle = g2; ctx.fillRect(ox0 - 80, oy0 - 80, ow + 160, hy - oy0 + 84); }
      if (dusk > 0.05 && wx < 0.3) { ctx.fillStyle = 'rgba(255,140,60,' + Math.min(0.35, dusk * 0.3) + ')'; ctx.fillRect(ox0 - 80, hy - 70, ow + 160, 74); }
      if (night > 0.4 && wx < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + 0.7 * (night - 0.4) + ')'; for (let i = 0; i < 46; i++) ctx.fillRect(ox0 + hs(i * 17) * ow, oy0 + hs(i * 31, 7) * (hy - oy0 - 8), 1.2, 1.2); } }
    // núi Phú Sĩ (Tokaido, km ~140, cách đường ~26 km; bên phải khi đi xuống, bên trái khi đi lên) [I]
    if (W.lineId === 'tsk') { const sF = S.sOfKm(140, W.dir, L.kmEnd), fSide = W.dir === 'up' ? 1 : -1;
      if (fSide === side) { const dz = sF - sCam, xF = cx + dz * f / 26000, hF = 3776 / 26000 * f * 1.2, wF = hF * 2.3; if (Math.abs(dz) < 70000 && xF > ox0 - wF && xF < ox1 + wF) { const yb = hy + 4;
        ctx.fillStyle = mixc([32, 44, 78], [86, 112, 150], lit); ctx.beginPath(); ctx.moveTo(xF - wF, yb); ctx.lineTo(xF - wF * 0.07, yb - hF); ctx.lineTo(xF + wF * 0.07, yb - hF); ctx.lineTo(xF + wF, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(245,248,255,' + (0.5 + 0.4 * day) + ')'; ctx.beginPath(); ctx.moveTo(xF - wF * 0.21, yb - hF * 0.72); ctx.lineTo(xF - wF * 0.07, yb - hF); ctx.lineTo(xF + wF * 0.07, yb - hF); ctx.lineTo(xF + wF * 0.21, yb - hF * 0.72); ctx.closePath(); ctx.fill(); } } }
    // núi đồi xa (thị sai rất chậm)
    { const D = 3000, base = hy + 4; ctx.fillStyle = mixc([24, 36, 54], [76, 104, 124], lit * (1 - wx * 0.3)); ctx.beginPath(); ctx.moveTo(ox0 - 10, base);
      for (let x = ox0 - 10; x <= ox1 + 14; x += 8) { const s = sAt(x, D), b = biomeAt(s), H = b === 'mountain' ? 420 : b === 'urban' ? 70 : 150, hh = H * (0.5 + 0.5 * Math.sin(s / 470) * Math.sin(s / 1130 + 1.3)) + H * 0.25 * Math.sin(s / 190) + H * 0.1; ctx.lineTo(x, base - Math.max(2, hh * f / D)); }
      ctx.lineTo(ox1 + 14, base); ctx.closePath(); ctx.fill(); }

    // ---- tranh phong cảnh OSM (hai lớp: gần ~e 9–60 m, xa ~e 60–320 m)
    const so = { WD, lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, dO: wdOurs, t: lit, lite: root.SCENERY === 'lite' }, lvl = wdOn && root.Strips ? root.Strips.prepare(so, sAt(ox0, 150) - 20, sAt(ox1, 150) + 20, [side > 0 ? 1 : -1]) : 0;
    const gcol = (s, e) => { if (!wdOn) return null; const c = CLS[String.fromCharCode(WD.landG(W.lineId, W.dir, L.kmEnd, s, side > 0 ? e : -e, wdOurs) || 0)]; return c || null; };
    const gb = biomeAt(sCam), gdef = inSnow ? [214, 222, 232] : gb === 'urban' ? [88, 92, 96] : gb === 'mountain' ? [44, 78, 52] : [76, 110, 60];
    const items = [];
    // mặt đất theo dải độ sâu (màu theo lớp phủ đất thật)
    const BANDS = [3000, 900, 450, 200, 90, 45, 22, 10, 4.5];
    for (let b = 0; b < BANDS.length - 1; b++) items.push({ d: BANDS[b], fn: () => { const dF = BANDS[b], dN = BANDS[b + 1];
      for (let x = ox0 - 6; x < ox1 + 6; x += 10) { const s = sAt(x + 5, (dF + dN) / 2), e = (dF + dN) / 2 + EOFF, onBr = struct(s) === 'b', g0 = onBr ? [58, 110, 156] : gcol(s, e), base = g0 || gdef, gh = -elAt(s), y0 = Y(gh, dF), y1 = Y(gh, dN);
        const fogm = clamp((dF - 60) / 700, 0, 1) * (0.25 + wx * 0.7); const col = mixc([base[0] * 0.14 + 4, base[1] * 0.16 + 6, base[2] * 0.18 + 8], base, lit * (1 - wx * 0.15)); ctx.fillStyle = col; ctx.fillRect(x, y0 - 0.5, 10.6, y1 - y0 + 1.5);
        if (fogm > 0) { ctx.fillStyle = 'rgba(150,160,170,' + fogm * 0.5 * day + ')'; ctx.fillRect(x, y0 - 0.5, 10.6, y1 - y0 + 1.5); } } } });
    // lớp tranh xa / gần
    const layerDraw = (layer, D) => () => { if (!root.Strips) return; const sa = sAt(ox0, D), sb = sAt(ox1, D), TILE = root.Strips.TILE, Lh = root.Strips.LAYERS[layer], k = f / D;
      for (let ti = Math.floor(sa / TILE); ti <= Math.floor(sb / TILE); ti++) { if (ti < 0) continue; const cv = root.Strips.tile(so, layer, side > 0 ? 1 : -1, ti, lvl); if (!cv) continue; const a = Math.max(sa, ti * TILE), b = Math.min(sb, (ti + 1) * TILE); if (b <= a) continue;
        const top = cv.top || 0, sxp = (a - ti * TILE) * Lh.ppm, swp = Math.min((b - a) * Lh.ppm, cv.width - sxp); if (swp <= 0) continue; const gh = -elAt((a + b) / 2), yb = Y(gh, D), hpx = (cv.height - top) / Lh.ppm * k;
        ctx.globalAlpha = 1 - (layer === 1 ? 0.35 * wx + 0.1 * (1 - day) : 0.1 * wx); ctx.drawImage(cv, sxp, top, swp, cv.height - top, X(a, D), yb - hpx, (b - a) * k, hpx); } ctx.globalAlpha = 1; };
    if (wdOn) { items.push({ d: 110, fn: layerDraw(1, 110) }); if (!so.lite || true) items.push({ d: 20, fn: layerDraw(0, 20) }); }

    // ---- nền đường: mái dốc / khe cắt, tường chắn, cột điện, dây điện
    const struct = s => S.structAt(L, km(s));
    items.push({ d: 6, fn: () => {      // khe cắt / mái taluy vùng đồi núi và nền đắp: các đoạn 80–260 m dựng theo vị trí thật
      for (let x = ox0 - 8; x < ox1 + 8; x += 6) { const s = sAt(x + 3, 6), k = Math.floor(s / 300), cut = (gb === 'mountain' || biomeAt(s) === 'mountain') && hs(k * 7.3, 1) < 0.45 && struct(s) === 'g' && !tunAt(s);
        if (!cut) continue; const hgt = 3 + 4 * hs(k, 5), y1 = Y(0, 5.2), y0 = Y(hgt, 5.2); ctx.fillStyle = mixc([20, 24, 20], [112, 96, 78], lit * 0.9); ctx.fillRect(x, y0, 6.6, y1 - y0 + 4); ctx.fillStyle = mixc([14, 30, 18], [58, 96, 52], lit); ctx.fillRect(x, y0 - 2, 6.6, 7 + 8 * hs(Math.floor(s / 9), 3)); } } });
    // tường chắn tiếng ồn: ở cầu cạn đô thị
    items.push({ d: 2.7, fn: () => {
      for (let x = ox0 - 8; x < ox1 + 8; x += 8) { const s = sAt(x + 4, 2.7), kind = struct(s), b = biomeAt(s); if (!((kind === 'v' || kind === 'b') && b === 'urban') || hs(Math.floor(s / 400), 9) < 0.12 || tunAt(s)) continue;
        const hh = 2.1, y1 = Y(0.15, 2.7), y0 = Y(hh, 2.7); ctx.fillStyle = mixc([30, 34, 38], [196, 200, 204], lit); ctx.fillRect(x, y0, 8.6, y1 - y0); ctx.fillStyle = mixc([20, 24, 28], [150, 156, 160], lit); ctx.fillRect(x, y0, 8.6, 5); } } });
    // cầu thép (struct 'b'): dàn giàn thép sát cửa sổ, cột đứng và thanh chéo cách nhau 4 m
    items.push({ d: 1.9, fn: () => { for (let x = ox0 - 8; x < ox1 + 8; x += 8) { const s = sAt(x + 4, 1.9); if (struct(s) !== 'b' || tunAt(s)) continue; ctx.fillStyle = mixc([20, 24, 28], [118, 124, 130], lit); ctx.fillRect(x, Y(1.2, 1.9), 8.6, Math.max(3, 0.9 * f / 1.9)); }
      ctx.strokeStyle = mixc([24, 28, 32], [96, 102, 108], lit); ctx.lineWidth = Math.max(2, 0.12 * f / 1.9); const sA = sAt(ox0 - 40, 1.9), sB = sAt(ox1 + 40, 1.9);
      for (let s = Math.floor(sA / 4) * 4; s < sB; s += 4) { if (struct(s) !== 'b' || tunAt(s)) continue; const x0 = X(s, 1.9), x1 = X(s + 4, 1.9); ctx.beginPath(); ctx.moveTo(x0, Y(0.3, 1.9)); ctx.lineTo(x0, Y(4.6, 1.9)); ctx.moveTo(x0, Y(0.3, 1.9)); ctx.lineTo(x1, Y(4.6, 1.9)); ctx.stroke(); } } });
    // cột điện kéo dây (trụ cách ~50 m) + dây tiếp xúc và dây phụ võng nhẹ
    items.push({ d: 2.1, fn: () => { const sA = sAt(ox0 - 60, 2.1), sB = sAt(ox1 + 60, 2.1), k0 = Math.floor(sA / 50), k1 = Math.floor(sB / 50), col = mixc([30, 32, 36], [150, 156, 160], lit);
      for (let k = k0; k <= k1; k++) { const s = k * 50 + 3 * hs(k, 2); if (tunAt(s)) continue; const gh = -elAt(s), x = X(s, 2.1), yb = Y(gh, 2.1), yt = Y(8.3 - 0.0, 2.1), w = Math.max(3, 0.32 * f / 2.1);
        ctx.fillStyle = col; ctx.fillRect(x - w / 2, yt, w, yb - yt); ctx.fillRect(x - w * 2.4, Y(8.0, 2.1), w * 4.8, Math.max(2, 0.18 * f / 2.1));
        const sn = (k + 1) * 50 + 3 * hs(k + 1, 2), xn = X(sn, 2.1); if (!tunAt(sn)) for (const [hh, wd] of [[5.3, 2.2], [6.3, 1.6]]) { ctx.strokeStyle = mixc([60, 64, 70], [170, 176, 182], lit); ctx.lineWidth = Math.max(1, 0.03 * f / 2.1); ctx.beginPath(); ctx.moveTo(x, Y(hh, 2.1)); ctx.quadraticCurveTo((x + xn) / 2, Y(hh, 2.1) + 7, xn, Y(hh, 2.1)); ctx.stroke(); } } } });

    // ---- ga: sân ga, người, ghế, cột mái, tàu ở đường khác
    const trainSide = (key, sLow, len, flip, d, labelDark) => {      // dải ảnh nhìn ngang của một đoàn tàu, cạnh gần ở độ sâu d; sLow..sLow+len là phạm vi s
      const sp = R.sprites && R.sprites[SMAP[key] || 'n700'], k = f / d, xl = X(sLow, d), xr = X(sLow + len, d); if (xr < ox0 || xl > ox1) return; const yr = Y(0, d);
      if (!sp || !sp.ready) { ctx.fillStyle = mixc([30, 36, 44], [200, 206, 214], lit); ctx.fillRect(xl, yr - 3.6 * k, xr - xl, 3.6 * k); return; }
      const m = sp.meta, u0 = clamp((ox0 - xl) / (xr - xl), 0, 1), u1 = clamp((ox1 - xl) / (xr - xl), 0, 1), sw = (u1 - u0) * m.width, sx0 = flip ? (1 - u1) * m.width : u0 * m.width, dx = xl + u0 * (xr - xl), dw = (u1 - u0) * (xr - xl), dh = m.height / m.pxPerMeter * k, dy = yr - m.railY / m.pxPerMeter * k;
      if (dw < 0.5 || sw < 0.5) return; ctx.save(); if (flip) { ctx.translate(dx + dw, 0); ctx.scale(-1, 1); ctx.drawImage(sp.img, sx0, 0, sw, m.height, 0, dy, dw, dh); } else ctx.drawImage(sp.img, sx0, 0, sw, m.height, dx, dy, dw, dh); ctx.restore();
      if (night > 0.3 || labelDark) { ctx.fillStyle = 'rgba(6,10,24,' + (0.5 * night) + ')'; ctx.fillRect(dx, dy, dw, dh); } };
    const person = (x, yf, k, sd, mv) => {      // người đứng (cao 1,7 m) nhìn ngang
      const col = CLOTH[Math.floor(hs(sd, 3) * CLOTH.length)], skin = SKIN[Math.floor(hs(sd, 5) * SKIN.length)], hgt = (1.58 + 0.22 * hs(sd, 7)) * k, w = 0.5 * k, sway = mv ? Math.sin(now / 280 + sd) * 0.04 * k : 0;
      ctx.fillStyle = mixc([8, 10, 14], [60, 64, 74], lit); ctx.fillRect(x - w * 0.36 + sway, yf - hgt * 0.47, w * 0.72, hgt * 0.47);                       // chân
      ctx.fillStyle = mixc([col === 0 ? 0 : 10, 10, 14], [0, 0, 0], 0); ctx.fillStyle = col; ctx.globalAlpha = 0.35 + 0.65 * Math.max(0.35, lit); ctx.fillRect(x - w / 2 + sway, yf - hgt * 0.82, w, hgt * 0.4);       // thân
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x + sway, yf - hgt * 0.9, hgt * 0.085, 0, 7); ctx.fill(); ctx.fillStyle = '#1c1816'; ctx.beginPath(); ctx.arc(x + sway, yf - hgt * 0.93, hgt * 0.085, Math.PI, 0); ctx.fill();   // đầu và tóc
      if (hs(sd, 11) < 0.35) { ctx.fillStyle = mixc([20, 20, 24], [90, 84, 78], lit); ctx.fillRect(x + w * 0.45, yf - hgt * 0.5, w * 0.3, hgt * 0.22); } ctx.globalAlpha = 1; };
    for (const q of sts) {
      const st = q.st, gs = q.gs, sa = gs - 420, sb = gs + 20, isNow = T.phase === 'dwell' && T.k === q.i, openDoors = isNow && T.door === 'open';
      if (sb < sAt(ox0, 3) - 30 || sa > sAt(ox1, 3) + 30) continue;
      // tàu đỗ ở đường khác (hiện cả tàu đứng ở sân ga bên kia)
      for (const sb2 of W.stabled || []) { if (sb2.i !== q.i) continue; const veh = S.VEH[sb2.key]; if (!veh) continue; const e = out(sb2.track.x); if (e < 2.5) continue; trainSide(sb2.key, sb2.front - veh.len, veh.len, sb2.face !== 1, dep(e - 1.45), false); }
      // sân ga phía cửa sổ
      for (const p of st.plats) { const eN = out(p.xa), eF = out(p.xb), eA = Math.min(eN, eF), eB = Math.max(eN, eF); if (eB < 0.5) continue; const e0 = Math.max(eA, 1.45), sA0 = Math.max(sa, sAt(ox0, 3) - 40), sB0 = Math.min(sb, sAt(ox1, 3) + 40), d0 = dep(e0 + 0.05), d1 = dep(eB);
        items.push({ d: d1, fn: () => { // mặt sân ga (nhìn chếch từ trên) và mặt đứng mép sân ga
          const yN = Y(PH, d0), yF = Y(PH, d1), xa = Math.max(ox0, X(sa, d0)), xb = Math.min(ox1, X(sb, d0)); if (xb <= xa) return;
          ctx.fillStyle = mixc([30, 32, 36], [152, 156, 160], lit); ctx.fillRect(xa, Math.max(yF, oy0), xb - xa, Math.max(0, yN - Math.max(yF, oy0)) + 2);
          ctx.fillStyle = mixc([34, 34, 28], [210, 186, 70], lit); const ye = Y(PH, d0 + 0.0); ctx.fillRect(xa, ye - 1, xb - xa, 3);
          for (let s = Math.ceil(sB0 > sA0 ? sA0 / 3 : 0) * 3; s < sB0; s += 3) { const x0 = X(s, d0), x1 = X(s, d1); ctx.strokeStyle = 'rgba(60,64,70,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yN); ctx.lineTo(x1, yF); ctx.stroke(); } } });
        // cột đỡ mái ga + đèn + ghế + máy bán hàng + biển số toa; người đứng chờ
        const eMid = (eA + eB) / 2, ePil = eMid, dPil = dep(ePil), dP2 = dep(e0 + 1.2);
        items.push({ d: dPil, fn: () => { for (let s = Math.ceil(Math.max(sa, sAt(ox0 - 80, dPil)) / 20) * 20; s < Math.min(sb, sAt(ox1 + 80, dPil)); s += 20) { const x = X(s, dPil), w = Math.max(4, 0.45 * f / dPil), yb = Y(PH, dPil), yt = Y(5.6, dPil);
          ctx.fillStyle = mixc([28, 30, 34], [168, 172, 176], lit); ctx.fillRect(x - w / 2, yt, w, yb - yt); if (night > 0.3) { const g = ctx.createRadialGradient(x, Y(4.8, dPil), 0, x, Y(4.8, dPil), 60); g.addColorStop(0, 'rgba(255,236,170,.55)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - 60, Y(4.8, dPil) - 60, 120, 120); } } } });
        // người trên sân ga: nhiều hơn quanh vị trí cửa toa khi đang dừng
        items.push({ d: dP2, fn: () => { const sA1 = Math.max(sa, sAt(ox0 - 40, dP2)), sB1 = Math.min(sb, sAt(ox1 + 40, dP2)); const ours = q.stopHere && st.plat === p;
          for (let s = Math.ceil(sA1 / 1.5) * 1.5; s < sB1; s += 1.5) { const id = Math.round(s / 1.5) + q.i * 977; let near = 0; if (ours) { const b = gs - s, r = ((b % 25) + 25) % 25; near = Math.exp(-Math.min(Math.abs(r - 3.5), Math.abs(r - 21.5)) / 2.5); }
            const ph0 = hs(id, 1); if (ph0 > (0.07 + 0.5 * near) * (ours ? 1 : 0.6)) continue; const dpp = dP2 + 0.2 + hs(id, 2) * 2.2, kk = f / dpp, xx = X(s + hs(id, 4) * 2, dpp), yf = Y(PH, dpp); person(xx, yf, kk, id, openDoors && ph0 < 0.2); } } });
        // ghế băng, máy bán hàng, thùng rác ở giữa sân ga
        items.push({ d: dep(eMid + 0.2), fn: () => { const dd = dep(eMid + 0.2), k = f / dd; for (let s = Math.ceil(Math.max(sa, sAt(ox0 - 80, dd)) / 40) * 40; s < Math.min(sb, sAt(ox1 + 80, dd)); s += 40) { const id = Math.round(s / 40) + q.i * 31, kind = hs(id, 6); const x = X(s, dd), yb = Y(PH, dd);
          if (kind < 0.45) { ctx.fillStyle = mixc([20, 24, 30], [90, 100, 112], lit); ctx.fillRect(x - 0.9 * k, yb - 0.45 * k, 1.8 * k, 0.1 * k); ctx.fillRect(x - 0.9 * k, yb - 0.9 * k, 1.8 * k, 0.08 * k); ctx.fillRect(x - 0.85 * k, yb - 0.45 * k, 0.07 * k, 0.45 * k); ctx.fillRect(x + 0.78 * k, yb - 0.45 * k, 0.07 * k, 0.45 * k); }
          else if (kind < 0.7) { const c = kind < 0.58 ? [196, 40, 40] : [40, 90, 190]; ctx.fillStyle = mixc([c[0] * 0.2, c[1] * 0.2, c[2] * 0.2], c, lit); ctx.fillRect(x - 0.45 * k, yb - 1.9 * k, 0.9 * k, 1.9 * k); ctx.fillStyle = mixc([40, 44, 50], [230, 236, 240], 0.3 + 0.7 * night); ctx.fillRect(x - 0.35 * k, yb - 1.55 * k, 0.7 * k, 0.8 * k); } } } });
        // biển hiệu tên ga treo ở cột (có chữ, vẽ lật lại khi nhìn cửa phải)
        if (q.m.name) items.push({ d: dPil, fn: () => { const s = gs - 60, x = X(s, dPil); if (x < ox0 - 200 || x > ox1 + 200) return; const bw = 1.7 * f / dPil, bh = 0.5 * f / dPil, y = Y(3.4, dPil); ctx.fillStyle = mixc([8, 36, 20], [28, 120, 66], lit); ctx.fillRect(x - bw / 2, y, bw, bh); txt(q.m.name, x, y + bh * 0.68, '#f2f6f2', 'bold ' + Math.max(8, bh * 0.52) + 'px system-ui'); } });
      }
      // đường ga và đường ngược chiều ở xa hơn: hai ray và đá dăm, cột điện
      for (const t of st.tracks) { const e = out(t.x); if (Math.abs(e) < 1 || e < 2.5) continue; items.push({ d: dep(e), fn: () => { const dd = dep(e), x0 = Math.max(ox0, X(sa - 400, dd)), x1 = Math.min(ox1, X(sb + 400, dd)); if (x1 <= x0) return; const gh = 0;
        ctx.fillStyle = mixc([20, 22, 24], [96, 98, 100], lit); ctx.fillRect(x0, Y(gh + 0.28, dd), x1 - x0, Math.max(2, 0.28 * f / dd)); ctx.fillStyle = mixc([30, 32, 36], [160, 164, 168], lit); ctx.fillRect(x0, Y(gh + 0.2, dd), x1 - x0, Math.max(1, 0.05 * f / dd)); } }); }
    }
    // đường nhánh / đường chính tuyến cha ở gần ngã rẽ (độ lệch ngang theo S.trunkOff): hai ray và nền ray ở phía cửa sổ
    for (let jn = 0; jn < (L.meta.junctions || []).length; jn++) { const jc = L.meta.junctions[jn]; const sj = S.sOfKm(jc.km, W.dir, L.kmEnd); if (Math.abs(sj - sCam) > 3300) continue;
      items.push({ d: 9, fn: () => { for (let x = ox0 - 6; x < ox1 + 6; x += 12) { const s = sAt(x + 6, 12), off = S.trunkOff(W, s, jn), eo = side > 0 ? off : -off; if (Math.abs(off) < 2.2 || eo < 2.2) continue; const dd = dep(eo), gh = 0;
        ctx.fillStyle = mixc([20, 22, 24], [96, 98, 100], lit); ctx.fillRect(x, Y(gh + 0.3, dd), 12.6, Math.max(2, 0.3 * f / dd)); } } }); }
    // tàu ngược chiều lướt qua (bên phải đường ta khi nhìn cửa phải), tàu vượt trên đường thông qua khi ta đỗ ở ga tránh
    const eOpp = ADJ + lane * 0 - 0.0, oppSide = side < 0;
    if (v > 20 && !S.oppHidden(W, T) && oppSide) for (const t0 of W.opposing || []) { const key = S.oppKey(W, T, t0), veh = S.VEH[key] || S.VEH.N700, sn = T.x + (t0 - W.t) * 200, sLow = sn, dd = dep(ADJ - lane * 0 - 1.45);
      if (sLow > sCam + 220 || sLow + veh.len < sCam - 220) continue; items.push({ d: dd, fn: () => { if (veh.parts) { let off = 0; for (const pk of veh.parts) { const pv = S.VEH[pk]; trainSide(pk, sLow + off, pv.len, true, dd); off += pv.len + (veh.gap || 2.5); } } else trainSide(key, sLow, veh.len, true, dd); const u = 1 - Math.abs(sLow + veh.len / 2 - sCam) / 140; if (u > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.08 * u + ')'; ctx.fillRect(ox0, oy0, ow, oh); } } }); }
    const pl = T.phase === 'dwell' ? (W.passers && W.passers[T.k]) : null;
    if (pl) for (const p of pl) { const u = (W.t - (p.t - 4.5)) / 9; if (u <= 0 || u >= 1) continue; const key = p.v || L.meta.defVeh, veh = S.VEH[key] || S.VEH.N700, q = sts.find(z => z.i === T.k), thr = q && q.st.tracks.find(t => t.thr && t.own), eo = thr ? out(thr.x) : (oppSide ? ADJ : -ADJ), e = eo, onWin = eo > 0;
      if (!onWin) continue; const sFront = T.x + (-veh.len + u * (veh.len + 520)), dd = dep(e - 1.45); items.push({ d: dd, fn: () => trainSide(key, sFront - veh.len, veh.len, false, dd) }); }

    // ---- hầm: tường bê tông sát cửa sổ che mọi thứ phía sau; cửa hầm lướt qua
    items.push({ d: 2.3, fn: () => { const dd = 2.3; let any = false;
      for (let x = ox0 - 6; x < ox1 + 6; x += 6) { const s = sAt(x + 3, dd); if (!tunAt(s)) continue; any = true; const urbanLamp = biomeAt(s) === 'urban' || sts.some(q => Math.abs(s - q.gs) < 600);
        ctx.fillStyle = mixc([14, 16, 20], [46, 50, 56], 0.2 + 0.5 * (urbanLamp ? 1 : 0.0)); ctx.fillRect(x, oy0 - 4, 6.6, oh + 8);
        const gl = 0.12 + 0.55 * Math.exp(-Math.abs(x - cx) / (ow * 0.5)); ctx.fillStyle = 'rgba(200,205,215,' + gl * (0.25 + 0.45 * lampA * 0.4) + ')'; ctx.fillRect(x, oy0 - 4, 6.6, oh + 8);
        if (Math.floor((s + 5) / 10) !== Math.floor((s - 1) / 10)) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, oy0 - 4, 2.2, oh + 8); }      // mạch nối vỏ hầm mỗi 10 m
        if (urbanLamp && Math.floor((s + 9) / 18) !== Math.floor((s - 9) / 18)) { const g = ctx.createRadialGradient(x, hy - 80, 0, x, hy - 80, 70); g.addColorStop(0, 'rgba(255,236,170,.75)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - 70, hy - 150, 140, 140); } }
      if (any) { ctx.fillStyle = 'rgba(70,76,84,.55)'; ctx.fillRect(ox0, Y(3.2, dd), ow, Math.max(2, 0.05 * f / dd)); ctx.fillRect(ox0, Y(1.4, dd), ow, Math.max(2, 0.05 * f / dd)); } } });

    items.sort((a, b) => b.d - a.d); for (const it of items) it.fn();

    // ---- thời tiết trên kính: mưa (vệt xiên về phía sau tàu, hạt nước bám kính), tuyết lướt qua, chớp
    if (rain) { const sl = Math.min(90, v * 0.55 + 6), nR = 90; ctx.strokeStyle = 'rgba(190,210,235,' + (0.2 + 0.2 * day) + ')'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < nR; i++) { const tt = (now / 14 + i * 53) % 1000, x0 = ox0 + ((i * 97 + tt * 0.9) % ow), y0 = oy0 + ((i * 131 + tt * 2.6) % oh); ctx.moveTo(x0, y0); ctx.lineTo(x0 - sl * 0.6, y0 + 10 + sl * 0.12); } ctx.stroke();
      for (let i = 0; i < 38; i++) { const x = ox0 + hs(i, 41) * ow, y0 = oy0 + hs(i, 43) * oh, slide = ((now / 1700 + hs(i, 47)) % 1) * 26 * (v > 5 ? 1.4 : 0.3), y = y0 + slide; ctx.fillStyle = 'rgba(210,225,240,.42)'; ctx.beginPath(); ctx.ellipse(x - slide * 0.2, y, 2.2 + hs(i, 53) * 2, 3 + hs(i, 59) * 3, -0.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - slide * 0.2 - 1, y - 2, 1.2, 1.4); } }
    if (inSnow && !tunAt(sCam)) { ctx.fillStyle = 'rgba(245,250,255,.85)'; ctx.beginPath(); const sp = 1.2 + Math.min(14, v / 7), tt = now / 25; for (let i = 0; i < 130; i++) { const x = ox0 + ((hs(i, 61) * ow - tt * (sp * (0.6 + hs(i, 67))) * 1.4) % ow + ow) % ow, y = oy0 + ((hs(i, 71) * oh + tt * (1.4 + hs(i, 73))) % oh), r = 0.8 + hs(i, 79) * 2.2; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7); } ctx.fill(); }
    if (R.aud && R.aud.lastThunder) { const dt = now - R.aud.lastThunder, fl = (dt < 90 ? 1 : 0) + (dt > 220 && dt < 300 ? 0.7 : 0); if (fl > 0) { ctx.fillStyle = 'rgba(235,240,255,' + 0.5 * fl + ')'; ctx.fillRect(ox0, oy0, ow, oh); } }
    if (W.eqkActive && sh > 0.5) { ctx.fillStyle = 'rgba(120,100,80,' + Math.min(0.25, sh * 0.05) + ')'; ctx.fillRect(ox0, oy0, ow, oh); }
    // phản chiếu nội thất lên kính: đèn trần và nền ghế, rõ khi bên ngoài tối (đêm, hầm)
    { const dark = clamp(night * 0.8 + (tunAt(sCam) ? 0.6 : 0), 0, 1) * (0.55 + 0.45 * (W.eqkActive ? Math.random() : 1)); if (dark > 0.05) { const g = ctx.createLinearGradient(0, oy0, 0, oy1); g.addColorStop(0, 'rgba(255,244,214,' + 0.22 * dark + ')'); g.addColorStop(0.18, 'rgba(255,244,214,' + 0.06 * dark + ')'); g.addColorStop(1, 'rgba(20,24,34,' + 0.2 * dark + ')'); ctx.fillStyle = g; ctx.fillRect(ox0, oy0, ow, oh);
      ctx.fillStyle = 'rgba(30,40,70,' + 0.35 * dark + ')'; ctx.beginPath(); ctx.roundRect(ox0 + ow * 0.04, oy1 - oh * 0.30, ow * 0.13, oh * 0.4, 18); ctx.fill(); ctx.beginPath(); ctx.roundRect(ox1 - ow * 0.17, oy1 - oh * 0.26, ow * 0.13, oh * 0.4, 18); ctx.fill(); }
      const gg = ctx.createLinearGradient(ox0, oy0, ox1, oy1); gg.addColorStop(0, 'rgba(255,255,255,0.10)'); gg.addColorStop(0.35, 'rgba(255,255,255,0)'); gg.addColorStop(0.7, 'rgba(255,255,255,0.05)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gg; ctx.fillRect(ox0, oy0, ow, oh); }
    ctx.restore();

    // ---- khung cửa sổ: viền nhôm, gờ dưới (bàn nhỏ), rèm kéo một phần, mép lưng ghế hai góc dưới
    ctx.save(); const fr = 16;
    { const g = ctx.createLinearGradient(0, oy0 - fr, 0, oy1 + fr); g.addColorStop(0, mixc([70, 72, 76], [200, 202, 206], 0.55 + 0.2 * day)); g.addColorStop(1, mixc([48, 50, 54], [150, 152, 158], 0.5 + 0.2 * day)); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(ox0 - fr, oy0 - fr, ow + 2 * fr, oh + 2 * fr, 30); ctx.roundRect(ox0, oy0, ow, oh, 22); ctx.fill('evenodd'); }
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(ox0, oy0, ow, oh, 22); ctx.stroke();
    { const bl = hs(Math.floor(T.x / 5000), 3) < 0.5 ? 0 : 0.13 + 0.10 * hs(Math.floor(T.x / 5000), 5); if (bl > 0) { ctx.save(); ctx.beginPath(); ctx.roundRect(ox0, oy0, ow, oh, 22); ctx.clip(); const g = ctx.createLinearGradient(0, oy0, 0, oy0 + oh * bl); g.addColorStop(0, mixc([40, 42, 46], [226, 222, 210], 0.55 + 0.3 * day)); g.addColorStop(1, mixc([32, 34, 38], [200, 196, 184], 0.55 + 0.3 * day)); ctx.fillStyle = g; ctx.fillRect(ox0, oy0, ow, oh * bl); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(ox0, oy0 + oh * bl - 2, ow, 3); ctx.restore(); } }
    { const sy0 = oy1 + fr, sh0 = py + ph - sy0; if (sh0 > 4) { const g = ctx.createLinearGradient(0, sy0, 0, py + ph); g.addColorStop(0, mixc([66, 62, 58], [226, 220, 206], 0.55 + 0.25 * day)); g.addColorStop(1, mixc([30, 28, 26], [150, 144, 132], 0.5 + 0.2 * day)); ctx.fillStyle = g; ctx.fillRect(px, sy0, pw, sh0); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px, sy0, pw, 3); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px, sy0 + 3, pw, 2); } }
    ctx.restore();
    // chú thích nhỏ
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px + 8, py + 8, 232, 22); ctx.fillStyle = '#cfe0f0'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('CỬA SỔ ' + (side > 0 ? 'TRÁI' : 'PHẢI') + ' · toa giữa đoàn (, / .)', px + 14, py + 24);
  }
  root.WinView = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
