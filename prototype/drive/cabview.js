// Khung nhìn thẳng phía trước từ buồng lái (giả 3D, phối cảnh một điểm tụ). Dùng ảnh mặt trước thật của từng dòng tàu (rail.kychung.com) cho tàu phía trước,
// tàu ngược chiều; tàu vượt dùng dải ảnh nhìn ngang chiếu phối cảnh. Mọi thứ khác (ray, sân ga, trụ điện, nhà cửa, cây, người, biển) vẽ bằng code [I].
// Toạ độ mô hình: Z = khoảng cách phía trước (m, theo chiều chạy), X = ngang (m), Y = cao (m). Nhật chạy bên TRÁI: proj() lật X (MIR=-1) nên X dương hiện bên trái màn hình.
// Đường thông qua của ta ở X=0, đường thông qua ngược chiều ở X=-4,3 (ADJ); bố trí từng ga (số đường, sân đảo/hai bên) lấy từ layout.js; đường cong và cao độ (nền/cầu cạn/cầu/hầm) từ dữ liệu tuyến.
(function (root) {
  const CAMH = 2.9, GAUGE = 1.435, MIR = -1, ADJ = -4.3, ADJ0 = -4.3, PEDGE = 1.75, PH = 1.25, ZN = 3.5, ZF = 2600, STEP = 10;
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
  const mixc = (c1, c2, t) => 'rgb(' + [0, 1, 2].map(i => Math.round(lerp(c1[i], c2[i], t))).join(',') + ')';
  const SMAP = { N700: 'n700', N700S: 'n700s', 'N700-8': 'n700s', S800: 's800', E5: 'e5', E7: 'e7', H5: 'h5', E6: 'e6', E8: 'e8', T4: 't4', E926: 'e926', E2: 'e2', 'E5+E6': 'e5', 'E5+E8': 'e5', 'E6+E5': 'e6', 'E8+E5': 'e8', 'N700S-6': 'kamome' };
  const stCache = {};
  // vị trí hai đèn (đèn pha / đèn đuôi) trên ảnh mặt trước từng mẫu tàu: [x trái, x phải, y] theo tỉ lệ rộng/cao ảnh; đo bằng mắt từ front_*.png [I]; s800 và t4 đo từ ảnh phóng to
  const LAMPS = { e2: [0.38, 0.62, 0.22], e5: [0.42, 0.58, 0.21], h5: [0.42, 0.58, 0.21], e6: [0.22, 0.78, 0.45], e7: [0.19, 0.80, 0.53], e8: [0.10, 0.88, 0.35], e926: [0.30, 0.72, 0.53], n700: [0.17, 0.82, 0.61], n700s: [0.18, 0.81, 0.60], kamome: [0.18, 0.81, 0.60], s800: [0.32, 0.68, 0.46], t4: [0.36, 0.62, 0.40] };

  // chiếu điểm (X,Y,Z) lên màn hình; c = {cx, hy, f, camX, pitch, lane, off(Z)}
  function proj(c, X, Y, Z) { return [c.cx + c.f * (MIR * (X - (c.lane || 0) + (c.off ? c.off(Z) : 0)) - c.camX) / Z, c.hy + c.pitch + c.f * (CAMH - Y) / Z]; }

  // mô tả một ô phong cảnh (xác định theo vị trí thế giới): dùng cả cho vẽ lẫn kiểm thử
  function cellObject(seed, biome, side) {
    const r1 = hash(seed * 7919 + side * 31 + 5), r2 = hash(seed * 104729 + side * 17 + 9), r3 = hash(seed * 15485863 + side * 7 + 3), r4 = hash(seed * 32452843 + side + 11);
    if (biome === 'urban') { if (r1 > 0.72) return null; return { kind: 'building', lat: 12 + r2 * 55, w: 10 + r3 * 24, d: 12 + r4 * 18, h: 8 + r1 * 60 / 0.72 * (0.3 + r2 * 0.7), tone: r3 }; }
    if (biome === 'mountain') { if (r1 > 0.85) return null; return { kind: 'tree', lat: 7 + r2 * 60, h: 8 + r3 * 14, w: 4 + r4 * 5, tone: r4, conifer: true }; }
    if (r1 < 0.30) return { kind: 'tree', lat: 6 + r2 * 45, h: 5 + r3 * 7, w: 3 + r4 * 4, tone: r4, conifer: r3 > 0.7 };
    if (r1 < 0.37) return { kind: 'house', lat: 10 + r2 * 40, w: 7 + r3 * 5, d: 8 + r4 * 4, h: 5 + r2 * 3, tone: r3 };
    if (r1 < 0.62) return { kind: 'field', lat: 5 + r2 * 30, w: 18 + r3 * 40, d: 20 + r4 * 40, tone: r4 };
    return null;
  }
  function personColor(i) { return ['#3b4a5e', '#5a3b4a', '#2f5a48', '#6a6a2f', '#4a4a6a', '#6a4a3a'][i % 6]; }

  // ---- hình dáng mũi tàu từ ảnh nhìn ngang (đầu tàu ở bên phải ảnh, đuôi ở bên trái). h[x]: chiều cao phần ảnh có màu ở cột x (0 = cột trong suốt); trả { head, tail } với { NL: độ dài mũi (m), r[i]: tỉ lệ chiều cao đường nét mũi tại i/NOSE_N độ dài mũi tính từ đầu mũi (r[0] ở đầu mũi, r[NOSE_N] = 1) }
  // vị trí ngang (tâm) của mặt trước để MÉP GẦN camera của nó trùng mặt phẳng thân xb (ảnh nhìn ngang vẽ ở xb): nửa bề rộng mặt trước = 1,7 m × fw; tính theo xb nên đúng ở mọi làn (không phụ thuộc khoảng cách tới camera)
  const faceX = (xb, lane, fw) => xb - (lane > xb ? 1 : -1) * 1.7 * fw;
  const NOSE_N = 10, NOSE_ROWS = 96, NOSE_DEPTH = 1;      // số mẫu hồ sơ mũi; số dải ngang của mặt trước; hệ số độ sâu: 1 = dải ở đúng độ sâu của đường nét mũi trong ảnh nhìn ngang (khác 1 thì mặt trước lệch khỏi thân, hở một khe tối)
  function noseFromHeights(h, lenM, Hfull) {
    let x0 = 0, x1 = h.length - 1; while (x0 < x1 && !(h[x0] > 0)) x0++; while (x1 > x0 && !(h[x1] > 0)) x1--; if (x1 - x0 < 16) return null; const mid = []; for (let x = x0 + Math.floor((x1 - x0) * 0.12); x <= x1 - Math.floor((x1 - x0) * 0.12); x += 3) if (h[x] > 0) mid.push(h[x]); if (mid.length < 4) return null; mid.sort((p, q) => p - q); const mx = mid[mid.length >> 1]; if (!(mx > 0)) return null;      // chiều cao chuẩn = trung vị chiều cao thân (không lấy điểm cao nhất vì cần lấy điện và hộp thiết bị trên mái làm mũi dài giả)
    const span = x1 - x0 + 1, mPerPx = lenM / span, one = (from, dir) => { let k = 0; while (k < span * 0.25 && h[from + dir * k] / mx < 0.97) k++; const NL = clamp(k * mPerPx, 2, Math.min(0.25 * lenM, 18)), r = new Float32Array(NOSE_N + 1); for (let i = 0; i <= NOSE_N; i++) { const kk = Math.min(span - 1, Math.round(NL / mPerPx * i / NOSE_N)); r[i] = clamp(h[from + dir * kk] / mx, 0.3, 1); } r[NOSE_N] = 1; return { NL, r }; };
    return { head: one(x1, -1), tail: one(x0, 1), bodyR: Hfull > 0 ? Math.min(1, mx / Hfull) : 0 };      // bodyR: chiều cao thân (trung vị) trên chiều cao cả ảnh; ảnh có ụ/cần lấy điện trên mái thì thân thật thấp hơn ảnh
  }
  const noseCache = new WeakMap();
  function noseOf(sp, lenM) {      // đọc kênh trong suốt của ảnh nhìn ngang một lần cho mỗi ảnh; không đọc được (không có DOM, ảnh bị chặn) thì null và vẽ tấm phẳng như cũ
    if (!sp || !sp.ready || !sp.img || !sp.meta || !(lenM > 0)) return null; if (noseCache.has(sp)) return noseCache.get(sp); let res = null;
    try { const m = sp.meta, W2 = Math.min(m.width, 6000), H2 = Math.max(8, Math.round(m.height * W2 / m.width)), cv2 = document.createElement('canvas'); cv2.width = W2; cv2.height = H2; const g = cv2.getContext('2d', { willReadFrequently: true }); g.drawImage(sp.img, 0, 0, m.width, m.height, 0, 0, W2, H2); const d = g.getImageData(0, 0, W2, H2).data, hh = new Float32Array(W2);
      for (let x = 0; x < W2; x++) { let y0 = -1; for (let y = 0; y < H2; y++) if (d[(y * W2 + x) * 4 + 3] > 60) { y0 = y; break; } hh[x] = y0 < 0 ? 0 : H2 - y0; }      // chiều cao tính từ đáy ảnh tới đường nét trên
      res = noseFromHeights(hh, lenM, H2); } catch (e) { res = null; }
    noseCache.set(sp, res); return res;
  }
  function draw(ctx, px, py, pw, ph, W, T, R) {
    const now = performance.now(), v = T.v, items = [];
    const L = W.line, S = root.Sim, M = T.M, LAY = root.Layout;
    // camera sau: toạ độ phản chiếu nên vùng toả đường của ga (trước vạch 1150 m, sau vạch 630 m) và ghi chữ X đảo phía; spread phải tính trong hệ toạ độ gốc
    const ADJ = ADJ0;
    const Lm2 = L.kmEnd * 1000, physLoZ = -440 - T.x, physHiZ = Lm2 + 15 - T.x, spreadF = LAY.spread, trackWF = (t, a, b) => LAY.trackW(t, a, b), FA = 1150, FB = 630, XA = 1300, XB = 720;
    const detWF = (st, a, b) => LAY.detourX(st, a, b);      // đoạn vòng của đường chính (Sendai chiều xuống)
    const oppDetWF = (st, a, b) => LAY.oppDetourX(st, a, b);      // làn ngược chiều đi vòng (Sendai, chiều lên)
    const onDet = q => q.st.detour && !(q.stopHere && !q.m.mainStop && !q.st.ours.main);      // tàu chạy trên đường chính (thông qua hoặc đỗ ở đường chính) phải đi vòng; đỗ ở đường ngoài thì không
    const hour = ((W.trip.t0 + W.t) % 86400 + 86400) % 86400 / 3600;
    const day = smooth(5.3, 7.3, hour) * (1 - smooth(16.8, 19.0, hour)), night = 1 - day, dusk = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.2) + Math.max(0, 1 - Math.abs(hour - 17.8) / 1.3);
    const inSnow = W.zones.some(z => z.kind === 'snow' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 3000 && T.x < z.s1), rain = W.rainHere;
    const windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    const wx = rain ? 0.55 : inSnow ? 0.4 : 0, fogZ = rain ? 700 : inSnow ? 900 : 3500;
    const dirS = W.dir === 'up' ? -1 : 1;
    let sh = 0; if (W.eqkAt !== undefined && W.eqkActive) sh = 5 * Math.exp(-(W.t - W.eqkAt) / 40) + 0.8; if (W.shakeAt !== undefined && W.t - W.shakeAt < 4) sh = Math.max(sh, (W.shakeAmp || 4) * Math.exp(-(W.t - W.shakeAt) / 1.2));
    const sway = 0.1 * Math.sin(T.x / 90) * Math.min(1, v / 70) + (sh > 0.1 ? (Math.random() - 0.5) * sh * 0.05 : 0);
    const bob = Math.min(1, v / 80) * (Math.sin(now / 90) * 0.4) + (sh > 0.1 ? (Math.random() - 0.5) * sh * 2 : 0);
    const c = { cx: px + pw / 2, hy: py + ph * 0.40, f: Math.min(pw * 0.92, ph * 1.45), camX: sway, pitch: bob - T.grade * 0.4, lane: 0, off: null };

    // ---- hình học phía trước: đường cong (độ lệch ngang theo khoảng cách) và cao độ tuyến so với mặt đất
    const latT = LAY.lateralTable(L, S, W.dir, T.x, ZF, STEP), elvT = LAY.elevTable(L, S, W.dir, T.x, ZF, STEP);
    const tab = (a, z) => { const f = Math.max(0, z) / STEP, i = Math.min(a.length - 2, Math.floor(f)); return a[i] + (a[i + 1] - a[i]) * (f - i); };
    c.off = z => tab(latT, z); const elAt = z => tab(elvT, z);
    if (S.runCfg(W)) { const off0 = c.off; c.off = z => off0(z) + S.runStep(W, T.x + z); }      // ngã rẽ Akita chiều lên: vật thể trước ngã rẽ (khung đường mini) lệch ADJ so với khung đường chính Tohoku
    // nút giao Takasaki (junction xb, docs/16): đường Hokuriku lên đi theo đường nhánh dưới của ga rồi chui dưới cầu cạn Joetsu; đường của tuyến kia lệch cao độ so với đường ta theo dữ liệu cầu/nền của hai tuyến
    const XBK0 = 105.9, xbQ = S.xbOf(W), xbOn = xbQ >= 0, xbL = z => S.xbLanes(W, T.x + z), xbReal = W.dir;
    const xbZJ = xbOn ? S.sOfKm(L.meta.junctions[xbQ].km, W.dir, L.kmEnd) - T.x : 0, xbZC = xbOn ? S.sOfKm(XBK0, W.dir, L.kmEnd) - T.x : 0, xbTail = z => xbOn && (W.dir === 'down' ? z > xbZC : z < xbZC);      // xbZJ: vị trí ngã rẽ; xbZC: từ đây ra phía đông đường nhánh dưới do nút giao vẽ (không phải đường ga)
    let elvO = null; if (xbOn) { const Lo = S.lineOf(W.lineId === 'jts' ? 'hok' : 'jts'); elvO = LAY.elevTable(Lo, S, W.dir, S.sOfKm(S.kmOfS(T.x, W.dir, L.kmEnd), W.dir, Lo.kmEnd), ZF, STEP); }
    // đường Hokuriku lên (B): từ cầu cạn ga (9 m) hạ dần (~23‰) trong 300 m để chui dưới cầu Joetsu, rồi giữ ở mặt đất (2 m) tới khi đường xuống hạ kịp; Hokuriku xuống (A) còn trên cầu cạn tới mép cầu (struct hok)
    const elvT0 = elvT.slice(), xbBprof = z => LAY.ELEV.v - (LAY.ELEV.v - LAY.ELEV.g) * smooth(0, 1, (xbL(z).u + 200) / 300);
    // một mặt phẳng: đường Hokuriku lên cắt đồng mức qua hai đường chính Joetsu (không cầu cạn, không hạ độ cao)      // ta chạy trên B nên cao độ của ta hạ sớm hơn A
    let xbRedeck = null;      // vẽ lại mặt cầu cạn của ta đè lên các đường nằm dưới cầu (Hokuriku nhìn từ Joetsu)
    const dEl = () => 0;      // cao độ ray đường của tuyến KIA so với đường ta cùng km (m; dương = cao hơn)
    const elHok = z => W.lineId === 'jts' ? (elvO ? tab(elvO, z) : 0) : tab(elvT0, z), yB = () => 0;      // yB: ray đường B so với mặt ray của ta
    // lực ly tâm khi vào cong: camera dịch ngang nhẹ ra phía ngoài (độ cong làm mượt trên ±90 m nên vào/ra cong không bị giật). Không còn xoay cả khung hình (ctx.rotate khiến mọi nét vẽ ở đoạn cong chậm hẳn trên máy yếu)
    { const kapS = LAY.curvatureSmooth(L, S, W.dir, T.x, 90); c.camX -= clamp(kapS * v * v / 9.8 * 0.6, -0.35, 0.35); }

    // ---- các ga trong tầm nhìn: bố trí đường, vị trí đường dừng của ta
    const target = S.nextTarget(T), tIdx = T.phase === 'dwell' ? T.k : target;
    const sts = [];
    M.forEach((m0, i) => { const gs = m0.sOrig !== undefined ? m0.sOrig : m0.s, m = gs === m0.s ? m0 : Object.assign({}, m0, { s: gs }), d = gs - T.x, dm = m0.s - T.x; if (d < -(xbOn && L.stations[m0.i].lay === LAY.TKS ? 3300 : 1000) || d > 3600) return;      // d: hình học ga (sân ga, toả đường) theo vị trí GỐC; dm: vạch dừng thật của tàu (có thể lùi lại khi chờ ghép)      // giữ ga tới 1 km phía sau để ghi chữ X lúc rời ga không biến mất sớm
       const key = W.lineId + ':' + m.i + ':' + W.dir + (W.termPick && W.termPick[m.i] !== undefined ? ':t' + W.termPick[m.i] : ''); const st = stCache[key] || (stCache[key] = LAY.station(L.stations[m.i].lay || '2-2-0', W.dir, LAY.pickOf(L.stations[m.i], m.i, W))); sts.push({ m, i, d, dm, st, stopHere: !!(m.stop || T.forced === i || (i === T.k && T.phase !== 'end')),   // ga vừa dừng (kể cả dừng khẩn không có lịch) vẫn giữ đường sân ga cho tới khi tàu rời hẳn
         isT: i === tIdx }); });
    for (const q of sts) if (q.stopHere && !q.m.mainStop) { const o = q.st.ours, w = trackWF(o, T.x, q.m.s); if (o.own ? w > 0 : true) c.lane += LAY.laneOf(o, T.x, q.m.s, w, spreadF(T.x, q.m.s), XA, XB); }      // đường của ta thuộc nhóm đường chính ngược chiều (ga cuối): đi qua ghi chữ X
    for (const q of sts) if (onDet(q)) c.lane += detWF(q.st, T.x, q.m.s);
    c.lane += S.runLane(W, T.x);      // ngã rẽ Akita chiều lên: tàu mini chạy làn ngược chiều (đường chính xuống) tới ghi chéo 's' của Morioka
    if (xbOn && W.lineId === 'hok' && xbReal === 'up') {
      if (S.kmOfS(T.x, W.dir, L.kmEnd) >= XBK0) c.lane = xbL(0).B;
      else { const qT = sts.find(q => q.st.code === LAY.TKS && !(q.stopHere && !q.m.mainStop)), o = qT && qT.st.tracks.find(t => t.tks === 5); if (o) { const w = trackWF(o, T.x, qT.m.s); c.lane += LAY.laneOf(o, T.x, qT.m.s, w, spreadF(T.x, qT.m.s), XA, XB); } }
    }
    const hasSingle = !!(L.single && L.single.length);
    const oppAt0 = z => { let x = ADJ; for (const q of sts) x += (q.st.opp - ADJ) * spreadF(T.x + z, q.m.s); return hasSingle ? x * (1 - S.singleEff(W, T.x + z)) : x; };      // làn ngược chiều chưa tính đoạn vòng
    const oppAt = z => { let x = oppAt0(z); for (const q of sts) if (q.st.oppDet) x += oppDetWF(q.st, T.x + z, q.m.s); return x; };   // đoạn đường đơn: đường ngược chiều nhập vào đường ta   // đường thông qua ngược chiều (nơi tàu ngược chiều chạy)
    const mainX = z => { let x = 0; for (const q of sts) if (q.st.detour) x += detWF(q.st, T.x + z, q.m.s); return x; };      // làn đường chính của ta (0, trừ đoạn vòng Sendai)
    const fxOpp = z => { const xo = oppAt(Math.max(0, z)); return xo + (c.lane > xo ? 1.85 : -1.85); };      // mép gần camera của tàu ngược chiều (thân vẽ nhìn ngang) theo vị trí đường ngược chiều thật tại z, không cố định ADJ nên không lệch khỏi đường ray gần ga
    const inStationZone = (za, zb) => { const qs = sts.filter(q => zb > q.d - (FA + 50) && za < q.d + (FB + 20)); return qs.length ? { st: { extent: [Math.min(...qs.map(q => q.st.extent[0])), Math.max(...qs.map(q => q.st.extent[1]))] } } : null; };   // hợp các ga trong tầm (ga vừa qua và ga sắp tới)

    const inTun = S.inTunnel(W, T.x);
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.save();
    const P = (X, Y, Z) => proj(c, X, Y, Z), PG = (X, Y, Z) => proj(c, X, Y - elAt(Z), Z);     // PG: vật nằm trên mặt đất (thấp hơn mặt ray khi tuyến đi trên cao)
    const quad = (a, b, d, e, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill(); };
    // lưới điểm lấy mẫu chung theo khoảng cách: mọi dải/tường dùng cùng điểm nên khớp nhau kể cả ở đường cong gấp (không lệch hàng mét như khi mỗi dải tự chia)
    // lưới mịn để đường cong của ghi (dịch ngang vài mét trên 60–150 m) không bị thành các đoạn thẳng nối nhau
    const zgrid = []; { let z = ZN; while (z < ZF) { zgrid.push(z); z += z < 60 ? 4 : z < 200 ? 8 : z < 600 ? 14 : z < 1400 ? 30 : 80; } zgrid.push(ZF); }
    const zsteps = (z0, z1) => { if (z1 <= z0) return [z0]; const a = [z0]; for (const g of zgrid) if (g > z0 + 0.5 && g < z1 - 0.5) a.push(g); a.push(z1); return a; };
    // dải nằm ngang theo chiều dài (bám đường cong): xa(z), xb(z) là X hai mép tại khoảng cách z; Y cố định
    const strip = (xa, xb, Y0, z0, z1, fill) => { const zs = zsteps(Math.max(z0, zMin), Math.min(z1, zLim)); if (zs.length < 2) return; const Y = typeof Y0 === 'function' ? Y0 : () => Y0; ctx.fillStyle = fill; ctx.beginPath(); zs.forEach((z, k) => { const p = P(xa(z), Y(z), z); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); for (let k = zs.length - 1; k >= 0; k--) { const p = P(xb(zs[k]), Y(zs[k]), zs[k]); ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.fill(); };
    // tường đứng dọc theo chiều dài ở X(z), từ Y0 đến Y1
    const wall = (xf, Y0f, Y1f, z0, z1, fill) => { const zs = zsteps(Math.max(z0, zMin), Math.min(z1, zLim)); if (zs.length < 2) return; const Y0 = typeof Y0f === 'function' ? Y0f : () => Y0f, Y1 = typeof Y1f === 'function' ? Y1f : () => Y1f; ctx.fillStyle = fill; ctx.beginPath(); zs.forEach((z, k) => { const p = P(xf(z), Y1(z), z); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); for (let k = zs.length - 1; k >= 0; k--) { const p = P(xf(zs[k]), Y0(zs[k]), zs[k]); ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.fill(); };
    const fadeA = Z => clamp(1.15 - Z / fogZ, 0.12, 1);
    const km = z => S.kmOfS(T.x + z, W.dir, L.kmEnd), biomeAt = z => S.biomeAt(L, km(z));
    // cảnh thật OpenStreetMap (world.js) nếu đã có dữ liệu tại đây: toà nhà đúng vị trí, rừng/ruộng/nước theo lớp phủ đất; không thì phong cảnh sinh ngẫu nhiên theo vùng
    const WD = root.World, wdOurs = W.dir === 'up' ? -4.3 : 0, wdOn = !!(WD && WD.has(W.lineId, W.dir, L.kmEnd, T.x));
    const landCls = (z, e) => { const sd = WD.toSD(W.dir, L.kmEnd, T.x, z, e, wdOurs); return WD.landAt(W.lineId, sd[0], sd[1]); };
    const CLS_TREE = 'fsep', CLS_FIELD = 'a', CLS_NONE = 'hcizwmr';
    const rgbOf = s => s.match(/\d+/g).map(Number);

    // trạng thái hầm: zExit = khoảng cách tới cửa ra khi đang ở trong hầm; zLim = chân trời vẽ hiện tại (trong hầm cắt ở cửa ra, phần ngoài hầm vẽ riêng trong khung cửa ra)
    let zExit = null; for (const [k0, k1] of L.meta.tunnels) { const a = S.sOfKm(k0, W.dir, L.kmEnd), b = S.sOfKm(k1, W.dir, L.kmEnd), lo = Math.min(a, b), hi = Math.max(a, b); if (T.x >= lo && T.x <= hi) zExit = hi - T.x; }
    let zLim = zExit !== null ? zExit : ZF, zMin = ZN, sink = null;
    // cửa hầm sắp tới (khi đang ở ngoài hầm): cắt mọi thứ ở mặt cửa hầm; phần bên trong hầm vẽ riêng qua khung cửa
    let entryZ = null, entryEnd = ZF; if (zExit === null) for (const [k0, k1] of L.meta.tunnels) { const a = S.sOfKm(k0, W.dir, L.kmEnd), b = S.sOfKm(k1, W.dir, L.kmEnd), z = Math.min(a, b) - T.x; if (z > ZN && z < ZF && (entryZ === null || z < entryZ)) { entryZ = z; entryEnd = Math.max(a, b) - T.x; } }
    if (entryZ !== null) zLim = entryZ;
    const top = mixc([6, 12, 24], [92, 160, 224], day), hor = mixc([14, 24, 42], [183, 214, 240], day);
    let gb = biomeAt(60);
    if (wdOn) { const cl = [landCls(60, 40), landCls(60, -40), landCls(150, 60)].map(x => String.fromCharCode(x || 0)); const ct = k => cl.filter(x => k.includes(x) && x !== ' ').length; if (ct('hci') >= 2) gb = 'urban'; else if (ct('fsepw') >= 2) gb = 'mountain'; else if (ct('aog') >= 1) gb = 'field'; }
    const gcol0 = inSnow ? [214, 222, 232] : gb === 'urban' ? [58, 62, 66] : gb === 'mountain' ? [34, 62, 40] : [64, 96, 52];
    // nền đất cố định màu xi măng / đá dăm đúng trong đoạn hàng rào của ga (từ đầu rào tới cuối rào, cùng hằng số FA/FB với tường rào; chuyển êm 60 m nằm bên trong đoạn rào), không đổi theo quần xã xung quanh
    let gwS = 0; for (const q of sts) gwS = Math.max(gwS, LAY.smooth(q.d - FA, q.d - FA + 60, 0) * (1 - LAY.smooth(q.d + FB - 60, q.d + FB, 0)));
    const gcol = gwS > 0 ? [0, 1, 2].map(k => gcol0[k] + ([inSnow ? 214 : 82, inSnow ? 222 : 84, inSnow ? 232 : 84][k] - gcol0[k]) * gwS) : gcol0;
    // ---- nền: bầu trời, núi, mặt đất, sương mù (dùng cho phong cảnh thường và cho phần nhìn ra ngoài qua cửa hầm)
    const backdrop = () => {
    const g = ctx.createLinearGradient(0, py - 40, 0, c.hy + 4); g.addColorStop(0, mixc(rgbOf(top), [70, 78, 90], wx)); g.addColorStop(1, mixc(rgbOf(hor), [110, 118, 128], wx));
    ctx.fillStyle = g; ctx.fillRect(px - 60, py - 60, pw + 120, ph + 120);
    if (dusk > 0.05 && wx < 0.3) { ctx.fillStyle = 'rgba(255,140,60,' + Math.min(0.35, dusk * 0.3) + ')'; ctx.fillRect(px - 60, c.hy - 60, pw + 120, 70); }
    if (night > 0.4 && wx < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (night - 0.4)) + ')'; for (let i = 0; i < 40; i++) ctx.fillRect(px + hash(i * 17) * pw, py + hash(i * 31 + 7) * (c.hy - py - 8), 1.2, 1.2); }
    // núi xa (đường chân trời) theo cảnh quan phía trước
    const bFar = biomeAt(4000), hillH = bFar === 'mountain' ? 34 : bFar === 'urban' ? 8 : 14;
    ctx.fillStyle = mixc([24, 36, 54], [76, 104, 124], day * (1 - wx * 0.5)); ctx.beginPath(); ctx.moveTo(px - 60, c.hy + 4);
    for (let x = px - 60; x <= px + pw + 68; x += 6) { const sx = x + T.x * 0.002 * dirS; const hh = hillH * (0.5 + 0.5 * Math.sin(sx / 47) * Math.sin(sx / 113 + 1.3)) + hillH * 0.25 * Math.sin(sx / 19); ctx.lineTo(x, c.hy + 4 - Math.max(2, hh)); }
    ctx.lineTo(px + pw + 68, c.hy + 4); ctx.closePath(); ctx.fill();
    // núi Phú Sĩ ở km ~140: vị trí ngang cố định 25 km cạnh đường (xấp xỉ [I])
    if (W.lineId === 'tsk') { const sF = S.sOfKm(140, W.dir, L.kmEnd), Zf = sF - T.x, Xf = W.dir === 'up' ? 26000 : -26000; if (Zf > 1500 && Zf < 90000) { const dist = Math.hypot(Zf, Xf), sx = c.cx + c.f * (MIR * Xf - c.camX) / Zf, hF = 3776 / dist * c.f * 1.2, wF = hF * 2.3, yb = c.hy + 4;
      if (sx > px - wF && sx < px + pw + wF) { ctx.fillStyle = mixc([32, 44, 78], [86, 112, 150], day * (1 - wx * 0.6)); ctx.beginPath(); ctx.moveTo(sx - wF, yb); ctx.lineTo(sx - wF * 0.07, yb - hF); ctx.lineTo(sx + wF * 0.07, yb - hF); ctx.lineTo(sx + wF, yb); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(245,248,255,' + (0.5 + 0.4 * day) + ')'; ctx.beginPath(); ctx.moveTo(sx - wF * 0.3, yb - hF * 0.72); ctx.lineTo(sx - wF * 0.07, yb - hF); ctx.lineTo(sx + wF * 0.07, yb - hF); ctx.lineTo(sx + wF * 0.3, yb - hF * 0.7); ctx.lineTo(sx + wF * 0.16, yb - hF * 0.78); ctx.lineTo(sx + wF * 0.05, yb - hF * 0.68); ctx.lineTo(sx - wF * 0.07, yb - hF * 0.8); ctx.closePath(); ctx.fill(); } } }

    // ---- mặt đất
    const gg = ctx.createLinearGradient(0, c.hy, 0, py + ph); gg.addColorStop(0, mixc([14, 20, 27], rgbOf(mixc([gcol[0] * 0.8, gcol[1] * 0.85, gcol[2] * 0.9], gcol, 0)), day * (1 - wx * 0.35)) ); gg.addColorStop(1, mixc([8, 12, 16], gcol, day * (1 - wx * 0.3)));
    ctx.fillStyle = gg; ctx.fillRect(px - 60, c.hy + 3, pw + 120, py + ph - c.hy + 60);
    // sương mù/thời tiết kéo màu đường chân trời xuống mặt đất xa
    const fg = ctx.createLinearGradient(0, c.hy, 0, c.hy + 60); fg.addColorStop(0, mixc(rgbOf(hor), [110, 118, 128], wx)); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.55; ctx.fillStyle = fg; ctx.fillRect(px - 60, c.hy + 2, pw + 120, 60); ctx.globalAlpha = 1;

    };
    // mặt cầu rộng thêm để chứa đường nhánh / đường chính của tuyến cha khi còn sát đường ta (< 28 m), thu lại êm khi chúng tách xa
    const jw = o => Math.max(0, Math.min(1, (28 - Math.abs(o)) / 6));
    const xr = z => { const base = Math.max(0, oppAt(z)) + 2.9; let x = base; for (const q of sts) { x = Math.max(x, lerp(base, q.st.extent[1] + 0.4, spreadF(T.x + z, q.m.s))); for (const t of q.st.tracks) if (!t.main && !(t.tks === 5 && xbTail(z))) x = Math.max(x, lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)) + 2.9); } if (xbOn && xbTail(z)) { const bb = xbL(z).B; if (bb > 0.3) x = Math.max(x, lerp(base, bb + 2.9, jw(bb))); } const tl = xbOn ? [] : S.trunkLanes(W, T.x + z), o = tl.length ? Math.max(...tl) : 0; if (o > 0.3) x = Math.max(x, lerp(base, o + 2.9, jw(o))); return x; };      // theo vị trí thật của từng đường tuyến kia (branchDeltas), không giả định cặp đường ở o và o + ADJ
    const xl = z => { const base = Math.min(0, oppAt(z)) - 2.9; let x = base; for (const q of sts) { x = Math.min(x, lerp(base, q.st.extent[0] - 0.4, spreadF(T.x + z, q.m.s))); for (const t of q.st.tracks) if (!t.main && !(t.tks === 5 && xbTail(z))) x = Math.min(x, lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)) - 2.9); } if (xbOn && xbTail(z)) { const bb = xbL(z).B; if (bb < -0.3) x = Math.min(x, lerp(base, bb - 2.9, jw(bb))); } const tl = xbOn ? [] : S.trunkLanes(W, T.x + z), o = tl.length ? Math.min(...tl) : 0; if (o < -0.3) x = Math.min(x, lerp(base, o - 2.9, jw(o))); return x; };
    if (zExit === null) backdrop();
    // ---- dải tranh phong cảnh OSM hai bên (strips.js): thay các khối nhà 3D rời rạc; chỉ vẽ khi đã có dữ liệu và không ở trong hầm
    const useStrips = wdOn && !!root.Strips;
    if (zExit === null && useStrips) root.Strips.draw(ctx, { WD, lid: W.lineId, dir: W.dir, kmEnd: L.kmEnd, dO: wdOurs, Tx: T.x, c, el: elAt, CAMH, MIR, f: c.f, px, pw, zStart: 4, zEnd: 3000, lite: root.SCENERY === 'lite' || !!R.tile, tile: !!R.tile, edge: (side, z) => side > 0 ? Math.max(xr(z), 0) : Math.max(-xl(z), 0),
      tunnel: z => S.structAt(L, km(z)) === 't', alpha: z => fadeA(z), t: day * (1 - wx * 0.4) });

    // ---- cầu (sông bên dưới) và cầu cạn: bản mặt cầu bê tông rộng ra theo sân ga, lan can và gờ bệ
    if (zExit === null) {
      const runs = []; let prev = null; for (let z = 0; z <= ZF; z += 20) { const k = S.structAt(L, km(z)); if (k === prev) runs[runs.length - 1][1] = z + 20; else { runs.push([z, z + 20, k]); prev = k; } }
      const colTop = mixc([22, 26, 32], [150, 156, 160], day * (1 - wx * 0.35)), colSide = mixc([14, 16, 20], [104, 110, 116], day * (1 - wx * 0.35)), colDeck = mixc([20, 24, 28], [112, 116, 118], day * (1 - wx * 0.35));
      for (const [za, zb, k] of runs) {
        if (k === 'b') strip(() => -70, () => 70, -LAY.ELEV.b, za, zb, mixc([10, 22, 34], [66, 104, 132], day * (1 - wx * 0.4)));
        if (k === 'v' || k === 'b') { strip(xl, xr, -0.02, za, zb, colDeck); for (const xf of [xr, xl]) { wall(xf, 0, 1.0, za, zb, colTop); wall(xf, -1.4, 0, za, zb, colSide); }
          const zmid = (za + zb) / 2, urban = wdOn ? [landCls(zmid, 40), landCls(zmid, -40)].some(v => 'hci'.includes(String.fromCharCode(v || 0)) && v) : biomeAt(zmid) === 'urban';
          if (k === 'v' && urban) for (const xf of [xr, xl]) wall(xf, 1.0, 3.4, za, zb, day > 0.4 ? 'rgba(190,212,226,.20)' : 'rgba(80,110,140,.2)');      // tấm chắn ồn trong suốt trên cầu cạn khu dân cư
        }
      }
      if (xbOn && W.lineId === 'jts') xbRedeck = () => { for (const [za, zb, k] of runs) if (k === 'v') { strip(xl, xr, -0.02, za, zb, colDeck); for (const xf of [xr, xl]) { wall(xf, 0, 1.0, za, zb, colTop); wall(xf, -1.4, 0, za, zb, colSide); } } };
    }

    // ---- cầu cạn Joetsu phía trên đường Hokuriku (nhìn từ Hokuriku): một mặt cầu rộng phủ cả hai đường chính Joetsu (docs/16), cao hơn đường ta dEl(z) m; trụ cầu 30 m một cái, bỏ trụ nào nằm sát đường Hokuriku (không đụng cột dầm)
    if (false) {
      const Lj = S.lineOf('jts'), vOk = z => (W.dir === 'down' ? z > xbZJ : z < xbZJ) && S.structAt(Lj, S.kmOfS(T.x + z, W.dir, L.kmEnd)) === 'v', kk = day * (1 - wx * 0.35), cTop = mixc([22, 26, 32], [150, 156, 160], kk), cSide = mixc([14, 16, 20], [104, 110, 116], kk), cUnder = mixc([10, 12, 16], [74, 78, 82], kk), cPier = mixc([18, 20, 24], [128, 130, 128], kk);
      const edge = sg => z => { const l = xbL(z); return sg > 0 ? Math.max(l.jD, l.jU) + 2.9 : Math.min(l.jD, l.jU) - 2.9; };
      const runs = []; for (let z = ZN; z <= ZF; z += 20) { if (vOk(z)) { if (runs.length && runs[runs.length - 1][1] >= z - 0.1) runs[runs.length - 1][1] = z + 20; else runs.push([z, z + 20]); } }
      for (const [za, zb] of runs) { const eL = edge(1), eR = edge(-1);
        strip(eR, eL, z => dEl(z) - 1.4, za, zb, cUnder); strip(eR, eL, z => dEl(z) - 0.02, za, zb, cTop);
        for (const ef of [eL, eR]) { wall(ef, z => dEl(z) - 1.4, z => dEl(z), za, zb, cSide); wall(ef, z => dEl(z), z => dEl(z) + 1.0, za, zb, cTop); } }
      for (let k = Math.ceil((T.x + ZN) / 30), z = k * 30 - T.x; z < ZF; k++, z = k * 30 - T.x) { if (z < ZN || !vOk(z)) continue; const l = xbL(z), ya = -elAt(z), yt = dEl(z) - 1.4;
        for (const x of [edge(1)(z) - 1.6, edge(-1)(z) + 1.6]) { if ([l.A, l.B].some(h => Math.abs(h - x) < 5.2)) continue; items.push({ z, fn: () => { quad(P(x - 0.9, ya, z), P(x + 0.9, ya, z), P(x + 0.9, yt, z), P(x - 0.9, yt, z), cPier); } }); } }
    }
    // ---- đường ray và đá dăm (theo đường cong); các đường của ga toả ra từ đường chính
    const snowTr = inSnow && zExit === null, ballast = snowTr ? mixc([78, 84, 98], [238, 243, 250], day) : mixc([20, 24, 28], [88, 88, 84], day * (1 - wx * 0.3));      // trời tuyết: đá dăm phủ tuyết mỏng, chỉ còn thanh ray đen lộ ra
    // tấm bê tông nằm DƯỚI lớp đá dăm, rộng từ chân hàng rào trái tới chân hàng rào phải (S.slabAt: nền đất, ngoài vùng ga); lớp đá dăm có tà vẹt vẽ đè lên như ở ga và cầu, không đổi
    const slabAtZ = z => S.slabAt(L, km(z), !!inStationZone(z, z)), slabCol = mixc([40, 44, 48], [142, 142, 136], day * (1 - wx * 0.3)), FOFF = 1.0 + S.FENCE_OFF;
    const slabBase = (z0, z1) => {
      z0 = Math.max(z0, zMin); z1 = Math.min(z1, zLim); if (z1 <= z0 || zExit !== null) return; const col = snowTr ? mixc([70, 78, 90], [226, 232, 240], day) : slabCol;
      let a = z0, cur = slabAtZ(a);
      for (let z = (Math.floor(z0 / 20) + 1) * 20; ; z += 20) { const end = z >= z1, zz = end ? z1 : z, sl = end ? cur : slabAtZ(zz);
        if (end || sl !== cur) { if (cur) strip(q => xl(q) - FOFF, q => xr(q) + FOFF, 0, a, zz, col); a = zz; cur = sl; }
        if (end) break; }
    };
    // ---- mặt đường (mẫu B + D, docs/data/track_texture_candidates.html): đoạn nền đất = đá dăm + tà vẹt bê tông dự ứng lực (dài 2,4 m, cách 0,6 m, kẹp ray); đoạn cầu cạn / cầu / hầm = tấm bê tông (rộng 2,34 m, dài 4,9 m, khe ngang, kẹp ray cách 0,625 m) trên bệ bê tông
    const slabRuns = []; if (zExit === null) { let a = null; for (let z = Math.max(0, zMin); z <= ZF + 20; z += 20) { const k = S.structAt(L, km(z)), is = k === 'b' || k === 't' || k === 'v'; if (is && a === null) a = z; else if (!is && a !== null) { slabRuns.push([a, z]); a = null; } } if (a !== null) slabRuns.push([a, ZF + 20]); }
    const inSlab = z => { for (const r of slabRuns) if (z >= r[0] && z < r[1]) return true; return false; };
    const splitSlab = (z0, z1) => { const bal = [], sl = []; let c = z0; for (const [a, b] of slabRuns) { if (b <= z0 || a >= z1) continue; const lo = Math.max(a, z0), hi = Math.min(b, z1); if (lo > c) bal.push([c, lo]); sl.push([lo, hi]); c = hi; } if (c < z1) bal.push([c, z1]); return { bal, sl }; };
    const dk = day * (1 - wx * 0.3), sleeperC = snowTr ? 'rgba(' + (day > 0.5 ? '226,232,240' : '92,100,116') + ',.92)' : mixc([46, 48, 52], [150, 148, 142], dk).replace('rgb', 'rgba').replace(')', ',.96)'), clipC = snowTr ? 'rgba(60,66,78,.8)' : 'rgba(14,14,16,.7)';
    const deckC = snowTr ? mixc([62, 70, 82], [214, 220, 230], day) : mixc([26, 28, 32], [112, 112, 108], dk), panelC = snowTr ? mixc([74, 82, 94], [232, 237, 244], day) : mixc([44, 46, 50], [168, 168, 162], dk);
    const ballastStrip = (xf, z0, z1, alpha, yf) => {
      z0 = Math.max(z0, zMin); z1 = Math.min(z1, zLim); if (z1 <= z0) return; const al = alpha == null ? 1 : alpha, bc = ballast.replace('rgb', 'rgba').replace(')', ',' + al + ')'), sp = splitSlab(z0, z1);
      for (const [a, b] of sp.bal) strip(z => xf(z) - 2.1, z => xf(z) + 2.1, yf || 0, a, b, bc);
      for (const [a, b] of sp.sl) { strip(z => xf(z) - 2.1, z => xf(z) + 2.1, yf || 0, a, b, deckC.replace('rgb', 'rgba').replace(')', ',' + al + ')')); strip(z => xf(z) - 1.17, z => xf(z) + 1.17, yf ? z => yf(z) + 0.05 : 0.05, a, b, panelC.replace('rgb', 'rgba').replace(')', ',' + al + ')'));
        for (let k = Math.ceil((T.x + a) / 4.9), z = k * 4.9 - T.x; z < Math.min(b, 90); k++, z = k * 4.9 - T.x) { const X = xf(z), yo = (yf ? yf(z) : 0) + 0.05, p = P(X - 1.17, yo, z), q = P(X + 1.17, yo, z), d = P(X + 1.17, yo, z + 0.08), e = P(X - 1.17, yo, z + 0.08); if (d[1] - q[1] < 0.3 && z > 30) continue; quad(p, q, d, e, snowTr ? 'rgba(90,98,112,.55)' : 'rgba(0,0,0,.4)'); } }      // khe giữa hai tấm (cứ 4,9 m)
    };
    const railStrip = (xf, z0, z1, sleepers, yf) => {
      z0 = Math.max(z0, zMin); z1 = Math.min(z1, zLim); if (z1 <= z0) return;
      if (sleepers) { for (let k = Math.ceil((T.x + z0) / 0.6), z = k * 0.6 - T.x; z < Math.min(z1, 90); k++, z = k * 0.6 - T.x) { if (inSlab(z)) continue; const X = xf(z), yo = yf ? yf(z) : 0, p = P(X - 1.2, yo, z), q = P(X + 1.2, yo, z), d = P(X + 1.2, yo, z + 0.2), e = P(X - 1.2, yo, z + 0.2); if (d[1] - q[1] < 0.35 && z > 25) continue; quad(p, q, d, e, sleeperC);
          if (z < 28) for (const sx of [-GAUGE / 2, GAUGE / 2]) { const c0 = P(X + sx - 0.11, yo + 0.04, z + 0.03), c1 = P(X + sx + 0.11, yo + 0.04, z + 0.03), c2 = P(X + sx + 0.11, yo + 0.04, z + 0.17), c3 = P(X + sx - 0.11, yo + 0.04, z + 0.17); quad(c0, c1, c2, c3, clipC); } }
        if (slabRuns.length) for (let k = Math.ceil((T.x + z0) / 0.625), z = k * 0.625 - T.x; z < Math.min(z1, 28); k++, z = k * 0.625 - T.x) { if (!inSlab(z)) continue; const X = xf(z), yo = (yf ? yf(z) : 0) + 0.06; for (const sx of [-GAUGE / 2, GAUGE / 2]) { const c0 = P(X + sx - 0.12, yo, z), c1 = P(X + sx + 0.12, yo, z), c2 = P(X + sx + 0.12, yo, z + 0.16), c3 = P(X + sx - 0.12, yo, z + 0.16); quad(c0, c1, c2, c3, clipC); } } }      // tà vẹt PC cách 0,6 m (nền đất) / kẹp ray trên tấm bê tông cách 0,625 m
      for (const sx of [-GAUGE / 2, GAUGE / 2]) strip(z => xf(z) + sx - 0.075, z => xf(z) + sx + 0.075, yf ? z => yf(z) + 0.15 : 0.15, z0, z1, snowTr ? 'rgba(14,16,20,.97)' : 'rgba(208,216,226,.9)');
    };
    const drawTracks = (zFrom) => {
      const ours0 = () => 0, zf = zFrom || ZN, parts = [[ours0, zf, ZF, 1], [oppAt, zf, ZF, zExit === null ? 0.95 : 1]], low = [], lowTo = (xbOn && W.lineId === 'jts' && zExit === null) ? low : parts;
      if (xbOn && W.lineId === 'hok') { const p = parts[xbReal === 'up' ? 0 : 1]; if (W.dir === 'down') p[2] = Math.min(p[2], xbZJ); else p[1] = Math.max(p[1], xbZJ); }      // Hokuriku: sau ngã rẽ đường chính Joetsu (đường ngược chiều của đường chính xuống / đường chính của chiều lên) không còn là đường của ta; thay bằng đường Hokuriku lên (vẽ riêng)
      for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x; let a = W.dir === 'down' ? sj : sj - 3200, b = W.dir === 'down' ? sj + 3200 : sj;
        if (jc.run) { if (W.dir === 'down') a += 0.5; else b -= 0.5; }      // cờ run: đầu đoạn nằm đúng ngã rẽ thì chưa được cộng độ lệch khung (runStep) nên giật ngang 4,3 m; lùi vào 0,5 m
        if (b > zf && a < ZF) { const cl = trunkClip(sj, a, b, zf); if (!cl) continue; [a, b] = cl; }      // trong hầm: đường của nhánh kia bị khối đá che cho tới chỗ hai vỏ hầm nhập
        if (b > zf && a < ZF) { if (jc.xb && W.lineId === 'jts') lowTo.push([z => xbL(z).A, Math.max(zf, a), Math.min(ZF, b), 0.95, dEl]); else parts.push(...S.branchDeltas(W, jc).map(dl => [z => S.trunkOff(W, T.x + z) + dl, Math.max(zf, a), Math.min(ZF, b), 0.95, jc.xb ? dEl : null])); } }       // đường chính của tuyến cha (Tohoku / Joetsu); nút giao Takasaki: Hokuriku xuống (A) rời đường chính, Hokuriku lên (B) vẽ riêng bên dưới
      if (xbOn) lowTo.push([z => xbL(z).B, W.dir === 'down' ? Math.max(zf, xbZC) : zf, W.dir === 'down' ? ZF : Math.min(ZF, xbZC), 0.95, yB]);      // đường nhánh dưới kéo dài = Hokuriku lên: phẳng bên phải đôi đường Joetsu rồi sang trái chui dưới cầu và hội tụ với Hokuriku xuống
      { const cutsM = [], cutsO = []; for (const q of sts) { const dt = q.st.detour, od = q.st.oppDet; if (dt) cutsM.push([q.d + dt.z0, q.d + dt.zEnd]); if (od) cutsO.push([q.d + od.zA, q.d + od.zB]); }      // Sendai: đoạn đường chính (chiều xuống: của ta; chiều lên: làn ngược chiều) giữa chỗ rẽ vào đường ngoài và chỗ trả về không có ray
        if (cutsM.length || cutsO.length) { const cutOf = (m0, cuts) => { let segs = [[m0[1], m0[2]]]; for (const [ca, cb] of cuts) segs = segs.flatMap(([x, y]) => (cb <= x || ca >= y) ? [[x, y]] : [[x, Math.min(y, ca)], [Math.max(x, cb), y]].filter(g => g[1] > g[0])); return segs.map(([x, y]) => [m0[0], x, y, m0[3]].concat(m0.slice(4))); }; const m0 = parts[0], o0 = parts[1]; parts.splice(0, 2, ...cutOf(m0, cutsM), ...cutOf(o0, cutsO)); } }
      { const rc = S.runCfg(W); if (rc) { const zj = rc.sj - T.x, pre = (a, b) => [a, Math.min(b, zj - 0.5)], post = (a, b) => [Math.max(a, zj), b], np = [];      // ngã rẽ Akita chiều lên: đường mini (trước ngã rẽ) nhập vào đường chính XUỐNG; đường chính lên và xuống của Tohoku (khung T) chỉ có từ ngã rẽ trở đi; làn thứ hai của đường mini trước ngã rẽ không có
        for (const p of parts) { if (p[0] === ours0) { for (const f of [pre, post]) { const [a, b] = f(p[1], p[2]); if (b > a) np.push([p[0], a, b].concat(p.slice(3))); } } else np.push(p); } parts.length = 0; parts.push(...np); } }
      { const rj = S.runJn(W); if (rj) { const zj = rj.sj - T.x, np = [];      // ngã rẽ Akita (mọi chiều, cả camera sau): làn ngược chiều của đường mini chỉ có tới ngã rẽ, không tách thành đường thứ hai rẽ theo nhánh
        for (const p of parts) { if (p[0] === oppAt) { const [a, b] = W.dir === 'down' ? [p[1], Math.min(p[2], zj)] : [Math.max(p[1], zj), p[2]]; if (b > a) np.push([p[0], a, b].concat(p.slice(3))); } else np.push(p); } parts.length = 0; parts.push(...np); } }
      for (const q of sts) for (const lk of LAY.linksOf(q.st, false)) { if (!lk.det) continue; const zc = q.d + lk.z; if (zc + lk.len < zf || zc > ZF) continue; const lx = t => t.main ? (t === q.st.oppT ? oppAt0 : () => 0) : z => lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)), fa = lx(lk.a), fb = lx(lk.b), sm = u => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); }; parts.push([z => lerp(fa(z), fb(z), sm((z - zc) / lk.len)), Math.max(zf, zc), zc + lk.len, 0.95]); }      // ghi nối của đoạn vòng Sendai: có đá dăm và tà vẹt như đường ga
      for (const q of sts) for (const t of q.st.tracks) { if (t.main || t.in0 === undefined) continue; let za = q.d - t.in0, zb = q.d + t.out0 + (t.len2 || t.len); if (xbOn && t.tks === 5) { if (W.dir === 'down') zb = Math.min(zb, xbZC); else za = Math.max(za, xbZC); } if (zb < ZN || za > ZF) continue; parts.push([z => lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)), Math.max(zf, za), zb, 0.95]); }      // mỗi đường ga chỉ tồn tại giữa điểm tách và điểm nhập (hình chữ Y)
      slabBase(Math.max(zf, physLoZ), Math.min(ZF, physHiZ));
      if (low.length) { for (const [xf, z0, z1, a, yf] of low) ballastStrip(xf, Math.max(z0, physLoZ), Math.min(z1, physHiZ), a, yf); for (const [xf, z0, z1, , yf] of low) railStrip(xf, Math.max(z0, physLoZ), Math.min(z1, physHiZ), true, yf); if (xbRedeck) xbRedeck(); }      // Joetsu: đường Hokuriku (thấp hơn) vẽ trước rồi mặt cầu cạn đè lên: đi dưới cầu thì bị che
      for (const [xf, z0, z1, a, yf] of parts) ballastStrip(xf, Math.max(z0, physLoZ), Math.min(z1, physHiZ), a, yf); 
       // đá dăm trước: đường nhánh không còn đè lên ray đường chính; đường ray dừng ở chắn cuối đường
      for (const [xf, z0, z1, , yf] of parts) railStrip(xf, Math.max(z0, physLoZ), Math.min(z1, physHiZ), true, yf);
      // ghi chữ X (hai ghi bắt chéo) nối đường ta và đường ngược chiều ở hai đầu mỗi ga
      for (const q of sts) for (const xv of LAY.xovers(L.stations[q.m.i], W.dir, false)) { const zc = q.d + xv.z; if (zc + 150 < zf || zc > ZF) continue; const sm = u => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); }, a = [z => lerp(0, oppAt(z), sm((z - zc) / 150)), z => lerp(oppAt(z), 0, sm((z - zc) / 150))];
        for (const k of LAY.xoLines(xv)) railStrip(a[k], Math.max(zc, physLoZ), Math.min(zc + 150, physHiZ), false); }
      // ghi nối đường nhánh dưới với đường chính lên (Takasaki, 3 ghi trong hình): mỗi ghi là một đường chéo ngắn giữa hai làn
      for (const q of sts) for (const lk of LAY.linksOf(q.st, false)) { if (lk.det) continue; const zc = q.d + lk.z; if (zc + lk.len < zf || zc > ZF) continue; const lx = t => t.main ? (t === q.st.oppT ? oppAt : () => 0) : z => lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)), fa = lx(lk.a), fb = lx(lk.b), sm = u => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
        railStrip(z => lerp(fa(z), fb(z), sm((z - zc) / lk.len)), Math.max(zc, physLoZ), Math.min(zc + lk.len, physHiZ), false); }
      // chắn cuối đường (giảm chấn) và tường chắn ở hai đầu tuyến (ga cuối): mọi đường ray đều kết thúc ở đây
      if (zExit === null) for (const zb of [physLoZ, physHiZ]) if (zb > ZN + 2 && zb < ZF) {
        const near = sts.filter(q => Math.abs(q.d - zb) < 1600), xs = [0, oppAt(zb)]; for (const q of near) for (const t of q.st.tracks) if (!t.main) xs.push(lerp(t.plain, t.x, trackWF(t, T.x + zb, q.m.s)));
        const uniq = []; for (const x of xs) if (!uniq.some(u => Math.abs(u - x) < 1.2)) uniq.push(x);
        items.push({ z: zb, fn: () => { const steel = mixc([40, 30, 28], [150, 50, 40], day * (1 - wx * 0.3)), post = mixc([26, 28, 32], [96, 100, 104], day * (1 - wx * 0.3)), cb = mixc([22, 26, 30], [170, 174, 174], day * (1 - wx * 0.3));
          const xl0 = Math.min(...uniq) - 3.2, xr0 = Math.max(...uniq) + 3.2; quad(P(xl0, 0, zb + 4), P(xr0, 0, zb + 4), P(xr0, 4.6, zb + 4), P(xl0, 4.6, zb + 4), cb); quad(P(xl0, 4.6, zb + 4), P(xr0, 4.6, zb + 4), P(xr0, 4.9, zb + 4), P(xl0, 4.9, zb + 4), mixc([30, 34, 40], [206, 210, 210], day));
          for (const x of uniq) { quad(P(x - 1.1, 0.6, zb), P(x + 1.1, 0.6, zb), P(x + 1.1, 1.25, zb), P(x - 1.1, 1.25, zb), steel); quad(P(x - 1.05, 0, zb), P(x - 0.8, 0, zb), P(x - 0.8, 0.6, zb), P(x - 1.05, 0.6, zb), post); quad(P(x + 0.8, 0, zb), P(x + 1.05, 0, zb), P(x + 1.05, 0.6, zb), P(x + 0.8, 0.6, zb), post); quad(P(x - 1.1, 1.0, zb - 0.01), P(x + 1.1, 1.0, zb - 0.01), P(x + 1.1, 1.1, zb - 0.01), P(x - 1.1, 1.1, zb - 0.01), '#e8c93a'); } } });
      }
    };
    // khung cửa ra hầm: hầm thường là vòm; ga ngầm (Tokyo, Ueno của Tohoku) mở rộng bằng cả bề ngang sân ga
    // vỏ hầm hẹp ôm sát các đường ray: biên trái/phải = đường ngoài cùng (đường ngược chiều, đường ga, đường chính tuyến cha ở đoạn rẽ nhánh) ± chừa 2,7 m; rộng ra/hẹp lại theo ghi
    const TRUNK_SEP = 5.4;
    // trong hầm, đường/dây/cổng của nhánh kia bị khối đá che: chỉ còn đoạn hai đường đã sát nhau (độ lệch < TRUNK_SEP); trả null nếu không còn gì
    const trunkClip = (sj, a, b, zf) => { if (!(zExit !== null || S.inTunnel(W, T.x + sj))) return [a, b]; let lo = Infinity, hi = -Infinity; for (let z = Math.max(a, zf - 40); z <= Math.min(b, ZF); z += 15) if (Math.abs(S.trunkOff(W, T.x + z)) < TRUNK_SEP) { if (z < lo) lo = z; hi = z; } return lo === Infinity ? null : [Math.max(a, lo - 15), Math.min(b, hi + 15)]; };
    const spanMemo = new Map(), tunSpan = z => { const key = Math.round(z * 2); let r = spanMemo.get(key); if (r) return r; let lo = 0, hi = 0; const add = x => { if (x < lo) lo = x; if (x > hi) hi = x; }; add(oppAt(z));
      for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x, a = W.dir === 'down' ? sj : sj - 3200, b = W.dir === 'down' ? sj + 3200 : sj; if (z >= a && z <= b) { const o = S.trunkOff(W, T.x + z); if (Math.abs(o) < TRUNK_SEP) for (const dl of S.branchDeltas(W, jc)) add(o + dl); } }      // hai vỏ hầm riêng (hướng A): vỏ của nhánh kia chỉ nhập vào khi hai đường đã sát nhau; khối đá giữa che đường của nhánh kia
      for (const q of sts) for (const t of q.st.tracks) { if (t.main || t.in0 === undefined) continue; const za = q.d - t.in0, zb = q.d + t.out0 + t.len; if (z >= za && z <= zb) add(lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s))); }
      r = [lo - 2.7, hi + 2.7]; spanMemo.set(key, r); return r; };
    const openingPoly = () => { if (zExit === null || zExit <= ZN) return null; const z = zExit, near = sts.filter(q => Math.abs(q.d - z) < 150 && q.st.extent), wide = near.length ? [Math.min(...near.map(q => q.st.extent[0])) - 0.8, Math.max(...near.map(q => q.st.extent[1])) + 0.8] : null, pts = [];
      { const [x0, x1] = wide || tunSpan(z), h = wide ? 8.0 : 6.6, r = wide ? 1.4 : 1.6; pts.push(P(x1, 0, z)); for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 * i / 6; pts.push(P(x1 - r + Math.cos(a) * r, h - r + Math.sin(a) * r, z)); } for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / 6; pts.push(P(x0 + r + Math.cos(a) * r, h - r + Math.sin(a) * r, z)); } pts.push(P(x0, 0, z)); }
      return pts; };
    const polyPath = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const outItems = [];
    if (zExit !== null) {
      const op = openingPoly();
      if (op) { ctx.save(); polyPath(op); ctx.clip(); backdrop(); zLim = ZF; drawTracks(zExit); outItems.length = 0; zLim = zExit; ctx.restore(); }
    }
    if (zExit !== null) {   // lòng hầm: tường tối có khoét lỗ ở cửa ra (nhìn thấy phong cảnh bên ngoài), đèn trần (chỉ ở hầm đô thị và quanh ga ngầm; hầm vùng đồi núi không có đèn)
      const tw = ctx.createLinearGradient(0, py, 0, py + ph); tw.addColorStop(0, '#2a3038'); tw.addColorStop(0.5, '#0c0f13'); tw.addColorStop(1, '#1a1f26'); ctx.fillStyle = tw;
      const op = openingPoly(); ctx.beginPath(); ctx.rect(px - 60, py - 60, pw + 120, ph + 120); if (op) op.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill('evenodd');
      // vỏ hầm: hai vách thẳng đứng, vát góc, trần; chia theo khoảng cách để xa thì tối dần
      { const zE = Math.min(zExit, 900), bands = [[ZN, 40, 1], [40, 120, 0.72], [120, 300, 0.5], [300, zE, 0.34]], xl = z => tunSpan(z)[0], xr = z => tunSpan(z)[1], lit = 0.5 + 0.5 * Math.max(night, 0.4), hasL = z => biomeAt(z) === 'urban' || sts.some(q => Math.abs(z - q.d) < 600);
        for (const [b0, b1, f] of bands) { if (b0 >= zE) break; const a = Math.max(b0, zMin), e = Math.min(b1, zE), g = Math.round(60 * f * lit);
          wall(xl, 0, 4.8, a, e, 'rgb(' + (g + 6) + ',' + (g + 9) + ',' + (g + 13) + ')'); wall(xr, 0, 4.8, a, e, 'rgb(' + (g + 6) + ',' + (g + 9) + ',' + (g + 13) + ')');
          strip(z => xl(z), z => xl(z) + 1.5, 6.3, a, e, 'rgb(' + (g + 2) + ',' + (g + 4) + ',' + (g + 7) + ')'); strip(z => xr(z) - 1.5, z => xr(z), 6.3, a, e, 'rgb(' + (g + 2) + ',' + (g + 4) + ',' + (g + 7) + ')');
          strip(z => xl(z) + 1.5, z => xr(z) - 1.5, 6.3, a, e, 'rgb(' + (g - 4) + ',' + (g - 2) + ',' + (g + 1) + ')'); }
        for (const side of [0, 1]) for (let k = Math.ceil((T.x + ZN) / 18), z = k * 18 - T.x; z < Math.min(420, zExit); k++, z = k * 18 - T.x) { if (!hasL(z)) continue; const X = side ? xr(z) - 0.15 : xl(z) + 0.15, a = P(X, 4.3, z), r = Math.max(1.2, 0.16 * c.f / z), gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 5); gl.addColorStop(0, 'rgba(255,236,170,.95)'); gl.addColorStop(0.35, 'rgba(255,230,160,.35)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 5, a[1] - r * 5, r * 10, r * 10); }
        // điểm cứu hộ (定点) trong hầm Seikan: hai sân ga hẹp sát hai vách (cũ là ga ngầm 竜飛/吉岡), đèn thoát hiểm xanh mỗi 12 m và biển tên treo ở hai đầu [I: dài 260 m, cao 1 m, rộng 1,3 m; độ dài thật không có nguồn]
        for (const rf of L.meta.refugeInfo || []) { const zc = S.sOfKm(rf.km, W.dir, L.kmEnd) - T.x, za = Math.max(zc - 130, ZN), ze = Math.min(zc + 130, zE); if (ze <= za) continue; const gg = Math.round(64 * lit);
          for (const sd of [0, 1]) { const ex = sd ? z => xr(z) - 1.3 : z => xl(z) + 1.3;
            strip(sd ? ex : xl, sd ? xr : ex, 1.0, za, ze, 'rgb(' + (gg + 34) + ',' + (gg + 38) + ',' + (gg + 42) + ')'); wall(ex, 0, 1.0, za, ze, 'rgb(' + (gg + 14) + ',' + (gg + 17) + ',' + (gg + 20) + ')');
            strip(sd ? (z => ex(z) - 0.12) : ex, sd ? ex : (z => ex(z) + 0.12), 1.001, za, ze, '#b89a2a'); }
          for (let k = Math.ceil((T.x + za) / 12), z = k * 12 - T.x; z < ze; k++, z = k * 12 - T.x) for (const sd of [0, 1]) items.push({ z, fn: () => { const X = sd ? xr(z) - 0.15 : xl(z) + 0.15, a = P(X, 2.7, z), r = Math.max(1.2, 0.15 * c.f / z), gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 5); gl.addColorStop(0, 'rgba(120,255,170,.95)'); gl.addColorStop(0.35, 'rgba(70,230,130,.35)'); gl.addColorStop(1, 'rgba(70,230,130,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 5, a[1] - r * 5, r * 10, r * 10); } });
          for (const zb of [zc - 125, zc + 125]) if (zb > ZN + 2 && zb < zE) items.push({ z: zb, fn: () => { const x1 = xl(zb) + 0.15, a = P(x1, 3.7, zb), b = P(x1 + 2.5, 2.5, zb), w2 = Math.abs(b[0] - a[0]); if (w2 < 8) return; const hh = b[1] - a[1], x0 = Math.min(a[0], b[0]);
            ctx.fillStyle = '#0b7a45'; ctx.fillRect(x0, a[1], w2, hh); ctx.strokeStyle = '#d9f5e4'; ctx.lineWidth = Math.max(1, hh * 0.05); ctx.strokeRect(x0 + hh * 0.06, a[1] + hh * 0.06, w2 - hh * 0.12, hh * 0.88); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold ' + hh * 0.5 + 'px system-ui'; ctx.fillText(rf.jp, x0 + w2 / 2, a[1] + hh * 0.52); ctx.font = hh * 0.22 + 'px system-ui'; ctx.fillText(LAY.refugeName(rf).sub, x0 + w2 / 2, a[1] + hh * 0.84); } }); } }
    }
    drawTracks();
    // đèn pha: chỉ bật khi tối, trong hầm, hoặc mưa/tuyết lúc nhá nhem; ban ngày ngoài hầm thì tắt. Chùm sáng bám đường đang chạy (kể cả đường nhánh/đường cong)
    const lampOn = S.lampOn(W, T), lightLvl = lampOn ? Math.max(0.55, night * (1 - wx * 0.2), zExit !== null ? 0.9 : 0) : 0;
    if (lampOn) { const lg = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); lg.addColorStop(0, 'rgba(255,246,210,' + 0.75 * lightLvl + ')'); lg.addColorStop(0.45, 'rgba(255,246,210,' + 0.32 * lightLvl + ')'); lg.addColorStop(1, 'rgba(255,246,210,0)');
      const cx0 = c.lane; strip(z => cx0 - 3.4, z => cx0 + 3.4, 0, ZN, 900, lg);
      const lg2 = ctx.createLinearGradient(0, py + ph, 0, c.hy + 4); lg2.addColorStop(0, 'rgba(255,246,210,' + 0.2 * lightLvl + ')'); lg2.addColorStop(0.6, 'rgba(255,246,210,0)'); strip(z => cx0 - 9, z => cx0 + 9, 0.02, ZN, 260, lg2); }

    // camera sau: đèn đuôi đỏ của chính đoàn tàu ta (luôn có, rõ hơn ở vùng tối): hai đèn đỏ nhỏ và vệt đỏ mờ trên đường ngay sau đuôi
    // ---- sân ga theo bố trí thật của từng ga (hàm: vẽ được cả bên ngoài lẫn nhìn qua cửa hầm vào ga ngầm)
    sink = items;
    // ---- tường bao quanh ga: hai bên phạm vi sân ga là tường bê tông + tấm chắn trong suốt cao (không còn hở ra ngoài), đoạn cổ ga (đường toả ra) là hàng rào thấp hơn;
    //      tường bám theo mép hành lang xr/xl (đã gồm các đường của ga đang toả ra), nên ga đỗ ở đường rìa nhánh cũng được bọc kín
    const enclose = (q, z0, z1) => {
      const concrete = mixc([22, 26, 30], [170, 174, 174], day * (1 - wx * 0.3)), concrete2 = mixc([18, 22, 26], [150, 154, 156], day * (1 - wx * 0.3)), cap = mixc([30, 34, 40], [206, 210, 210], day * (1 - wx * 0.3)), glass = day > 0.4 ? 'rgba(150,205,235,.16)' : 'rgba(60,90,120,.18)';
      const za = z0 - 25, zb = z1 + 25, ta = Math.max(q.d - FA, ZN), tb = Math.min(q.d + FB, ZF);
      for (const side of [1, -1]) {
        const ex = q.st.extent[side > 0 ? 1 : 0] + side * 1.4, zS = q.d - FA + 100, zE = q.d + FB - 150, wf = z => LAY.smooth(zS, zS + 150, z) * (1 - LAY.smooth(zE - 150, zE, z)),
          e = z => side > 0 ? Math.max(lerp(Math.max(0, oppAt(z)) + 2.9, ex, wf(z)), xr(z) + 1.2) : Math.min(lerp(Math.min(0, oppAt(z)) - 2.9, ex, wf(z)), xl(z) - 1.2), th = 0.3 * side;      // tường đứng yên theo toạ độ ga (không trượt theo đường toả ra), chỉ nhường chỗ cho đường thật
        for (let a = Math.max(ta, ZN); a < tb; a += 12) { const b = Math.min(tb, a + 12), inSt = b > za && a < zb, h = inSt ? 4.4 : 1.9, zm = (a + b) / 2, odd = Math.floor((T.x + a) / 12) % 2;
          sink.push({ z: zm, fn: () => { const ea = e(a), eb = e(b);
            quad(P(ea, 0, a), P(eb, 0, b), P(eb, h, b), P(ea, h, a), odd ? concrete : concrete2);
            quad(P(ea, h, a), P(eb, h, b), P(eb + th, h, b), P(ea + th, h, a), cap);
            if (inSt) { quad(P(ea, h, a), P(eb, h, b), P(eb, h + 2.2, b), P(ea, h + 2.2, a), glass); const pa = P(ea, 0, a), pb = P(ea, h + 2.2, a), w = Math.max(1, 0.18 * c.f / a); ctx.strokeStyle = 'rgba(70,80,92,.7)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
          } }); }
      }
    };
    // ---- cầu bộ hành trên cao bắc ngang qua mọi đường ray, nối các sân ga (chỉ ở khung buồng lái; vật cố định theo toạ độ ga, không kẹp theo camera)
    // số cầu theo cỡ ga: ≥ 3 sân ga: 3 lối (1/6, 1/2, 5/6 độ dài sân ga); 2 sân ga và ≥ 4 đường: 2 lối (1/4, 3/4); 2 sân ga ít đường: 1 lối giữa; ga 1 sân ga hoặc ga ngầm: không có
    const bridgeN = {}, bridgeCount = i => { const key = W.lineId + ':' + i; if (bridgeN[key] !== undefined) return bridgeN[key]; const stn = L.stations[i];
      let n = LAY.bridgeCountOf(stn.lay || '2-2-0'); if (n && S.inTunnel({ line: L, dir: 'down' }, S.sOfKm(stn.km, 'down', L.kmEnd))) n = 0; return (bridgeN[key] = n); };
    const BY = 9.4, BH = 2.4, BD = 3.2;       // mặt cầu cao hơn cổng đỡ dây (7,6 m); thân cầu cao 2,4 m; bề dày theo chiều tàu 3,2 m
    const drawBridge = (st, zc, xl, xr) => {
      const zn = zc - BD / 2, zf = zc + BD / 2, k = day * (1 - wx * 0.3), wallC = mixc([34, 38, 44], [178, 176, 160], k), under = mixc([14, 16, 20], [88, 90, 92], k), roofC = mixc([24, 30, 40], [78, 88, 106], k), glass = mixc([12, 20, 32], [92, 124, 156], k), pil = mixc([24, 28, 34], [148, 150, 146], k), dark = mixc([6, 8, 12], [40, 42, 46], k);
      if (zn < ZN + 0.6) return;
      const Ls = (BY - PH) / 0.55, zl = zf + Ls, lane = c.lane || 0;
      // thang bậc có mái xuống từng sân ga: dốc 0,55 theo chiều tàu chạy, từ mặt cầu xuống mặt sân ga; hai bên có tường và cửa sổ nhỏ
      for (const p of st.plats) { const xc = (p.xa + p.xb) / 2, hw = 1.15, a = P(xc - hw, BY, zf), b = P(xc + hw, BY, zf), d = P(xc + hw, PH, zl), e = P(xc - hw, PH, zl);
        quad(a, b, d, e, under);                                                       // mặt dưới thang (nhìn từ dưới lên)
        const sides = [xc - hw, xc + hw].sort((u, v) => Math.abs(v - (-lane)) - Math.abs(u - (-lane)));
        for (const xs of sides) { const a0 = P(xs, BY, zf), a1 = P(xs, BY + BH, zf), b0 = P(xs, PH, zl), b1 = P(xs, PH + BH, zl); quad(a0, a1, b1, b0, wallC);
          const w0 = P(xs, BY + 1.0, zf + 0.5), w1 = P(xs, BY + 1.9, zf + 0.5), v0 = P(xs, PH + 1.0 + (BY - PH) * 0.04, zl - 0.5), v1 = P(xs, PH + 1.9 + (BY - PH) * 0.04, zl - 0.5); quad(w0, w1, v1, v0, glass); }
        const r0 = P(xc - hw - 0.25, BY + BH + 0.5, zf), r1 = P(xc + hw + 0.25, BY + BH + 0.5, zf), r2 = P(xc + hw + 0.25, PH + BH + 0.5, zl), r3 = P(xc - hw - 0.25, PH + BH + 0.5, zl); quad(r0, r1, r2, r3, roofC);
        const o0 = P(xc - hw, PH, zl), o1 = P(xc + hw, PH, zl), o2 = P(xc + hw, PH + BH, zl), o3 = P(xc - hw, PH + BH, zl); quad(o0, o1, o2, o3, dark);       // cửa vào thang ở đầu dưới
      }
      // trụ đỡ mặt cầu: ở hai đầu và hai bên mỗi thang
      const cols = [xl, xr]; for (const p of st.plats) { const xc = (p.xa + p.xb) / 2; cols.push(xc - 1.9, xc + 1.9); }
      for (const xc of cols) { const y0 = st.plats.some(p => xc >= p.xa && xc <= p.xb) ? PH : -2, a = P(xc - 0.3, y0, zn + 0.5), b = P(xc + 0.3, y0, zn + 0.5), d = P(xc + 0.3, BY, zn + 0.5), e = P(xc - 0.3, BY, zn + 0.5); quad(a, b, d, e, pil); }
      // thân cầu: sàn bê tông, tường có dải cửa sổ, mái tôn nhô ra
      quad(P(xl, BY - 0.5, zn), P(xr, BY - 0.5, zn), P(xr, BY - 0.5, zf), P(xl, BY - 0.5, zf), under);
      quad(P(xl, BY - 0.5, zn), P(xr, BY - 0.5, zn), P(xr, BY, zn), P(xl, BY, zn), pil);
      quad(P(xl, BY, zn), P(xr, BY, zn), P(xr, BY + BH, zn), P(xl, BY + BH, zn), wallC);
      quad(P(xl, BY + 0.9, zn), P(xr, BY + 0.9, zn), P(xr, BY + 1.8, zn), P(xl, BY + 1.8, zn), glass);
      for (let x = xr; x < xl; x += 4.0) quad(P(x - 0.1, BY, zn), P(x + 0.1, BY, zn), P(x + 0.1, BY + BH, zn), P(x - 0.1, BY + BH, zn), pil);      // cột đứng giữa các ô cửa sổ
      quad(P(xl + 0.6, BY + BH, zn - 0.5), P(xr - 0.6, BY + BH, zn - 0.5), P(xr - 0.6, BY + BH + 0.7, zn - 0.5), P(xl + 0.6, BY + BH + 0.7, zn - 0.5), roofC);
    };
    const bridgesFor = q => {
      const n = zExit === null ? bridgeCount(q.m.i) : 0; if (!n) return; const fr = n === 3 ? [1 / 6, 1 / 2, 5 / 6] : n === 2 ? [0.25, 0.75] : [0.5], ext = q.st.extent, tx0 = Math.min(...q.st.tracks.map(t => t.x)), tx1 = Math.max(...q.st.tracks.map(t => t.x)), z0p = q.d - 420;      // chân cầu ở hai đầu: ngoài đường ngoài cùng ít nhất 4,7 m (ngoài tường rào), không cắm lên đường nhánh
      for (const f of fr) { const zc = z0p + 440 * f; if (zc < ZN + 3 || zc > 1600 || zc < physLoZ || zc > physHiZ) continue; sink.push({ z: zc, fn: () => drawBridge(q.st, zc, Math.max(ext[1] + 1.4, tx1 + 4.7), Math.min(ext[0] - 1.4, tx0 - 4.7)) }); }
    };
    const drawStations = () => {
    for (const q of sts) {
      const { m, i, d, st } = q;
      const sgR = 1;
      if (zExit === null) enclose(q, d - 420, d + 20);
      bridgesFor(q);
      if (zExit === null) for (const t of st.tracks) {        // ghi: thanh nối lưỡi ghi, hộp máy chuyển ghi và đèn báo ở chỗ đường ga rẽ khỏi đường chính
        if (t.main || t.in0 === undefined) continue; const zs = d - t.in0, sgn = t.x >= t.plain ? 1 : -1; if (zs < ZN + 1 || zs > 700) continue;
        sink.push({ z: zs, fn: () => { const xs = lerp(t.plain, t.x, 0.0), steel = mixc([40, 44, 50], [196, 202, 208], day * (1 - wx * 0.3)), box = mixc([20, 30, 24], [70, 98, 78], day * (1 - wx * 0.3));
          quad(P(xs - 1.05, 0.1, zs), P(xs + 1.05, 0.1, zs), P(xs + 1.05, 0.16, zs), P(xs - 1.05, 0.16, zs), steel);
          quad(P(xs + sgn * 1.7, 0, zs), P(xs + sgn * 2.4, 0, zs), P(xs + sgn * 2.4, 0.8, zs), P(xs + sgn * 1.7, 0.8, zs), box);
          const lp = P(xs + sgn * 2.05, 1.05, zs), s = c.f / zs; ctx.fillStyle = night > 0.3 ? '#9fe8a8' : '#58b86a'; ctx.beginPath(); ctx.arc(lp[0], lp[1], Math.max(1, 0.1 * s), 0, 7); ctx.fill(); } });
      }
      const z0 = Math.max(zMin, d - 420), z1 = d + 20; if (z1 <= zMin || z0 > ZF) continue;
      const dwellHere = T.phase === 'dwell' && T.k === i, openDoors = dwellHere && T.door === 'open';
      const topc = mixc([40, 52, 68], [120, 134, 150], day * (1 - wx * 0.3));
      for (const p of st.plats) {
        const isOurs = q.stopHere && st.plat === p;
        // mặt trên, mặt đứng hai mép, vạch vàng an toàn ở mép kề đường
        // mặt trên, mặt đứng và vạch vàng vẽ theo từng đoạn 30 m vào danh sách xa → gần (như mái ga), để vật ở phía sau/phía dưới (cảnh, cột cầu) bị mặt sân ga che đúng, không nhìn xuyên qua
        for (let za = z0; za < z1; za += 30) { const zb = Math.min(z1, za + 30); sink.push({ z: zb, fn: () => {
          strip(() => p.xa, () => p.xb, PH, za, zb + 0.4, topc);
          for (const e of [p.xa, p.xb]) { const adj = st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01); wall(() => e, 0, PH, za, zb + 0.4, '#3a4a5c'); if (adj) { const inward = e === p.xa ? 1 : -1; strip(() => e, () => e + inward * 0.55, PH, za, zb + 0.4, '#e8c93a'); strip(() => e + inward * 0.6, () => e + inward * 0.72, PH, za, zb + 0.4, '#d6b21e'); } } } }); }      // vạch trong liên tục (内方線) cạnh dải gạch cảnh báo
        // mái ga (nửa trong suốt)
        // mái ga đặc, chừa hở phía trên đường ray (lùi 1,2 m khỏi mép kề đường) và nghiêng: mép kề đường thấp 5,2 m, mép ngoài / đỉnh mái cao 6,2 m (đảo: hai mái dốc về hai phía)
        // vẽ theo từng đoạn 30 m vào danh sách xa → gần để phong cảnh phía sau không đè lên mái
        { const under = mixc([22, 28, 38], [104, 116, 132], day * (1 - wx * 0.3)), edge = mixc([30, 38, 50], [150, 160, 172], day * (1 - wx * 0.3)), isAdj = e => st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01),
            adjA = isAdj(p.xa), adjB = isAdj(p.xb), ra = p.xa + (adjA ? 1.2 : 0), rb = p.xb - (adjB ? 1.2 : 0), ya = adjA ? 5.2 : 6.2, yb = adjB ? 5.2 : 6.2, rm = (ra + rb) / 2, ym = adjA && adjB ? 6.2 : (ya + yb) / 2,
            pts = adjA && adjB ? [[ra, ya], [rm, ym], [rb, yb]] : [[ra, ya], [rb, yb]];
          for (let za = Math.max(z0, ZN); za < z1; za += 30) { const zb = Math.min(z1, za + 30);
            sink.push({ z: (za + zb) / 2, fn: () => { for (let k = 0; k + 1 < pts.length; k++) quad(P(pts[k][0], pts[k][1], za), P(pts[k + 1][0], pts[k + 1][1], za), P(pts[k + 1][0], pts[k + 1][1], zb), P(pts[k][0], pts[k][1], zb), under);
              for (const [x, y] of [pts[0], pts[pts.length - 1]]) quad(P(x, y, za), P(x, y + 0.45, za), P(x, y + 0.45, zb), P(x, y, zb), edge); } }); } }
        // cột mái
        const xc = (p.xa + p.xb) / 2; for (let zz = Math.ceil((z0 - d) / 30) * 30 + d; zz < z1; zz += 30) if (zz >= ZN) sink.push({ z: zz, fn: () => { const a = P(xc, PH, zz), b = P(xc, 5.6, zz); ctx.strokeStyle = '#2c3d52'; ctx.lineWidth = Math.max(1, 0.35 * c.f / zz); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } });
        // hành khách trên sân ga (vơi dần khi lên tàu)
        const gone = dwellHere && isOurs ? clamp(T.dwellT / 22, 0, 1) : 0, count = Math.round((isOurs ? 30 : q.stopHere ? 14 : 5) * (p.xb - p.xa) / 9 * clamp(0.5 + st.tracks.length * 0.28, 0.6, 2.4)), sd = Math.round(p.xa);       // ga lớn (nhiều đường) đông người hơn ga nhỏ
        for (let k = 0; k < count; k++) { if (hash(i * 977 + k * 13 + 5 + sd) < gone) continue; const zz = (d - 400) + hash(i * 131 + k * 7 + 1 + sd) * 410, X = lerp(p.xa + 1.0, p.xb - 1.0, hash(i * 53 + k * 11 + 3 + sd)); if (zz < ZN || zz > 700) continue;
          sink.push({ z: zz, fn: () => { const s = c.f / zz, a = P(X, PH, zz); ctx.fillStyle = personColor(k + i); ctx.fillRect(a[0] - 0.22 * s, a[1] - 1.45 * s, 0.44 * s, 0.75 * s); ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, 0.1 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.1 * s, a[1]); ctx.moveTo(a[0] + 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.1 * s, a[1]); ctx.stroke(); ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.58 * s, 0.12 * s, 0, 7); ctx.fill(); } }); }
        // ---- chi tiết sân ga: gạch nổi ở mép, đèn cột, ghế, máy bán hàng, cầu thang, số toa trên nền, đồng hồ (chỉ vẽ khi ở gần để nhẹ)
        { const adjs = [p.xa, p.xb].filter(e => st.tracks.some(t => Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01)), xm = (p.xa + p.xb) / 2, wdt = p.xb - p.xa, zA = Math.max(z0, ZN), zB = Math.min(z1, 260), litA = night > 0.25 ? 1 : 0;
          const grey = mixc([40, 44, 50], [150, 152, 150], day * (1 - wx * 0.3)), dark = mixc([14, 16, 20], [60, 64, 70], day * (1 - wx * 0.3));
          for (const e of adjs) { const inward = e === p.xa ? 1 : -1;       // gạch cảnh báo nổi ở mép (hàng chấm) và số toa trên nền
            for (let zz = Math.ceil(zA / 0.9) * 0.9; zz < Math.min(zB, 70); zz += 0.9) { const zq = zz; sink.push({ z: zq, fn: () => { const a = P(e + inward * 0.12, PH, zq), b = P(e + inward * 0.5, PH, zq + 0.35); ctx.fillStyle = 'rgba(150,118,20,.75)'; ctx.fillRect(Math.min(a[0], b[0]), b[1], Math.max(1, Math.abs(b[0] - a[0])), Math.max(1, a[1] - b[1])); } }); }
            if (isOurs) for (let car = 1; car <= 16; car++) { const zz = q.d - sgR * ((car - 0.5) * 25) + 0; if (zz < ZN || zz > 150) continue; sink.push({ z: zz, fn: () => { const a = P(e + inward * 1.4, PH, zz), s = c.f / zz; if (s < 1.2) return; ctx.fillStyle = 'rgba(240,240,240,.85)'; ctx.font = 'bold ' + Math.min(26, 0.7 * s) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(car), a[0], a[1]); } }); } }
          for (let zz = Math.ceil((zA - d) / 15) * 15 + d; zz < zB; zz += 15) { const zq = zz, lampX = xm; sink.push({ z: zq, fn: () => { const b = P(lampX, PH, zq), t = P(lampX, 5.0, zq), s = c.f / zq; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); if (litA) { const g = ctx.createRadialGradient(t[0], t[1], 0, t[0], t[1], 1.6 * s); g.addColorStop(0, 'rgba(255,236,170,.9)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(t[0] - 1.6 * s, t[1] - 1.6 * s, 3.2 * s, 3.2 * s); } else { ctx.fillStyle = '#f2f0e4'; ctx.fillRect(t[0] - 0.25 * s, t[1] - 0.1 * s, 0.5 * s, 0.2 * s); } } }); }
          for (let zz = Math.ceil((zA - d) / 38) * 38 + d + 9; zz < zB; zz += 38) { const zq = zz, bx = xm + (hash(Math.round(zq) + sd * 3) < 0.5 ? -1 : 1) * Math.min(wdt * 0.28, 1.9);       // ghế dài hoặc máy bán hàng
            const kind = hash(Math.round(zq / 38) + sd) < 0.55 ? 'bench' : 'vend', hue = hash(Math.round(zq / 38) * 7 + sd) < 0.5 ? [200, 50, 50] : [50, 100, 190];
            sink.push({ z: zq, fn: () => { if (kind === 'bench') { const a = P(bx - 0.35, PH + 0.45, zq), b = P(bx + 0.35, PH, zq + 2.2); ctx.fillStyle = grey; ctx.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), Math.max(1, b[1] - a[1])); } else { const a = P(bx - 0.4, PH + 1.9, zq), b = P(bx + 0.4, PH, zq); ctx.fillStyle = grey; ctx.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1]); ctx.fillStyle = mixc(hue.map(v => v * 0.25), hue, litA ? 1 : day); ctx.fillRect(Math.min(a[0], b[0]) + 1, a[1] + 1, Math.max(1, Math.abs(b[0] - a[0]) - 2), (b[1] - a[1]) * 0.6); } } }); }
          // ---- thiết bị an toàn và thông tin trên sân ga: VẬT CỐ ĐỊNH theo toạ độ ga, mọi vị trí tính bằng khoảng cách b (m) phía sau vạch dừng, camera tính z = dm − sgR·b (không kẹp theo camera nên không bị kéo lê)
          { const zAt = b => q.d - sgR * b, midC = (x0, x1) => (x0 + x1) / 2, fogK = day * (1 - wx * 0.3);
            const redC = mixc([90, 20, 20], [212, 44, 40], fogK), whiteC = mixc([120, 124, 130], [240, 240, 236], fogK), blueC = mixc([14, 36, 70], [24, 80, 150], fogK), signBg = mixc([8, 10, 14], [20, 24, 30], fogK), yellowC = mixc([120, 100, 20], [240, 200, 40], fogK), binC = mixc([22, 40, 30], [60, 110, 80], fogK);
            const tag = (xa, xb, y0, y1, z, bg, fg, text, minPx) => { const a = P(xa, y1, z), b = P(xb, y0, z), w2 = Math.abs(b[0] - a[0]), hh = b[1] - a[1]; if (w2 < (minPx || 6) || hh < 4) return; ctx.fillStyle = bg; ctx.fillRect(Math.min(a[0], b[0]), a[1], w2, hh); if (!text) return; ctx.fillStyle = fg; ctx.textAlign = 'center'; let fs = hh * 0.62; ctx.font = 'bold ' + fs + 'px system-ui'; const tw = ctx.measureText(text).width; if (tw > w2 * 0.92) { fs *= w2 * 0.92 / tw; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(text, (a[0] + b[0]) / 2, a[1] + hh * 0.5 + fs * 0.34); };
            const box = (x, y0, y1, hw, z, col) => quad(P(x - hw, y0, z), P(x + hw, y0, z), P(x + hw, y1, z), P(x - hw, y1, z), col);
            const live = b => { const zz = zAt(b); return zz > ZN + 0.5 && zz < 330 ? zz : null; };
            for (const e of adjs) { const inward = e === p.xa ? 1 : -1, ex = e + inward * 0.7;
              // nút dừng khẩn (cột nhỏ, nút đỏ, nhãn trắng): mỗi 50 m dọc mép sân ga [N: khoảng 50 m một nút ở ga Shinkansen Kyushu]
              for (let k = 0; k < 9; k++) { const zz = live(15 + 50 * k); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(ex, PH, PH + 1.3, 0.04, zz, '#3c4650'); box(ex, PH + 0.9, PH + 1.28, 0.15, zz, redC); box(ex, PH + 1.0, PH + 1.18, 0.09, zz - 0.02, whiteC); } }); }
              // vạch xếp hàng lên tàu trên sàn (hai vạch dọc mỗi cửa toa) và gạch dẫn đường: vạch trong liên tục (内方線) ở mép phía trong dải gạch nổi
              if (e === (isOurs ? adjs[0] : e)) for (let car = 0; car < 16; car++) for (const off of [3.5, 21.5]) { const zz = live(car * 25 + (25 - off)); if (zz === null || zz > 160) continue; sink.push({ z: zz, fn: () => { for (const xo of [1.25, 2.05]) { const a0 = P(e + inward * xo, PH, zz - 1.4), a1 = P(e + inward * (xo + 0.1), PH, zz - 1.4), b0 = P(e + inward * xo, PH, zz + 1.4), b1 = P(e + inward * (xo + 0.1), PH, zz + 1.4); quad(a0, a1, b1, b0, whiteC); } } }); }
            }
            if (isOurs && adjs.length) { const e = adjs[0], inward = e === p.xa ? 1 : -1;
              // biển dừng của lái tàu (停止位置目標): treo dưới mái ở mép kề đường, ghi số toa của đoàn; một biển đúng vạch dừng
              { const zz = live(0); if (zz !== null) sink.push({ z: zz, fn: () => { box(e + inward * 0.5, 4.95, 5.2, 0.02, zz, '#2c3d52'); tag(e + inward * 0.5 - 0.7, e + inward * 0.5 + 0.7, 4.2, 4.95, zz, yellowC, '#10151c', String(T.veh.cars), 6); } }); }
              // biển số toa treo từ mái trước mỗi toa (1 → 16)
              for (let car = 1; car <= 16; car++) { const zz = live((car - 0.5) * 25); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(e + inward * 1.2, 4.9, 5.2, 0.02, zz, '#2c3d52'); tag(e + inward * 1.2 - 0.55, e + inward * 1.2 + 0.55, 4.25, 4.9, zz, blueC, '#fff', String(car), 5); } }); }
            }
            // bảng giờ tàu đi (発車標): treo giữa sân ga, hai bảng; sân ga của ta ghi chuyến và giờ khởi hành kế hoạch, sân ga khác ghi đồng hồ
            for (const b of [110, 300]) { const zz = live(b); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(xm - 1.4, 5.0, 5.3, 0.02, zz, '#2c3d52'); box(xm + 1.4, 5.0, 5.3, 0.02, zz, '#2c3d52');
              const a = P(xm - 1.7, 5.0, zz), bb = P(xm + 1.7, 4.0, zz), w2 = Math.abs(bb[0] - a[0]), hh = bb[1] - a[1]; if (w2 < 14 || hh < 8) return; ctx.fillStyle = signBg; ctx.fillRect(Math.min(a[0], bb[0]), a[1], w2, hh); ctx.fillStyle = '#ffb347'; ctx.textAlign = 'center';
              const mk2 = T.M[Math.min(T.k, T.M.length - 1)], dep = mk2 && mk2.dep != null ? mk2.dep : 0, tt = ((W.trip.t0 + dep) % 86400 + 86400) % 86400, hm = String(Math.floor(tt / 3600)).padStart(2, '0') + ':' + String(Math.floor(tt % 3600 / 60)).padStart(2, '0'), last = T.M[T.M.length - 1];
              const l1 = isOurs ? W.trip.label : hhmm((((W.trip.t0 + W.t) % 86400) + 86400) % 86400), l2 = isOurs ? (last.jp || last.name) + '  ' + hm : ''; let fs = hh * 0.36; ctx.font = 'bold ' + fs + 'px system-ui'; const t1 = ctx.measureText(l1).width; if (t1 > w2 * 0.92) { fs *= w2 * 0.92 / t1; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(l1, (a[0] + bb[0]) / 2, a[1] + hh * 0.42);
              if (l2) { ctx.fillStyle = '#9fe8a8'; let f2 = hh * 0.34; ctx.font = 'bold ' + f2 + 'px system-ui'; const t2 = ctx.measureText(l2).width; if (t2 > w2 * 0.92) { f2 *= w2 * 0.92 / t2; ctx.font = 'bold ' + f2 + 'px system-ui'; } ctx.fillText(l2, (a[0] + bb[0]) / 2, a[1] + hh * 0.84); } } }); }
            // thùng rác (ở mép giữa sân ga, so le với ghế), loa phát thanh và camera giám sát gắn trên cột mái
            for (let k = 0; k < 7; k++) { const zz = live(37 + 60 * k); if (zz === null || zz > 260) continue; const bx = xm + (hash(k * 7 + sd) < 0.5 ? -1 : 1) * Math.min(wdt * 0.2, 1.4); sink.push({ z: zz, fn: () => { box(bx, PH, PH + 0.85, 0.28, zz, binC); box(bx, PH + 0.85, PH + 0.95, 0.31, zz, '#2f3a34'); } }); }
            for (let k = 0; k < 14; k++) { const zz = live(15 + 30 * k); if (zz === null) continue; sink.push({ z: zz, fn: () => { box(xm, 4.6, 5.1, 0.3, zz - 0.4, '#3b4655'); if (k % 3 === 0) { box(xm, 5.15, 5.45, 0.18, zz - 0.3, '#1a1f26'); const lp = P(xm, 5.3, zz - 0.32), s = c.f / zz; ctx.fillStyle = '#6fb0ff'; ctx.beginPath(); ctx.arc(lp[0], lp[1], Math.max(0.8, 0.05 * s), 0, 7); ctx.fill(); } } }); }
          }
            // ánh sáng đèn cột trên sàn ban đêm: vệt sáng ấm dưới mỗi đèn (cùng vị trí với đèn cột, cố định theo ga)
            if (night > 0.25) for (let zz = Math.ceil((zA - d) / 15) * 15 + d; zz < zB; zz += 15) { const zq = zz; if (zq < ZN + 0.5) continue; sink.push({ z: zq + 0.5, fn: () => { const lit = 0.14 * Math.min(1, (night - 0.25) * 2); quad(P(xm - wdt * 0.45, PH, zq - 4.2), P(xm + wdt * 0.45, PH, zq - 4.2), P(xm + wdt * 0.45, PH, zq + 4.2), P(xm - wdt * 0.45, PH, zq + 4.2), 'rgba(255,226,150,' + lit + ')'); } }); }
          if (isOurs) {                // biển số đường (番線) treo dưới mái và nhân viên sân ga (đồng phục xanh, găng trắng, giơ tay chỉ tay xác nhận khi tàu vào)
            const zb = q.d - sgR * 140, nth = Math.max(1, st.stops.indexOf(st.ours) + 1) + (hash(i * 31) < 0.5 ? 0 : 1);
            if (zb > ZN + 2 && zb < 420) sink.push({ z: zb, fn: () => { const a = P(xm - 1.6, 4.9, zb), b = P(xm + 1.6, 4.0, zb), w2 = Math.abs(b[0] - a[0]); if (w2 < 6) return; const hh = b[1] - a[1]; ctx.fillStyle = '#103a6a'; ctx.fillRect(Math.min(a[0], b[0]), a[1], w2, hh); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold ' + hh * 0.6 + 'px system-ui'; ctx.fillText(nth + '番線', (a[0] + b[0]) / 2, a[1] + hh * 0.72); } });
            const zs = q.d - sgR * 10, zs2 = q.d - sgR * 180;
            for (const [zz, pt] of [[zs, 1], [zs2, 0]]) if (zz > ZN + 0.5 && zz < 320) { const ex = adjs[0] === undefined ? xm : adjs[0] + (adjs[0] === p.xa ? 1 : -1) * 1.1;
              sink.push({ z: zz, fn: () => { const s = c.f / zz, a = P(ex, PH, zz), arm = T.v > 0.5 || T.phase === 'run' ? 1 : 0; ctx.fillStyle = '#1b2f55'; ctx.fillRect(a[0] - 0.24 * s, a[1] - 1.45 * s, 0.48 * s, 0.78 * s); ctx.strokeStyle = '#141f38'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.1 * s, a[1]); ctx.moveTo(a[0] + 0.1 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.1 * s, a[1]); ctx.stroke(); ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.6 * s, 0.13 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(a[0] - 0.15 * s, a[1] - 1.78 * s, 0.3 * s, 0.1 * s);
                ctx.strokeStyle = '#1b2f55'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] + 0.22 * s, a[1] - 1.35 * s); const ang = arm && pt ? (-0.9 + 0.12 * Math.sin(now / 250)) : 0.5; ctx.lineTo(a[0] + 0.22 * s + Math.sin(ang) * 0.6 * s, a[1] - 1.35 * s - Math.cos(ang) * 0.6 * s * (arm && pt ? 1 : -1)); ctx.stroke(); ctx.fillStyle = '#fff'; const gx = a[0] + 0.22 * s + Math.sin(ang) * 0.6 * s, gy = a[1] - 1.35 * s - Math.cos(ang) * 0.6 * s * (arm && pt ? 1 : -1); ctx.fillRect(gx - 0.07 * s, gy - 0.07 * s, 0.14 * s, 0.14 * s); } }); }
          }
          if (isOurs) for (const zq of [q.d - sgR * 60, q.d - sgR * 180, q.d - sgR * 300, q.d + sgR * 60]) if (zq > ZN + 0.5) sink.push({ z: zq, fn: () => { const x0 = xm - 0.2, b = P(x0, PH, zq), t = P(x0, 3.1, zq), s = c.f / zq; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); const cx2 = t[0], cy2 = t[1] - 0.45 * s; ctx.fillStyle = '#f4f4ee'; ctx.beginPath(); ctx.arc(cx2, cy2, 0.42 * s, 0, 7); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, 0.05 * s); ctx.beginPath(); ctx.arc(cx2, cy2, 0.42 * s, 0, 7); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + 0.25 * s * Math.sin(now / 60000 * 6.283), cy2 - 0.25 * s * Math.cos(now / 60000 * 6.283)); ctx.stroke(); } });       // đồng hồ cột (cố định trên sân ga, không đi theo camera)
        }
      }
      // cửa chắn kính, cửa tàu, tên ga, vạch dừng và biển khoảng cách ở sân ga kề đường dừng của ta
      if (st.plat && !m.mainStop) {
        const sg = st.platSign, Xe = st.ours.x + sg * PEDGE;
        // cửa chắn sân ga nửa chiều cao (1,4 m) ở MỌI mép sân ga kề đường ray: đế, kính cố định, thanh ngang trên (vẽ theo đoạn 30 m cùng danh sách sắp theo độ xa) và cột đứng ở ranh giữa các cửa; cánh cửa (mở/đóng theo cửa tàu) chỉ ở mép kề đường dừng của ta
        const doorZ = []; for (let car = 0; car < 16; car++) for (const off of [3.5, 21.5]) doorZ.push(q.d - sgR * (car * 25 + (25 - off)));
        const glassC = day > 0.4 ? 'rgba(160,210,235,.20)' : 'rgba(70,100,130,.22)', baseC = mixc([30, 34, 40], [112, 118, 124], day * (1 - wx * 0.3)), railC = mixc([40, 46, 54], [176, 184, 190], day * (1 - wx * 0.3)), postC = mixc([36, 42, 50], [138, 146, 152], day * (1 - wx * 0.3)), openC = 'rgba(8,12,18,.88)';
        for (const p of st.plats) for (const e of [p.xa, p.xb]) { if (!st.tracks.some(t => !t.thr && Math.abs(Math.abs(t.x - e) - PEDGE) < 0.01)) continue;
          const inward = e === p.xa ? 1 : -1, xd = e + inward * 0.2, mine = Math.abs(e - Xe) < 0.01;
          for (let za = z0; za < z1; za += 30) { const zb = Math.min(z1, za + 30); sink.push({ z: zb, fn: () => { wall(() => xd, PH, PH + 0.3, za, zb + 0.4, baseC); wall(() => xd, PH + 0.3, PH + 1.35, za, zb + 0.4, glassC); wall(() => xd, PH + 1.35, PH + 1.45, za, zb + 0.4, railC); } }); }
          for (const zz of doorZ) { if (zz < ZN || zz > 700) continue;
            sink.push({ z: zz, fn: () => { const hw = 0.8;
              if (mine && openDoors) wall(() => xd, PH + 0.3, PH + 1.35, zz - hw, zz + hw, openC);                                                              // cửa chắn mở cùng cửa tàu
              for (const zp of [zz - hw, zz + hw]) quad(P(xd - 0.07, PH, zp - 0.06), P(xd + 0.07, PH, zp - 0.06), P(xd + 0.07, PH + 1.45, zp - 0.06), P(xd - 0.07, PH + 1.45, zp - 0.06), postC); } }); } }
        if (q.stopHere || q.isT) for (const zz of [q.d - sgR * 70, q.d - sgR * 170, q.d - sgR * 270, q.d + sgR * 30]) if (zz > ZN + 0.5) sink.push({ z: zz, fn: () => { const xc = (st.plat.xa + st.plat.xb) / 2, a = P(xc + 3.4, 4.6, zz), b = P(xc - 3.4, 3.7, zz), x0 = Math.min(a[0], b[0]), ww = Math.abs(b[0] - a[0]); if (ww < 8) return; ctx.fillStyle = '#1f6f4a'; ctx.fillRect(x0, a[1], ww, b[1] - a[1]); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; const label = I18N.lang === 'ja' && m.jp ? m.jp + (root.STATION_KANA && root.STATION_KANA[m.jp] ? '【' + root.STATION_KANA[m.jp] + '】' : '') : (m.jp || '') + '  ' + m.name; let fs = Math.max(7, (b[1] - a[1]) * 0.42); ctx.font = 'bold ' + fs + 'px system-ui'; const tw = ctx.measureText(label).width; if (tw > ww * 0.92) { fs *= ww * 0.92 / tw; ctx.font = 'bold ' + fs + 'px system-ui'; } ctx.fillText(label, x0 + ww / 2, a[1] + (b[1] - a[1]) * 0.66); } });
        if (q.isT) { const d = q.dm;
          sink.push({ z: d, fn: () => { const x1 = Xe, x2 = Xe + sg * 7; quad(P(x1, PH, d), P(x2, PH, d), P(x2, PH, d + 0.4), P(x1, PH, d + 0.4), '#4cd68a'); const a = P(Xe + sg * 1.3, PH + 3.6, d), b = P(Xe + sg * 1.3, PH, d); ctx.strokeStyle = '#4cd68a'; ctx.lineWidth = Math.max(1, 0.12 * c.f / d); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const pl = P(Xe + sg * 0.4, PH + 3.8, d), pr = P(Xe + sg * 2.6, PH + 3.0, d); ctx.fillStyle = '#4cd68a'; ctx.fillRect(Math.min(pl[0], pr[0]), pl[1], Math.abs(pr[0] - pl[0]), pr[1] - pl[1]); const hh = pr[1] - pl[1]; if (hh > 5) { ctx.fillStyle = '#082016'; ctx.textAlign = 'center'; ctx.font = 'bold ' + hh * 0.62 + 'px system-ui'; ctx.fillText(_t('VẠCH'), (pl[0] + pr[0]) / 2, pl[1] + hh * 0.72); } } });
          for (const mm of [300, 200, 100, 50, 25, 10]) { const zz = d - sgR * mm; if (zz < ZN) continue; sink.push({ z: zz, fn: () => { const onP = zz > q.d - 420, Yb = onP ? PH : 0, X = onP ? Xe + sg * 1.1 : st.ours.x + sg * 1.6, a = P(X, Yb + 2.3, zz), b = P(X, Yb + 1.3, zz), wpx = (b[1] - a[1]) * 1.2; ctx.strokeStyle = '#7a8ea5'; ctx.lineWidth = Math.max(1, 0.07 * c.f / zz); const bt = P(X, Yb, zz); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = '#ffc247'; ctx.fillRect(a[0] - wpx / 2, a[1], wpx, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.62 + 'px system-ui'; ctx.fillText(mm, a[0], b[1] - (b[1] - a[1]) * 0.25); } } }); }
        }
      }
    }
    };
    drawStations();

    // ---- dây điện trên cao (mỗi đường) và trụ điện giữa hai đường chính
    // giá đỡ dây điện: kiểu theo kết cấu và bối cảnh (S.supportAt): cổng thép Vトラス (nền đắp), xà ống thép nhẹ (cầu cạn, cầu), xà かご (ga nhiều đường), cột bên + tay đòn xoay (đường đơn), giá treo trên trần (hầm); cột thép / bê tông / ống thép đổi theo đoạn. Không bao giờ có cột giữa hai đường (S.supportColumns): hai cột ở hai mép ngoài.
    const gantry = (zq, xa, xb, heads) => zq >= physLoZ && zq <= physHiZ && items.push({ z: zq, fn: () => { const sg = !!(L.single && L.single.length) && S.singleEff(W, T.x + zq) > 0.6, sup = S.supportAt(L, W.lineId, km(zq), { single: sg, wide: Math.abs(xb - xa) > 18 }), s = c.f / zq, dl = day * (1 - wx * 0.3), col = mixc([24, 30, 38], [96, 108, 122], dl);
      const pc = sup.pole === 'conc' ? mixc([62, 64, 62], [172, 172, 164], dl) : sup.pole === 'pipe' ? mixc([44, 50, 60], [138, 148, 158], dl) : col, pw = sup.pole === 'conc' ? 0.55 : sup.pole === 'pipe' ? 0.22 : 0.3;
      const yb = sup.kind === 'pipe' ? 7.4 : sup.kind === 'bracket' ? 6.9 : sup.kind === 'tunnel' ? 6.4 : 6.8, hx = sup.kind === 'bracket' ? [heads[0]] : heads;
      if (sup.kind === 'tunnel') { if (s > 2.2) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 0.09 * s); ctx.beginPath(); for (const x of hx) { const h0 = P(x, yb, zq), h1 = P(x, 5.3, zq); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); const t0 = P(x - 0.3, yb, zq), t1 = P(x + 0.3, yb, zq); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); } ctx.stroke(); } return; }      // hầm: giá treo gắn vào vòm hầm
      ctx.strokeStyle = pc; ctx.lineWidth = Math.max(1, pw * s); ctx.beginPath(); const cols = S.supportColumns(sup.kind, xa, xb, heads); for (const x of cols) { const a0 = P(x, 0, zq), a1 = P(x, yb + (sup.kind === 'bracket' ? 0.5 : 0.8), zq); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); } ctx.stroke();
      ctx.strokeStyle = col;
      if (sup.kind === 'bracket') { const x0 = xa, xe = hx[0], a = P(x0, yb, zq), b = P(xe, yb, zq), d0 = P(x0, yb - 1.1, zq), d1 = P(x0 + (xe - x0) * 0.55, yb, zq); ctx.lineWidth = Math.max(1, 0.16 * s); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = Math.max(1, 0.08 * s); ctx.beginPath(); ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d1[0], d1[1]); ctx.stroke(); }      // tay đòn xoay từ cột bên, thanh chống chéo
      else { const top = yb + (sup.kind === 'pipe' ? 0 : 0.8), a1 = P(xa, top, zq), b1 = P(xb, top, zq);
        ctx.lineWidth = Math.max(1, (sup.kind === 'pipe' ? 0.16 : sup.kind === 'cage' ? 0.28 : 0.3) * s); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]);
        if (sup.kind !== 'pipe') { const lo = sup.kind === 'cage' ? top - 1.3 : top - 0.8, a2 = P(xa, lo, zq), b2 = P(xb, lo, zq); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); } ctx.stroke();
        if (sup.kind !== 'pipe' && s > 3) { const lo = sup.kind === 'cage' ? top - 1.3 : top - 0.8, n = Math.max(3, Math.round(Math.abs(xb - xa) / 2.4)); ctx.lineWidth = Math.max(1, 0.07 * s); ctx.beginPath(); for (let q = 0; q <= n; q++) { const x = xa + (xb - xa) * q / n, p = P(x, q % 2 ? top : lo, zq); q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); } }      // Vトラス / かご: giằng zích zắc giữa hai thanh chính
      if (s > 2.2) { ctx.lineWidth = Math.max(1, 0.07 * s); ctx.beginPath(); for (const x of hx) { const h0 = P(x, yb, zq), h1 = P(x, 5.3, zq); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); } ctx.stroke(); }
      if (inSnow && sup.kind !== 'bracket') { const a1 = P(xa, yb + 0.8, zq), b1 = P(xb, yb + 0.8, zq); ctx.fillStyle = '#f2f6fb'; ctx.fillRect(Math.min(a1[0], b1[0]), a1[1] - 1, Math.abs(b1[0] - a1[0]), 2); } } });
    const lowHid = (xf, yo) => (xbOn && W.lineId === 'jts' && yo) ? z => yo(z) < -1.5 && S.structAt(L, km(z)) === 'v' && xf(z) > xl(z) - 0.3 && xf(z) < xr(z) + 0.3 : null;      // đường thấp hơn cầu và nằm dưới mặt cầu: bị che
    const wire = (xf, z0, z1, yo) => { const zs = zsteps(Math.max(z0, zMin, physLoZ), Math.min(z1, zLim, physHiZ)); if (zs.length < 2) return; const yy = z => yo ? yo(z) : 0, hid = lowHid(xf, yo); ctx.beginPath(); { let on0 = false; for (const z of zs) { if (hid && hid(z)) { on0 = false; continue; } const p = P(xf(z), 5.2 + yy(z), z); on0 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); on0 = true; } } ctx.stroke();
      const lw = ctx.lineWidth; ctx.lineWidth = Math.max(0.6, lw * 0.7); ctx.beginPath(); let on = false; for (const z of zs) { if (z > 900) break; if (hid && hid(z)) { on = false; continue; } const p = P(xf(z), 6.6 + yy(z), z); on ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); on = true; } ctx.stroke();      // dây treo (messenger)
      ctx.beginPath(); on = false; for (const z of zs) { if (z > 900) break; if ((hid && hid(z)) || S.wireAt(L, W.lineId, km(z)) !== 'compound') { on = false; continue; } const p = P(xf(z), 5.9 + yy(z), z); on ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); on = true; } ctx.stroke(); ctx.lineWidth = lw; };      // dây phụ (compound nặng: Tokaido, Sanyo, Joetsu, Tohoku phía nam Morioka...)
    ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2;
    { const clipU = (lo, hi) => W.dir === 'down' ? [lo, Math.min(hi, xbZJ)] : [Math.max(lo, xbZJ), hi], isH = xbOn && W.lineId === 'hok', w0 = isH && xbReal === 'up' ? clipU(ZN, ZF) : [ZN, ZF], w1 = isH && xbReal !== 'up' ? clipU(ZN, ZF) : [ZN, ZF];
      wire(mainX, w0[0], w0[1]); wire(oppAt, w1[0], w1[1]);
      if (xbOn) { const bz = W.dir === 'down' ? [Math.max(ZN, xbZC), ZF] : [ZN, Math.min(ZF, xbZC)], yo = yB; wire(z => xbL(z).B, bz[0], bz[1], yB);
        ctx.strokeStyle = 'rgba(214,222,232,.9)'; ctx.lineWidth = 1.5; for (const sx of [-0.72, 0.72]) { ctx.beginPath(); let brk = false; for (let z = Math.max(bz[0], ZN), f = true; z <= bz[1]; z += z < 400 ? 10 : 40, f = false) { const hd = lowHid(z2 => xbL(z2).B, yo); if (hd && hd(z)) { brk = true; continue; } const p = P(xbL(z).B + sx, 0.15 + (yo ? yo(z) : 0), z); (f || brk) ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); brk = false; } ctx.stroke(); }
        ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; } }
    for (const jc of L.meta.junctions || []) { const sj = S.sOfKm(jc.km, W.dir, L.kmEnd) - T.x, xbJ = !!jc.xb && W.lineId === 'jts', tx = xbJ ? z => xbL(z).A : z => S.trunkOff(W, T.x + z), yo = jc.xb ? dEl : null; let a = Math.max(ZN, W.dir === 'down' ? sj : sj - 3200), b = Math.min(ZF, W.dir === 'down' ? sj + 3200 : sj);
      if (jc.run) { if (W.dir === 'down') a = Math.max(a, sj + 0.5); else b = Math.min(b, sj - 0.5); }
      if (b > a) { const cl = trunkClip(sj, a, b, ZN); if (!cl) continue; [a, b] = [Math.max(a, cl[0]), Math.min(b, cl[1])]; }
      if (b > a) { const dls = xbJ ? [0] : S.branchDeltas(W, jc); for (const dl of dls) wire(z => tx(z) + dl, a, b, yo); ctx.strokeStyle = 'rgba(214,222,232,.9)'; ctx.lineWidth = 1.5; for (const sx of xbJ ? [-0.72, 0.72] : dls.flatMap(dl => [dl - 0.72, dl + 0.72])) { ctx.beginPath(); let brk = false; for (let z = a, f = true; z <= b; z += z < 400 ? 10 : 40, f = false) { const hd = xbJ ? lowHid(tx, yo) : null; if (hd && hd(z)) { brk = true; continue; } const p = P(tx(z) + sx, 0.15 + (yo ? yo(z) : 0), z); (f || brk) ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); brk = false; } ctx.stroke(); }       // ray đường Tohoku luôn thấy được dù ở xa
        for (let k = Math.ceil((T.x + a) / 50), z = k * 50 - T.x; z < b; k++, z = k * 50 - T.x) if (!jc.xb && Math.abs(tx(z)) >= 20) gantry(z, tx(z) + dls[0] + 3.9, tx(z) + dls[dls.length - 1] - 3.9, dls.map(dl => tx(z) + dl)); }       // cặp đường nhánh / đường chính đã tách xa: cổng riêng; còn sát nhau thì dùng chung cổng của hành lang
      ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; }
    for (const q of sts) for (const t of q.st.tracks) { if (t.main) continue; wire(z => lerp(t.plain, t.x, trackWF(t, T.x + z, q.m.s)), q.d - FA, q.d + FB); }
    for (let k = Math.ceil((T.x + ZN) / 50), z = k * 50 - T.x; z < Math.min(1600, zLim); k++, z = k * 50 - T.x) gantry(z, xr(z) + 1.0, xl(z) - 1.0, [mainX(z), oppAt(z)]);       // cổng đỡ dây điện dùng chung cho mọi tuyến: hai cột ở hai mép hành lang (đã gồm đường ga và nhánh còn sát) + xà ngang
    // ---- nền đất: hàng rào thép (cao ngang tàu) cách cột giá đỡ 1 m về phía ngoài; chỉ ở kết cấu nền đất, ngoài vùng ga, hở ở đường ngang (S.fenceAt); mắt lưới mờ để vẫn thấy cảnh phía sau
    if (zExit === null) {
      const FH = S.FENCE_H, xz = (W.xings || []).map(g => g.s - T.x), lo = Math.max(ZN, physLoZ), hi = Math.min(ZF, physHiZ), fcol = mixc([34, 44, 50], [150, 164, 170], day * (1 - wx * 0.3)), rg = (col, a) => col.replace('rgb', 'rgba').replace(')', ',' + a + ')'),
        fOk = z => S.fenceAt(L, km(z), !!inStationZone(z, z)) && !xz.some(q => Math.abs(q - z) < S.FENCE_XGAP), zs = zsteps(lo, hi);
      for (const side of [1, -1]) { const ef = z => side > 0 ? xr(z) + 1.0 + S.FENCE_OFF : xl(z) - 1.0 - S.FENCE_OFF;
        for (let i = 0; i + 1 < zs.length; i++) { const a = zs[i], b = zs[i + 1], zm = (a + b) / 2; if (b <= a || !fOk(zm)) continue;
          items.push({ z: zm, fn: () => { const al = fadeA(zm), ea = ef(a), eb = ef(b), p0 = P(ea, 0, a), p1 = P(eb, 0, b), p2 = P(eb, FH, b), p3 = P(ea, FH, a), w = Math.max(0.8, 0.06 * c.f / zm);
            quad(p0, p1, p2, p3, rg(fcol, (0.2 * al).toFixed(3))); ctx.strokeStyle = rg(fcol, (0.75 * al).toFixed(3)); ctx.lineWidth = w; ctx.beginPath();
            for (const y of [FH, FH * 0.5, 0.15]) { const u = P(ea, y, a), v = P(eb, y, b); ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); }
            if (a < 170) for (let k = Math.ceil((T.x + a) / 5), z = k * 5 - T.x; z < b; k++, z = k * 5 - T.x) { const e = ef(z), u = P(e, 0, z), v = P(e, FH, z); ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); }
            ctx.stroke(); } }); } } }

    // ---- phong cảnh hai bên (không vẽ trong hầm); giữ hành lang đường sắt và sân ga
    {
      const zMin = zExit === null ? 6 : zExit + 2, tgt = zExit === null ? items : outItems;
      const bands = [[10, 160, 16, 0], [160, 760, 38, 1], [760, 2400, 120, 2]];
      if (wdOn && !useStrips) {                // toà nhà thật 3D (chỉ khi không có dải tranh)
        let cnt = 0;                           // duyệt trực tiếp dữ liệu (không cấp phát, thứ tự cố định theo vị trí => không nhấp nháy)
        WD.forBuildings(W.lineId, W.dir, L.kmEnd, T.x, zMin, 2400, 420, wdOurs, (bz, be, bw, bdz, bh, bt, blev, btone) => {
          if (bz < zMin) return; if (bz > 2400 || cnt >= 420) return false;
          if (!(bz < 150 || (bz < 500 && bw * bdz > 80) || (bz < 1000 && (bh > 14 || bw * bdz > 500)) || bh > 28)) return; cnt++;
          const b = { z: bz, e: be, w: bw, dz: bdz, h: bh, t: bt, lev: blev, tone: btone };
          const qz = inStationZone(b.z, b.z + b.dz), ext = qz ? qz.st.extent : [Math.min(0, oppAt(b.z)), Math.max(0, oppAt(b.z))];
          if (b.e > 0 ? b.e - b.w / 2 < ext[1] + 8 : b.e + b.w / 2 > ext[0] - 8) return;
          const o = { kind: 'jp', t: b.t, lev: b.lev, w: Math.max(4, b.w), d: Math.max(4, b.dz), h: b.h, tone: b.tone, lat: 0 }, X = b.e, zz = b.z;
          tgt.push({ z: zz, fn: () => drawCell(ctx, c, o, X, zz, day, wx, night, inSnow, windy, now, fadeA, quad, PG) });
        });
      }
      if (wdOn && !useStrips) {                // cột điện và dây điện dọc phố 3D (chỉ khi không có dải tranh)
        const seen = new Set();
        for (const g of WD.poles(W.lineId, W.dir, L.kmEnd, T.x, Math.max(zMin, 4), 420, 150, wdOurs)) {
          if (g.z0 < zMin || g.z1 < zMin) continue; const qz = inStationZone(g.z0, g.z1), ext = qz ? qz.st.extent : [Math.min(0, oppAt(g.z0)), Math.max(0, oppAt(g.z0))];
          if (g.e0 > ext[0] - 6 && g.e0 < ext[1] + 6) continue;
          if (seen.has(g.id)) continue; seen.add(g.id);
          tgt.push({ z: Math.min(g.z0, g.z1), fn: () => { const A = fadeA(g.z0); ctx.globalAlpha = A; const b0 = P(g.e0, 0, g.z0), t0 = P(g.e0, 9, g.z0), t1 = P(g.e1, 9, g.z1); ctx.strokeStyle = night > 0.35 ? '#1c1c20' : '#5d5a55'; ctx.lineWidth = Math.max(1, 0.28 * c.f / g.z0); ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(t0[0], t0[1]); ctx.stroke();
            ctx.lineWidth = Math.max(0.6, 0.07 * c.f / g.z0); ctx.strokeStyle = night > 0.35 ? '#26262a' : '#4a4743'; for (const dy of [0, -0.7, -1.4]) { const q0 = P(g.e0, 9 + dy, g.z0), q1 = P(g.e1, 9 + dy, g.z1); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.quadraticCurveTo((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2 + 3 * c.f / g.z0, q1[0], q1[1]); ctx.stroke(); } ctx.globalAlpha = 1; } });
        }
      }
      if (!useStrips) for (const [za, zb, step, bi] of bands) for (let ci = Math.floor((T.x + za) / step); ci * step - T.x < zb; ci++) {
        const z = ci * step - T.x; if (z < za * 0.9) continue; const bio = biomeAt(z);
        for (const side of [-1, 1]) { let o = cellObject(ci + bi * 100000, bio, side); if (wdOn) o = null; for (const bw of wdOn ? ['mountain', 'field'] : []) { const o2 = cellObject(ci + bi * 100000, bw, side); if (!o2 || o2.kind === 'building' || o2.kind === 'house') continue;      // có dữ liệu thật: cây ở rừng/công viên, ruộng và cây thưa ở đất nông nghiệp; nhà đã lấy từ toà nhà thật
            const zq = z + (hash(ci * 3 + side) - 0.5) * step * 0.6, ofs = o2.w / 2 + o2.lat * 0.5 + 8, Xq = (side > 0 ? 1 : -1) * (Math.abs(side > 0 ? Math.max(0, oppAt(zq)) : Math.min(0, oppAt(zq), ADJ)) + ofs + 12), cls = String.fromCharCode(landCls(zq, Xq) || 0);
            if (bw === 'mountain' ? CLS_TREE.includes(cls) : (o2.kind === 'field' ? cls === CLS_FIELD : (cls === CLS_FIELD || cls === 'g' || cls === 'o' || cls === ' '))) { o = o2; break; } }
          if (!o) continue; const zz = z + (hash(ci * 3 + side) - 0.5) * step * 0.6; if (zz < zMin) continue; if (S.structAt(L, km(zz)) === 'b' || S.structAt(L, km(zz + (o.d || 0))) === 'b') continue;      // trên sông không có nhà, ruộng, cây
          const half = o.w / 2, qz = inStationZone(zz, zz + (o.d || 0)), ext = qz ? qz.st.extent : [Math.min(0, oppAt(zz)), Math.max(0, oppAt(zz))];
          const margin = qz ? (o.kind === 'building' ? 14 : 12) : (o.kind === 'building' ? 12 : o.kind === 'field' ? 14 : 8), off = half + o.lat * 0.5, X = side > 0 ? Math.max(ext[1], 0) + margin + off : Math.min(ext[0], ADJ) - margin - off;
          tgt.push({ z: zz, fn: () => drawCell(ctx, c, o, X, zz, day, wx, night, inSnow, windy, now, fadeA, quad, PG) }); } }
    }
    // ---- mốc km mỗi 1 km (cổng đỡ dây điện dùng chung cho cả tuyến nằm ở phần dây điện bên dưới)
    if (zExit === null) {
      const k0 = Math.ceil(Math.min(km(0), km(1500))), k1 = Math.floor(Math.max(km(0), km(1500)));
      for (let kk = k0; kk <= k1; kk++) { const zq = (S.sOfKm(kk, W.dir, L.kmEnd)) - T.x; if (zq < ZN + 5 || zq > 1500 || S.structAt(L, kk) === 't') continue;
        items.push({ z: zq, fn: () => { const X = xl(zq) - 0.9, b = P(X, 0, zq), t = P(X, 1.5, zq), s = c.f / zq; ctx.strokeStyle = '#6a7684'; ctx.lineWidth = Math.max(1, 0.1 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); ctx.fillStyle = '#f4f4ee'; ctx.fillRect(t[0] - 0.4 * s, t[1] - 0.55 * s, 0.8 * s, 0.6 * s); if (s > 3) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.min(30, 0.36 * s) + 'px system-ui'; ctx.fillText(String(kk), t[0], t[1] - 0.15 * s); } } }); }
    }
    // ---- biển chạy chậm, công nhân, dây điện hỏng
    for (const zn of W.zones.concat(S.turnoutZones(T).map(z => ({ s0: z.s0, s1: z.s1, v: z.v, tA: -1e9, tB: 1e9 })))) {   // gồm biển tốc độ qua ghi vào/ra đường sân ga
      if (zn.hold || W.t > zn.tB || W.t < zn.tA - 1 || zn.v * 3.6 >= 284 || zn.s1 - zn.s0 > 5e8) continue;
      const num = Math.round(zn.v * 3.6 / 10) * 10;
      for (const [s, txt, col] of [[zn.s0, String(num), '#ffd23a'], [zn.s1, '解除', '#e8eef5']]) { const z = s - T.x; if (z < ZN || z > 1800) continue;
        items.push({ z, fn: () => { const X = 3.4, a = P(X, 3.3, z), b = P(X, 2.3, z), w = (b[1] - a[1]) * 1.25, bt = P(X, 0, z); ctx.strokeStyle = '#6b7f95'; ctx.lineWidth = Math.max(1, 0.1 * c.f / z); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(a[0] - w / 2, a[1], w, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.62 + 'px system-ui'; ctx.fillText(txt, a[0], b[1] - (b[1] - a[1]) * 0.22); } } }); }
    }
    for (const d of W.dead || []) {       // biển báo đoạn cách điện: dự báo (vàng) trước 500 m, 惰行 (xanh) ở đầu đoạn, 力行 (trắng) sau đoạn
      for (const [s, txt, col] of [[d.s0 - 500, '予告', '#ffd23a'], [d.s0, '惰行', '#2fbf71'], [d.s1 + 30, '力行', '#e8eef5']]) { const z = s - T.x; if (z < ZN || z > 2200) continue;
        items.push({ z, fn: () => { const X = 3.4, a = P(X, 3.3, z), b = P(X, 2.3, z), w = (b[1] - a[1]) * 1.25, bt = P(X, 0, z); ctx.strokeStyle = '#6b7f95'; ctx.lineWidth = Math.max(1, 0.1 * c.f / z); ctx.beginPath(); ctx.moveTo(bt[0], bt[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(a[0] - w / 2, a[1], w, b[1] - a[1]); if (b[1] - a[1] > 7) { ctx.fillStyle = '#10151c'; ctx.textAlign = 'center'; ctx.font = 'bold ' + (b[1] - a[1]) * 0.5 + 'px system-ui'; ctx.fillText(txt, a[0], b[1] - (b[1] - a[1]) * 0.27); } } }); }
    }
    const drawPost = (a, s, closing, flash) => {      // a = chân trụ trên màn hình, s = số pixel mỗi mét ở độ sâu đó; vẽ đối diện camera (hình chiếu thẳng) để thấy rõ biển và đèn
      const R = (x0, y0, x1, y1) => ctx.fillRect(a[0] + x0 * s, a[1] - y1 * s, (x1 - x0) * s, (y1 - y0) * s), H = 4.3, nStripe = 11, sh = H / nStripe;
      for (let i = 0; i < nStripe; i++) { ctx.fillStyle = i % 2 ? '#1b1b1b' : '#f0b81a'; R(-0.11, i * sh, 0.11, (i + 1) * sh); }      // thân trụ vàng - đen
      if (s < 5) { for (const lk of [0, 1]) { ctx.fillStyle = closing && (flash ^ lk) ? '#ff3a2a' : '#5a1818'; ctx.beginPath(); ctx.arc(a[0] + (lk ? 0.9 : -0.9) * s, a[1] - 3.75 * s, Math.max(1.2, 0.27 * s), 0, 7); ctx.fill(); } return; }      // ở xa chỉ cần trụ và hai đèn
      ctx.lineCap = 'butt'; ctx.lineWidth = 0.2 * s; for (const sg of [-1, 1]) { const x0 = -0.95 * s, y0 = sg * 0.35 * s; for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; ctx.strokeStyle = i % 2 ? '#16181b' : '#f0b81a'; ctx.beginPath(); ctx.moveTo(a[0] + x0 * (1 - 2 * t0), a[1] - 4.75 * s + y0 * (1 - 2 * t0)); ctx.lineTo(a[0] + x0 * (1 - 2 * t1), a[1] - 4.75 * s + y0 * (1 - 2 * t1)); ctx.stroke(); } }      // dấu X chéo vàng - đen trên đỉnh trụ
      ctx.fillStyle = '#16181b'; R(-1.0, 3.7, 1.0, 3.8);      // xà ngang
      for (const lk of [0, 1]) { const cx = a[0] + (lk ? 0.9 : -0.9) * s, cy = a[1] - 3.75 * s, lit = closing && (flash ^ lk);
        ctx.fillStyle = '#16181b'; ctx.beginPath(); ctx.arc(cx, cy, 0.4 * s, 0, 7); ctx.fill();      // vành đen quanh đèn
        if (lit) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1.1 * s); g.addColorStop(0, 'rgba(255,60,40,.55)'); g.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 1.1 * s, cy - 1.1 * s, 2.2 * s, 2.2 * s); }
        ctx.fillStyle = lit ? '#ff3b25' : '#4a1414'; ctx.beginPath(); ctx.arc(cx, cy, 0.27 * s, 0, 7); ctx.fill(); if (lit) { ctx.fillStyle = '#ffb09a'; ctx.beginPath(); ctx.arc(cx - 0.07 * s, cy - 0.07 * s, 0.08 * s, 0, 7); ctx.fill(); } }
      ctx.fillStyle = '#16181b'; R(0.22, 2.2, 1.55, 3.0);      // hộp mũi tên (hướng xe cộ): mũi tên xám trên, mũi tên vàng nhấp nháy dưới
      ctx.fillStyle = '#9aa0a6'; R(0.4, 2.76, 1.3, 2.8); ctx.fillStyle = closing && flash ? '#ffc21a' : '#6b560f'; R(0.4, 2.38, 1.3, 2.42);
      const cx = a[0], cy = a[1] - 1.2 * s, r = 0.62 * s, o = Math.SQRT1_2;      // biển bát giác 踏切注意: nền đen, bốn hình thoi vàng
      ctx.fillStyle = '#16181b'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const ang = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(cx + Math.cos(ang) * r / Math.cos(Math.PI / 8) * 0.96, cy + Math.sin(ang) * r / Math.cos(Math.PI / 8) * 0.96); } ctx.closePath(); ctx.fill();
      const dm = 0.26 * s, kx = [[-1, -1, '踏'], [1, -1, '切'], [-1, 1, '注'], [1, 1, '意']];
      for (const [qx, qy, ch] of kx) { const px = cx + qx * 0.27 * s, py = cy + qy * 0.27 * s; ctx.fillStyle = '#f0b81a'; ctx.beginPath(); ctx.moveTo(px, py - dm); ctx.lineTo(px + dm, py); ctx.lineTo(px, py + dm); ctx.lineTo(px - dm, py); ctx.closePath(); ctx.fill();
        if (s > 14) { ctx.fillStyle = '#16181b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + 0.27 * s + 'px system-ui'; ctx.fillText(ch, px, py + 0.01 * s); ctx.textBaseline = 'alphabetic'; } }
      if (s > 10) { ctx.fillStyle = '#16181b'; R(-0.5, 3.1, -0.12, 3.4); ctx.beginPath(); ctx.arc(a[0] - 0.55 * s, a[1] - 3.25 * s, 0.22 * s, 0, 7); ctx.fill(); }      // loa cảnh báo nhỏ
    };
    for (const g of W.xings || []) {       // đường ngang: mặt đường nhựa cắt qua ray, rào chắn hạ khi tàu tới gần, đèn đỏ nhấp nháy, xe kẹt và đèn tín hiệu đặc biệt (特殊信号発光機)
      const zc = g.s - T.x; if (zc < ZN - 6 || zc > 1800) continue; const closing = zc < 750 || g.blocked, flash = Math.floor(now / 450) % 2;
      items.push({ z: Math.max(zc, ZN + 0.5), fn: () => {
        strip(z => Math.min(oppAt(z), 0) - 3.6, z => Math.max(oppAt(z), 0) + 3.6, 0.03, zc - 3.2, zc + 3.2, mixc([22, 24, 28], [74, 76, 80], day * (1 - wx * 0.3)));
        railStrip(() => 0, zc - 3.2, zc + 3.2, false); if (Math.abs(oppAt(zc)) > 1) railStrip(oppAt, zc - 3.2, zc + 3.2, false);
        const xo = Math.min(oppAt(zc), 0) - 4.5, zz = Math.max(zc - 3.8, ZN + 0.2), sc = Math.max(1, c.f / Math.max(zz, 2));
        for (const Xp of [4.6, xo]) drawPost(P(Xp, 0, zz), sc, closing, flash);      // trụ đường ngang kiểu Nhật (踏切): trụ vàng-đen, xà ngang hai đèn đỏ tròn, hộp mũi tên, biển bát giác 踏切注意
        // thanh chắn: mỗi bên MỘT thanh, song song với ray (chạy dọc theo ray, chắn ngang lối vào đường bộ), vàng - đen; hạ ngang khi tàu tới (từ trụ gần tới đầu xa của đường bộ), dựng đứng khi chưa
        for (const Xp of [4.6, xo]) { const zA = Math.max(zc - 3.8, ZN + 0.2), zB = zc + 3.8, A = closing ? P(Xp, 1.1, zA) : P(Xp, 1.9, zA), B = closing ? P(Xp, 1.1, zB) : P(Xp, 3.9, zA), n = closing ? 8 : 4; ctx.lineWidth = Math.max(1.6, 0.18 * Math.max(1, c.f / Math.max(zA, 2)));
          for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; ctx.strokeStyle = i % 2 ? '#1c1c1c' : '#f2c21b'; ctx.beginPath(); ctx.moveTo(A[0] + (B[0] - A[0]) * t0, A[1] + (B[1] - A[1]) * t0); ctx.lineTo(A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1); ctx.stroke(); } }
        if (g.blocked) { const zq = Math.max(zc - 0.9, ZN + 0.3), a = P(-2.2, 0.25, zq), b = P(2.2, 0.25, zq), d = P(2.2, 1.5, zq), e = P(-2.2, 1.5, zq); quad(a, b, d, e, '#b3322d'); const w1 = P(-1.7, 0.95, zq), w2 = P(1.7, 0.95, zq), w3 = P(1.7, 1.4, zq), w4 = P(-1.7, 1.4, zq); quad(w1, w2, w3, w4, 'rgba(20,28,38,.85)'); }
      } });
      if (g.blocked && !g.hit) { const zl = g.s - 600 - T.x; if (zl > ZN && zl < 1800) items.push({ z: zl, fn: () => { const a = P(3.6, 0, zl), b = P(3.6, 4.2, zl), sc = Math.max(1, c.f / zl); ctx.strokeStyle = '#8c98a6'; ctx.lineWidth = Math.max(1, 0.15 * sc); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.fillStyle = flash ? 'rgba(255,40,30,1)' : 'rgba(120,20,20,1)'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(2, 0.5 * sc), 0, 7); ctx.fill(); if (flash) { ctx.fillStyle = 'rgba(255,60,40,.25)'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(6, 2.4 * sc), 0, 7); ctx.fill(); } } }); }
    }
    for (const wk of W.workers) { if (T.x > wk.s1 + 40) continue; for (let q = 0; q < 6; q++) { const z = wk.s0 + (wk.s1 - wk.s0) * (q / 5) - T.x; if (z < ZN || z > 1600) continue;
      items.push({ z, fn: () => { const X = 3.0 + (q % 2) * 0.9, s = Math.max(c.f / z, 5.5), a = P(X, 0, z); ctx.fillStyle = '#ff8c1a'; ctx.fillRect(a[0] - 0.24 * s, a[1] - 1.5 * s, 0.48 * s, 0.8 * s); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(a[0], a[1] - 1.68 * s, 0.17 * s, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#d9b99b'; ctx.fillRect(a[0] - 0.1 * s, a[1] - 1.7 * s, 0.2 * s, 0.1 * s); ctx.strokeStyle = '#1a2230'; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.beginPath(); ctx.moveTo(a[0] - 0.12 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] - 0.12 * s, a[1]); ctx.moveTo(a[0] + 0.12 * s, a[1] - 0.7 * s); ctx.lineTo(a[0] + 0.12 * s, a[1]); ctx.stroke(); if (q === 0 && Math.floor(now / 350) % 2) { ctx.fillStyle = 'rgba(255,60,30,.9)'; ctx.beginPath(); ctx.arc(a[0] + 0.6 * s, a[1] - 1.2 * s, 0.16 * s, 0, 7); ctx.fill(); } } }); } }
    for (const wr of W.wires || []) { const z = wr.s - T.x; if (W.t > wr.tB || z < ZN || z > 2000) continue; items.push({ z, fn: () => { const a = P(0, 5.2, z - 40), b = P(0, 5.2, z + 40), m = P(0, 1.4, z); ctx.strokeStyle = '#8a98a8'; ctx.lineWidth = Math.max(1, 1.6 * c.f / z * 0.3); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1] + 0.8 * c.f / z, b[0], b[1]); ctx.stroke(); if (Math.floor(now / 120) % 3) { ctx.fillStyle = '#ffd24a'; for (let i = 0; i < 7; i++) ctx.fillRect(m[0] + (Math.random() - 0.5) * 4 * c.f / z, m[1] + (Math.random() - 0.5) * 3 * c.f / z, 2, 2); } } }); }
    // ---- tàu: phía trước (mặt tàu), ngược chiều, và tàu vượt (dải nhìn ngang chiếu phối cảnh)
    const iconFor = key => { const k = SMAP[key] || 'n700'; const f = R.fronts && (R.fronts[k] || R.fronts[k === 'kamome' ? 'n700s' : 'e5']); return f && f.ready ? { img: f.img, k, len: S.VEH[key] ? S.VEH[key].len : 0 } : null; };
    // mặt đầu / đuôi tàu ướm theo hình dáng mũi tàu của ảnh nhìn ngang (noseOf): thay vì một tấm phẳng cỡ đầy đủ ở đầu mũi (thò ra khỏi đường nét mũi thon), dựng NOSE_N lớp ảnh mặt trước dọc chiều dài mũi, mỗi lớp thu theo chiều cao đường nét mũi tại chỗ đó
    const noseRows = (ns, ic, X, z, nz, xb) => { const Hm0 = 3.4 * ic.img.height / ic.img.width, fh = nz && nz.bodyR > 0 ? clamp(3.7 * nz.bodyR / Hm0, 0.6, 1.1) : 1, fw = (1 + fh) / 2, Hm = Hm0 * fh, dxw = Math.abs(X - c.lane) > 2.5 ? (c.lane > X ? 1 : -1) * Math.max(0, 1.85 - 1.7 * fw) : 0, rows = [],      // thân 2D được vẽ cao 3,7 m × bodyR; mặt trước co cho khớp chiều cao (chiều rộng co nửa mức để khỏi méo)
       Nn = ns.r.length - 1, depthOf = yf => { if (yf <= ns.r[0]) return 0; for (let q = 1; q <= Nn; q++) if (ns.r[q] >= yf) { const t = (yf - ns.r[q - 1]) / ((ns.r[q] - ns.r[q - 1]) || 1); return ns.NL * (q - 1 + t) / Nn; } return ns.NL; };
      const Xc = xb != null ? faceX(xb, c.lane, fw) : X + dxw, pts = []; for (let jr = 0; jr < NOSE_ROWS; jr++) { const yt = 1 - jr / NOSE_ROWS, yb = 1 - (jr + 1) / NOSE_ROWS, zs = z + NOSE_DEPTH * depthOf((yt + yb) / 2); pts.push({ zs, wf: Math.max(3.4 * fw * c.f / zs, 9), pt: P(Xc, 0.1 + Hm * yt, zs), pb: P(Xc, 0.1 + Hm * yb, zs) }); }
      for (let jr = 0; jr < NOSE_ROWS; jr++) { const q = pts[jr], nx = pts[jr + 1], bot = Math.max(q.pb[1], nx ? nx.pt[1] : 0) + 0.8; rows.push({ sy: ic.img.height * jr / NOSE_ROWS, sh: ic.img.height / NOSE_ROWS, x: q.pb[0] - q.wf / 2, y: q.pt[1], w: q.wf, h: Math.max(1, bot - q.pt[1]), z: q.zs }); }      // dải trên (sâu hơn) kéo xuống phủ khe hở với dải dưới (các dải ở độ sâu khác nhau nên mép trên/dưới không khớp)
      const byIdx = rows.slice(); rows.sort((p, q) => q.z - p.z); rows.byIdx = byIdx; return rows; };
    const drawFront = (ic, X, z, alpha, mode, xb, inner) => { let w = Math.max(3.4 * c.f / z, 9), h = w * ic.img.height / ic.img.width, a = P(xb != null ? faceX(xb, c.lane, 1) : X, 0.1, z); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = true;
      const nz = 3.4 * c.f / z > 24 ? noseOf(R.sprites && R.sprites[ic.k], ic.len) : null, ns = nz && ((inner || mode) === 'tail' ? nz.tail : nz.head);
      if (inner && !ns) return;      // mặt ở chỗ nối giữa hai toa đầu của đoàn ghép: chỉ vẽ khi đủ gần để dựng được mũi vát, ở xa bỏ qua (không vẽ tấm phẳng)
      ctx.globalAlpha = alpha == null ? 1 : alpha; let lampAt = (fx, fy) => [a[0] - w / 2 + fx * w, a[1] - h + fy * h]; if (ns) { const rows = noseRows(ns, ic, X, z, nz, xb), bi = rows.byIdx; for (const q of rows) ctx.drawImage(ic.img, 0, q.sy, ic.img.width, q.sh, q.x, q.y, q.w, q.h); w = bi[NOSE_ROWS >> 1].w; lampAt = (fx, fy) => { const jr = Math.max(0, Math.min(NOSE_ROWS - 1, Math.floor(fy * NOSE_ROWS))), q = bi[jr]; return [q.x + fx * q.w, q.y + (fy * NOSE_ROWS - jr) * q.h]; }; }      // mặt trước cắt thành các dải ngang, dải càng cao càng lùi sâu vào thân theo đường nét mũi: mặt nghiêng ra sau như kính chắn gió, không còn tấm phẳng thò ra khỏi mũi; đèn đặt theo mặt phẳng ở đầu mũi
      else ctx.drawImage(ic.img, a[0] - w / 2, a[1] - h, w, h); ctx.globalAlpha = 1; if (mode && LAMPS[ic.k]) { const Lp = LAMPS[ic.k], dk = clamp(night * 0.9 + (zExit !== null ? 0.9 : 0) + wx * 0.5, 0, 1), r = Math.max(1.1, w * 0.032), lvl = mode === 'tail' ? 0.55 + 0.45 * dk : dk; if (lvl > 0.05) for (const fx of [Lp[0], Lp[1]]) { const pp = lampAt(fx, Lp[2]), lx = pp[0], ly = pp[1], gr = r * (mode === 'tail' ? 1.6 + 3.2 * dk : 3 + 4 * dk), g = ctx.createRadialGradient(lx, ly, 0, lx, ly, gr); const col = mode === 'tail' ? '255,40,30' : '255,244,200'; g.addColorStop(0, 'rgba(' + col + ',' + Math.min(1, 0.95 * lvl) + ')'); g.addColorStop(0.35, 'rgba(' + col + ',' + 0.45 * lvl + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(lx - gr, ly - gr, gr * 2, gr * 2); } } };
    const Ld = W.lead;
    if (Ld && Ld.phase !== 'end') { const tail = Ld.x - Ld.veh.len - T.x, ic = iconFor(Ld.veh.key); if (tail > ZN && tail < 6000) { /* tàu phía trước đỗ ở đường dừng KHÁC của ta nếu ga có từ 2 đường dừng */ const qL = Ld.phase === 'dwell' ? sts.find(q => Math.abs(q.m.s - Ld.x) < 60) : null, other = qL && qL.st.tracks.find(t => t.own && !t.thr && t !== qL.st.ours && qL.st.stops.includes(t)), X = qL ? (other ? other : qL.st.ours).x : (Ld.fj !== undefined ? S.trunkOff(W, Ld.x - Ld.veh.len / 2, Ld.fj) + S.leadDelta(W) : 0) + mainX(tail);      items.push({ z: tail, fn: () => { if (ic) drawFront(ic, X, tail, fadeA(tail), 'tail'); else { const w = 3.4 * c.f / tail, a = P(X, 0.1, tail); ctx.fillStyle = '#d8dee6'; ctx.fillRect(a[0] - w / 2, a[1] - w * 1.1, w, w * 1.1); } if (Ld.phase === 'run') { const a = P(X, 1.1, tail), w = 3.4 * c.f / tail; ctx.fillStyle = 'rgba(255,40,30,.95)'; ctx.beginPath(); ctx.arc(a[0] - w * 0.3, a[1], Math.max(1, w * 0.04), 0, 7); ctx.arc(a[0] + w * 0.3, a[1], Math.max(1, w * 0.04), 0, 7); ctx.fill(); } } }); } }
    { const ob = W.obs; if (ob && ob.key && !ob.dw && S.VEH[ob.key]) { const ov = S.VEH[ob.key], tail = ob.x + ob.v * (W.t - ob.t) - ov.len - T.x, ic = iconFor(ov.parts ? ov.parts[ov.parts.length - 1] : ob.key); if (tail > ZN && tail < 6000) items.push({ z: tail, fn: () => { if (ic) drawFront(ic, mainX(tail), tail, fadeA(tail), 'tail'); else { const w = 3.4 * c.f / tail, a = P(mainX(tail), 0.1, tail); ctx.fillStyle = '#d8dee6'; ctx.fillRect(a[0] - w / 2, a[1] - w * 1.1, w, w * 1.1); } } }); } }      // tàu cùng chiều chạy/dừng phía trước (vật cản ATC): thấy đuôi nó
    const ricon = iconFor(W.line.meta.defVeh);
    // vẽ thân tàu bằng các lát ảnh nhìn ngang chiếu phối cảnh. sign=-1: thân kéo về phía sau mũi (tàu vượt); sign=+1: thân kéo ra xa mũi (tàu ngược chiều)
    const WL = root.WinLit, winLv = WL ? WL.level(night, zExit !== null, wx) : 0;      // ô cửa sổ tàu sáng đèn khi tối / trong hầm / mưa tuyết dày
    const glowAt = (X, Y, Z, rgb, r, al) => { if (Z < ZN || Z > 1500 || al < 0.03) return; const a = P(X, Y, Z), gr = Math.max(2.5, r * c.f / Z), g = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], gr); g.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(1, al) + ')'); g.addColorStop(0.4, 'rgba(' + rgb + ',' + 0.4 * al + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(a[0] - gr, a[1] - gr, gr * 2, gr * 2); };
    const slices = (sp, lenM, zRef, fxp0, sign) => {
      const fxp = typeof fxp0 === 'function' ? fxp0 : () => fxp0;      // vị trí ngang của thân tàu: số cố định, hoặc hàm theo z (tàu đang vào/ra đường ga qua ghi thì lệch ngang dần)
      if (!sp || !sp.ready) return; const m = sp.meta, xrel = Math.max(0.5, Math.abs(fxp(Math.max(zRef, 1)) - c.lane)), lo = sign < 0 ? Math.max(zRef - lenM, ZN) : Math.max(zRef, ZN), hi = sign < 0 ? zRef : zRef + lenM; if (hi <= lo) return;
      const tOf = z => sign < 0 ? (zRef - z) / lenM : (z - zRef) / lenM;           // 0 ở mũi tàu, 1 ở đuôi
      let z = lo, n = 0;
      while (z < hi && n++ < 700) {
        const dz = clamp(z * z * 3 / (c.f * xrel), 0.04, 8), z2 = Math.min(hi, z + dz), zm = (z + z2) / 2, xa = P(fxp(z), 0, z)[0], xb = P(fxp(z2), 0, z2)[0];   // lát mảnh ≤ ~3 px nên thân tàu liền một khối, không bậc thang
        const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
        if (x1 > px - 40 && x0 < px + pw + 40) { const s0 = (1 - tOf(z)) * m.width, s1 = (1 - tOf(z2)) * m.width, sx = Math.min(s0, s1), sw = Math.max(0.5, Math.abs(s1 - s0)), hgt = c.f * 3.7 / zm, a0 = P(fxp(zm), 0.1, zm); ctx.fillStyle = 'rgba(30,35,42,.96)'; ctx.fillRect(x0, a0[1] - hgt * 0.27, x1 - x0 + 0.8, hgt * 0.25); ctx.drawImage(sp.img, sx, 0, Math.min(sw, m.width - sx), m.height, x0, a0[1] - hgt, x1 - x0 + 0.8, hgt);
          if (winLv > 0.06 && WL) { const ex = Math.min(sx + sw, m.width), ddx = (x1 - x0 + 0.8) / Math.max(0.5, Math.min(sw, m.width - sx)), top0 = a0[1] - hgt; WL.overlap(WL.get(sp), sx, ex, (wa, wb, ya, yb, id) => { const ax = Math.max(wa, sx), bx = Math.min(wb, ex); ctx.fillStyle = WL.fill(id, winLv); ctx.fillRect(x0 + (ax - sx) * ddx, top0 + ya / m.height * hgt, (bx - ax) * ddx + 0.5, (yb - ya) / m.height * hgt); }); } }      // gầm tàu đặc (tối): ảnh có khe hở giữa các bánh nên nếu không chèn thì thấy tà vẹt/ray của đường đó xuyen qua thân
        z = z2;
      }
    };
    if ((T.v > 20 || W.oppCat) && !S.oppHidden(W, T)) for (const t0 of W.opposing || []) { const VR = 200, zN = (t0 - W.t) * VR, key = S.oppKey(W, T, t0), veh = S.VEH[key] || S.VEH.N700; if (zN > 900 || zN < -veh.len - 20) continue;
      const fxp = fxOpp(zN), oic = iconFor(veh.parts ? veh.parts[0] : key);
      items.push({ z: Math.max(zN, ZN + 1), fn: () => { if (zN > ZN && oic) drawFront(oic, oppAt(zN), zN, 1, 'head'); if (zN < 60) slicesVeh(veh, zN, fxp, 1); const u = 1 - Math.abs(zN) / 400; if (u > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.1 * u + ')'; ctx.fillRect(px, py, pw, ph); } } }); }
    // tàu ngược chiều bị giữ (động đất, mưa gió) dừng giữa hai ga: đứng yên trên đường ngược chiều
    for (const h of W.heldOpp || []) { const veh = S.VEH[h.key] || S.VEH.N700, zNf = h.sC - veh.len / 2 - T.x, fxp = fxOpp(zNf);
      { if (zNf > 3000 || zNf < -veh.len - 20) continue; const oic = iconFor(veh.parts ? veh.parts[0] : h.key); items.push({ z: Math.max(zNf, ZN + 1), fn: () => { if (zNf > ZN && oic) drawFront(oic, oppAt(zNf), zNf, fadeA(zNf), 'head'); if (zNf < 60) slicesVeh(veh, zNf, fxp, 1, false); } }); }
       }
    function slicesVeh(veh, zRef, fxp, sign, mv) {      // đoàn ghép: vẽ lần lượt từng đoàn, đoàn sau cách đoàn trước một khe nối
      if (!veh.parts) { slices(R.sprites && R.sprites[SMAP[veh.key] || 'n700'], veh.len, zRef, fxp, sign); return; }
      { const fx = z => typeof fxp === 'function' ? fxp(z) : fxp; let o2 = 0;      // chỗ nối hai đoàn: mũi của đoàn phía xa (quay mặt về camera) lộ ra trong khe giữa hai thân; vẽ trước thân để thân đoàn gần phủ lên
        veh.parts.forEach((pk, i) => { const pv = S.VEH[pk]; if (i < veh.parts.length - 1) { const nk = veh.parts[i + 1], nv = S.VEH[nk];
            if (sign > 0) { const zt = zRef + o2 + pv.len + veh.gap; if (zt > ZN) { const ic2 = iconFor(nk); if (ic2) drawFront(ic2, fx(zt), zt, 1, undefined, fx(zt), 'head'); } }      // tàu hướng đầu về camera: đầu của đoàn sau hiện sau đuôi đoàn trước
            else { const zt = zRef - o2 - pv.len; if (zt > ZN) { const ic2 = iconFor(pk); if (ic2) drawFront(ic2, fx(zt), zt, 1, undefined, fx(zt), 'tail'); } } }      // tàu hướng đuôi về camera: đuôi của đoàn trước (xa) hiện sau đầu đoàn sau
          o2 += pv.len + veh.gap; }); }
      let off = 0; for (const pk of veh.parts) { const pv = S.VEH[pk]; slices(R.sprites && R.sprites[SMAP[pk] || 'n700'], pv.len, zRef + sign * -1 * 0 + (sign < 0 ? -off : off), fxp, sign); off += pv.len + veh.gap; }
      if (winLv > 0.08) { const zT = zRef + sign * veh.len, mvF = mv === false ? 0.45 : 1, fx = z => typeof fxp === 'function' ? fxp(z) : fxp; glowAt(fx(zRef), 1.1, zRef, '255,246,215', 1.3 + 1.2 * winLv, 0.9 * winLv * mvF); glowAt(fx(zT) - 0.4, 1.1, zT, '255,40,30', 0.6, 0.55 + 0.45 * winLv); glowAt(fx(zT) + 0.4, 1.1, zT, '255,40,30', 0.6, 0.55 + 0.45 * winLv); }      // đèn pha dịu ở đầu (tàu đang đứng chỉ còn đèn nhận dạng), hai đèn đuôi đỏ ở cuối
    }
    // đoàn Tohoku đang chờ ở sân ga (phía trước, cùng đường): thấy đuôi nó; phần đã tách ở lại thì nằm sau lưng
    for (const pk of W.parked || []) { const pv = S.VEH[pk.key], tail0 = pk.front - pv.len - T.x, tail = Math.max(tail0, 8); if (pk.kind !== 'wait' || tail0 < 0 || tail0 > 4000) continue;
      const qL = sts.find(q => Math.abs(q.m.s - pk.front) < 400), X = (pk.own ? c.lane : qL ? qL.st.ours.x : 0) + (pk.jn !== undefined ? S.trunkOff(W, pk.front - pv.len, pk.jn) + S.branchLane0(W, pk.jn) : 0), pic = iconFor(pk.key);
      items.push({ z: tail, fn: () => { if (pic) drawFront(pic, X, tail, fadeA(tail), 'tail'); else { const w = 3.4 * c.f / tail, a = P(X, 0.1, tail); ctx.fillStyle = '#d8dee6'; ctx.fillRect(a[0] - w / 2, a[1] - w * 1.1, w, w * 1.1); } } }); }
    for (const sb of W.stabled || []) { const veh = S.VEH[sb.key], hi = sb.front - T.x, lo = hi - veh.len; if (lo > 1700 || hi < -20) continue; const tk = sb.track, qs = sts.find(q => q.i === sb.i), X = qs && tk.in0 !== undefined ? (z => tk.plain + (tk.x - tk.plain) * trackWF(tk, T.x + z, qs.m.s)) : tk.x, headHi = sb.face === 1;      // đường ga nhánh: lệch ngang dần theo ghi (không đi thẳng vào đường dừng)       // tàu đỗ ở đường phụ của ga: đầu tàu (đoàn thứ nhất) ở đầu cao nếu quay theo chiều chạy, ở đầu thấp nếu quay ngược
      const fic = iconFor(veh.parts ? (headHi ? veh.parts[veh.parts.length - 1] : veh.parts[0]) : sb.key);      // đầu gần camera (thấp) của tàu đỗ: quay cùng chiều ta thì ta thấy ĐUÔI của nó, quay ngược chiều thì thấy ĐẦU; vẽ cả lúc đang vào ga / đang rời ga (sb.front di chuyển)
      items.push({ z: Math.max(lo, ZN + 1), fn: () => { if (lo > ZN && fic) { const Xv = typeof X === 'function' ? X(lo) : X; drawFront(fic, Xv, lo, 1, headHi ? 'tail' : 'head', Xv); } headHi ? slicesVeh(veh, hi, X, -1, false) : slicesVeh(veh, lo, X, 1, false); } }); }
    const pl = T.phase === 'dwell' ? S.passersAt(W, T.k) : null;
    if (pl) for (const p of pl) { const pd = S.passDur(W, T.k, (S.VEH[p.v || W.line.meta.defVeh] || S.VEH.N700).len), u = (W.t - (p.t - pd / 2)) / pd; if (u > 0 && u < 1) { const key = p.v || (W.line.meta.defVeh), veh = S.VEH[key] || S.VEH.N700, sp = R.sprites && R.sprites[SMAP[key] || 'n700'], fxp = 0 + (c.lane > 0 ? 1.85 : -1.85);
      const zFront = -veh.len + u * (veh.len + 520), fic = iconFor(veh.parts ? veh.parts[veh.parts.length - 1] : key), zT = zFront - veh.len;      // mặt đuôi: tàu đã vượt lên phía trước
      items.push({ z: Math.max(zFront, ZN + 2), fn: () => { slices(sp, veh.len, zFront, fxp, -1); if (zT > ZN && fic) drawFront(fic, 0, zT, 1, 'tail'); } }); } }

    // tàu ngược chiều chạy thông qua ga ta đang đỗ: lao qua đường thông qua phía ngược chiều 
    if (T.phase === 'dwell') for (const o of W.oppThru || []) { const key = o.v || W.line.meta.defVeh, veh = S.VEH[key] || S.VEH.N700, pd = S.oppThruDur(W, T.k, veh.len), u = (W.t - (o.t - pd / 2)) / pd; if (u <= 0 || u >= 1) continue;
      const qk = sts.find(q => q.m.i === T.M[T.k].i), thr = qk && qk.st.tracks.find(t => !t.own && (t.thr || t.main)); if (!thr) continue; const X = thr.x, fxp = X + (c.lane > X ? 1.85 : -1.85), zF = S.oppThruZ(u, veh.len);
      { if (zF > 900 || zF < -veh.len - 20) continue; const oic = iconFor(veh.parts ? veh.parts[0] : key); items.push({ z: Math.max(zF, ZN + 1), fn: () => { if (zF > ZN && oic) drawFront(oic, X, zF, 1, 'head'); if (zF < 60) slicesVeh(veh, zF, fxp, 1); } }); }
       }
    // phong cảnh bên ngoài hầm, nhìn qua cửa ra (vẽ sau cùng nhưng chỉ trong khung cửa ra, đè lên tường hầm tối)
    if (zExit !== null && outItems.length) { const op = openingPoly(); if (op) { ctx.save(); polyPath(op); ctx.clip(); outItems.sort((a, b) => b.z - a.z); for (const it of outItems) it.fn(); ctx.restore(); } }
    // ---- vẽ các vật theo thứ tự xa → gần
    items.sort((a, b) => b.z - a.z);
    for (const it of items) { if (it.z < ZN || it.z > zLim) continue; it.fn(); }

    // ---- cửa hầm phía trước: mặt cửa (toà nhà ở đô thị / sườn đồi), khung cửa chữ nhật hoặc vòm, nhìn thấy ray, đèn trần và sân ga ngầm bên trong
    if (entryZ !== null) {
      const ent = entryZ, urbanEnt = biomeAt(ent) === 'urban', stIn = sts.filter(q => q.d > ent - 50 && q.d < ent + 700), wide = urbanEnt || stIn.length > 0;
      const ex0 = Math.min(Math.min(0, ADJ) - 3.6, ...stIn.map(q => q.st.extent[0] - 0.8)), ex1 = Math.max(Math.max(0, ADJ) + 3.6, ...stIn.map(q => q.st.extent[1] + 0.8)), xc0 = (ex0 + ex1) / 2, hw = (ex1 - ex0) / 2;
      const poly = [], hOpen = wide ? 8.0 : 7.4, rOpen = wide ? 1.4 : 1.8;      // cửa hầm: ô chữ nhật bo góc (không còn vòm tròn)
      for (const [x, y] of [[ex1, 0], [ex1, hOpen - rOpen]]) poly.push(P(x, y, ent)); for (let i = 1; i <= 6; i++) { const a = Math.PI / 2 * i / 6; poly.push(P(ex1 - rOpen + Math.cos(a) * rOpen, hOpen - rOpen + Math.sin(a) * rOpen, ent)); } for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / 6; poly.push(P(ex0 + rOpen + Math.cos(a) * rOpen, hOpen - rOpen + Math.sin(a) * rOpen, ent)); } poly.push(P(ex0, 0, ent));
      // mặt cửa
      if (urbanEnt || stIn.length) {          // toà nhà bê tông nhiều tầng có cửa sổ, ban công, mái, biển hiệu; cửa hầm là ô chữ nhật ở tầng trệt
        for (let xa = -78, ci = 0; xa < 78; xa += 12, ci++) { const hh = (xa + 12 > ex0 - 6 && xa < ex1 + 6) ? 20 + hash(ci * 5 + 1) * 8 : 9 + hash(ci * 7 + Math.floor(ent / 50)) * 26, tone = hash(ci * 11 + 3), bc = mixc([22 + tone * 14, 26 + tone * 12, 34 + tone * 10], [130 + tone * 40, 134 + tone * 34, 142 + tone * 30], day * (1 - wx * 0.35));
          const A = P(xa, 0, ent), B = P(xa + 12, 0, ent), C = P(xa + 12, hh, ent), Dp = P(xa, hh, ent); quad(A, B, C, Dp, bc);
          const edgeC = mixc([14, 16, 22], [96, 100, 110], day * (1 - wx * 0.35)); quad(P(xa, hh, ent), P(xa + 12, hh, ent), P(xa + 12, hh + 0.7, ent), P(xa, hh + 0.7, ent), edgeC);               // mái / gờ trên
          if (hash(ci * 13 + 5) < 0.4) quad(P(xa + 3, hh + 0.7, ent), P(xa + 8, hh + 0.7, ent), P(xa + 8, hh + 2.6, ent), P(xa + 3, hh + 2.6, ent), edgeC);                                    // bồn nước / cầu thang mái
          for (let wy = 3.4, row = 0; wy < hh - 1.6; wy += 3.3, row++) for (let wx_ = xa + 1.2; wx_ < xa + 11; wx_ += 3.4) { if (Math.abs(wx_ - xc0) < hw + 1 && wy < 8.6) continue; const lit = night > 0.35 ? hash(ci * 97 + row * 17 + Math.floor(wx_)) < 0.5 : false, wc = lit ? 'rgba(255,224,130,.92)' : mixc([16, 24, 38], [92, 126, 160], day * (1 - wx * 0.4));
            quad(P(wx_, wy, ent), P(wx_ + 2.0, wy, ent), P(wx_ + 2.0, wy + 1.7, ent), P(wx_, wy + 1.7, ent), wc); if (!lit && row % 2 === 0) quad(P(wx_ - 0.1, wy - 0.18, ent), P(wx_ + 2.1, wy - 0.18, ent), P(wx_ + 2.1, wy, ent), P(wx_ - 0.1, wy, ent), edgeC); }           // cửa sổ + bệ cửa
          if (hh > 16) for (let wy = 6.7; wy < hh - 2; wy += 6.6) quad(P(xa, wy, ent), P(xa + 12, wy, ent), P(xa + 12, wy + 0.3, ent), P(xa, wy + 0.3, ent), edgeC);                                 // dải ban công
        }
        // biển ga / khung viền quanh cửa
        quad(P(ex0 - 1.2, hOpen, ent), P(ex1 + 1.2, hOpen, ent), P(ex1 + 1.2, hOpen + 1.4, ent), P(ex0 - 1.2, hOpen + 1.4, ent), mixc([30, 40, 52], [150, 158, 170], day * (1 - wx * 0.3)));
      } else {                                // sườn đồi: gò xanh quanh cửa vòm
        const hc = mixc([14, 24, 18], [52, 84, 56], day * (1 - wx * 0.3)), hl = P(xc0 - hw, 0, ent), hr = P(xc0 + hw, 0, ent), ht = P(xc0, 8.0, ent), ww = Math.abs(hr[0] - hl[0]), hhh = hl[1] - ht[1];
        ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(ht[0], hl[1], ww * 2.4, hhh * 1.9, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        { const hw2 = hw + 1.0, h2 = hOpen + 1.0, r2 = rOpen + 0.8; ctx.fillStyle = '#707a86'; ctx.beginPath(); const q0 = P(xc0 + hw2, 0, ent); ctx.moveTo(q0[0], q0[1]); const q1 = P(xc0 + hw2, h2 - r2, ent); ctx.lineTo(q1[0], q1[1]); for (let i = 1; i <= 6; i++) { const a = Math.PI / 2 * i / 6, q = P(xc0 + hw2 - r2 + Math.cos(a) * r2, h2 - r2 + Math.sin(a) * r2, ent); ctx.lineTo(q[0], q[1]); } for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / 6, q = P(xc0 - hw2 + r2 + Math.cos(a) * r2, h2 - r2 + Math.sin(a) * r2, ent); ctx.lineTo(q[0], q[1]); } const q2 = P(xc0 - hw2, 0, ent); ctx.lineTo(q2[0], q2[1]); ctx.closePath(); ctx.fill(); }
      }
      // bên trong cửa
      ctx.save(); ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.clip();
      const ig = ctx.createLinearGradient(0, py, 0, py + ph); ig.addColorStop(0, '#1c2128'); ig.addColorStop(0.5, '#0a0d11'); ig.addColorStop(1, '#161b22'); ctx.fillStyle = ig; ctx.fillRect(px - 60, py - 60, pw + 120, ph + 120);
      const zEndIn = Math.min(ZF, entryEnd, ent + 900);
      for (const sgn of [-1, 1]) for (let k = Math.ceil((T.x + ent) / 18), z = k * 18 - T.x; z < Math.min(ent + 500, zEndIn); k++, z = k * 18 - T.x) { if (biomeAt(z) !== 'urban' && !sts.some(q => Math.abs(z - q.d) < 600)) continue; const a = P(sgn * 2.9, 6.3, z), r = Math.max(1.2, 0.18 * c.f / z), gl = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], r * 4); gl.addColorStop(0, 'rgba(255,236,170,.9)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gl; ctx.fillRect(a[0] - r * 4, a[1] - r * 4, r * 8, r * 8); }
      zMin = ent; zLim = zEndIn; drawTracks(ent); ctx.strokeStyle = 'rgba(40,52,66,.9)'; ctx.lineWidth = 1.2; wire(() => 0, ent, zLim); wire(oppAt, ent, zLim);
      sink = []; drawStations(); sink.sort((a, b) => b.z - a.z); for (const it of sink) if (it.z >= zMin && it.z <= zLim) it.fn();
      zMin = ZN; zLim = ZF; sink = items; ctx.restore();
      // viền khung cửa
      ctx.strokeStyle = mixc([40, 46, 56], [150, 156, 166], day * (1 - wx * 0.3)); ctx.lineWidth = Math.max(2, 0.45 * c.f / ent); ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();                                  // hết phần nghiêng theo đường cong

    // ---- hiệu ứng thời tiết, ban đêm, tốc độ
    if (night > 0.35 && zExit === null) { ctx.fillStyle = 'rgba(4,8,20,' + (0.42 * night * (1 - lightLvl * 0.15)) + ')'; ctx.fillRect(px, py, pw, ph); }
    const noW = zExit !== null;      // trong hầm: không mưa, tuyết, gió, sét
    if (!noW && (rain || (wx > 0 && !inSnow))) { ctx.fillStyle = 'rgba(120,135,150,.12)'; ctx.fillRect(px, py, pw, ph); }
    if (rain && !noW) { ctx.strokeStyle = 'rgba(190,210,245,.5)'; ctx.lineWidth = 1; const tt = now / 14; ctx.beginPath(); for (let q = 0; q < 110; q++) { const rx = px + ((q * 83 + tt * (1.5 + v / 40)) % pw), ry = py + ((q * 47 + tt * 9) % ph); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 - v / 12, ry + 10 + v / 8); } ctx.stroke(); }
    if (inSnow && !noW) { ctx.fillStyle = 'rgba(245,250,255,.85)'; const tt = now / 25; ctx.beginPath(); for (let q = 0; q < 130; q++) { const rx = px + ((q * 61 + tt * (1.2 + (q % 3) * 0.5) + Math.sin(tt / 9 + q) * 8) % pw), ry = py + ((q * 37 + tt * (1.5 + (q % 4) * 0.6)) % ph); ctx.rect(rx, ry, 2 + (q % 3 === 0), 2 + (q % 3 === 0)); } ctx.fill(); }
    if (windy && !noW) { ctx.strokeStyle = 'rgba(210,225,240,.3)'; ctx.lineWidth = 1; const tt = now / 6; ctx.beginPath(); for (let q = 0; q < 12; q++) { const ry = py + 20 + (q * 31) % (ph * 0.55), rx = px + pw - ((q * 131 + tt * (2 + q % 3)) % (pw + 80)); ctx.moveTo(rx, ry); ctx.lineTo(rx + 40, ry + Math.sin(tt / 40 + q) * 2); } ctx.stroke(); }
    if (v > 60 && zExit === null) { ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.12, (v - 60) / 400) + ')'; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 0; q < 24; q++) { const ang = hash(q * 17) * Math.PI * 2, r0 = ph * (0.45 + 0.3 * ((now / 220 + q * 0.37) % 1)), r1 = r0 + 30; ctx.moveTo(c.cx + Math.cos(ang) * r0 * 1.6, c.hy + Math.sin(ang) * r0 * 0.5); ctx.lineTo(c.cx + Math.cos(ang) * r1 * 1.6, c.hy + Math.sin(ang) * r1 * 0.5); } ctx.stroke(); }
    if (!noW && R.aud && R.aud.lastThunder) { const dt = now - R.aud.lastThunder; const fl = (dt < 90 ? 1 : 0) + (dt > 220 && dt < 300 ? 0.7 : 0); if (fl > 0) { ctx.fillStyle = 'rgba(235,240,255,' + 0.55 * fl + ')'; ctx.fillRect(px, py, pw, ph); } }
    if (T.cut) { ctx.fillStyle = 'rgba(154,90,214,.18)'; ctx.fillRect(px, py, pw, ph); }
    // kính chắn gió: giọt nước, gạt mưa, mờ khi chưa bật gạt mưa
    // hạt mưa trên kính (trạng thái riêng cho kính trước / kính sau, toạ độ 0..1 của khung): mưa thì sinh thêm (kính trước dày hơn kính sau), hạt lớn chảy xuống chậm, hết mưa thì khô dần; cần gạt nước quét tới đâu hạt mưa ở đó biến mất
    { const GL = root._glass || (root._glass = [{ d: [], t: 0, ap: null }, { d: [], t: 0, ap: null }]), G = GL[0], dt = Math.max(0, Math.min(0.1, (now - G.t) / 1000)); G.t = now;
      if (rain && !noW) { const cap = 170, rate = 26 * dt; let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0); while (n-- > 0 && G.d.length < cap) G.d.push({ u: Math.random(), v: Math.random() * 0.95, r: 1.4 + Math.random() * Math.random() * 3.6 }); }
      else if (!rain && !noW && dt > 0) { const k = dt * 0.06; G.d = G.d.filter(() => Math.random() > k); }
      for (const q of G.d) if (q.r > 2.8) q.v += dt * 0.012 * (q.r - 2.8);
      if (T.wiper) { const a = Math.sin(now / 280) * 0.95 - 0.1, ok = G.ap !== null && Math.abs(a - G.ap) < 1, lo = (ok ? Math.min(a, G.ap) : a) - 0.03, hi = (ok ? Math.max(a, G.ap) : a) + 0.03, L = ph * 0.85 + 4; G.ap = a;
        if (G.d.length) G.d = G.d.filter(q => { const x = q.u * pw, y = q.v * ph; for (const pvx of [pw * 0.3, pw * 0.62]) { const dx = x - pvx, dy = ph - y; if (Math.hypot(dx, dy) <= L) { const p = Math.atan2(dx, dy); if (p >= lo && p <= hi) return false; } } return q.v < 1.02; }); }
      else { G.ap = null; if (G.d.length && G.d.some(q => q.v >= 1.02)) G.d = G.d.filter(q => q.v < 1.02); }
      if (G.d.length) { const sc = clamp(pw / 1100, 0.45, 1.3); ctx.fillStyle = 'rgba(165,190,225,' + (0.13 * Math.min(1, G.d.length / 120)).toFixed(3) + ')'; ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = 'rgba(205,222,248,.32)'; ctx.beginPath(); for (const q of G.d) { const x = px + q.u * pw, y = py + q.v * ph, r = q.r * sc + 0.6; ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r * 1.15, 0, 0, 7); } ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); for (const q of G.d) { const r = q.r * sc + 0.6, hr = Math.max(0.6, r * 0.3), x = px + q.u * pw - r * 0.35, y = py + q.v * ph - r * 0.4; ctx.moveTo(x + hr, y); ctx.arc(x, y, hr, 0, 7); } ctx.fill(); } }
    if (T.wiper) { for (const [pvx, ph0] of [[px + pw * 0.3, py + ph], [px + pw * 0.62, py + ph]]) { const a = Math.sin(now / 280) * 0.95 - 0.1; ctx.strokeStyle = 'rgba(15,18,24,.92)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(pvx, ph0); ctx.lineTo(pvx + Math.sin(a) * ph * 0.85, ph0 - Math.cos(a) * ph * 0.85); ctx.stroke(); } }
    // khung buồng lái (viền hai bên và phía trên; bảng điều khiển thật nằm ngay bên dưới nên không còn dải đen mờ ở đáy)
    ctx.fillStyle = '#05070a'; ctx.fillRect(px, py, 5, ph); ctx.fillRect(px + pw - 5, py, 5, ph); ctx.fillRect(px, py, pw, 3);
    { const swAt = W.cabSwitchAt, u = swAt !== undefined ? 1 - (W.t - swAt) / 1.8 : 0; if (u > 0 && u <= 1) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, u * 1.3) + ')'; ctx.fillRect(px, py, pw, ph); } }       // chuyển buồng lái sau khi ghép: màn đen mờ dần
    ctx.restore();
  }

  // ---- nhà cửa kiểu Nhật: nhà ở 2 tầng mái ngói thấp, chung cư (mansion) nhiều tầng có dải ban công, toà văn phòng nhỏ, nhà kho tôn, đền chùa
  const WALLS = [[236, 230, 216], [222, 216, 202], [208, 203, 194], [243, 241, 235], [199, 208, 198], [224, 208, 186], [214, 196, 176]];
  const ROOFS = [[72, 78, 88], [92, 88, 84], [62, 68, 84], [108, 76, 60], [76, 94, 100], [84, 66, 62]];
  function drawJP(ctx, c, o, X, z, day, wx, night, quad, P) {
    const t = day * (1 - wx * 0.4), M = (col, k) => { const dk = col.map(v => v * (k || 1)); return mixc(dk.map(v => v * 0.13), dk, t); };
    const tone = o.tone, ty = o.t || 0, lev = o.lev || (ty === 1 ? 4 : 2), mansion = (ty === 1 || ty === 0) && lev >= 3, w = o.w, d = o.d, x0 = X - w / 2, x1 = X + w / 2, za = z, zb = z + d, xin = X > 0 ? x0 : x1, near = z < 230;
    let wall = ty === 1 ? (tone < 0.4 ? [188, 198, 210] : [226, 222, 212]) : ty === 2 ? [168, 172, 170] : ty === 3 ? [150, 158, 150] : ty === 4 ? [236, 230, 220] : WALLS[Math.floor(tone * 997) % WALLS.length];
    const roof = ty === 4 ? [48, 52, 58] : ty === 3 ? [118, 128, 134] : ty === 2 ? [140, 146, 150] : ROOFS[Math.floor(tone * 1531) % ROOFS.length];
    const flat = mansion || ty === 1 || ty === 2, h = flat ? (ty === 2 ? Math.min(o.h, 9) : Math.max(o.h, 6)) : Math.max(5.2, Math.min(o.h, 7)), wallC = M(wall), sideC = M(wall, 0.82), topC = M(wall, 0.94);
    // thân nhà: mặt bên hướng đường ray, mặt trước, mặt trên (mái bằng) hoặc mái dốc
    quad(P(xin, 0, za), P(xin, 0, zb), P(xin, h, zb), P(xin, h, za), sideC);
    if (flat) {
      quad(P(x0, h, za), P(x1, h, za), P(x1, h, zb), P(x0, h, zb), M([150, 154, 156]));
      quad(P(x0, 0, za), P(x1, 0, za), P(x1, h, za), P(x0, h, za), wallC);
      if (lev >= 5) { const bx = X - w * 0.2, bw = w * 0.4, bz = za + d * 0.3, bd = d * 0.4; quad(P(bx, h, bz), P(bx + bw, h, bz), P(bx + bw, h + 2.6, bz), P(bx, h + 2.6, bz), M(wall, 0.9)); }       // phòng kỹ thuật trên mái
      if (near) {                          // dải ban công và cửa sổ theo tầng
        const fl = ty === 2 ? 1 : Math.min(lev, 12), fh = h / fl;
        for (let f = 0; f < fl; f++) { const y = f * fh;
          if (ty === 2 && f === 0) continue; quad(P(xin, y + fh * 0.18, za), P(xin, y + fh * 0.18, zb), P(xin, y + fh * 0.30, zb), P(xin, y + fh * 0.30, za), M(wall, 0.62));
          const y0 = y + fh * 0.42, y1 = y + fh * 0.82, glass = M(ty === 1 && tone < 0.4 ? [96, 126, 156] : [88, 104, 124]);
          quad(P(xin, y0, za + d * 0.06), P(xin, y0, zb - d * 0.06), P(xin, y1, zb - d * 0.06), P(xin, y1, za + d * 0.06), glass);
          quad(P(x0 + w * 0.1, y0, za), P(x1 - w * 0.1, y0, za), P(x1 - w * 0.1, y1, za), P(x0 + w * 0.1, y1, za), glass);
          if (night > 0.35 && Math.sin(f * 7.3 + tone * 31) > 0) { ctx.globalAlpha *= 0.6; quad(P(xin, y0, za + d * 0.3), P(xin, y0, za + d * 0.55), P(xin, y1, za + d * 0.55), P(xin, y1, za + d * 0.3), 'rgba(255,220,130,.9)'); ctx.globalAlpha /= 0.6; } }
      }
      if (ty === 1 && lev <= 4 && near) quad(P(x0, 0, za), P(x1, 0, za), P(x1, 2.6, za), P(x0, 2.6, za), M([tone > 0.5 ? 190 : 70, tone > 0.7 ? 60 : 110, tone > 0.3 ? 70 : 150]));      // biển hiệu tầng trệt
    } else {                               // nhà dốc mái: ngói xám / xanh / nâu, mái đầu hồi hoặc mái hông
      const rh = Math.max(0.9, Math.min(Math.min(w, d) * 0.3, ty === 4 ? 4 : 3.2)), oh = ty === 4 ? 1.3 : 0.45, ridgeZ = d >= w, roofC = M(roof), roofL = M(roof, 1.18), roofD = M(roof, 0.8);
      if (ridgeZ) {
        quad(P(x0 - oh, h - 0.15, za), P(X, h + rh, za), P(X, h + rh, zb), P(x0 - oh, h - 0.15, zb), X > 0 ? roofL : roofC);
        quad(P(x1 + oh, h - 0.15, za), P(X, h + rh, za), P(X, h + rh, zb), P(x1 + oh, h - 0.15, zb), X > 0 ? roofC : roofL);
        ctx.fillStyle = wallC; ctx.beginPath(); let p = P(x0, 0, za); ctx.moveTo(p[0], p[1]); for (const q of [P(x1, 0, za), P(x1, h, za), P(X, h + rh, za), P(x0, h, za)]) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
      } else {
        const zm = za + d / 2;
        quad(P(x0 - oh, h - 0.15, za - oh), P(x1 + oh, h - 0.15, za - oh), P(x1 + oh, h + rh, zm), P(x0 - oh, h + rh, zm), roofL);
        quad(P(x0 - oh, h + rh, zm), P(x1 + oh, h + rh, zm), P(x1 + oh, h - 0.15, zb + oh), P(x0 - oh, h - 0.15, zb + oh), roofD);
        quad(P(x0, 0, za), P(x1, 0, za), P(x1, h, za), P(x0, h, za), wallC);
        ctx.fillStyle = sideC; ctx.beginPath(); let p = P(xin, h, za); ctx.moveTo(p[0], p[1]); for (const q of [P(xin, h, zb), P(xin, h + rh, zm)]) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
      }
      if (near && ty !== 3) {               // cửa sổ tầng 1–2, ban công mảnh, cửa ra vào
        const glass = M([88, 104, 124]), fl = h > 6 ? 2 : 1;
        for (let f = 0; f < fl; f++) { const y0 = 0.9 + f * 2.7, y1 = y0 + 1.5; for (let k = 0; k < Math.max(1, Math.floor(d / 4)); k++) { const a = za + 1 + k * 4, b = a + 2.2; if (b > zb - 0.6) break; quad(P(xin, y0, a), P(xin, y0, b), P(xin, y1, b), P(xin, y1, a), glass);
            if (night > 0.35 && Math.sin(k * 5.1 + f * 3 + tone * 40) > 0.1) quad(P(xin, y0, a + 0.2), P(xin, y0, b - 0.2), P(xin, y1 - 0.2, b - 0.2), P(xin, y1 - 0.2, a + 0.2), 'rgba(255,214,120,.9)'); } }
        if (f1(w) > 0) for (let f = 0; f < fl; f++) { const y0 = 0.9 + f * 2.7; quad(P(x0 + w * 0.15, y0, za), P(x0 + w * 0.5, y0, za), P(x0 + w * 0.5, y0 + 1.5, za), P(x0 + w * 0.15, y0 + 1.5, za), glass); }
        if (h > 6) quad(P(xin, 3.3, za), P(xin, 3.3, zb), P(xin, 3.6, zb), P(xin, 3.6, za), M([96, 96, 96]));       // dải ban công tầng 2
      }
    }
  }
  const f1 = w => w > 6 ? 1 : 0;
  function drawCell(ctx, c, o, X, z, day, wx, night, inSnow, windy, now, fadeA, quad, P) {
    const A = fadeA(z); ctx.globalAlpha = A;
    if (o.kind === 'building') {
      const x0 = X - o.w / 2, x1 = X + o.w / 2, za = z, zb = z + o.d, body = mixc([22, 28, 40], [96, 108, 126], day * (1 - wx * 0.4));
      const near = [P(x0, 0, za), P(x1, 0, za), P(x1, o.h, za), P(x0, o.h, za)], far = [P(x0, 0, zb), P(x1, 0, zb), P(x1, o.h, zb), P(x0, o.h, zb)];
      const inner = X > 0 ? [P(x0, 0, za), P(x0, 0, zb), P(x0, o.h, zb), P(x0, o.h, za)] : [P(x1, 0, za), P(x1, 0, zb), P(x1, o.h, zb), P(x1, o.h, za)];
      quad(inner[0], inner[1], inner[2], inner[3], mixc([16, 20, 30], [78, 90, 108], day * (1 - wx * 0.4)));
      quad(near[0], near[1], near[2], near[3], body);
      quad(near[3], near[2], far[2], far[3], mixc([30, 38, 52], [120, 132, 150], day * (1 - wx * 0.4)));
      if (night > 0.35 || o.h > 30) { const lit = night > 0.35; const rows = Math.min(14, Math.floor(o.h / 3.2)), cols = Math.max(2, Math.floor(o.w / 4)); for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { if (hash(Math.floor(z) * 13 + r * 7 + q * 3 + (X | 0)) > (lit ? 0.45 : 0.9)) continue; const p = P(x0 + (q + 0.5) * o.w / cols, 2 + r * 3.2, za); const s = 1.1 * c.f / za; ctx.fillStyle = lit ? 'rgba(255,224,130,.9)' : 'rgba(40,60,90,.5)'; ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s * 0.8); } }
    } else if (o.kind === 'jp' || o.kind === 'house') {
      drawJP(ctx, c, o.kind === 'house' ? Object.assign({ t: 0, lev: 2 }, o) : o, X, z, day, wx, night, quad, P);
    } else if (o.kind === 'house_old') {
      const x0 = X - o.w / 2, x1 = X + o.w / 2, near = [P(x0, 0, z), P(x1, 0, z), P(x1, o.h, z), P(x0, o.h, z)];
      quad(near[0], near[1], near[2], near[3], mixc([30, 30, 36], [170, 140, 120], day * (1 - wx * 0.4)));
      const rf = P(X, o.h + 2.5, z); ctx.fillStyle = mixc([20, 20, 28], [110, 60, 50], day * (1 - wx * 0.4)); ctx.beginPath(); ctx.moveTo(P(x0 - 0.5, o.h, z)[0], near[3][1]); ctx.lineTo(rf[0], rf[1]); ctx.lineTo(P(x1 + 0.5, o.h, z)[0], near[2][1]); ctx.closePath(); ctx.fill();
      if (night > 0.35) { const w = P(X, 2.0, z); ctx.fillStyle = 'rgba(255,220,120,.9)'; const s = 1.2 * c.f / z; ctx.fillRect(w[0] - s / 2, w[1] - s / 2, s, s * 0.8); }
    } else if (o.kind === 'tree') {
      const lean = windy ? Math.sin(now / 500 + z) * 0.28 + 0.2 : 0, tb = P(X, 0, z), tt = P(X, o.h, z), s = c.f / z; ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = Math.max(1, 0.4 * s); ctx.beginPath(); ctx.moveTo(tb[0], tb[1]); ctx.lineTo(tb[0] + lean * o.h * s * 0.5, tt[1] + o.h * s * 0.3); ctx.stroke();
      ctx.fillStyle = mixc([14, 36, 24], [40 + o.tone * 30, 100 + o.tone * 20, 56], day * (1 - wx * 0.3)); const cx_ = tb[0] + lean * o.h * s * 0.5;
      if (o.conifer) { ctx.beginPath(); ctx.moveTo(cx_, tt[1] - o.h * s * 0.15); ctx.lineTo(cx_ - o.w * s * 0.5, tb[1] - o.h * s * 0.25); ctx.lineTo(cx_ + o.w * s * 0.5, tb[1] - o.h * s * 0.25); ctx.closePath(); ctx.fill(); } else { ctx.beginPath(); ctx.arc(cx_, tt[1] + o.h * s * 0.25, o.w * s * 0.55, 0, 7); ctx.fill(); }
      if (inSnow) { ctx.fillStyle = 'rgba(240,246,255,.85)'; ctx.beginPath(); ctx.arc(cx_, tt[1] + o.h * s * 0.1, o.w * s * 0.3, Math.PI, 0); ctx.fill(); }
    } else if (o.kind === 'field') {
      const x0 = X - o.w / 2, x1 = X + o.w / 2; quad(P(x0, 0, z), P(x1, 0, z), P(x1, 0, z + o.d), P(x0, 0, z + o.d), mixc([18, 30, 18], [90 + o.tone * 50, 130 + o.tone * 30, 60], day * (1 - wx * 0.3)).replace('rgb', 'rgba').replace(')', ',.8)'));
    }
    ctx.globalAlpha = 1;
  }

  // Camera ở buồng lái CUỐI đoàn nhìn ngược về phía sau: dựng một "thế giới phản chiếu" (hướng chạy đảo, toạ độ s' = chiều dài tuyến − s) rồi vẽ bằng cùng hàm draw
  root.CabView = { faceX, noseFromHeights, draw, proj, cellObject, hash, CAMH, PEDGE, PH, ADJ };
})(typeof window !== 'undefined' ? window : globalThis);
