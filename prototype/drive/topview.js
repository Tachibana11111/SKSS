// Bản đồ nhỏ nhìn từ trên xuống (minimap): hình tròn, tàu của ta ở giữa và luôn hướng lên trên; bản đồ XOAY theo hướng địa lý của tuyến,
// vòng la bàn ngoài rìa (N, NE, E, SE, S, SW, W, NW) xoay theo: tàu đi về phía bắc thì chữ N ở trên cùng, đi về phía đông thì chữ E ở trên cùng.
// Hướng địa lý lấy từ toạ độ ga (layout.js bearingAt). Toa tàu là ảnh nhìn từ trên (đầu / giữa / đuôi) tô màu theo mẫu tàu; mỗi toa bám theo đường đi.
// Tỉ lệ dọc đúng thật (bán kính nhìn 260 m); chiều ngang phóng đại ~5 lần để thấy rõ khoảng cách giữa các đường.
(function (root) {
  const VIEW_R = 260;                         // bán kính nhìn (m) tính từ tâm đoàn tàu
  const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const SPR = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5', E7: 'e7', H5: 'h5', E6: 'e6', E8: 'e8', T4: 't4', E926: 'e926', E2: 'e2', 'E5+E6': 'e5', 'E5+E8': 'e5', 'E6+E5': 'e6', 'E8+E5': 'e8', 'N700S-6': 'n700s' };
  const COL = { n700: '#e4eaf1', n700s: '#eaf0f6', s800: '#d9dde2', e5: '#27a07f', e6: '#e06a82', e8: '#8f68b0', t4: '#f5c91a', e926: '#f2d64a', e7: '#e8e2d4', h5: '#2aa890', e2: '#e9d6c8', kamome: '#e8e8e8', n700s8: '#eaf0f6' };      // màu thay thế khi chưa có ảnh nhìn từ trên (top_*.png nằm ngoài kho git)
  const cache = {}, tvCache = {};

  // vị trí (đông, bắc) tính bằng mét của tàu, nội suy từ toạ độ ga theo km: dùng cho lưới Bắc-Nam / Đông-Tây
  function enAt(L, km) { const st = L.stations; let i = 0; while (i + 2 < st.length && st[i + 1].km < km) i++; const a = st[i], b = st[i + 1], t = clamp((km - a.km) / (b.km - a.km), -0.2, 1.2), lat = lerp(a.lat, b.lat, t), lon = lerp(a.lon, b.lon, t); return [lon * 111320 * Math.cos(lat * Math.PI / 180), lat * 110574]; }

  function draw(ctx, px, py, pw, ph, W, T, R) {
    const S = root.Sim, LAY = root.Layout, L = W.line, M = T.M;
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600, dark = !(hour > 6.3 && hour < 17.9);
    const cx = px + pw / 2, cy = py + ph / 2, Rr = Math.min(pw, ph) / 2 - 18, ky = Rr / VIEW_R, kx = ky * 5, kc = ky * 2;
    const len = T.veh.len, zOff = -len / 2;      // tâm đoàn tàu (zOff so với đầu tàu) ở giữa khung
    const km = z => S.kmOfS(T.x + z, W.dir, L.kmEnd);
    const heading = LAY.bearingAt(L, S, W.dir, T.x);
    const XBK0 = 105.9, xbQ = S.xbOf(W), xbOn = xbQ >= 0, xbL = z => S.xbLanes(W, T.x + z), xbReal = W.dir;
    const xbZJ = xbOn ? S.sOfKm(L.meta.junctions[xbQ].km, W.dir, L.kmEnd) - T.x : 0, xbZC = xbOn ? S.sOfKm(XBK0, W.dir, L.kmEnd) - T.x : 0;
    const fkQ = S.fkOf(W), fkOn = fkQ >= 0, fkL = z => S.fkLanes(W, T.x + z), fkFollow = S.fkFollows(W), fkZJ = fkOn ? S.sOfKm(L.meta.junctions[fkQ].km, W.dir, L.kmEnd) - T.x : 0;      // ngã rẽ Yamagata ở Fukushima (như cabview)
    const sts = []; M.forEach((m0, i) => { const gs = m0.sOrig !== undefined ? m0.sOrig : m0.s, m = gs === m0.s ? m0 : Object.assign({}, m0, { s: gs }), d = gs - T.x, dm = m0.s - T.x; if (d < -(xbOn && L.stations[m0.i].lay === LAY.TKS ? 3300 : L.stations[m0.i].lay === LAY.FUK ? 2300 : L.stations[m0.i].lay === LAY.OMA ? 3000 : 1300) || d > 1900) return; const key = W.lineId + ':' + m.i + ':' + W.dir + (W.termPick && W.termPick[m.i] !== undefined ? ':t' + W.termPick[m.i] : ''); const st = cache[key] || (cache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.dir, LAY.pickOf(L.stations[m.i], m.i, W))); sts.push({ m, i, d, dm, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')) }); });
    const xbHokUp = xbOn && W.lineId === 'hok' && xbReal === 'up';
    const ourPath = z => { if (xbHokUp && S.kmOfS(T.x + z, W.dir, L.kmEnd) >= XBK0) return xbL(z).B; let x = S.runLane(W, T.x + z) - S.runStep(W, T.x + z); for (const q of sts) { const forced = xbHokUp && q.st.code === LAY.TKS && !(q.stopHere && !q.m.mainStop), o = forced ? q.st.tracks.find(t => t.tks === 5) : q.st.ours; if (((q.stopHere && !q.m.mainStop) || forced) && !(fkFollow && q.st.code === LAY.FUK)) x += LAY.laneOf(o, T.x + z, q.m.s, LAY.laneW(o, T.x + z, q.m.s, fkFollow), LAY.spread(T.x + z, q.m.s), 1300, 720); if (q.st.detour && !(q.stopHere && !q.m.mainStop && !q.st.ours.main)) x += LAY.detourX(q.st, T.x + z, q.m.s); } return x; };      const mainXt = z => { let x = 0; for (const q of sts) if (q.st.detour) x += LAY.detourX(q.st, T.x + z, q.m.s); return x; };      // làn đường chính của ta (kể cả đoạn vòng Sendai chiều xuống) cho tàu khác cùng chiều
    const lane = ourPath(0) + S.runStep(W, T.x);
    const latT = LAY.lateralTable(L, S, W.dir, T.x, VIEW_R + 400, 10), latB = LAY.lateralTableBack(L, S, W.dir, T.x, len + VIEW_R + 400, 10);
    const off = z => { const tab = z >= 0 ? latT : latB, f = Math.abs(z) / 10, i = Math.min(tab.length - 2, Math.floor(f)); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); };      // z<0: đường phía sau tàu cũng cong khi tàu đang trong đường cong
    const hasSingle = !!(W.line.single && W.line.single.length);
    const oppAt0 = z => { let x = LAY.ADJ; for (const q of sts) x += (q.st.opp - LAY.ADJ) * LAY.spread(T.x + z, q.m.s); return hasSingle ? x * (1 - S.singleEff(W, T.x + z)) : x; };
    const oppAtX = z => { let x = oppAt0(z); for (const q of sts) if (q.st.oppDet) x += LAY.oppDetourX(q.st, T.x + z, q.m.s); return x; };
    const fkSide = z => fkFollow && (W.dir === 'down' ? z > fkZJ : z < fkZJ);      // phía đường Yamagata của ngã rẽ Fukushima (như cabview)
    // ---- Omagari (switchback): mạng đường riêng (Layout.om*), như cabview
    const omQ = LAY.OMA && W.sw ? sts.find(q => q.st.code === LAY.OMA) : null, omOn = !!omQ, omW = omOn ? W.sw : null, omPk = omOn ? { i: LAY.omPkCode(omW.ph, omW.lane) } : null, omBase = omOn ? omW.sM - T.x : 0;
    const omUz = z => omW.ph === 'A' ? LAY.OMU.buf - (z - omBase) : (z - omBase) + omW.ub, omZu = u => omW.ph === 'A' ? omBase + LAY.OMU.buf - u : omBase + u - omW.ub, omOppT = z => LAY.omRelOther(W.dir, omPk, Math.max(0, omUz(z))), omZr = (u0, u1) => { const a = omZu(u0), b = omZu(u1); return a < b ? [a, b] : [b, a]; };
    const oppAt = omOn ? omOppT : fkFollow ? (z => fkSide(z) ? oppAtX(z) + (S.fkOwnOpp(W, T.x + z) - LAY.ADJ) * (hasSingle ? 1 - S.singleEff(W, T.x + z) : 1) : oppAtX(z)) : oppAtX;      // làn ngược chiều (kể cả đoạn vòng Sendai chiều lên)       // đường đơn: đường ngược chiều nhập vào đường ta
    const Y = z => cy - (z - zOff) * ky, X = (xm, z) => cx - ((xm - lane + S.runStep(W, T.x + z)) * kx + off(z) * kc);
    const zLo = zOff - VIEW_R - 40, zHi = zOff + VIEW_R + 40;

    // ---- nền hình tròn: khoá hướng Bắc ở trên; bản vẽ bên dưới dựng trong hệ toạ độ của tàu (mũi tàu hướng lên) rồi xoay cả khối đúng bằng hướng đi hiện tại, nên đoàn tàu và đường ray xoay/uốn theo hướng thật
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, 7); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(heading * Math.PI / 180); ctx.translate(-cx, -cy);
    ctx.fillStyle = dark ? '#0b1118' : '#1c2a22'; ctx.fillRect(cx - Rr, cy - Rr, 2 * Rr, 2 * Rr);
    const runs = []; { let prev = null; for (let z = zLo - 20; z <= zHi + 20; z += 20) { const k = S.structAt(L, km(z)); if (k === prev) runs[runs.length - 1][1] = z + 20; else { runs.push([z, z + 20, k]); prev = k; } } }
    for (const [za, zb, k] of runs) { const y0 = Y(zb), y1 = Y(za); ctx.fillStyle = k === 'b' ? (dark ? '#0d2234' : '#2a4a66') : k === 'v' ? (dark ? '#161d26' : '#2c3640') : (dark ? '#0f1a14' : '#27402f'); ctx.fillRect(cx - Rr, y0, 2 * Rr, y1 - y0); }
    // cảnh vật thật OpenStreetMap (world.js): cách tàu ≤ ~8 m dùng tỉ lệ ngang phóng đại như đường ray, xa hơn dùng đúng tỉ lệ thật để toà nhà không bị kéo dãn
    if (root.World) { const D0 = 9, u = e => Math.abs(e) <= D0 ? e * kx : Math.sign(e) * (D0 * kx + (Math.abs(e) - D0) * ky);
      // lớp nền OSM chỉ vẽ lại khi tàu đi quá ~5 m (hoặc có dữ liệu mới / đổi cỡ): các khung ở giữa dùng lại ảnh đã vẽ, dịch theo quãng đường (đỡ vài ms mỗi khung ở khu đô thị)
      const key = W.lineId + W.dir + (dark ? 'n' : 'd') + Math.round(Rr), M2 = 8, side = Math.ceil(2 * Rr + 2 * M2); let tc = tvCache[key];
      if (!tc) tc = tvCache[key] = { cv: typeof document !== 'undefined' ? document.createElement('canvas') : null, x0: -1e9, ver: -1, lane: 0 };
      if (tc.cv && (Math.abs(T.x - tc.x0) > 5 || tc.ver !== root.World.version() || tc.cv.width !== side || Math.abs(lane - tc.lane) > 0.4)) {
        if (tc.cv.width !== side) { tc.cv.width = side; tc.cv.height = side; } const g = tc.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, side, side); g.save(); g.translate(-(cx - Rr - M2), -(cy - Rr - M2));
        root.World.drawTop(g, { lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, Tx: T.x, zLo, zHi, X: (e, z) => cx - (u(e - lane + S.runStep(W, T.x + z)) + off(z) * kc), Y, ky, dark }); g.restore(); tc.x0 = T.x; tc.ver = root.World.version(); tc.lane = lane; tc.cx = cx; tc.cy = cy; }
      if (tc.cv && tc.x0 > -1e8) ctx.drawImage(tc.cv, cx - Rr - M2, cy - Rr - M2 + (T.x - tc.x0) * ky);
      else root.World.drawTop(ctx, { lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, Tx: T.x, zLo, zHi, X: (e, z) => cx - (u(e - lane + S.runStep(W, T.x + z)) + off(z) * kc), Y, ky, dark }); }
    // lưới theo hướng địa lý (mỗi 100 m, song song Bắc-Nam và Đông-Tây): xoay cùng bản đồ để thấy hướng đi thay đổi
    { const [E0, N0] = enAt(L, km(0)), g = 100; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-heading * Math.PI / 180); ctx.strokeStyle = dark ? 'rgba(120,150,180,.12)' : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      for (let e = Math.ceil((E0 - 2 * Rr / ky) / g) * g; e < E0 + 2 * Rr / ky; e += g) { const x = (e - E0) * ky; ctx.beginPath(); ctx.moveTo(x, -2 * Rr); ctx.lineTo(x, 2 * Rr); ctx.stroke(); }
      for (let n = Math.ceil((N0 - 2 * Rr / ky) / g) * g; n < N0 + 2 * Rr / ky; n += g) { const y = -(n - N0) * ky; ctx.beginPath(); ctx.moveTo(-2 * Rr, y); ctx.lineTo(2 * Rr, y); ctx.stroke(); } ctx.restore(); }
    // đường: đá dăm + hai ray, theo đường cong
    const line = (xf, z0, z1, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); const stp = z1 - z0 > 300 ? 20 : 8; let z = z0; for (;;) { const zz = Math.min(z, z1), x = X(xf(zz), zz), y = Y(zz); if (zz === z0) ctx.moveTo(x, y); else ctx.lineTo(x, y); if (zz >= z1) break; z += stp; } ctx.stroke(); };
    const clipU = (lo, hi) => W.dir === 'down' ? [lo, Math.min(hi, xbZJ)] : [Math.max(lo, xbZJ), hi];
    const c0 = xbOn && W.lineId === 'hok' && xbReal === 'up' ? clipU(zLo, zHi) : [zLo, zHi], c1 = xbOn && W.lineId === 'hok' && xbReal !== 'up' ? clipU(zLo, zHi) : [zLo, zHi];
    const ours0 = () => 0, tracks = [[ours0, c0[0], c0[1]], [oppAt, c1[0], c1[1]]], low = [];
    if (fkFollow) tracks.splice(0, 2, [ours0, zLo, Math.min(zHi, fkZJ)], [ours0, Math.max(zLo, fkZJ), zHi], [oppAt, zLo, Math.min(zHi, fkZJ)], [oppAt, Math.max(zLo, fkZJ), zHi]);      // Hokuriku sau ngã rẽ: đường chính Joetsu không còn là đường của ta (xem cabview)
    for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x, a = (W.dir === 'down' ? sj : sj - 3200) + (jc.run && W.dir === 'down' ? 0.5 : 0), b = (W.dir === 'down' ? sj + 3200 : sj) - (jc.run && W.dir !== 'down' ? 0.5 : 0); if (b > zLo && a < zHi) { if (jc.xb && W.lineId === 'jts') low.push([z => xbL(z).A, Math.max(zLo, a), Math.min(zHi, b)]); else if (jc.fk && !fkFollow) { for (const k of ['A', 'B']) tracks.push([z => fkL(z)[k], Math.max(zLo, a), Math.min(zHi, b)]); } else tracks.push(...S.branchDeltas(W, jc).map(dl => [z => S.trunkOff(W, T.x + z) + dl, Math.max(zLo, a), Math.min(zHi, b)])); } }       // đường chính Tohoku tách khỏi tuyến mini; nút giao Takasaki: Hokuriku xuống rời đường chính (jts)
    if (xbOn) low.push([z => xbL(z).B, W.dir === 'down' ? Math.max(zLo, xbZC) : zLo, W.dir === 'down' ? zHi : Math.min(zHi, xbZC)]);      // đường nhánh dưới kéo dài = Hokuriku lên
    { const cutsM = [], cutsO = []; for (const q of sts) { const dt = q.st.detour, od = q.st.oppDet; if (dt) cutsM.push([q.d + dt.z0, q.d + dt.zEnd]); if (od) cutsO.push([q.d + od.zA, q.d + od.zB]); }      // Sendai: đoạn đường chính giữa chỗ rẽ vào đường ngoài và chỗ trả về không có ray
      if (cutsM.length || cutsO.length) { const cutOf = (m0, cuts) => { let segs = [[m0[1], m0[2]]]; for (const [ca, cb] of cuts) segs = segs.flatMap(([x, y]) => (cb <= x || ca >= y) ? [[x, y]] : [[x, Math.min(y, ca)], [Math.max(x, cb), y]].filter(g => g[1] > g[0])); return segs.map(([x, y]) => [m0[0], x, y]); }; const m0 = tracks[0], o0 = tracks[1]; tracks.splice(0, 2, ...cutOf(m0, cutsM), ...cutOf(o0, cutsO)); } }
    { const rc = S.runCfg(W); if (rc) { const zj = rc.sj - T.x, pre = (a, b) => [a, Math.min(b, zj - 0.5)], post = (a, b) => [Math.max(a, zj), b], np = [];      // ngã rẽ Akita chiều lên (như cabview)
      for (const p of tracks) { if (p[0] === ours0) { for (const f of [pre, post]) { const [a, b] = f(p[1], p[2]); if (b > a) np.push([p[0], a, b]); } } else np.push(p); } tracks.length = 0; tracks.push(...np); } }
    const dblSpans = (z0, z1, zj) => { const out = []; let st = null; for (let z = Math.floor(z0 / 25) * 25; z <= z1 + 25; z += 25) { const mini = W.dir === 'down' ? z > zj : z < zj, ok = mini && Math.abs(z - zj) > 350 && S.singleEff(W, T.x + z) < 0.999; if (ok && st === null) st = Math.max(z, z0); if ((!ok || z > z1) && st !== null) { const e = Math.min(z, z1); if (e > st) out.push([st, e]); st = null; } } return out; };      // đoạn đường đôi ở phía mini (Akita: Omagari – Akita km 586–600): làn ngược chiều vẫn có ray, chỉ bỏ 350 m đầu sau ngã rẽ và đoạn đường đơn
    { const rj = S.runJn(W); if (rj) { const zj = rj.sj - T.x, np = [];      // ngã rẽ Akita: làn ngược chiều của đường mini chỉ có tới ngã rẽ (như cabview)
      for (const p of tracks) { if (p[0] === oppAt) { const [a, b] = W.dir === 'down' ? [p[1], Math.min(p[2], zj)] : [Math.max(p[1], zj), p[2]]; if (b > a) np.push([p[0], a, b]); for (const [a2, b2] of dblSpans(p[1], p[2], zj)) np.push([p[0], a2, b2]); } else np.push(p); } tracks.length = 0; tracks.push(...np); } }
    for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; if (t.in0 !== undefined) { let za = q.d - t.in0, zb = q.d + t.out0 + (t.len2 || t.len); if (xbOn && t.tks === 5) { if (W.dir === 'down') zb = Math.min(zb, xbZC); else za = Math.max(za, xbZC); } if (fkOn && t.fkr) { if (W.dir === 'down') zb = Math.min(zb, fkZJ); else za = Math.max(za, fkZJ); } tracks.push([z => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)), Math.max(zLo, za), Math.min(zHi, zb)]); } }
    for (const q of sts) for (const xv of LAY.xovers(L.stations[q.m.i], W.dir, false)) { const zc = q.d + xv.z; if (zc + 150 < zLo || zc > zHi) continue; const sm = z => LAY.smooth(0, 1, (z - zc) / 150), a = [z => lerp(0, oppAt(z), sm(z)), z => lerp(oppAt(z), 0, sm(z))]; for (const k of LAY.xoLines(xv)) tracks.push([a[k], Math.max(zLo, zc), Math.min(zHi, zc + 150)]); }       // ghi chữ X nối hai đường chính ở hai đầu mỗi ga (như khung nhìn buồng lái)
    for (const q of sts) for (const lk of LAY.linksOf(q.st, false)) { const zc = q.d + lk.z; if (zc + lk.len < zLo || zc > zHi) continue; const lx = t => t.main ? (t === q.st.oppT ? oppAt0 : () => 0) : z => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)), fa = lx(lk.a), fb = lx(lk.b); tracks.push([z => lerp(fa(z), fb(z), LAY.smooth(0, 1, (z - zc) / lk.len)), Math.max(zLo, zc), Math.min(zHi, zc + lk.len)]); }
    if (omOn) { tracks.length = 0; const OU = LAY.OMU, ez = omZr(0, OU.end), a0 = Math.max(zLo, ez[0]), b0 = Math.min(zHi, ez[1]); if (b0 > a0) tracks.push([ours0, a0, b0]);
      for (const [u0, u1] of [[0, OU.merge[1]], [OU.split[0], OU.endOpp]]) { const r = omZr(u0, u1), a = Math.max(zLo, r[0]), b = Math.min(zHi, r[1]); if (b > a) tracks.push([omOppT, a, b]); }
      { const r = omZr(OU.xo[0], OU.xo[1]), a = Math.max(zLo, r[0]), b = Math.min(zHi, r[1]); if (b > a) tracks.push([z => LAY.omRelTrack(W.dir, omPk, 'X', omUz(z)), a, b]); } }      // Omagari: đường của ta, làn còn lại, ghi chéo K → L
    const drawLow = () => { for (const [xf, z0, z1] of low) if (z1 > z0) line(xf, z0, z1, Math.max(3, kx * 2.6), dark ? '#1b2229' : '#464b4d'); for (const [xf, z0, z1] of low) if (z1 > z0) for (const sx of [-0.72, 0.72]) line(z => xf(z) + sx, z0, z1, 1.2, dark ? '#7a8594' : '#d2d9e0'); };
    if (low.length) drawLow();
    if (xbHokUp) for (const sx of [-0.72, 0.72]) line(z => ourPath(z) + sx, zOff - len, zHi, 1.2, (root.NatMap && root.NatMap.playerCol(W, T)) || '#4aa3ff');
    // mặt cầu cạn Joetsu (nút giao Takasaki): phủ cả hai đường chính Joetsu, đè lên đường Hokuriku nằm dưới
    const deckRuns = [];
    if (xbOn) { const Lj = S.lineOf('jts'), ok = z => false && (W.lineId === 'jts' || (W.dir === 'down' ? z > xbZJ : z < xbZJ)) && S.structAt(Lj, S.kmOfS(T.x + z, W.dir, L.kmEnd)) === 'v'; for (let z = zLo; z <= zHi; z += 20) if (ok(z)) { if (deckRuns.length && deckRuns[deckRuns.length - 1][1] >= z - 0.1) deckRuns[deckRuns.length - 1][1] = z + 20; else deckRuns.push([z, z + 20]); } }
    if (deckRuns.length) { const eA = z => { const l = xbL(z); return Math.max(l.jD, l.jU) + 3.2; }, eB = z => { const l = xbL(z); return Math.min(l.jD, l.jU) - 3.2; };
      for (const [za, zb] of deckRuns) { const zs = []; for (let z = za; z <= zb + 0.01; z += 20) zs.push(Math.min(z, zb)); ctx.fillStyle = dark ? 'rgba(96,108,122,.92)' : 'rgba(146,156,168,.92)'; ctx.beginPath(); zs.forEach((z, i) => { const x = X(eA(z), z), y = Y(z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); for (let i = zs.length - 1; i >= 0; i--) ctx.lineTo(X(eB(zs[i]), zs[i]), Y(zs[i])); ctx.closePath(); ctx.fill(); ctx.strokeStyle = dark ? '#7e8c9c' : '#6a7480'; ctx.lineWidth = 1.2; ctx.stroke(); } }
    for (const [xf, z0, z1] of tracks) if (z1 > z0) line(xf, z0, z1, Math.max(3, kx * 2.6), dark ? '#1b2229' : '#464b4d');
    // tường bao quanh ga (bê tông + tấm chắn): hai bên phạm vi sân ga; đoạn cổ ga là hàng rào mảnh hơn
    for (const q of sts) { const ex = q.st.extent, w = z => LAY.spread(T.x + z, q.m.s), tk = q.st.tracks.filter(t => !t.main), zS = q.d - 1050, zE = q.d + 480, wf = z => LAY.smooth(zS, zS + 150, z) * (1 - LAY.smooth(zE - 150, zE, z)), eL = z => Math.max(lerp(Math.max(0, oppAt(z)) + 2.9, ex[1] + 1.4, wf(z)), ...tk.map(t => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)) + 3.6)), eR = z => Math.min(lerp(Math.min(0, oppAt(z)) - 2.9, ex[0] - 1.4, wf(z)), ...tk.map(t => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)) - 3.6));
      for (const f of [eL, eR]) { line(f, Math.max(zLo, q.d - 1150), Math.min(zHi, q.d + 630), 2, dark ? 'rgba(120,130,140,.55)' : 'rgba(150,158,166,.7)'); line(f, Math.max(zLo, q.d - 450), Math.min(zHi, q.d + 60), 4, dark ? '#59626d' : '#8d96a0'); } }
    for (const q of sts) { const z0 = q.d - q.st.pb, z1 = q.d + q.st.pf; if (z1 < zLo || z0 > zHi) continue; for (const p of q.st.plats) { const za = Math.min(z1, zHi), zb = Math.max(z0, zLo), n = Math.max(2, Math.ceil((za - zb) / 20)), zs = Array.from({ length: n + 1 }, (_, i) => zb + (za - zb) * i / n);   // sân ga uốn theo đường cong: mỗi mép là một đường gấp khúc
        const edge = e => zs.map(z => [cx - (e - lane + S.runStep(W, T.x + z)) * kx - off(z) * kc, Y(z)]); ctx.fillStyle = dark ? '#3a4658' : '#8c98a6'; ctx.beginPath(); edge(p.xb).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); edge(p.xa).reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d8b838'; ctx.lineWidth = 1.4; for (const e of [p.xa, p.xb]) if (q.st.tracks.some(t => Math.abs(Math.abs(t.x - e) - 1.75) < 0.01)) { ctx.beginPath(); edge(e).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); } }
      const ys = Y(q.dm); if (ys > cy - Rr && ys < cy + Rr) { ctx.fillStyle = '#4cd68a'; ctx.fillRect(cx - (q.st.ours.x - lane + S.runStep(W, T.x + q.d)) * kx - off(q.d) * kc - 9, ys - 1, 18, 2); } }
    // điểm cứu hộ (定点) trong hầm Seikan: hai sân ga hẹp ngoài hai đường chính và tên điểm
    for (const rf of L.meta.refugeInfo || []) { const zc = S.sOfKm(rf.km, W.dir, L.kmEnd) - T.x, za = Math.max(zc - 130, zLo), zb = Math.min(zc + 130, zHi); if (zb <= za) continue;
      const wpx = Math.max(2, kx * 1.3); line(() => 3.0, za, zb, wpx, 'rgba(76,214,138,.9)'); line(z => oppAt(z) - 3.0, za, zb, wpx, 'rgba(76,214,138,.9)');
      const ys = Y(zc); if (ys > cy - Rr + 8 && ys < cy + Rr - 8) { ctx.fillStyle = '#7ff0b2'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; const nm = LAY.refugeName(rf); ctx.fillText(nm.name, X(oppAt(zc) - 3.0, zc) - 8 - ctx.measureText(nm.name).width, ys + 4); if (nm.kana) { ctx.font = '8px system-ui'; ctx.fillText(nm.kana, X(oppAt(zc) - 3.0, zc) - 8 - ctx.measureText(nm.kana).width, ys - 6); } ctx.textAlign = 'start'; } }
    const rail = (xf, z0, z1, col) => { for (const sx of [-0.72, 0.72]) line(z => xf(z) + sx, z0, z1, 1.2, col); };
    for (const [xf, z0, z1] of tracks) if (z1 > z0) rail(xf, z0, z1, dark ? '#7a8594' : '#d2d9e0');
    if (!(xbHokUp && deckRuns.length)) rail(ourPath, zOff - len, zHi, (root.NatMap && root.NatMap.playerCol(W, T)) || '#4aa3ff');      // ray của ta luôn theo màu chính thức của tuyến đang lái (xanh biển nếu chưa có dữ liệu)
    for (const q of sts) for (const xv of LAY.xovers(L.stations[q.m.i], W.dir, false)) { const zc = q.d + xv.z; if (zc + 150 < zLo || zc > zHi) continue; const sm = u => { const t = clamp(u, 0, 1); return t * t * (3 - 2 * t); }, a = [z => lerp(0, oppAt(z), sm((z - zc) / 150)), z => lerp(oppAt(z), 0, sm((z - zc) / 150))];
      for (const k of LAY.xoLines(xv)) rail(a[k], zc, zc + 150, dark ? '#7a8594' : '#d2d9e0'); }
    for (const z of S.turnoutZones(T)) { const a = z.s0 - T.x, b = z.s1 - T.x; if (b < zLo || a > zHi) continue; ctx.fillStyle = 'rgba(255,194,71,.10)'; ctx.fillRect(cx - Rr, Y(Math.min(b, zHi)), 2 * Rr, Y(Math.max(a, zLo)) - Y(Math.min(b, zHi))); }
    for (const [za, zb, k] of runs) if (k === 't') { const y0 = Y(zb), y1 = Y(za); ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(cx - Rr, y0, 2 * Rr, y1 - y0); }     // hầm: tối đi như khung 2D

    // ---- đoàn tàu: từng toa là ảnh nhìn từ trên (đầu / giữa / đuôi), bám đường đi, màu theo mẫu tàu
    const sprOf = veh => { const k = SPR[veh.key] || 'n700', o = R.tops && R.tops[k]; return { k, o }; };
    const consist = (pathFn, zFront, veh, rev, head, gx) => {
      if (veh.parts) { const order = rev ? veh.parts.slice().reverse() : veh.parts; let z = zFront; for (const pk of order) { const pv = S.VEH[pk]; consist(pathFn, z, pv, rev, head && pk === order[0]); z -= pv.len + veh.gap + (gx || 0); } return; }      // đoàn ghép: vẽ từng đoàn, mỗi đoàn một màu
      const n = veh.cars || 8, cl = veh.len / n, w = Math.max(4, kx * 3.3), { k, o } = sprOf(veh);
      for (let i = 0; i < n; i++) { const z1 = zFront - i * cl, z2 = z1 - cl; if (z1 < zLo || z2 > zHi) continue; const xa = X(pathFn(z1), z1), xb = X(pathFn(z2), z2), ya = Y(z1), yb = Y(z2), dx = xa - xb, dy = ya - yb, ln = Math.hypot(dx, dy) + 0.6;
        const part = i === 0 ? 'head' : i === n - 1 ? 'tail' : 'mid', im = o && o[part] && o[part].ready ? o[part].img : null;
        ctx.save(); ctx.translate((xa + xb) / 2, (ya + yb) / 2); ctx.rotate(Math.atan2(dx, -dy) + (rev ? Math.PI : 0));
        if (im) { ctx.imageSmoothingEnabled = true; ctx.drawImage(im, -w / 2, -ln / 2, w, ln); } else { ctx.fillStyle = COL[k] || '#dde3e8'; ctx.fillRect(-w / 2, -ln / 2 + 0.3, w, ln - 0.6); if (i === 0) { ctx.fillStyle = 'rgba(40,90,170,.75)'; ctx.fillRect(-w / 2, -ln / 2 + 0.3, w, Math.max(2, ln * 0.35)); } }      // mẫu chưa có ảnh nhìn từ trên (E2...): thân sáng, đầu tàu tô xanh để phân biệt, không còn dùng màu cũ (tối)
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -ln / 2, w, ln);
        ctx.restore(); }
      if (head) { const xh = X(pathFn(zFront), zFront), yh = Y(zFront); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(xh, yh - 7); ctx.lineTo(xh - 4, yh); ctx.lineTo(xh + 4, yh); ctx.closePath(); ctx.fill(); } };
    const Ld = W.lead; if (Ld && Ld.phase !== 'end') { const zf = Ld.x - T.x;
      const leadPath = z => { let x = Ld.fj !== undefined ? S.trunkOff(W, T.x + z, Ld.fj) + S.leadDelta(W) : 0; for (const q of sts) { const stops = Ld.M.some(m => m.i === q.m.i && (m.stop || Ld.phase === 'dwell' && Math.abs(m.s - Ld.x) < 60)); if (!stops) { if (q.st.detour) x += LAY.detourX(q.st, T.x + z, q.m.s); continue; } const other = q.st.tracks.find(t => t.own && !t.thr && t !== q.st.ours && q.st.stops.includes(t)); x += (other || q.st.ours).x * LAY.trackW(other || q.st.ours, T.x + z, q.m.s); } return x; };
      if (zf > zLo && zf - Ld.veh.len < zHi) consist(leadPath, zf, Ld.veh, false, false); }
    if ((T.v > 20 || W.oppCat) && !S.oppHidden(W, T)) for (const t0 of W.opposing || []) { const zN = (t0 - W.t) * 200, ov = S.VEH[S.oppKey(W, T, t0)]; if (zN < zHi && zN + ov.len > zLo) consist(z => oppAt(Math.max(0, z)), zN + ov.len, ov, true, false); }
    for (const h of W.heldOpp || []) { const hv = S.VEH[h.key] || S.VEH.N700, zN = h.sC - hv.len / 2 - T.x; if (zN < zHi && zN + hv.len > zLo) consist(z => oppAt(Math.max(0, z)), zN + hv.len, hv, true, false); }      // tàu ngược chiều bị giữ (động đất...) dừng giữa hai ga
    { const ob = W.obs; if (ob && ob.key && !ob.dw && S.VEH[ob.key]) { const ov = S.VEH[ob.key], zf = ob.x + ob.v * (W.t - ob.t) - T.x; if (zf > zLo && zf - ov.len < zHi) consist(mainXt, zf, ov, false, false); } }      // tàu cùng chiều chạy/dừng phía trước (vật cản ATC)
    if (T.phase === 'dwell') { const qk = sts.find(q => q.m.i === T.M[T.k].i), thr = qk && qk.st.tracks.find(t => !t.own && (t.thr || t.main)); if (thr) for (const o of W.oppThru || []) { const ov = S.VEH[o.v] || S.VEH.N700, pd = S.oppThruDur(W, T.k, ov.len), u = (W.t - (o.t - pd / 2)) / pd; if (u > 0 && u < 1) { const zN = S.oppThruZ(u, ov.len); if (zN < zHi && zN + ov.len > zLo) consist(() => thr.x, zN + ov.len, ov, true, false); } } }      // tàu ngược chiều thông qua ga ta đang đỗ
    for (const pk of W.parked || []) { const pv = S.VEH[pk.key], zf = pk.front - T.x; if (zf > zLo && zf - pv.len < zHi) { const qL = sts.find(q => Math.abs(q.m.s - pk.front) < 400), px0 = qL ? qL.st.ours.x : 0; consist(pk.jn !== undefined ? (z => px0 + S.trunkOff(W, T.x + z, pk.jn) + S.branchLane0(W, pk.jn)) : () => px0, zf, pv, false, false); } }      // đoàn Tohoku đợi ghép / phần đã tách ở lại
    for (const sb of W.stabled || []) { const pv = S.VEH[sb.key], zf = sb.front - T.x; if (zf > zLo && zf - pv.len < zHi) { const tk = sb.track, qs = sts.find(q => q.m.i === sb.i); consist(qs && tk.in0 !== undefined ? z => tk.plain + (tk.x - tk.plain) * LAY.trackW(tk, T.x + z, qs.m.s) : () => tk.x, zf, pv, sb.face !== 1, false); } }
    if (T.phase === 'dwell') for (const p of S.passersAt(W, T.k)) { const pv = S.VEH[p.v] || S.VEH.N700, pd = S.passDur(W, T.k, pv.len), u = (W.t - (p.t - pd / 2)) / pd; if (u > 0 && u < 1) { const zf = -pv.len + u * (pv.len + 520); consist(() => 0, zf, pv, false, false); } }
    consist(ourPath, 0, T.veh, false, true, T.gapX || 0);
    ctx.restore();

    // ---- viền, vòng la bàn (xoay theo hướng) và nhãn
    ctx.strokeStyle = '#6b7684'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, Rr + 1.5, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy);
    for (let b = 0; b < 360; b += 15) { const th = b * Math.PI / 180, major = b % 45 === 0, r0 = Rr + 3, r1 = Rr + (major ? 9 : 6); ctx.strokeStyle = b === 0 ? '#ff5a5a' : major ? '#c8d4e2' : '#6f8096'; ctx.lineWidth = major ? 2 : 1; ctx.beginPath(); ctx.moveTo(Math.sin(th) * r0, -Math.cos(th) * r0); ctx.lineTo(Math.sin(th) * r1, -Math.cos(th) * r1); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    CARD.forEach((name, i) => { const th = i * 45 * Math.PI / 180, rr = Rr + 16, x = Math.sin(th) * rr, y = -Math.cos(th) * rr; ctx.font = (i % 2 === 0 ? 'bold 12px' : '10px') + ' system-ui'; ctx.fillStyle = i === 0 ? '#ff6a6a' : i % 2 === 0 ? '#e8eef5' : '#8aa0b5'; ctx.fillText(name, x, y); });
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    const card8 = CARD[Math.round(heading / 45) % 8];
    ctx.fillStyle = '#a9bacb'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(_t('Hướng ') + Math.round(heading) + '° (' + card8 + ')', px + 8, py + ph - 8); ctx.textAlign = 'right'; ctx.fillText(_t('bán kính ') + VIEW_R + ' m', px + pw - 8, py + ph - 8);
  }
  root.TopView = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
