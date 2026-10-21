// Lõi mô phỏng lái Shinkansen v0.4 (không phụ thuộc trình duyệt).
// Số liệu: docs/03 (tàu), 04 (lịch), 06 (ATC, ngưỡng thời tiết), 07 (lái), 09 (sự cố). Nhãn [I] = đơn giản hóa/suy luận (xem docs/10).
(function (root) {
  const G = { aATC: 0.72, stopTol: 30, atcBuf: 400, turnoutV: 80 / 3.6, turnoutIn: 1150, turnoutOut: 630 };   // mẫu ATC [I]; ATC chặn ở vạch + 30 m; đệm khoảng cách 400 m [I]
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const NOTCH_MIN = -8, NOTCH_MAX = 13;
  const notchName = n => n > 0 ? 'P' + n : n === 0 ? 'N' : n === -8 ? 'EB' : 'B' + (-n);

  // ---- Loại tàu (docs/03 §2b). Số in nghiêng [I]: N700S, N700-8, S800, hệ số cản gió, công suất hiệu dụng
  const VEH = {
    'N700':   { name: 'N700',   len: 404.7, m: 715e3, a0: 0.72,  P: 14.5e6, vmax: 300 / 3.6, aB7: 0.75, aEB: 1.04, cap: 1323, cd: 1.0,  cars: 16 },
    'N700S':  { name: 'N700S',  len: 404.7, m: 700e3, a0: 0.72,  P: 14.5e6, vmax: 300 / 3.6, aB7: 0.75, aEB: 1.04, cap: 1323, cd: 1.0,  cars: 16 },
    'N700-8': { name: 'N700 (8 toa)', len: 204.7, m: 360e3, a0: 0.72, P: 8.4e6, vmax: 285 / 3.6, aB7: 0.75, aEB: 1.04, cap: 546, cd: 1.0, cars: 8 },
    'S800':   { name: '800 series', len: 152, m: 255e3, a0: 0.62, P: 5.6e6, vmax: 260 / 3.6, aB7: 0.75, aEB: 1.04, cap: 392, cd: 1.0, cars: 6 },
    'E7':     { name: 'E7 / W7', len: 300.0, m: 480e3, a0: 0.5, P: 9.6e6, vmax: 275 / 3.6, aB7: 0.75, aEB: 1.04, cap: 934, cd: 0.5, cars: 12 },
    'N700S-6': { name: 'N700S 8000 (6 toa)', len: 154.7, m: 275e3, a0: 0.72, P: 5.4e6, vmax: 260 / 3.6, aB7: 0.75, aEB: 1.04, cap: 391, cd: 1.0, cars: 6 },
    'H5':     { name: 'H5',     len: 253,   m: 453.5e3, a0: 0.475, P: 9.2e6, vmax: 320 / 3.6, aB7: 0.75, aEB: 1.04, cap: 658, cd: 0.55, cars: 10 },
    'E5':     { name: 'E5',     len: 253,   m: 453.5e3, a0: 0.475, P: 9.2e6, vmax: 320 / 3.6, aB7: 0.75, aEB: 1.04, cap: 723, cd: 0.55, cars: 10 }
  };
  // mini-Shinkansen: E6 (Komachi) và E8 (Tsubasa) 7 toa, khổ thân hẹp; số liệu công suất/khối lượng là [I]
  VEH['E6'] = { name: 'E6', len: 148.7, m: 335e3, a0: 0.5, P: 5.0e6, vmax: 320 / 3.6, aB7: 0.75, aEB: 1.04, cap: 338, cd: 0.6, cars: 7 };
  VEH['E8'] = { name: 'E8', len: 148.7, m: 336e3, a0: 0.5, P: 5.0e6, vmax: 300 / 3.6, aB7: 0.75, aEB: 1.04, cap: 355, cd: 0.6, cars: 7 };
  VEH['T4'] = { name: '923 Doctor Yellow', len: 177.1, m: 360e3, a0: 0.72, P: 6.0e6, vmax: 270 / 3.6, aB7: 0.75, aEB: 1.04, cap: 0, cd: 1.0, cars: 7 };          // tàu kiểm tra Tokaido/Sanyo; số liệu [K]
  VEH['E926'] = { name: 'E926 East i', len: 135.0, m: 300e3, a0: 0.5, P: 4.8e6, vmax: 275 / 3.6, aB7: 0.75, aEB: 1.04, cap: 0, cd: 0.6, cars: 6 };               // tàu kiểm tra JR East; số liệu [K]
  // tàu ghép hai đoàn (Hayabusa + Komachi, Yamabiko + Tsubasa): đoàn đầu + đoàn sau; parts dùng để vẽ từng đoạn
  function combo(a, b) { const A = VEH[a], B = VEH[b], gap = 2.5; return { name: A.name + ' + ' + B.name, len: A.len + gap + B.len, m: A.m + B.m, a0: (A.a0 * A.m + B.a0 * B.m) / (A.m + B.m), P: A.P + B.P, vmax: Math.min(A.vmax, B.vmax), aB7: 0.75, aEB: 1.04, cap: A.cap + B.cap, cd: (A.cd * A.len + B.cd * B.len) / (A.len + B.len), cars: A.cars + B.cars, parts: [a, b], gap }; }
  VEH['E5+E6'] = combo('E5', 'E6'); VEH['E5+E8'] = combo('E5', 'E8');
  Object.keys(VEH).forEach(k => { VEH[k].key = k; });
  const lenFactor = v => 0.55 + 0.45 * v.len / 404.7;

  // ---- Tuyến: giới hạn tốc độ (km thực dọc tuyến), hầm lớn, cảnh quan, độ dốc mô phỏng. Chỉ có [I] (số liệu thật: docs/02)
  const LINE_META = {
    tsk: {
      pa: '東海道・山陽・九州', defVeh: 'N700', flipDown: true, snow: [[385, 405, 120, 'tuyết Sekigahara'], [405, 462, 170, 'tuyết Maibara–Otsu']],
      limits: [[0, 6.8, 110], [6.8, 90, 270], [90, 515.4, 285], [515.4, 1069.1, 300], [1069.1, 1325.9, 260]],
      tunnels: [[97.5, 105.5, 'Tanna'], [549.9, 566.1, 'Rokko']],
      biomes: [[0, 42, 'urban'], [70, 112, 'mountain'], [335, 352, 'urban'], [360, 372, 'urban'], [384, 420, 'mountain'], [452, 470, 'mountain'], [470, 520, 'urban'],
               [520, 560, 'urban'], [560, 700, 'mountain'], [660, 690, 'urban'], [820, 830, 'urban'], [870, 1060, 'mountain'], [1060, 1075, 'urban'], [1180, 1325.9, 'mountain']],
      grade: [[0, 515.4, 8, 20], [515.4, 1069.1, 9, 18], [1069.1, 1325.9, 13, 35]]   // [km0, km1, điển hình ‰, tối đa ‰]; hình dạng giả lập, tối đa theo docs/02
    },
    toh: {
      pa: '東北・北海道', defVeh: 'E5', flipDown: false, snow: [[330, 400, 230, 'tuyết Sendai–Morioka'], [520, 674, 200, 'tuyết Morioka–Shin-Aomori']],
      limits: [[0, 31.3, 110], [31.3, 109, 275], [109, 496.5, 320], [496.5, 703.8, 260], [703.8, 715.9, 140], [715.9, 769.8, 160], [769.8, 786.3, 140], [786.3, 823.7, 260]],   // Hokkaido: đoạn dùng chung ray ba với tàu hàng (Shin-Nakaoguni–Kikonai) 140 km/h ngoài hầm, 160 km/h trong hầm Seikan [N]
      tunnels: [[533, 559, 'Iwate-Ichinohe'], [641, 667, 'Hakkoda'], [715.9, 769.8, 'Seikan']],
      biomes: [[0, 36, 'urban'], [100, 112, 'urban'], [320, 330, 'urban'], [490, 500, 'urban'], [520, 565, 'mountain'], [636, 674.9, 'mountain'], [674.9, 715, 'mountain'], [769.8, 823.7, 'field']],
      grade: [[0, 36, 15, 25], [36, 674.9, 7, 15], [674.9, 823.7, 8, 20.8]],
      refuges: [732.9, 755.9],     // 竜飛定点 (km 58.0 từ Shin-Aomori) và 吉岡定点 (81.0) trong hầm Seikan [N]
      notes: [{ km: 703.8, dir: 'down', text: 'Vào đoạn dùng chung ray ba với tàu hàng (Shin-Nakaoguni–Kikonai, ~82 km): ≤ 140 km/h ngoài hầm, ≤ 160 km/h trong hầm Seikan (53,85 km).' },
              { km: 786.3, dir: 'up', text: 'Vào đoạn dùng chung ray ba với tàu hàng (Kikonai–Shin-Nakaoguni): ≤ 140 km/h ngoài hầm, ≤ 160 km/h trong hầm Seikan.' },
              { km: 732.9, dir: 'down', text: 'Dưới đáy biển eo Tsugaru (≈ 23 km). Nếu có cháy: không dừng giữa hầm, chạy tới điểm cứu hộ 吉岡 hoặc ra khỏi hầm.' }]
    },
    yam: {
      pa: '山形', defVeh: 'E8', flipDown: false,
      snow: [[262, 300, 100, 'tuyết đèo Itaya'], [300, 403.7, 110, 'tuyết Yamagata–Shinjo']],
      limits: [[0, 31.3, 110], [31.3, 109, 275], [109, 255.1, 300], [255.1, 403.7, 130]],        // Fukushima–Shinjo là đường sắt thường khổ chuẩn: tối đa 130 km/h [N]
      curveA: 1.3, curveFrom: 255.1, tunnels: [],
      biomes: [[0, 36, 'urban'], [100, 112, 'urban'], [208, 220, 'urban'], [250, 262, 'urban'], [262, 292, 'mountain'], [292, 300, 'urban'], [336, 348, 'urban'], [348, 400, 'field'], [400, 403.7, 'urban']],
      grade: [[0, 36, 15, 25], [36, 255.1, 7, 15], [255.1, 296, 26, 37.5], [296, 403.7, 9, 20]],   // dốc tối đa 37,5‰ (đèo Itaya) [N]
      notes: [{ km: 255.1, dir: 'down', text: 'Rời Shinkansen thật, vào đường sắt thường Ou (khổ chuẩn): ≤ 130 km/h, đường đơn gần hết chặng, nhiều đường ngang, cong gắt và dốc tới 37,5‰ ở đèo Itaya.' },
              { km: 311.2, dir: 'down', text: 'Đoạn đường đôi Akayu–Kita-Akayu ngắn; sau đó đường đơn: tàu ngược chiều đợi ở ga.' },
              { km: 255.1, dir: 'up', text: 'Sắp ghép với Yamabiko tại Fukushima (nếu là tàu ghép): dừng đúng vạch, chờ ghép xong.' }]
    },
    aki: {
      pa: '秋田', defVeh: 'E6', flipDown: false,
      snow: [[330, 400, 230, 'tuyết Sendai–Morioka'], [496.5, 545, 95, 'tuyết Sengan-toge'], [545, 623.8, 110, 'tuyết Akita']],
      limits: [[0, 31.3, 110], [31.3, 109, 275], [109, 496.5, 320], [496.5, 623.8, 130]],
      curveA: 1.3, curveFrom: 496.5, tunnels: [],
      biomes: [[0, 36, 'urban'], [100, 112, 'urban'], [320, 330, 'urban'], [490, 500, 'urban'], [515, 548, 'mountain'], [548, 616, 'field'], [616, 623.8, 'urban']],
      grade: [[0, 36, 15, 25], [36, 496.5, 7, 15], [496.5, 545, 22, 37], [545, 623.8, 8, 18]],
      notes: [{ km: 496.5, dir: 'down', text: 'Rời Shinkansen thật tại Morioka, vào Tazawako Line (đường sắt thường khổ chuẩn): ≤ 130 km/h, đường đơn, đường ngang, đèo Sengan-toge cong và dốc.' },
              { km: 572.1, dir: 'down', text: 'Tại Omagari tàu đổi chiều chạy (switchback): từ đây tới Akita ghế quay ngược chiều. (Mô hình giữ nguyên hướng nhìn.)' }]
    },
    jts: {
      pa: '上越', defVeh: 'E7', flipDown: false, snow: [[151, 272, 200, 'tuyết Jomo-Kogen–Nagaoka']],
      limits: [[0, 30.3, 110], [30.3, 113, 275], [113, 127.9, 260], [127.9, 333.9, 275]],       // hầm Nakayama có cong R=1.500 m: trang Wikipedia JP ghi 160 km/h (số cũ); lịch 2026 chạy nhanh hơn nhiều nên dùng 260 km/h [I]
      tunnels: [[113, 127.9, 'Nakayama'], [164, 186.2, 'Oshimizu']],
      biomes: [[0, 36, 'urban'], [60, 70, 'urban'], [100, 112, 'urban'], [112, 262, 'mountain'], [262, 275, 'urban'], [318, 333.9, 'urban']],
      grade: [[0, 36, 15, 25], [36, 333.9, 8, 15]]
    },
    nks: {
      pa: '西九州', defVeh: 'N700S-6', flipDown: true, snow: [],
      limits: [[0, 66.0, 260]],
      tunnels: [[1.2, 6.9, 'Tawarazaka'], [14.5, 17.4, 'Kiba'], [35.5, 40.5, 'Kuyama'], [50.0, 57.5, 'Shin-Nagasaki']],   // tên [N]; vị trí km [I]
      biomes: [[0, 12, 'mountain'], [30, 36, 'field'], [43, 47, 'urban'], [47, 60, 'mountain'], [60, 66, 'urban']],
      grade: [[0, 66.0, 12, 30]]
    },
    hok: {
      pa: '北陸', defVeh: 'E7', flipDown: true, snow: [[140, 300, 200, 'tuyết Karuizawa–Joetsu-Myoko'], [300, 575.6, 180, 'tuyết Itoigawa–Tsuruga']],
      limits: [[0, 30.3, 110], [30.3, 105, 275], [105, 575.6, 260]],
      tunnels: [[254, 276.2, 'Iiyama'], [284, 295, 'Kubiki']],
      biomes: [[0, 36, 'urban'], [60, 70, 'urban'], [100, 112, 'urban'], [120, 160, 'mountain'], [218, 228, 'urban'], [240, 335, 'mountain'], [386, 398, 'urban'], [445, 458, 'urban'], [575.6 - 10, 575.6, 'urban']],
      grade: [[0, 36, 15, 25], [36, 105, 8, 15], [105, 147, 20, 30], [147, 575.6, 9, 15]],
      freq: [{ km: 149.5, len: 90, hz: [50, 60], label: '新軽井沢SP' }, { km: 293.5, len: 90, hz: [60, 50], label: '新高田SP' }, { km: 322, len: 90, hz: [50, 60], label: '新糸魚川SP' }]   // [N: SP của Wikipedia JP; km và chiều dài là I]
    }
  };
  const lineData = id => (root.LINES || {})[id];
  const DIFF = {
    easy:   { name: 'Dễ',         events: [1, 1], hint: 2, atcOver: 6 / 3.6, tolK: 2.0, comfortK: 6,  rate: 1.0, timeK: 0.5, eqk: 0,    fault: 0,   reopen: 0.05, confirm: 'auto', rare: 0 },
    normal: { name: 'Thường',     events: [2, 3], hint: 1, atcOver: 2 / 3.6, tolK: 1.0, comfortK: 12, rate: 1.0, timeK: 1.0, eqk: 0.1,  fault: 0,   reopen: 0.10, confirm: 'auto5', rare: 0.1 },
    hard:   { name: 'Khó',        events: [4, 5], hint: 0, atcOver: 0.5 / 3.6, tolK: 0.7, comfortK: 16, rate: 0.85, timeK: 1.3, eqk: 0.25, fault: 0.2, reopen: 0.15, confirm: 'manual', rare: 0.25 },
    expert: { name: 'Chuyên gia', events: [6, 7], hint: 0, atcOver: 0.3 / 3.6, tolK: 0.5, comfortK: 20, rate: 0.7, timeK: 1.6, eqk: 0.45, fault: 0.5, reopen: 0.20, confirm: 'manual', rare: 0.5 }
  };
  const WEATHER = { auto: 'Ngẫu nhiên', clear: 'Trời quang', rain: 'Mưa lớn', typhoon: 'Bão (mưa + gió)', snow: 'Tuyết', eqk: 'Động đất' };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---- Hình học tuyến -----------------------------------------------------
  const sOfKm = (km, dir, kmEnd) => dir === 'up' ? (kmEnd - km) * 1000 : km * 1000;
  const kmOfS = (s, dir, kmEnd) => dir === 'up' ? kmEnd - s / 1000 : s / 1000;
  function lineOf(id) { const L = lineData(id); if (!L) throw new Error('Thiếu dữ liệu tuyến ' + id); if (!L.meta) {
      L.meta = LINE_META[id]; L.skm = L.stations.map(s => s.km);
      if (L.meta.curveA && !L.meta._cl) {          // đường sắt thường: tốc độ qua đường cong v = sqrt(a·R) (a = gia tốc ngang cho phép, chưa có nghiêng thân) [I]
        L.meta._cl = true; const extra = [];
        for (const [a, b, R] of L.curves || []) if (a >= L.meta.curveFrom) { const v = Math.floor(3.6 * Math.sqrt(L.meta.curveA * R) / 5) * 5; if (v < 125) extra.push([a, b, Math.max(40, v)]); }
        L.meta.limits = L.meta.limits.concat(extra);
      }
      if (L.struct) { const named = L.meta.tunnels; L.meta.tunnels = L.struct.filter(g => g[2] === 't').map(g => { const n = named.find(t => t[0] === g[0] && t[1] === g[1]); return n ? n : [g[0], g[1]]; }); }   // mọi hầm (kể cả hầm sinh theo tỷ lệ) [I]
    } return L; }
  // kết cấu nền (g đất / v cầu cạn / b cầu / t hầm) và đường cong tại km; cong: {R, sg} hoặc null
  function structAt(L, km) { for (const [a, b, k] of L.struct || []) if (km >= a && km < b) return k; return 'g'; }
  function curveAt(L, km) { for (const [a, b, R, sg] of L.curves || []) if (km >= a && km < b) return { R, sg, a, b }; return null; }
  function biomeAt(L, km) { for (const [a, b, t] of L.meta.biomes) if (km >= a && km < b) return t; return 'field'; }
  function gradeKm(L, km) {                                               // ‰ theo chiều tăng km: mô phỏng [I]
    let typ = 8, mx = 20; for (const [a, b, t, m] of L.meta.grade) if (km >= a && km < b) { typ = t; mx = m; }
    const n = Math.sin(km * 0.37 + 1.1) * 0.55 + Math.sin(km * 0.91 + 0.4) * 0.3 + Math.sin(km * 2.3 + 2.0) * 0.15;
    let dmin = 1e9; const sk = L.skm; let lo = 0, hi = sk.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (sk[mid] <= km) lo = mid; else hi = mid; }
    dmin = Math.min(Math.abs(km - sk[lo]), Math.abs(sk[hi] - km));
    const flat = clamp((dmin - 0.6) / 1.2, 0, 1);                           // ga nằm trên đoạn bằng
    return clamp(n * typ * 1.6, -mx, mx) * flat;
  }
  function gradeAt(W, s) { const km = kmOfS(s, W.dir, W.line.kmEnd); const g = gradeKm(W.line, km); return W.dir === 'up' ? -g : g; }  // ‰ theo chiều chạy (+ là lên dốc)
  function limitKm(L, km) { let v = null; for (const [a, b, lv] of L.meta.limits) if (km >= a && km < b) v = v === null ? lv : Math.min(v, lv); return v === null ? 285 : v; }
  function staticLimit(W, T, s) { const km = kmOfS(s, W.dir, W.line.kmEnd); return Math.min(limitKm(W.line, km) / 3.6, T.veh.vmax); }
  function staticBoundaries(W, T) {   // [s bắt đầu đoạn, tốc độ] theo chiều chạy
    const out = []; for (const [a, b, lv] of W.line.meta.limits) { const sa = sOfKm(a, W.dir, W.line.kmEnd), sb = sOfKm(b, W.dir, W.line.kmEnd); out.push([Math.min(sa, sb), Math.min(lv / 3.6, T.veh.vmax)]); } return out;
  }
  function inTunnel(W, x) { for (const [k0, k1] of W.line.meta.tunnels) { const a = sOfKm(k0, W.dir, W.line.kmEnd), b = sOfKm(k1, W.dir, W.line.kmEnd); if (x >= Math.min(a, b) && x <= Math.max(a, b)) return true; } return false; }

  // ---- Lịch tàu --------------------------------------------------------------
  const trainSeq = rec => rec.s.map(e => ({ i: e[0], arr: e[1], dep: e[2], stop: !e[3] }));
  function timeAt(L, rec, i) {
    const seq = trainSeq(rec), km = j => L.stations[j].km, down = rec.d === 'down';
    const e = seq.find(x => x.i === i); if (e && e.stop) return e.arr != null ? e.arr : e.dep;
    const idxs = seq.map(x => x.i); const lo = Math.min(idxs[0], idxs[idxs.length - 1]), hi = Math.max(idxs[0], idxs[idxs.length - 1]);
    if (i < lo || i > hi) return null;
    let a = null, b = null;
    for (const x of seq) { if (!x.stop) continue; const before = down ? km(x.i) <= km(i) : km(x.i) >= km(i); if (before) a = x; else { b = x; break; } }
    if (!a || !b) return null;
    const ta = a.dep != null ? a.dep : a.arr, tb = b.arr != null ? b.arr : b.dep, p = (km(i) - km(a.i)) / (km(b.i) - km(a.i)); return ta + (tb - ta) * p;
  }
  function makeTrip(lineId, rec, fromI, toI) {
    const L = lineOf(lineId), seq = trainSeq(rec);
    const a = seq.findIndex(e => e.i === fromI && e.stop), b = seq.findIndex(e => e.i === toI && e.stop);
    if (a < 0 || b < 0 || b <= a) return null;
    const t0 = seq[a].dep != null ? seq[a].dep : seq[a].arr;
    const M = seq.slice(a, b + 1).map(e => ({ name: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, rec.d, L.kmEnd), stop: e.stop, loop: !!L.stations[e.i].loop, arr: e.arr != null ? e.arr - t0 : null, dep: e.dep != null ? e.dep - t0 : null }));
    M[0].arr = null; M[0].dep = 0; M[M.length - 1].dep = null;
    return { lineId, rec, dir: rec.d, M, t0, label: `${rec.t} ${rec.n}`, seq };
  }
  function fillPlan(M) {
    const stops = M.map((m, k) => m.stop ? k : -1).filter(k => k >= 0);
    M.forEach((m, k) => {
      if (m.stop) { m.pt = m.arr != null ? m.arr : m.dep; return; }
      const a = stops.filter(q => q < k).pop(), b = stops.find(q => q > k);
      if (a === undefined || b === undefined) { m.pt = null; return; }
      const ta = M[a].dep != null ? M[a].dep : M[a].arr, tb = M[b].arr != null ? M[b].arr : M[b].dep;
      m.pt = ta + (tb - ta) * (m.s - M[a].s) / (M[b].s - M[a].s);
    });
    return M;
  }
  const catalogOf = (L, dir) => L.trains.filter(t => t.d === dir);
  function pickLead(L, catalog, trip) {
    const fromI = trip.M[0].i, toI = trip.M[trip.M.length - 1].i, lo = Math.min(fromI, toI), hi = Math.max(fromI, toI), tOur = timeAt(L, trip.rec, fromI);
    let best = null, bestGap = 1e9;
    for (const rec of catalog) {
      if (rec === trip.rec) continue;
      const tf = timeAt(L, rec, fromI); if (tf == null) continue;
      const gap = tOur - tf; if (gap < 60 || gap > 1500) continue;
      let ok = true;
      for (let i = lo; i <= hi; i++) { const a = timeAt(L, rec, i), b = timeAt(L, trip.rec, i); if (a == null || b == null) continue; if (a > b + 5) { ok = false; break; } }
      if (ok && gap < bestGap) { best = rec; bestGap = gap; }
    }
    return best;
  }
  function passers(L, catalog, trip) {
    const out = {};
    trip.M.forEach((m, k) => {
      if (k === 0 || k === trip.M.length - 1 || !m.stop || !m.loop || m.arr == null) return;
      const arr = trip.t0 + m.arr, dep = trip.t0 + (m.dep != null ? m.dep : m.arr);
      for (const rec of catalog) {
        if (rec === trip.rec) continue; const e = trainSeq(rec).find(x => x.i === m.i); if (e && e.stop) continue;
        const t = timeAt(L, rec, m.i); if (t == null) continue;
        if (t > arr - 5 && t < dep + 60) (out[k] = out[k] || []).push({ label: rec.t + ' ' + rec.n, t: t - trip.t0, v: rec.v });
      }
    });
    return out;
  }

  // ---- Tàu -------------------------------------------------------------------
  function newTrain(M, W, opts) {
    opts = opts || {}; const cpDone = !!opts.cp && (M[M.length - 1].i >= M[0].i ? M[0].i >= opts.cp[0] : M[0].i <= opts.cp[0]);      // chuyến bắt đầu sau ga ghép/tách: đã ở dạng đoàn sau khi ghép/tách
    const veh = cpDone ? VEH[opts.cp[1]] : (VEH[opts.veh] || VEH['N700']);
    return { M, W, veh, load: opts.load != null ? opts.load : 0.7, k: 0, x: M[0].s, v: 0, f: 0, cmd: 0, pw: 0, bk: 0, notch: 0, a: 0, phase: 'dwell', dwellT: 0, started: false, atc: false, atcCount: 0, atcOk: 0, confirmed: false, needConfirm: false,
      allowed: 0, why: '', results: [], log: [], comfort: 0, jerkTime: 0, earlyDep: 0, excused: 0, holds: {}, forced: -1, cut: false, arrT: 0, free: 0,
      lamp: 'auto', lampBad: 0, atcOn: true, atcArm: -1e9, atcOffBad: 0, atcCuts: 0, door: opts.lead ? 'closed' : 'open', doorT: 0, doorDur: 0, willReopen: false, doorFaultOnce: false, cs: false, csSet: 0, wiper: false, horn: 0, hornAt: -99, hornPen: 0, wiperBad: 0, animalHit: 0,
      xingHit: 0, cp: opts.cp ? { i: opts.cp[0], v: opts.cp[1], done: cpDone } : null, coup: null, deadViol: 0, vcbUntil: -1e9, bt: 0, kwh: 0, regen: 0, grade: 0, anx: 0, anxMax: 0, paAt: -999, fireTunnel: 0, waitFor: null, blockedT: 0, trace: [],
      isLead: !!opts.lead, label: opts.label || '', id: opts.id || '' };
  }
  const massOf = T => T.veh.m + T.load * T.veh.cap * 70;
  const resistOf = (T, v) => (2000 + 80 * v) * (massOf(T) / 715e3) + 19.5 * v * v * T.veh.cd * lenFactor(T.veh);
  const tractiveOf = (T, v) => Math.min(T.veh.m * T.veh.a0, T.veh.P / Math.max(v, 1));
  const EBCMD = T => -T.veh.aEB / T.veh.aB7;
  const handleCmd = T => T.bk > 0 ? (T.bk >= 8 ? EBCMD(T) : -T.bk / 7) : T.pw / 13;
  const nextTarget = T => { for (let j = T.k + 1; j < T.M.length; j++) if (T.M[j].stop || T.forced === j) return j; return T.M.length - 1; };
  const allTrains = W => [W.player, W.lead].concat(W.net ? W.net.trains : []).filter(Boolean);
  // tàu sắp rẽ vào đường tránh ở ga có đường thông qua (trong 2,5 km) coi như rời đường chính: tàu sau vẫn chạy thẳng
  function offMain(O) { if (O.phase !== 'run') return false; const j = nextTarget(O), m = O.M[j]; return !!(m && m.loop && m.stop && Math.abs(m.s - O.x) < 2500); }
  function leaderOf(T) {
    const W = T.W; if (!W.net) return T.isLead ? null : W.lead;
    let best = null; for (const O of W.net.trains) { if (O === T || O.phase === 'end' || O.phase === 'dwell' || offMain(O)) continue; if (O.x > T.x && (!best || O.x < best.x)) best = O; } return best;
  }
  // ---- Ghi (đường rẽ vào đường sân ga): giới hạn 80 km/h [I] từ 1.150 m trước vạch tới 630 m sau vạch, chỉ với ga có đường dừng khác đường chính
  function stationDiverts(L, i, dir) { const Ly = root.Layout; if (!Ly || !L.stations[i] || !L.stations[i].lay) return false; return Ly.diverts(L.stations[i].lay, dir, i); }
  const divertsAt = (T, j) => { const m = T.M[j]; return !!(m && (m.stop || T.forced === j || (j === T.k && T.phase !== 'end')) && !m.mainStop && stationDiverts(T.W.line, m.i, T.W.dir)); };
  function turnoutZones(T) { const out = []; for (let j = 0; j < T.M.length; j++) if (divertsAt(T, j)) out.push({ s0: T.M[j].s - G.turnoutIn, s1: T.M[j].s + G.turnoutOut, v: G.turnoutV, j }); return out; }
  // vị trí các ghi và ghi chéo (chữ X) mà đoàn tàu đi qua quanh một ga: dùng cho âm thanh
  function switchPoints(T) { const pts = []; for (let j = 0; j < T.M.length; j++) { const m = T.M[j], sM = m.s, dv = divertsAt(T, j);
    pts.push(sM - 1300 + 35, sM - 1300 + 115, sM + 720 + 35, sM + 720 + 115); if (dv) pts.push(sM - G.turnoutIn, sM + G.turnoutOut); } return pts.sort((a, b) => a - b); }
  // ga có từ 2 đường dừng cùng chiều: hai tàu có thể đỗ cùng lúc (mỗi tàu một đường); chỉ 1 đường: tàu sau phải chờ phía sau
  function sharesPlatformLane(W, Ld) { const Ly = root.Layout, m = Ld.M[Ld.k], st = m && W.line.stations[m.i]; return !!(Ly && st && st.lay && Ly.stopCount(st.lay, W.dir) >= 2); }
  function allowedSpeed(T) {
    const W = T.W;
    if (T.phase === 'dwell' || T.phase === 'end') { T.why = T.phase === 'end' ? '' : 'ga'; return 0; }
    if (T.cut) { T.why = 'eqk'; return 0; }
    const x = T.x; let a = staticLimit(W, T, x), why = 'line';
    for (const [s0, vz] of staticBoundaries(W, T)) if (s0 > x && vz < a) { const q = Math.sqrt(vz * vz + 2 * G.aATC * (s0 - x)); if (q < a) a = q; }
    for (const z of W.zones) {
      if (z.hold || W.t < z.tA || W.t > z.tB) continue;
      if (x >= z.s0 && x < z.s1) { if (z.v < a) { a = z.v; why = z.kind; } }
      else if (z.s0 > x && z.v < a) { const q = Math.sqrt(z.v * z.v + 2 * G.aATC * (z.s0 - x)); if (q < a) { a = q; why = z.kind; } }
    }
    for (const z of turnoutZones(T)) {       // ghi vào / ra đường sân ga
      if (x >= z.s0 && x < z.s1) { if (z.v < a) { a = z.v; why = 'turnout'; } }
      else if (z.s0 > x && z.v < a) { const q = Math.sqrt(z.v * z.v + 2 * G.aATC * (z.s0 - x)); if (q < a) { a = q; why = 'turnout'; } }
    }
    T.free = a;
    const j = nextTarget(T), tgt = T.M[j].s, d = tgt + G.stopTol - x, q = d > 0 ? Math.sqrt(2 * G.aATC * d) : 0;
    if (q < a) { a = q; why = 'stop'; }
    const L = leaderOf(T);
    if (L && L.phase !== 'end' && !(L.phase === 'dwell' && L.atMark && sharesPlatformLane(W, L)) && !offMain(L)) {
      const gap = L.x - L.veh.len - x - G.atcBuf;
      if (gap < 15000) { const qq = gap > 0 ? Math.sqrt(2 * G.aATC * gap) : 0; if (qq < a) { a = qq; why = 'lead'; } }
    }
    T.why = why; return a;
  }

  // ---- Điều khiển của người lái ---------------------------------------------
  function cancelCS(T, why) { if (T.cs) { T.cs = false; if (!T.isLead) T.W.say('info', 'Chạy tốc độ không đổi: TẮT' + (why ? ' (' + why + ')' : '')); } }
  function setPower(T, n) { n = clamp(Math.round(n), 0, 13); if (T.bk > 0 && n > 0) { if (!T.isLead) T.W.say('warn', 'Cần phanh chưa về 0: không kéo được (liên động).'); return false; } if (n !== T.pw && T.cs) cancelCS(T, 'thao tác cần gia tốc'); T.pw = n; return true; }
  function setBrake(T, n) { n = clamp(Math.round(n), 0, 8); T.bk = n; if (n > 0) { T.pw = 0; cancelCS(T, 'phanh'); } }
  function coast(T) { T.pw = 0; T.bk = 0; cancelCS(T, 'về N'); }
  function toggleCS(T) {
    if (T.cs) { cancelCS(T); return; }
    if (T.phase !== 'run' || T.v < 70 / 3.6 || T.atc) { T.W.say('warn', 'Chỉ bật tốc độ không đổi khi đang chạy ≥ 70 km/h và ATC không phanh.'); return; }
    T.cs = true; T.csSet = Math.round(T.v * 3.6 / 5) * 5 / 3.6; T.pw = 0; T.bk = 0; T.W.say('info', `Chạy tốc độ không đổi: BẬT ${Math.round(T.csSet * 3.6)} km/h ([ ] đổi ±5 km/h).`);
  }
  function adjustCS(T, d) { if (T.cs) T.csSet = clamp(T.csSet + d / 3.6, 70 / 3.6, T.veh.vmax); }
  function toggleWiper(T) { T.wiper = !T.wiper; }
  // đèn pha: chế độ tự động / bật / tắt do lái tàu chọn. Cần đèn khi trong hầm, ban đêm (trước 6:18, sau 17:54) hoặc mưa lúc nhá nhem
  function needsLight(W, T) { const h = (((W.trip.t0 + W.t) % 86400) + 86400) % 86400 / 3600; return inTunnel(W, T.x) || h < 6.3 || h > 17.9 || (W.rainHere && (h < 7.2 || h > 16.8)); }
  const lampOn = (W, T) => !T.cut && (T.lamp === 'on' || (T.lamp !== 'off' && needsLight(W, T)));
  function cycleLamp(T) { T.lamp = T.lamp === 'auto' ? 'on' : T.lamp === 'on' ? 'off' : 'auto'; }
  function honk(T) {
    const W = T.W; if (W.t - T.hornAt < 0.6 && T.started) return; T.hornAt = W.t; T.horn = 1.4;
    for (const z of W.workers || []) if (!z.checked && T.x >= z.s0 - 800 && T.x <= z.s1) z.hornOK = true;
    for (const an of W.animals || []) if (!an.resolved && an.active && T.x >= an.s - 1500 && T.x <= an.s - 100) { an.hornOK = true; if (an.fleeT0 === undefined) an.fleeT0 = W.t; }
  }
  // Công tắc ATC (bật / cắt). Cắt ATC phải bấm hai lần trong 4 s để tránh bấm nhầm; bật lại thì tức thì. Khi cắt: không còn phanh tự động ATC [I]
  function toggleATC(T) {
    const W = T.W;
    if (T.atcOn === false) { T.atcOn = true; T.atcArm = -1e9; W.say('info', 'ATC: BẬT lại.'); return 'on'; }
    if (W.t - T.atcArm <= 4) { T.atcOn = false; T.atcArm = -1e9; T.atc = false; T.needConfirm = false; if (T.phase === 'run' && T.v > 1) T.atcCuts++; W.say('bad', 'ATC: ĐÃ CẮT. KHÔNG còn phanh tự động bảo vệ. Chỉ cắt khi có lệnh; giữ tốc độ ≤ 30 km/h theo quy định [I]. Bấm lại để bật ATC.'); return 'off'; }
    T.atcArm = W.t; W.say('warn', 'CẮT ATC? Bấm A (hoặc nút ATC) lần nữa trong 4 giây để xác nhận.'); return 'arm';
  }
  function confirmATC(T) { if (T.atc) T.confirmed = true; }
  // phát thanh trấn an hành khách (giảm bất an); hồi lại sau 45 s
  function announcePA(T) {
    const W = T.W; if (W.t - T.paAt < 45) { W.say('info', 'Vừa phát thanh xong, đợi thêm ' + Math.ceil(45 - (W.t - T.paAt)) + ' s.'); return false; }
    T.paAt = W.t; T.anx = Math.max(0, T.anx - 45); W.paCount = (W.paCount || 0) + 1; W.say('stop', 'Đã phát thanh cho hành khách (mức bất an giảm).'); W.paEvent = W.t; return true;
  }
  function answerDecision(W, which) {
    const d = W.decision; if (!d) return false; const o = which === 'a' ? d.a : d.b; W.decision = null; o.fn(W); W.decisions = (W.decisions || 0) + 1; return true;
  }
  function requestClose(T) {
    const W = T.W;
    if (T.phase !== 'dwell' || T.v > 0.05 || T.door !== 'open') return false;
    if (T.coup) { if (!T.isLead) W.say('warn', 'Chưa thể đóng cửa: đang ' + (T.coup.to.parts ? 'ghép' : 'tách') + ' toa (còn ' + Math.ceil(T.coup.end - W.t) + ' s)'); return false; }
    if (T.k > 0 && T.dwellT < 20) { if (!T.isLead) W.say('warn', 'Chưa thể đóng cửa (cần mở cửa ≥ 20 s)'); return false; }
    T.door = 'closing'; T.doorT = 0; T.doorDur = 9 + (T.k === 0 ? 0 : W.rnd() * 6);
    T.willReopen = T.doorFaultOnce || W.rnd() < W.diff.reopen; T.doorFaultOnce = false;
    if (!T.isLead) W.say('info', 'Trưởng tàu: bắt đầu đóng cửa...');
    return true;
  }
  function doorStep(T, dt) {
    if (T.door !== 'closing') return;
    const W = T.W; T.doorT += dt;
    if (T.doorT >= T.doorDur) {
      if (T.willReopen) { T.door = 'open'; T.willReopen = false; T.dwellT = Math.max(T.dwellT, 20); W.say('warn', 'Trưởng tàu: cửa bị kẹt (hành khách/cửa lỗi), mở lại. Đóng cửa lại (Enter).'); W.faults = (W.faults || []).filter(f => f.kind !== 'door'); }
      else { T.door = 'closed'; W.say('info', 'Đèn ĐÓNG CỬA sáng. Được khởi hành: kéo cần gia tốc.'); if (T.k === 0 && !T.started) { T.started = true; W.running = true; } }
    }
  }
  // Ghép / tách toa của tàu mini-Shinkansen tại Fukushima (Yamabiko + Tsubasa) và Morioka (Hayabusa + Komachi). Thời gian lấy từ thời gian dừng trong lịch [I]
  function startCoupling(T, mk) {
    if (!T.cp || T.cp.done || mk.i !== T.cp.i) return;
    const W = T.W, to = VEH[T.cp.v], plan = mk.arr != null && mk.dep != null ? mk.dep - mk.arr : 360, dur = clamp(plan - 90, 100, 300);
    T.coup = { end: W.t + dur, to }; T.cp.done = true;
    if (!T.isLead) W.say('info', to.parts ? `Ghép toa: ${VEH[to.parts[1]].name} nối vào đoàn ${VEH[to.parts[0]].name}. Chờ nối xong (~${Math.round(dur)} s), đừng khởi hành.` : `Tách toa: ${VEH[T.veh.parts ? T.veh.parts[0] : 'E5'].name} tách khỏi đoàn, ${to.name} chạy tiếp một mình. Chờ tách xong (~${Math.round(dur)} s).`);
  }
  function coupStep(T) {
    if (!T.coup || T.W.t < T.coup.end) return;
    T.veh = T.coup.to; const W = T.W; T.coup = null;
    if (!T.isLead) W.say('stop', T.veh.parts ? `Ghép xong: đoàn ${T.veh.name} (${T.veh.cars} toa, ${Math.round(T.veh.len)} m). Được khởi hành.` : `Tách xong: còn ${T.veh.name} (${T.veh.cars} toa, ${Math.round(T.veh.len)} m) chạy tiếp. Được khởi hành.`);
  }
  function departBlock(T) {
    const W = T.W, hold = T.holds[T.k];
    if (hold != null && W.t < hold) return 'Đang giữ tàu theo lệnh điều độ (còn ' + Math.ceil(hold - W.t) + ' s)';
    if (T.waitFor && T.waitFor.train.phase !== 'end' && T.waitFor.train.x < T.waitFor.s + 120) return 'Chờ ' + T.waitFor.train.label + ' vượt qua ga';
    if (T.cut) return 'Mất điện / kiểm tra sau sự cố';
    if (T.coup) return (T.coup.to.parts ? 'Đang ghép toa' : 'Đang tách toa') + ' (còn ' + Math.ceil(T.coup.end - W.t) + ' s)';
    return null;
  }
  function departNow(T, silent) {
    const W = T.W;
    if (T.phase !== 'dwell' || T.v > 0.05) return false;
    const blk = T.k > 0 ? departBlock(T) : null;
    if (blk) { if (!silent && !T.isLead && W.t - (T.lastBlockMsg || -99) > 6) { W.say('warn', blk); T.lastBlockMsg = W.t; } return false; }
    if (T.waitFor) T.waitFor = null;
    const mk = T.M[T.k], dep = mk.dep != null ? mk.dep : 0;
    if (T.holds[T.k] != null && T.holds[T.k] > dep) T.excused += T.holds[T.k] - Math.max(dep, T.arrT);
    if (!T.isLead && T.k > 0 && mk.dep != null && W.t < mk.dep - 0.5) { T.earlyDep += mk.dep - W.t; T.log.push(['EARLY', W.t, 'Khởi hành sớm']); W.say('warn', `Khởi hành sớm ${(mk.dep - W.t).toFixed(0)} s`); }
    T.started = true; T.phase = 'run'; return true;
  }

  function step(T, dt, input) {
    if (T.phase === 'end') return;
    const W = T.W, D = W.diff, M = T.M, veh = T.veh, mass = massOf(T);
    let cmd = input && input.cmd !== undefined ? input.cmd : handleCmd(T);
    T.allowed = allowedSpeed(T);
    if (T.cs) {
      if (T.phase !== 'run' || T.atc || T.cut) cancelCS(T, T.atc ? 'ATC phanh' : '');
      else { const vset = Math.min(T.csSet, Math.max(0, T.allowed - 3 / 3.6)), err = vset - T.v; cmd = clamp((resistOf(T, T.v) + mass * 9.81 * T.grade / 1000) / tractiveOf(T, T.v) + 0.6 * err, -0.25, 1); }
    }
    if (T.vcbUntil > W.t && cmd > 0) cmd = 0;                                    // máy cắt chính nhảy: mất lực kéo
    if (T.cut) { cmd = EBCMD(T); T.atc = false; }
    else if (T.atcOn === false) { T.atc = false; T.needConfirm = false; }      // ATC đang cắt: không có phanh tự động
    else {
      if (!T.atc && T.v > T.allowed + (T.isLead ? 0.3 : D.atcOver) && T.v > 0.5) {
        T.atc = true; T.atcOk = 0; T.confirmed = false;
        const grace = W.zones.some(z => z.kind === T.why && W.t - z.tA < 45 && W.t >= z.tA) || (T.why === 'lead' && W.t - (W.leadStopAt || -999) < 60) || T.why === 'eqk' || (T.why === 'stop' && W.t - (T.holdAt || -999) < 60) || W.t - (T.orderAt || -999) < 60;
        if (!grace) T.atcCount++;
        if (!T.isLead) T.log.push(['ATC', W.t, 'ATC phanh tự động (' + T.why + ')' + (grace ? ' — không tính lỗi' : '')]);
      }
      if (T.atc) {
        if (T.v <= T.allowed - 0.8) {
          T.atcOk += dt; const need = 0;          // ATC tự nhả khi tốc độ đã xuống dưới giới hạn (không còn nút xác nhận)
          if (T.confirmed || T.atcOk >= need) { T.atc = false; T.atcOk = 0; T.confirmed = false; T.needConfirm = false; } else T.needConfirm = true;
        } else { T.atcOk = 0; T.needConfirm = false; }
      } else T.needConfirm = false;
      if (T.atc) cmd = Math.min(cmd, -1);
    }
    if (T.phase === 'dwell') {
      coupStep(T);
      doorStep(T, dt);
      if (T.door === 'closed' && cmd > 0.01) { if (!departNow(T)) cmd = 0; }
      if (T.phase === 'dwell') cmd = Math.min(cmd, 0);
    }
    T.notch = T.bk > 0 ? -T.bk : T.pw; T.cmd = cmd;
    const rate = T.isLead ? 1 : D.rate, r = rate * dt, rUp = (T.f >= 0 && cmd > T.f ? 0.6 * rate : rate) * dt;
    T.f += Math.max(-r, Math.min(rUp, cmd - T.f));
    // độ dốc, nhiệt má phanh, hiệu suất phanh
    T.grade = T.phase === 'dwell' ? 0 : gradeAt(W, T.x);
    const fade = 1 - 0.35 * clamp((T.bt - 0.8) / 0.5, 0, 1);
    const Rg = mass * 9.81 * T.grade / 1000, Rv = T.v > 0.01 ? resistOf(T, T.v) : 0;
    let a, Ft = 0, aBr = 0;
    if (T.f >= 0) { Ft = T.f * tractiveOf(T, T.v); a = (Ft - Rv - Rg) / mass; } else { aBr = -T.f * veh.aB7 * fade; a = -aBr - (Rv + Rg) / mass; }
    if (T.v <= 0 && a < 0) a = 0;
    if (T.phase === 'dwell') { a = 0; T.v = 0; }
    const prevA = T.a, v0 = T.v;
    T.v = Math.max(0, T.v + a * dt); T.x += T.v * dt; T.a = a;
    // nhiệt phanh (má phanh nóng khi dùng phanh đĩa; tái sinh chia bớt ở tốc độ cao; phanh khẩn không tái sinh) và điện năng
    if (aBr > 0 && T.v > 0.2) { const rg = T.f < -1.05 ? 0 : (T.v > 25 ? 0.7 : T.v > 12 ? 0.35 : 0.05); T.bt += 0.0004 * (1 - rg) * aBr * T.v * dt; T.regen += aBr * mass * T.v * rg * 0.75 * dt / 3.6e6; }
    T.bt = Math.max(0, T.bt - 0.003 * (1 + T.v / 30) * T.bt * dt); if (T.bt > (T.btMax || 0)) T.btMax = T.bt;
    if (Ft > 0) T.kwh += Ft * T.v / 0.9 * dt / 3.6e6;
    if (T.horn > 0) T.horn = Math.max(0, T.horn - dt);
    deadStep(T); noteStep(T); xingStep(T);
    // bất an của hành khách khi đứng giữa đường
    if (!T.isLead) {
      if (T.phase === 'run' && T.v < 0.3 && W.running) { T.anx = Math.min(100, T.anx + dt * 100 / 900); } else if (T.anx > 0) T.anx = Math.max(0, T.anx - dt * 0.4);
      T.anxMax = Math.max(T.anxMax, T.anx);
      if (T.anx >= 100 && !T.panic) { T.panic = true; W.say('bad', 'Hành khách hoảng loạn và đòi sơ tán! Hãy phát thanh trấn an (M) và báo điều độ.'); T.anx = 60; }
      if (T.v > 0.5 && !T.atc && !T.cut) { const jerk = (a - prevA) / dt; if (Math.abs(jerk) > 0.7) T.jerkTime += dt; T.comfort += Math.max(0, Math.abs(jerk) - 0.7) * dt; }
      if (W.rainHere && !T.wiper && T.v > 5) T.wiperBad += dt;
      if (T.atcOn === false && T.v > 30 / 3.6) T.atcOffBad += dt;                // cắt ATC mà chạy quá 30 km/h
      if (T.lamp === 'off' && T.v > 5 && needsLight(W, T)) T.lampBad += dt;           // tắt đèn pha khi trong hầm / ban đêm
      checkRoadEvents(T);
      if (T.v < 0.5 && T.phase === 'run' && W.fireActive && inTunnel(W, T.x) && !W.fireTunnelDone) {
        if (atRefuge(W, T.x)) { W.fireTunnelDone = true; W.say('stop', 'Dừng tại điểm cứu hộ (定点) trong hầm: đúng quy trình hầm Seikan, sơ tán qua đường hầm cứu hộ.'); }
        else { T.fireTunnel = 1; W.fireTunnelDone = true; W.say('bad', 'ĐÃ DỪNG TRONG HẦM khi có cháy! (nguyên tắc: ra khỏi hầm rồi mới dừng)'); }
      }
      if (W.trace && T.phase !== 'end' && Math.floor((W.t) ) !== Math.floor(W.t - dt) && W.running) T.trace.push([Math.round(W.t), Math.round(T.x), +(T.v * 3.6).toFixed(1), +(T.allowed * 3.6).toFixed(1), +T.pw, T.bk]);
    }
    if (!T.isLead && T.phase === 'run' && T.why !== 'line' && T.why !== 'stop' && T.free > 1) T.excused += dt * Math.max(0, 1 - T.v / T.free);
    if (T.phase === 'run') {
      const j = nextTarget(T), mk = M[j];
      if (T.v < 0.05 && Math.abs(T.x - mk.s) <= G.stopTol + 5) {
        T.v = 0; T.f = 0; T.k = j; T.arrT = W.t; T.atMark = true; T.door = (T.isLead || mk.mainStop) ? 'closed' : 'open'; T.doorT = 0; T.cs = false;
        if (mk.mainStop && !T.isLead) W.say('bad', `Dừng ở ĐƯỜNG CHÍNH tại ${mk.name} (quá gần để rẽ ghi sang đường sân ga): không có sân ga bên cạnh, cửa KHÔNG mở. Chờ lệnh điều độ rồi chạy tiếp.`);
        const e = T.x - mk.s, planned = mk.arr != null ? mk.arr : mk.pt;
        if (!T.isLead) {
          const res = { station: mk.name, err: e, delay: planned != null ? W.t - planned : 0, excused: T.excused, atc: T.atcCount, extra: !mk.stop, t: W.t };
          T.results.push(res);
          W.say('stop', `${mk.name}: lệch ${e >= 0 ? '+' : ''}${e.toFixed(1)} m` + (planned != null ? `, ${res.delay >= 0 ? 'trễ' : 'sớm'} ${Math.abs(res.delay).toFixed(0)} s` : '') + (j < M.length - 1 ? '. Cửa mở.' : ''));
          const pl = W.passers && W.passers[j];
          if (pl && pl.length) W.say('info', `${mk.name}: ${pl.map(p => p.label + ' thông qua ' + fmtT(p.t)).join(', ')} (trên đường thông qua). Ta ở đường tránh.`);
        } else if (W.net) { T.lastArrDelay = W.t - (mk.arr != null ? mk.arr : (mk.pt != null ? mk.pt : W.t)); T.results.push({ station: mk.name, delay: T.lastArrDelay, t: W.t }); }
        if (T.forced === j) T.forced = -1;
        if (j === M.length - 1) { T.phase = 'end'; if (!T.isLead) T.finished = true; }
        else { T.phase = 'dwell'; T.dwellT = 0; startCoupling(T, mk); }
      } else if (T.x > mk.s + G.stopTol + 80) {
        T.phase = 'end';
        if (!T.isLead) { T.finished = true; T.failed = true; T.log.push(['FAIL', W.t, 'Chạy quá ga']); W.say('bad', 'Chạy quá ga ' + mk.name); T.results.push({ station: mk.name, err: T.x - mk.s, delay: NaN, overrun: true }); }
      }
    }
    if (T.phase === 'dwell') T.dwellT += dt; else T.atMark = false;
    if (T.isLead && W.net && T.phase === 'run' && T.allowed < T.free - 1 && T.why === 'lead') T.blockedT += dt;
  }
  function checkRoadEvents(T) {
    const W = T.W;
    for (const z of W.workers || []) {
      if (z.checked || T.x <= z.s1) continue; z.checked = true;
      if (z.hornOK) W.say('info', 'Đã bấm còi báo hiệu khi qua khu có nhân viên làm việc.'); else { T.hornPen += 4; W.say('bad', 'Quên bấm còi khi qua khu có nhân viên làm việc trên đường.'); }
    }
    for (const an of W.animals || []) {
      if (!an.active || an.resolved || T.x < an.s - 120) continue; an.resolved = true;
      if (an.hornOK) W.say('info', 'Con vật chạy khỏi đường ray khi nghe còi. An toàn.');
      else { T.animalHit++; W.shakeAt = W.t; W.shakeAmp = 5; T.cut = true; W.eqkActive = true; W.eqkRelease = W.t + 360 + W.rnd() * 240; W.recoverText = 'Kiểm tra xe và đường xong sau va chạm động vật.'; W.recoverV = 120; W.say('bad', 'VA CHẠM ĐỘNG VẬT: phanh khẩn cấp. Dừng kiểm tra đầu máy và đường.'); }
    }
  }
  function plannedTime(T) {
    const M = T.M;
    if (T.phase !== 'run') { const m = M[Math.min(T.k, M.length - 1)]; return m.dep != null ? m.dep : (m.arr != null ? m.arr : T.W.t); }
    const a = T.k; let b = a + 1; while (b < M.length - 1 && M[b].pt == null) b++;
    const ta = M[a].dep != null ? M[a].dep : M[a].pt, tb = M[b].pt, p = clamp((T.x - M[a].s) / (M[b].s - M[a].s), 0, 1);
    return ta + (tb - ta) * p;
  }

  // ---- Tự lái (tàu chạy trước/tàu mạng, và chế độ xem mẫu) --------------------
  function autoDepart(T) {
    if (T.phase !== 'dwell') return;
    const mk = T.M[T.k], dep = mk.dep != null ? mk.dep : 0, W = T.W;
    if (T.isLead) { if (!T.started) { if (W.t >= dep) { T.started = true; departNow(T, true); } } else if (T.dwellT >= 20 && W.t >= dep) departNow(T, true); return; }
    if (T.door === 'open') {
      if (T.k === 0 && !T.started) requestClose(T);
      else if (T.k > 0 && T.dwellT >= 20 && W.t >= Math.max(dep, T.holds[T.k] || 0) - 10) requestClose(T);
    }
  }
  function autoHorn(T) {       // còi tự động khi tới gần nhân viên làm việc / thú rừng trên đường (không còn nút còi)
    const W = T.W;
    for (const z of W.workers || []) if (!z.checked && T.x >= z.s0 - 600 && T.x <= z.s0 + 200) honk(T);
    for (const an of W.animals || []) if (an.active && !an.resolved && T.x >= an.s - 1200 && T.x <= an.s - 800) honk(T);
  }
  function autoExtras(T) {
    const W = T.W; T.wiper = !!W.rainHere;
    const p = (W.pending || []).find(m => !m.done); if (p && W.t - p.t > 6) ackOldest(W);
    if (W.decision && W.t - W.decision.t0 > 8) answerDecision(W, 'a');
    if (T.anx > 40 && T.v < 0.5 && W.t - T.paAt > 45) announcePA(T);
    if (T.needConfirm || T.atc) confirmATC(T);
    for (const z of W.workers || []) if (!z.checked && T.x >= z.s0 - 600 && T.x <= z.s0 + 200) honk(T);
    for (const an of W.animals || []) if (an.active && !an.resolved && T.x >= an.s - 1200 && T.x <= an.s - 800) honk(T);
  }
  function autopilot(T, margin) {
    const c = autoRaw(T, margin);
    if (c === undefined) { T._ap = 0; return c; }
    const p = T._ap || 0, lim = (c < p ? 0.8 : 0.35) * 0.05;
    T._ap = Math.max(p - lim, Math.min(p + lim, c)); return T._ap;
  }
  function autoRaw(T, margin) {
    if (!T.isLead && T.phase === 'dwell' && T.door === 'closed') return 0.3;
    if (T.phase !== 'run') return undefined;
    const W = T.W, j = nextTarget(T), mk = T.M[j], d = mk.s - T.x, v = T.v;
    if (deadAt(W, T.x, 450, 30) && d > 600) return 0;                           // đoạn cách điện: trôi
    const m = (margin === undefined ? (T.isLead ? 4 : (W.diff.atcOver * 3.6 < 1 ? 9 : 4)) : margin) / 3.6;
    let vT = Math.max(0, T.allowed - m);
    { const xg = xingAhead(W, T, 2500); if (xg) { const vx = Math.sqrt(2 * 0.45 * Math.max(0, xg.s - 90 - T.x)); if (v > vx) return -0.9; vT = Math.min(vT, vx); } }          // xe kẹt ở đường ngang: dừng trước đường ngang
    let soft = false;                                                    // giới hạn do kế hoạch đúng giờ (không phải an toàn): chỉ trôi/phanh nhẹ khi vượt đáng kể
    const arr = mk.arr != null ? mk.arr : (mk.pt != null && mk.stop ? mk.pt : null), remT = arr != null ? arr - W.t : 0;
    const ai = T.isLead && W.net, slack = ai ? 50 : 20, fac = ai ? 1.12 : 1.06;
    if (arr != null && remT > slack && T.forced < 0 && !(ai && W.net.catchUp)) { const vNeed = (d + 600) / Math.max(remT - slack, 1); const vN = Math.max(vNeed * fac, 15); if (vN < vT) soft = true; vT = Math.min(vT, vN); }
    const lead = Math.max(d - v * 1.6, 0);
    const vL = Math.sqrt(2 * 0.55 * lead) + 0.5, curveLim = vL < vT; if (curveLim) soft = true; vT = Math.min(vT, vL);
    if (d < 400 && v * v / (2 * Math.max(d - v * 1.2, 0.3)) > 0.35) { const need = (v * v) / (2 * Math.max(d - v * 1.2, 0.3)); return -Math.min(1, Math.max(0.03, need / T.veh.aB7)); }
    if (d < 60) { if (v < 0.25 && d > 0.8) return 0.04; const need = (v * v) / (2 * Math.max(d, 0.15)); return -Math.min(1, Math.max(v < 0.25 ? 0.01 : 0.05, need / T.veh.aB7)); }
    const err = vT - v;
    if (curveLim && v > vL - 0.5) return -Math.min(0.9, 0.12 + 0.6 * (v - vL + 0.5));        // bám đường cong phanh về ga: phanh liên tục theo độ lệch, không nhấp nhả
    if (err < (soft ? -0.8 : -0.15)) { T._apBrk = 1; return -Math.min(0.9, (-err) * 0.6 + 0.05); }
    if (T._apBrk) { if (err < (soft ? -0.2 : 0.12)) return -0.09; T._apBrk = 0; }          // đã phanh vì quá tốc độ: trôi (N) cho tới khi thấp hơn hẳn mới kéo lại, tránh nhấp nháy B1 ↔ 0
    return Math.max(0, Math.min(1, (resistOf(T, v) + massOf(T) * 9.81 * T.grade / 1000) / tractiveOf(T, v) + 0.6 * err));
  }

  // ---- Đường đơn (mini-Shinkansen) và đường ngang
  // trọng số "đường đơn" tại s (0..1, chuyển tiếp 300 m); singleEff trừ phần nằm trong vùng ga (ga có đường tránh để tàu ngược chiều gặp nhau)
  const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function singleW(W, s) {
    const L = W.line; if (!L.single || !L.single.length) return 0; let w = 0;
    for (const [k0, k1] of L.single) { const a = sOfKm(k0, W.dir, L.kmEnd), b = sOfKm(k1, W.dir, L.kmEnd), lo = Math.min(a, b), hi = Math.max(a, b); w = Math.max(w, smooth01(lo, lo + 300, s) * smooth01(hi, hi - 300, s)); }
    return w;
  }
  function singleEff(W, s) {
    const w = singleW(W, s); if (w <= 0) return 0; const Ly = root.Layout; let cov = 0;
    if (Ly && W.player) for (const m of W.player.M) cov = Math.max(cov, Ly.spread(s, m.s)); else if (Ly && W.net) for (const m of (W.net.trains[0] ? W.net.trains[0].M : [])) cov = Math.max(cov, Ly.spread(s, m.s));
    return w * (1 - cov);
  }
  const worldXings = (L, dir) => (L.xings || []).map(k => ({ s: sOfKm(k, dir, L.kmEnd), blocked: false, until: 0, hit: false, cleared: false })).sort((a, b) => a.s - b.s);
  function xingStep(T) {
    const W = T.W; if (T.isLead || !W.xings || !W.xings.length) return;
    if (W.armedX && T.x >= W.armedX.s - 1000 + 0.0) { const g = W.armedX.xg; W.armedX = null; g.blocked = true; g.until = W.t + 150 + W.rnd() * 90; W.xingAt = W.t;
      W.say('bad', 'ĐƯỜNG NGANG PHÍA TRƯỚC: đèn đỏ nhấp nháy (特殊信号発光機): có xe kẹt trên đường ngang! Phanh khẩn cấp ngay (EB), dừng trước đường ngang.'); }
    for (const g of W.xings) {
      if (g.blocked && W.t >= g.until && !g.cleared && T.x < g.s + 5) { g.blocked = false; g.cleared = true; W.say('info', 'Đường ngang đã thông (xe được dời đi). Được chạy tiếp, ≤ 25 km/h qua đường ngang.'); }
      if (g.blocked && !g.hit && T.x >= g.s - 4 && T.x < g.s + 60) {
        g.hit = true; g.blocked = false; T.xingHit++; W.shakeAt = W.t; W.shakeAmp = 6; T.cut = true; W.eqkActive = true; W.eqkRelease = W.t + 420 + W.rnd() * 240; W.recoverText = 'Kiểm tra xe và đường sau va chạm tại đường ngang.'; W.recoverV = 100;
        W.say('bad', 'VA CHẠM TẠI ĐƯỜNG NGANG: xe ô tô bị kẹt, tàu không kịp dừng. Phanh khẩn cấp, dừng kiểm tra.');
      }
    }
  }
  const xingAhead = (W, T, dist) => (W.xings || []).find(g => g.blocked && g.s > T.x - 5 && g.s - T.x < dist);

  // ---- Đoạn cách điện đổi tần số (Hokuriku: 50/60 Hz) [N: Wikipedia JP 北陸新幹線 — 新軽井沢SP, 新高田SP, 新糸魚川SP; vị trí km là I]
  // Tàu phải cắt lực kéo (về N) trước đoạn này và trôi qua; kéo lực khi vào đoạn => hồ quang, máy cắt chính nhảy, mất lực 12 s.
  function deadSections(L, dir) {
    return ((L.meta && L.meta.freq) || []).map(f => {
      const a = sOfKm(f.km - f.len / 2000, dir, L.kmEnd), b = sOfKm(f.km + f.len / 2000, dir, L.kmEnd), hz = dir === 'up' ? [f.hz[1], f.hz[0]] : f.hz;
      return { s0: Math.min(a, b), s1: Math.max(a, b), hzA: hz[0], hzB: hz[1], label: f.label, warned: false, hit: false };
    }).sort((p, q) => p.s0 - q.s0);
  }
  const atRefuge = (W, x) => ((W.line.meta && W.line.meta.refuges) || []).some(k => Math.abs(sOfKm(k, W.dir, W.line.kmEnd) - x) < 400);      // điểm cứu hộ (定点) trong hầm dài: dừng ở đó khi cháy là đúng quy trình [N: Seikan 竜飛・吉岡]
  const deadAt = (W, x, pre, post) => (W.dead || []).find(d => x >= d.s0 - pre && x <= d.s1 + post);
  // ghi chú dọc tuyến: hiện một dòng thông báo khi tàu tới gần (meta.notes = [{km, text}], km theo chiều tăng; hiện theo chiều chạy)
  function noteStep(T) {
    const W = T.W; if (T.isLead) return; const ns = W.line.meta.notes; if (!ns) return; W.notesShown = W.notesShown || {};
    ns.forEach((n, i) => { if (W.notesShown[i]) return; const s = sOfKm(n.km, W.dir, W.line.kmEnd); if (T.x >= s - 3000 && T.x < s + 500 && !(n.dir && n.dir !== W.dir)) { W.notesShown[i] = 1; W.say('info', n.text); } });
  }
  function deadStep(T) {
    const W = T.W; if (T.isLead) return;
    for (const d of W.dead || []) {
      if (!d.warned && T.x >= d.s0 - 2500 && T.x < d.s0) { d.warned = true; W.say('warn', `Phía trước: đoạn cách điện đổi tần số ${d.hzA}→${d.hzB} Hz (${d.label}). Về N (cắt lực kéo) trước vạch và chạy trôi qua.`); }
      if (T.x >= d.s0 && T.x <= d.s1 && !d.hit && T.f > 0.05 && !T.cut) {
        d.hit = true; T.deadViol++; T.vcbUntil = W.t + 12; W.shakeAt = W.t; W.shakeAmp = 2;
        W.say('bad', `Vào đoạn cách điện (${d.label}) khi đang kéo lực: hồ quang, máy cắt chính nhảy. Mất lực kéo 12 s. Lần sau về N trước vạch.`);
      }
    }
  }

  // ---- Thế giới -----------------------------------------------------------------
  function baseWorld(lineId, dir, diffKey, seed, weather) {
    const L = lineOf(lineId), diff = DIFF[diffKey || 'normal'];
    const W = { t: 0, line: L, lineId, dir, diff, diffKey: diffKey || 'normal', zones: [], msgs: [], events: [], lead: null, running: false, weather: weather || 'auto', seed: seed || 1,
      pending: [], faults: [], workers: [], animals: [], wires: [], ackPen: 0, rainHere: false, rnd: rng((seed || 1) * 7919 + 13), netScore: 0, decision: null, trace: true,
      say(kind, text, o) { const m = { t: this.t, kind, text }; this.msgs.push(m); if (kind !== 'pa') this.newMsg = true; if (o && o.ack) { m.ack = true; this.pending.push(m); } } };
    W.dead = deadSections(L, dir); W.xings = worldXings(L, dir);
    return W;
  }
  function createWorld(lineId, trip, opts) {
    opts = opts || {};
    const rnd = rng(opts.seed || 1), W = baseWorld(lineId, trip.dir, opts.diff, opts.seed, opts.weather), L = W.line;
    W.trip = trip; W.catalog = catalogOf(L, trip.dir);
    const M = fillPlan(trip.M.map(m => Object.assign({}, m)));
    W.load = opts.load != null ? opts.load : 0.45 + W.rnd() * 0.55;
    W.player = newTrain(M, W, { veh: trip.rec.v, label: trip.label, load: W.load, cp: trip.rec.cp });
    W.passers = passers(L, W.catalog, { ...trip, M });
    const leadRec = opts.lead === false ? null : pickLead(L, W.catalog, trip);
    if (leadRec) {
      const seq = trainSeq(leadRec);
      const LM = fillPlan(seq.map(e => ({ name: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, trip.dir, L.kmEnd), stop: e.stop, arr: e.arr != null ? e.arr - trip.t0 : null, dep: e.dep != null ? e.dep - trip.t0 : null })));
      LM[0].arr = null; LM[LM.length - 1].dep = null; W.leadLabel = leadRec.t + ' ' + leadRec.n;
      W.lead = newTrain(LM, W, { lead: true, veh: leadRec.v, label: W.leadLabel, load: 0.6, cp: leadRec.cp });
      W.leadStartT = LM[0].dep != null ? LM[0].dep : -600;
    }
    if (opts.events === false) { W.weatherKind = 'clear'; W.opposing = []; } else genEvents(W, M, rnd);
    W.t = W.lead ? W.leadStartT - 5 : 0;
    prerun(W);
    return W;
  }
  function advanceLead(W, dt) {
    const L = W.lead; if (!L) return;
    if (W.leadHoldUntil && W.t < W.leadHoldUntil) L.cut = true; else if (L.cut && !W.eqkActive) L.cut = false;
    autoDepart(L); const c = autopilot(L); step(L, dt, c === undefined ? {} : { cmd: c });
  }
  function prerun(W) { const dt = 0.1, saved = W.events; W.events = []; while (W.t < 0) { W.t += dt; advanceLead(W, dt); } W.t = 0; W.running = false; W.events = saved; }
  function ackOldest(W) {
    const m = (W.pending || []).find(p => !p.done); if (!m) return false; m.done = true; W.ackCount = (W.ackCount || 0) + 1;
    if (W.t - m.t > 60 && !m.timeout) { W.ackPen += 2; W.say('warn', 'Nhắc lại lệnh chậm (> 60 s): −2 điểm.'); }
    else W.say('stop', 'Đã nhắc lại lệnh với điều độ: "' + m.text.slice(0, 48) + (m.text.length > 48 ? '…' : '') + '"');
    return true;
  }
  function tick(W, dt, input, auto) {
    const T = W.player;
    if (auto) { autoDepart(T); autoExtras(T); }
    if (W.running) {
      W.t += dt; fire(W); advanceLead(W, dt);
      for (const m of W.pending) if (!m.done && !m.timeout && W.t - m.t > 120) { m.timeout = true; W.ackPen += 4; W.say('bad', 'Điều độ: KHÔNG nhận được nhắc lại lệnh! (−4 điểm). Hãy nhấn Y để nhắc lại.'); }
      if (W.decision && W.t - W.decision.t0 > W.decision.timeout) { W.say('warn', 'Hết thời gian trả lời: coi như từ chối.'); answerDecision(W, 'b'); }
      if (W.armedFire && T.x >= W.armedFire.s) { const af = W.armedFire; W.armedFire = null; af.fn(W); }
    }
    W.rainHere = W.zones.some(z => z.kind === 'rain' && !z.hold && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 && T.x < z.s1);
    if (auto) {
      const c = autopilot(T);
      if (c !== undefined) { if (c >= 0) { T.pw = Math.round(c * 13); T.bk = 0; } else { T.pw = 0; T.bk = c < -1.05 ? 8 : Math.max(1, Math.round(-c * 7)); } }
      step(T, dt, c === undefined ? {} : { cmd: c });
    } else { autoHorn(T); step(T, dt, input || {}); }
    if (W.eqkActive && W.t >= W.eqkRelease) {
      W.eqkActive = false;
      for (const X of allTrains(W)) { X.cut = false; if (X === T) W.zones.push({ s0: X.x - 2000, s1: X.x + 12000, v: (W.recoverV || 70) / 3.6, tA: W.t, tB: W.t + 1500, kind: 'eqk', label: 'chạy kiểm tra sau sự cố' }); }
      W.say('info', W.recoverText || 'Điều độ: kiểm tra xong. Được chạy lại, tốc độ ≤ 70 km/h trong 12 km đầu.'); W.recoverText = null; W.recoverV = null;
    }
    if (W.fireActive && W.t > W.fireEnd) W.fireActive = false;
  }
  function fire(W) { for (const e of W.events) if (!e.done && W.t >= e.at) { e.done = true; e.fire(W); } }
  const fmtT = s => { s = Math.round(s); const m = Math.floor(s / 60), r = ((s % 60) + 60) % 60; return m + ':' + String(r).padStart(2, '0'); };

  // ---- Sự kiện ----------------------------------------------------------------
  function startHold(W, sEnd, dur, why) {
    const rel = W.t + dur; W.lastHold = { t: W.t, why: why || 'khác', dur, seq: ((W.lastHold && W.lastHold.seq) || 0) + 1 };
    for (const T of allTrains(W)) {
      if (!T || T.phase === 'end' || T.x >= sEnd) continue;
      T.holdAt = W.t; let jj = -1; const brk = T.v * T.v / (2 * 0.6) + 300;
      for (let j = T.k + (T.phase === 'dwell' ? 0 : 1); j < T.M.length; j++) { if (T.M[j].s - T.x > brk || (T.phase === 'dwell' && j === T.k)) { jj = j; break; } }
      if (jj < 0) jj = T.M.length - 1;
      if (jj === T.k && T.phase === 'dwell') { T.holds[jj] = Math.max(T.holds[jj] || 0, rel); continue; }
      if (!T.M[jj].stop) T.forced = jj;
      if (T.forced === jj && stationDiverts(W.line, T.M[jj].i, W.dir)) {       // (ga không có lịch dừng) còn kịp giảm tốc xuống tốc độ qua ghi và rẽ vào đường sân ga không?
        const need = G.turnoutIn + Math.max(0, (T.v * T.v - G.turnoutV * G.turnoutV) / (2 * G.aATC)) + 150;
        if (T.M[jj].s - T.x < need) { T.M[jj].mainStop = true; if (T === W.player) W.say('warn', `Dừng khẩn tại ${T.M[jj].name}: quá gần để rẽ ghi, tàu sẽ dừng ở ĐƯỜNG CHÍNH trước/ngay ga (không có sân ga).`); }
      }
      T.holds[jj] = Math.max(T.holds[jj] || 0, rel);
    }
  }
  function genEvents(W, M, rnd) {
    const D = W.diff, lastS = M[M.length - 1].s, firstS = M[0].s, span = Math.abs(lastS - firstS), sgn = lastS >= firstS ? 1 : -1;
    const planT = M[M.length - 1].arr || 600;
    const pts = []; M.forEach(m => { if (m.arr != null) pts.push([m.arr, m.s]); if (m.dep != null) pts.push([m.dep, m.s]); if (m.pt != null && !m.stop) pts.push([m.pt, m.s]); }); pts.sort((a, b) => a[0] - b[0]);
    const sAtTime = t => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, s0_] = pts[i - 1], [t1, s1_] = pts[i]; return t1 === t0 ? s1_ : s0_ + (s1_ - s0_) * (t - t0) / (t1 - t0); } return pts[pts.length - 1][1]; };
    const ev = (at, fn) => W.events.push({ at, fire: fn, done: false });
    const stopsIdx = M.map((m, k) => m.stop && k > 0 && k < M.length - 1 ? k : -1).filter(k => k >= 0), usedJ = new Set();
    const pickJ = list => { const c = list.filter(k => !usedJ.has(k)); if (!c.length) return -1; const j = c[Math.floor(rnd() * c.length)]; usedJ.add(j); return j; };
    let weather = W.weather; if (weather === 'auto') { const r = rnd(); weather = r < 0.3 ? 'clear' : r < 0.62 ? 'rain' : r < 0.76 ? 'typhoon' : r < 0.88 ? 'snow' : 'eqk'; }
    W.weatherKind = weather;
    const n = D.events[0] + Math.floor(rnd() * (D.events[1] - D.events[0] + 1)), pool = [];
    if (weather === 'eqk' || rnd() < D.eqk) pool.push('eqk');
    if (weather === 'snow') {
      // vùng tuyết: Sekigahara–Maibara (Tokaido) và vùng núi Tohoku phía bắc; chỉ có [I]
      const zs = W.line.meta.snow || [];
      for (const [k0, k1, v, lab] of zs) { const a = sOfKm(k0, W.dir, W.line.kmEnd), b = sOfKm(k1, W.dir, W.line.kmEnd); W.zones.push({ s0: Math.min(a, b), s1: Math.max(a, b), v: v / 3.6, tA: -1e9, tB: 1e9, kind: 'snow', label: lab }); }
      ev(0, w => w.say('info', 'Dự báo: tuyết dày ở vùng núi. Chạy chậm theo quy định (tài liệu 06 §5.3).'));
    }
    if (weather === 'rain') pool.push('rain', 'rain'); if (weather === 'typhoon') pool.push('rain', 'wind', 'rain');
    const orders = ['hold', 'skip', 'addstop', 'slow', 'workers', 'animal', 'doorfault', 'sick', 'overtake', 'planned']; if (W.lead) orders.push('leadstop');
    const rare = ['wire', 'fire'];
    while (pool.length < n) pool.push(orders[Math.floor(rnd() * orders.length)]);
    if (D.fault && rnd() < D.fault) pool.push('fault');
    for (const k of rare) if (rnd() < D.rare) pool.push(k);
    if (W.xings && W.xings.length && rnd() < 0.15 + D.rare) pool.push('xingcar');
    for (const kind of pool) {
      const at = Math.round(planT * (0.12 + rnd() * 0.6));
      if (kind === 'rain') {
        const c = sAtTime(at + 350 + rnd() * 400), hw = 20000 + rnd() * 20000, d50 = 900 + rnd() * 900, stop = rnd() < 0.4, stopDelay = 240 + rnd() * 300, stopDur = 600 + rnd() * 600;
        const ss0 = Math.min(c - hw, c + hw), ss1 = Math.max(c - hw, c + hw);
        ev(at - 240, w => w.say('info', 'Cục Khí tượng: mưa lớn sắp tới đoạn phía trước (dự báo ~50 mm/h). Chuẩn bị chạy chậm, bật gạt mưa (V).'));
        ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 70 / 3.6, tA: w.t, tB: w.t + d50, kind: 'rain', label: 'mưa ≥ 50 mm/h' }); w.say('warn', 'Mưa 50 mm/h: chạy chậm 70 km/h trong vùng mưa (tài liệu 06 §5.3). Nhấn Y để nhắc lại lệnh.', { ack: true }); });
        if (stop) ev(at + stopDelay, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + stopDur, kind: 'rain', hold: true, label: 'mưa ≥ 60 mm/h' }); startHold(w, ss1, stopDur, 'rain'); w.say('bad', `Mưa ≥ 60 mm/h: DỪNG chạy. Về ga gần nhất rồi chờ lệnh (~${fmtT(stopDur)}). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'wind') {
        const c = sAtTime(at + 300 + rnd() * 400), hw = 25000 + rnd() * 20000, dur = 600 + rnd() * 900, ss0 = Math.min(c - hw, c + hw), ss1 = Math.max(c - hw, c + hw);
        ev(at - 300, w => w.say('info', 'Cảnh báo gió mạnh 25–30 m/s ở đoạn phía trước.'));
        ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + dur, kind: 'wind', hold: true, label: 'gió ≥ 30 m/s' }); startHold(w, ss1, dur, 'wind'); w.say('bad', `Gió ≥ 30 m/s: DỪNG chạy. Về ga gần nhất, chờ kiểm tra ray (~${fmtT(dur)}). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'eqk') {
        const at2 = Math.round(planT * (0.2 + rnd() * 0.6)), dur = 480 + rnd() * 600;
        ev(at2, w => { w.eqkAt = w.t; w.eqkActive = true; w.eqkRelease = w.t + dur + 20; for (const X of allTrains(w)) X.cut = true; w.say('bad', 'CẢNH BÁO ĐỘNG ĐẤT: cắt điện, tàu phanh khẩn cấp. Giữ nguyên, chờ kiểm tra ray và dây điện. Phát thanh trấn an hành khách (M).'); });
      } else if (kind === 'leadstop') {
        const d = 240 + rnd() * 420;
        ev(at, w => { w.leadHoldUntil = w.t + d; w.leadStopAt = w.t; w.say('warn', `Điều độ: tàu phía trước (${w.leadLabel}) dừng khẩn do hành khách bệnh, ~${fmtT(d)}. ATC sẽ giữ khoảng cách.`); });
      } else if (kind === 'hold' && stopsIdx.length) {
        const j = pickJ(stopsIdx); if (j < 0) continue;
        const extra = 60 + Math.floor(rnd() * 5) * 30, tNotice = Math.max(0, (M[j].arr || 0) - 600 - rnd() * 300);
        ev(tNotice, w => { const T = w.player; if (T.k >= j || !M[j].stop) return; const rel = (M[j].dep != null ? M[j].dep : M[j].arr) + extra; T.holds[j] = rel; w.say('warn', `Điều độ: giữ tàu tại ${M[j].name} thêm ${extra} s (chờ tàu nhanh vượt / nối chuyến). Không khởi hành trước ${fmtT(rel)}. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'skip' && stopsIdx.length > 1) {
        const j = pickJ(stopsIdx.slice(1)); if (j < 0) continue; const tNotice = Math.max(0, (M[j].arr || 0) - 700);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || !M[j].stop) return; M[j].stop = false; T.orderAt = w.t; fillPlan(M); w.say('warn', `Điều độ: THÔNG QUA ga ${M[j].name} (không dừng). Chạy tiếp tới ${M[nextTarget(T)].name}. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'addstop' || kind === 'sick') {
        const passIdx = M.map((m, k) => !m.stop && k > 0 && k < M.length - 1 ? k : -1).filter(k => k >= 0); if (!passIdx.length) continue;
        const j = pickJ(passIdx); if (j < 0) continue; const tNotice = Math.max(0, (M[j].pt || 0) - 700), dwell = kind === 'sick' ? 180 : 60;
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || M[j].stop || M[j].pt == null) return; M[j].stop = true; M[j].arr = M[j].pt; M[j].dep = M[j].pt + dwell; T.orderAt = w.t; fillPlan(M);
          const car = 1 + Math.floor(rnd() * Math.max(1, T.veh.cars));
          w.say('warn', kind === 'sick' ? `Trưởng tàu: hành khách toa ${car} bệnh đột ngột. Điều độ cho DỪNG THÊM tại ${M[j].name} (${dwell} s) để đưa cấp cứu. Phanh đúng vạch. Nhấn Y để nhắc lại lệnh.` : `Điều độ: DỪNG THÊM tại ${M[j].name} (60 s) vì tàu phía sau cần vượt. Phanh đúng vạch. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'slow') {
        const c = sAtTime(at + 500 + rnd() * 500), len = 15000 + rnd() * 15000, ss0 = Math.min(c, c + sgn * len), ss1 = Math.max(c, c + sgn * len), dur = 900 + rnd() * 900;
        ev(Math.max(0, at - 300), w => { w.zones.push({ s0: ss0, s1: ss1, v: 170 / 3.6, tA: w.t, tB: w.t + dur, kind: 'order', label: 'chạy chậm theo lệnh' }); w.say('warn', 'Điều độ: kiểm tra nền đường/thi công, chạy chậm ≤ 170 km/h trên một đoạn phía trước (xem bản đồ). Nhấn Y để nhắc lại lệnh.', { ack: true }); });
      } else if (kind === 'workers') {
        const gap = 20000 + rnd() * 10000, len = 3000;
        ev(at, w => { const T = w.player, s = T.x + sgn * gap; if ((s - lastS) * sgn > -len) return; const s0 = Math.min(s, s + sgn * len), s1 = Math.max(s, s + sgn * len);
          const z = { s0, s1, checked: false, hornOK: false }; w.workers.push(z); w.zones.push({ s0, s1, v: 230 / 3.6, tA: w.t, tB: w.t + 1500, kind: 'order', label: 'nhân viên làm việc' });
          w.say('warn', 'Điều độ: có nhân viên bảo trì làm việc cạnh đường ở phía trước (3 km). Chạy ≤ 230 km/h và BẤM CÒI (H) khi tới gần. Nhấn Y để nhắc lại lệnh.', { ack: true }); });
      } else if (kind === 'animal') {
        const gap = 18000 + rnd() * 9000;
        ev(at, w => { const T = w.player, s = T.x + sgn * gap; if ((s - lastS) * sgn > -2000) return; w.animals.push({ s, active: true, resolved: false, hornOK: false });
          w.say('warn', 'Báo từ trạm: hươu/lợn rừng xuất hiện gần đường ray phía trước. Bấm còi (H) khi còn khoảng 1 km để xua đuổi, nếu không có thể va chạm.'); });
      } else if (kind === 'doorfault') {
        ev(at, w => { const car = 1 + Math.floor(rnd() * Math.max(1, w.player.veh.cars)); w.faults.push({ car, kind: 'door', text: `Toa ${car}: cửa lỗi (không đóng hoàn toàn)`, level: 'warn', t: w.t }); w.player.doorFaultOnce = true; w.say('warn', `TIMS: toa ${car} báo lỗi cửa. Lần đóng cửa tới có thể phải mở lại.`); });
      } else if (kind === 'fault') {
        ev(at, w => { const car = 1 + Math.floor(rnd() * Math.max(1, w.player.veh.cars)); w.faults.push({ car, kind: 'hotbox', text: `Toa ${car}: nhiệt độ ổ trục cao`, level: 'bad', t: w.t }); w.zones.push({ s0: -1e9, s1: 1e9, v: 230 / 3.6, tA: w.t, tB: 1e9, kind: 'fault', label: 'nhiệt độ ổ trục cao' }); w.say('bad', `CẢNH BÁO TIMS: toa ${car} nhiệt độ bệ ổ trục cao. Hạn chế ≤ 230 km/h tới hết chuyến (tài liệu 06 §5.4). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'xingcar') {
        ev(at, w => { const T = w.player, cand = w.xings.filter(g => !g.hit && g.s > T.x + 3500 && (g.s - lastS) * sgn < 0 && Math.abs(g.s - T.x) < 25000); if (!cand.length) return; const g = cand[Math.floor(rnd() * Math.min(3, cand.length))]; w.armedX = { xg: g, s: g.s }; });
      } else if (kind === 'wire') {
        const dur = 1500 + rnd() * 1500;
        ev(at, w => { const T = w.player, s = T.x + sgn * 12000; w.wires.push({ s, tA: w.t, tB: w.t + dur }); w.zones.push({ s0: s - 1500, s1: s + 1500, v: 0, tA: w.t, tB: w.t + dur, kind: 'wire', hold: true, label: 'dây điện hỏng' }); startHold(w, s + 1500, dur, 'wire');
          w.say('bad', `SỰ CỐ DÂY ĐIỆN: dây điện võng ở phía trước, mất điện đoạn này. DỪNG chạy, về ga gần nhất, chờ khôi phục (~${fmtT(dur)}). Phát thanh trấn an (M). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'fire') {
        const doFire = w => { const car = 1 + Math.floor(rnd() * Math.max(1, w.player.veh.cars)); w.fireActive = true; w.fireEnd = w.t + 900; w.fireCar = car; const dur = 900 + rnd() * 600;
          startHold(w, 1e12, dur, 'fire'); w.faults.push({ car, kind: 'fire', text: `Toa ${car}: báo cháy/khói`, level: 'bad', t: w.t });
          w.say('bad', `BÁO CHÁY toa ${car}: nếu đang TRONG HẦM thì KHÔNG dừng, chạy ra khỏi hầm; ngoài hầm thì dừng ở ga gần nhất. Báo điều độ (Y) và phát thanh trấn an (M).`, { ack: true }); };
        ev(at, w => { // nếu sắp có hầm phía trước thì chờ tới khi tàu vào hầm
          const T = w.player; let target = null; for (const [k0, k1] of w.line.meta.tunnels) { if (k1 - k0 < 2.5) continue; const a = sOfKm(k0, w.dir, w.line.kmEnd), b = sOfKm(k1, w.dir, w.line.kmEnd), lo = Math.min(a, b), hi = Math.max(a, b); const ent = sgn > 0 ? lo : hi; if ((ent - T.x) * sgn > 3000 && (ent - T.x) * sgn < 40000 && (ent - lastS) * sgn < 0) { target = ent + sgn * 1500; break; } }
          if (target != null) { w.armedFire = { s: target, fn: doFire }; w.say('info', 'Tàu sắp vào hầm. Hãy sẵn sàng.'); } else doFire(w); });
      } else if (kind === 'overtake') {
        const cands = stopsIdx.filter(j => W.passers[j] && W.passers[j].length && !usedJ.has(j)); if (!cands.length) continue; const j = pickJ(cands), p = W.passers[j][0];
        const tNotice = Math.max(0, (M[j].arr || 0) - 500);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || !M[j].stop) return;
          w.decision = { t0: w.t, timeout: 40, text: `Điều độ đề nghị: cho ${p.label} (tàu nhanh phía sau) vượt tại ${M[j].name}. Chấp nhận giữ tàu thêm 90 s?`,
            a: { label: 'Chấp nhận (Y)', fn: w2 => { const dep = (M[j].dep != null ? M[j].dep : M[j].arr) + 90; T.holds[j] = Math.max(T.holds[j] || 0, dep); w2.netScore += 3; w2.say('stop', `Đã chấp nhận: giữ tại ${M[j].name} tới ${fmtT(dep)}. +3 điểm phối hợp.`); } },
            b: { label: 'Từ chối (N)', fn: w2 => { w2.netScore -= 3; w2.say('warn', `Đã từ chối: ${p.label} có thể bị trễ phía sau. −3 điểm phối hợp.`); } } };
          w.say('warn', w.decision.text + '  [Y] chấp nhận · [N] từ chối (40 s).'); });
      } else if (kind === 'planned') {
        if (stopsIdx.length < 2) continue; const jEnd = stopsIdx[Math.floor(stopsIdx.length * 0.5) + Math.floor(rnd() * Math.floor(stopsIdx.length * 0.5))]; if (jEnd === undefined || jEnd >= M.length - 1) continue; const tNotice = Math.max(0, (M[jEnd - 1].arr || 0) - 900);
        ev(tNotice, w => { const T = w.player; if (T.k >= jEnd - 1) return; M.length = jEnd + 1; M[jEnd].stop = true; M[jEnd].dep = null; fillPlan(M); w.trip.truncated = true; w.say('warn', `KẾ HOẠCH NGỪNG CHẠY (計画運休): do thời tiết xấu, chuyến này KẾT THÚC tại ${M[jEnd].name}. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      }
    }
    W.opposing = []; for (let t = 100 + rnd() * 120; t < planT + 900; t += 90 + rnd() * 140) W.opposing.push(Math.round(t));
    W.events.sort((a, b) => a.at - b.at);
  }


  // Tạo sự kiện có chủ đích (dùng cho bài hướng dẫn và kiểm thử). kind: rain | workers | animal | hold | overtake | eqk | wire | fire | sick | leadstop
  function inject(W, kind, o) {
    o = o || {}; const T = W.player, M = T.M, sgn = M[M.length - 1].s >= M[0].s ? 1 : -1;
    if (kind === 'rain') { const s0 = Math.min(T.x + sgn * (o.ahead || 1500), T.x + sgn * ((o.ahead || 1500) + 9000)), s1 = Math.max(T.x + sgn * (o.ahead || 1500), T.x + sgn * ((o.ahead || 1500) + 9000)); W.zones.push({ s0, s1, v: 70 / 3.6, tA: W.t, tB: W.t + 900, kind: 'rain', label: 'mưa ≥ 50 mm/h' }); W.say('warn', 'Mưa 50 mm/h: chạy chậm 70 km/h trong vùng mưa. Nhấn Y để nhắc lại lệnh.', { ack: true }); }
    else if (kind === 'workers') { const s = T.x + sgn * (o.ahead || 6000), s0 = Math.min(s, s + sgn * 3000), s1 = Math.max(s, s + sgn * 3000); W.workers.push({ s0, s1, checked: false, hornOK: false }); W.zones.push({ s0, s1, v: 230 / 3.6, tA: W.t, tB: W.t + 1500, kind: 'order', label: 'nhân viên làm việc' }); W.say('warn', 'Điều độ: có nhân viên làm việc cạnh đường phía trước. BẤM CÒI (H) khi tới gần. Nhấn Y để nhắc lại lệnh.', { ack: true }); }
    else if (kind === 'animal') { W.animals.push({ s: T.x + sgn * (o.ahead || 6000), active: true, resolved: false, hornOK: false }); W.say('warn', 'Báo từ trạm: hươu xuất hiện gần đường ray phía trước. Bấm còi (H) khi còn khoảng 1 km.'); }
    else if (kind === 'hold') { const j = Math.min(M.length - 1, nextTarget(T)); const rel = W.t + (o.sec || 90) + 60; T.holds[j] = rel; W.say('warn', `Điều độ: giữ tàu tại ${M[j].name} thêm ${o.sec || 90} s. Nhấn Y để nhắc lại lệnh.`, { ack: true }); }
    else if (kind === 'overtake') { W.decision = { t0: W.t, timeout: 40, text: 'Điều độ đề nghị: cho tàu nhanh phía sau vượt. Chấp nhận giữ thêm 90 s?', a: { label: 'Chấp nhận (Y)', fn: w2 => { w2.netScore += 3; w2.say('stop', 'Đã chấp nhận. +3 điểm phối hợp.'); } }, b: { label: 'Từ chối (N)', fn: w2 => { w2.netScore -= 3; w2.say('warn', 'Đã từ chối. −3 điểm phối hợp.'); } } }; W.say('warn', W.decision.text + '  [Y] chấp nhận · [N] từ chối (40 s).'); }
    else if (kind === 'eqk') { W.eqkAt = W.t; W.eqkActive = true; W.eqkRelease = W.t + (o.sec || 300); for (const X of allTrains(W)) X.cut = true; W.say('bad', 'CẢNH BÁO ĐỘNG ĐẤT: cắt điện, tàu phanh khẩn cấp. Giữ nguyên. Phát thanh trấn an hành khách (M).'); }
    else if (kind === 'wire') { const s = T.x + sgn * 12000; W.wires.push({ s, tA: W.t, tB: W.t + 1800 }); W.zones.push({ s0: s - 1500, s1: s + 1500, v: 0, tA: W.t, tB: W.t + 1800, kind: 'wire', hold: true, label: 'dây điện hỏng' }); startHold(W, s + 1500, 1800, 'wire'); W.say('bad', 'SỰ CỐ DÂY ĐIỆN: DỪNG chạy, về ga gần nhất, chờ khôi phục. Nhấn Y để nhắc lại lệnh.', { ack: true }); }
    else if (kind === 'fire') { W.fireActive = true; W.fireEnd = W.t + 900; startHold(W, 1e12, 900, 'fire'); W.faults.push({ car: 6, kind: 'fire', text: 'Toa 6: báo cháy/khói', level: 'bad', t: W.t }); W.say('bad', 'BÁO CHÁY toa 6: nếu trong hầm thì KHÔNG dừng, ra khỏi hầm rồi dừng ở ga gần nhất. Báo điều độ (Y).', { ack: true }); }
    else if (kind === 'leadstop' && W.lead) { W.leadHoldUntil = W.t + (o.sec || 300); W.leadStopAt = W.t; W.say('warn', 'Điều độ: tàu phía trước dừng khẩn. ATC sẽ giữ khoảng cách.'); }
    return true;
  }

  // ---- Chế độ điều độ: mạng lưới nhiều tàu tự chạy, người chơi ra lệnh ---------------------
  function createNetwork(lineId, dir, opts) {
    opts = opts || {}; const W = baseWorld(lineId, dir, opts.diff, opts.seed, opts.weather), L = W.line, rnd = rng((opts.seed || 1) * 31 + 7);
    const t0 = opts.t0 != null ? opts.t0 : 8 * 3600, span = opts.span || 5400;
    const cat = catalogOf(L, dir).filter(r => { const f = r.s[0], l = r.s[r.s.length - 1], tf = f[2] != null ? f[2] : f[1], tl = l[1] != null ? l[1] : l[2]; return tl > t0 && tf < t0 + span && tf > t0 - 1800; });
    W.net = { trains: [], t0, span, recs: cat, catchUp: false, delayLog: [], conflicts: 0 }; W.isNet = true; W.running = true;
    for (const rec of cat) {
      const seq = trainSeq(rec), M = fillPlan(seq.map(e => ({ name: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, dir, L.kmEnd), stop: e.stop, loop: !!L.stations[e.i].loop, arr: e.arr != null ? e.arr - t0 : null, dep: e.dep != null ? e.dep - t0 : null })));
      M[0].arr = null; M[M.length - 1].dep = null;
      const T = newTrain(M, W, { lead: true, veh: rec.v, label: rec.t + ' ' + rec.n, load: 0.4 + rnd() * 0.6, id: rec.t + rec.n, cp: rec.cp }); T.rec = rec; T.cls = rec.t; W.net.trains.push(T);
    }
    // sự kiện ngẫu nhiên cho mạng: thời tiết, tàu hỏng/bệnh nhân, động đất
    const ev = (at, fn) => W.events.push({ at, fire: fn, done: false });
    const n = W.diff.events[0] + 1 + Math.floor(rnd() * 2);
    const midS = () => { const a = sOfKm(L.stations[0].km, dir, L.kmEnd), b = sOfKm(L.stations[L.stations.length - 1].km, dir, L.kmEnd); const trs = W.net.trains.filter(T => T.phase === 'run'); const T = trs[Math.floor(rnd() * trs.length)]; return T ? T.x : (a + b) / 2; };
    for (let i = 0; i < n; i++) {
      const at = 300 + rnd() * (span - 1200), k = Math.floor(rnd() * 4);
      if (k === 0) ev(at, w => { const c = midS() + 15000 * (rnd() - 0.2), hw = 25000, d = 900 + rnd() * 900; w.zones.push({ s0: c - hw, s1: c + hw, v: 70 / 3.6, tA: w.t, tB: w.t + d, kind: 'rain', label: 'mưa ≥ 50 mm/h' }); w.say('warn', 'Mưa lớn: toàn vùng chạy chậm 70 km/h.'); });
      else if (k === 1) ev(at, w => { const trs = w.net.trains.filter(T => T.phase === 'run'); if (!trs.length) return; const T = trs[Math.floor(rnd() * trs.length)], d = 240 + rnd() * 420; T.cut = true; T.stuckUntil = w.t + d; w.say('bad', `${T.label} dừng khẩn giữa đường (hành khách bệnh/thiết bị), ~${fmtT(d)}.`); });
      else if (k === 2) ev(at, w => { const trs = w.net.trains.filter(T => T.phase === 'run' || T.phase === 'dwell'); if (!trs.length) return; const T = trs[Math.floor(rnd() * trs.length)], d = 180 + rnd() * 240; T.holds[T.k] = Math.max(T.holds[T.k] || 0, w.t + d); if (T.phase === 'dwell') w.say('warn', `${T.label} bị giữ tại ${T.M[T.k].name} ~${fmtT(d)} (sự cố cửa).`); else T.holds[Math.min(T.M.length - 1, nextTarget(T))] = w.t + d + 60; });
      else ev(at, w => { const c = midS(); w.zones.push({ s0: c - 12000, s1: c + 12000, v: 0, tA: w.t, tB: w.t + 900, kind: 'wind', hold: true, label: 'gió ≥ 30 m/s' }); startHold(w, c + 12000, 900, 'wind'); w.say('bad', 'Gió mạnh ≥ 30 m/s: các tàu trong vùng phải dừng ở ga gần nhất (~15 phút).'); });
    }
    W.events.sort((a, b) => a.at - b.at); W.t = Math.min(-5, ...W.net.trains.map(T => (T.M[0].dep || 0) - 5));
    // chạy trước tới t = 0 (không bắn sự kiện)
    const saved = W.events; W.events = []; while (W.t < 0) netTick(W, 0.2, true); W.events = saved; W.t = 0;
    return W;
  }
  function netTick(W, dt, quiet) {
    W.t += dt; if (!quiet) fire(W);
    for (const T of W.net.trains) {
      if (T.stuckUntil && W.t >= T.stuckUntil) { T.cut = false; T.stuckUntil = null; }
      if (T.waitFor && T.waitFor.train.phase === 'end') T.waitFor = null;
      autoDepart(T); const c = autopilot(T); step(T, dt, c === undefined ? {} : { cmd: c });
    }
    if (!quiet || true) { if (Math.floor(W.t / 15) !== Math.floor((W.t - dt) / 15)) for (const T of W.net.trains) if (T.started && T.phase !== 'end') (T.hist = T.hist || []).push([W.t, kmOfS(T.x, W.dir, W.line.kmEnd)]); }
    if (W.eqkActive && W.t >= W.eqkRelease) { W.eqkActive = false; for (const X of allTrains(W)) X.cut = false; }
  }
  // lệnh của điều độ viên
  const D_ = {
    hold(W, T, j, sec) { if (!T || j <= T.k || j > T.M.length - 1 || !T.M[j].stop) return false; const base = T.M[j].dep != null ? T.M[j].dep : (T.M[j].arr || 0); T.holds[j] = Math.max(T.holds[j] || 0, base + sec, W.t + sec); W.say('stop', `Lệnh: giữ ${T.label} tại ${T.M[j].name} thêm ${sec} s.`); W.cmds = (W.cmds || 0) + 1; return true; },
    release(W, T, j) { if (!T || T.holds[j] == null) return false; delete T.holds[j]; if (T.waitFor) T.waitFor = null; W.say('stop', `Lệnh: thả ${T.label} tại ${T.M[j] ? T.M[j].name : '?'}.`); W.cmds = (W.cmds || 0) + 1; return true; },
    skip(W, T, j) { if (!T || j <= T.k || j >= T.M.length - 1 || !T.M[j].stop) return false; if (T.phase === 'run' && stationDiverts(W.line, T.M[j].i, W.dir) && T.M[j].s - T.x < G.turnoutIn + 300) { W.say('warn', `Không thể cho ${T.label} thông qua ${T.M[j].name}: tàu đã gần/ vào ghi sang đường sân ga.`); return false; } T.M[j].stop = false; fillPlan(T.M); W.say('stop', `Lệnh: ${T.label} THÔNG QUA ${T.M[j].name}.`); W.cmds = (W.cmds || 0) + 1; return true; },
    overtake(W, slow, fast, j) { if (!slow || !fast || j <= slow.k || !slow.M[j].stop) return false; slow.waitFor = { train: fast, s: slow.M[j].s }; slow.holds[j] = Math.max(slow.holds[j] || 0, 0); W.say('stop', `Lệnh: ${slow.label} chờ tại ${slow.M[j].name} cho ${fast.label} vượt.`); W.cmds = (W.cmds || 0) + 1; return true; }
  };
  function netScore(W) {
    const trs = W.net.trains, rows = [];
    let totalMin = 0, late5 = 0, n = 0, maxD = 0, blocked = 0;
    for (const T of trs) { const last = T.results[T.results.length - 1]; if (!last) continue; const dl = Math.max(0, last.delay / 60); const wgt = T.cls === 'Nozomi' ? 1.3 : T.cls === 'Hikari' ? 1.0 : 0.8; totalMin += dl * wgt; n++; if (dl > 5) late5++; maxD = Math.max(maxD, dl); blocked += T.blockedT || 0; rows.push([T.label, T.phase === 'end' ? 'đã tới ga cuối' : 'đang chạy', Math.round(dl * 10) / 10]); }
    n = Math.max(1, n);
    const avg = totalMin / n, score = Math.max(0, Math.round(100 - avg * 8 - late5 * 3 - maxD * 1.2 - blocked / 600 - (W.cmds || 0) * 0.3));
    return { score, avg: Math.round(avg * 10) / 10, late5, maxD: Math.round(maxD * 10) / 10, blocked: Math.round(blocked), n, rows, cmds: W.cmds || 0 };
  }

  function score(T, W) {
    const D = W.diff, out = []; let tot = 0, n = 0;
    T.results.forEach(r => {
      if (r.overrun) { out.push([r.station, 'CHẠY QUÁ GA', 0, 0]); n++; return; }
      const ae = Math.abs(r.err), k = D.tolK, acc = ae <= 0.5 * k ? 100 : ae <= 1 * k ? 90 : ae <= 2 * k ? 75 : ae <= 5 * k ? 50 : ae <= 15 * k ? 30 : 10;
      const ex = r.excused || 0, late = r.delay - ex, pun = late <= 15 && late >= -30 ? 100 : late > 15 ? Math.max(20, 100 - (late - 15) * 0.5 * D.timeK) : Math.max(60, 100 + (late + 30) * 0.2);
      out.push([r.station + (r.extra ? ' (dừng thêm)' : ''), `lệch ${r.err >= 0 ? '+' : ''}${r.err.toFixed(2)} m · ${r.delay >= 0 ? 'trễ' : 'sớm'} ${Math.abs(r.delay).toFixed(0)} s` + (ex > 5 ? ` (miễn ${ex.toFixed(0)} s do sự kiện)` : ''), acc, Math.round(pun)]);
      tot += acc + pun; n++;
    });
    n = Math.max(1, n);
    const comfort = Math.max(0, 100 - T.comfort * D.comfortK), atcPen = T.atcCount * 8, earlyPen = Math.min(30, T.earlyDep * 0.3);
    const ackPen = Math.min(20, W.ackPen), hornPen = Math.min(20, T.hornPen + T.animalHit * 8), wiperPen = Math.min(10, Math.round(T.wiperBad / 20)), lampPen = Math.min(10, Math.round((T.lampBad || 0) / 30)), atcOffPen = Math.min(30, Math.round((T.atcOffBad || 0) / 8) + (T.atcCuts || 0) * 3);
    const anxPen = Math.min(15, Math.round(Math.max(0, T.anxMax - 60) / 2.5)) + (T.panic ? 10 : 0), firePen = T.fireTunnel ? 15 : 0, deadPen = Math.min(20, (T.deadViol || 0) * 6), xingPen = Math.min(40, (T.xingHit || 0) * 25), netBonus = clamp(W.netScore || 0, -9, 9);
    const final = Math.max(0, Math.min(100, Math.round(tot / (2 * n) * 0.7 + comfort * 0.3 - atcPen - earlyPen - ackPen - hornPen - wiperPen - lampPen - atcOffPen - anxPen - firePen - deadPen - xingPen + netBonus)));
    return { out, comfort: Math.round(comfort), atcPen, earlyPen: Math.round(earlyPen), ackPen, hornPen, wiperPen, lampPen, atcOffPen, anxPen, firePen, deadPen, xingPen, netBonus, final, kwh: Math.round(T.kwh), regen: Math.round(T.regen), btMax: T.btMax || 0 };
  }

  const api = { singleW, singleEff, oppHidden: (W, T) => singleEff(W, T.x) > 0.25, G, VEH, DIFF, WEATHER, LINE_META, NOTCH_MIN, NOTCH_MAX, notchName, rng, sOfKm, kmOfS, lineOf, biomeAt, gradeAt, gradeKm, inTunnel, structAt, curveAt, lampOn, needsLight, cycleLamp, toggleATC, turnoutZones, divertsAt, sharesPlatformLane, switchPoints, stationDiverts, trainSeq, timeAt, makeTrip, fillPlan, catalogOf, pickLead, passers,
    createWorld, createNetwork, inject, netTick, netScore, dispatch: D_, tick, step, allowedSpeed, plannedTime, autopilot, autoDepart, autoExtras, nextTarget, score, fmtT, allTrains, massOf, resistOf, tractiveOf,
    setPower, setBrake, coast, toggleCS, adjustCS, toggleWiper, honk, confirmATC, requestClose, ackOldest, announcePA, answerDecision, departBlock, departNow, handleCmd };
  if (typeof module !== 'undefined') module.exports = api; else root.Sim = api;
})(typeof window !== 'undefined' ? window : globalThis);
