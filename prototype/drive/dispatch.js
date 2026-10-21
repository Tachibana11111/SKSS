// Chế độ ĐIỀU ĐỘ: nhiều tàu thật tự chạy theo biểu đồ; người chơi xử lý sự cố bằng lệnh giữ/thông qua/cho vượt để giữ trễ thấp nhất.
(function (root) {
  const CLS = { Nozomi: '#ff6b6b', Hikari: '#ffa24a', Kodama: '#4cd68a', Mizuho: '#c58bff', Sakura: '#f58bd0', Tsubame: '#8bd0ff', Hayabusa: '#a6e22e', Hayate: '#7bd88f', Yamabiko: '#4aa3ff', Nasuno: '#ffd24a' };
  const RANK = { Nozomi: 5, Mizuho: 5, Hayabusa: 5, Hikari: 4, Sakura: 4, Hayate: 4, Yamabiko: 3, Kodama: 2, Tsubame: 2, Nasuno: 2 };
  const D = { W: null, sel: null, tgt: 0, fastIdx: 0, scale: 16, paused: false, over: false, btns: [], listOff: 0, result: null, scenario: null, ended: false };
  const fmtClock = (t0, t) => { const s = Math.floor(t0 + t), h = Math.floor(s / 3600) % 24, m = Math.floor(s % 3600 / 60), q = s % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(q).padStart(2, '0'); };
  function start(o) {
    const Sim = root.Sim; D.W = Sim.createNetwork(o.lineId, o.dir, { diff: o.diff, seed: o.seed, weather: o.weather, t0: o.t0, span: o.span });
    { let lo = 1e9, hi = -1e9; for (const T of D.W.net.trains) for (const m of T.M) { const t = m.arr != null ? m.arr : m.dep; if (t == null || t < -300 || t > o.span + 300) continue; const km = Sim.kmOfS(m.s, D.W.dir, D.W.line.kmEnd); lo = Math.min(lo, km); hi = Math.max(hi, km); } D.kmRange = lo < hi ? [Math.max(0, lo - 8), Math.min(D.W.line.kmEnd, hi + 8)] : [0, D.W.line.kmEnd]; }
    D.sel = null; D.tgt = 0; D.fastIdx = 0; D.scale = 16; D.paused = false; D.over = false; D.result = null; D.ended = false; D.listOff = 0; D.scenario = o;
    D.W.say('info', `Điều độ ${D.W.line.name} · ${o.dir === 'down' ? 'chiều xuống' : 'chiều lên'} · ${D.W.net.trains.length} chuyến trong ${Math.round(o.span / 60)} phút. Mục tiêu: giữ trễ thấp nhất, tránh để tàu bị kẹt sau tàu chậm.`);
    D.W.say('info', 'Chọn tàu ở danh sách bên phải hoặc bấm vào đường tàu. Dùng lệnh giữ / thông qua / cho vượt khi có sự cố.');
    return D;
  }
  const trainsOf = () => D.W.net.trains;
  const delayOf = T => { const Sim = root.Sim; if (T.phase === 'end' && T.results.length) return T.results[T.results.length - 1].delay; if (!T.started) return 0; const p = Sim.plannedTime(T); return D.W.t - p; };
  function futureStops(T) { const r = []; for (let j = T.k + (T.phase === 'dwell' ? 0 : 1); j < T.M.length; j++) if (T.M[j].stop) r.push(j); return r; }
  function cands(S) { const out = []; for (const F of trainsOf()) { if (F === S || F.phase === 'end') continue; if (F.x < S.x && (RANK[F.cls] || 3) > (RANK[S.cls] || 3)) out.push(F); } out.sort((a, b) => b.x - a.x); return out; }
  function frame(rdt) {
    const W = D.W; if (!W || D.paused || D.over) return;
    const n = Math.ceil(D.scale * rdt / 0.2);
    for (let i = 0; i < n; i++) {
      root.Sim.netTick(W, 0.2);
      if (W.t >= W.net.span || trainsOf().every(T => T.phase === 'end')) { finish(); break; }
    }
    if (W.newMsg) { W.newMsg = false; if (D.scale > 16) D.scale = 16; }
  }
  function finish() { D.over = true; D.result = root.Sim.netScore(D.W); if (root.onDispatchEnd) root.onDispatchEnd(D); }
  function selectAt(x, y) {
    const W = D.W; if (!W) return; const g = geom(); if (x < g.x0 || x > g.x1 || y < g.y0 || y > g.y1) return;
    let best = null, bd = 9; const tt = ((x - g.x0) / (g.x1 - g.x0)) * g.span;
    for (const T of trainsOf()) { const h = T.hist || []; for (let i = 1; i < h.length; i++) { const a = h[i - 1], b = h[i]; if (tt < a[0] - 20 || tt > b[0] + 20) continue; const f = (tt - a[0]) / Math.max(1, b[0] - a[0]); const km = a[1] + (b[1] - a[1]) * clamp(f, 0, 1); const yy = g.yOf(km); const d = Math.abs(yy - y); if (d < bd) { bd = d; best = T; } } }
    if (best) pick(best);
  }
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  function pick(T) { D.sel = T; const fs = futureStops(T); D.tgt = 0; D.fastIdx = 0; D.tgtList = fs; }
  function geom() {
    const W = D.W, L = W.line, kr = D.kmRange || [0, L.kmEnd], kmMin = kr[0], kmMax = kr[1], x0 = 118, x1 = 760, y0 = 52, y1 = 632, span = W.net.span;
    const yOf = km => y0 + (km - kmMin) / (kmMax - kmMin) * (y1 - y0), xOf = t => x0 + clamp(t, 0, span) / span * (x1 - x0);
    return { x0, x1, y0, y1, span, yOf, xOf };
  }
  function btn(ctx, x, y, w, h, label, fn, on, col) { ctx.fillStyle = on ? (col || '#2a6fd6') : '#243447'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.fillStyle = on ? '#fff' : '#c8d4e2'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y + h / 2 + 4); D.btns.push({ x, y, w, h, fn }); }
  function click(x, y) { for (const b of D.btns) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return true; } selectAt(x, y); return false; }
  function key(e) {
    const k = e.key;
    if (k === ' ') D.paused = !D.paused; else if (k === '1') D.scale = 4; else if (k === '2') D.scale = 16; else if (k === '3') D.scale = 64; else if (k === '4') D.scale = 150;
    else if (k === 'Tab') { const ts = trainsOf().filter(T => T.phase !== 'end'); const i = ts.indexOf(D.sel); pick(ts[(i + 1) % ts.length]); e.preventDefault(); }
    else if (k === 'ArrowRight' && D.sel) D.tgt = Math.min((D.tgtList || []).length - 1, D.tgt + 1); else if (k === 'ArrowLeft' && D.sel) D.tgt = Math.max(0, D.tgt - 1);
    else if (k === 'h' || k === 'H') doHold(60); else if (k === 'j' || k === 'J') doHold(120); else if (k === 'k' || k === 'K') doHold(180); else if (k === 's' || k === 'S') doSkip(); else if (k === 'r' || k === 'R') { if (D.scenario) start(D.scenario); }
    else return false; return true;
  }
  const tgtJ = () => { const fs = D.sel ? futureStops(D.sel) : []; D.tgtList = fs; return fs[clamp(D.tgt, 0, fs.length - 1)]; };
  function doHold(sec) { const j = tgtJ(); if (D.sel && j !== undefined) root.Sim.dispatch.hold(D.W, D.sel, j, sec); }
  function doSkip() { const j = tgtJ(); if (D.sel && j !== undefined && !root.Sim.dispatch.skip(D.W, D.sel, j)) D.W.say('warn', 'Không thể thông qua ga đó (ga đầu/cuối hoặc đã qua).'); }
  function doRelease() { const j = tgtJ(); if (D.sel && j !== undefined) root.Sim.dispatch.release(D.W, D.sel, j); }
  function doOvertake() { const S = D.sel; if (!S) return; const cs = cands(S); const F = cs[clamp(D.fastIdx, 0, cs.length - 1)]; const j = tgtJ(); if (!F || j === undefined) { D.W.say('warn', 'Không có tàu nhanh phía sau để cho vượt.'); return; } if (!S.M[j].loop) D.W.say('warn', `${S.M[j].name} không có đường tránh: tàu nhanh không vượt được ở đây (chọn ga có đường thông qua).`); else root.Sim.dispatch.overtake(D.W, S, F, j); }

  function draw(ctx, W_, H_) {
    D.btns = []; const W = D.W; ctx.clearRect(0, 0, W_, H_); if (!W) return;
    const g = geom(), L = W.line, t0 = W.net.t0;
    // khung
    ctx.fillStyle = '#18212c'; ctx.beginPath(); ctx.roundRect(10, 10, 770, 640, 8); ctx.fill();
    ctx.fillStyle = '#e8eef5'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Biểu đồ chạy tàu · ' + L.name + (W.dir === 'down' ? ' (chiều xuống)' : ' (chiều lên)'), 24, 34);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffc247'; ctx.font = 'bold 16px system-ui'; ctx.fillText(fmtClock(t0, Math.max(0, W.t)), 765, 34);
    // lưới ga
    ctx.font = '9px system-ui'; ctx.textAlign = 'right'; let lastY = -99;
    L.stations.forEach(s => { if (s.km < D.kmRange[0] - 1 || s.km > D.kmRange[1] + 1) return; const y = g.yOf(s.km); ctx.strokeStyle = s.loop ? 'rgba(138,160,181,.25)' : 'rgba(138,160,181,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); if (y - lastY >= 11) { ctx.fillStyle = '#8aa0b5'; ctx.fillText(s.en, g.x0 - 6, y + 3); lastY = y; } });
    // trục thời gian
    ctx.textAlign = 'center'; for (let m = 0; m <= g.span / 60; m += 10) { const x = g.xOf(m * 60); ctx.strokeStyle = 'rgba(138,160,181,.18)'; ctx.beginPath(); ctx.moveTo(x, g.y0); ctx.lineTo(x, g.y1); ctx.stroke(); ctx.fillStyle = '#8aa0b5'; ctx.fillText(fmtClock(t0, m * 60).slice(0, 5), x, g.y1 + 14); }
    // vùng thời tiết/sự cố
    for (const z of W.zones) { if (z.tB < 0 || z.tA > g.span) continue; const y0 = g.yOf(root.Sim.kmOfS(z.s0, W.dir, L.kmEnd)), y1 = g.yOf(root.Sim.kmOfS(z.s1, W.dir, L.kmEnd)); ctx.fillStyle = z.hold ? 'rgba(138,150,166,.25)' : 'rgba(47,111,214,.25)'; ctx.fillRect(g.xOf(z.tA), Math.min(y0, y1), g.xOf(Math.min(z.tB, g.span)) - g.xOf(z.tA), Math.abs(y1 - y0)); }
    // đường tàu: kế hoạch (nét đứt mờ) và thực tế
    const dashed = (pts, col, alpha, lw) => { ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore(); };
    for (const T of trainsOf()) {
      const col = CLS[T.cls] || '#c8d4e2', sel = T === D.sel, pts = []; T.M.forEach(m => { const km = root.Sim.kmOfS(m.s, W.dir, L.kmEnd); if (m.arr != null) pts.push([g.xOf(m.arr), g.yOf(km)]); if (m.dep != null) pts.push([g.xOf(m.dep), g.yOf(km)]); });
      dashed(pts, col, sel ? 0.6 : 0.28, sel ? 1.6 : 1);
      const h = (T.hist || []).slice(); if (T.phase !== 'end' || true) h.push([Math.max(0, W.t), root.Sim.kmOfS(T.x, W.dir, L.kmEnd)]);
      ctx.strokeStyle = sel ? '#ffffff' : col; ctx.lineWidth = sel ? 2.6 : 1.4; ctx.globalAlpha = sel ? 1 : 0.9; ctx.beginPath(); let first = true;
      for (const [t, km] of h) { if (t < 0) continue; const x = g.xOf(t), y = g.yOf(km); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1;
      const dl = delayOf(T); if (T.phase !== 'end' && W.t > 0 && T.started) { const x = g.xOf(W.t), y = g.yOf(root.Sim.kmOfS(T.x, W.dir, L.kmEnd)); ctx.fillStyle = dl > 300 ? '#ff5a5a' : dl > 60 ? '#ffc247' : col; ctx.beginPath(); ctx.arc(x, y, sel ? 4 : 2.6, 0, 7); ctx.fill(); }
    }
    // đường thời gian hiện tại
    const cx = g.xOf(Math.max(0, W.t)); ctx.strokeStyle = '#ffc247'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, g.y0); ctx.lineTo(cx, g.y1); ctx.stroke();
    // chú thích
    ctx.textAlign = 'left'; ctx.font = '10px system-ui'; let lx = 124; for (const [k, c] of Object.entries(CLS)) if (trainsOf().some(T => T.cls === k)) { ctx.fillStyle = c; ctx.fillRect(lx, 640 - 6, 10, 3); ctx.fillStyle = '#8aa0b5'; ctx.fillText(k, lx + 13, 640 - 1); lx += 24 + k.length * 6; }

    // ---- bảng phải: danh sách tàu và lệnh
    ctx.fillStyle = '#18212c'; ctx.beginPath(); ctx.roundRect(790, 10, 320, 640, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Danh sách tàu (trễ phút)', 804, 32);
    const live = trainsOf().filter(T => T.phase !== 'end' || (T.results.length && W.t - (T.results[T.results.length - 1].t || 0) < 600)).sort((a, b) => delayOf(b) - delayOf(a));
    const rows = 11, off = clamp(D.listOff, 0, Math.max(0, live.length - rows)); D.listOff = off;
    live.slice(off, off + rows).forEach((T, i) => { const y = 42 + i * 21, dl = delayOf(T) / 60, sel = T === D.sel; ctx.fillStyle = sel ? '#2a3d56' : '#1d2a3a'; ctx.fillRect(800, y, 300, 19); D.btns.push({ x: 800, y, w: 300, h: 19, fn: () => pick(T) });
      ctx.fillStyle = CLS[T.cls] || '#c8d4e2'; ctx.fillRect(803, y + 3, 3, 13); ctx.fillStyle = '#e8eef5'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(T.label, 812, y + 14);
      const st = T.phase === 'end' ? 'đến ga cuối' : T.phase === 'dwell' ? (T.started ? 'đỗ ' + T.M[T.k].name : 'chưa chạy') : '→ ' + T.M[root.Sim.nextTarget(T)].name; ctx.fillStyle = '#8aa0b5'; ctx.font = '10px system-ui'; ctx.fillText(st.slice(0, 20), 892, y + 13);
      ctx.textAlign = 'right'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = dl > 5 ? '#ff5a5a' : dl > 1 ? '#ffc247' : '#4cd68a'; ctx.fillText((dl >= 0 ? '+' : '') + dl.toFixed(1), 1094, y + 14); });
    btn(ctx, 800, 274, 148, 20, '▲ lên', () => { D.listOff = Math.max(0, D.listOff - 4); }, false); btn(ctx, 952, 274, 148, 20, '▼ xuống', () => { D.listOff = D.listOff + 4; }, false);
    // chi tiết và lệnh cho tàu chọn
    const S = D.sel; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.fillText('Lệnh điều độ', 804, 316);
    if (!S) { ctx.fillStyle = '#8aa0b5'; ctx.font = '12px system-ui'; ctx.fillText('Chọn một tàu (danh sách hoặc bấm vào đường tàu).', 804, 338); }
    else {
      const fs = futureStops(S); D.tgtList = fs; D.tgt = clamp(D.tgt, 0, Math.max(0, fs.length - 1)); const j = fs[D.tgt];
      ctx.fillStyle = CLS[S.cls] || '#fff'; ctx.font = 'bold 14px system-ui'; ctx.fillText(S.label + '  (' + S.veh.name + ')', 804, 338);
      ctx.fillStyle = '#c8d4e2'; ctx.font = '12px system-ui'; ctx.fillText('Trễ hiện tại: ' + (delayOf(S) / 60).toFixed(1) + ' phút · ' + (S.phase === 'run' ? Math.round(S.v * 3.6) + ' km/h' : S.phase === 'dwell' ? 'đang đỗ' : 'đã kết thúc'), 804, 356);
      if (S.waitFor) { ctx.fillStyle = '#ffc247'; ctx.fillText('Đang chờ ' + S.waitFor.train.label + ' vượt', 804, 372); }
      ctx.fillStyle = '#8aa0b5'; ctx.fillText('Ga mục tiêu:', 804, 392); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.fillText(j !== undefined ? S.M[j].name + (S.M[j].loop ? ' (có đường tránh)' : '') : '—', 884, 392);
      btn(ctx, 1060, 378, 20, 20, '◀', () => { D.tgt = Math.max(0, D.tgt - 1); }, false); btn(ctx, 1084, 378, 20, 20, '▶', () => { D.tgt = Math.min(fs.length - 1, D.tgt + 1); }, false);
      btn(ctx, 800, 408, 96, 24, 'Giữ +60 s (H)', () => doHold(60), false); btn(ctx, 900, 408, 96, 24, 'Giữ +120 s (J)', () => doHold(120), false); btn(ctx, 1000, 408, 100, 24, 'Giữ +180 s (K)', () => doHold(180), false);
      btn(ctx, 800, 438, 148, 24, 'Thông qua ga (S)', () => doSkip(), false); btn(ctx, 952, 438, 148, 24, 'Thả giữ', () => doRelease(), false);
      const cs = cands(S), F = cs[clamp(D.fastIdx, 0, Math.max(0, cs.length - 1))];
      ctx.fillStyle = '#8aa0b5'; ctx.font = '12px system-ui'; ctx.fillText('Cho tàu nhanh vượt:', 804, 486); ctx.fillStyle = F ? (CLS[F.cls] || '#fff') : '#8aa0b5'; ctx.font = 'bold 13px system-ui'; ctx.fillText(F ? F.label + ' (cách ' + Math.round((S.x - F.x) / 1000) + ' km)' : 'không có tàu nhanh phía sau', 804, 504);
      btn(ctx, 1060, 490, 20, 20, '◀', () => { D.fastIdx = Math.max(0, D.fastIdx - 1); }, false); btn(ctx, 1084, 490, 20, 20, '▶', () => { D.fastIdx = Math.min(cs.length - 1, D.fastIdx + 1); }, false);
      btn(ctx, 800, 516, 300, 24, 'Giữ ' + S.label + ' tại ga mục tiêu cho tàu nhanh vượt', () => doOvertake(), !!S.waitFor, '#e08a2f');
      ctx.fillStyle = '#7a8ea5'; ctx.font = '11px system-ui'; ctx.fillText('Mẹo: tàu chậm (Kodama) đỗ ở ga có đường tránh', 804, 566); ctx.fillText('để tàu nhanh vượt; giữ tàu quá lâu làm trễ dây chuyền.', 804, 580);
    }
    // điều khiển thời gian
    btn(ctx, 800, 596, 60, 22, D.paused ? '▶ chạy' : '⏸ dừng', () => { D.paused = !D.paused; }, D.paused); [[4, '×4'], [16, '×16'], [64, '×64'], [150, '×150']].forEach(([s, l], i) => btn(ctx, 866 + i * 56, 596, 52, 22, l, () => { D.scale = s; }, D.scale === s));
    btn(ctx, 800, 624, 148, 22, 'Chạy lại (R)', () => { if (D.scenario) start(D.scenario); }, false); btn(ctx, 952, 624, 148, 22, 'Kết thúc sớm', () => { if (!D.over) finish(); }, false);

    // ---- bảng dưới: nhật ký + điểm
    ctx.fillStyle = '#18212c'; ctx.beginPath(); ctx.roundRect(10, 658, 1100, 132, 8); ctx.fill();
    const sc = root.Sim.netScore(W); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Nhật ký điều độ', 24, 680);
    ctx.fillStyle = sc.score >= 80 ? '#4cd68a' : sc.score >= 50 ? '#ffc247' : '#ff6464'; ctx.textAlign = 'right'; ctx.font = 'bold 15px system-ui'; ctx.fillText('Điểm tạm tính: ' + sc.score + ' · trễ TB ' + sc.avg + ' phút · ' + sc.late5 + ' tàu trễ > 5 phút · bị kẹt ' + sc.blocked + ' s', 1096, 680);
    const C = { info: '#9fc3ff', warn: '#ffc247', bad: '#ff7a7a', stop: '#4cd68a', pa: '#b8c4d4' }; let yy = 782; ctx.textAlign = 'left'; ctx.font = '12px system-ui';
    for (let i = W.msgs.length - 1; i >= 0 && yy > 696; i--) { const m = W.msgs[i]; ctx.fillStyle = C[m.kind] || '#c8d4e2'; ctx.fillText(fmtClock(t0, m.t).slice(0, 5) + '  ' + m.text.slice(0, 150), 24, yy); yy -= 16; }
    if (D.over) drawEnd(ctx, W_, H_);
  }
  function drawEnd(ctx, W_, H_) {
    const r = D.result; ctx.fillStyle = 'rgba(8,12,18,.96)'; ctx.fillRect(200, 120, 720, 520);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Kết thúc ca điều độ', 560, 160);
    ctx.fillStyle = '#8aa0b5'; ctx.font = '14px system-ui'; ctx.fillText(`${r.n} tàu · trễ trung bình ${r.avg} phút · trễ lớn nhất ${r.maxD} phút · ${r.late5} tàu trễ > 5 phút · bị kẹt ${r.blocked} s · ${r.cmds} lệnh`, 560, 190);
    ctx.textAlign = 'left'; ctx.fillStyle = '#8aa0b5'; ctx.fillText('Các tàu trễ nhiều nhất', 240, 226); ctx.font = '13px system-ui';
    r.rows.slice().sort((a, b) => b[2] - a[2]).slice(0, 8).forEach((x, i) => { ctx.fillStyle = x[2] > 5 ? '#ff7a7a' : '#e8eef5'; ctx.fillText(x[0] + '  —  ' + x[2] + ' phút (' + x[1] + ')', 240, 250 + i * 22); });
    ctx.textAlign = 'center'; ctx.font = 'bold 36px system-ui'; ctx.fillStyle = r.score >= 80 ? '#4cd68a' : r.score >= 50 ? '#ffc247' : '#ff6464'; ctx.fillText('ĐIỂM: ' + r.score + ' / 100', 560, 490);
    ctx.font = '14px system-ui'; ctx.fillStyle = '#8aa0b5'; ctx.fillText('R: chạy lại cùng seed · đổi seed ở thanh trên để gặp sự cố khác', 560, 530);
    ctx.fillText('Mẹo: giữ ít lệnh nhưng đúng chỗ. Đừng giữ tàu nhanh phía sau tàu chậm; cho tàu nhanh vượt ở ga có đường tránh.', 560, 556);
  }
  root.Dispatch = { D, start, frame, draw, click, key, finish };
})(typeof window !== 'undefined' ? window : globalThis);
