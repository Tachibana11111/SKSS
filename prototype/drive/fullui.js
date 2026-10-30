// Bố cục TOÀN MÀN HÌNH 16:9 (canvas 1920×1080): buồng lái phủ kín làm khung chính; bảng điều khiển ở đáy (cần kéo, đồng hồ phụ, đồng hồ tốc độ, nút + TIMS, cần phanh);
// điện đàm trên trái; hai khung phụ (bản đồ nhỏ, 2D) trên phải, bấm vào để hoán đổi làm khung chính (Tab xoay vòng); H = chế độ tập trung; O = ẩn/hiện điện đàm; F11 = toàn màn hình.
// File này dùng các hàm/biến toàn cục của index.html (ctx, txt, panel, button, lamp, btns, doAct, W, T, SPR, FR, TP, AUD, radio, wrapText, hhmm, fmt, Tutorial...).
const ui = { main: 'cab', focus: false, radio: true, cur: 'classic', rear: false };
const FW = 1920, FH = 1080, TOPH = 58, DASH_Y = 676;
const MAIN_R = [0, TOPH, FW, DASH_Y - TOPH];
const SLOT_PIP = [1566, 74, 336, 212];                  // khung phụ góc trên phải
const SLOT_NAT = [1566, 302, 336, 212];                 // ô bản đồ toàn quốc bám theo tàu ta, ngay dưới khung phụ 2D (cùng kích cỡ)
const SLOT_DASH = [276, DASH_Y + 22, 284, 284];          // khung phụ trong bảng điều khiển (trái đồng hồ tốc độ)

// chọn kích thước canvas theo chế độ: lái tàu và hướng dẫn luôn dùng bố cục toàn màn hình 1920×1080 (bố cục cổ điển đã bỏ), chế độ điều độ dùng canvas nhỏ 1780×900
function syncLayout() {
  const want = (mode === 'drive' || mode === 'tutorial') ? 'full' : 'classic';      // lái tàu và hướng dẫn luôn dùng bố cục toàn màn hình; 'classic' chỉ là kích thước canvas nhỏ của chế độ điều độ
  if (want === ui.cur) return; ui.cur = want;
  if (want === 'full') { W_ = FW; H_ = FH; } else { W_ = 1780; H_ = 900; }
  cv.width = Math.round(W_ * QS); cv.height = Math.round(H_ * QS);
  document.body.classList.toggle('fullui', want === 'full');
}
function toggleFullscreen() { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) { } }
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('isfull', !!document.fullscreenElement));
const VIEWS = ['cab', 'top', 'side', 'winL', 'winR'], VNAME = { cab: 'BUỒNG LÁI', top: 'BẢN ĐỒ NHỎ', side: 'GÓC NHÌN NGANG 2D', winL: 'CỬA SỔ TRÁI', winR: 'CỬA SỔ PHẢI' };
function cycleMain() { ui.main = VIEWS[(VIEWS.indexOf(ui.main) + 1) % VIEWS.length]; }

// vẽ một góc nhìn vào hình chữ nhật (x,y,w,h)
function drawViewIn(kind, x, y, w, h, g) {
  g = g || ctx;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (kind === 'cab') (ui.rear ? CabView.drawRear : CabView.draw)(g, x, y, w, h, W, T, { sprites: SPR, fronts: FR, aud: AUD, tile: g !== ctx });
  else if (kind === 'nat') NatMap.drawMini(g, x, y, w, h, W, T, { txt: g === ctx ? txt : (t, tx, ty, col, f, al) => { g.fillStyle = col || '#e8eef5'; g.font = f || '14px system-ui'; g.textAlign = al || 'left'; g.fillText(t, tx, ty); }, button });
  else if (kind === 'top') { TopView.draw(g, x, y, w, h, W, T, { sprites: SPR, tops: TP, aud: AUD }); }
  else if (kind === 'winL' || kind === 'winR') {
    // cửa sổ hành khách là góc nhìn nặng nhất: khi làm khung chính chỉ dựng lại cảnh 30 lần/giây vào canvas đệm rồi dán lại mỗi khung (nhịp còn lại rẻ)
    if (g === ctx && w > 1000) { const wc = WINC[kind] || (WINC[kind] = { cv: document.createElement('canvas'), t: -1e9 }), now = performance.now();
      if (wc.cv.width !== w || wc.cv.height !== h) { wc.cv.width = w; wc.cv.height = h; wc.t = -1e9; }
      if (now - wc.t >= 30 || wc.k !== kind) { const g2 = wc.cv.getContext('2d'); g2.clearRect(0, 0, w, h); WinView.draw(g2, 0, 0, w, h, W, T, { sprites: SPR, aud: AUD }, kind === 'winL' ? 1 : -1); wc.t = now; wc.k = kind; }
      g.drawImage(wc.cv, x, y); }
    else WinView.draw(g, x, y, w, h, W, T, { sprites: SPR, aud: AUD }, kind === 'winL' ? 1 : -1); }
  else { Scene.draw(g, x, y, w, h, W, T, { sprites: SPR, nextTarget: Sim.nextTarget, aud: AUD, rear: ui.rear }); if (Sim.inTunnel(W, T.x)) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y, w, h); } }
  g.restore();
}

// khung phụ (2D, bản đồ nhỏ, bản đồ toàn quốc): vẽ vào canvas đệm và chỉ làm mới ~11 lần/giây rồi dán lại mỗi khung; canvas chạy bằng CPU (không có tăng tốc phần cứng) nên mỗi lần vẽ lại đều tốn thật
const TILE = {}, WINC = {};
function tileView(id, kind, x, y, w, h) {
  const now = performance.now(), pw_ = Math.max(1, Math.round(w * QS)), ph_ = Math.max(1, Math.round(h * QS)); let c = TILE[id];
  if (!c) c = TILE[id] = { cv: document.createElement('canvas'), t: -1e9, kind: '', q: 0 };
  if (c.cv.width !== pw_ || c.cv.height !== ph_) { c.cv.width = pw_; c.cv.height = ph_; c.t = -1e9; }
  if (now - c.t > (kind === 'cab' ? 250 : 90) || c.kind !== kind || c.nat !== ui.nat) { const g = c.cv.getContext('2d'); g.setTransform(QS, 0, 0, QS, 0, 0); g.clearRect(0, 0, w, h); drawViewIn(kind, 0, 0, w, h, g); c.t = now; c.kind = kind; c.nat = ui.nat; }
  ctx.drawImage(c.cv, x, y, w, h);
}

// đồng hồ tròn nhỏ
function miniGauge(mx, my, r, v, lo, hi, label, unit, col, ticks, below) {
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, f = t => a0 + (a1 - a0) * (Math.max(lo, Math.min(hi, t)) - lo) / (hi - lo);
  ctx.lineWidth = 7; ctx.strokeStyle = '#243447'; ctx.beginPath(); ctx.arc(mx, my, r, a0, a1); ctx.stroke(); ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(mx, my, r, f(Math.min(0, hi)), f(v)); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.strokeStyle = '#6a8098'; for (const t of ticks) { const a = f(t); ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * (r + 6), my + Math.sin(a) * (r + 6)); ctx.lineTo(mx + Math.cos(a) * (r + 10), my + Math.sin(a) * (r + 10)); ctx.stroke(); }
  const a = f(v); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * (r - 4), my + Math.sin(a) * (r - 4)); ctx.stroke();
  if (below) { txt(unit, mx, my + r * 0.58, '#e8eef5', 'bold 11px system-ui', 'center'); txt(label, mx, my + r + 20, '#8aa0b5', '12px system-ui', 'center'); }
  else { txt(unit, mx, my + r * 0.62, '#e8eef5', 'bold 14px system-ui', 'center'); txt(label, mx + r + 22, my + 5, '#8aa0b5', '14px system-ui'); }
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
  txt(T.atcOn === false ? 'ATC CẮT' : 'ATC ' + (Math.floor(atcK / 5) * 5), cx, cy + 68 * s, T.atcOn === false ? (blink ? '#ff3b3b' : '#a02020') : T.atc ? '#ff6464' : '#4cd68a', 'bold ' + Math.round(18 * s) + 'px system-ui', 'center'); txt(Sim.ATCN[W.line.meta.atc] || '', cx, cy + 82 * s, '#6f8399', Math.round(10 * s) + 'px system-ui', 'center');
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

  // nút nhỏ: điện đàm, HUD, toàn màn hình
  // các ô vuông biểu tượng cạnh nhau, dồn sát mép phải: camera sau (B), điện đàm (O), toàn màn hình (F11), tạm dừng (Esc)
  const SZ = 44, GAP = 6, nIcons = tutLessonActive ? 4 : 6, bx0 = FW - 16 - nIcons * SZ - (nIcons - 1) * GAP, by0 = 7;      // hướng dẫn: chỉ điện đàm, toàn màn hình, tạm dừng
  let ix = bx0; const nextX = () => { const x = ix; ix += SZ + GAP; return x; };
  if (!tutLessonActive) iconBtn(nextX(), by0, SZ, 'rear', ui.rear, 'B', () => { ui.rear = !ui.rear; });
  // nút âm thanh: bấm 1 lần xổ thanh âm lượng (kèm nút bật/tắt ù cabin), bấm lần 2 tắt tiếng (loa gạch chéo, nút đỏ), bấm tiếp để bật lại
  const sx = nextX(); iconBtn(sx, by0, SZ, 'sound', !!ui.sndOpen, 'Âm', () => { if (!$('snd').checked) { soundSet(true); ui.sndOpen = false; } else if (ui.sndOpen) { soundSet(false); ui.sndOpen = false; } else ui.sndOpen = true; }); btns[btns.length - 1].keep = true;
  volRect = null; if (ui.sndOpen) { const pw = 330, ph = 62, px = sx + SZ - pw, py = by0 + SZ + 8, vol = +$('vol').value, on = $('snd').checked;
    panel(px, py, pw, ph, 'rgba(14,20,28,.96)'); ctx.strokeStyle = '#3b516a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.stroke();
    button(px + 10, py + 12, 86, 38, 'ù cabin (J)', () => { cabinSet(!AUD.cabin); }, !!AUD.cabin, '#2a8f5a', 12); btns[btns.length - 1].keep = true; btns.unshift(btns.pop());      // các nút của bảng âm thanh được ưu tiên bấm trước các nút nằm dưới
    const x0 = px + 116, x1 = px + pw - 36, ty = py + 34; volRect = [x0 - 10, py + 10, x1 - x0 + 20, 42];
    ctx.fillStyle = '#243447'; ctx.beginPath(); ctx.roundRect(x0, ty - 4, x1 - x0, 8, 4); ctx.fill(); ctx.fillStyle = on ? '#4aa3ff' : '#6b7684'; ctx.beginPath(); ctx.roundRect(x0, ty - 4, (x1 - x0) * vol / 100, 8, 4); ctx.fill();
    ctx.fillStyle = on ? '#fff' : '#9aa6b2'; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * vol / 100, ty, 9, 0, 7); ctx.fill(); txt('Âm lượng', x0, py + 20, '#9fb4c9', '11px system-ui'); txt(vol + '%', x1 + 6, ty + 5, '#e8eef5', 'bold 12px system-ui');
    btns.unshift({ x: volRect[0], y: volRect[1], w: volRect[2], h: volRect[3], fn: () => setVolFromX(clk[0]), keep: true }); }
  if (!tutLessonActive) iconBtn(nextX(), by0, SZ, 'speed', scale > 1, 'Tua', () => { scale = scale === 1 ? 4 : scale === 4 ? 16 : 1; });      // nút tua: bấm để đổi ×1 → ×4 → ×16 → ×1
  iconBtn(nextX(), by0, SZ, 'radio', ui.radio, 'O', () => { ui.radio = !ui.radio; });
  iconBtn(nextX(), by0, SZ, 'full', !!document.fullscreenElement, 'F11', toggleFullscreen);
  iconBtn(nextX(), by0, SZ, 'pause', paused, 'P', () => { paused = !paused; });
}

// công tắc ATC lớn, nổi bật: xanh khi bật, vàng khi chờ xác nhận, đỏ nhấp nháy khi đang cắt
function atcButton(x0, y0, w0, h0, blink) {
  const off = T.atcOn === false, arm = !off && W.t - T.atcArm <= 4, hot = (off || arm) && blink;
  ctx.fillStyle = off ? (hot ? '#c0392b' : '#8f2a22') : arm ? '#9a6a12' : '#1f6f4a'; ctx.beginPath(); ctx.roundRect(x0, y0, w0, h0, 10); ctx.fill();
  ctx.strokeStyle = off || arm ? (hot ? '#ffd0c8' : '#ff7a6a') : '#6fe0a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x0, y0, w0, h0, 10); ctx.stroke();
  const nar = w0 < 200, l1 = off ? 'ATC: CẮT' : arm ? (nar ? 'CẮT ATC?' : 'XÁC NHẬN CẮT ATC?') : 'ATC: BẬT', l2 = off ? (nar ? 'A để bật' : 'không có bảo vệ · A để bật') : arm ? (nar ? 'bấm lại (4 s)' : 'bấm lại trong 4 giây') : (nar ? 'A: cắt (2 lần)' : 'A: cắt (bấm hai lần)');
  txt(l1, x0 + w0 / 2, y0 + h0 / 2 - 2, '#fff', 'bold 19px system-ui', 'center'); txt(l2, x0 + w0 / 2, y0 + h0 / 2 + 20, 'rgba(255,255,255,.85)', '12px system-ui', 'center'); btns.push({ x: x0, y: y0, w: w0, h: h0, fn: () => doAct('atcsw') });
}

function panButton(x0, y0, w0, h0) {
  const up = T.pan !== false; ctx.fillStyle = up ? '#243447' : '#8f5a12'; ctx.beginPath(); ctx.roundRect(x0, y0, w0, h0, 10); ctx.fill();
  ctx.strokeStyle = up ? '#3b516a' : '#ffb347'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x0, y0, w0, h0, 10); ctx.stroke();
  txt(up ? 'CẦN VẸT: NÂNG' : 'CẦN VẸT: HẠ', x0 + w0 / 2, y0 + h0 / 2 - 2, '#fff', 'bold 14px system-ui', 'center'); txt('G: ' + (up ? 'hạ' : 'nâng'), x0 + w0 / 2, y0 + h0 / 2 + 20, 'rgba(255,255,255,.85)', '12px system-ui', 'center'); btns.push({ x: x0, y: y0, w: w0, h: h0, fn: () => doAct('pan') });
}

// ô vuông chỉ có biểu tượng (vẽ bằng nét, không dùng emoji để khỏi lệch giữa các máy)
function iconBtn(x, y, sz, kind, on, key, fn) {
  const muted = kind === 'sound' && !$('snd').checked;      // nút âm thanh: đỏ khi tắt tiếng
  ctx.fillStyle = muted ? '#b3342b' : on ? '#2a6fd6' : '#243447'; ctx.beginPath(); ctx.roundRect(x, y, sz, sz, 8); ctx.fill(); ctx.strokeStyle = muted ? '#ff8a80' : on ? '#6fb0ff' : '#3b516a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, sz, sz, 8); ctx.stroke();
  const cx = x + sz / 2, cy = y + sz / 2 - 2; ctx.strokeStyle = on || muted ? '#fff' : '#9fb4c9'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'rear') { ctx.beginPath(); ctx.roundRect(cx - 13, cy - 10, 26, 18, 3); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy - 1, 5, Math.PI * 0.2, Math.PI * 1.55); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 6, cy - 7); ctx.lineTo(cx - 3, cy - 1); ctx.lineTo(cx - 9, cy - 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx - 9, cy + 8); ctx.lineTo(cx - 9, cy + 13); ctx.moveTo(cx + 9, cy + 8); ctx.lineTo(cx + 9, cy + 13); ctx.stroke(); }
  else if (kind === 'radio') { ctx.beginPath(); ctx.roundRect(cx - 12, cy - 10, 24, 17, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 5, cy + 7); ctx.lineTo(cx - 8, cy + 13); ctx.lineTo(cx + 1, cy + 7); ctx.stroke(); for (const dy of [-4, 1]) { ctx.beginPath(); ctx.moveTo(cx - 7, cy + dy); ctx.lineTo(cx + 7, cy + dy); ctx.stroke(); } }
  else if (kind === 'hud') { ctx.beginPath(); ctx.roundRect(cx - 13, cy - 10, 26, 20, 3); ctx.stroke(); ctx.fillRect(cx - 9, cy - 6, 10, 4); ctx.fillRect(cx - 9, cy + 1, 18, 3); }
  else if (kind === 'sound') { ctx.beginPath(); ctx.moveTo(cx - 12, cy - 4); ctx.lineTo(cx - 6, cy - 4); ctx.lineTo(cx + 1, cy - 11); ctx.lineTo(cx + 1, cy + 11); ctx.lineTo(cx - 6, cy + 4); ctx.lineTo(cx - 12, cy + 4); ctx.closePath(); ctx.fill();
    if (muted) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 13, cy - 13); ctx.lineTo(cx + 13, cy + 13); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(cx + 2, cy, 7, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 2, cy, 12, -0.9, 0.9); ctx.stroke(); } }
  else if (kind === 'speed') { txt('×' + scale, cx, cy + 8, on ? '#fff' : '#cfe0f0', 'bold ' + (scale >= 10 ? 19 : 24) + 'px system-ui', 'center'); }
  else if (kind === 'pause') { if (on) { ctx.beginPath(); ctx.moveTo(cx - 7, cy - 11); ctx.lineTo(cx + 10, cy); ctx.lineTo(cx - 7, cy + 11); ctx.closePath(); ctx.fill(); } else { ctx.fillRect(cx - 9, cy - 11, 6, 22); ctx.fillRect(cx + 3, cy - 11, 6, 22); } }
  else { for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * 4, cy + sy * 12); ctx.lineTo(cx + sx * 12, cy + sy * 12); ctx.lineTo(cx + sx * 12, cy + sy * 4); ctx.stroke(); } }
  ctx.lineCap = 'butt'; txt(key, cx, y + sz - 3, on ? '#dbe9ff' : '#7a8ea5', 'bold 9px system-ui', 'center'); btns.push({ x, y, w: sz, h: sz, fn });
}

// ô nút vuông: biểu tượng vẽ bằng nét, nhãn ngắn, phím tắt; sáng khi đang bật
function tileBtn(x, y, s, icon, label, key, on, color, fn) {
  ctx.fillStyle = on ? color : '#243447'; ctx.beginPath(); ctx.roundRect(x, y, s, s, 10); ctx.fill(); ctx.strokeStyle = on ? 'rgba(255,255,255,.65)' : '#3b516a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, s, s, 10); ctx.stroke();
  const cx = x + s / 2, cy = y + s / 2 - 8, c = on ? '#fff' : '#b6c6d8'; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const ln = (a, b, d, e) => { ctx.beginPath(); ctx.moveTo(cx + a, cy + b); ctx.lineTo(cx + d, cy + e); ctx.stroke(); };
  if (icon === 'door') { ctx.beginPath(); ctx.roundRect(cx - 11, cy - 15, 22, 30, 2); ctx.stroke(); ln(-3, -15, -3, 15); ctx.beginPath(); ctx.arc(cx + 5, cy, 1.8, 0, 7); ctx.fill(); }
  else if (icon === 'cruise') { ctx.beginPath(); ctx.arc(cx, cy + 4, 15, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke(); ln(0, 4, 8, -6); ctx.beginPath(); ctx.arc(cx, cy + 4, 2.4, 0, 7); ctx.fill(); ln(-14, 17, 14, 17); }
  else if (icon === 'wiper') { ctx.beginPath(); ctx.arc(cx - 2, cy + 14, 26, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ln(-2, 14, 11, -9); ln(-2, 14, -10, -9); }
  else if (icon === 'lamp') { ctx.beginPath(); ctx.moveTo(cx - 6, cy - 11); ctx.lineTo(cx + 3, cy - 11); ctx.quadraticCurveTo(cx + 10, cy, cx + 3, cy + 11); ctx.lineTo(cx - 6, cy + 11); ctx.closePath(); ctx.stroke(); for (const dy of [-9, 0, 9]) ln(8, dy, 18, dy * 1.4); }
  else if (icon === 'ack') { ctx.beginPath(); ctx.roundRect(cx - 15, cy - 13, 30, 22, 5); ctx.stroke(); ln(-6, 9, -9, 16); ln(-8, -2, -2, 3); ln(-2, 3, 8, -7); }
  else if (icon === 'pa') { ctx.beginPath(); ctx.moveTo(cx - 14, cy - 5); ctx.lineTo(cx - 5, cy - 5); ctx.lineTo(cx + 9, cy - 14); ctx.lineTo(cx + 9, cy + 14); ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx - 14, cy + 5); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 11, cy, 8, -0.9, 0.9); ctx.stroke(); }
  else if (icon === 'auto') { ctx.beginPath(); ctx.arc(cx, cy, 14, 0.4, Math.PI * 1.4); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 14, Math.PI * 1.4 + 0.4, Math.PI * 2.4); ctx.stroke(); ln(10, -9, 15, -14); ln(10, -9, 17, -7); ln(-10, 9, -15, 14); ln(-10, 9, -17, 7); }
  else if (icon === 'eb') { const r = 15; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08); } ctx.closePath(); ctx.stroke(); txt('EB', cx, cy + 5, c, 'bold 13px system-ui', 'center'); }
  else if (icon === 'coast') { ctx.beginPath(); ctx.roundRect(cx - 14, cy - 14, 28, 28, 4); ctx.stroke(); txt('N', cx, cy + 8, c, 'bold 20px system-ui', 'center'); }
  else if (icon === 'horn') { ctx.beginPath(); ctx.roundRect(cx - 15, cy - 5, 9, 10, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 6, cy - 5); ctx.lineTo(cx + 8, cy - 14); ctx.lineTo(cx + 8, cy + 14); ctx.lineTo(cx - 6, cy + 5); ctx.closePath(); ctx.stroke(); ln(13, -6, 17, -9); ln(13, 0, 18, 0); ln(13, 6, 17, 9); }
  ctx.lineCap = 'butt'; txt(label, x + s / 2, y + s - 9, on ? '#fff' : '#9fb4c9', 'bold 10px system-ui', 'center'); txt(key, x + s - 6, y + 12, on ? 'rgba(255,255,255,.8)' : '#6f8399', '9px system-ui', 'right'); btns.push({ x, y, w: s, h: s, fn });
}


// ---- bảng KIỂM TRA riêng cho 923 Doctor Yellow / E926 East i (chế độ nhiệm vụ): đo, đồ thị từng cảm biến, độ phủ, đánh dấu lỗi, giờ chuyến khách đầu ngày
function drawMissionPanel(x, y, w, h) {
  const Ms = W.mission, S = Sim, kmh = T.v * 3.6, band = S.INSPECT[Ms.veh].band, now = performance.now(), keys = Ms.keys;
  ctx.fillStyle = 'rgba(8,12,18,.84)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = '#3b516a'; ctx.lineWidth = 1.5; ctx.stroke();
  txt('KIỂM TRA · ' + S.INSPECT[Ms.veh].name + (Ms.count > 1 ? ` · chặng ${Ms.leg + 1}/${Ms.count}` : ''), x + 14, y + 24, '#ffd24a', 'bold 15px system-ui');
  button(x + w - 236, y + 8, 110, 26, Ms.measure ? 'ĐO: BẬT (X)' : 'ĐO: TẮT (X)', () => doAct('measure'), Ms.measure, '#2a8f5a'); button(x + w - 118, y + 8, 106, 26, 'Đánh dấu (K)', () => doAct('mark'), now - (Ms.markedAt || 0) < 400, '#c9a227');
  // thanh tốc độ với dải đo hợp lệ
  const bx = x + 14, by = y + 46, bw = w - 28, vmax = 300, px = v => bx + bw * Math.min(v, vmax) / vmax; ctx.fillStyle = '#1b2530'; ctx.fillRect(bx, by, bw, 10);
  ctx.fillStyle = 'rgba(76,214,138,.55)'; ctx.fillRect(px(band[0]), by, px(band[1]) - px(band[0]), 10); ctx.fillStyle = '#fff'; ctx.fillRect(px(kmh) - 2, by - 3, 4, 16);
  const inBand = kmh >= band[0] && kmh <= band[1] + 1; txt(`${Math.round(kmh)} km/h · dải đo ${band[0]}–${band[1]}`, bx, by + 28, !Ms.measure ? '#8aa0b5' : inBand ? '#4cd68a' : '#ffc247', '12px system-ui'); txt(Math.abs(T.a) < 0.25 ? 'êm' : 'giật: phép đo giảm', bx + bw, by + 28, Math.abs(T.a) < 0.25 ? '#4cd68a' : '#ffc247', '12px system-ui', 'right');
  // đồ thị từng cảm biến: 1,5 km gần nhất, gờ ở chỗ lỗi
  const gy0 = y + 88, rh = 52, gw = w - 28 - 118;
  keys.forEach((k, i) => { const sn = S.SENSORS[k], yy = gy0 + i * rh, a = Ms.rec[k], q = S.measureQ(T, k), cell = Math.max(0, Math.min(Ms.n - 1, Math.floor((T.x - Ms.s0) / 100))), cov = Ms.cov[k].reduce((p, c) => p + c, 0) / Math.max(1, Ms.n);
    txt(sn.name, x + 14, yy + 12, q > 0.3 ? '#fff' : '#7a8ea5', 'bold 12px system-ui'); ctx.fillStyle = q > 0.3 ? '#4cd68a' : '#3b4a5c'; ctx.beginPath(); ctx.arc(x + 108, yy + 8, 4, 0, 7); ctx.fill();
    const gx = x + 14, gy = yy + 18, gh = 28; ctx.fillStyle = '#10161e'; ctx.fillRect(gx, gy, gw, gh); ctx.strokeStyle = '#243447'; ctx.beginPath(); ctx.moveTo(gx, gy + gh / 2); ctx.lineTo(gx + gw, gy + gh / 2); ctx.stroke();
    const sA = T.x - 1500, last = a.length ? a[a.length - 1] : null; ctx.strokeStyle = q > 0.3 ? '#4aa3ff' : '#4a5a6c'; ctx.lineWidth = 1.3; ctx.beginPath(); let pen = false;
    for (const p of a) { if (p.s < sA) continue; const X = gx + (p.s - sA) / 1500 * gw; if (p.v == null) { pen = false; continue; } const Y = gy + gh / 2 - Math.max(-1, Math.min(1, p.v / (sn.amp * 2))) * gh / 2; if (!pen) { ctx.moveTo(X, Y); pen = true; } else ctx.lineTo(X, Y); } ctx.stroke();
    for (const d of Ms.defects) { if (!d.marked || d.s < sA || d.s > T.x) continue; const X = gx + (d.s - sA) / 1500 * gw; ctx.fillStyle = '#ffd24a'; ctx.fillRect(X - 1, gy, 2, gh); }
    const cur = last && last.v != null && T.x - last.s < 30 ? last.v : null; txt(cur == null ? '—' : (cur >= 0 ? '+' : '') + cur.toFixed(sn.unit === 'm/s²' ? 2 : 1) + ' ' + sn.unit, x + w - 14, yy + 12, cur != null && Math.abs(cur) > sn.amp * 0.9 ? '#ff7a7a' : '#c8d4e2', '12px system-ui', 'right');
    txt('phủ ' + Math.round(cov * 100) + '%', x + w - 14, yy + 34, '#7a8ea5', '11px system-ui', 'right'); ctx.fillStyle = '#1b2530'; ctx.fillRect(x + w - 104, yy + 38, 90, 5); ctx.fillStyle = '#4cd68a'; ctx.fillRect(x + w - 104, yy + 38, 90 * Math.min(1, cov), 5); });
  // bản ghi toàn tuyến: độ phủ trung bình từng ô 100 m, ghim vàng = lỗi đã đánh dấu, vạch trắng = vị trí tàu
  const ry = gy0 + keys.length * rh + 6, rw = w - 28; ctx.fillStyle = '#10161e'; ctx.fillRect(x + 14, ry, rw, 18);
  for (let px_ = 0; px_ < rw; px_++) { const c0 = Math.floor(px_ / rw * Ms.n), c1 = Math.max(c0 + 1, Math.floor((px_ + 1) / rw * Ms.n)); let s = 0, m = 0; for (let c = c0; c < c1 && c < Ms.n; c++) { for (const k of keys) s += Ms.cov[k][c]; m += keys.length; } s = m ? s / m : 0; if (s > 0.02) { ctx.fillStyle = `rgba(76,214,138,${0.25 + 0.75 * s})`; ctx.fillRect(x + 14 + px_, ry, 1, 18); } }      // mỗi cột điểm ảnh lấy trung bình các ô 100 m rơi vào cột đó (tuyến dài hơn số điểm ảnh)
  for (const d of Ms.defects) if (d.marked) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(x + 14 + (d.s - Ms.s0) / (Ms.s1 - Ms.s0) * rw - 1, ry - 3, 3, 24); }
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 14 + Math.max(0, Math.min(1, (T.x - Ms.s0) / (Ms.s1 - Ms.s0))) * rw - 1, ry - 4, 3, 26);
  const seen = Ms.defects.filter(d => d.seen).length, marked = Ms.defects.filter(d => d.marked).length;
  txt(`Phát hiện ${seen} · đã đánh dấu ${marked} · đánh dấu sai ${Ms.falseMarks}`, x + 14, ry + 38, '#c8d4e2', '12px system-ui');
  if (Ms.flash && W.t - Ms.flash.t < 10) txt('▲ ' + Ms.flash.text + ' — bấm K để đánh dấu', x + 14, ry + 56, Math.floor(now / 250) % 2 ? '#ffd24a' : '#ffb347', 'bold 12px system-ui');
  const nf = Ms.nextFirst; if (nf) { const m = nf.margin, tt = Math.max(0, m); txt('Chuyến khách đầu ngày qua ' + nf.name + ': ' + (m >= 0 ? 'còn ' + Math.floor(tt / 3600) + 'h' + String(Math.floor(tt % 3600 / 60)).padStart(2, '0') + 'm' : 'ĐÃ QUÁ GIỜ'), x + 14, ry + 76, m < 0 ? '#ff5a5a' : m < 600 ? '#ff9a4a' : m < 1800 ? '#ffc247' : '#8aa0b5', 'bold 12px system-ui'); }
}

function drawFull() {
  const PY = DASH_Y + 14, PH = FH - PY - 14;
  btns = []; curOX = 0; ctx.clearRect(0, 0, FW, FH); ctx.fillStyle = '#0b0f14'; ctx.fillRect(0, 0, FW, FH);
  if (!W) { txt('Chọn chuyến và nhấn "Bắt đầu / chạy lại", hoặc mở tab Hướng dẫn / Điều độ.', FW / 2, FH / 2, '#8aa0b5', '24px system-ui', 'center'); return; }
  const blink = Math.floor(performance.now() / 400) % 2 === 0, M = T.M, j = T.phase === 'dwell' ? T.k : Sim.nextTarget(T), d = M[j].s - T.x, pend = W.pending.filter(m => !m.done).length;
  // ---- khung chính + hai khung phụ: khung thứ nhất nằm trong bảng điều khiển (bên trái đồng hồ tốc độ), khung thứ hai ở góc trên phải
  drawViewIn(ui.main, MAIN_R[0], MAIN_R[1], MAIN_R[2], MAIN_R[3]);
  const others = VIEWS.filter(v => v !== ui.main), slotLabel = (v, x, y, w) => { if (v === 'top') return; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, Math.min(w, 206), 20); txt(VNAME[v] + ' · bấm để phóng to', x + 6, y + 14, '#cfe0f0', '11px system-ui'); };
  const drawPip = () => { const [x, y, w, h] = SLOT_PIP, v = others[1]; panel(x - 4, y - 4, w + 8, h + 8, 'rgba(8,12,18,.85)'); tileView('pip', v, x, y, w, h); slotLabel(v, x, y, w); btns.push({ x, y, w, h, fn: () => { ui.main = v; } }); };
  // ô dưới khung 2D: bản đồ toàn quốc bám theo tàu ta; khi bản đồ toàn quốc đang là khung chính thì ô này hiện góc nhìn lái tàu hiện tại; bấm hoặc phím D để hoán đổi
  const drawNatTile = () => { const [x, y, w, h] = SLOT_NAT; panel(x - 4, y - 4, w + 8, h + 8, 'rgba(8,12,18,.85)'); tileView('nat', ui.nat ? ui.main : 'nat', x, y, w, h); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, Math.min(w, 250), 20); txt((ui.nat ? VNAME[ui.main] : 'BẢN ĐỒ TOÀN QUỐC') + ' · bấm hoặc D để hoán đổi', x + 6, y + 14, '#cfe0f0', '11px system-ui'); btns.push({ x, y, w, h, fn: () => { ui.nat = !ui.nat; } }); };
  if (!ui.nat) { drawPip(); drawNatTile(); }
  // ---- điện đàm
  if (!ui.focus && ui.radio) drawRadioFull(16, 72, 496, 340);
  if (W.mission && !ui.focus && !ui.radio) drawMissionPanel(16, 72, 520, 450);
  // ---- hộp HUD giữa phía trên
  { const lines = [], cols = []; let barFrac = null;
    const nm = M[j].name;
    if (T.phase === 'run') { lines.push(nm + '  ·  ' + (d >= 0 ? 'còn ' + (d >= 1000 ? (d / 1000).toFixed(2) + ' km' : Math.round(d) + ' m') + ' tới vạch' : 'QUÁ VẠCH ' + (-d).toFixed(1) + ' m')); cols.push(Math.abs(d) < 60 ? '#fff' : '#dbe6f2'); barFrac = clamp01(1 - d / 1500);
      if (W.diff.hint >= 1 && d > 0 && d < 9000) { const left = d - T.v * T.v / (2 * 0.55); lines.push(left > 30 ? 'Gợi ý: bắt đầu phanh sau ~' + Math.round(left) + ' m' + (W.diff.hint >= 2 && T.v > 1 ? ' · nấc cần B' + Math.max(1, Math.min(7, Math.ceil(T.v * T.v / (2 * Math.max(d, 1)) / 0.75 * 7))) : '') : 'Gợi ý: PHANH ngay'); cols.push(left > 30 ? '#9fc3ff' : '#ff8a4a'); }
      const tz = Sim.turnoutZones(T).find(z => z.s1 > T.x); if (tz) { lines.push(T.x < tz.s0 ? 'Ghi ' + Math.round(tz.v * 3.6) + ' km/h sau ' + Math.round(tz.s0 - T.x) + ' m' : 'Đang qua ghi · ≤ ' + Math.round(tz.v * 3.6) + ' km/h'); cols.push('#ffc247'); } }
    else if (T.phase === 'dwell') { const e = -d; lines.push(nm + '  ·  LỆCH VẠCH ' + (e >= 0 ? '+' : '') + e.toFixed(2) + ' m'); cols.push('#fff');
      const mk = M[T.k], dep = mk.dep != null ? mk.dep : 0, hold = T.holds[T.k]; lines.push('Cửa: ' + (T.door === 'open' ? 'MỞ (đỗ ' + Math.round(T.dwellT) + ' s)' : T.door === 'closing' ? 'ĐANG ĐÓNG' : 'ĐÃ ĐÓNG → kéo cần') + ' · KH đi ' + hhmm(W.trip.t0 + dep) + (hold && hold > dep ? ' (giữ tới ' + hhmm(W.trip.t0 + hold) + ')' : '')); cols.push(T.door === 'closed' ? '#4cd68a' : '#ffc247');
      const nx = Sim.passersAt(W, T.k).filter(p => p.t - W.t > -8).sort((a, b) => a.t - b.t)[0]; if (nx) { const dt = nx.t - W.t; lines.push(dt > 4.5 ? nx.label + ' thông qua đường thông qua sau ' + Math.round(dt) + ' s' : nx.label + ' ĐANG THÔNG QUA'); cols.push('#ffd88a'); } }
    { const delay = W.t - Sim.plannedTime(T), hw = 560, hx = (FW - hw) / 2 + hw + 12, hy = TOPH + 14, col = Math.abs(delay) <= 15 ? '#4cd68a' : delay > 0 ? '#ff6464' : '#ffc247';      // lệch giờ: ngay bên phải hộp "còn xx km tới vạch"
      ctx.fillStyle = 'rgba(8,12,18,.62)'; ctx.beginPath(); ctx.roundRect(hx, hy, 150, 48, 8); ctx.fill();
      txt((delay >= 0 ? '+' : '') + Math.round(delay) + ' s' + (T.started ? '' : ' (chưa chạy)'), hx + 12, hy + 26, col, 'bold 18px system-ui'); txt('lệch kế hoạch', hx + 12, hy + 41, '#7a8ea5', '10px system-ui'); }
    if (lines.length && !tutLessonActive) { const hw = 560, hx = (FW - hw) / 2, hy = TOPH + 14, hh = lines.length * 22 + 14; ctx.fillStyle = 'rgba(8,12,18,.62)'; ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, 8); ctx.fill();
      lines.forEach((l, i) => txt(l, hx + 14, hy + 24 + i * 22, cols[i], (i === 0 ? 'bold 16px' : '13px') + ' system-ui'));
      if (barFrac !== null) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(hx + hw - 84, hy + 12, 70, 6); ctx.fillStyle = '#4aa3ff'; ctx.fillRect(hx + hw - 84, hy + 12, 70 * barFrac, 6); } } }
  // ---- bảng điều khiển phía dưới
  { const g = ctx.createLinearGradient(0, DASH_Y, 0, FH); g.addColorStop(0, '#0d1319'); g.addColorStop(1, '#070a0e'); ctx.fillStyle = g; ctx.fillRect(0, DASH_Y, FW, FH - DASH_Y); ctx.fillStyle = '#2a3b4f'; ctx.fillRect(0, DASH_Y, FW, 3); }
  lever(20, PY, 236, PH, 'pw'); lever(1664, PY, 236, PH, 'bk');
  // bảng trái: khung phụ (bản đồ nhỏ) + công tắc ATC ngay dưới
  if (!ui.focus) { panel(268, PY, 300, PH); const [x, y, w, h] = SLOT_DASH, v = others[0]; tileView('dash', v, x, y, w, h); slotLabel(v, x, y, w); btns.push({ x, y, w, h, fn: () => { ui.main = v; } }); atcButton(276, PY + 300, 140, 66, blink); panButton(424, PY + 300, 136, 66); }
  // đồng hồ tốc độ (lệch trái), đèn báo xếp dọc bên phải, ba đồng hồ phụ nhỏ ngay dưới
  panel(580, PY, 600, PH); bigDial(820, PY + 150, 125, blink);
  { const lampsL = [['ĐÓNG CỬA', T.door === 'closed', '#4cd68a'], ['ATC', T.atc, '#ff5a5a'], ['定速', T.cs, '#3ad6e6'], ['GẠT MƯA', T.wiper, '#4aa3ff'], ['ĐÈN PHA', Sim.lampOn(W, T), '#fff2b0'], ['MƯA', W.rainHere, '#2f6fd6']];
    lampsL.forEach((l, i) => lamp(1046, PY + 44 + i * 34, l[0], l[1], l[2]));
    txt('Dốc ' + (T.grade >= 0 ? '+' : '') + T.grade.toFixed(0) + '‰ (mô phỏng)', 1034, PY + 268, Math.abs(T.grade) > 10 ? '#ffc247' : '#7a8ea5', '11px system-ui'); }
  if (!ui.focus) { const Ft = T.f >= 0 ? T.f * Sim.tractiveOf(T, T.v) : 0, amps = T.f >= 0 ? Ft * T.v / 25000 : -(Math.min(1.4, -T.f) / 1.4) * Math.min(500, T.v * 3.6 * 2.2), bar = (T.f < 0 ? Math.min(1.4, -T.f) / 1.4 : 0) * 5;
    miniGauge(696, PY + 318, 32, amps, -500, 900, 'Dòng kéo', Math.round(amps) + ' A', amps < 0 ? '#4cd68a' : '#4aa3ff', [-500, 0, 400, 900], true);
    miniGauge(820, PY + 318, 32, bar, 0, 5, 'Áp phanh', bar.toFixed(1) + ' bar', bar > 3.5 ? '#ff8a4a' : '#ffc247', [0, 2.5, 5], true);
    miniGauge(944, PY + 318, 32, T.a, -1.2, 0.8, 'Gia tốc', (T.a >= 0 ? '+' : '') + T.a.toFixed(2), T.a < -0.05 ? '#ff8a4a' : '#4aa3ff', [-1, -0.5, 0, 0.5], true); }
  else atcButton(640, PY + 300, 480, 66, blink);        // chế độ tập trung: nút ATC về dưới đồng hồ tốc độ
  // nút điều khiển: 10 ô vuông (biểu tượng + nhãn ngắn + phím) + TIMS gọn bên dưới
  if (!ui.focus) { const PX = 1192, PW = 460; panel(PX, PY, PW, PH); txt('NÚT ĐIỀU KHIỂN', PX + PW / 2, PY + 22, '#fff', 'bold 14px system-ui', 'center');
    const lampLab = { auto: 'Tự động', on: 'Bật', off: 'Tắt' }[T.lamp], tl = [
      ['door', 'Đóng cửa', 'Enter', () => doAct('door'), T.door !== 'open', '#e08a2f'], ['cruise', 'Tốc độ đều', 'C', () => doAct('cs'), T.cs, '#2a8fa0'], ['wiper', 'Gạt mưa', 'V', () => doAct('wiper'), T.wiper, '#2a6fd6'],
      ['lamp', 'Đèn: ' + lampLab, 'L', () => doAct('lamp'), T.lamp !== 'auto', '#c9a227'], ['ack', 'Nhắc lệnh', 'Y', () => doAct('ack'), pend > 0 && blink, '#c9a227'],
      ['pa', 'Phát thanh', 'M', () => doAct('pa'), T.anx > 40 && blink, '#2a8fa0'], ['auto', 'Tự lái', 'T', () => doAct('auto'), auto, '#2a6fd6'], ['eb', 'Phanh khẩn', 'Q', () => doAct('eb'), T.bk === 8, '#d64a4a'],
      ['coast', 'Về N', 'Space', () => doAct('coast'), false, '#2a6fd6'], ['horn', 'Còi', 'H', () => doAct('horn'), T.horn > 0, '#c9a227']], TS = 82, TG = 6;
    (tutLessonActive ? tl.filter(t => t[0] !== 'auto') : tl).forEach((t, i) => tileBtn(PX + 12 + (i % 5) * (TS + TG), PY + 36 + Math.floor(i / 5) * (TS + TG), TS, t[0], t[1], t[2], t[4], t[5], t[3]));
    const ty = PY + 36 + 2 * (TS + TG) + 10; ctx.fillStyle = '#243447'; ctx.fillRect(PX + 12, ty - 6, PW - 24, 1); txt('TIMS (trạng thái xe)', PX + 12, ty + 12, '#8aa0b5', 'bold 11px system-ui');
    const faultCars = new Set(W.faults.map(f => f.car)), nc = T.veh.cars, cw = Math.min(26, (PW - 24) / nc);
    for (let c = 1; c <= nc; c++) { const x = PX + 12 + (c - 1) * cw, doorCol = T.phase === 'dwell' ? (T.door === 'open' ? '#ffc247' : T.door === 'closing' ? '#e08a2f' : '#4cd68a') : '#2f7a55'; ctx.fillStyle = faultCars.has(c) ? '#ff5a5a' : doorCol; ctx.fillRect(x, ty + 20, cw - 3, 13); txt(c, x + (cw - 3) / 2, ty + 46, '#7a8ea5', '8px system-ui', 'center'); }
    const mass = Sim.massOf(T), rows = [['Tải khách', Math.round(T.load * 100) + '% (' + Math.round(mass / 1000) + ' t)'], ['Điện', Math.round(T.kwh) + ' kWh (hoàn ' + Math.round(T.regen) + ')'], ['Độ êm', Math.max(0, Math.round(100 - T.comfort * W.diff.comfortK)) + '/100 · ATC phanh ' + T.atcCount + ' lần']];
    rows.forEach((r, i) => { txt(r[0], PX + 12, ty + 64 + i * 16, '#8aa0b5', '11px system-ui'); txt(r[1], PX + PW - 12, ty + 64 + i * 16, '#c8d4e2', '11px system-ui', 'right'); });
    const by = ty + 118; txt('Nhiệt má phanh', PX + 12, by, '#8aa0b5', '10px system-ui'); ctx.fillStyle = '#243447'; ctx.fillRect(PX + 130, by - 8, PW - 142, 7); ctx.fillStyle = T.bt > 0.8 ? '#ff5a5a' : T.bt > 0.5 ? '#ffc247' : '#4cd68a'; ctx.fillRect(PX + 130, by - 8, (PW - 142) * Math.min(1, T.bt), 7);
    txt('Bất an hành khách', PX + 12, by + 16, '#8aa0b5', '10px system-ui'); ctx.fillStyle = '#243447'; ctx.fillRect(PX + 130, by + 8, PW - 142, 7); ctx.fillStyle = T.anx > 70 ? '#ff5a5a' : T.anx > 40 ? '#ffc247' : '#4cd68a'; ctx.fillRect(PX + 130, by + 8, (PW - 142) * Math.min(1, T.anx / 100), 7); }
  // ---- lớp phủ: quyết định điều độ, hướng dẫn, chưa chạy, kết thúc, cảnh báo viền
  if (W.decision) { const dd = W.decision, left = Math.max(0, dd.timeout - (W.t - dd.t0)); ctx.fillStyle = 'rgba(40,30,8,.96)'; ctx.strokeStyle = '#ffc247'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(560, 210, 800, 70, 10); ctx.fill(); ctx.stroke();
    txt(dd.text, 576, 234, '#ffe9b0', 'bold 14px system-ui'); txt('Còn ' + Math.ceil(left) + ' s', 1340, 234, '#ffc247', 'bold 13px system-ui', 'right'); button(576, 248, 170, 24, dd.a.label, () => doAct('ack'), true, '#2a8f5a'); button(756, 248, 170, 24, dd.b.label, () => doAct('no'), true, '#8f3a3a'); }
  if (tutLessonActive) Tutorial.draw(ctx, (FW - 560) / 2, TOPH + 14, 560, W, T);
  if (T.finished && tutLessonActive) drawTutEnd();
  else if (T.finished) { ctx.save(); ctx.translate(400, 60); curOX = 400; curOY = 60; drawEnd(); ctx.restore(); curOX = 0; curOY = 0; }
  else if (!T.started && !tutLessonActive) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(MAIN_R[0], MAIN_R[1], MAIN_R[2], MAIN_R[3]); txt('Nhấn Enter để đóng cửa, rồi kéo cần gia tốc (W) khi đèn ĐÓNG CỬA sáng', FW / 2, 400, '#fff', 'bold 20px system-ui', 'center'); }
  if (T.atcOn === false && blink) { ctx.strokeStyle = 'rgba(255,60,60,.85)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, FW - 8, FH - 8); } else if (T.cut) { ctx.strokeStyle = 'rgba(154,90,214,.8)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, FW - 8, FH - 8); }
  if (ui.nat) { btns = btns.filter(b => !(b.x + b.w / 2 > MAIN_R[0] && b.x + b.w / 2 < MAIN_R[0] + MAIN_R[2] && b.y + b.h / 2 > MAIN_R[1] && b.y + b.h / 2 < MAIN_R[1] + MAIN_R[3]));      // bản đồ toàn quốc phủ kín khung chính, che cả các lớp phủ và nút bên dưới
   ctx.save(); ctx.beginPath(); ctx.rect(MAIN_R[0], MAIN_R[1], MAIN_R[2], MAIN_R[3]); ctx.clip(); NatMap.draw(ctx, MAIN_R[0], MAIN_R[1], MAIN_R[2], MAIN_R[3], W, T, { txt, button, checkin: t => checkinTrain(t), close: () => { ui.nat = false; }, save: v => { try { Store.setting('natLight', v ? 1 : 0); } catch (e) { } } }); ctx.restore(); drawPip(); drawNatTile(); }
  drawTopBar(blink);
}
// màn kết thúc rút gọn của hướng dẫn: chỉ kết quả và hai nút (chạy lại bài / bài kế)
function drawTutEnd() {
  const sc = Sim.score(T, W), x = (FW - 520) / 2, y = 250, S = Tutorial.S, L = Tutorial.LESSONS[S.lesson], nxt = S.lesson + 1 < Tutorial.LESSONS.length ? S.lesson + 1 : -1;
  ctx.fillStyle = 'rgba(8,12,18,.94)'; ctx.strokeStyle = T.failed ? '#ff6464' : '#4cd68a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 520, 190, 12); ctx.fill(); ctx.stroke();
  txt(T.failed ? (T.collision ? 'VA CHẠM: kết thúc chuyến' : 'Chuyến không đạt') : 'Xong ' + L.title, x + 260, y + 40, '#fff', 'bold 20px system-ui', 'center');
  txt('Điểm chuyến ' + sc.final + ' · thời gian chạy ' + fmt(endT != null ? endT : W.t), x + 260, y + 68, '#9fb4c9', '14px system-ui', 'center');
  button(x + 40, y + 110, 200, 40, 'Làm lại bài (R)', () => startLesson(S.lesson), true, '#2a6fd6');
  if (nxt >= 0) button(x + 280, y + 110, 200, 40, 'Bài kế tiếp →', () => startLesson(nxt), true, '#2a8f5a'); }

const clamp01 = x => Math.max(0, Math.min(1, x));
