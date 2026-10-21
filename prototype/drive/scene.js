// Khung cảnh cận cảnh: tàu thật, sân ga, cửa chắn, hành khách, tàu trước/tàu vượt/tàu ngược chiều, công nhân, hươu, biển chạy chậm,
// tuyết, gió, sét, động đất rung, phong cảnh (núi Phú Sĩ, thành phố, đồng ruộng, ngày/đêm). Hình vẽ bằng code [I]; riêng tàu dùng ảnh N700 (assets/NGUON.md).
(function (root) {
  const K = 4.5, SV = 2.0, D0 = 25;                       // px/m ở gần, kéo giãn dọc; quãng đường tuyến tính
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
  const mixc = (c1, c2, t) => 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function kmOf(W, s) { return root.Sim.kmOfS(s, W.dir, W.line.kmEnd); }
  function biome(km) {
    if ((km >= -1 && km < 42) || (km > 336 && km < 352) || (km > 470 && km < 520) || (km > 360 && km < 372)) return 'urban';
    if ((km >= 70 && km < 112) || (km >= 384 && km < 420) || (km >= 452 && km < 470)) return 'mountain';
    if (km >= 112 && km < 330) return km % 40 < 14 ? 'urban' : 'field';
    return 'field';
  }
  // bản đồ khoảng cách phía trước -> toạ độ x (gần: tuyến tính; xa: nén dần)
  function makeMap(fx, px, pw) {
    const xL = fx + D0 * K, xR = px + pw - 6;
    return dd => dd <= D0 ? fx + dd * K : xL + (xR - xL) * (1 - Math.exp(-(dd - D0) / 450));
  }
  const sc = dd => dd <= D0 ? 1 : Math.max(0.25, 1 / (1 + (dd - D0) / 220));

  function person(ctx, x, base, h, vest, lean) {
    ctx.save(); ctx.translate(x, base); ctx.rotate(lean || 0);
    ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, h * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -h * 0.35); ctx.lineTo(-h * 0.1, 0); ctx.moveTo(0, -h * 0.35); ctx.lineTo(h * 0.1, 0); ctx.stroke();
    ctx.fillStyle = vest || '#3b4a5e'; ctx.fillRect(-h * 0.14, -h * 0.72, h * 0.28, h * 0.4);
    ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.arc(0, -h * 0.82, h * 0.11, 0, 7); ctx.fill();
    if (vest === '#ff8c1a') { ctx.fillStyle = '#ffd23a'; ctx.fillRect(-h * 0.13, -h * 0.95, h * 0.26, h * 0.07); }
    ctx.restore();
  }
  function deer(ctx, x, y, h) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#6b4a2b'; ctx.strokeStyle = '#4a321c'; ctx.lineWidth = Math.max(1, h * 0.07);
    ctx.beginPath(); ctx.ellipse(0, -h * 0.45, h * 0.42, h * 0.2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); for (const dx of [-0.3, -0.15, 0.2, 0.34]) { ctx.moveTo(h * dx, -h * 0.3); ctx.lineTo(h * dx, 0); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h * 0.32, -h * 0.55); ctx.lineTo(h * 0.5, -h * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(h * 0.55, -h * 0.9, h * 0.12, h * 0.08, 0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(h * 0.52, -h * 0.96); ctx.lineTo(h * 0.44, -h * 1.15); ctx.lineTo(h * 0.58, -h * 1.1); ctx.moveTo(h * 0.5, -h * 1.0); ctx.lineTo(h * 0.62, -h * 1.2); ctx.stroke();
    ctx.restore();
  }
  function sign(ctx, x, base, s, text, col) {
    const h = 34 * s; ctx.fillStyle = '#7a8ea5'; ctx.fillRect(x - 1, base - h, 2, h);
    ctx.fillStyle = col || '#ffd23a'; ctx.fillRect(x - 13 * s, base - h - 14 * s, 26 * s, 16 * s);
    ctx.fillStyle = '#10151c'; ctx.font = 'bold ' + Math.max(7, Math.round(11 * s)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(text, x, base - h - 2 * s);
  }

  const PAL = { N700: ['#1b4fb5', '#fbfdff'], N700S: ['#1b4fb5', '#fbfdff'], 'N700-8': ['#1b4fb5', '#fbfdff'], S800: ['#c0392b', '#f1f3f5'], E5: ['#e36a98', '#2f7a4f'] };
  function trainProc(ctx, fx, base, L, H, key, alpha, flip) {
    const pal = PAL[key] || PAL.N700, x0 = fx - L, nose = Math.max(20, H * 1.4), bodyEnd = fx - nose, bottom = base - 4, top = bottom - H, cw = Math.max(8, L / ((root.Sim.VEH[key] || {}).cars || 16));
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; if (flip) { ctx.translate(fx, 0); ctx.scale(-1, 1); fx = 0; ctx.translate(-0, 0); }
    const bx0 = fx - L, bEnd = fx - nose;
    const g = ctx.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, key === 'E5' ? pal[1] : '#fbfdff'); g.addColorStop(0.5, key === 'E5' ? pal[1] : '#e9eef3'); g.addColorStop(0.52, '#f2f5f8'); g.addColorStop(1, '#c4ced8');
    ctx.fillStyle = g; ctx.fillRect(bx0, top, bEnd - bx0 + 1, H);
    if (key === 'E5') { ctx.fillStyle = '#e8eef3'; ctx.fillRect(bx0, top + H * 0.5, bEnd - bx0 + 1, H * 0.5); }
    ctx.fillStyle = '#3d4854'; ctx.fillRect(bx0, bottom - H * 0.18, bEnd - bx0, H * 0.18);
    ctx.fillStyle = pal[0]; ctx.fillRect(bx0, top + H * 0.56, bEnd - bx0, Math.max(1.5, H * 0.1));
    ctx.fillStyle = '#15283f'; const nw = Math.max(1, Math.floor(L / 9)); for (let q = 0; q < nw; q++) ctx.fillRect(bx0 + 3 + q * (L - 6) / nw, top + H * 0.2, Math.max(1, (L - 6) / nw * 0.55), H * 0.22);
    ctx.fillStyle = 'rgba(40,52,66,.5)'; for (let c = 1; c < (root.Sim.VEH[key] || {}).cars; c++) ctx.fillRect(bx0 + c * cw - 0.4, top, 0.8, H);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bEnd, top); ctx.bezierCurveTo(bEnd + nose * 0.5, top, fx - 4, top + H * 0.4, fx, top + H * 0.8); ctx.bezierCurveTo(fx, bottom - 1, fx - 4, bottom, bEnd + nose * 0.4, bottom); ctx.lineTo(bEnd, bottom); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#15283f'; ctx.beginPath(); ctx.moveTo(bEnd + nose * 0.38, top + 2); ctx.lineTo(fx - nose * 0.3, top + H * 0.38); ctx.lineTo(fx - nose * 0.2, top + H * 0.5); ctx.lineTo(bEnd + nose * 0.3, top + H * 0.38); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // vẽ cả đoàn có số toa đúng (N700 dùng ảnh thật ghép từ toa đầu, toa giữa, toa mũi), các loại khác vẽ bằng code
  function fleet(ctx, R, key, xFront, base, wPx, hPx, alpha, flip) {
    const spr = R.spr, img = R.img, veh = root.Sim.VEH[key] || root.Sim.VEH.N700;
    if (!(spr && /^N700/.test(key))) { trainProc(ctx, xFront, base, wPx, Math.max(4, hPx * 0.6), key, alpha, flip); return; }
    const n = veh.cars, c1 = spr.cars[0], cm = spr.cars[7], cN = spr.cars[15], total = c1.w + (n - 2) * cm.w + cN.w, f = wPx / total, y = base - hPx * (spr.railY / spr.height);
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = true;
    if (flip) { ctx.translate(xFront, 0); ctx.scale(-1, 1); xFront = 0; }
    let x = xFront - wPx; const put = c => { ctx.drawImage(img, c.x, 0, c.w, spr.height, x, y, c.w * f + 0.5, hPx); x += c.w * f; };
    put(c1); for (let i = 0; i < n - 2; i++) put(cm); put(cN);
    ctx.restore();
  }
  function stripTrain(ctx, spr, img, xFront, base, wPx, hPx, flip, alpha, railOff) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const y = base - hPx * (spr.railY / spr.height) + (railOff || 0);
    if (flip) { ctx.translate(xFront, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, spr.width, spr.height, 0, y, wPx, hPx); }
    else ctx.drawImage(img, 0, 0, spr.width, spr.height, xFront - wPx, y, wPx, hPx);
    ctx.restore();
  }

  function draw(ctx, px, py, pw, ph, W, T, R) {
    const spr = R.spr, img = R.img, now = performance.now();
    const base = py + 128, fx = px + 350, map = makeMap(fx, px, pw);
    const clock = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400, hour = clock / 3600;
    const day = smooth(5.3, 7.3, hour) * (1 - smooth(16.8, 19.0, hour)), dusk = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.2) + Math.max(0, 1 - Math.abs(hour - 17.8) / 1.3);
    const night = 1 - day;
    const inSnow = W.zones.some(z => z.kind === 'snow' && T.x >= z.s0 - 3000 && T.x < z.s1), rain = W.rainHere;
    const windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    const wx = rain ? 0.55 : inSnow ? 0.4 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    // rung (động đất, va chạm)
    let sh = 0; if (W.eqkAt !== undefined && W.eqkActive) sh = 7 * Math.exp(-(W.t - W.eqkAt) / 40) + 1.2; if (W.shakeAt !== undefined && W.t - W.shakeAt < 4) sh = Math.max(sh, (W.shakeAmp || 4) * Math.exp(-(W.t - W.shakeAt) / 1.2));
    if (sh > 0.2) ctx.translate((Math.random() - 0.5) * sh * 2, (Math.random() - 0.5) * sh * 1.4);
    // ---- bầu trời
    const top = mixc([6, 12, 24], [92, 160, 224], day), hor = mixc([14, 24, 42], [183, 214, 240], day);
    const g = ctx.createLinearGradient(0, py, 0, base); g.addColorStop(0, mixc([...top.match(/\d+/g).map(Number)], [70, 78, 90], wx)); g.addColorStop(1, mixc([...hor.match(/\d+/g).map(Number)], [110, 118, 128], wx));
    ctx.fillStyle = g; ctx.fillRect(px - 20, py - 20, pw + 40, ph + 40);
    if (dusk > 0.05 && wx < 0.3) { ctx.fillStyle = 'rgba(255,140,60,' + Math.min(0.35, dusk * 0.3) + ')'; ctx.fillRect(px, py + 40, pw, base - py - 40); }
    if (night > 0.4 && wx < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (night - 0.4)) + ')'; for (let i = 0; i < 40; i++) ctx.fillRect(px + hash(i * 17) * pw, py + hash(i * 31 + 7) * (base - py - 30), 1.3, 1.3); }
    // ---- lớp xa: núi, núi Phú Sĩ
    const kmNow = kmOf(W, T.x), dirS = W.dir === 'up' ? -1 : 1;
    const farK = 0.06;                                                 // px/m cho lớp xa
    const hillCol = mixc([28, 40, 58], [70, 100, 120], day * (1 - wx * 0.5));
    ctx.fillStyle = hillCol; ctx.beginPath(); ctx.moveTo(px, base - 8);
    for (let x = px; x <= px + pw + 8; x += 8) { const wm = (T.x + (x - fx) / farK * 0 + 0); const sFar = T.x * farK + x; const hgt = 16 + 20 * Math.sin(sFar / 55) + 12 * Math.sin(sFar / 23 + 1.3); ctx.lineTo(x, base - 8 - Math.max(4, hgt)); }
    ctx.lineTo(px + pw + 8, base - 8); ctx.closePath(); ctx.fill();
    // núi Phú Sĩ ở km ~140 (nhìn từ Shin-Fuji, vị trí xấp xỉ [I])
    const dFuji = (140 - kmNow) * 1000 * dirS * -1;                    // m phía trước (+) hay sau (-) theo hướng chạy
    const fujiX = px + pw * 0.62 + ((W.dir === 'up' ? (kmNow - 140) : (140 - kmNow)) * 1000) * 0.012;
    if (W.lineId === 'tsk' && Math.abs(kmNow - 140) < 38) {
      const hF = 80, wF = 150; ctx.fillStyle = mixc([32, 44, 78], [86, 112, 150], day * (1 - wx * 0.6));
      ctx.beginPath(); ctx.moveTo(fujiX - wF, base - 8); ctx.lineTo(fujiX - 14, base - 8 - hF); ctx.lineTo(fujiX + 14, base - 8 - hF); ctx.lineTo(fujiX + wF, base - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(245,248,255,' + (0.5 + 0.4 * day) + ')'; ctx.beginPath(); ctx.moveTo(fujiX - 40, base - 8 - hF * 0.72); ctx.lineTo(fujiX - 14, base - 8 - hF); ctx.lineTo(fujiX + 14, base - 8 - hF); ctx.lineTo(fujiX + 42, base - 8 - hF * 0.7); ctx.lineTo(fujiX + 24, base - 8 - hF * 0.78); ctx.lineTo(fujiX + 8, base - 8 - hF * 0.68); ctx.lineTo(fujiX - 10, base - 8 - hF * 0.8); ctx.closePath(); ctx.fill();
    }
    // ---- lớp giữa: thành phố / đồng ruộng / núi thấp (cuộn theo vị trí)
    const midK = 0.9, cell = 24;
    for (let ci = Math.floor((T.x * midK) / cell) - 2; ci < Math.floor((T.x * midK + pw + 60) / cell) + 2; ci++) {
      const xs = px + ci * cell - T.x * midK, kmC = kmOf(W, T.x + (xs - fx) / midK * 1), b = root.Sim.biomeAt(W.line, kmC), r1 = hash(ci * 7919 + 13), r2 = hash(ci * 104729 + 7);
      if (b === 'urban') {
        if (r1 < 0.78) { const bw = 12 + r2 * 18, bh = 18 + hash(ci * 31 + 5) * 52; ctx.fillStyle = mixc([20, 26, 38], [88, 100, 118], day * (1 - wx * 0.4)); ctx.fillRect(xs, base - 4 - bh, bw, bh);
          const lit = night > 0.35; if (lit) { ctx.fillStyle = 'rgba(255,224,130,' + (0.8 * night) + ')'; for (let wy = 0; wy < bh - 6; wy += 6) for (let wxx = 3; wxx < bw - 3; wxx += 5) if (hash(ci * 977 + wy * 13 + wxx) < 0.45) ctx.fillRect(xs + wxx, base - 4 - bh + 4 + wy, 2, 3); } }
      } else if (b === 'mountain') {
        ctx.fillStyle = mixc([18, 34, 28], [44, 92, 70], day * (1 - wx * 0.4)); const th = 14 + r2 * 34; ctx.beginPath(); ctx.moveTo(xs - 12, base - 4); ctx.lineTo(xs + 8, base - 4 - th); ctx.lineTo(xs + 28, base - 4); ctx.closePath(); ctx.fill();
        if (inSnow) { ctx.fillStyle = 'rgba(240,246,255,.85)'; ctx.beginPath(); ctx.moveTo(xs - 1, base - 4 - th * 0.55); ctx.lineTo(xs + 8, base - 4 - th); ctx.lineTo(xs + 17, base - 4 - th * 0.55); ctx.closePath(); ctx.fill(); }
      } else {
        if (r1 < 0.28) { const lean = windy ? Math.sin(now / 500 + ci) * 0.28 + 0.25 : 0; ctx.save(); ctx.translate(xs, base - 4); ctx.rotate(lean); ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-1, -12, 2, 12); ctx.fillStyle = mixc([14, 38, 24], [48, 110, 62], day * (1 - wx * 0.3)); ctx.beginPath(); ctx.arc(0, -16, 6 + r2 * 4, 0, 7); ctx.fill(); ctx.restore(); }
        else if (r1 < 0.34) { ctx.fillStyle = mixc([30, 30, 36], [150, 120, 100], day); ctx.fillRect(xs, base - 14, 14, 10); ctx.fillStyle = mixc([20, 20, 28], [90, 50, 40], day); ctx.beginPath(); ctx.moveTo(xs - 2, base - 14); ctx.lineTo(xs + 7, base - 21); ctx.lineTo(xs + 16, base - 14); ctx.closePath(); ctx.fill(); if (night > 0.4) { ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.fillRect(xs + 4, base - 11, 3, 4); } }
      }
    }
    // mặt đất / đá dăm
    ctx.fillStyle = inSnow ? '#cfd8e3' : mixc([14, 20, 27], [60, 66, 62], day * (1 - wx * 0.4)); ctx.fillRect(px, base - 4, pw, ph);
    ctx.fillStyle = inSnow ? '#e9eff6' : '#0e141b'; ctx.fillRect(px, base, pw, ph);
    ctx.fillStyle = inSnow ? '#b8c4d2' : '#19212b'; ctx.fillRect(px, base + 3, pw, ph);
    // ---- trụ điện và dây điện (cuộn theo vận tốc thật)
    const sp = 50 * K, off = (T.x * K) % sp; ctx.strokeStyle = '#3a4c60'; ctx.lineWidth = 4;
    for (let sx = px - sp; sx < px + pw + sp; sx += sp) { const x = sx - off + sp; ctx.beginPath(); ctx.moveTo(x, base - 70); ctx.lineTo(x, base); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, base - 66); ctx.lineTo(x + 10, base - 66); ctx.stroke(); ctx.lineWidth = 4; if (inSnow) { ctx.fillStyle = '#f2f6fb'; ctx.fillRect(x - 10, base - 70, 20, 4); } }
    ctx.strokeStyle = '#2f3f50'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, base - 60); ctx.lineTo(px + pw, base - 60); ctx.stroke();
    ctx.strokeStyle = '#6b7f95'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px + pw, base); ctx.stroke();
    ctx.strokeStyle = '#2a3a4c'; ctx.lineWidth = 2; const dens = 28, o2 = (T.x * K) % dens; for (let sx = px - dens; sx < px + pw + dens; sx += dens) { ctx.beginPath(); ctx.moveTo(sx - o2 + dens, base + 4); ctx.lineTo(sx - o2 + dens, base + 12); ctx.stroke(); }

    // ---- đối tượng phía trước (bản đồ nén)
    const j = R.nextTarget(T), mark = T.phase === 'dwell' ? T.M[T.k].s : T.M[j].s, d = mark - T.x, markX = map(d);
    const atStn = d < 450 && d > -420;
    // sân ga, biển, vạch, cửa chắn
    if (atStn) {
      const pStart = map(Math.max(d - 400, -200)), pEnd = markX + 60; const platTop = base - 15;
      ctx.fillStyle = '#2d3f55'; ctx.fillRect(pStart, platTop, pEnd - pStart, 15); ctx.fillStyle = '#e8c93a'; ctx.fillRect(pStart, platTop, pEnd - pStart, 2);
      ctx.fillStyle = 'rgba(70,100,130,.55)'; ctx.fillRect(pStart, base - 62, pEnd - pStart, 5);
      ctx.fillStyle = '#30475f'; for (let q = 0; q < 14; q++) { const cxp = map(d - q * 30); if (cxp > px - 10 && cxp < px + pw + 10) ctx.fillRect(cxp - 2, base - 58, 4, 44); }
      const stName = T.M[T.phase === 'dwell' ? T.k : j]; const sj = stName.jp || '';
      if (d < 120 && d > -60) { const bx = map(Math.max(d - 12, 0)); ctx.fillStyle = '#1f6f4a'; ctx.fillRect(bx - 38, base - 58, 76, 18); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(sj + '  ' + stName.name, bx, base - 45); }
      [300, 200, 100, 50, 25, 10].forEach(m => { const bx = map(d - m); if (d - m > -1 && bx > px && bx < px + pw) { ctx.fillStyle = '#ffc247'; ctx.fillRect(bx - 1, base - 40, 3, 24); ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(m + ' m', bx, base - 44); } });
      ctx.fillStyle = '#4cd68a'; ctx.fillRect(markX - 2, base - 66, 4, 74); ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('VẠCH', markX, base - 70);
      for (let m = -2; m <= 2; m++) { ctx.fillStyle = m === 0 ? '#4cd68a' : 'rgba(76,214,138,.5)'; ctx.fillRect(markX + m * K - 0.5, base + 14, 1.2, 6); }
      // người trên sân ga (giảm dần khi lên tàu) và cửa chắn sân ga
      const dwell = T.phase === 'dwell', hasDoors = true, open = dwell && T.door === 'open' && T.k > 0 || (dwell && T.k === 0 && T.door === 'open');
      if (d < 60 && d > -30) {
        const crowdN = dwell ? Math.round(14 * (1 - clamp(T.dwellT / 22, 0, 1))) + (T.door === 'closed' ? 0 : 0) : 14;
        for (let c = 0; c < 16; c++) for (const pos of [3.5, 21.5]) {
          const xm = markX - (c * 25 + (25 - pos)) * K; if (xm < px - 20 || xm > px + pw + 20) continue;
          if (hasDoors) { const wOpen = open ? 3.2 : 0; ctx.fillStyle = 'rgba(150,210,240,.35)'; ctx.fillRect(xm - 6.5 * K / 4.5 * 2.2, platTop - 20, 6, 20); ctx.fillRect(xm + 1.2 * 1, platTop - 20, 6, 20); ctx.strokeStyle = '#8aa0b5'; ctx.lineWidth = 1; ctx.strokeRect(xm - 13, platTop - 20, 26, 20); if (open) { ctx.fillStyle = '#10151c'; ctx.fillRect(xm - 5, platTop - 19, 10, 19); } }
          for (let q = 0; q < 3; q++) { if (hash(c * 97 + q * 13 + (hash(T.k + 5) * 1000 | 0)) < crowdN / 14) { const jx = xm - 18 + q * 15 + hash(c * 31 + q) * 6, walk = dwell && open ? Math.sin(now / 200 + c + q) * 0.06 : 0; person(ctx, jx, platTop, 15, ['#3b4a5e', '#5a3b4a', '#2f5a48', '#6a6a2f'][(c + q) % 4], walk); } }
        }
        // nhân viên sân ga: giơ tay khi đóng cửa
        const ax = markX + 22; person(ctx, ax, platTop, 17, '#2a6fd6', 0); if (dwell && (T.door === 'closing' || T.door === 'closed')) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax + 2, platTop - 11); ctx.lineTo(ax + 8, platTop - 22); ctx.stroke(); }
      }
    }
    // cửa hầm
    for (const [k0, k1] of W.line.meta.tunnels) for (const kk of [k0, k1]) { const s = root.Sim.sOfKm(kk, W.dir, W.line.kmEnd), dd = (s - T.x) * (W.dir === 'up' ? 1 : 1); const dir = W.dir === 'up' ? 1 : 1; const ds = s - T.x; if (ds > 0 && ds < 1800) { const x = map(ds), q = sc(ds); ctx.fillStyle = '#05080d'; ctx.beginPath(); ctx.ellipse(x, base - 20 * q, 14 * q, 24 * q, 0, Math.PI, 0); ctx.lineTo(x + 14 * q, base); ctx.lineTo(x - 14 * q, base); ctx.fill(); ctx.strokeStyle = '#3a4c60'; ctx.lineWidth = 2 * q; ctx.stroke(); } }
    // biển chạy chậm: đầu và cuối vùng giới hạn
    for (const z of W.zones) {
      if (z.hold || W.t > z.tB || W.t < z.tA - 1 || z.v * 3.6 >= 284 || z.s1 - z.s0 > 5e8) continue;
      const num = Math.round(z.v * 3.6 / 10) * 10, ds0 = z.s0 - T.x, ds1 = z.s1 - T.x;
      if (ds0 > 0 && ds0 < 1800) sign(ctx, map(ds0), base, sc(ds0), String(num), '#ffd23a');
      if (ds1 > 0 && ds1 < 1800) sign(ctx, map(ds1), base, sc(ds1), '解除', '#e8eef5');
    }
    // công nhân làm việc cạnh đường
    for (const z of W.workers) {
      const ds0 = z.s0 - T.x, ds1 = z.s1 - T.x; if (ds1 < -30 || ds0 > 1800) continue;
      for (let q = 0; q < 5; q++) { const dd = ds0 + (ds1 - ds0) * (q / 4) + 30 * hash(q + 3); if (dd < -20 || dd > 1800) continue; const x = map(Math.max(dd, -10)), s = sc(Math.max(dd, 0)); person(ctx, x, base - 2 * s, 24 * s, '#ff8c1a', Math.sin(now / 400 + q) * 0.05); ctx.fillStyle = '#ff5a1a'; ctx.fillRect(x + 6 * s, base - 8 * s, 4 * s, 8 * s); }
      if (ds0 > 0 && ds0 < 1800) { ctx.fillStyle = '#ff3b1a'; const x = map(ds0), s = sc(ds0); ctx.fillRect(x - 3 * s, base - 46 * s, 6 * s, 6 * s); if (Math.floor(now / 350) % 2) { ctx.fillStyle = 'rgba(255,60,30,.35)'; ctx.beginPath(); ctx.arc(x, base - 43 * s, 9 * s, 0, 7); ctx.fill(); } }
    }
    // dây điện võng và tia lửa điện
    for (const w of W.wires || []) { const ds = w.s - T.x; if (W.t > w.tB || ds < -60 || ds > 1800) continue; const x = map(Math.max(ds, -30)), q = sc(Math.max(ds, 0));
      ctx.strokeStyle = '#8a98a8'; ctx.lineWidth = 2 * Math.max(0.6, q); ctx.beginPath(); ctx.moveTo(x - 60 * q, base - 60 * q); ctx.quadraticCurveTo(x, base - 6 * q, x + 60 * q, base - 60 * q); ctx.stroke();
      if (Math.floor(now / 120) % 3) { ctx.fillStyle = '#ffd24a'; for (let i = 0; i < 5; i++) ctx.fillRect(x + (Math.random() - 0.5) * 30 * q, base - 14 * q - Math.random() * 20 * q, 2, 2); } }
    // hươu / lợn rừng
    for (const an of W.animals) {
      if (!an.active) continue; let ds = an.s - T.x; if (ds < -60 || ds > 1800) continue;
      const fl = an.fleeT0 !== undefined ? W.t - an.fleeT0 : -1; let x = map(Math.max(ds, -20)), s = Math.max(sc(Math.max(ds, 0)), 0.3), y = base - 2;
      if (fl >= 0) { x -= fl * 60; y -= Math.min(1, fl / 1.4) * 70 * s; if (fl > 2.2) continue; }
      deer(ctx, x, y, 30 * s + 6);
      if (an.resolved && !an.hornOK && W.shakeAt !== undefined && W.t - W.shakeAt < 2) { ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - (W.t - W.shakeAt) / 2)) + ')'; ctx.fillRect(px, py, pw, ph); }
    }
    // tàu phía trước (nén theo khoảng cách)
    const Ld = W.lead;
    if (Ld && Ld.phase !== 'end') { const lenL = Ld.veh.len, dl = Ld.x - T.x; if (dl > 0 && dl - lenL < 1800) { const xf = map(dl), xr = map(Math.max(dl - lenL, 0)), q = sc(Math.max(dl - lenL, 0)); if (xf - xr > 2) fleet(ctx, R, Ld.veh.key, xf, base, xf - xr, (R.spr ? R.spr.height * (K / R.spr.pxPerMeter) : 24) * SV * q, 0.95); } }
    // ---- đoàn tàu người lái
    if (spr && /^N700/.test(T.veh.key)) {
      const f = K / spr.pxPerMeter, srcW = Math.min(spr.width, Math.ceil((fx - px + 4) / f)), dh = spr.height * f * SV;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(fx - srcW * f, base - 1, srcW * f, 3);
      ctx.drawImage(img, spr.width - srcW, 0, srcW, spr.height, fx - srcW * f, base - (spr.railY * f * SV) + 2, srcW * f, dh);
      if (night > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(' + Math.round(255 - 130 * night) + ',' + Math.round(255 - 120 * night) + ',' + Math.round(255 - 80 * night) + ',1)'; ctx.fillRect(fx - srcW * f, base - 60, srcW * f + 4, 62); ctx.restore(); }
      if (T.phase === 'run' && T.v > 1 && !T.cut) { ctx.fillStyle = 'rgba(255,245,190,' + (0.16 + 0.12 * night + 0.05 * Math.sin(now / 120)) + ')'; ctx.beginPath(); ctx.moveTo(fx - 2, base - 22); ctx.lineTo(fx + 100 + 60 * night, base - 32); ctx.lineTo(fx + 100 + 60 * night, base - 3); ctx.closePath(); ctx.fill(); }
    } else trainProc(ctx, fx, base, T.veh.len * K, 26, T.veh.key, 1, false);
    // tàu vượt qua đường thông qua khi ta đỗ ở ga tránh (quét qua màn hình ~ 9 giây)
    const pl = T.phase === 'dwell' ? (W.passers && W.passers[T.k]) : null;
    if (pl) for (const p of pl) { const u = (W.t - (p.t - 4.5)) / 9; if (u > 0 && u < 1) { const wL = 404.7 * K * 1.18, hh = (spr ? spr.height * (K * 1.18 / spr.pxPerMeter) : 24) * SV, xF = px + u * (pw + wL); fleet(ctx, R, 'N700', xF, base + 9, wL, hh, false, 1); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, base - 40, pw, 50 * 0); txt2(ctx, p.label + ' thông qua', px + pw / 2, py + 16, '#ffd88a'); } }
    // tàu ngược chiều trên đường bên kia (vút qua trong ~2 s)
    if (T.v > 20) for (const t0 of W.opposing || []) { const u = (W.t - (t0 - 1)) / 2.2; if (u > 0 && u < 1) { const wL = 404.7 * K * 0.8, hh = (spr ? spr.height * (K * 0.8 / spr.pxPerMeter) : 24) * SV, xF = px + pw + wL - u * (pw + wL * 1.0); fleet(ctx, R, 'N700', xF - wL, base - 4, wL, hh, 0.92, true); ctx.fillStyle = 'rgba(255,255,255,' + 0.15 * Math.sin(u * Math.PI) + ')'; ctx.fillRect(px, py, pw, ph); } }
    // ---- thời tiết phủ lên
    if (rain) { ctx.strokeStyle = 'rgba(160,190,255,.5)'; ctx.lineWidth = 1; const tt = now / 30; for (let q = 0; q < 90; q++) { const rx = px + ((q * 83 + tt * 3 + (windy ? tt * 3 : 0)) % pw), ry = py + ((q * 47 + tt * 9) % ph); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 5 - (windy ? 6 : 0), ry + 12); ctx.stroke(); } }
    if (inSnow && T.x >= (W.zones.find(z => z.kind === 'snow') || { s0: 1e18 }).s0 - 4000) { ctx.fillStyle = 'rgba(245,250,255,.85)'; const tt = now / 25; for (let q = 0; q < 110; q++) { const rx = px + ((q * 61 + tt * (1.2 + (q % 3) * 0.5) + Math.sin(tt / 9 + q) * 8) % pw), ry = py + ((q * 37 + tt * (1.5 + (q % 4) * 0.6)) % ph); ctx.fillRect(rx, ry, 2, 2); } }
    if (windy) { ctx.strokeStyle = 'rgba(210,225,240,.35)'; ctx.lineWidth = 1; const tt = now / 6; for (let q = 0; q < 14; q++) { const ry = py + 30 + (q * 29) % (base - py - 40), rx = px + pw - ((q * 131 + tt * (2 + q % 3)) % (pw + 80)); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 40 + (q % 3) * 14, ry + Math.sin(tt / 40 + q) * 2); ctx.stroke(); } }
    // sét (đồng bộ với tiếng sấm)
    if (R.aud && R.aud.lastThunder) { const dt = now - R.aud.lastThunder; const fl = (dt < 90 ? 1 : 0) + (dt > 220 && dt < 300 ? 0.7 : 0); if (fl > 0) { ctx.fillStyle = 'rgba(235,240,255,' + 0.55 * fl + ')'; ctx.fillRect(px, py, pw, ph); } }
    ctx.restore();
  }
  function txt2(ctx, s, x, y, c) { ctx.fillStyle = c; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s, x, y); }
  root.Scene = { draw, K };
})(typeof window !== 'undefined' ? window : globalThis);
