// Dải tranh phong cảnh hai bên đường ray (thay các khối nhà 3D rời rạc): mỗi bên có 3 lớp (gần / giữa / xa) là các tấm ảnh 2D đứng song song với đường,
// uốn theo đường ray và được chiếu phối cảnh bằng các lát hẹp. Nội dung vẽ từ dữ liệu OpenStreetMap (world.js): nhà, cây, cột điện theo đúng mật độ thật,
// nên vật thể không bao giờ chui vào hành lang đường sắt. Tấm tranh vẽ theo từng đoạn 250 m, sinh dần mỗi khung hình (có ngân sách thời gian) rồi nhớ lại.
// Dữ liệu © OpenStreetMap contributors (ODbL 1.0), chỉ dùng cá nhân.
(function (root) {
  const TILE = 250, CAP = 220;
  const LAYERS = [                                   // base: khoảng cách ngang tối thiểu của tấm tranh so với tim đường; gap: cách mép hành lang
    { eLo: 9, eHi: 34, ppm: 6, H: 34, base: 13, gap: 6, range: 1500 },
    { eLo: 34, eHi: 90, ppm: 3, H: 56, base: 44, gap: 30, range: 2600 },
    { eLo: 90, eHi: 320, ppm: 1.5, H: 120, base: 125, gap: 100, range: 3300 }
  ];
  const WALLS = [[236, 230, 216], [222, 216, 202], [208, 203, 194], [243, 241, 235], [199, 208, 198], [224, 208, 186], [214, 196, 176]];
  const ROOFS = [[72, 78, 88], [92, 88, 84], [62, 68, 84], [108, 76, 60], [76, 94, 100], [84, 66, 62]];
  const cache = new Map(); let frameNo = 0;
  const hash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
  const layerOf = (e, h) => { let k = e < 34 ? 0 : e < 90 ? 1 : 2; while (k < 2 && h > LAYERS[k].H * 0.96) k++; return k; };

  // ---- vẽ một tấm tranh (một bên, một lớp, một đoạn 250 m) ở mức sáng lvl (0..3)
  function genTile(WD, k) {
    const L = LAYERS[k.layer], t = k.lvl / 3, ppm = L.ppm, w = Math.ceil(TILE * ppm), h = Math.ceil(L.H * ppm), s0 = k.ti * TILE, sgn = k.side;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    const M = (col, f) => { const c = col.map(v => v * (f || 1)), n = 0.13; return `rgb(${Math.round(c[0] * (n + (1 - n) * t))},${Math.round(c[1] * (n + (1 - n) * t))},${Math.round(c[2] * (n + (1 - n) * t))})`; };
    const night = t < 0.4, X = sg => (sg - s0) * ppm, Y = m => h - m * ppm;
    const items = [], eLo = sgn > 0 ? 9 : -320, eHi = sgn > 0 ? 320 : -9;
    WD.collect(k.lid, k.dir, k.kmEnd, s0 - 14, s0 + TILE + 14, eLo, eHi, k.dO, (sg, e, bw, ds, hh, ty, lev, tone) => { const ae = Math.abs(e); if (layerOf(ae, hh) === k.layer) items.push({ sg, e: ae, bw, ds, h: hh, ty, lev, tone }); });
    items.sort((a, b) => b.e - a.e);
    // cây theo lớp phủ đất (rừng, công viên, vườn): thưa dần theo mật độ thật
    { const mid = (L.eLo + L.eHi) / 2, step = k.layer === 0 ? 4 : k.layer === 1 ? 7 : 14;
      for (let sg = s0 - 8; sg < s0 + TILE + 8; sg += step) { const jit = hash(sg, 3 + k.layer) * step, e = sgn * (L.eLo + (L.eHi - L.eLo) * (0.2 + 0.6 * hash(sg, 11)));
        const cls = String.fromCharCode(WD.landG(k.lid, k.dir, k.kmEnd, sg + jit, e, k.dO) || 0), r = hash(sg + jit, 5);
        const dens = cls === 'f' ? 0.95 : cls === 's' ? 0.7 : cls === 'p' || cls === 'e' ? 0.5 : cls === 'o' ? 0.6 : cls === 'g' ? 0.12 : cls === 'a' ? 0.1 : 0;
        if (r > dens) continue; const cr = (2.5 + 3.5 * hash(sg, 7)) * (k.layer === 2 ? 1.6 : 1), th = cr * (2.2 + hash(sg, 9)), x = X(sg + jit), conifer = cls === 'f' && hash(sg, 13) < 0.5;
        g.fillStyle = M([70, 52, 36]); g.fillRect(x - 0.25 * ppm, Y(th * 0.45), 0.5 * ppm, th * 0.45 * ppm);
        g.fillStyle = M(conifer ? [34, 72, 48] : [56 + 40 * hash(sg, 17), 108 + 24 * hash(sg, 19), 58]);
        if (conifer) { g.beginPath(); g.moveTo(x, Y(th)); g.lineTo(x - cr * 0.8 * ppm, Y(th * 0.3)); g.lineTo(x + cr * 0.8 * ppm, Y(th * 0.3)); g.closePath(); g.fill(); }
        else { g.beginPath(); g.ellipse(x, Y(th * 0.7), cr * ppm, cr * 0.9 * ppm, 0, 0, 7); g.fill(); g.fillStyle = M([70 + 30 * hash(sg, 21), 124, 66], 1.08); g.beginPath(); g.ellipse(x - cr * 0.25 * ppm, Y(th * 0.78), cr * 0.6 * ppm, cr * 0.5 * ppm, 0, 0, 7); g.fill(); }
      } }
    for (const b of items) house(g, b, X(b.sg - b.ds / 2), Math.max(2, b.ds) * ppm, ppm, L.H, t, night, M, k.layer);
    // cột điện và dây dọc phố (chỉ lớp gần và giữa)
    if (k.layer < 2) {
      const segs = WD.polesG(k.lid, k.dir, k.kmEnd, s0 - 40, s0 + TILE + 40, sgn > 0 ? L.eLo : -L.eHi, sgn > 0 ? L.eHi : -L.eLo, k.dO); const seen = new Set();
      g.strokeStyle = M([86, 82, 76]); g.lineWidth = Math.max(1, 0.28 * ppm);
      for (const q of segs) { const key = Math.round(q.s0 * 3) + ':' + Math.round(q.e0 * 3); if (seen.has(key)) continue; seen.add(key); const x0 = X(q.s0), x1 = X(q.s1);
        g.beginPath(); g.moveTo(x0, Y(0)); g.lineTo(x0, Y(9)); g.stroke(); g.beginPath(); g.moveTo(x0 - 0.9 * ppm, Y(9)); g.lineTo(x0 + 0.9 * ppm, Y(9)); g.stroke();
        g.lineWidth = Math.max(0.7, 0.08 * ppm); for (const dy of [0, 0.7, 1.4]) { g.beginPath(); g.moveTo(x0, Y(9 - dy)); g.quadraticCurveTo((x0 + x1) / 2, Y(9 - dy) + 2.2 * ppm, x1, Y(9 - dy)); g.stroke(); } g.lineWidth = Math.max(1, 0.28 * ppm); }
    }
    return cv;
  }

  // nhà nhìn chính diện: nhà ở mái ngói dốc, chung cư mái bằng có dải ban công, toà văn phòng nhỏ có biển hiệu, kho tôn, đền chùa
  function house(g, b, x, wpx, ppm, H, t, night, M, layer) {
    const ty = b.ty || 0, lev = b.lev || (ty === 1 ? 4 : ty === 2 ? 2 : 2), mansion = (ty === 0 || ty === 1) && lev >= 3, flat = mansion || ty === 1 || ty === 2, tone = b.tone;
    const hm = Math.min(b.h, H * 0.98), hp = hm * ppm, base = H * ppm, y0 = base - hp;
    const wall = ty === 1 ? (tone < 0.4 ? [188, 198, 210] : [226, 222, 212]) : ty === 2 ? [168, 172, 170] : ty === 3 ? [150, 158, 150] : ty === 4 ? [236, 230, 220] : WALLS[Math.floor(tone * 997) % WALLS.length];
    const roof = ty === 4 ? [48, 52, 58] : ty === 3 ? [118, 128, 134] : ty === 2 ? [140, 146, 150] : ROOFS[Math.floor(tone * 1531) % ROOFS.length];
    const detail = layer < 2, wm = wpx / ppm;
    if (!flat) {
      const rh = Math.max(0.9, Math.min(wm * 0.22, 3.2)) * ppm, hh = hp - rh * 0.4;
      g.fillStyle = M(wall); g.fillRect(x, base - hh, wpx, hh);
      g.fillStyle = M(roof); g.beginPath();
      if (tone < 0.5) { g.moveTo(x - 0.5 * ppm, base - hh); g.lineTo(x + wpx * 0.18, base - hh - rh); g.lineTo(x + wpx * 0.82, base - hh - rh); g.lineTo(x + wpx + 0.5 * ppm, base - hh); }     // mái hông / mái dốc nhìn dọc
      else { g.moveTo(x - 0.4 * ppm, base - hh); g.lineTo(x + wpx / 2, base - hh - rh * 1.25); g.lineTo(x + wpx + 0.4 * ppm, base - hh); }                                                   // đầu hồi
      g.closePath(); g.fill();
      if (detail) { g.fillStyle = M([88, 104, 124]); const nf = hh / ppm > 6 ? 2 : 1;
        for (let f = 0; f < nf; f++) for (let c = 0; c < Math.max(1, Math.floor(wm / 3.6)); c++) { const wx_ = x + (c + 0.5) * wpx / Math.max(1, Math.floor(wm / 3.6)) - 0.8 * ppm, wy = base - (0.9 + f * 2.7 + 1.5) * ppm; if (night && hash(b.sg + c, f + 2) > 0.55) g.fillStyle = M([255, 214, 120]); g.fillRect(wx_, wy, 1.6 * ppm, 1.5 * ppm); g.fillStyle = M([88, 104, 124]); }
        if (nf > 1) { g.fillStyle = M([96, 96, 96]); g.fillRect(x, base - 3.6 * ppm, wpx, 0.3 * ppm); } }
    } else {
      g.fillStyle = M(wall); g.fillRect(x, y0, wpx, hp); g.fillStyle = M(wall, 0.86); g.fillRect(x, y0, wpx, 0.5 * ppm);
      if (lev >= 5 && wm > 8) { g.fillStyle = M(wall, 0.9); g.fillRect(x + wpx * 0.3, y0 - 2.4 * ppm, wpx * 0.35, 2.4 * ppm); }
      if (detail) { const fl = ty === 2 ? 1 : Math.min(lev, 12), fh = hm / fl;
        for (let f = 0; f < fl; f++) { const fy = base - f * fh * ppm; if (ty === 2 && f === 0) continue;
          g.fillStyle = M(wall, 0.62); g.fillRect(x, fy - fh * 0.30 * ppm, wpx, fh * 0.12 * ppm);
          const lit = night && Math.sin(f * 7.3 + tone * 31) > 0; g.fillStyle = M(ty === 1 && tone < 0.4 ? [96, 126, 156] : [88, 104, 124]);
          g.fillRect(x + wpx * 0.05, fy - fh * 0.82 * ppm, wpx * 0.9, fh * 0.40 * ppm);
          if (lit) { g.fillStyle = M([255, 220, 130]); for (let c = 0; c < Math.max(1, Math.floor(wm / 4)); c++) g.fillRect(x + wpx * 0.05 + (c + 0.3) * wpx * 0.9 / Math.max(1, Math.floor(wm / 4)), fy - fh * 0.82 * ppm, wpx * 0.9 / Math.max(1, Math.floor(wm / 4)) * 0.4, fh * 0.40 * ppm); } }
        if (ty === 1 && lev <= 4) { g.fillStyle = M([tone > 0.5 ? 190 : 70, tone > 0.7 ? 60 : 110, tone > 0.3 ? 70 : 150]); g.fillRect(x, base - 2.6 * ppm, wpx, 2.6 * ppm); } }
    }
  }

  // ---- chiếu dải tranh ra màn hình. o: { WD, lid, dir, kmEnd, dO, Tx, P (chiếu), PG (chiếu mặt đất), f, px, pw, zStart, zEnd, edge(side, z) (mép hành lang |e|),
  //      tunnel(z), alpha(z), t (độ sáng 0..1), now }
  function draw(ctx, o) {
    frameNo++; const WD = o.WD, lvl = Math.max(0, Math.min(3, Math.round(o.t * 3))), t0 = performance.now(), want = [];
    for (let k = 2; k >= 0; k--) for (const side of [1, -1]) { const L = LAYERS[k], ze = Math.min(o.zEnd, L.range);
      for (let ti = Math.floor((o.Tx + o.zStart) / TILE); ti <= Math.floor((o.Tx + ze) / TILE); ti++) want.push({ layer: k, side, ti, lvl }); }
    // sinh các tấm còn thiếu (gần trước) trong ngân sách thời gian; khi thiếu nhiều (vừa vào tuyến) thì cho phép lâu hơn
    const missing = want.filter(w => !cache.has(keyOf(o, w))); missing.sort((a, b) => (a.ti - b.ti) || (a.layer - b.layer));
    const budget = missing.length > 12 ? 30 : 7;
    for (const w of missing) { if (performance.now() - t0 > budget) break; if (!WD.loaded(o.lid, o.dir, o.kmEnd, w.ti * TILE - 60, (w.ti + 1) * TILE + 60)) continue; const key = keyOf(o, w); const cv = genTile(WD, { lid: o.lid, dir: o.dir, kmEnd: o.kmEnd, dO: o.dO, layer: w.layer, side: w.side, ti: w.ti, lvl }); cache.set(key, { cv, used: frameNo }); }
    if (cache.size > CAP) { const arr = [...cache.entries()].sort((a, b) => a[1].used - b[1].used); for (let i = 0; i < arr.length - CAP + 40; i++) cache.delete(arr[i][0]); }
    const px0 = o.px - 24, px1 = o.px + o.pw + 24;
    for (let k = 2; k >= 0; k--) for (const side of [1, -1]) {
      const L = LAYERS[k]; let z = Math.max(o.zStart, 4); const ze = Math.min(o.zEnd, L.range);
      while (z < ze) {
        const e = side * Math.max(L.base, o.edge(side, z) + L.gap), dxdz = o.f * Math.abs(e) / (z * z), tb = (Math.floor((o.Tx + z) / TILE) + 1) * TILE - o.Tx;
        const z2 = Math.min(z + Math.max(0.05, Math.min(40, 5 / Math.max(dxdz, 0.02))), ze, tb), x0 = o.P(e, 0, z)[0], x1 = o.P(e, 0, z2)[0];
        if ((x0 < px0 && x1 < px0) || (x0 > px1 && x1 > px1) || o.tunnel(z)) { z = z2 > z ? z2 : z + 0.05; continue; }
        const ti = Math.floor((o.Tx + z + 0.001) / TILE), ent = cache.get(keyOf(o, { layer: k, side, ti, lvl })) || cache.get(keyOf(o, { layer: k, side, ti, lvl: lvl + 1 })) || cache.get(keyOf(o, { layer: k, side, ti, lvl: lvl - 1 }));
        if (ent) { ent.used = frameNo; const cv = ent.cv, zm = (z + z2) / 2, yb = o.PG(e, 0, zm)[1], yt = o.PG(e, L.H, zm)[1], sx = (o.Tx + z - ti * TILE) * L.ppm, sw = Math.max(0.6, (z2 - z) * L.ppm), xa = Math.min(x0, x1), wd = Math.abs(x1 - x0) + 0.8;
          if (yb - yt > 0.5 && sx >= 0 && sx + sw <= cv.width + 0.01) { ctx.globalAlpha = o.alpha(zm); ctx.drawImage(cv, sx, 0, sw, cv.height, xa, yt, wd, yb - yt); } }
        z = z2 > z ? z2 : z + 0.05;
      }
    }
    ctx.globalAlpha = 1;
  }
  const keyOf = (o, w) => `${o.lid}|${o.dir}|${o.dO}|${w.side}|${w.layer}|${w.ti}|${w.lvl}`;
  root.Strips = { _c: cache, draw, TILE, clear: () => cache.clear(), size: () => cache.size };
})(typeof window !== 'undefined' ? window : globalThis);
