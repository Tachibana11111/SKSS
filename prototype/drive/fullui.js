// Bố cục TOÀN MÀN HÌNH 16:9 (canvas 1920×1080): buồng lái phủ kín làm khung chính; bảng điều khiển ở đáy (cần kéo, đồng hồ phụ, đồng hồ tốc độ, nút + TIMS, cần phanh);
// điện đàm trên trái; hai khung phụ (bản đồ nhỏ, 2D) trên phải, bấm vào để hoán đổi làm khung chính (Tab xoay vòng); H = chế độ tập trung; O = ẩn/hiện điện đàm; F11 = toàn màn hình.
// File này dùng các hàm/biến toàn cục của index.html (ctx, txt, panel, button, lamp, btns, doAct, W, T, SPR, FR, TP, AUD, radio, wrapText, hhmm, fmt, Tutorial...).
const ui = { layout: 'full', main: 'cab', focus: false, radio: true, cur: 'classic' };
const FW = 1920, FH = 1080, TOPH = 58, DASH_Y = 676;
const MAIN_R = [0, TOPH, FW, DASH_Y - TOPH];
const SLOT = [[1566, 74, 336, 300], [1566, 382, 336, 170]];

// chọn bố cục theo chế độ: lái tàu dùng bố cục toàn màn hình (nếu bật), các chế độ khác dùng bố cục cổ điển 1780×900
function syncLayout() {
  const want = (mode === 'drive' && ui.layout === 'full') ? 'full' : 'classic';
  if (want === ui.cur) return; ui.cur = want;
  if (want === 'full') { cv.width = FW; cv.height = FH; W_ = FW; H_ = FH; } else { cv.width = 1780; cv.height = 900; W_ = 1780; H_ = 900; }
  document.body.classList.toggle('fullui', want === 'full');
}
function toggleFullscreen() { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) { } }
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('isfull', !!document.fullscreenElement));
const VIEWS = ['cab', 'top', 'side'], VNAME = { cab: 'BUỒNG LÁI', top: 'BẢN ĐỒ NHỎ', side: 'GÓC NHÌN NGANG 2D' };
function cycleMain() { ui.main = VIEWS[(VIEWS.indexOf(ui.main) + 1) % 3]; }

// vẽ một góc nhìn vào hình chữ nhật (x,y,w,h)
function drawViewIn(kind, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (kind === 'cab') CabView.draw(ctx, x, y, w, h, W, T, { sprites: SPR, fronts: FR, aud: AUD });
  else if (kind === 'top') TopView.draw(ctx, x, y, w, h, W, T, { sprites: SPR, tops: TP, aud: AUD });
  else { Scene.draw(ctx, x, y, w, h, W, T, { sprites: SPR, nextTarget: Sim.nextTarget, aud: AUD }); if (Sim.inTunnel(W, T.x)) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y, w, h); } }
  ctx.restore();
}

// đồng hồ tròn nhỏ
function miniGauge(mx, my, r, v, lo, hi, label, unit, col, ticks) {
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, f = t => a0 + (a1 - a0) * (Math.max(lo, Math.min(hi, t)) - lo) / (hi - lo);
  ctx.lineWidth = 7; ctx.strokeStyle = '#243447'; ctx.beginPath(); ctx.arc(mx, my, r, a0, a1); ctx.stroke(); ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(mx, my, r, f(Math.min(0, hi)), f(v)); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.strokeStyle = '#6a8098'; for (const t of ticks) { const a = f(t); ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * (r + 6), my + Math.sin(a) * (r + 6)); ctx.lineTo(mx + Math.cos(a) * (r + 10), my + Math.sin(a) * (r + 10)); ctx.stroke(); }
  const a = f(v); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * (r - 4), my + Math.sin(a) * (r - 4)); ctx.stroke();
  txt(unit, mx, my + r * 0.62, '#e8eef5', 'bold 14px system-ui', 'center'); txt(label, mx + r + 22, my + 5, '#8aa0b5', '14px system-ui');
}

// đồng hồ tốc độ lớn (cùng logic với đồng hồ cũ, bán kính rr)
function bigDial(cx, cy, rr, blink) {
  const s = rr / 105, vmax = 340, ang = v => Math.PI * 0.8 + (Math.PI * 1.4) * Math.min(v, vmax) / vmax, kmh = T.v * 3.6, atcK = T.allowed * 3.6;
  ctx.lineWidth = 14 * s; ctx.strokeStyle = '#243447'; ctx.beginPath(); ctx.arc(cx, cy, rr, ang(0), ang(vmax)); ctx.stroke();
  ctx.strokeStyle = '#7a2d2d'; ctx.beginPath(); ctx.arc(cx, cy, rr, ang(Math.min(atcK, vmax)), ang(vmax)); ctx.stroke();
  ctx.strokeStyle = '#2f7a55'; ctx.beginPath(); ctx.arc(cx, cy, rr, ang(0), ang(Math.min(atcK, vmax))); ctx.stroke();
  if (T.cs) { const a = ang(T.csSet * 3.6); ctx.strokeStyle = '#3ad6e6'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (rr - 20 * s), cy + Math.sin(a) * (rr - 20 * s)); ctx.lineTo(cx + Math.cos(a) * (rr + 12 * s), cy + Math.sin(a) * (rr + 12 * s)); ctx.stroke(); }
  ctx.lineWidth = 2 * s; ctx.strokeStyle = '#8aa0b5';
  for (let v = 0; v <= vmax; v += 20) { const a = ang(v); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (rr - 12 * s), cy + Math.sin(a) * (rr - 12 * s)); ctx.lineTo(cx + Math.cos(a) * (rr - 20 * s), cy + Math.sin(a) * (rr - 20 * s)); ctx.stroke();
    if (v % 40 === 0) txt(v, cx + Math.cos(a) * (rr - 36 * s), cy + Math.sin(a) * (rr - 36 * s) + 5 * s, '#8aa0b5', Math.round(11 * s) + 'px system-ui', 'center'); }
  const a = ang(kmh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (rr - 16 * s), cy + Math.sin(a) * (rr - 16 * s)); ctx.stroke();
  txt(Math.round(kmh), cx, cy + 22 * s, '#fff', 'bold ' + Math.round(38 * s) + 'px system-ui', 'center'); txt('km/h', cx, cy + 42 * s, '#8aa0b5', Math.round(12 * s) + 'px system-ui', 'center');
  txt(T.atcOn === false ? 'ATC CẮT' : 'ATC ' + (Math.floor(atcK / 5) * 5), cx, cy + 68 * s, T.atcOn === false ? (blink ? '#ff3b3b' : '#a02020') : T.atc ? '#ff6464' : '#4cd68a', 'bold ' + Math.round(18 * s) + 'px system-ui', 'center');
  txt(T.atc ? 'ATC ĐANG PHANH · ' + (WHY[T.why] || '') : (T.phase === 'run' ? 'giới hạn bởi: ' + (WHY[T.why] || '') : ''), cx, cy + 88 * s, T.atc ? '#ff6464' : '#8aa0b5', Math.round(12 * s) + 'px system-ui', 'center');
  if (T.cs) txt('定速 ' + Math.round(T.csSet * 3.6) + ' km/h', cx, cy - 40 * s, '#3ad6e6', 'bold ' + Math.round(13 * s) + 'px system-ui', 'center');
  if (T.cut) { ctx.fillStyle = 'rgba(154,90,214,.88)'; ctx.fillRect(cx - 130 * s, cy - 6 * s, 260 * s, 24 * s); txt('MẤT ĐIỆN – PHANH KHẨN', cx, cy + 11 * s, '#fff', 'bold ' + Math.round(13 * s) + 'px system-ui', 'center'); }
}

// một cần (kéo hoặc phanh): danh sách nấc, bấm được
function lever(x, y, w, h, kind) {
  panel(x, y, w, h); txt(kind === 'pw' ? 'CẦN KÉO' : 'CẦN PHANH', x + w / 2, y + 22, '#fff', 'bold 14px system-ui', 'center');
  const items = kind === 'pw' ? Array.from({ length: 14 }, (_, i) => 13 - i) : [8, 7, 6, 5, 4, 3, 2, 1, 0], top = y + 36, bot = y + h - 34, ch = (bot - top) / items.length;
  items.forEach((n, i) => { const yy = top + i * ch, on = kind === 'pw' ? n === T.pw : n === T.bk;
    ctx.fillStyle = on ? (kind === 'pw' ? (n > 0 ? '#4aa3ff' : '#4cd68a') : (n === 8 ? '#ff5a5a' : n > 0 ? '#ff8a4a' : '#4cd68a')) : '#243447'; ctx.fillRect(x + 14, yy + 1, w - 28, ch - 2);
    const lab = kind === 'pw' ? (n === 0 ? 'N / P0' : 'P' + n) : (n === 8 ? 'EB' : n === 0 ? '0' : 'B' + n);
    txt(lab, x + w / 2, yy + ch / 2 + 5, on ? '#0b0f14' : '#8aa0b5', (on ? 'bold ' : '') + '13px system-ui', 'center'); btns.push({ x: x + 14, y: yy, w: w - 28, h: ch, fn: () => doAct(kind === 'pw' ? 'setpw' : 'setbk', n) }); });
  txt(kind === 'pw' ? 'phím W / S' : 'phải về 0 mới kéo được', x + w / 2, y + h - 14, '#7a8ea5', '11px system-ui', 'center');
}

function drawRadioFull(x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,20,.66)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = 'rgba(80,100,125,.6)'; ctx.lineWidth = 1; ctx.stroke();
  txt('ĐIỆN ĐÀM  (O: ẩn)', x + 12, y + 20, '#fff', 'bold 13px system-ui');
  const C = { info: '#9fc3ff', warn: '#ffc247', bad: '#ff7a7a', stop: '#4cd68a', pa: '#b8c4d4' }, VT = y + 30, VB = y + h - 8, viewH = VB - VT, LW = w;
  ctx.font = '12px system-ui'; const rr = []; let total = 0;
  for (let i = W.msgs.length - 1; i >= Math.max(0, W.msgs.length - 200); i--) { const m = W.msgs[i], lines = wrapText(fmt(m.t) + '  ' + (m.ack && !m.done ? '[CHỜ NHẮC LẠI] ' : '') + m.text, LW - 40), hh = lines.length * 15 + 8; rr.push({ m, lines, y: total, h: hh }); total += hh; }
  if (radio.w !== W) { radio.w = W; radio.scroll = 0; radio.total = 0; }
  const maxScroll = Math.max(0, total - viewH); if (radio.scroll > 0 && total > radio.total) radio.scroll += total - radio.total;
  radio.total = total; radio.scroll = Math.max(0, Math.min(maxScroll, radio.scroll)); radio.max = maxScroll; radio.viewH = viewH; radio.top = VT; radio.x0 = x; radio.x1 = x + w;
  ctx.save(); ctx.beginPath(); ctx.rect(x, VT, w, viewH); ctx.clip();
  for (const r of rr) { const y0 = VT + r.y - radio.scroll; if (y0 + r.h < VT || y0 > VB) continue; r.lines.forEach((l, q) => txt(l, x + 12, y0 + 12 + q * 15, C[r.m.kind] || '#c8d4e2', '12px system-ui')); ctx.fillStyle = 'rgba(80,100,125,.4)'; ctx.fillRect(x + 12, y0 + r.h - 4, w - 36, 1); }
  ctx.restore(); radio.bar = null;
  if (maxScroll > 0) { const th = Math.max(30, viewH * viewH / total), ty = VT + (viewH - th) * radio.scroll / maxScroll; radio.bar = { x: x + w - 14, y: ty, w: 8, h: th };
    ctx.fillStyle = 'rgba(36,52,71,.8)'; ctx.beginPath(); ctx.roundRect(x + w - 14, VT, 8, viewH, 4); ctx.fill(); ctx.fillStyle = radio.drag ? '#6fb0ff' : '#4a6a8f'; ctx.beginPath(); ctx.roundRect(x + w - 14, ty, 8, th, 4); ctx.fill(); }
}

function drawTopBar(blink) {
  ctx.fillStyle = '#0b1117'; ctx.fillRect(0, 0, FW, TOPH); ctx.fillStyle = '#243447'; ctx.fillRect(0, TOPH - 1, FW, 1);
  const pt = Sim.plannedTime(T), delay = W.t - pt, M = T.M;
  txt(W.trip.label + ' · ' + T.veh.name + ' · ' + hhmm(W.trip.t0 + W.t), 16, 24, '#fff', 'bold 17px system-ui');
  txt(W.line.name + ' · ' + Sim.DIFF[W.diffKey].name + ' · ' + Sim.WEATHER[W.weatherKind] + (replaying ? ' · XEM LẠI' : '') + ' · tua ×' + scale + (auto ? ' · TỰ LÁI' : '') + (paused ? ' · TẠM DỪNG' : ''), 16, 45, '#8aa0b5', '12px system-ui');
  // tuyến các ga
  const x0 = 470, x1 = 1560, s0 = M[0].s, s1 = M[M.length - 1].s, pos = s => x0 + (x1 - x0) * (s - s0) / (s1 - s0), ly = 36;
  ctx.strokeStyle = '#3b516a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x1, ly); ctx.stroke();
  for (const z of W.zones) { if (W.t < z.tA || W.t > z.tB) continue; const lo = Math.max(x0, Math.min(pos(z.s0), pos(z.s1))), hi = Math.min(x1, Math.max(pos(z.s0), pos(z.s1))); if (hi <= lo) continue; ctx.fillStyle = z.hold ? 'rgba(138,150,166,.6)' : (ZC[z.kind] || '#e08a2f'); ctx.fillRect(lo, ly + 4, hi - lo, 4); }
  const showAll = M.length < 9, j = Sim.nextTarget(T);
  M.forEach((m, i) => { const px = pos(m.s); ctx.fillStyle = i === j && T.phase === 'run' ? '#ffd24a' : m.stop ? (i <= T.k ? '#4cd68a' : '#e8eef5') : '#5a6f86'; ctx.beginPath(); ctx.arc(px, ly, m.stop ? 5 : 3, 0, 7); ctx.fill();
    if (m.stop || showAll) txt(m.name, px, i % 2 ? 20 : 54, m.stop ? '#e8eef5' : '#7a8ea5', '10px system-ui', 'center'); });
  if (W.lead && W.lead.phase !== 'end') { const lx = pos(W.lead.x); if (lx > x0 - 6 && lx < x1 + 6) { ctx.fillStyle = '#ffa24a'; ctx.fillRect(lx - 4, ly - 8, 8, 16); } }
  ctx.fillStyle = '#4aa3ff'; ctx.fillRect(pos(T.x) - 6, ly - 9, 12, 18);
  txt((delay >= 0 ? '+' : '') + Math.round(delay) + ' s' + (T.started ? '' : ' (chưa chạy)'), 1738, 30, Math.abs(delay) <= 15 ? '#4cd68a' : delay > 0 ? '#ff6464' : '#ffc247', 'bold 18px system-ui', 'right');
  txt('lệch kế hoạch', 1738, 46, '#7a8ea5', '10px system-ui', 'right');
  // nút nhỏ: điện đàm, HUD, toàn màn hình
  // ba ô vuông biểu tượng cạnh nhau: điện đàm (O), HUD / tập trung (H), toàn màn hình (F11)
  const SZ = 44, GAP = 6, bx0 = FW - 16 - 3 * SZ - 2 * GAP, by0 = 7;
  iconBtn(bx0, by0, SZ, 'radio', ui.radio, 'O', () => { ui.radio = !ui.radio; });
  iconBtn(bx0 + SZ + GAP, by0, SZ, 'hud', !ui.focus, 'H', () => { ui.focus = !ui.focus; });
  iconBtn(bx0 + 2 * (SZ + GAP), by0, SZ, 'full', !!document.fullscreenElement, 'F11', toggleFullscreen);
}

// ô vuông chỉ có biểu tượng (vẽ bằng nét, không dùng emoji để khỏi lệch giữa các máy)
function iconBtn(x, y, sz, kind, on, key, fn) {
  ctx.fillStyle = on ? '#2a6fd6' : '#243447'; ctx.beginPath(); ctx.roundRect(x, y, sz, sz, 8); ctx.fill(); ctx.strokeStyle = on ? '#6fb0ff' : '#3b516a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, sz, sz, 8); ctx.stroke();
  const cx = x + sz / 2, cy = y + sz / 2 - 2; ctx.strokeStyle = on ? '#fff' : '#9fb4c9'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'radio') { ctx.beginPath(); ctx.roundRect(cx - 12, cy - 10, 24, 17, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 5, cy + 7); ctx.lineTo(cx - 8, cy + 13); ctx.lineTo(cx + 1, cy + 7); ctx.stroke(); for (const dy of [-4, 1]) { ctx.beginPath(); ctx.moveTo(cx - 7, cy + dy); ctx.lineTo(cx + 7, cy + dy); ctx.stroke(); } }
  else if (kind === 'hud') { ctx.beginPath(); ctx.roundRect(cx - 13, cy - 10, 26, 20, 3); ctx.stroke(); ctx.fillRect(cx - 9, cy - 6, 10, 4); ctx.fillRect(cx - 9, cy + 1, 18, 3); }
  else { for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * 4, cy + sy * 12); ctx.lineTo(cx + sx * 12, cy + sy * 12); ctx.lineTo(cx + sx * 12, cy + sy * 4); ctx.stroke(); } }
  ctx.lineCap = 'butt'; txt(key, cx, y + sz - 3, on ? '#dbe9ff' : '#7a8ea5', 'bold 9px system-ui', 'center'); btns.push({ x, y, w: sz, h: sz, fn });
}

function drawFull() {
  btns = []; curOX = 0; ctx.clearRect(0, 0, FW, FH); ctx.fillStyle = '#0b0f14'; ctx.fillRect(0, 0, FW, FH);
  if (!W) { txt('Chọn chuyến và nhấn "Bắt đầu / chạy lại", hoặc mở tab Hướng dẫn / Điều độ.', FW / 2, FH / 2, '#8aa0b5', '24px system-ui', 'center'); return; }
  const blink = Math.floor(performance.now() / 400) % 2 === 0, M = T.M, j = T.phase === 'dwell' ? T.k : Sim.nextTarget(T), d = M[j].s - T.x, pend = W.pending.filter(m => !m.done).length;
  // ---- khung chính + hai khung phụ
  drawViewIn(ui.main, MAIN_R[0], MAIN_R[1], MAIN_R[2], MAIN_R[3]);
  if (!ui.focus) ui.main && VIEWS.filter(v => v !== ui.main).forEach((v, i) => { const [x, y, w, h] = SLOT[i]; panel(x - 4, y - 4, w + 8, h + 8, 'rgba(8,12,18,.85)'); drawViewIn(v, x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, 170, 20); txt(VNAME[v] + ' · bấm để phóng to', x + 6, y + 14, '#cfe0f0', '11px system-ui'); btns.push({ x, y, w, h, fn: () => { ui.main = v; } }); });
  // ---- điện đàm
  if (!ui.focus && ui.radio) drawRadioFull(16, 72, 496, 340);
  // ---- hộp HUD giữa phía trên
  { const lines = [], cols = []; let barFrac = null;
    const nm = M[j].name;
    if (T.phase === 'run') { lines.push(nm + '  ·  ' + (d >= 0 ? 'còn ' + (d >= 1000 ? (d / 1000).toFixed(2) + ' km' : Math.round(d) + ' m') + ' tới vạch' : 'QUÁ VẠCH ' + (-d).toFixed(1) + ' m')); cols.push(Math.abs(d) < 60 ? '#fff' : '#dbe6f2'); barFrac = clamp01(1 - d / 1500);
      if (W.diff.hint >= 1 && d > 0 && d < 9000) { const left = d - T.v * T.v / (2 * 0.55); lines.push(left > 30 ? 'Gợi ý: bắt đầu phanh sau ~' + Math.round(left) + ' m' + (W.diff.hint >= 2 && T.v > 1 ? ' · nấc cần B' + Math.max(1, Math.min(7, Math.ceil(T.v * T.v / (2 * Math.max(d, 1)) / 0.75 * 7))) : '') : 'Gợi ý: PHANH ngay'); cols.push(left > 30 ? '#9fc3ff' : '#ff8a4a'); }
      const tz = Sim.turnoutZones(T).find(z => z.s1 > T.x); if (tz) { lines.push(T.x < tz.s0 ? 'Ghi ' + Math.round(tz.v * 3.6) + ' km/h sau ' + Math.round(tz.s0 - T.x) + ' m' : 'Đang qua ghi · ≤ ' + Math.round(tz.v * 3.6) + ' km/h'); cols.push('#ffc247'); } }
    else if (T.phase === 'dwell') { const e = -d; lines.push(nm + '  ·  LỆCH VẠCH ' + (e >= 0 ? '+' : '') + e.toFixed(2) + ' m'); cols.push('#fff');
      const mk = M[T.k], dep = mk.dep != null ? mk.dep : 0, hold = T.holds[T.k]; lines.push('Cửa: ' + (T.door === 'open' ? 'MỞ (đỗ ' + Math.round(T.dwellT) + ' s)' : T.door === 'closing' ? 'ĐANG ĐÓNG' : 'ĐÃ ĐÓNG → kéo cần') + ' · KH đi ' + hhmm(W.trip.t0 + dep) + (hold && hold > dep ? ' (giữ tới ' + hhmm(W.trip.t0 + hold) + ')' : '')); cols.push(T.door === 'closed' ? '#4cd68a' : '#ffc247');
      const nx = W.passers && W.passers[T.k] && W.passers[T.k].filter(p => p.t - W.t > -8).sort((a, b) => a.t - b.t)[0]; if (nx) { const dt = nx.t - W.t; lines.push(dt > 4.5 ? nx.label + ' thông qua đường thông qua sau ' + Math.round(dt) + ' s' : nx.label + ' ĐANG THÔNG QUA'); cols.push('#ffd88a'); } }
    if (lines.length && !tutLessonActive) { const hw = 560, hx = (FW - hw) / 2, hy = TOPH + 14, hh = lines.length * 22 + 14; ctx.fillStyle = 'rgba(8,12,18,.62)'; ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, 8); ctx.fill();
      lines.forEach((l, i) => txt(l, hx + 14, hy + 24 + i * 22, cols[i], (i === 0 ? 'bold 16px' : '13px') + ' system-ui'));
      if (barFrac !== null) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(hx + hw - 84, hy + 12, 70, 6); ctx.fillStyle = '#4aa3ff'; ctx.fillRect(hx + hw - 84, hy + 12, 70 * barFrac, 6); } } }
  // ---- bảng điều khiển phía dưới
  { const g = ctx.createLinearGradient(0, DASH_Y, 0, FH); g.addColorStop(0, '#0d1319'); g.addColorStop(1, '#070a0e'); ctx.fillStyle = g; ctx.fillRect(0, DASH_Y, FW, FH - DASH_Y); ctx.fillStyle = '#2a3b4f'; ctx.fillRect(0, DASH_Y, FW, 3); }
  const PY = DASH_Y + 14, PH = FH - PY - 14;
  lever(20, PY, 236, PH, 'pw'); lever(1664, PY, 236, PH, 'bk');
  // đồng hồ phụ
  if (!ui.focus) { panel(268, PY, 360, PH); txt('ĐỒNG HỒ PHỤ', 448, PY + 22, '#fff', 'bold 14px system-ui', 'center');
    const Ft = T.f >= 0 ? T.f * Sim.tractiveOf(T, T.v) : 0, amps = T.f >= 0 ? Ft * T.v / 25000 : -(Math.min(1.4, -T.f) / 1.4) * Math.min(500, T.v * 3.6 * 2.2), bar = (T.f < 0 ? Math.min(1.4, -T.f) / 1.4 : 0) * 5;
    miniGauge(346, PY + 96, 46, amps, -500, 900, 'Dòng kéo', Math.round(amps) + ' A', amps < 0 ? '#4cd68a' : '#4aa3ff', [-500, 0, 400, 900]);
    miniGauge(346, PY + 208, 46, bar, 0, 5, 'Áp phanh', bar.toFixed(1) + ' bar', bar > 3.5 ? '#ff8a4a' : '#ffc247', [0, 2.5, 5]);
    miniGauge(346, PY + 320, 46, T.a, -1.2, 0.8, 'Gia tốc', (T.a >= 0 ? '+' : '') + T.a.toFixed(2) + ' m/s²', T.a < -0.05 ? '#ff8a4a' : '#4aa3ff', [-1, -0.5, 0, 0.5]);
    txt('Dốc ' + (T.grade >= 0 ? '+' : '') + T.grade.toFixed(0) + '‰ (mô phỏng)', 448, PY + PH - 12, Math.abs(T.grade) > 10 ? '#ffc247' : '#7a8ea5', '12px system-ui', 'center'); }
  // đồng hồ tốc độ + công tắc ATC + đèn
  panel(640, PY, 640, PH); bigDial(960, PY + 168, 150, blink);
  { const lampsL = [['ĐÓNG CỬA', T.door === 'closed', '#4cd68a'], ['ATC', T.atc, '#ff5a5a'], ['定速', T.cs, '#3ad6e6'], ['GẠT MƯA', T.wiper, '#4aa3ff'], ['ĐÈN PHA', Sim.lampOn(W, T), '#fff2b0'], ['MƯA', W.rainHere, '#2f6fd6']];
    lampsL.forEach((l, i) => lamp(668 + i * 102, PY + 300, l[0], l[1], l[2]));
    const off = T.atcOn === false, arm = !off && W.t - T.atcArm <= 4, hot = (off || arm) && blink, x0 = 700, y0 = PY + 318, w0 = 520, h0 = 40;
    ctx.fillStyle = off ? (hot ? '#c0392b' : '#8f2a22') : arm ? '#9a6a12' : '#1f6f4a'; ctx.beginPath(); ctx.roundRect(x0, y0, w0, h0, 8); ctx.fill(); ctx.strokeStyle = off || arm ? (hot ? '#ffd0c8' : '#ff7a6a') : '#6fe0a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x0, y0, w0, h0, 8); ctx.stroke();
    txt(off ? 'ATC: ĐANG CẮT — KHÔNG CÓ BẢO VỆ (A để bật)' : arm ? 'XÁC NHẬN CẮT ATC? bấm lại trong 4 s' : 'ATC: BẬT  (A: cắt, bấm 2 lần)', x0 + w0 / 2, y0 + 26, '#fff', 'bold 15px system-ui', 'center'); btns.push({ x: x0, y: y0, w: w0, h: h0, fn: () => doAct('atcsw') }); }
  // nút điều khiển + TIMS
  if (!ui.focus) { panel(1292, PY, 360, PH); txt('NÚT ĐIỀU KHIỂN', 1472, PY + 22, '#fff', 'bold 14px system-ui', 'center');
    const bl = [['Đóng cửa (Enter)', () => doAct('door'), T.door !== 'open', '#e08a2f'], ['Tốc độ không đổi (C)', () => doAct('cs'), T.cs, '#2a8fa0'], ['Gạt mưa (V)', () => doAct('wiper'), T.wiper, '#2a6fd6'], ['Đèn pha: ' + ({ auto: 'tự động', on: 'bật', off: 'tắt' }[T.lamp]) + ' (L)', () => doAct('lamp'), T.lamp !== 'auto', '#c9a227'],
      ['Nhắc lệnh (Y)', () => doAct('ack'), pend > 0 && blink, '#c9a227'], ['Phát thanh (M)', () => doAct('pa'), T.anx > 40 && blink, '#2a8fa0'], ['Tự lái (T)', () => doAct('auto'), auto, '#2a6fd6'], ['Phanh khẩn (Q)', () => doAct('eb'), T.bk === 8, '#d64a4a'], ['Về N (Space)', () => doAct('coast'), false, '#2a6fd6']];
    bl.forEach((b, i) => button(1304 + (i % 2) * 172, PY + 36 + Math.floor(i / 2) * 40, 164, 32, b[0], b[1], b[2], b[3]));
    // TIMS gọn
    const ty = PY + 244; ctx.fillStyle = '#243447'; ctx.fillRect(1304, ty - 8, 336, 1); txt('TIMS (trạng thái xe)', 1304, ty + 8, '#8aa0b5', 'bold 11px system-ui');
    const faultCars = new Set(W.faults.map(f => f.car)), nc = T.veh.cars, cw = Math.min(20, 330 / nc);
    for (let c = 1; c <= nc; c++) { const x = 1304 + (c - 1) * cw, doorCol = T.phase === 'dwell' ? (T.door === 'open' ? '#ffc247' : T.door === 'closing' ? '#e08a2f' : '#4cd68a') : '#2f7a55'; ctx.fillStyle = faultCars.has(c) ? '#ff5a5a' : doorCol; ctx.fillRect(x, ty + 14, cw - 2, 12); }
    const mass = Sim.massOf(T), rows = [['Tải khách', Math.round(T.load * 100) + '% (' + Math.round(mass / 1000) + ' t)'], ['Điện', Math.round(T.kwh) + ' kWh (hoàn ' + Math.round(T.regen) + ')'], ['Độ êm', Math.max(0, Math.round(100 - T.comfort * W.diff.comfortK)) + '/100 · ATC phanh ' + T.atcCount + ' lần']];
    rows.forEach((r, i) => { txt(r[0], 1304, ty + 44 + i * 16, '#8aa0b5', '11px system-ui'); txt(r[1], 1640, ty + 44 + i * 16, '#c8d4e2', '11px system-ui', 'right'); });
    const by = ty + 94; txt('Nhiệt má phanh', 1304, by, '#8aa0b5', '10px system-ui'); ctx.fillStyle = '#243447'; ctx.fillRect(1400, by - 8, 240, 7); ctx.fillStyle = T.bt > 0.8 ? '#ff5a5a' : T.bt > 0.5 ? '#ffc247' : '#4cd68a'; ctx.fillRect(1400, by - 8, 240 * Math.min(1, T.bt), 7);
    txt('Bất an hành khách', 1304, by + 16, '#8aa0b5', '10px system-ui'); ctx.fillStyle = '#243447'; ctx.fillRect(1400, by + 8, 240, 7); ctx.fillStyle = T.anx > 70 ? '#ff5a5a' : T.anx > 40 ? '#ffc247' : '#4cd68a'; ctx.fillRect(1400, by + 8, 240 * Math.min(1, T.anx / 100), 7); }
  // ---- lớp phủ: quyết định điều độ, hướng dẫn, chưa chạy, kết thúc, cảnh báo viền
  if (W.decision) { const dd = W.decision, left = Math.max(0, dd.timeout - (W.t - dd.t0)); ctx.fillStyle = 'rgba(40,30,8,.96)'; ctx.strokeStyle = '#ffc247'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(560, 210, 800, 70, 10); ctx.fill(); ctx.stroke();
    txt(dd.text, 576, 234, '#ffe9b0', 'bold 14px system-ui'); txt('Còn ' + Math.ceil(left) + ' s', 1340, 234, '#ffc247', 'bold 13px system-ui', 'right'); button(576, 248, 170, 24, dd.a.label, () => doAct('ack'), true, '#2a8f5a'); button(756, 248, 170, 24, dd.b.label, () => doAct('no'), true, '#8f3a3a'); }
  if (tutLessonActive) Tutorial.draw(ctx, 520, 300, 880, W, T);
  if (T.finished) { ctx.save(); ctx.translate(400, 60); curOX = 400; drawEnd(); ctx.restore(); curOX = 0; }
  else if (!T.started && !tutLessonActive) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(MAIN_R[0], MAIN_R[1], MAIN_R[2], MAIN_R[3]); txt('Nhấn Enter để đóng cửa, rồi kéo cần gia tốc (W) khi đèn ĐÓNG CỬA sáng', FW / 2, 400, '#fff', 'bold 20px system-ui', 'center'); }
  if (T.atcOn === false && blink) { ctx.strokeStyle = 'rgba(255,60,60,.85)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, FW - 8, FH - 8); } else if (T.cut) { ctx.strokeStyle = 'rgba(154,90,214,.8)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, FW - 8, FH - 8); }
  drawTopBar(blink);
}
const clamp01 = x => Math.max(0, Math.min(1, x));
