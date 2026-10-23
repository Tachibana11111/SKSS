// Bản đồ nhỏ nhìn từ trên xuống (minimap): hình tròn, tàu của ta ở giữa và luôn hướng lên trên; bản đồ XOAY theo hướng địa lý của tuyến,
// vòng la bàn ngoài rìa (N, NE, E, SE, S, SW, W, NW) xoay theo: tàu đi về phía bắc thì chữ N ở trên cùng, đi về phía đông thì chữ E ở trên cùng.
// Hướng địa lý lấy từ toạ độ ga (layout.js bearingAt). Toa tàu là ảnh nhìn từ trên (đầu / giữa / đuôi) tô màu theo mẫu tàu; mỗi toa bám theo đường đi.
// Tỉ lệ dọc đúng thật (bán kính nhìn 260 m); chiều ngang phóng đại ~5 lần để thấy rõ khoảng cách giữa các đường.
(function (root) {
  const VIEW_R = 260;                         // bán kính nhìn (m) tính từ tâm đoàn tàu
  const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const SPR = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5', E7: 'e7', H5: 'h5', E6: 'e6', E8: 'e8', T4: 't4', E926: 'e926', 'E5+E6': 'e5', 'E5+E8': 'e5', 'E6+E5': 'e6', 'E8+E5': 'e8', 'N700S-6': 'n700s' };
  const COL = { n700: '#e4eaf1', n700s: '#eaf0f6', s800: '#d9dde2', e5: '#27a07f' };
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
    const sts = []; M.forEach((m0, i) => { const gs = m0.sOrig !== undefined ? m0.sOrig : m0.s, m = gs === m0.s ? m0 : Object.assign({}, m0, { s: gs }), d = gs - T.x, dm = m0.s - T.x; if (d < -1300 || d > 1900) return; const key = W.lineId + ':' + m.i + ':' + W.dir + (W.termPick && W.termPick[m.i] !== undefined ? ':t' + W.termPick[m.i] : ''); const st = cache[key] || (cache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.dir, LAY.pickOf(L.stations[m.i], m.i, W))); sts.push({ m, i, d, dm, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')) }); });
    const ourPath = z => { let x = 0; for (const q of sts) if (q.stopHere && !q.m.mainStop) x += LAY.laneOf(q.st.ours, T.x + z, q.m.s, LAY.trackW(q.st.ours, T.x + z, q.m.s), LAY.spread(T.x + z, q.m.s), 1300, 720); return x; };
    const lane = ourPath(0);
    const latT = LAY.lateralTable(L, S, W.dir, T.x, VIEW_R + 400, 10), latB = LAY.lateralTableBack(L, S, W.dir, T.x, len + VIEW_R + 400, 10);
    const off = z => { const tab = z >= 0 ? latT : latB, f = Math.abs(z) / 10, i = Math.min(tab.length - 2, Math.floor(f)); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); };      // z<0: đường phía sau tàu cũng cong khi tàu đang trong đường cong
    const hasSingle = !!(W.line.single && W.line.single.length);
    const oppAt = z => { let x = LAY.ADJ; for (const q of sts) x += (q.st.opp - LAY.ADJ) * LAY.spread(T.x + z, q.m.s); return hasSingle ? x * (1 - S.singleEff(W, T.x + z)) : x; };       // đường đơn: đường ngược chiều nhập vào đường ta
    const Y = z => cy - (z - zOff) * ky, X = (xm, z) => cx - ((xm - lane) * kx + off(z) * kc);
    const zLo = zOff - VIEW_R - 40, zHi = zOff + VIEW_R + 40;

    // ---- nền hình tròn (tàu luôn hướng lên)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, 7); ctx.clip();
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
        root.World.drawTop(g, { lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, Tx: T.x, zLo, zHi, X: (e, z) => cx - (u(e - lane) + off(z) * kc), Y, ky, dark }); g.restore(); tc.x0 = T.x; tc.ver = root.World.version(); tc.lane = lane; tc.cx = cx; tc.cy = cy; }
      if (tc.cv && tc.x0 > -1e8) ctx.drawImage(tc.cv, cx - Rr - M2, cy - Rr - M2 + (T.x - tc.x0) * ky);
      else root.World.drawTop(ctx, { lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, Tx: T.x, zLo, zHi, X: (e, z) => cx - (u(e - lane) + off(z) * kc), Y, ky, dark }); }
    // lưới theo hướng địa lý (mỗi 100 m, song song Bắc-Nam và Đông-Tây): xoay cùng bản đồ để thấy hướng đi thay đổi
    { const [E0, N0] = enAt(L, km(0)), g = 100; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-heading * Math.PI / 180); ctx.strokeStyle = dark ? 'rgba(120,150,180,.12)' : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      for (let e = Math.ceil((E0 - 2 * Rr / ky) / g) * g; e < E0 + 2 * Rr / ky; e += g) { const x = (e - E0) * ky; ctx.beginPath(); ctx.moveTo(x, -2 * Rr); ctx.lineTo(x, 2 * Rr); ctx.stroke(); }
      for (let n = Math.ceil((N0 - 2 * Rr / ky) / g) * g; n < N0 + 2 * Rr / ky; n += g) { const y = -(n - N0) * ky; ctx.beginPath(); ctx.moveTo(-2 * Rr, y); ctx.lineTo(2 * Rr, y); ctx.stroke(); } ctx.restore(); }
    // đường: đá dăm + hai ray, theo đường cong
    const line = (xf, z0, z1, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); const stp = z1 - z0 > 300 ? 20 : 8; let z = z0; for (;;) { const zz = Math.min(z, z1), x = X(xf(zz), zz), y = Y(zz); if (zz === z0) ctx.moveTo(x, y); else ctx.lineTo(x, y); if (zz >= z1) break; z += stp; } ctx.stroke(); };
    const tracks = [[() => 0, zLo, zHi], [oppAt, zLo, zHi]];
    for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x, a = W.dir === 'down' ? sj : sj - 3200, b = W.dir === 'down' ? sj + 3200 : sj; if (b > zLo && a < zHi) tracks.push([z => S.trunkOff(W, T.x + z), Math.max(zLo, a), Math.min(zHi, b)], [z => S.trunkOff(W, T.x + z) + LAY.ADJ, Math.max(zLo, a), Math.min(zHi, b)]); }       // đường chính Tohoku tách khỏi tuyến mini
    for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; if (t.in0 !== undefined) tracks.push([z => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)), Math.max(zLo, q.d - t.in0), Math.min(zHi, q.d + t.out0 + t.len)]); }
    for (const q of sts) for (const zc of [q.d - 1300, q.d + 720]) { if (zc + 150 < zLo || zc > zHi) continue; const sm = z => LAY.smooth(0, 1, (z - zc) / 150); tracks.push([z => lerp(0, oppAt(z), sm(z)), Math.max(zLo, zc), Math.min(zHi, zc + 150)], [z => lerp(oppAt(z), 0, sm(z)), Math.max(zLo, zc), Math.min(zHi, zc + 150)]); }       // ghi chữ X nối hai đường chính ở hai đầu mỗi ga (như khung nhìn buồng lái)
    for (const [xf, z0, z1] of tracks) if (z1 > z0) line(xf, z0, z1, Math.max(3, kx * 2.6), dark ? '#1b2229' : '#464b4d');
    // tường bao quanh ga (bê tông + tấm chắn): hai bên phạm vi sân ga; đoạn cổ ga là hàng rào mảnh hơn
    for (const q of sts) { const tk = q.st.tracks.filter(t => !t.main), appL = Math.max(480, tk.length ? Math.max(...tk.map(t => t.in0 || 0)) + 40 : 0), depL = Math.max(120, tk.length ? Math.max(...tk.map(t => (t.out0 || 0) + (t.len || 0))) + 40 : 0), wf = z => LAY.smooth(q.d - appL - 150, q.d - appL, z) * (1 - LAY.smooth(q.d + depL, q.d + depL + 150, z)),
        exL = Math.max(...q.st.plats.map(p => p.xb + 1.4), ...q.st.tracks.map(t => t.x + 4.1)), exR = Math.min(...q.st.plats.map(p => p.xa - 1.4), ...q.st.tracks.map(t => t.x - 4.1)),
        tkL = z => Math.max(Math.max(0, oppAt(z)) + 2.9, ...tk.map(t => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)) + 2.9)) + 1.2, tkR = z => Math.min(Math.min(0, oppAt(z)) - 2.9, ...tk.map(t => lerp(t.plain, t.x, LAY.trackW(t, T.x + z, q.m.s)) - 2.9)) - 1.2,
        eL = z => Math.max(lerp(tkL(z), exL, wf(z)), tkL(z)), eR = z => Math.min(lerp(tkR(z), exR, wf(z)), tkR(z));      // rào cố định: giữ bề rộng sân ga và các đường ngoài cùng suốt đoạn rào, thu lại êm ở hai đầu (như khung nhìn buồng lái)
      for (const f of [eL, eR]) { line(f, Math.max(zLo, q.d - appL - 150), Math.min(zHi, q.d + depL + 150), 2, dark ? 'rgba(120,130,140,.55)' : 'rgba(150,158,166,.7)'); line(f, Math.max(zLo, q.d - 450), Math.min(zHi, q.d + 60), 4, dark ? '#59626d' : '#8d96a0'); } }
    for (const q of sts) { const z0 = q.d - 420, z1 = q.d + 20; if (z1 < zLo || z0 > zHi) continue; for (const p of q.st.plats) { const za = Math.min(z1, zHi), zb = Math.max(z0, zLo), n = Math.max(2, Math.ceil((za - zb) / 20)), zs = Array.from({ length: n + 1 }, (_, i) => zb + (za - zb) * i / n);   // sân ga uốn theo đường cong: mỗi mép là một đường gấp khúc
        const edge = e => zs.map(z => [cx - (e - lane) * kx - off(z) * kc, Y(z)]); ctx.fillStyle = dark ? '#3a4658' : '#8c98a6'; ctx.beginPath(); edge(p.xb).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); edge(p.xa).reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d8b838'; ctx.lineWidth = 1.4; for (const e of [p.xa, p.xb]) if (q.st.tracks.some(t => Math.abs(Math.abs(t.x - e) - 1.75) < 0.01)) { ctx.beginPath(); edge(e).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); } }
      const ys = Y(q.dm); if (ys > cy - Rr && ys < cy + Rr) { ctx.fillStyle = '#4cd68a'; ctx.fillRect(cx - (q.st.ours.x - lane) * kx - off(q.d) * kc - 9, ys - 1, 18, 2); } }
    const rail = (xf, z0, z1, col) => { for (const sx of [-0.72, 0.72]) line(z => xf(z) + sx, z0, z1, 1.2, col); };
    for (const [xf, z0, z1] of tracks) if (z1 > z0) rail(xf, z0, z1, dark ? '#7a8594' : '#d2d9e0');
    rail(ourPath, zOff - len, zHi, '#4aa3ff');
    for (const q of sts) for (const zc of [q.d - 1300, q.d + 720]) { if (zc + 150 < zLo || zc > zHi) continue; const sm = u => { const t = clamp(u, 0, 1); return t * t * (3 - 2 * t); };
      rail(z => lerp(0, oppAt(z), sm((z - zc) / 150)), zc, zc + 150, dark ? '#7a8594' : '#d2d9e0'); rail(z => lerp(oppAt(z), 0, sm((z - zc) / 150)), zc, zc + 150, dark ? '#7a8594' : '#d2d9e0'); }
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
        if (im) { ctx.imageSmoothingEnabled = true; ctx.drawImage(im, -w / 2, -ln / 2, w, ln); } else { ctx.fillStyle = COL[k]; ctx.fillRect(-w / 2, -ln / 2 + 0.3, w, ln - 0.6); }
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -ln / 2, w, ln);
        ctx.restore(); }
      if (head) { const xh = X(pathFn(zFront), zFront), yh = Y(zFront); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(xh, yh - 7); ctx.lineTo(xh - 4, yh); ctx.lineTo(xh + 4, yh); ctx.closePath(); ctx.fill(); } };
    const Ld = W.lead; if (Ld && Ld.phase !== 'end') { const zf = Ld.x - T.x;
      const leadPath = z => { let x = Ld.fj !== undefined ? S.trunkOff(W, T.x + z, Ld.fj) : 0; for (const q of sts) { const stops = Ld.M.some(m => m.i === q.m.i && (m.stop || Ld.phase === 'dwell' && Math.abs(m.s - Ld.x) < 60)); if (!stops) continue; const other = q.st.tracks.find(t => t.own && !t.thr && t !== q.st.ours && q.st.stops.includes(t)); x += (other || q.st.ours).x * LAY.trackW(other || q.st.ours, T.x + z, q.m.s); } return x; };
      if (zf > zLo && zf - Ld.veh.len < zHi) consist(leadPath, zf, Ld.veh, false, false); }
    if (T.v > 20 && !S.oppHidden(W, T)) for (const t0 of W.opposing || []) { const zN = (t0 - W.t) * 200, ov = S.VEH[S.oppKey(W, T, t0)]; if (zN < zHi && zN + ov.len > zLo) consist(z => oppAt(Math.max(0, z)), zN + ov.len, ov, true, false); }
    for (const pk of W.parked || []) { const pv = S.VEH[pk.key], zf = pk.front - T.x; if (zf > zLo && zf - pv.len < zHi) { const qL = sts.find(q => Math.abs(q.m.s - pk.front) < 400), px0 = qL ? qL.st.ours.x : 0; consist(() => px0, zf, pv, false, false); } }      // đoàn Tohoku đợi ghép / phần đã tách ở lại
    for (const sb of W.stabled || []) { const pv = S.VEH[sb.key], zf = sb.front - T.x; if (zf > zLo && zf - pv.len < zHi) consist(() => sb.track.x, zf, pv, sb.face !== 1, false); }
    if (T.phase === 'dwell' && W.passers && W.passers[T.k]) for (const p of W.passers[T.k]) { const u = (W.t - (p.t - 4.5)) / 9; if (u > 0 && u < 1) { const pv = S.VEH[p.v] || S.VEH.N700, zf = -pv.len + u * (pv.len + 520); consist(() => 0, zf, pv, false, false); } }
    consist(ourPath, 0, T.veh, false, true, T.gapX || 0);
    ctx.restore();

    // ---- viền, vòng la bàn (xoay theo hướng) và nhãn
    ctx.strokeStyle = '#6b7684'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, Rr + 1.5, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy);
    for (let b = 0; b < 360; b += 15) { const th = (b - heading) * Math.PI / 180, major = b % 45 === 0, r0 = Rr + 3, r1 = Rr + (major ? 9 : 6); ctx.strokeStyle = b === 0 ? '#ff5a5a' : major ? '#c8d4e2' : '#6f8096'; ctx.lineWidth = major ? 2 : 1; ctx.beginPath(); ctx.moveTo(Math.sin(th) * r0, -Math.cos(th) * r0); ctx.lineTo(Math.sin(th) * r1, -Math.cos(th) * r1); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    CARD.forEach((name, i) => { const th = (i * 45 - heading) * Math.PI / 180, rr = Rr + 16, x = Math.sin(th) * rr, y = -Math.cos(th) * rr; ctx.font = (i % 2 === 0 ? 'bold 12px' : '10px') + ' system-ui'; ctx.fillStyle = i === 0 ? '#ff6a6a' : i % 2 === 0 ? '#e8eef5' : '#8aa0b5'; ctx.fillText(name, x, y); });
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    const card8 = CARD[Math.round(heading / 45) % 8];
    ctx.fillStyle = '#a9bacb'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Hướng ' + Math.round(heading) + '° (' + card8 + ')', px + 8, py + ph - 8); ctx.textAlign = 'right'; ctx.fillText('bán kính ' + VIEW_R + ' m', px + pw - 8, py + ph - 8);
  }
  root.TopView = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
