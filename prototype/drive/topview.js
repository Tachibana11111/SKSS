// Góc nhìn từ trên cao thẳng xuống (sơ đồ): tàu của ta ở giữa khung, hướng lên trên, tầm nhìn ±750 m (tổng 1,5 km).
// Chiều ngang phóng to (đường ray cách nhau 4,3 m vẫn nhìn rõ) nên đây là SƠ ĐỒ, không đúng tỉ lệ ngang/dọc. Vào hầm thì tối đi như khung 2D.
// Dữ liệu: bố trí ga (layout.js), đường cong, kết cấu (nền/cầu cạn/cầu/hầm), ghi và ghi chữ X, tàu phía trước, tàu ngược chiều và tàu vượt.
(function (root) {
  const HALF = 750, GAUGE_W = 3.4;           // nửa tầm nhìn dọc (m); bề rộng nền đá dăm quanh tim đường (m)
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cache = {};

  function draw(ctx, px, py, pw, ph, W, T, R) {
    const S = root.Sim, LAY = root.Layout, L = W.line, M = T.M;
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600, dark = !(hour > 6.3 && hour < 17.9);
    const cx = px + pw / 2, cy = py + ph / 2, ky = ph / (2 * HALF), len = T.veh.len, zOff = -len / 2;     // zOff: toạ độ z (so với đầu tàu) của tâm đoàn tàu, đặt ở giữa khung
    const km = z => S.kmOfS(T.x + z, W.dir, L.kmEnd);
    // các ga trong tầm
    const sts = []; M.forEach((m, i) => { const d = m.s - T.x; if (d < -1300 || d > 1900) return; const key = W.lineId + ':' + m.i + ':' + W.dir; const st = cache[key] || (cache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.dir, m.i)); sts.push({ m, i, d, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')) }); });
    let lane = 0; for (const q of sts) if (q.stopHere && !q.m.mainStop) { const w = LAY.spread(T.x, q.m.s); if (w > 0) lane = q.st.ours.x * w; }
    const latT = LAY.lateralTable(L, S, W.dir, T.x, HALF + 200, 10); const off = z => z <= 0 ? 0 : (() => { const f = z / 10, i = Math.min(latT.length - 2, Math.floor(f)); return latT[i] + (latT[i + 1] - latT[i]) * (f - i); })();
    const oppAt = z => { let x = LAY.ADJ; for (const q of sts) x += (q.st.opp - LAY.ADJ) * LAY.spread(T.x + z, q.m.s); return x; };
    // bề rộng cần hiển thị -> tỉ lệ ngang
    let hx = 7.5; for (const q of sts) if (Math.abs(q.d) < 1000) hx = Math.max(hx, Math.abs(q.st.extent[0] - lane) + 2, Math.abs(q.st.extent[1] - lane) + 2);
    const kx = Math.min(7, (pw / 2 - 12) / hx), kc = ky * 2;
    // z (m trước đầu tàu) -> y màn hình; X mô hình (dương = bên trái hướng đi) -> x màn hình
    const Y = z => cy - (z - zOff) * ky, X = (xm, z) => cx - ((xm - lane) * kx + off(Math.max(0, z)) * kc);       // độ cong vẽ gần đúng tỉ lệ thật (kc ≈ 2·ky), khoảng cách giữa các đường dùng tỉ lệ ngang phóng đại kx
    ctx_clip(ctx, px, py, pw, ph);
    // nền: màu theo cảnh quan, ban đêm tối hơn
    ctx.fillStyle = dark ? '#0b1118' : '#1c2a22'; ctx.fillRect(px, py, pw, ph);
    // kết cấu theo khoảng cách: cầu cạn (sáng), cầu (nước), hầm (tối); theo lát 20 m
    const runs = []; { let prev = null; for (let z = zOff - HALF - 40; z <= zOff + HALF + 40; z += 20) { const k = S.structAt(L, km(z)); if (k === prev) runs[runs.length - 1][1] = z + 20; else { runs.push([z, z + 20, k]); prev = k; } } }
    for (const [za, zb, k] of runs) { const y0 = Y(zb), y1 = Y(za); if (k === 'b') { ctx.fillStyle = dark ? '#0d2234' : '#2a4a66'; ctx.fillRect(px, y0, pw, y1 - y0); } else if (k === 'v') { ctx.fillStyle = dark ? '#161d26' : '#2c3640'; ctx.fillRect(px, y0, pw, y1 - y0); } else if (k === 'g') { ctx.fillStyle = dark ? '#0f1a14' : '#27402f'; ctx.fillRect(px, y0, pw, y1 - y0); } }
    // đường: dải đá dăm + tim ray, theo đường cong
    const line = (xf, z0, z1, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); const stp = z1 - z0 > 400 ? 25 : 10; let z = z0; for (;;) { const zz = Math.min(z, z1), x = X(xf(zz), zz), y = Y(zz); if (zz === z0) ctx.moveTo(x, y); else ctx.lineTo(x, y); if (zz >= z1) break; z += stp; } ctx.stroke(); };
    const zLo = zOff - HALF - 50, zHi = zOff + HALF + 50;
    const tracks = [[() => 0, zLo, zHi], [oppAt, zLo, zHi]];
    for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; tracks.push([z => lerp(t.plain, t.x, LAY.spread(T.x + z, q.m.s)), Math.max(zLo, q.d - 1150), Math.min(zHi, q.d + 630)]); }
    for (const [xf, z0, z1] of tracks) if (z1 > z0) line(xf, z0, z1, Math.max(5, kx * GAUGE_W), dark ? '#202830' : '#4a4f50');
    // sân ga
    for (const q of sts) { const z0 = q.d - 420, z1 = q.d + 20; if (z1 < zLo || z0 > zHi) continue; for (const p of q.st.plats) { const so = off(Math.max(0, (z0 + z1) / 2)) * kc, xa = cx - (p.xb - lane) * kx - so, xb = cx - (p.xa - lane) * kx - so, yA = Y(Math.min(z1, zHi)), yB = Y(Math.max(z0, zLo)); ctx.fillStyle = dark ? '#3a4658' : '#8c98a6'; ctx.fillRect(xa, yA, xb - xa, yB - yA);
        ctx.fillStyle = '#d8b838'; for (const e of [p.xa, p.xb]) { if (q.st.tracks.some(t => Math.abs(Math.abs(t.x - e) - 1.75) < 0.01)) { const ex = cx - (e - lane) * kx - so; ctx.fillRect(ex - 1, yA, 2, yB - yA); } } }
      // vạch dừng, tên ga
      const ys = Y(q.d); if (ys > py && ys < py + ph) { const t = q.st.ours; ctx.fillStyle = '#4cd68a'; ctx.fillRect(cx - (t.x - lane) * kx - off(Math.max(0, q.d)) * kc - 12, ys - 1, 24, 2); }
      const yn = clamp(Y(Math.min(z1, zHi)) + 10, py + 12, py + ph - 6); ctx.fillStyle = '#e8eef5'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(q.m.name, px + 8, clamp(Y(q.d - 200), py + 14, py + ph - 8)); }
    // đường ray (tim) vẽ trên đá dăm
    for (const [xf, z0, z1] of tracks) if (z1 > z0) line(xf, z0, z1, 1.6, dark ? '#6d7886' : '#c8d0d8');
    // ghi chữ X ở hai đầu mỗi ga
    for (const q of sts) for (const zc of [q.d - 1300, q.d + 720]) { if (zc + 150 < zLo || zc > zHi) continue; const sm = u => { const t = clamp(u, 0, 1); return t * t * (3 - 2 * t); };
      line(z => lerp(0, oppAt(z), sm((z - zc) / 150)), zc, zc + 150, 1.6, dark ? '#6d7886' : '#c8d0d8'); line(z => lerp(oppAt(z), 0, sm((z - zc) / 150)), zc, zc + 150, 1.6, dark ? '#6d7886' : '#c8d0d8'); }
    // đoạn giới hạn qua ghi
    for (const z of S.turnoutZones(T)) { const a = z.s0 - T.x, b = z.s1 - T.x; if (b < zLo || a > zHi) continue; const ya = Y(Math.min(b, zHi)), yb = Y(Math.max(a, zLo)); ctx.fillStyle = 'rgba(255,194,71,.10)'; ctx.fillRect(px, ya, pw, yb - ya); ctx.fillStyle = '#ffc247'; ctx.font = '10px system-ui'; ctx.textAlign = 'right'; if (a > zLo && a < zHi) ctx.fillText('ghi 80', px + pw - 6, Y(a) - 2); }
    // phủ tối khi trong hầm / đoạn hầm phía trước (giống khung 2D)
    for (const [za, zb, k] of runs) if (k === 't') { const y0 = Y(zb), y1 = Y(za); ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(px, y0, pw, y1 - y0); ctx.fillStyle = 'rgba(160,170,180,.55)'; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; if (y1 - y0 > 20) ctx.fillText('HẦM', px + 6, clamp((y0 + y1) / 2, py + 12, py + ph - 6)); }
    // tàu phía trước, tàu ngược chiều, tàu vượt
    const trainRect = (xm, zFront, ln, col, label) => { const x = cx - ((xm - lane) * kx + off(Math.max(0, zFront)) * kc), w = Math.max(6, kx * 3), yT = Y(zFront), yB = Y(zFront - ln); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2, yT, w, Math.max(4, yB - yT), 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x - w / 2 + 1, yT, w - 2, 3); if (label && yB - yT > 30) { ctx.fillStyle = '#10151c'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, x, yT + 14); } };
    const Ld = W.lead; if (Ld && Ld.phase !== 'end') { const zf = Ld.x - T.x, qL = Ld.phase === 'dwell' ? sts.find(q => Math.abs(q.m.s - Ld.x) < 60) : null, other = qL && qL.st.tracks.find(t => t.own && !t.thr && t !== qL.st.ours && qL.st.stops.includes(t)); if (zf > zLo && zf - Ld.veh.len < zHi) trainRect(qL ? (other || qL.st.ours).x : 0, zf, Ld.veh.len, '#ffa24a', W.leadLabel); }
    if (T.v > 20) for (const t0 of W.opposing || []) { const zN = (t0 - W.t) * 200; if (zN < zHi && zN + len > zLo) trainRect(oppAt(Math.max(0, zN)), zN + len, len, '#8aa0b5'); }
    if (T.phase === 'dwell' && W.passers && W.passers[T.k]) for (const p of W.passers[T.k]) { const u = (W.t - (p.t - 4.5)) / 9; if (u > 0 && u < 1) { const pl = (S.VEH[p.v] || S.VEH.N700).len, zf = -pl + u * (pl + 520); trainRect(0, zf, pl, '#b8c4d4', p.label); } }
    // tàu của ta (giữa khung)
    { const w = Math.max(7, kx * 3), yT = Y(0), yB = Y(-len); ctx.fillStyle = '#2a8fe6'; ctx.beginPath(); ctx.roundRect(cx - w / 2, yT, w, yB - yT, 3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx, yT - 5); ctx.lineTo(cx - 5, yT + 3); ctx.lineTo(cx + 5, yT + 3); ctx.closePath(); ctx.fill(); }
    // thước: vạch mỗi 250 m
    ctx.font = '9px system-ui'; ctx.textAlign = 'right'; for (let m = -500; m <= 500; m += 250) { const y = Y(m); ctx.fillStyle = 'rgba(200,210,220,.35)'; ctx.fillRect(px + pw - 8, y, 8, 1); if (m !== 0) ctx.fillText((m > 0 ? '+' : '') + m + ' m', px + pw - 10, y + 3); }
    ctx.fillStyle = 'rgba(160,175,190,.7)'; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Sơ đồ nhìn từ trên · ±750 m · ngang phóng đại', px + 8, py + ph - 6);
    ctx.restore();
  }
  function ctx_clip(ctx, x, y, w, h) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  root.TopView = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
