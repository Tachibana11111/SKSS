// Lõi mô phỏng lái Shinkansen v0.4 (không phụ thuộc trình duyệt).
// Số liệu: docs/03 (tàu), 04 (lịch), 06 (ATC, ngưỡng thời tiết), 07 (lái), 09 (sự cố). Nhãn [I] = đơn giản hóa/suy luận (xem docs/10).
(function (root) {
  // hệ ATC theo tuyến [N, docs/06 §2]: ATC-NS (Tokaido/Sanyo), DS-ATC (Tohoku/Joetsu/Hokuriku/Hokkaido), KS-ATC (Kyushu/Nishi-Kyushu)
  const ATCN = { NS: 'ATC-NS', DS: 'DS-ATC', KS: 'KS-ATC' };
  const G = { aATC: 0.72, stopTol: 30, atcBuf: 400, turnoutV: 80 / 3.6, turnoutIn: 1150, turnoutOut: 630 };   // mẫu ATC [I]; ATC chặn ở vạch + 30 m; đệm khoảng cách 400 m [I]
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const NOTCH_MIN = -8, NOTCH_MAX = 13;
  const notchName = n => n > 0 ? 'P' + n : n === 0 ? 'N' : n === -8 ? 'EB' : 'B' + (-n);

  // ---- Loại tàu (docs/03 §2b). Số in nghiêng [I]: N700S, N700-8, S800, hệ số cản gió, công suất hiệu dụng
  const VEH = {
    'N700':   { name: 'N700',   len: 404.7, m: 715e3, a0: 0.72,  P: 14.5e6, vmax: 300 / 3.6, aB7: 0.75, aEB: 1.04, cap: 1323, cd: 1.0,  cars: 16 },
    'N700S':  { name: 'N700S',  len: 404.7, m: 700e3, a0: 0.72,  P: 14.5e6, vmax: 300 / 3.6, aB7: 0.75, aEB: 1.04, cap: 1323, cd: 1.0,  cars: 16 },
    'N700-8': { name: _t('N700 (8 toa)'), len: 204.7, m: 360e3, a0: 0.72, P: 8.4e6, vmax: 285 / 3.6, aB7: 0.75, aEB: 1.04, cap: 546, cd: 1.0, cars: 8 },
    'S800':   { name: '800 series', len: 152, m: 255e3, a0: 0.62, P: 5.6e6, vmax: 260 / 3.6, aB7: 0.75, aEB: 1.04, cap: 392, cd: 1.0, cars: 6 },
    'E7':     { name: 'E7 / W7', len: 300.0, m: 480e3, a0: 0.5, P: 9.6e6, vmax: 275 / 3.6, aB7: 0.75, aEB: 1.04, cap: 934, cd: 0.5, cars: 12 },
    'N700S-6': { name: _t('N700S 8000 (6 toa)'), len: 154.7, m: 275e3, a0: 0.72, P: 5.4e6, vmax: 260 / 3.6, aB7: 0.75, aEB: 1.04, cap: 391, cd: 1.0, cars: 6 },
    'H5':     { name: 'H5',     len: 253,   m: 453.5e3, a0: 0.475, P: 9.2e6, vmax: 320 / 3.6, aB7: 0.75, aEB: 1.04, cap: 658, cd: 0.55, cars: 10 },
    'E5':     { name: 'E5',     len: 253,   m: 453.5e3, a0: 0.475, P: 9.2e6, vmax: 320 / 3.6, aB7: 0.75, aEB: 1.04, cap: 723, cd: 0.55, cars: 10 }
  };
  // mini-Shinkansen: E6 (Komachi) và E8 (Tsubasa) 7 toa, khổ thân hẹp; số liệu công suất/khối lượng là [I]
  VEH['E6'] = { name: 'E6', len: 152.8, m: 335e3, a0: 0.5, P: 5.0e6, vmax: 320 / 3.6, aB7: 0.75, aEB: 1.04, cap: 338, cd: 0.6, cars: 7 };
  VEH['E8'] = { name: 'E8', len: 152.8, m: 336e3, a0: 0.5, P: 5.0e6, vmax: 300 / 3.6, aB7: 0.75, aEB: 1.04, cap: 355, cd: 0.6, cars: 7 };
  VEH['T4'] = { name: '923 Doctor Yellow', len: 177.1, m: 360e3, a0: 0.72, P: 6.0e6, vmax: 270 / 3.6, aB7: 0.75, aEB: 1.04, cap: 0, cd: 1.0, cars: 7 };          // tàu kiểm tra Tokaido/Sanyo; số liệu [K]
  VEH['E2'] = { name: _t('E2-1000 (đang rút dần)'), len: 251, m: 474e3, a0: 0.5, P: 9.6e6, vmax: 275 / 3.6, aB7: 0.75, aEB: 1.04, cap: 814, cd: 0.6, cars: 10 };            // đoàn đã rút (chạy Tohoku/Joetsu/Nagano); số liệu [K]
  VEH['E926'] = { name: 'E926 East i', len: 135.0, m: 300e3, a0: 0.5, P: 4.8e6, vmax: 275 / 3.6, aB7: 0.75, aEB: 1.04, cap: 0, cd: 0.6, cars: 6 };               // tàu kiểm tra JR East; số liệu [K]
  // tàu ghép hai đoàn (Hayabusa + Komachi, Yamabiko + Tsubasa): đoàn đầu + đoàn sau; parts dùng để vẽ từng đoạn
  function combo(a, b) { const A = VEH[a], B = VEH[b], gap = 2.5; return { name: A.name + ' + ' + B.name, len: A.len + gap + B.len, m: A.m + B.m, a0: (A.a0 * A.m + B.a0 * B.m) / (A.m + B.m), P: A.P + B.P, vmax: Math.min(A.vmax, B.vmax), aB7: 0.75, aEB: 1.04, cap: A.cap + B.cap, cd: (A.cd * A.len + B.cd * B.len) / (A.len + B.len), cars: A.cars + B.cars, parts: [a, b], gap }; }
  VEH['E5+E6'] = combo('E5', 'E6'); VEH['E5+E8'] = combo('E5', 'E8'); VEH['E6+E5'] = combo('E6', 'E5'); VEH['E8+E5'] = combo('E8', 'E5');
  Object.keys(VEH).forEach(k => { VEH[k].key = k; });
  const lenFactor = v => 0.55 + 0.45 * v.len / 404.7;

  // ---- Tuyến: giới hạn tốc độ (km thực dọc tuyến), hầm lớn, cảnh quan, độ dốc mô phỏng. Chỉ có [I] (số liệu thật: docs/02)
  const LINE_META = {
    tsk: {
      pa: '東海道・山陽・九州', atc: 'NS', defVeh: 'N700', flipDown: true, snow: [[385, 405, 120, _t('tuyết Sekigahara')], [405, 462, 170, _t('tuyết Maibara–Otsu')]],
      limits: [[0, 6.8, 110], [6.8, 90, 270], [90, 515.4, 285], [515.4, 1069.1, 300], [1069.1, 1325.9, 260]],
      tunnels: [[97.5, 105.5, 'Tanna'], [549.9, 566.1, 'Rokko']],
      biomes: [[0, 42, 'urban'], [70, 112, 'mountain'], [335, 352, 'urban'], [360, 372, 'urban'], [384, 420, 'mountain'], [452, 470, 'mountain'], [470, 520, 'urban'],
               [520, 560, 'urban'], [560, 700, 'mountain'], [660, 690, 'urban'], [820, 830, 'urban'], [870, 1060, 'mountain'], [1060, 1075, 'urban'], [1180, 1325.9, 'mountain']],
      grade: [[0, 515.4, 8, 20], [515.4, 1069.1, 9, 18], [1069.1, 1325.9, 13, 35]]   // [km0, km1, điển hình ‰, tối đa ‰]; hình dạng giả lập, tối đa theo docs/02
    },
    toh: {
      pa: '東北・北海道', atc: 'DS', defVeh: 'E5', flipDown: false, junctions: [{ km: 32.3, side: -1, branch: true, R: 4000, len: 1.5, to: 'Joetsu / Hokuriku' }, { km: 257.1, side: -1, branch: true, R: 1500, len: 1.2, to: 'Yamagata' }, { km: 498.5, side: -1, branch: true, R: 1500, len: 1.2, to: 'Akita' }], coupleMini: { maxKm: 496.5, p: 0.4, mini: 'E6' }, snow: [[330, 400, 230, _t('tuyết Sendai–Morioka')], [520, 674, 200, _t('tuyết Morioka–Shin-Aomori')]],
      limits: [[0, 31.3, 110], [31.3, 109, 275], [109, 496.5, 320], [496.5, 703.8, 260], [703.8, 715.9, 140], [715.9, 769.8, 160], [769.8, 786.3, 140], [786.3, 823.7, 260]],   // Hokkaido: đoạn dùng chung ray ba với tàu hàng (Shin-Nakaoguni–Kikonai) 140 km/h ngoài hầm, 160 km/h trong hầm Seikan [N]
      tunnels: [[533, 559, 'Iwate-Ichinohe'], [641, 667, 'Hakkoda'], [715.9, 769.8, 'Seikan']],
      biomes: [[0, 36, 'urban'], [100, 112, 'urban'], [320, 330, 'urban'], [490, 500, 'urban'], [520, 565, 'mountain'], [636, 674.9, 'mountain'], [674.9, 715, 'mountain'], [769.8, 823.7, 'field']],
      grade: [[0, 36, 15, 25], [36, 674.9, 7, 15], [674.9, 823.7, 8, 20.8]],
      refuges: [732.9, 755.9],     // 竜飛定点 (km 58.0 từ Shin-Aomori) và 吉岡定点 (81.0) trong hầm Seikan [N]
      notes: [{ km: 703.8, dir: 'down', text: _t('Vào đoạn dùng chung ray ba với tàu hàng (Shin-Nakaoguni–Kikonai, ~82 km): ≤ 140 km/h ngoài hầm, ≤ 160 km/h trong hầm Seikan (53,85 km).') },
              { km: 786.3, dir: 'up', text: _t('Vào đoạn dùng chung ray ba với tàu hàng (Kikonai–Shin-Nakaoguni): ≤ 140 km/h ngoài hầm, ≤ 160 km/h trong hầm Seikan.') },
              { km: 732.9, dir: 'down', text: _t('Dưới đáy biển eo Tsugaru (≈ 23 km). Nếu có cháy: không dừng giữa hầm, chạy tới điểm cứu hộ 吉岡 hoặc ra khỏi hầm.') }]
    },
    yam: {
      pa: '山形', atc: 'DS', defVeh: 'E8', flipDown: false,
      snow: [[262, 300, 100, _t('tuyết đèo Itaya')], [300, 403.7, 110, _t('tuyết Yamagata–Shinjo')]],
      limits: [[0, 31.3, 110], [31.3, 109, 275], [109, 255.1, 300], [255.1, 403.7, 130]],        // Fukushima–Shinjo là đường sắt thường khổ chuẩn: tối đa 130 km/h [N]
      curveA: 1.3, curveFrom: 255.1, tunnels: [], coupleMini: { maxKm: 255.1, p: 0.55, mini: 'E8' }, junctions: [{ km: 257.1, side: -1, line: 'toh' }],
      biomes: [[0, 36, 'urban'], [100, 112, 'urban'], [208, 220, 'urban'], [250, 262, 'urban'], [262, 292, 'mountain'], [292, 300, 'urban'], [336, 348, 'urban'], [348, 400, 'field'], [400, 403.7, 'urban']],
      grade: [[0, 36, 15, 25], [36, 255.1, 7, 15], [255.1, 296, 26, 37.5], [296, 403.7, 9, 20]],   // dốc tối đa 37,5‰ (đèo Itaya) [N]
      notes: [{ km: 255.1, dir: 'down', text: _t('Rời Shinkansen thật, vào đường sắt thường Ou (khổ chuẩn): ≤ 130 km/h, đường đơn gần hết chặng, nhiều đường ngang, cong gắt và dốc tới 37,5‰ ở đèo Itaya.') },
              { km: 311.2, dir: 'down', text: _t('Đoạn đường đôi Akayu–Kita-Akayu ngắn; sau đó đường đơn: tàu ngược chiều đợi ở ga.') },
              { km: 255.1, dir: 'up', text: _t('Sắp ghép với Yamabiko tại Fukushima (nếu là tàu ghép): dừng đúng vạch, chờ ghép xong.') }]
    },
    aki: {
      pa: '秋田', atc: 'DS', defVeh: 'E6', flipDown: false,
      snow: [[330, 400, 230, _t('tuyết Sendai–Morioka')], [496.5, 545, 95, _t('tuyết Sengan-toge')], [545, 623.8, 110, _t('tuyết Akita')]],
      limits: [[0, 31.3, 110], [31.3, 109, 275], [109, 496.5, 320], [496.5, 623.8, 130]],
      curveA: 1.3, curveFrom: 496.5, tunnels: [], coupleMini: { maxKm: 496.5, p: 0.6, mini: 'E6' }, junctions: [{ km: 498.5, side: -1, line: 'toh' }],
      biomes: [[0, 36, 'urban'], [100, 112, 'urban'], [320, 330, 'urban'], [490, 500, 'urban'], [515, 548, 'mountain'], [548, 616, 'field'], [616, 623.8, 'urban']],
      grade: [[0, 36, 15, 25], [36, 496.5, 7, 15], [496.5, 545, 22, 37], [545, 623.8, 8, 18]],
      notes: [{ km: 496.5, dir: 'down', text: _t('Rời Shinkansen thật tại Morioka, vào Tazawako Line (đường sắt thường khổ chuẩn): ≤ 130 km/h, đường đơn, đường ngang, đèo Sengan-toge cong và dốc.') },
              { km: 572.1, dir: 'down', text: _t('Tại Omagari tàu đổi chiều chạy (switchback): từ đây tới Akita ghế quay ngược chiều. (Mô hình giữ nguyên hướng nhìn.)') }]
    },
    jts: {
      pa: '上越', atc: 'DS', defVeh: 'E7', flipDown: false, junctions: [{ km: 32.3, side: -1, line: 'toh', shared: true }, { km: 107.0, side: -1, branch: true, R: 4000, len: 1.5, to: 'Hokuriku' }], snow: [[151, 272, 200, _t('tuyết Jomo-Kogen–Nagaoka')]],
      limits: [[0, 30.3, 110], [30.3, 113, 275], [113, 127.9, 260], [127.9, 333.9, 275]],       // hầm Nakayama có cong R=1.500 m: trang Wikipedia JP ghi 160 km/h (số cũ); lịch 2026 chạy nhanh hơn nhiều nên dùng 260 km/h [I]
      tunnels: [[113, 127.9, 'Nakayama'], [164, 186.2, 'Oshimizu']],
      biomes: [[0, 36, 'urban'], [60, 70, 'urban'], [100, 112, 'urban'], [112, 262, 'mountain'], [262, 275, 'urban'], [318, 333.9, 'urban']],
      grade: [[0, 36, 15, 25], [36, 333.9, 8, 15]]
    },
    nks: {
      pa: '西九州', atc: 'KS', defVeh: 'N700S-6', flipDown: true, snow: [],
      limits: [[0, 66.0, 260]],
      tunnels: [[1.2, 6.9, 'Tawarazaka'], [14.5, 17.4, 'Kiba'], [35.5, 40.5, 'Kuyama'], [50.0, 57.5, 'Shin-Nagasaki']],   // tên [N]; vị trí km [I]
      biomes: [[0, 12, 'mountain'], [30, 36, 'field'], [43, 47, 'urban'], [47, 60, 'mountain'], [60, 66, 'urban']],
      grade: [[0, 66.0, 12, 30]]
    },
    hok: {
      pa: '北陸', atc: 'DS', defVeh: 'E7', flipDown: true, junctions: [{ km: 32.3, side: -1, line: 'toh', shared: true }, { km: 107.0, side: -1, line: 'jts', shared: true }], snow: [[140, 300, 200, _t('tuyết Karuizawa–Joetsu-Myoko')], [300, 575.6, 180, _t('tuyết Itoigawa–Tsuruga')]],
      limits: [[0, 30.3, 110], [30.3, 105, 275], [105, 575.6, 260]],
      tunnels: [[254, 276.2, 'Iiyama'], [284, 295, 'Kubiki']],
      biomes: [[0, 36, 'urban'], [60, 70, 'urban'], [100, 112, 'urban'], [120, 160, 'mountain'], [218, 228, 'urban'], [240, 335, 'mountain'], [386, 398, 'urban'], [445, 458, 'urban'], [575.6 - 10, 575.6, 'urban']],
      grade: [[0, 36, 15, 25], [36, 105, 8, 15], [105, 147, 20, 30], [147, 575.6, 9, 15]],
      freq: [{ km: 149.5, len: 90, hz: [50, 60], label: '新軽井沢SP' }, { km: 293.5, len: 90, hz: [60, 50], label: '新高田SP' }, { km: 322, len: 90, hz: [50, 60], label: '新糸魚川SP' }]   // [N: SP của Wikipedia JP; km và chiều dài là I]
    }
  };
  const lineData = id => (root.LINES || {})[id];
  const DIFF = {
    easy:   { name: _t('Dễ'),         events: [1, 1], hint: 2, atcOver: 6 / 3.6, tolK: 2.0, comfortK: 6,  rate: 1.0, timeK: 0.5, eqk: 0,    fault: 0,   reopen: 0.05, confirm: 'auto', rare: 0 },
    normal: { name: _t('Thường'),     events: [2, 3], hint: 1, atcOver: 2 / 3.6, tolK: 1.0, comfortK: 12, rate: 1.0, timeK: 1.0, eqk: 0.1,  fault: 0,   reopen: 0.10, confirm: 'auto5', rare: 0.1 },
    hard:   { name: _t('Khó'),        events: [4, 5], hint: 0, atcOver: 0.5 / 3.6, tolK: 0.7, comfortK: 16, rate: 0.85, timeK: 1.3, eqk: 0.25, fault: 0.2, reopen: 0.15, confirm: 'manual', rare: 0.25 },
    expert: { name: _t('Chuyên gia'), events: [6, 7], hint: 0, atcOver: 0.3 / 3.6, tolK: 0.5, comfortK: 20, rate: 0.7, timeK: 1.6, eqk: 0.45, fault: 0.5, reopen: 0.20, confirm: 'manual', rare: 0.5 }
  };
  const WEATHER = { auto: _t('Ngẫu nhiên'), clear: _t('Trời quang'), rain: _t('Mưa lớn'), typhoon: _t('Bão (mưa + gió)'), snow: _t('Tuyết'), eqk: _t('Động đất'), real: _t('Thực tế (dữ liệu thật)') };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---- Hình học tuyến -----------------------------------------------------
  const sOfKm = (km, dir, kmEnd) => dir === 'up' ? (kmEnd - km) * 1000 : km * 1000;
  const kmOfS = (s, dir, kmEnd) => dir === 'up' ? kmEnd - s / 1000 : s / 1000;
  function lineOf(id) { const L = lineData(id); if (!L) throw new Error(_t('Thiếu dữ liệu tuyến ') + id); if (!L.meta) {
      L.meta = LINE_META[id]; L.skm = L.stations.map(s => s.km);
      if (L.meta.curveA && !L.meta._cl) {          // đường sắt thường: tốc độ qua đường cong v = sqrt(a·R) (a = gia tốc ngang cho phép, chưa có nghiêng thân) [I]
        L.meta._cl = true; const extra = [];
        for (const [a, b, R] of L.curves || []) if (a >= L.meta.curveFrom) { const v = Math.floor(3.6 * Math.sqrt(L.meta.curveA * R) / 5) * 5; if (v < 125) extra.push([a, b, Math.max(40, v)]); }
        L.meta.limits = L.meta.limits.concat(extra);
      }
      if (L.struct) { const named = L.meta.tunnels; L.meta.tunnels = L.struct.filter(g => g[2] === 't').map(g => { const n = named.find(t => t[0] === g[0] && t[1] === g[1]); return n ? n : [g[0], g[1]]; }); }   // mọi hầm (kể cả hầm sinh theo tỷ lệ) [I]
    } return L; }
  // kết cấu nền (g đất / v cầu cạn / b cầu / t hầm) và đường cong tại km; cong: {R, sg} hoặc null
  // tra cứu theo khoảng km: dựng một lần chỉ mục đã sắp xếp (nếu các khoảng không chồng nhau) rồi tìm nhị phân; kết quả giống hệt duyệt tuần tự. Các hàm này được gọi hàng nghìn lần mỗi khung ở góc nhìn cửa sổ hành khách.
  function ivIndex(list) { const a = (list || []).slice().sort((x, y) => x[0] - y[0]); for (let i = 0; i + 1 < a.length; i++) if (a[i + 1][0] < a[i][1]) return null; return a; }
  function ivFind(a, km) { let lo = 0, hi = a.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m][0] <= km) { r = m; lo = m + 1; } else hi = m - 1; } return r >= 0 && km < a[r][1] ? a[r] : null; }
  function structAt(L, km) { let ix = L._stIx; if (ix === undefined || L._stSrc !== L.struct) { ix = L._stIx = ivIndex(L.struct); L._stSrc = L.struct; } if (ix === null) { for (const [a, b, k] of L.struct || []) if (km >= a && km < b) return k; return 'g'; } const e = ivFind(ix, km); return e ? e[2] : 'g'; }
  function curveAt(L, km) { for (const [a, b, R, sg] of L.curves || []) if (km >= a && km < b) return { R, sg, a, b }; return null; }
  function biomeAt(L, km) { const m = L.meta; let ix = m._bmIx; if (ix === undefined || m._bmSrc !== m.biomes) { ix = m._bmIx = ivIndex(m.biomes); m._bmSrc = m.biomes; } if (ix === null) { for (const [a, b, t] of m.biomes) if (km >= a && km < b) return t; return 'field'; } const e = ivFind(ix, km); return e ? e[2] : 'field'; }
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
  function inTunnel(W, x) {      // khoảng s của các hầm theo chiều chạy, gộp chồng và sắp xếp một lần cho mỗi (tuyến, chiều)
    const m = W.line.meta, key = '_tunIv' + W.dir; let c = m[key]; if (!c || c.src !== m.tunnels) { const iv = m.tunnels.map(([k0, k1]) => { const a = sOfKm(k0, W.dir, W.line.kmEnd), b = sOfKm(k1, W.dir, W.line.kmEnd); return [Math.min(a, b), Math.max(a, b)]; }).sort((p, q) => p[0] - q[0]), mg = []; for (const v of iv) { const l = mg[mg.length - 1]; if (l && v[0] <= l[1]) l[1] = Math.max(l[1], v[1]); else mg.push(v.slice()); } c = m[key] = { src: m.tunnels, iv: mg }; }
    const a = c.iv; let lo = 0, hi = a.length - 1, r = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (a[mid][0] <= x) { r = mid; lo = mid + 1; } else hi = mid - 1; } return r >= 0 && x <= a[r][1];
  }

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
    const M = seq.slice(a, b + 1).map(e => ({ name: _s(L.stations[e.i]), rom: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, rec.d, L.kmEnd), stop: e.stop, loop: !!L.stations[e.i].loop, arr: e.arr != null ? e.arr - t0 : null, dep: e.dep != null ? e.dep - t0 : null }));
    M[0].arr = null; M[0].dep = 0; M[M.length - 1].dep = null;
    return { lineId, rec, dir: rec.d, M, t0, label: _tl(rec.t, rec.n), seq };
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
        if (t > arr - 5 && t < dep + 60) (out[k] = out[k] || []).push({ label: _tl(rec.t, rec.n), t: t - trip.t0, v: rec.v });
      }
      for (const sh of shareInfo(L)) {            // tàu của tuyến cha chạy chung đường (trước ngã rẽ) thông qua ga ta đang đỗ ở đường tránh
        if (!sh.j.shared || m.i > sh.maxI) continue;
        for (const rec of sh.LF.trains) {
          if (rec.d !== trip.dir) continue; const e = trainSeq(rec).find(x => x.i === m.i); if (e && e.stop) continue;
          const t = timeAt(sh.LF, rec, m.i); if (t == null) continue;
          if (t > arr - 5 && t < dep + 60) (out[k] = out[k] || []).push({ label: _tl(rec.t, rec.n), t: t - trip.t0, v: rec.v });
        }
      }
    });
    return out;
  }

  // ---- Tàu -------------------------------------------------------------------
  function newTrain(M, W, opts) {
    opts = opts || {}; const cpDone = !!opts.cp && (M[M.length - 1].i >= M[0].i ? M[0].i >= opts.cp[0] : M[0].i <= opts.cp[0]);      // chuyến bắt đầu sau ga ghép/tách: đã ở dạng đoàn sau khi ghép/tách
    const veh = cpDone ? VEH[opts.cp[1]] : (VEH[opts.veh] || VEH['N700']), downTrip = M[M.length - 1].i >= M[0].i;
    const T = { M, W, veh, load: opts.load != null ? opts.load : 0.7, k: 0, x: M[0].s, v: 0, f: 0, cmd: 0, pw: 0, bk: 0, notch: 0, a: 0, phase: 'dwell', dwellT: 0, started: false, atc: false, atcCount: 0, atcOk: 0, confirmed: false, needConfirm: false,
      allowed: 0, why: '', results: [], log: [], comfort: 0, jerkTime: 0, earlyDep: 0, excused: 0, holds: {}, forced: -1, cut: false, arrT: 0, free: 0,
      lamp: 'auto', lampBad: 0, atcOn: true, pan: true, atcArm: -1e9, atcOffBad: 0, atcCuts: 0, door: opts.lead ? 'closed' : 'open', doorT: 0, doorDur: 0, willReopen: false, doorFaultOnce: false, cs: false, csSet: 0, wiper: false, horn: 0, hornAt: -99, hornPen: 0, wiperBad: 0, animalHit: 0,
      xingHit: 0, cp: opts.cp ? { i: opts.cp[0], v: opts.cp[1], done: cpDone, kind: downTrip ? 'split' : 'join' } : null, coup: null, cc: null, gapX: 0, deadViol: 0, vcbUntil: -1e9, bt: 0, kwh: 0, regen: 0, grade: 0, anx: 0, anxMax: 0, paAt: -999, fireTunnel: 0, waitFor: null, blockedT: 0, trace: [],
      isLead: !!opts.lead, label: opts.label || '', id: opts.id || '' };
    // chuyến mini-Shinkansen xuất phát từ Tokyo: bắt đầu bằng cảnh ghép với đoàn Tohoku ở sân ga (khoảng cách thu lại rồi nối)
    if (T.cp && !T.cp.done && downTrip && M[0].i === 0 && T.veh.parts) { T.coup = { kind: 'join0', byDwell: true, dur: 45, to: T.veh }; T.gapX = 46; }
    return T;
  }
  const massOf = T => T.veh.m + T.load * T.veh.cap * 70;
  const resistOf = (T, v) => (2000 + 80 * v) * (massOf(T) / 715e3) + 19.5 * v * v * T.veh.cd * lenFactor(T.veh);
  const tractiveOf = (T, v) => Math.min(T.veh.m * T.veh.a0, T.veh.P / Math.max(v, 1));
  const EBCMD = T => -T.veh.aEB / T.veh.aB7;
  const handleCmd = T => T.bk > 0 ? (T.bk >= 8 ? EBCMD(T) : -T.bk / 7) : T.pw / 13;
  const nextTarget = T => { for (let j = T.k + 1; j < T.M.length; j++) if (T.M[j].stop || T.forced === j) return j; return T.M.length - 1; };
  const allTrains = W => [W.player, W.lead].concat(W.net ? W.net.trains : []).filter(Boolean);
  // tàu sắp rẽ vào đường tránh ở ga có đường thông qua (trong 2,5 km) coi như rời đường chính: tàu sau vẫn chạy thẳng
  function offMain(O) { if (O.phase !== 'run' || O.cut) return false; const j = nextTarget(O), m = O.M[j]; return !!(m && m.loop && m.stop && Math.abs(m.s - O.x) < 2500); }
  // tàu chạy trước thuộc tuyến cha đã qua hẳn ngã rẽ (chiều xuống): nó đi đường chính, không còn cản đường ta
  function leadDiverged(W, Ld) {
    if (Ld.fj === undefined || W.dir !== 'down') return false; return Ld.x - Ld.veh.len > sOfKm(W.line.meta.junctions[Ld.fj].km, 'down', W.line.kmEnd) + 60;
  }
  function leaderOf(T) {
    const W = T.W; if (!W.net) return T.isLead ? null : (W.lead && W.lead.x > T.x ? W.lead : null);
    let best = null; for (const O of W.net.trains) { if (O === T || O.phase === 'end' || O.phase === 'dwell' || offMain(O)) continue; if (O.x > T.x && (!best || O.x < best.x)) best = O; } return best;
  }
  // ---- Ghi (đường rẽ vào đường sân ga): giới hạn 80 km/h [I] từ 1.150 m trước vạch tới 630 m sau vạch, chỉ với ga có đường dừng khác đường chính
  function stationDiverts(L, i, dir, W) { const Ly = root.Layout; if (!Ly || !L.stations[i] || !L.stations[i].lay) return false; return Ly.diverts(L.stations[i].lay, dir, Ly.pickOf(L.stations[i], i, W)); }
  const divertsAt = (T, j) => { const m = T.M[j]; return !!(m && (m.stop || T.forced === j || (j === T.k && T.phase !== 'end')) && !m.mainStop && stationDiverts(T.W.line, m.i, T.W.dir, T.W)); };
  const geoS = m => m.sOrig !== undefined ? m.sOrig : m.s;      // vị trí gốc của ga (hình học sân ga/ghi); m.s có thể lùi lại khi chờ ghép
  function turnoutZones(T) { const out = []; for (let j = 0; j < T.M.length; j++) if (divertsAt(T, j)) out.push({ s0: geoS(T.M[j]) - G.turnoutIn, s1: geoS(T.M[j]) + G.turnoutOut, v: G.turnoutV, j }); return out; }
  // vị trí các ghi và ghi chéo (chữ X) mà đoàn tàu đi qua quanh một ga: dùng cho âm thanh
  function switchPoints(T) { const pts = []; for (let j = 0; j < T.M.length; j++) { const m = T.M[j], sM = geoS(m), dv = divertsAt(T, j);
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
    const j = nextTarget(T), tgt = T.M[j].s, d = tgt + G.stopTol - x; let q = d > 0 ? Math.sqrt(2 * G.aATC * d) : 0;
    if (W.line.meta.atc === 'KS' && !T.M[j].thru && q >= 60 / 3.6 && q < 170 / 3.6) q = (q >= 160 / 3.6 ? 160 : q >= 110 / 3.6 ? 110 : 60) / 3.6;      // KS-ATC: dừng ga phanh BA giai đoạn (160 → 110 → 60 km/h, dưới 60 theo mẫu liên tục) [N: ba giai đoạn; các mức km/h là I]
    if (q < a && !T.M[j].thru) { a = q; why = 'stop'; }
    const L = leaderOf(T);
    if (L && L.phase !== 'end' && !leadDiverged(W, L) && !(L.phase === 'dwell' && L.atMark && sharesPlatformLane(W, L)) && !offMain(L)) {
      const gap = L.x - L.veh.len - x - G.atcBuf;
      if (gap < 15000) { const qq = gap > 0 ? Math.sqrt(2 * G.aATC * gap) : 0; if (qq < a) { a = qq; why = 'lead'; } }
    }
    { const ob = T === W.player ? W.obs : null;      // đoàn khác (từ danh mục lịch toàn quốc) chạy hoặc dừng giữa đường phía trước: ATC giữ khoảng cách như với tàu đi trước thật, không thể vượt
      if (ob) { const gap = ob.x + ob.v * (W.t - ob.t) - ob.len - x - G.atcBuf; if (gap < 15000) { const qq = gap > 0 ? Math.sqrt(2 * G.aATC * gap) : 0; if (qq < a) { a = qq; why = 'lead'; W.obsLabel = ob.label; } } } }
    T.why = why; return a;
  }

  // ---- Điều khiển của người lái ---------------------------------------------
  function cancelCS(T, why) { if (T.cs) { T.cs = false; if (!T.isLead) T.W.say('info', _t('Chạy tốc độ không đổi: TẮT') + (why ? ' (' + why + ')' : '')); } }
  function setPower(T, n) { n = clamp(Math.round(n), 0, 13); if (T.bk > 0 && n > 0) { if (!T.isLead) T.W.say('warn', _t('Cần phanh chưa về 0: không kéo được (liên động).')); return false; } if (n !== T.pw && T.cs) cancelCS(T, _t('thao tác cần gia tốc')); T.pw = n; return true; }
  function setBrake(T, n) { n = clamp(Math.round(n), 0, 8); T.bk = n; if (n > 0) { T.pw = 0; cancelCS(T, _t('phanh')); } }
  function coast(T) { T.pw = 0; T.bk = 0; cancelCS(T, _t('về N')); }
  function toggleCS(T) {
    if (T.cs) { cancelCS(T); return; }
    if (T.phase !== 'run' || T.v < 70 / 3.6 || T.atc) { T.W.say('warn', _t('Chỉ bật tốc độ không đổi khi đang chạy ≥ 70 km/h và ATC không phanh.')); return; }
    T.cs = true; T.csSet = Math.round(T.v * 3.6 / 5) * 5 / 3.6; T.pw = 0; T.bk = 0; T.W.say('info', _t('Chạy tốc độ không đổi: BẬT {0} km/h ([ ] đổi ±5 km/h).', Math.round(T.csSet * 3.6)));
  }
  function adjustCS(T, d) { if (T.cs) T.csSet = clamp(T.csSet + d / 3.6, 70 / 3.6, T.veh.vmax); }
  function toggleWiper(T) { T.wiper = !T.wiper; }
  // đèn pha: chế độ tự động / bật / tắt do lái tàu chọn. Cần đèn khi trong hầm, ban đêm (trước 6:18, sau 17:54) hoặc mưa lúc nhá nhem
  function needsLight(W, T) { const h = (((W.trip.t0 + W.t) % 86400) + 86400) % 86400 / 3600; return inTunnel(W, T.x) || h < 6.3 || h > 17.9 || (W.rainHere && (h < 7.2 || h > 16.8)); }
  const lampOn = (W, T) => !T.cut && (T.lamp === 'on' || (T.lamp !== 'off' && needsLight(W, T)));
  function cycleLamp(T) { T.lamp = T.lamp === 'auto' ? 'on' : T.lamp === 'on' ? 'off' : 'auto'; }
  function honk(T) {
    const W = T.W; if (W.t - T.hornAt < 0.6 && T.started) return; T.hornAt = W.t; T.horn = 1.4; T.hornN = (T.hornN || 0) + 1;
    for (const z of W.workers || []) if (!z.checked && T.x >= z.s0 - 800 && T.x <= z.s1) z.hornOK = true;
    for (const an of W.animals || []) if (!an.resolved && an.active && T.x >= an.s - 1500 && T.x <= an.s - 100) { an.hornOK = true; if (an.fleeT0 === undefined) an.fleeT0 = W.t; }
  }
  // Công tắc ATC (bật / cắt). Cắt ATC phải bấm hai lần trong 4 s để tránh bấm nhầm; bật lại thì tức thì. Khi cắt: không còn phanh tự động ATC [I]
  function toggleATC(T) {
    const W = T.W;
    if (T.atcOn === false) { T.atcOn = true; T.atcArm = -1e9; W.say('info', _t('ATC: BẬT lại.')); return 'on'; }
    if (W.t - T.atcArm <= 4) { T.atcOn = false; T.atcArm = -1e9; T.atc = false; T.needConfirm = false; if (T.phase === 'run' && T.v > 1) T.atcCuts++; W.say('bad', _t('ATC: ĐÃ CẮT. KHÔNG còn phanh tự động bảo vệ. Chỉ cắt khi có lệnh; giữ tốc độ ≤ 30 km/h theo quy định [I]. Bấm lại để bật ATC.')); return 'off'; }
    T.atcArm = W.t; W.say('warn', _t('CẮT ATC? Bấm A (hoặc nút ATC) lần nữa trong 4 giây để xác nhận.')); return 'arm';
  }
  // Cần vẹt: hạ thì mất điện lưới (không kéo, không hoàn năng); qua đoạn cách điện nên hạ hoặc về N [N: JR hạ cần/ chạy trôi qua đoạn cách điện] [I]
  function togglePan(T) { const W = T.W; T.pan = T.pan === false; W.say('info', T.pan ? _t('Cần vẹt: NÂNG.') : _t('Cần vẹt: HẠ. Không còn điện lưới: không kéo, không hoàn năng.')); return T.pan; }
  function confirmATC(T) { if (T.atc) T.confirmed = true; }
  // phát thanh trấn an hành khách (giảm bất an); hồi lại sau 45 s
  function announcePA(T) {
    const W = T.W; if (W.t - T.paAt < 45) { W.say('info', _t('Vừa phát thanh xong, đợi thêm ') + Math.ceil(45 - (W.t - T.paAt)) + ' s.'); return false; }
    T.paAt = W.t; T.anx = Math.max(0, T.anx - 45); W.paCount = (W.paCount || 0) + 1; W.say('stop', _t('Đã phát thanh cho hành khách (mức bất an giảm).')); W.paEvent = W.t; return true;
  }
  function answerDecision(W, which) {
    const d = W.decision; if (!d) return false; const o = which === 'a' ? d.a : d.b; W.decision = null; o.fn(W); W.decisions = (W.decisions || 0) + 1; return true;
  }
  function requestClose(T) {
    const W = T.W;
    if (T.phase !== 'dwell' || T.v > 0.05 || T.door !== 'open') return false;
    if (T.coup) { if (!T.isLead && T.dwellT - (T.lastCoupMsg === undefined ? -99 : T.lastCoupMsg) > 8) { T.lastCoupMsg = T.dwellT; W.say('warn', T.coup.to.parts ? _t('Chưa thể đóng cửa: đang ghép toa (còn {0} s)', Math.ceil(coupLeft(T))) : _t('Chưa thể đóng cửa: đang tách toa (còn {0} s)', Math.ceil(coupLeft(T)))); } return false; }
    if (T.k > 0 && T.dwellT < 20) { if (!T.isLead) W.say('warn', _t('Chưa thể đóng cửa (cần mở cửa ≥ 20 s)')); return false; }
    T.door = 'closing'; T.doorT = 0; T.doorDur = 9 + (T.k === 0 ? 0 : W.rnd() * 6);
    T.willReopen = T.doorFaultOnce || W.rnd() < W.diff.reopen; T.doorFaultOnce = false;
    if (!T.isLead) W.say('info', _t('Trưởng tàu: bắt đầu đóng cửa...'));
    return true;
  }
  function doorStep(T, dt) {
    if (T.door !== 'closing') return;
    const W = T.W; T.doorT += dt;
    if (T.doorT >= T.doorDur) {
      if (T.willReopen) { T.door = 'open'; T.willReopen = false; T.dwellT = Math.max(T.dwellT, 20); W.say('warn', _t('Trưởng tàu: cửa bị kẹt (hành khách/cửa lỗi), mở lại. Đóng cửa lại (Enter).')); W.faults = (W.faults || []).filter(f => f.kind !== 'door'); }
      else { T.door = 'closed'; W.say('info', _t('Đèn ĐÓNG CỬA sáng. Được khởi hành: kéo cần gia tốc.')); if (T.k === 0 && !T.started) { T.started = true; W.running = true; } }
    }
  }
  // Ghép / tách toa của tàu mini-Shinkansen tại Fukushima (Yamabiko + Tsubasa) và Morioka (Hayabusa + Komachi). Thời gian lấy từ thời gian dừng trong lịch [I]
  const COUPLE_GAP = 2.5, coupLeft = T => T.coup.byDwell ? Math.max(0, T.coup.dur - T.dwellT) : Math.max(0, T.coup.end - T.W.t);
  function startCoupling(T, mk) {
    if (!T.cp || T.cp.done || mk.i !== T.cp.i) return;
    const W = T.W, to = VEH[T.cp.v], plan = mk.arr != null && mk.dep != null ? mk.dep - mk.arr : 360, dur = clamp(plan - 90, 100, 300);
    T.coup = { end: W.t + dur, to, kind: T.cp.kind }; T.cp.done = true;
    if (T.isLead) return;
    if (T.cp.kind === 'join') W.say('info', _t('Ghép toa: {0} nối vào phía sau đoàn {1} đang chờ ở sân ga. Chờ nối xong (~{2} s), đừng khởi hành.', VEH[to.parts[1]].name, VEH[to.parts[0]].name, Math.round(dur)));
    else W.say('info', _t('Tách toa: {0} ở phía sau được tách ra và ở lại sân ga; {1} chạy tiếp một mình sang tuyến riêng. Chờ tách xong (~{2} s).', VEH[T.veh.parts[1]].name, to.name, Math.round(dur)));
  }
  function coupStep(T) {
    const c = T.coup; if (!c) return; const W = T.W;
    if (c.kind === 'join0') {              // ghép ở Tokyo: đoàn Tohoku ở phía sau chạy tới nối vào
      T.gapX = Math.max(0, 46 * (1 - T.dwellT / 30)); if (T.dwellT < c.dur) return;
      T.gapX = 0; T.coup = null; if (!T.isLead) W.rearSwitchAt = W.t; if (!T.isLead) W.say('stop', _t('Ghép xong ở Tokyo: đoàn {0} ({1} toa, {2} m). Được khởi hành.', T.veh.name, T.veh.cars, Math.round(T.veh.len))); return;
    }
    if (c.kind === 'pjoin0') {            // ta (E5) ở sân ga Tokyo: tàu nhánh lùi từ phía trước vào nối vào đầu ta
      const mp = W.parked.find(p => p.cc); if (mp) mp.front = T.M[0].sOrig + 46 * Math.max(0, 1 - T.dwellT / 30);
      if (T.dwellT < c.dur) return;
      const m = T.M[0]; T.veh = c.to; T.coup = null; T.x += m.sOrig - m.s; m.s = m.sOrig; delete m.sOrig; W.parked = W.parked.filter(p => !p.cc);
      if (!T.isLead) { W.cabSwitchAt = W.t; W.say('stop', _t('Ghép xong ở Tokyo: {0} ({1} toa, {2} m). Chuyển sang buồng lái đầu đoàn (đầu tàu nhánh); ta được kéo cùng. Được khởi hành.', T.veh.name, T.veh.cars, Math.round(T.veh.len))); } return;
    }
    if (c.kind === 'pjoin') {             // chiều lên: tàu nhánh tiến vào nối vào đuôi ta (quãng đường giảm dần theo hàm bình phương)
      const el = c.byDwell ? T.dwellT : W.t - c.tA, mp = W.parked.find(p => p.cc), u = Math.min(1, el / c.aDur); if (mp) mp.front = T.x - T.veh.len - COUPLE_GAP - c.D0 * (1 - u) * (1 - u);
      if (c.byDwell ? T.dwellT < c.dur : W.t < c.end) return;
      T.veh = c.to; T.coup = null; W.parked = W.parked.filter(p => !p.cc); W.camReq = { rear: false };
      if (!T.isLead) W.say('stop', _t('Ghép xong: {0} ({1} toa, {2} m). Được khởi hành.', T.veh.name, T.veh.cars, Math.round(T.veh.len))); return;
    }
    if (W.t < c.end) return;
    if (c.kind === 'psplit') {            // chiều xuống: tàu nhánh (phía trước) tách ra; đầu E5 lùi về đúng vị trí đầu E5, tàu nhánh đứng ở vị trí cũ rồi chạy trước
      const mv = VEH[c.mini], m = T.M[T.k], x0 = T.x; T.veh = c.to; T.coup = null; T.x -= mv.len + COUPLE_GAP; if (m.sOrig === undefined) { m.sOrig = m.s; m.s -= mv.len + COUPLE_GAP; }
      W.parked.push({ key: c.mini, front: x0, kind: 'wait', jn: T.cc.jn, cc: 1, own: true, mv: { v: 0, a: 0.7, vmax: 34, delay: 25, t0: W.t } });
      if (!T.isLead) { W.cabSwitchAt = W.t; W.say('stop', _t('Tách xong: {0} sắp chạy trước vào tuyến nhánh. Về buồng lái E5 (đoàn {1} toa, {2} m). Chờ nó rời ga rồi khởi hành.', mv.name, T.veh.cars, Math.round(T.veh.len))); } return;
    }
    const from = T.veh; T.veh = c.to; T.coup = null;
    if (c.kind === 'split') {
      if (!T.isLead) W.parked.push({ key: from.parts.find(k => k !== c.to.key), front: T.x - c.to.len - COUPLE_GAP, kind: 'left' });          // phần Tohoku ở lại sân ga
    } else {
      const m = T.M[T.k]; if (m.sOrig !== undefined) { if (!T.isLead) { W.cabSwitchAt = W.t; W.say('info', _t('Chuyển sang buồng lái đầu đoàn (đầu tàu Tohoku). Đoàn đã nối xong, không dịch chuyển: chỉ đổi vị trí lái.')); } T.x += m.sOrig - m.s; m.s = m.sOrig; delete m.sOrig; }                              // đầu đoàn mới = đầu tàu Tohoku đã chờ
      W.parked = W.parked.filter(p => p.kind !== 'wait');
    }
    if (!T.isLead) W.say('stop', T.veh.parts ? _t('Ghép xong: đoàn {0} ({1} toa, {2} m). Được khởi hành.', T.veh.name, T.veh.cars, Math.round(T.veh.len)) : _t('Tách xong: còn {0} ({1} toa, {2} m) chạy tiếp. Được khởi hành.', T.veh.name, T.veh.cars, Math.round(T.veh.len)));
  }
  // ---- người chơi lái chuyến Tohoku (E5): ghép / tách với tàu nhánh. Hayabusa/Hayate ghép E6 (Akita) ở Morioka, Yamabiko ghép E8 (Yamagata) ở Fukushima; Nasuno không ghép.
  // Chiều xuống: mini ở PHÍA TRƯỚC (nối ở Tokyo rồi ta lùi vạch dừng nhường chỗ; tách ở ga nhánh: mini chạy trước vào tuyến nhánh, ta ở lại rồi đi tiếp). Chiều lên: mini nối vào ĐUÔI ta ở ga nhánh. Tỉ lệ và các quy tắc là [I].
  const CC_P = { E6: 0.6, E8: 0.55 };
  function planCouple(W, L, trip, P, mode, seed) {
    const rec = trip.rec; if (W.lineId !== 'toh' || !L.meta.coupleMini || mode === 'never' || trip.mission || rec.cp || P.veh.key !== 'E5' || rec.t === 'Nasuno') return;
    const [nm, mini] = rec.t === 'Yamabiko' ? ['Fukushima', 'E8'] : ['Morioka', 'E6'], iS = L.stations.findIndex(x => x.en === nm), M = P.M; if (iS < 0) return;
    const down = trip.dir === 'down', jM = M.findIndex(m => m.i === iS && m.stop), jn = L.meta.junctions.findIndex(j => j.branch && j.to === (mini === 'E8' ? 'Yamagata' : 'Akita'));
    if (jM < 0 || jn < 0 || (down && jM >= M.length - 1)) return;      // chiều xuống: ga tách phải không phải ga cuối
    if (down ? !(M[0].i < iS) : !(M[0].i >= iS && jM >= (M[0].i > iS ? 1 : 0))) return;
    if (mode !== 'always' && hash01(seed * 13 + (+rec.n || 0), 29) >= CC_P[mini]) return;
    const comp = down ? mini + '+E5' : 'E5+' + mini, cc = P.cc = { kind: down ? 'down' : 'up', i: iS, mini, comp, jn, done: false };
    if (down) {
      if (M[0].i === 0) {         // xuất phát từ Tokyo: mini chờ ở phía trước, lùi vào nối vào đầu ta; vạch dừng của ta lùi về phía sau một đoạn bằng chiều dài mini + khe nối
        const m0 = M[0]; m0.sOrig = m0.s; m0.s -= VEH[mini].len + COUPLE_GAP; P.x = m0.s;
        W.parked.push({ key: mini, front: m0.sOrig + 46, kind: 'wait', jn, cc: 1, own: true });
        P.coup = { kind: 'pjoin0', byDwell: true, dur: 45, to: VEH[comp], miniLen: VEH[mini].len }; cc.joined0 = true;
      } else P.veh = VEH[comp];       // đã ghép từ Tokyo
    } else if (jM === 0) startCoupP(P, M[0]);      // chiều lên, xuất phát đúng ga ghép
  }
  // gặp ga ghép/tách khi tới ga (gọi cùng startCoupling)
  function startCoupP(T, mk) {
    const cc = T.cc; if (!cc || cc.done || mk.i !== cc.i || T.isLead) return;
    const W = T.W, plan = mk.arr != null && mk.dep != null ? mk.dep - mk.arr : 360, dur = clamp(plan - 90, 100, 300), mv = VEH[cc.mini], line = cc.mini === 'E8' ? 'Yamagata' : 'Akita'; cc.done = true;
    if (cc.kind === 'down') {
      T.coup = { end: W.t + dur, kind: 'psplit', to: VEH.E5, mini: cc.mini };
      W.say('info', _t('Tách toa: {0} ở phía trước tách ra và chạy trước vào tuyến {1}. Chờ tách xong (~{2} s), rồi đợi nó rời ga mới được khởi hành.', mv.name, line, Math.round(dur)));
    } else {
      const D0 = 900, aDur = Math.min(60, dur - 15), st = !W.running && !T.started; T.coup = st ? { byDwell: true, dur, kind: 'pjoin', to: VEH[cc.comp], aDur, D0 } : { end: W.t + dur, kind: 'pjoin', to: VEH[cc.comp], tA: W.t, aDur, D0 };
      W.parked.push({ key: cc.mini, front: T.x - T.veh.len - COUPLE_GAP - D0, kind: 'left', jn: cc.jn, cc: 1, own: true }); W.camReq = { rear: true };
      W.say('info', _t('Ghép toa: {0} từ tuyến {1} chạy vào nối vào ĐUÔI đoàn của ta. Nhìn camera sau (đã tự bật). Chờ nối xong (~{2} s), đừng khởi hành.', mv.name, line, Math.round(dur)));
    }
  }
  // chuyển động của tàu nhánh (AI): tàu tách chạy đi trước; tàu ghép tiến vào đuôi
  // camera sau của chuyến mini đang ghép/tách: đặt ở đuôi phần của ta (đuôi mini) để thấy đoàn Tohoku tiến vào nối hoặc tách ra; trả về null nếu dùng đuôi cả đoàn
  function rearVis(T) {
    const c = T.coup; if (!c || !T.veh.parts || T.isLead) return null; const ps = T.veh.parts;
    if (c.kind === 'join0') return { key: ps[ps.length - 1], gap: COUPLE_GAP + T.gapX, anchorLen: VEH[ps[0]].len };
    if (c.kind === 'split') return { key: ps[ps.length - 1], gap: COUPLE_GAP, anchorLen: VEH[ps[0]].len };
    return null;
  }
  function moveParked(W, dt) {
    for (const p of W.parked) {
      if (!p.mv) continue; const m = p.mv; if (W.t < m.t0 + m.delay) continue; m.v = Math.min(m.vmax, m.v + m.a * dt); p.front += m.v * dt;
    }
  }
  function departBlock(T) {
    const W = T.W, hold = T.holds[T.k];
    if (hold != null && W.t < hold) return _t('Đang giữ tàu theo lệnh điều độ (còn {0} s)', Math.ceil(hold - W.t));
    if (T.waitFor && T.waitFor.train.phase !== 'end' && T.waitFor.train.x < T.waitFor.s + 120) return _t('Chờ {0} vượt qua ga', T.waitFor.train.label);
    if (T.cut) return _t('Mất điện / kiểm tra sau sự cố');
    const lv = W.parked.find(p => p.mv && p.cc && p.front - VEH[p.key].len - T.x < 450); if (lv) return _t('Chờ {0} rời khỏi ga (tàu nhánh chạy trước)', VEH[lv.key].name);
    if (T.coup) return T.coup.to.parts ? _t('Đang ghép toa (còn {0} s)', Math.ceil(coupLeft(T))) : _t('Đang tách toa (còn {0} s)', Math.ceil(coupLeft(T)));
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
    if (!T.isLead && T.k > 0 && mk.dep != null && W.t < mk.dep - 0.5) { T.earlyDep += mk.dep - W.t; T.log.push(['EARLY', W.t, _t('Khởi hành sớm')]); W.say('warn', _t('Khởi hành sớm {0} s', (mk.dep - W.t).toFixed(0))); }
    T.started = true; T.phase = 'run'; return true;
  }

  function step(T, dt, input) {
    if (T.phase === 'end') return;
    const W = T.W, D = W.diff, M = T.M, veh = T.veh, mass = massOf(T);
    let cmd = input && input.cmd !== undefined ? input.cmd : handleCmd(T);
    T.allowed = allowedSpeed(T);
    if (T.cs) {
      if (T.phase !== 'run' || T.atc || T.cut) cancelCS(T, T.atc ? _t('ATC phanh') : '');
      else { const vset = Math.min(T.csSet, Math.max(0, T.allowed - 3 / 3.6)), err = vset - T.v; cmd = clamp((resistOf(T, T.v) + mass * 9.81 * T.grade / 1000) / tractiveOf(T, T.v) + 0.6 * err, -0.25, 1); }
    }
    if ((T.vcbUntil > W.t || T.pan === false) && cmd > 0) cmd = 0;                                    // máy cắt chính nhảy: mất lực kéo
    if (T.cut) { cmd = EBCMD(T); T.atc = false; }
    else if (T.atcOn === false) { T.atc = false; T.needConfirm = false; }      // ATC đang cắt: không có phanh tự động
    else {
      if (!T.atc && T.v > T.allowed + (T.isLead ? 0.3 : D.atcOver) && T.v > 0.5) {
        T.atc = true; T.atcOk = 0; T.confirmed = false;
        const grace = W.zones.some(z => z.kind === T.why && W.t - z.tA < 45 && W.t >= z.tA) || (T.why === 'lead' && W.t - (W.leadStopAt || -999) < 60) || T.why === 'eqk' || (T.why === 'stop' && W.t - (T.holdAt || -999) < 60) || W.t - (T.orderAt || -999) < 60;
        if (!grace) T.atcCount++;
        if (!T.isLead) T.log.push(['ATC', W.t, _t('ATC phanh tự động (') + T.why + ')' + (grace ? _t(' — không tính lỗi') : '')]);
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
    if (aBr > 0 && T.v > 0.2) { const rg = T.f < -1.05 || T.pan === false ? 0 : (T.v > 25 ? 0.7 : T.v > 12 ? 0.35 : 0.05); T.bt += 0.0004 * (1 - rg) * aBr * T.v * dt; T.regen += aBr * mass * T.v * rg * 0.75 * dt / 3.6e6; }
    T.bt = Math.max(0, T.bt - 0.003 * (1 + T.v / 30) * T.bt * dt); if (T.bt > (T.btMax || 0)) T.btMax = T.bt;
    if (Ft > 0) T.kwh += Ft * T.v / 0.9 * dt / 3.6e6;
    if (T.horn > 0) T.horn = Math.max(0, T.horn - dt);
    deadStep(T); noteStep(T); xingStep(T); if (T === W.player) refreshOpposing(W, T);
    // bất an của hành khách khi đứng giữa đường
    if (!T.isLead) {
      if (T.phase === 'run' && T.v < 0.3 && W.running) { T.anx = Math.min(100, T.anx + dt * 100 / 900); } else if (T.anx > 0) T.anx = Math.max(0, T.anx - dt * 0.4);
      T.anxMax = Math.max(T.anxMax, T.anx);
      if (T.anx >= 100 && !T.panic) { T.panic = true; W.say('bad', _t('Hành khách hoảng loạn và đòi sơ tán! Hãy phát thanh trấn an (M) và báo điều độ.')); T.anx = 60; }
      if (T.v > 0.5 && !T.atc && !T.cut) { const jerk = (a - prevA) / dt; if (Math.abs(jerk) > 0.7) T.jerkTime += dt; T.comfort += Math.max(0, Math.abs(jerk) - 0.7) * dt; }
      if (W.rainHere && !T.wiper && T.v > 5) T.wiperBad += dt;
      if (T.atcOn === false && T.v > 30 / 3.6) T.atcOffBad += dt;                // cắt ATC mà chạy quá 30 km/h
      if (T.lamp === 'off' && T.v > 5 && needsLight(W, T)) T.lampBad += dt;           // tắt đèn pha khi trong hầm / ban đêm
      checkRoadEvents(T);
      if (T.v < 0.5 && T.phase === 'run' && W.fireActive && inTunnel(W, T.x) && !W.fireTunnelDone) {
        if (atRefuge(W, T.x)) { W.fireTunnelDone = true; W.say('stop', _t('Dừng tại điểm cứu hộ (定点) trong hầm: đúng quy trình hầm Seikan, sơ tán qua đường hầm cứu hộ.')); }
        else { T.fireTunnel = 1; W.fireTunnelDone = true; W.say('bad', _t('ĐÃ DỪNG TRONG HẦM khi có cháy! (nguyên tắc: ra khỏi hầm rồi mới dừng)')); }
      }
      if (W.trace && T.phase !== 'end' && Math.floor((W.t) ) !== Math.floor(W.t - dt) && W.running) T.trace.push([Math.round(W.t), Math.round(T.x), +(T.v * 3.6).toFixed(1), +(T.allowed * 3.6).toFixed(1), +T.pw, T.bk]);
    }
    if (!T.isLead && T.phase === 'run' && T.why !== 'line' && T.why !== 'stop' && T.free > 1) T.excused += dt * Math.max(0, 1 - T.v / T.free);
    if (T.phase === 'run') {
      const j = nextTarget(T), mk = M[j];
      if (T.v < 0.05 && Math.abs(T.x - mk.s) <= G.stopTol + 5) {
        T.v = 0; T.f = 0; T.k = j; T.arrT = W.t; T.atMark = true; T.door = (T.isLead || mk.mainStop) ? 'closed' : 'open'; T.doorT = 0; T.cs = false;
        if (mk.mainStop && !T.isLead) W.say('bad', _t('Dừng ở ĐƯỜNG CHÍNH tại {0} (quá gần để rẽ ghi sang đường sân ga): không có sân ga bên cạnh, cửa KHÔNG mở. Chờ lệnh điều độ rồi chạy tiếp.', mk.name));
        const e = T.x - mk.s, planned = mk.arr != null ? mk.arr : mk.pt;
        if (!T.isLead) {
          const res = { station: mk.name, err: e, delay: planned != null ? W.t - planned : 0, excused: T.excused, atc: T.atcCount, extra: !mk.stop, t: W.t };
          T.results.push(res);
          W.say('stop', _t('{0}: lệch {1}{2} m', mk.name, e >= 0 ? '+' : '', e.toFixed(1)) + (planned != null ? `, ${res.delay >= 0 ? _t('trễ') : _t('sớm')} ${Math.abs(res.delay).toFixed(0)} s` : '') + (j < M.length - 1 ? _t('. Cửa mở.') : ''));
          const pl = W.passers && W.passers[j];
          if (pl && pl.length) W.say('info', _t('{0}: {1} (trên đường thông qua). Ta ở đường tránh.', mk.name, pl.map(p => p.label + _t(' thông qua ') + fmtT(p.t)).join(', ')));
        } else if (W.net) { T.lastArrDelay = W.t - (mk.arr != null ? mk.arr : (mk.pt != null ? mk.pt : W.t)); T.results.push({ station: mk.name, delay: T.lastArrDelay, t: W.t }); }
        if (T.forced === j) T.forced = -1;
        if (j === M.length - 1) { T.phase = 'end'; if (!T.isLead) T.finished = true; }
        else { T.phase = 'dwell'; T.dwellT = 0; startCoupling(T, mk); startCoupP(T, mk);
          if (mk.xwait && !T.isLead) { W.passers = W.passers || {}; (W.passers[j] = W.passers[j] || []).push({ syn: true, label: W.line.meta.defVeh + _t(' (ngược chiều)'), t: W.t + Math.max(30, mk.xwait * 0.6), v: W.line.meta.defVeh }); T.holds[j] = Math.max(T.holds[j] || 0, W.t + mk.xwait); W.say('info', _t('{0}: đang chờ tàu ngược chiều (đường đơn).', mk.name)); } }
      } else if (T.x > mk.s + G.stopTol + 80) {
        T.phase = 'end';
        if (!T.isLead) { T.finished = true; T.failed = true; T.log.push(['FAIL', W.t, _t('Chạy quá ga')]); W.say('bad', _t('Chạy quá ga ') + mk.name); T.results.push({ station: mk.name, err: T.x - mk.s, delay: NaN, overrun: true }); }
      }
    }
    if (T.phase === 'dwell') T.dwellT += dt; else T.atMark = false;
    if (T.isLead && W.net && T.phase === 'run' && T.allowed < T.free - 1 && T.why === 'lead') T.blockedT += dt;
  }
  function checkRoadEvents(T) {
    const W = T.W;
    for (const z of W.workers || []) {
      if (z.checked || T.x <= z.s1) continue; z.checked = true;
      if (z.hornOK) W.say('info', _t('Đã bấm còi báo hiệu khi qua khu có nhân viên làm việc.')); else { T.hornPen += 4; W.say('bad', _t('Quên bấm còi khi qua khu có nhân viên làm việc trên đường.')); }
    }
    for (const an of W.animals || []) {
      if (!an.active || an.resolved || T.x < an.s - 120) continue; an.resolved = true;
      if (an.hornOK) W.say('info', _t('Con vật chạy khỏi đường ray khi nghe còi. An toàn.'));
      else { T.animalHit++; W.shakeAt = W.t; W.shakeAmp = 5; T.cut = true; W.eqkActive = true; W.eqkRelease = W.t + 360 + W.rnd() * 240; W.recoverText = _t('Kiểm tra xe và đường xong sau va chạm động vật.'); W.recoverV = 120; W.say('bad', _t('VA CHẠM ĐỘNG VẬT: phanh khẩn cấp. Dừng kiểm tra đầu máy và đường.')); }
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
    if (T.phase !== 'run' || T.isLead) return;
    // các chỗ còi tự kêu thêm, mỗi chỗ một lần [I: lựa chọn của game, chưa có quy định kiểm chứng]: ga không dừng (còn 600 m), đường ngang đang bị chắn (còn 700 m), tàu phía trước đứng trên đường chính (còn 1500 m)
    const once = key => { W.hornDone = W.hornDone || {}; if (W.hornDone[key]) return false; W.hornDone[key] = true; return true; };
    T.M.forEach((m, k) => { if (k > 0 && k < T.M.length - 1 && !m.stop && T.x < m.s && m.s - T.x < 600 && once('thru' + k)) honk(T); });
    const g = xingAhead(W, T, 700); if (g && once('xing' + Math.round(g.s))) honk(T);
    const L = W.lead; if (L && L.phase === 'run' && L.v < 2 && L.x > T.x && L.x - L.veh.len - T.x < 1500 && once('lead' + (W.leadStopAt || 0))) honk(T);
  }
  function autoExtras(T) {
    const W = T.W; T.wiper = !!W.rainHere;
    const p = (W.pending || []).find(m => !m.done); if (p && W.t - p.t > 6) ackOldest(W);
    if (W.decision && W.t - W.decision.t0 > 8) answerDecision(W, 'a');
    if (T.anx > 40 && T.v < 0.5 && W.t - T.paAt > 45) announcePA(T);
    if (T.needConfirm || T.atc) confirmATC(T);
    autoHorn(T);
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
    { const xg = xingAhead(W, T, 2500); if (xg) { const vx = Math.sqrt(2 * 0.45 * Math.max(0, xg.s - 90 - T.x)); if (v < 0.6 && xg.s - T.x < 700) return -0.3; if (v > vx) return -0.9; vT = Math.min(vT, vx); } }      // đã dừng (hoặc gần dừng) trước đường ngang có xe kẹt: giữ phanh ổn định B1          // xe kẹt ở đường ngang: dừng trước đường ngang
    let soft = false;                                                    // giới hạn do kế hoạch đúng giờ (không phải an toàn): chỉ trôi/phanh nhẹ khi vượt đáng kể
    const arr = mk.arr != null ? mk.arr : (mk.pt != null && mk.stop ? mk.pt : null), remT = arr != null ? arr - W.t : 0;
    const ai = T.isLead && W.net, slack = ai ? 50 : 20, fac = ai ? 1.12 : 1.06;
    if (arr != null && remT > slack && T.forced < 0 && !(ai && W.net.catchUp)) { const vNeed = (d + 600) / Math.max(remT - slack, 1); const vN = Math.max(vNeed * fac, 15); if (vN < vT) soft = true; vT = Math.min(vT, vN); }
    const lead = Math.max(d - v * 1.6, 0), thru = !!mk.thru;
    const vL = thru ? 1e9 : Math.sqrt(2 * 0.55 * lead) + 0.5, curveLim = vL < vT; if (curveLim) soft = true; vT = Math.min(vT, vL);
    if (!thru && d < 400 && v * v / (2 * Math.max(d - v * 1.2, 0.3)) > 0.35) { const need = (v * v) / (2 * Math.max(d - v * 1.2, 0.3)); return -Math.min(1, Math.max(0.03, need / T.veh.aB7)); }
    if (!thru && d < 60) { if (v < 0.25 && d > 0.8) return 0.04; const need = (v * v) / (2 * Math.max(d, 0.15)); return -Math.min(1, Math.max(v < 0.25 ? 0.01 : 0.05, need / T.veh.aB7)); }
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
      W.say('bad', _t('ĐƯỜNG NGANG PHÍA TRƯỚC: đèn đỏ nhấp nháy (特殊信号発光機): có xe kẹt trên đường ngang! Phanh khẩn cấp ngay (EB), dừng trước đường ngang.')); }
    for (const g of W.xings) {
      if (g.blocked && W.t >= g.until && !g.cleared && T.x < g.s + 5) { g.blocked = false; g.cleared = true; W.say('info', _t('Đường ngang đã thông (xe được dời đi). Được chạy tiếp, ≤ 25 km/h qua đường ngang.')); }
      if (g.blocked && !g.hit && T.x >= g.s - 4 && T.x < g.s + 60) {
        g.hit = true; g.blocked = false; T.xingHit++; W.shakeAt = W.t; W.shakeAmp = 6; T.cut = true; W.eqkActive = true; W.eqkRelease = W.t + 420 + W.rnd() * 240; W.recoverText = _t('Kiểm tra xe và đường sau va chạm tại đường ngang.'); W.recoverV = 100;
        W.say('bad', _t('VA CHẠM TẠI ĐƯỜNG NGANG: xe ô tô bị kẹt, tàu không kịp dừng. Phanh khẩn cấp, dừng kiểm tra.'));
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
      if (!d.warned && T.x >= d.s0 - 2500 && T.x < d.s0) { d.warned = true; W.say('warn', _t('Phía trước: đoạn cách điện đổi tần số {0}→{1} Hz ({2}). Về N (cắt lực kéo) trước vạch và chạy trôi qua.', d.hzA, d.hzB, d.label)); }
      if (T.x >= d.s0 && T.x <= d.s1 && !d.hit && T.f > 0.05 && !T.cut && T.pan !== false) {
        d.hit = true; T.deadViol++; T.vcbUntil = W.t + 12; W.shakeAt = W.t; W.shakeAmp = 2;
        W.say('bad', _t('Vào đoạn cách điện ({0}) khi đang kéo lực: hồ quang, máy cắt chính nhảy. Mất lực kéo 12 s. Lần sau về N trước vạch.', d.label));
      }
    }
  }

  // ---- Thế giới -----------------------------------------------------------------
  function baseWorld(lineId, dir, diffKey, seed, weather) {
    const L = lineOf(lineId), diff = DIFF[diffKey || 'normal'];
    const W = { t: 0, line: L, lineId, dir, diff, diffKey: diffKey || 'normal', zones: [], msgs: [], events: [], lead: null, running: false, weather: weather || 'auto', seed: seed || 1,
      pending: [], faults: [], workers: [], animals: [], wires: [], ackPen: 0, rainHere: false, rnd: rng((seed || 1) * 7919 + 13), netScore: 0, decision: null, trace: true,
      say(kind, text, o) { const m = { t: this.t, kind, text }; this.msgs.push(m); if (kind !== 'pa') this.newMsg = true; if (o && o.ack) { m.ack = true; this.pending.push(m); } } };
    W.dead = deadSections(L, dir); W.xings = worldXings(L, dir); W.parked = []; W.stabled = [];
    return W;
  }
  // ---- Tàu ngược chiều có thể là đoàn ghép (Tohoku + mini) ở đoạn Tohoku; tàu đỗ ở đường phụ của ga
  const hash01 = (a, b) => { let x = Math.imul((a | 0) ^ 0x9e3779b9, 2654435761) ^ Math.imul(((b | 0) + 0x7f4a7c15) | 0, 1597334677); x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13; return ((x >>> 0) % 100000) / 100000; };
  // ---- tàu ngược chiều theo lịch thật (cùng danh mục với bản đồ toàn quốc): vị trí mỗi đoàn ngược chiều theo giờ, đổi sang km của tuyến ta; giờ gặp nhau tính từ khoảng cách thật và tốc độ hiện tại của ta
  function buildOppCat(W, trip) {
    const L = W.line, oppDir = trip.dir === 'down' ? 'up' : 'down', out = [], idxOf = new Map(L.stations.map((s, i) => [s.jp, i]));
    for (const id of Object.keys(LINE_META)) { const LL = lineOf(id); if (!LL || !LL.trains) continue;
      for (const rec of LL.trains) { if (rec.d !== oppDir || (id === W.lineId && rec === trip.rec)) continue;
        let run = [], best = []; for (const e of rec.s) { if (e[3]) continue; const i = idxOf.get(LL.stations[e[0]].jp);
          if (i === undefined) { if (run.length > best.length) best = run; run = []; continue; } run.push({ km: L.stations[i].km, ta: e[1] != null ? e[1] : e[2], td: e[2] != null ? e[2] : e[1] }); }
        if (run.length > best.length) best = run; if (best.length >= 2) out.push({ id: id + rec.t + rec.n + rec.d, rec, pts: best }); } }
    return out;
  }
  // tàu cùng chiều thông qua ga ta đang đỗ: lấy từ danh mục toàn quốc (mọi tuyến) theo giờ thật cộng độ trễ, cùng nguồn với bản đồ; giữ thêm các tàu giả lập đặt tay (syn)
  function refreshPassers(W, T) {
    const NC = root.NatCat, k = T.k; if (!NC) return;
    if (!T.M[k].loop) { W.passDyn = { k, list: ((W.passers && W.passers[k]) || []).filter(p => p.syn) }; return; }      // ga chỉ có hai đường (không đường tránh): tàu cùng chiều không thể chạy xuyên qua tàu đang đỗ, nên không có tàu thông qua
    if (!W.passCand || W.passCand.k !== k) { const en = W.line.stations[T.M[k].i].jp, list = [];
      for (const c of NC.build(root.LINES)) { if (c.rec.d !== W.dir || c.rec === W.trip.rec) continue; const LL = root.LINES[c.line], jj = LL.stations.findIndex(s => s.jp === en); if (jj < 0) continue; const kmJ = LL.stations[jj].km, S = c.stops;
        if (S.some(p => p.i === jj)) continue;
        for (let q = 0; q < S.length - 1; q++) { const k0 = LL.stations[S[q].i].km, k1 = LL.stations[S[q + 1].i].km; if (kmJ > Math.min(k0, k1) && kmJ < Math.max(k0, k1)) { list.push({ c, tb: c.td(S[q]) + (c.ta(S[q + 1]) - c.td(S[q])) * ((kmJ - k0) / (k1 - k0)) }); break; } } }
      W.passCand = { k, list }; W.passObj = new Map(); }
    const out = [], t0 = W.trip.t0; if (NC && W.haz) NC.step(W);
    for (const e of W.passCand.list) { const d = NC && W.haz ? NC.delayOf(W, e.c.key) : null; if (d && d.hold > 0) continue; const t = e.tb + (d ? d.delay : 0) - t0; if (t < W.t - 12 || t > W.t + 150) continue;
      let o = W.passObj.get(e.c.key); if (!o) { o = { label: _tl(e.c.rec.t, e.c.rec.n), v: e.c.rec.v }; W.passObj.set(e.c.key, o); } o.t = t; out.push(o); }
    for (const p of (W.passers && W.passers[k]) || []) if (p.syn) out.push(p);
    W.passDyn = { k, list: out };
  }
  const passersAt = (W, k) => (W.passDyn && W.passDyn.k === k ? W.passDyn.list : (W.passers && W.passers[k]) || []);
  function refreshOpposing(W, T) {
    if (!W.oppCat || (W.oppAt !== undefined && W.t - W.oppAt < 0.4 && W.t >= W.oppAt)) return; W.oppAt = W.t;
    const NC = root.NatCat; if (NC && W.haz) NC.step(W); if (NC) NC.updateObstacle(W, T);
    if (T.phase === 'dwell') refreshPassers(W, T);
    const now = W.trip.t0 + W.t, kmP = kmOfS(T.x, W.dir, W.line.kmEnd), down = W.dir === 'down', st = W.oppState || (W.oppState = new Map());
    for (const c of W.oppCat) { const p = c.pts, dl = NC && W.haz ? NC.delayOf(W, c.id) : null, nowE = now - (dl ? dl.delay : 0); let km = null, vo = 0;
      if (dl && dl.hold > 0) { st.delete(c.id); continue; }
      for (let k = 0; k < p.length && km === null; k++) { if (nowE >= p[k].ta && nowE <= p[k].td) { km = p[k].km; vo = 0; } else if (k < p.length - 1 && nowE > p[k].td && nowE < p[k + 1].ta) { const f = (nowE - p[k].td) / ((p[k + 1].ta - p[k].td) || 1); km = p[k].km + (p[k + 1].km - p[k].km) * f; vo = Math.abs(p[k + 1].km - p[k].km) * 1000 / ((p[k + 1].ta - p[k].td) || 1); } }
      if (km === null || vo < 5) { if (!st.has(c.id) || st.get(c.id).t0 > W.t) st.delete(c.id); continue; }
      const gap = (down ? km - kmP : kmP - km) * 1000;
      if (gap > 0 && gap < 40000) st.set(c.id, { t0: W.t + gap / Math.max(40, T.v + vo), v: c.rec.v, label: _tl(c.rec.t, c.rec.n) }); }
    for (const [k, s] of st) if (W.t - s.t0 > 6) st.delete(k);
    const arr = [...st.values()].filter(s => s.t0 - W.t < 150).sort((a, b) => a.t0 - b.t0); W.opposing = arr.map(s => s.t0); W.oppInfo = arr;
  }
  function oppKey(W, T, t0) {
    if (W.oppInfo) { let b = null; for (const s of W.oppInfo) if (!b || Math.abs(s.t0 - t0) < Math.abs(b.t0 - t0)) b = s; if (b && Math.abs(b.t0 - t0) < 1.5 && VEH[b.v]) return b.v; }
    const cm = W.line.meta.coupleMini; if (!cm) return W.line.meta.defVeh;
    const km = kmOfS(T.x, W.dir, W.line.kmEnd); if (km > cm.maxKm) return W.line.meta.defVeh;
    const sd = W.seed || 1, r = hash01(Math.round(t0), sd); if (r > cm.p) return 'E5';
    const mini = km <= 255 && hash01(Math.round(t0) + 7, sd) < 0.45 ? 'E8' : (km <= 255 ? 'E6' : cm.mini);
    return W.dir === 'down' ? 'E5+' + mini : mini + '+E5';          // ta xuống thì tàu ngược chiều đi lên: mini ở đuôi; ta lên thì ngược lại
  }
  // độ lệch ngang của đường chính Tohoku so với đường ta khi tuyến mini rẽ ra (hoặc nhập vào) ở gần ga ghép/tách
  // đường chính Tohoku (đi thẳng) so với đường ta (rẽ sang tuyến mini, bị cong): độ lệch ngang = −(độ lệch của ta so với tiếp tuyến tại ngã rẽ)
  const trunkCache = new Map();
  // jn: chỉ số ngã rẽ trong meta.junctions (bỏ trống = ngã rẽ nào đang trong tầm 3,2 km); các ngã rẽ không chồng lên nhau.
  // Tuyến con: đường chính của tuyến cha lệch ngang so với đường ta. Tuyến cha (branch: true): đường nhánh sang tuyến con lệch sang bên `side`.
  function trunkOff(W, s, jn) {
    const js = W.line.meta.junctions; if (!js) return 0; const Ly = root.Layout, L = W.line;
    for (let q = 0; q < js.length; q++) {
      if (jn !== undefined && jn !== q) continue; const sj = sOfKm(js[q].km, W.dir, L.kmEnd), d = W.dir === 'down' ? s - sj : sj - s; if (d <= 0 || (d > 3200 && jn === undefined)) continue;
      const key = W.lineId + W.dir + q, jq = js[q]; let tb = trunkCache.get(key);
      if (!tb) {       // nhánh rẽ ra từ tuyến cha: dùng đường cong ảo của tuyến con (R, dài) bắt đầu ở ngã rẽ
        const LL = jq.branch ? { curves: [[jq.km, jq.km + jq.len, jq.R, jq.side]], kmEnd: L.kmEnd } : L;
        tb = W.dir === 'down' ? Ly.lateralTable(LL, root.Sim || api, W.dir, sj, 3200, 10) : Ly.lateralTableBack(LL, root.Sim || api, W.dir, sj, 3200, 10); trunkCache.set(key, tb); }
      const f = Math.min(d, 3190) / 10, i = Math.floor(f), v = tb[i] + (tb[i + 1] - tb[i]) * (f - i); return jq.branch ? (W.dir === 'down' ? -jq.side : jq.side) * Math.abs(v) : -v;      // nhánh rẽ trái (khi đi xuống) thì khi đi lên nằm bên PHẢI
    }
    return 0;
  }
  // tàu chạy trước trên đường Tohoku có thể là đoàn ghép (Hayabusa + Komachi, Yamabiko + Tsubasa): thêm đơn vị mini và ga tách/ghép cho nó
  function withMini(L, rec, dir, seed) {
    const cm = L.meta.coupleMini; if (!cm || rec.cp || rec.t === 'Nasuno' || hash01(seed * 7 + (+rec.n || 0), 11) > 0.5) return rec;
    const stops = new Set(rec.s.filter(e => !e[3]).map(e => e[0])), cand = rec.t === 'Yamabiko' ? [['Fukushima', 'E8']] : [['Morioka', 'E6'], ['Fukushima', 'E8']];
    for (const [nm, mini] of cand) { const i = L.stations.findIndex(x => x.en === nm); if (i < 0 || !stops.has(i)) continue;
      return Object.assign({}, rec, dir === 'down' ? { v: mini + '+E5', cp: [i, 'E5'] } : { v: 'E5', cp: [i, 'E5+' + mini] }); }
    return rec;
  }
  function genStabled(W, M) {
    const Ly = root.Layout, L = W.line; W.stabled = []; if (!Ly) return; const r = rng((W.seed || 1) * 131 + 5);
    M.forEach((m, k) => {
      const st = L.stations[m.i]; if (!st || !st.lay || (k === 0 && m.s === M[0].s && false)) return;
      const sc = Ly.station(st.lay, W.dir, Ly.pickOf(st, m.i, W)), cand = sc.tracks.filter(t => !t.main && t !== sc.ours); if (!cand.length || r() > 0.3) return;
      const t = cand[Math.floor(r() * cand.length)], face = t.own ? 1 : -1; let key = L.meta.defVeh;      // face = 1: đỗ quay đầu theo chiều chạy của ta; -1: quay ngược lại (đường chiều kia)
      if (L.meta.coupleMini && st.km <= L.meta.coupleMini.maxKm && r() < 0.5) { const north = (W.dir === 'down') === (face === 1), mini = r() < 0.5 ? 'E6' : 'E8'; key = r() < 0.4 ? 'E5' : (north ? mini + '+E5' : 'E5+' + mini); }      // mini luôn ở phía bắc đoàn
      W.stabled.push({ k, i: m.i, track: t, key, face, front: geoS(m) + (r() * 100 - 30) });
    });
  }
  // ---- Tàu của tuyến cha chạy chung đường trước ngã rẽ (Tohoku trên Tokyo–Omiya; Joetsu trên Omiya–Takasaki): đi trước ta, buộc ta giữ giãn cách
  // thời điểm (s) tàu rec của tuyến LF ở km (nội suy giữa các ga dừng); null nếu km nằm ngoài hành trình
  function tAtKm(LF, rec, km) {
    const st = rec.s.filter(e => !e[3]); if (st.length < 2) return null;
    for (let q = 0; q < st.length - 1; q++) {
      const a = LF.stations[st[q][0]].km, b = LF.stations[st[q + 1][0]].km; if ((km - a) * (km - b) > 0) continue;
      const ta = st[q][2] != null ? st[q][2] : st[q][1], tb = st[q + 1][1] != null ? st[q + 1][1] : st[q + 1][2];
      return a === b ? ta : ta + (tb - ta) * (km - a) / (b - a);
    }
    return null;
  }
  function shareInfo(L) {       // các ngã rẽ nơi tuyến này tách khỏi tuyến cha; chỉ số ga trùng nhau (cùng danh sách ga đầu tuyến)
    if (L._share) return L._share; L._share = [];
    (L.meta.junctions || []).forEach((j, q) => {
      let maxI = -1; L.stations.forEach((st, i) => { if (st.km <= j.km) maxI = i; }); const LF = j.shared ? lineOf(j.line) : null;
      if (LF && maxI >= 0 && L.stations.slice(0, maxI + 1).every((st, i) => LF.stations[i] && LF.stations[i].en === st.en)) L._share.push({ q, j, LF, maxI });
    });
    return L._share;
  }
  function pickForeign(L, trip) {
    const M = trip.M, down = trip.dir === 'down', ka = L.stations[M[0].i].km, kb = L.stations[M[M.length - 1].i].km, lo = Math.min(ka, kb), hi = Math.max(ka, kb); let best = null;
    for (const sh of shareInfo(L)) {
      const hi2 = Math.min(hi, sh.j.km); if (hi2 - lo < 1) continue;
      const kref = down ? lo : hi2, tOur = tAtKm(L, trip.rec, kref); if (tOur == null) continue;
      for (const rec of sh.LF.trains) {
        if (rec.d !== trip.dir) continue; const tf = tAtKm(sh.LF, rec, kref); if (tf == null) continue; const gap = tOur - tf; if (gap < 90 || gap > 1500) continue;
        let ok = true; for (let k = lo; k <= hi2 && ok; k += 2) { const a = tAtKm(sh.LF, rec, k), b = tAtKm(L, trip.rec, k); if (a != null && b != null && a > b + 5) ok = false; }      // không để tàu ta vượt tàu kia
        if (ok && (!best || gap < best.gap)) best = { rec, gap, sh };
      }
    }
    return best;
  }
  // lịch của tàu chạy trước thuộc tuyến cha: cắt ở ngã rẽ; sau ngã rẽ (chiều xuống) chạy thẳng "thông qua" rồi biến mất, chiều lên xuất hiện đang chạy ngay trước ngã rẽ
  function foreignLeadM(L, trip, f) {
    const { rec, sh } = f, LF = sh.LF, down = trip.dir === 'down', t0 = trip.t0, seq = trainSeq(rec).filter(e => e.i <= sh.maxI);
    const mk = e => ({ name: _s(L.stations[e.i]), rom: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, trip.dir, L.kmEnd), stop: e.stop, arr: e.arr != null ? e.arr - t0 : null, dep: e.dep != null ? e.dep - t0 : null });
    const kx = down ? sh.j.km + 10 : sh.j.km + 3, tx = tAtKm(LF, rec, kx), LM = seq.map(mk), mid = { name: sh.j.line, jp: '', i: sh.maxI + 1, s: sOfKm(kx, trip.dir, L.kmEnd), stop: false };
    if (tx != null) { if (down) { LM.push(Object.assign(mid, { thru: true, arr: tx - t0, dep: null })); } else { LM.unshift(Object.assign(mid, { fly: true, arr: null, dep: tx - t0 })); } }
    return fillPlan(LM);
  }
  // ---- Nhiệm vụ kiểm tra tự do: 923 Doctor Yellow (T4) và E926 East i. Không có ga dừng cố định: chọn ga đầu/ga cuối bất kỳ trên tuyến, chạy vào đêm giữa chuyến khách cuối và chuyến khách đầu ngày.
  // Số liệu thiết bị là mô phỏng [I]: chỉ đúng về loại phép đo, không đúng về giá trị.
  const INSPECT = { T4: { name: 'Doctor Yellow', band: [160, 270], sensors: ['track', 'wire', 'signal', 'radio', 'ride'] }, E926: { name: 'East i', band: [140, 275], sensors: ['track', 'wire', 'signal', 'radio', 'contact'] } };      // mỗi tàu một bộ cảm biến [I]
  const SENSORS = {
    track: { name: _t('Hình học ray'), unit: 'mm', vlo: 120, bad: [_t('cao thấp (高低) lệch'), _t('hướng (通り) lệch'), _t('khổ ray (軌間) lệch'), _t('vênh (水準) lệch')], amp: 7 },
    wire: { name: _t('Dây điện'), unit: 'mm', vlo: 100, bad: [_t('dây chùng'), _t('dây lệch ngang (偏位)'), _t('giá treo lỏng'), _t('độ cao dây lệch')], amp: 40 },
    signal: { name: _t('Tín hiệu ATC'), unit: 'dB', vlo: 100, bad: [_t('mã ATC yếu'), _t('mã ATC sai'), _t('vòng ray nhiễu')], amp: 6 },
    radio: { name: _t('Vô tuyến'), unit: 'dB', vlo: 40, bad: [_t('mất sóng vô tuyến tàu'), _t('nhiễu rò sóng (LCX)')], amp: 8 },
    ride: { name: _t('Dao động toa'), unit: 'm/s²', vlo: 80, bad: [_t('rung ngang vượt ngưỡng'), _t('rung dọc vượt ngưỡng')], amp: 0.25 },
    contact: { name: _t('Lực tiếp xúc cần vẹt'), unit: 'N', vlo: 100, bad: [_t('lực tiếp xúc thấp (cần vẹt bật nảy)'), _t('điểm cứng trên dây (hard spot)'), _t('lực tiếp xúc quá cao')], amp: 35 } };
  const MCELL = 100, MBUF = 600;     // ô phủ 100 m; chừa 10 phút trước chuyến khách đầu ngày [I]
  const ceil5 = t => Math.ceil(t / 300) * 300;
  function inspectWindow(L, lo, hi) {
    const first = {}, last = {}; let maxLast = 0;
    for (const rec of L.trains) { if (INSPECT[rec.v]) continue; for (let i = lo; i <= hi; i++) { const t = timeAt(L, rec, i); if (t == null) continue; if (first[i] === undefined || t < first[i]) first[i] = t; if (last[i] === undefined || t > last[i]) last[i] = t; if (t > maxLast) maxLast = t; } }
    return { first, last, t0: ceil5(maxLast + 600) };
  }
  // makeMission(lineId, [ga0, ga1, ga2...], veh, chặng = 0, giờ bắt đầu chặng (chặng ≥ 1)) hoặc makeMission(lineId, từ, đến, veh) cho một chặng; mỗi chặng là một thế giới riêng, đổi chiều ở ga giữa
  function makeMission(lineId, a, b, c, d, e) {
    const stations = Array.isArray(a) ? a : [a, b], vehKey = Array.isArray(a) ? b : c, leg = Array.isArray(a) ? (c || 0) : 0, carry = Array.isArray(a) ? d : null;
    const L = lineOf(lineId), fromI = stations[leg], toI = stations[leg + 1], count = stations.length - 1; if (!INSPECT[vehKey] || toI === undefined || fromI === toI || !L.stations[fromI] || !L.stations[toI]) return null;
    const dir = toI > fromI ? 'down' : 'up', step = dir === 'down' ? 1 : -1, lo = Math.min(fromI, toI), hi = Math.max(fromI, toI), win = inspectWindow(L, lo, hi), t0 = leg > 0 && carry ? ceil5(carry) : win.t0;
    const km = i => L.stations[i].km, distM = Math.abs(km(toI) - km(fromI)) * 1000, s = [];
    for (let i = fromI; i !== toI + step; i += step) s.push(i === fromI ? [i, null, t0, 0] : i === toI ? [i, t0 + Math.round(distM / (190 / 3.6)) + 180, null, 0] : [i, null, null, 1]);
    const rec = { t: INSPECT[vehKey].name, n: _t('nhiệm vụ'), d: dir, v: vehKey, s, src: 'M', mir: 0 }, trip = makeTrip(lineId, rec, fromI, toI);
    if (!trip) return null; trip.mission = { veh: vehKey, win, lo, hi, leg, count, stations }; trip.label = _t('{0} · nhiệm vụ {1} → {2}', rec.t, _s(L.stations[fromI]), _s(L.stations[toI])) + (count > 1 ? _t(' · chặng {0}/{1}', leg + 1, count) : ''); return trip;
  }
  function initMission(W, trip, seed) {
    const M = W.player.M, s0 = M[0].s, s1 = M[M.length - 1].s, n = Math.ceil((s1 - s0) / MCELL) + 1, r = rng((seed || 1) * 313 + 7), keys = INSPECT[trip.mission.veh].sensors.slice(), cov = {}, defects = [];
    for (const k of keys) cov[k] = new Float32Array(n);
    const cnt = Math.max(4, Math.round((s1 - s0) / 1000 / 22 * (0.8 + r() * 0.4)));      // khoảng 1 lỗi mỗi 22 km, chia cho các cảm biến
    for (let q = 0, tries = 0; q < cnt && tries < 400; tries++) { const s = s0 + 900 + r() * Math.max(1, s1 - s0 - 1800); if (defects.some(d => Math.abs(d.s - s) < 900)) continue; q++;
      const k = keys[Math.floor(r() * keys.length)], sev = 1 + Math.floor(r() * 3), lab = SENSORS[k].bad[Math.floor(r() * SENSORS[k].bad.length)]; defects.push({ sensor: k, s, sev, label: lab, val: +(SENSORS[k].amp * (0.9 + sev * 0.7)).toFixed(2), seen: false, missed: false, marked: false, passed: false }); }
    defects.sort((a, b) => a.s - b.s);
    return { keys, leg: trip.mission.leg, count: trip.mission.count, t0: trip.t0, veh: trip.mission.veh, win: trip.mission.win, lo: trip.mission.lo, hi: trip.mission.hi, s0, s1, n, cov, defects, measure: false, rec: Object.fromEntries(keys.map(k => [k, []])), lastRecS: s0, falseMarks: 0, marks: 0, measT: 0, inBandT: 0, outBandT: 0, minMargin: 1e9, conflict: false, warned: {}, flash: null, markedAt: -99 };
  }
  const bandOf = vk => INSPECT[vk].band;
  // chất lượng phép đo (0..1) của một cảm biến ngay bây giờ: cần đang bật đo, đúng dải tốc độ, ổn định, ATC bật (tín hiệu), cần vẹt nâng (dây điện)
  function measureQ(T, k) {
    const Ms = T.W.mission; if (!Ms || !Ms.measure || T.phase !== 'run' || T.cut) return 0; const kmh = T.v * 3.6, sn = SENSORS[k];
    if (kmh < sn.vlo || (k === 'track' || k === 'wire' || k === 'signal' || k === 'contact') && kmh < bandOf(Ms.veh)[0] * 0.75) return 0;
    if ((k === 'wire' || k === 'contact') && T.pan === false) return 0; if (k === 'signal' && T.atcOn === false) return 0;
    const inBand = kmh >= bandOf(Ms.veh)[0] && kmh <= bandOf(Ms.veh)[1] + 1, steady = Math.abs(T.a) < 0.25 ? 1 : Math.abs(T.a) < 0.6 ? 0.6 : 0.3;
    return (inBand ? 1 : 0.55) * steady;
  }
  const hash1 = x => { const v = Math.sin(x * 12.9898) * 43758.5453; return v - Math.floor(v); };
  function missionValue(Ms, k, s) {         // giá trị đọc được của cảm biến k tại s: nền ngẫu nhiên nhỏ + gờ ở chỗ lỗi
    const sn = SENSORS[k]; let v = (hash1(s * 0.07 + k.length) - 0.5) * sn.amp * 0.35;
    for (const d of Ms.defects) if (d.sensor === k) { const u = (s - d.s) / 55; if (Math.abs(u) < 3) v += d.val * Math.exp(-u * u) * (d.sev === 2 ? 0.9 : 1); }
    return v;
  }
  function missionStep(W, T, dt) {
    const Ms = W.mission; if (!Ms || T.phase === 'end') return; const x = T.x;
    if (T.phase === 'run') {
      const cell = clamp(Math.floor((x - Ms.s0) / MCELL), 0, Ms.n - 1), kmh = T.v * 3.6;
      if (Ms.measure) { Ms.measT += dt; const b = bandOf(Ms.veh); if (kmh >= b[0] && kmh <= b[1] + 1) Ms.inBandT += dt; else Ms.outBandT += dt; }
      for (const k of Ms.keys) { const q = measureQ(T, k); if (q > Ms.cov[k][cell]) Ms.cov[k][cell] = q; }
      while (x - Ms.lastRecS >= 5) { Ms.lastRecS += 5; for (const k of Ms.keys) { const q = measureQ(T, k); const a = Ms.rec[k]; a.push({ s: Ms.lastRecS, v: q > 0.3 ? missionValue(Ms, k, Ms.lastRecS) : null }); if (a.length > 800) a.splice(0, a.length - 800); } }
      for (const d of Ms.defects) { if (d.passed || x < d.s) continue; d.passed = true; if (measureQ(T, d.sensor) >= 0.4) { d.seen = true; d.seenT = W.t; Ms.flash = { t: W.t, text: `${SENSORS[d.sensor].name}: ${d.label} ${d.val} ${SENSORS[d.sensor].unit}`, sev: d.sev }; } else d.missed = true; }
    }
    // không xung đột với chuyến khách đầu ngày: tới từng ga phía trước phải trước giờ chuyến khách đầu tiên qua ga đó trừ 10 phút
    const j = T.M.findIndex(m => m.s > x - 1); if (j >= 0) { const m = T.M[j], i = m.i, tAbs = W.trip.t0 + W.t + (m.s - x) / Math.max(T.v, 40); let fa = Ms.win.first[i]; if (fa !== undefined) { while (fa <= Ms.t0) fa += 86400; const margin = fa - MBUF - tAbs; Ms.minMargin = Math.min(Ms.minMargin, margin); Ms.nextFirst = { i, name: m.name, margin };
      const wr = Ms.warned; if (margin < 1800 && !wr.w30) { wr.w30 = 1; W.say('warn', _t('Chuyến khách đầu ngày qua {0} sau ~{1} phút: lên kế hoạch rời đoạn này.', m.name, Math.round(margin / 60))); }
      if (margin < 600 && !wr.w10) { wr.w10 = 1; W.say('bad', _t('Chuyến khách đầu ngày sắp tới {0} (còn ~{1} phút): phải kết thúc đo và về ga!', m.name, Math.round(margin / 60))); }
      if (margin < 0 && !Ms.conflict) { Ms.conflict = true; W.say('bad', _t('XUNG ĐỘT LỊCH TÀU KHÁCH tại {0}: bạn chiếm đường quá giờ cho phép (−30 điểm).', m.name)); } } }
  }
  function toggleMeasure(T) { const Ms = T.W.mission; if (!Ms) return false; Ms.measure = !Ms.measure; T.W.say('info', Ms.measure ? _t('Đo: BẬT. Giữ {0}–{1} km/h, gia tốc êm để phép đo hợp lệ.', bandOf(Ms.veh)[0], bandOf(Ms.veh)[1]) : _t('Đo: TẮT.')); return Ms.measure; }
  function markDefect(T) {
    const W = T.W, Ms = W.mission; if (!Ms || T.phase !== 'run') return false; Ms.marks++;
    const d = Ms.defects.find(q => q.seen && !q.marked && T.x - q.s >= 0 && T.x - q.s <= 600);
    if (d) { d.marked = true; W.say('stop', _t('Đã đánh dấu: {0} · {1} ({2} {3}) tại km {4}.', SENSORS[d.sensor].name, d.label, d.val, SENSORS[d.sensor].unit, kmOfS(d.s, W.dir, W.line.kmEnd).toFixed(1))); return true; }
    Ms.falseMarks++; W.say('warn', _t('Đánh dấu nhưng không có tín hiệu lỗi trong 600 m vừa qua (đánh dấu sai).')); return false;
  }
  function missionScore(T, W) {
    const Ms = W.mission, keys = Ms.keys, out = [];
    let covSum = 0; const found = Ms.defects.filter(d => d.marked).length, tot = Ms.defects.length;
    for (const k of keys) { const a = Ms.cov[k], c = a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), ds = Ms.defects.filter(d => d.sensor === k), fd = ds.filter(d => d.marked).length; covSum += c;
      out.push([SENSORS[k].name, _t('phủ {0}% · tìm {1}/{2} lỗi', Math.round(c * 100), fd, ds.length), Math.round(c * 100), ds.length ? Math.round(fd / ds.length * 100) : 100]); }
    const covScore = covSum / keys.length * 100, findScore = tot ? found / tot * 100 : 100, comfort = Math.max(0, 100 - T.comfort * W.diff.comfortK);
    const confPen = Ms.conflict ? 30 : 0, falsePen = Math.min(20, Ms.falseMarks * 3), atcPen = Math.min(25, T.atcCount * 5), bandPen = Ms.measT > 60 ? Math.min(20, Math.round(Ms.outBandT / Ms.measT * 30)) : 0, unfinished = T.finished && !T.failed ? 0 : 15;
    const final = Math.max(0, Math.min(100, Math.round(covScore * 0.4 + findScore * 0.4 + comfort * 0.2 - confPen - falsePen - atcPen - bandPen - unfinished)));
    return { mission: true, leg: Ms.leg, count: Ms.count, legKm: Math.abs(Ms.s1 - Ms.s0) / 1000, out, covScore: Math.round(covScore), findScore: Math.round(findScore), found, tot, comfort: Math.round(comfort), confPen, falsePen, atcPen, bandPen, minMargin: Ms.minMargin, marks: Ms.marks, falseMarks: Ms.falseMarks, earlyPen: 0, ackPen: 0, hornPen: 0, wiperPen: 0, lampPen: 0, atcOffPen: 0, anxPen: 0, firePen: 0, deadPen: 0, xingPen: 0, netBonus: 0, final, kwh: Math.round(T.kwh), regen: Math.round(T.regen), btMax: T.btMax || 0 };
  }
  // ga cuối tuyến (đầu hoặc cuối hành trình là ga đầu/cuối của tuyến): mỗi chuyến chọn ngẫu nhiên (theo seed, không đụng dòng ngẫu nhiên của thế giới) MỘT trong mọi đường có sân ga.
  // Chọn đường thuộc nhóm đường chính ngược chiều (nhóm u) thì tàu phải qua ghi chữ X để sang đường chính của ta [I, sơ đồ HaisenNet]; ga giữa tuyến: giữ cách chọn cũ.
  function termPicks(W, L, M, seed) {
    const Ly = root.Layout; if (!Ly) return; const r = rng(seed * 977 + 13); W.termPick = {};
    for (const m of [M[0], M[M.length - 1]]) { if (!m || m.i === undefined) continue; if (m.i !== 0 && m.i !== L.stations.length - 1) continue; if (L.meta.curveA && m.i !== 0) continue; const st = L.stations[m.i];      // tuyến mini (Yamagata, Akita): ga cuối phía nhánh (Shinjo, Akita) là đường đơn, không chọn đường và không qua ghi chữ X; chỉ Tokyo mới có if (!st || !st.lay || st.side) continue;
      const pt = Ly.station(st.lay, W.dir, 0).platTracks; if (pt.length < 2) continue; W.termPick[m.i] = pt[Math.floor(r() * pt.length)].i; }
  }
  function createWorld(lineId, trip, opts) {
    opts = opts || {};
    const rnd = rng(opts.seed || 1), W = baseWorld(lineId, trip.dir, opts.diff, opts.seed, opts.weather), L = W.line;
    W.real = opts.real || null; W.trip = trip; W.catalog = catalogOf(L, trip.dir);
    const M = fillPlan(trip.M.map(m => Object.assign({}, m)));
    termPicks(W, L, M, opts.seed || 1);
    W.load = opts.load != null ? opts.load : 0.45 + W.rnd() * 0.55;
    W.player = newTrain(M, W, { veh: trip.rec.v, label: trip.label, load: W.load, cp: trip.rec.cp });
    W.passers = trip.mission ? {} : passers(L, W.catalog, { ...trip, M });
    if (trip.mission) { opts.lead = false; opts.events = false; W.mission = initMission(W, trip, opts.seed || 1); }
    { const P = W.player; if (P.cp && !P.cp.done && P.cp.kind === 'join') { const j = M.findIndex(m => m.i === P.cp.i), pv = VEH['E5'];      // đoàn Tohoku chờ sẵn ở ga: ta dừng cách đuôi nó 2,5 m
        if (j >= 0) { M[j].sOrig = M[j].s; M[j].s -= pv.len + COUPLE_GAP; W.parked.push({ key: 'E5', front: M[j].sOrig, kind: 'wait', i: P.cp.i }); } } }
    { const P = W.player; if (P.cp && P.cp.done && P.cp.kind === 'split' && M[0].i === P.cp.i) W.parked.push({ key: 'E5', front: M[0].s - P.veh.len - COUPLE_GAP, kind: 'left' }); }      // xuất phát đúng ga tách: phần Tohoku còn đứng ở sân ga phía sau
    if (!trip.mission) planCouple(W, L, trip, W.player, opts.couple || 'never', opts.seed || 1);
    if (opts.stabled !== false) genStabled(W, M);
    let leadRec = opts.lead === false ? null : pickLead(L, W.catalog, trip), fgn = opts.lead === false ? null : pickForeign(L, trip);
    if (fgn && leadRec && timeAt(L, trip.rec, trip.M[0].i) - timeAt(L, leadRec, trip.M[0].i) <= fgn.gap) fgn = null;       // chọn tàu đi trước sát hơn (cùng tuyến hay tuyến cha)
    if (fgn) leadRec = fgn.rec; else if (leadRec) leadRec = withMini(L, leadRec, trip.dir, opts.seed || 1);
    if (leadRec) {
      const seq = trainSeq(leadRec);
      const LM = fgn ? foreignLeadM(L, trip, fgn) : fillPlan(seq.map(e => ({ name: _s(L.stations[e.i]), rom: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, trip.dir, L.kmEnd), stop: e.stop, arr: e.arr != null ? e.arr - trip.t0 : null, dep: e.dep != null ? e.dep - trip.t0 : null })));
      LM[0].arr = null; LM[LM.length - 1].dep = null; W.leadLabel = _tl(leadRec.t, leadRec.n); W.leadRef = { t: leadRec.t, n: leadRec.n, d: leadRec.d };
      if (opts.events !== false && L.single && L.single.length) {      // tàu chạy trước cũng dừng tránh tàu ngược chiều trên đường đơn
        const rr = rng((opts.seed || 1) * 977 + 3), inS = km => L.single.some(([a, b]) => km > a && km < b), cpI = leadRec.cp ? leadRec.cp[0] : -1;
        const cand = LM.map((m, k) => k).filter(k => k > 0 && k < LM.length - 1 && !LM[k].stop && LM[k].pt != null && LM[k].i !== cpI && inS(L.stations[LM[k].i].km));
        for (let q = 0, n = Math.min(cand.length, 1 + Math.floor(rr() * 2)); q < n; q++) { const j = cand.splice(Math.floor(rr() * cand.length), 1)[0], dw = 70 + Math.floor(rr() * 5) * 25; LM[j].stop = true; LM[j].arr = LM[j].pt; LM[j].dep = LM[j].pt + dw; }
        fillPlan(LM);
      }
      W.lead = newTrain(LM, W, { lead: true, veh: leadRec.v, label: W.leadLabel, load: 0.6, cp: fgn ? null : leadRec.cp });
      W.leadStartT = LM[0].dep != null ? LM[0].dep : -600;
      if (fgn) {
        W.lead.fj = fgn.sh.q; W.leadForeign = fgn.sh.j.line;
        if (LM[0].fly) { const Ld = W.lead, j1 = LM.findIndex((m, q) => q > 0 && m.stop), ds = j1 < 0 ? 1e9 : LM[j1].s - LM[0].s;      // xuất hiện đang chạy trên đường chính, trước ngã rẽ
          Ld.started = true; Ld.phase = 'run'; Ld.door = 'closed'; Ld.x = LM[0].s; Ld.v = Math.min(limitKm(L, kmOfS(Ld.x, trip.dir, L.kmEnd)) / 3.6, Ld.veh.vmax, Math.sqrt(2 * G.aATC * 0.7 * Math.max(ds - 300, 0))); }
      }
    }
    if (opts.events === false) { W.weatherKind = 'clear'; W.opposing = []; } else { if (!trip.mission) W.oppCat = buildOppCat(W, trip); genEvents(W, M, rnd); if (!trip.mission && root.NatCat) root.NatCat.init(W); }
    W.t = W.lead ? W.leadStartT - 5 : 0;
    prerun(W);
    return W;
  }
  // tàu chạy trước: cảnh báo trên điện đàm khi nó đứng trên đường chính, và VA CHẠM (mũi tàu ta chạm đuôi nó) là kết thúc chuyến; điều kiện loại trừ giống ATC (đã rẽ đường tránh, cùng sân ga)
  function leadWatch(W, T) {
    const L = W.lead; if (!L || !W.running || !T.started || T.finished || T.phase === 'end' || T.phase === 'dwell') return;
    if (L.phase === 'end' || leadDiverged(W, L) || (L.phase === 'dwell' && L.atMark && sharesPlatformLane(W, L)) || offMain(L)) return;
    const gap = L.x - L.veh.len - T.x, still = L.v < 2 && L.phase === 'run'; W.leadWarn = W.leadWarn || { a: false, b: false, c: 0 };
    if (!still) { W.leadWarn.a = W.leadWarn.b = false; }
    if (L.x > T.x) {
      if (still && gap < 3500 && !W.leadWarn.a) { W.leadWarn.a = true; W.say('warn', _t('Tàu phía trước ({0}) đang ĐỨNG trên đường chính, cách {1} m. Giảm tốc, chuẩn bị dừng.', W.leadLabel || _t('tàu khác'), Math.round(gap))); }
      if (still && gap < 900 && !W.leadWarn.b) { W.leadWarn.b = true; W.say('bad', _t('Tàu phía trước đứng cách {0} m! Phanh ngay.', Math.round(gap))); }
      if (T.atcOn === false && gap < 1500 && T.v > 15 && W.t - W.leadWarn.c > 8) { W.leadWarn.c = W.t; W.say('bad', _t('ATC đang CẮT, tàu phía trước cách {0} m: không còn ai phanh thay bạn.', Math.round(gap))); }
    }
    if (gap <= 0 && L.x > T.x - 1) { T.collision = true; T.failed = true; T.finished = true; T.phase = 'end'; T.cut = true; T.log.push(['FAIL', W.t, _t('Va chạm tàu phía trước')]); W.say('bad', _t('VA CHẠM với tàu phía trước ({0}) ở {1} km/h. Chuyến kết thúc.', W.leadLabel || _t('tàu khác'), Math.round(T.v * 3.6))); W.shakeAt = W.t; W.shakeAmp = 9; }
  }
  function advanceLead(W, dt) {
    const L = W.lead; if (!L) return;
    if (W.leadHoldUntil && W.t < W.leadHoldUntil) L.cut = true; else if (L.cut && !W.eqkActive) L.cut = false;
    autoDepart(L); const c = autopilot(L); step(L, dt, c === undefined ? {} : { cmd: c });
  }
  function prerun(W) { const dt = 0.1, saved = W.events; W.events = []; while (W.t < 0) { W.t += dt; advanceLead(W, dt); } W.t = 0; W.running = false; W.events = saved; }
  function ackOldest(W) {
    const m = (W.pending || []).find(p => !p.done); if (!m) return false; m.done = true; W.ackCount = (W.ackCount || 0) + 1;
    if (W.t - m.t > 60 && !m.timeout) { W.ackPen += 2; W.say('warn', _t('Nhắc lại lệnh chậm (> 60 s): −2 điểm.')); }
    else W.say('stop', _t('Đã nhắc lại lệnh với điều độ: "') + m.text.slice(0, 48) + (m.text.length > 48 ? '…' : '') + '"');
    return true;
  }
  function tick(W, dt, input, auto) {
    const T = W.player;
    if (auto) { autoDepart(T); autoExtras(T); }
    if (W.running) {
      W.t += dt; fire(W); advanceLead(W, dt);
      for (const m of W.pending) if (!m.done && !m.timeout && W.t - m.t > 120) { m.timeout = true; W.ackPen += 4; W.say('bad', _t('Điều độ: KHÔNG nhận được nhắc lại lệnh! (−4 điểm). Hãy nhấn Y để nhắc lại.')); }
      if (W.decision && W.t - W.decision.t0 > W.decision.timeout) { W.say('warn', _t('Hết thời gian trả lời: coi như từ chối.')); answerDecision(W, 'b'); }
      if (W.armedFire && T.x >= W.armedFire.s) { const af = W.armedFire; W.armedFire = null; af.fn(W); }
    }
    moveParked(W, dt);
    if (W.parked.length) W.parked = W.parked.filter(p => !(p.kind === 'left' && Math.abs(T.x - p.front) > 6000) && !(p.mv && p.front - T.x > 9000));
    W.rainHere = W.zones.some(z => z.kind === 'rain' && !z.hold && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 && T.x < z.s1);
    if (auto) {
      const c = autopilot(T);
      if (c !== undefined) { if (c >= 0) { T.pw = Math.round(c * 13); T.bk = 0; } else { T.pw = 0; T.bk = c < -1.05 ? 8 : Math.max(1, Math.round(-c * 7)); } }
      step(T, dt, c === undefined ? {} : { cmd: c });
    } else { autoHorn(T); step(T, dt, input || {}); }
    if (W.mission) missionStep(W, T, dt);
    if (!T.isLead) leadWatch(W, T);
    if (W.eqkActive && W.t >= W.eqkRelease) {
      W.eqkActive = false;
      for (const X of allTrains(W)) { X.cut = false; if (X === T) W.zones.push({ s0: X.x - 2000, s1: X.x + 12000, v: (W.recoverV || 70) / 3.6, tA: W.t, tB: W.t + 1500, kind: 'eqk', label: _t('chạy kiểm tra sau sự cố') }); }
      W.say('info', W.recoverText || _t('Điều độ: kiểm tra xong. Được chạy lại, tốc độ ≤ 70 km/h trong 12 km đầu.')); W.recoverText = null; W.recoverV = null;
    }
    if (W.fireActive && W.t > W.fireEnd) W.fireActive = false;
  }
  function fire(W) { for (const e of W.events) if (!e.done && W.t >= e.at) { e.done = true; e.fire(W); } }
  const fmtT = s => { s = Math.round(s); const m = Math.floor(s / 60), r = ((s % 60) + 60) % 60; return m + ':' + String(r).padStart(2, '0'); };

  // ---- Sự kiện ----------------------------------------------------------------
  function startHold(W, sEnd, dur, why) {
    const rel = W.t + dur; W.lastHold = { t: W.t, why: why || _t('khác'), dur, seq: ((W.lastHold && W.lastHold.seq) || 0) + 1 };
    for (const T of allTrains(W)) {
      if (!T || T.phase === 'end' || T.x >= sEnd) continue;
      T.holdAt = W.t; let jj = -1; const brk = T.v * T.v / (2 * 0.6) + 300;
      for (let j = T.k + (T.phase === 'dwell' ? 0 : 1); j < T.M.length; j++) { if (T.M[j].s - T.x > brk || (T.phase === 'dwell' && j === T.k)) { jj = j; break; } }
      if (jj < 0) jj = T.M.length - 1;
      if (jj === T.k && T.phase === 'dwell') { T.holds[jj] = Math.max(T.holds[jj] || 0, rel); continue; }
      if (!T.M[jj].stop) T.forced = jj;
      if (T.forced === jj && stationDiverts(W.line, T.M[jj].i, W.dir, W)) {       // (ga không có lịch dừng) còn kịp giảm tốc xuống tốc độ qua ghi và rẽ vào đường sân ga không?
        const need = G.turnoutIn + Math.max(0, (T.v * T.v - G.turnoutV * G.turnoutV) / (2 * G.aATC)) + 150;
        if (T.M[jj].s - T.x < need) { T.M[jj].mainStop = true; if (T === W.player) W.say('warn', _t('Dừng khẩn tại {0}: quá gần để rẽ ghi, tàu sẽ dừng ở ĐƯỜNG CHÍNH trước/ngay ga (không có sân ga).', T.M[jj].name)); }
      }
      T.holds[jj] = Math.max(T.holds[jj] || 0, rel);
    }
  }
  // ---- Chế độ thực tế: dựng thời tiết và dư chấn từ snapshot W.real (chụp lúc bắt đầu chuyến; xem realmode.js). Ngưỡng mưa ≥ 50/60 mm/h và gió ≥ 30 m/s lấy như thời tiết ngẫu nhiên; các mức nhẹ hơn (mưa 30 mm/h, gió 20–25 m/s, tuyết) là [I].
  const hav = (a, b, c, d) => { const p = Math.PI / 180, x = (c - a) * p, y = (d - b) * p * Math.cos((a + c) / 2 * p); return 6371 * Math.hypot(x, y); };      // km (xấp xỉ phẳng)
  const hmOf = s => { s = ((Math.floor(s) % 86400) + 86400) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  function realWeather(W, M, ev, planT) {
    const wx = W.real.wx, t0 = W.trip.t0, lo = Math.min(M[0].s, M[M.length - 1].s) - 3000, hi = Math.max(M[0].s, M[M.length - 1].s) + 3000;
    const P = wx.pts.map(p => ({ p, s: sOfKm(p.km, W.dir, W.line.kmEnd) })).sort((a, b) => a.s - b.s), worst = { rain: 0, snow: 0, gust: 0 }; W.realCells = [];
    for (let j = 0; j < P.length; j++) {
      const a = j ? (P[j - 1].s + P[j].s) / 2 : lo, b = j < P.length - 1 ? (P[j].s + P[j + 1].s) / 2 : hi, s0 = Math.max(lo, a), s1 = Math.min(hi, b); if (s1 <= s0) continue;
      const p = P[j].p, nH = p.rain.length;
      for (let h = 0; h < nH; h++) {
        const tA = (wx.h0 + h) * 3600 - t0, tB = tA + 3600; if (tB < 0 || tA > planT * 1.5 + 1800) continue;
        const rain = p.rain[h] || 0, snow = p.snow[h] || 0, gust = p.gust[h] || 0, zone = (v, kind, label) => W.zones.push({ s0, s1, v, tA, tB, kind, label });
        worst.rain = Math.max(worst.rain, rain); worst.snow = Math.max(worst.snow, snow); worst.gust = Math.max(worst.gust, gust);
        if (rain >= 0.5) zone(rain >= 50 ? 70 / 3.6 : rain >= 30 ? 170 / 3.6 : 1e3, 'rain', rain >= 50 ? _t('mưa ≥ 50 mm/h') : rain >= 30 ? _t('mưa ≥ 30 mm/h') : _t('mưa'));
        if (snow >= 0.2) zone((snow >= 3 ? 110 : snow >= 1 ? 160 : 230) / 3.6, 'snow', _t('tuyết rơi'));
        if (gust >= 20 && gust < 30) zone((gust >= 25 ? 170 : 230) / 3.6, 'wind', gust >= 25 ? _t('gió ≥ 25 m/s') : _t('gió ≥ 20 m/s'));
        if (rain >= 0.5) W.realCells.push({ kind: 'rain', lat: p.lat, lon: p.lon, r: 60, t0: tA, t1: tB });
        if (snow >= 0.2) W.realCells.push({ kind: 'snow', lat: p.lat, lon: p.lon, r: 60, t0: tA, t1: tB });
        if (gust >= 15) W.realCells.push({ kind: 'wind', lat: p.lat, lon: p.lon, r: 60, t0: tA, t1: tB });
        const hold = (kind, label, msg) => { const dur = Math.max(300, Math.min(1800, tB - Math.max(0, tA))), at = Math.max(0, tA), ss0 = s0, ss1 = s1;
          ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + dur, kind, hold: true, label }); startHold(w, ss1, dur, kind); w.say('bad', msg + ' ' + _t('Nhấn Y để nhắc lại lệnh.'), { ack: true }); }); };
        if (rain >= 60) hold('rain', _t('mưa ≥ 60 mm/h'), _t('Thời tiết thật: mưa {0} mm/h (≥ 60): DỪNG chạy, về ga gần nhất chờ lệnh.', Math.round(rain)));
        if (gust >= 30) hold('wind', _t('gió ≥ 30 m/s'), _t('Thời tiết thật: gió giật {0} m/s (≥ 30): DỪNG chạy, chờ kiểm tra ray.', Math.round(gust)));
      }
    }
    const kind = worst.gust >= 25 && worst.rain >= 10 ? 'typhoon' : worst.snow >= 0.2 ? 'snow' : worst.rain >= 0.5 ? 'rain' : 'clear', fx = v => v.toFixed(1);
    ev(0, w => w.say('info', _t('Chế độ thực tế · {0} (giờ Nhật) · dọc tuyến: mưa tối đa {1} mm/h, gió giật tối đa {2} m/s, tuyết tối đa {3} cm/h.', hmOf(t0), fx(worst.rain), fx(worst.gust), fx(worst.snow))));
    return kind;
  }
  // dư chấn của động đất thật (JMA qua P2PQuake) trong vài giờ qua: chạy kiểm tra chậm ở đoạn gần tâm chấn
  function realQuakes(W, M, ev) {
    const Q = W.real && W.real.eq; if (!Q || !Q.length) return; const t0 = W.trip.t0, lo = Math.min(M[0].s, M[M.length - 1].s) - 3000, hi = Math.max(M[0].s, M[M.length - 1].s) + 3000;
    for (const q of Q) {
      if (q.shindo < 4) continue; let best = null;
      for (const st of W.line.stations) { const s = sOfKm(st.km, W.dir, W.line.kmEnd); if (s < lo || s > hi || !(st.lat > 0)) continue; const d = hav(st.lat, st.lon, q.lat, q.lon); if (!best || d < best.d) best = { d, s }; }
      if (!best || best.d > 120) continue;
      const tq = q.t - t0, dur = q.shindo >= 5.5 ? 10800 : 5400; if (tq + dur < 0) continue;
      W.zones.push({ s0: best.s - 40000, s1: best.s + 40000, v: (q.shindo >= 5 ? 70 : 110) / 3.6, tA: tq, tB: tq + dur, kind: 'eqk', label: _t('kiểm tra sau động đất') });
      ev(0, w => w.say('warn', _t('Động đất thật lúc {0}: {1} (M{2}, 震度 {3}). Chạy kiểm tra chậm ở đoạn gần tâm chấn.', hmOf(q.t), q.name || '?', q.mag.toFixed(1), q.shindo)));
    }
  }
  // Động đất thật xảy ra TRONG lúc chơi (index.html thăm dò P2PQuake ở chế độ thực tế, rồi gọi qua thao tác 'quake' để được ghi lại và xem lại đúng).
  // q = { lat, lon, mag, depth, shindo, name, t }. Rung đủ mạnh tại tàu (ước lượng 震度 giảm 1 mỗi 60 km, ngưỡng cắt điện 3,5) thì cắt điện sau khi sóng S tới; gần tuyến thì chạy kiểm tra chậm; còn lại chỉ thông báo [I].
  function injectQuake(W, q) {
    const T = W.player; if (!T || !(q.shindo >= 3)) return false;
    const L = W.line, S = L.stations, km = kmOfS(T.x, W.dir, L.kmEnd); let j = 0; while (j < S.length - 2 && S[j + 1].km < km) j++;
    const a = S[j], b = S[Math.min(j + 1, S.length - 1)], f = Math.max(0, Math.min(1, (km - a.km) / ((b.km - a.km) || 1)));
    const dKm = hav(a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f, q.lat, q.lon), mag = q.mag > 0 ? q.mag : 3 + q.shindo * 0.5, name = q.name || '?';
    if (W.haz) W.haz.quakes.push({ t: W.t, lat: q.lat, lon: q.lon, mag, depth: q.depth >= 0 ? q.depth : 10, real: true });
    if (dKm <= (q.shindo - 3.5) * 60) {
      const delay = Math.min(60, dKm / 4), dur = 480 + (q.shindo >= 5 ? 300 : 0) + Math.round(dKm * 4);
      W.say('bad', _t('Động đất thật vừa xảy ra lúc {0}: {1} (M{2}, 震度 {3}), cách tàu khoảng {4} km. Chuẩn bị chịu rung.', hmOf(q.t), name, mag.toFixed(1), q.shindo, Math.round(dKm)));
      W.events.push({ at: W.t + delay, done: false, fire: w => { w.eqkAt = w.t; w.eqkActive = true; w.eqkRelease = w.t + dur + 20; for (const X of allTrains(w)) X.cut = true; w.say('bad', _t('CẢNH BÁO ĐỘNG ĐẤT: cắt điện, tàu phanh khẩn cấp. Giữ nguyên, chờ kiểm tra ray và dây điện. Phát thanh trấn an hành khách (M).')); } });
      return true;
    }
    const M = T.M, lo = Math.min(M[0].s, M[M.length - 1].s) - 3000, hi = Math.max(M[0].s, M[M.length - 1].s) + 3000; let best = null;
    for (const st of S) { const s = sOfKm(st.km, W.dir, L.kmEnd); if (s < lo || s > hi || !(st.lat > 0)) continue; const d = hav(st.lat, st.lon, q.lat, q.lon); if (!best || d < best.d) best = { d, s }; }
    if (best && best.d <= 120 && q.shindo >= 4) {
      W.zones.push({ s0: best.s - 40000, s1: best.s + 40000, v: (q.shindo >= 5 ? 70 : 110) / 3.6, tA: W.t, tB: W.t + (q.shindo >= 5.5 ? 10800 : 5400), kind: 'eqk', label: _t('kiểm tra sau động đất') });
      W.say('warn', _t('Động đất thật lúc {0}: {1} (M{2}, 震度 {3}). Chạy kiểm tra chậm ở đoạn gần tâm chấn.', hmOf(q.t), name, mag.toFixed(1), q.shindo));
    } else W.say('info', _t('Động đất thật lúc {0}: {1} (M{2}, 震度 {3}), ở xa tuyến nên không ảnh hưởng chuyến.', hmOf(q.t), name, mag.toFixed(1), q.shindo));
    return true;
  }
  function genEvents(W, M, rnd) {
    const D = W.diff, lastS = M[M.length - 1].s, firstS = M[0].s, span = Math.abs(lastS - firstS), sgn = lastS >= firstS ? 1 : -1;
    const planT = M[M.length - 1].arr || 600;
    const pts = []; M.forEach(m => { if (m.arr != null) pts.push([m.arr, m.s]); if (m.dep != null) pts.push([m.dep, m.s]); if (m.pt != null && !m.stop) pts.push([m.pt, m.s]); }); pts.sort((a, b) => a[0] - b[0]);
    const sAtTime = t => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, s0_] = pts[i - 1], [t1, s1_] = pts[i]; return t1 === t0 ? s1_ : s0_ + (s1_ - s0_) * (t - t0) / (t1 - t0); } return pts[pts.length - 1][1]; };
    const ev = (at, fn) => W.events.push({ at, fire: fn, done: false });
    const stopsIdx = M.map((m, k) => m.stop && k > 0 && k < M.length - 1 ? k : -1).filter(k => k >= 0), usedJ = new Set();
    const pickJ = list => { const c = list.filter(k => !usedJ.has(k)); if (!c.length) return -1; const j = c[Math.floor(rnd() * c.length)]; usedJ.add(j); return j; };
    let weather = W.weather; if (weather === 'real' && !(W.real && W.real.wx)) weather = 'auto';      // thiếu dữ liệu thật (mất mạng): thời tiết ngẫu nhiên theo seed
    if (weather === 'auto') { const r = rnd(); weather = r < 0.3 ? 'clear' : r < 0.62 ? 'rain' : r < 0.76 ? 'typhoon' : r < 0.88 ? 'snow' : (W.real ? 'clear' : 'eqk'); }      // chế độ thực tế (kể cả khi mất mạng): không có động đất giả
    const isReal = weather === 'real'; if (isReal) weather = realWeather(W, M, ev, planT); if (W.real) realQuakes(W, M, ev);
    W.weatherKind = weather;
    const n = D.events[0] + Math.floor(rnd() * (D.events[1] - D.events[0] + 1)), pool = [];
    if (weather === 'eqk' || (!W.real && rnd() < D.eqk)) pool.push('eqk');      // chế độ thực tế: chỉ động đất thật (dư chấn), không có động đất ngẫu nhiên theo seed
    if (weather === 'snow' && !isReal) {
      // vùng tuyết: Sekigahara–Maibara (Tokaido) và vùng núi Tohoku phía bắc; chỉ có [I]
      const zs = W.line.meta.snow || [];
      for (const [k0, k1, v, lab] of zs) { const a = sOfKm(k0, W.dir, W.line.kmEnd), b = sOfKm(k1, W.dir, W.line.kmEnd); W.zones.push({ s0: Math.min(a, b), s1: Math.max(a, b), v: v / 3.6, tA: -1e9, tB: 1e9, kind: 'snow', label: lab }); }
      ev(0, w => w.say('info', _t('Dự báo: tuyết dày ở vùng núi. Chạy chậm theo quy định (tài liệu 06 §5.3).')));
    }
    if (!isReal) { if (weather === 'rain') pool.push('rain', 'rain'); if (weather === 'typhoon') pool.push('rain', 'wind', 'rain'); }
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
        const ss0 = Math.min(c - hw, c + hw), ss1 = Math.max(c - hw, c + hw); (W.hazPlan = W.hazPlan || []).push({ kind: 'rain', at, dur: d50, s: c, r: hw / 1000 + 25 });
        ev(at - 240, w => w.say('info', _t('Cục Khí tượng: mưa lớn sắp tới đoạn phía trước (dự báo ~50 mm/h). Chuẩn bị chạy chậm, bật gạt mưa (V).')));
        ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 70 / 3.6, tA: w.t, tB: w.t + d50, kind: 'rain', label: _t('mưa ≥ 50 mm/h') }); w.say('warn', _t('Mưa 50 mm/h: chạy chậm 70 km/h trong vùng mưa (tài liệu 06 §5.3). Nhấn Y để nhắc lại lệnh.'), { ack: true }); });
        if (stop) ev(at + stopDelay, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + stopDur, kind: 'rain', hold: true, label: _t('mưa ≥ 60 mm/h') }); startHold(w, ss1, stopDur, 'rain'); w.say('bad', _t('Mưa ≥ 60 mm/h: DỪNG chạy. Về ga gần nhất rồi chờ lệnh (~{0}). Nhấn Y để nhắc lại lệnh.', fmtT(stopDur)), { ack: true }); });
      } else if (kind === 'wind') {
        const c = sAtTime(at + 300 + rnd() * 400), hw = 25000 + rnd() * 20000, dur = 600 + rnd() * 900, ss0 = Math.min(c - hw, c + hw), ss1 = Math.max(c - hw, c + hw); (W.hazPlan = W.hazPlan || []).push({ kind: 'wind', at, dur, s: c, r: hw / 1000 + 25 });
        ev(at - 300, w => w.say('info', _t('Cảnh báo gió mạnh 25–30 m/s ở đoạn phía trước.')));
        ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + dur, kind: 'wind', hold: true, label: _t('gió ≥ 30 m/s') }); startHold(w, ss1, dur, 'wind'); w.say('bad', _t('Gió ≥ 30 m/s: DỪNG chạy. Về ga gần nhất, chờ kiểm tra ray (~{0}). Nhấn Y để nhắc lại lệnh.', fmtT(dur)), { ack: true }); });
      } else if (kind === 'eqk') {
        const at2 = Math.round(planT * (0.2 + rnd() * 0.6)), dur = 480 + rnd() * 600; (W.hazPlan = W.hazPlan || []).push({ kind: 'eqk', at: at2, dur, s: sAtTime(at2) });
        ev(at2, w => { w.eqkAt = w.t; w.eqkActive = true; w.eqkRelease = w.t + dur + 20; for (const X of allTrains(w)) X.cut = true; w.say('bad', _t('CẢNH BÁO ĐỘNG ĐẤT: cắt điện, tàu phanh khẩn cấp. Giữ nguyên, chờ kiểm tra ray và dây điện. Phát thanh trấn an hành khách (M).')); });
      } else if (kind === 'leadstop') {
        const d = 240 + rnd() * 420;
        ev(at, w => { w.leadHoldUntil = w.t + d; w.leadStopAt = w.t; w.say('warn', _t('Điều độ: tàu phía trước ({0}) dừng khẩn do hành khách bệnh, ~{1}. ATC sẽ giữ khoảng cách.', w.leadLabel, fmtT(d))); });
      } else if (kind === 'hold' && stopsIdx.length) {
        const j = pickJ(stopsIdx); if (j < 0) continue;
        const extra = 60 + Math.floor(rnd() * 5) * 30, tNotice = Math.max(0, (M[j].arr || 0) - 600 - rnd() * 300);
        ev(tNotice, w => { const T = w.player; if (T.k >= j || !M[j].stop) return; const rel = (M[j].dep != null ? M[j].dep : M[j].arr) + extra; T.holds[j] = rel; w.say('warn', _t('Điều độ: giữ tàu tại {0} thêm {1} s (chờ tàu nhanh vượt / nối chuyến). Không khởi hành trước {2}. Nhấn Y để nhắc lại lệnh.', M[j].name, extra, fmtT(rel)), { ack: true }); });
      } else if (kind === 'skip' && stopsIdx.length > 1) {
        const j = pickJ(stopsIdx.slice(1)); if (j < 0) continue; const tNotice = Math.max(0, (M[j].arr || 0) - 700);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || !M[j].stop) return; M[j].stop = false; T.orderAt = w.t; fillPlan(M); w.say('warn', _t('Điều độ: THÔNG QUA ga {0} (không dừng). Chạy tiếp tới {1}. Nhấn Y để nhắc lại lệnh.', M[j].name, M[nextTarget(T)].name), { ack: true }); });
      } else if (kind === 'addstop' || kind === 'sick') {
        const passIdx = M.map((m, k) => !m.stop && k > 0 && k < M.length - 1 ? k : -1).filter(k => k >= 0); if (!passIdx.length) continue;
        const j = pickJ(passIdx); if (j < 0) continue; const tNotice = Math.max(0, (M[j].pt || 0) - 700), dwell = kind === 'sick' ? 180 : 60;
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || M[j].stop || M[j].pt == null) return; M[j].stop = true; M[j].arr = M[j].pt; M[j].dep = M[j].pt + dwell; T.orderAt = w.t; fillPlan(M);
          const car = 1 + Math.floor(rnd() * Math.max(1, T.veh.cars));
          w.say('warn', kind === 'sick' ? _t('Trưởng tàu: hành khách toa {0} bệnh đột ngột. Điều độ cho DỪNG THÊM tại {1} ({2} s) để đưa cấp cứu. Phanh đúng vạch. Nhấn Y để nhắc lại lệnh.', car, M[j].name, dwell) : _t('Điều độ: DỪNG THÊM tại {0} (60 s) vì tàu phía sau cần vượt. Phanh đúng vạch. Nhấn Y để nhắc lại lệnh.', M[j].name), { ack: true }); });
      } else if (kind === 'slow') {
        const c = sAtTime(at + 500 + rnd() * 500), len = 15000 + rnd() * 15000, ss0 = Math.min(c, c + sgn * len), ss1 = Math.max(c, c + sgn * len), dur = 900 + rnd() * 900;
        ev(Math.max(0, at - 300), w => { w.zones.push({ s0: ss0, s1: ss1, v: 170 / 3.6, tA: w.t, tB: w.t + dur, kind: 'order', label: _t('chạy chậm theo lệnh') }); w.say('warn', _t('Điều độ: kiểm tra nền đường/thi công, chạy chậm ≤ 170 km/h trên một đoạn phía trước (xem bản đồ). Nhấn Y để nhắc lại lệnh.'), { ack: true }); });
      } else if (kind === 'workers') {
        const gap = 20000 + rnd() * 10000, len = 3000;
        ev(at, w => { const T = w.player, s = T.x + sgn * gap; if ((s - lastS) * sgn > -len) return; const s0 = Math.min(s, s + sgn * len), s1 = Math.max(s, s + sgn * len);
          const z = { s0, s1, checked: false, hornOK: false }; w.workers.push(z); w.zones.push({ s0, s1, v: 230 / 3.6, tA: w.t, tB: w.t + 1500, kind: 'order', label: _t('nhân viên làm việc') });
          w.say('warn', _t('Điều độ: có nhân viên bảo trì làm việc cạnh đường ở phía trước (3 km). Chạy ≤ 230 km/h và BẤM CÒI (H) khi tới gần. Nhấn Y để nhắc lại lệnh.'), { ack: true }); });
      } else if (kind === 'animal') {
        const gap = 18000 + rnd() * 9000;
        ev(at, w => { const T = w.player, s = T.x + sgn * gap; if ((s - lastS) * sgn > -2000) return; w.animals.push({ s, active: true, resolved: false, hornOK: false });
          w.say('warn', _t('Báo từ trạm: hươu/lợn rừng xuất hiện gần đường ray phía trước. Bấm còi (H) khi còn khoảng 1 km để xua đuổi, nếu không có thể va chạm.')); });
      } else if (kind === 'doorfault') {
        ev(at, w => { const car = 1 + Math.floor(rnd() * Math.max(1, w.player.veh.cars)); w.faults.push({ car, kind: 'door', text: _t('Toa {0}: cửa lỗi (không đóng hoàn toàn)', car), level: 'warn', t: w.t }); w.player.doorFaultOnce = true; w.say('warn', _t('TIMS: toa {0} báo lỗi cửa. Lần đóng cửa tới có thể phải mở lại.', car)); });
      } else if (kind === 'fault') {
        ev(at, w => { if (w.line.meta.atc === 'NS' && hash01(Math.round(at), W.seed || 1) < 0.5) { inject(w, 'atcfault', {}); return; } const car = 1 + Math.floor(rnd() * Math.max(1, w.player.veh.cars)); w.faults.push({ car, kind: 'hotbox', text: _t('Toa {0}: nhiệt độ ổ trục cao', car), level: 'bad', t: w.t }); w.zones.push({ s0: -1e9, s1: 1e9, v: 230 / 3.6, tA: w.t, tB: 1e9, kind: 'fault', label: _t('nhiệt độ ổ trục cao') }); w.say('bad', _t('CẢNH BÁO TIMS: toa {0} nhiệt độ bệ ổ trục cao. Hạn chế ≤ 230 km/h tới hết chuyến (tài liệu 06 §5.4). Nhấn Y để nhắc lại lệnh.', car), { ack: true }); });
      } else if (kind === 'xingcar') {
        ev(at, w => { const T = w.player, cand = w.xings.filter(g => !g.hit && g.s > T.x + 3500 && (g.s - lastS) * sgn < 0 && Math.abs(g.s - T.x) < 25000); if (!cand.length) return; const g = cand[Math.floor(rnd() * Math.min(3, cand.length))]; w.armedX = { xg: g, s: g.s }; });
      } else if (kind === 'wire') {
        const dur = 1500 + rnd() * 1500;
        ev(at, w => { const T = w.player, s = T.x + sgn * 12000; w.wires.push({ s, tA: w.t, tB: w.t + dur }); w.zones.push({ s0: s - 1500, s1: s + 1500, v: 0, tA: w.t, tB: w.t + dur, kind: 'wire', hold: true, label: _t('dây điện hỏng') }); startHold(w, s + 1500, dur, 'wire');
          w.say('bad', _t('SỰ CỐ DÂY ĐIỆN: dây điện võng ở phía trước, mất điện đoạn này. DỪNG chạy, về ga gần nhất, chờ khôi phục (~{0}). Phát thanh trấn an (M). Nhấn Y để nhắc lại lệnh.', fmtT(dur)), { ack: true }); });
      } else if (kind === 'fire') {
        const doFire = w => { const car = 1 + Math.floor(rnd() * Math.max(1, w.player.veh.cars)); w.fireActive = true; w.fireEnd = w.t + 900; w.fireCar = car; const dur = 900 + rnd() * 600;
          startHold(w, 1e12, dur, 'fire'); w.faults.push({ car, kind: 'fire', text: _t('Toa {0}: báo cháy/khói', car), level: 'bad', t: w.t });
          w.say('bad', _t('BÁO CHÁY toa {0}: nếu đang TRONG HẦM thì KHÔNG dừng, chạy ra khỏi hầm; ngoài hầm thì dừng ở ga gần nhất. Báo điều độ (Y) và phát thanh trấn an (M).', car), { ack: true }); };
        ev(at, w => { // nếu sắp có hầm phía trước thì chờ tới khi tàu vào hầm
          const T = w.player; let target = null; for (const [k0, k1] of w.line.meta.tunnels) { if (k1 - k0 < 2.5) continue; const a = sOfKm(k0, w.dir, w.line.kmEnd), b = sOfKm(k1, w.dir, w.line.kmEnd), lo = Math.min(a, b), hi = Math.max(a, b); const ent = sgn > 0 ? lo : hi; if ((ent - T.x) * sgn > 3000 && (ent - T.x) * sgn < 40000 && (ent - lastS) * sgn < 0) { target = ent + sgn * 1500; break; } }
          if (target != null) { w.armedFire = { s: target, fn: doFire }; w.say('info', _t('Tàu sắp vào hầm. Hãy sẵn sàng.')); } else doFire(w); });
      } else if (kind === 'overtake') {
        const cands = stopsIdx.filter(j => W.passers[j] && W.passers[j].length && !usedJ.has(j)); if (!cands.length) continue; const j = pickJ(cands), p = W.passers[j][0];
        const tNotice = Math.max(0, (M[j].arr || 0) - 500);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || !M[j].stop) return;
          w.decision = { t0: w.t, timeout: 40, text: _t('Điều độ đề nghị: cho {0} (tàu nhanh phía sau) vượt tại {1}. Chấp nhận giữ tàu thêm 90 s?', p.label, M[j].name),
            a: { label: _t('Chấp nhận (Y)'), fn: w2 => { const dep = (M[j].dep != null ? M[j].dep : M[j].arr) + 90; T.holds[j] = Math.max(T.holds[j] || 0, dep); w2.netScore += 3; w2.say('stop', _t('Đã chấp nhận: giữ tại {0} tới {1}. +3 điểm phối hợp.', M[j].name, fmtT(dep))); } },
            b: { label: _t('Từ chối (N)'), fn: w2 => { w2.netScore -= 3; w2.say('warn', _t('Đã từ chối: {0} có thể bị trễ phía sau. −3 điểm phối hợp.', p.label)); } } };
          w.say('warn', w.decision.text + _t('  [Y] chấp nhận · [N] từ chối (40 s).')); });
      } else if (kind === 'planned') {
        if (stopsIdx.length < 2) continue; const jEnd = stopsIdx[Math.floor(stopsIdx.length * 0.5) + Math.floor(rnd() * Math.floor(stopsIdx.length * 0.5))]; if (jEnd === undefined || jEnd >= M.length - 1) continue; const tNotice = Math.max(0, (M[jEnd - 1].arr || 0) - 900);
        ev(tNotice, w => { const T = w.player; if (T.k >= jEnd - 1) return; M.length = jEnd + 1; M[jEnd].stop = true; M[jEnd].dep = null; fillPlan(M); w.trip.truncated = true; w.say('warn', _t('KẾ HOẠCH NGỪNG CHẠY (計画運休): do thời tiết xấu, chuyến này KẾT THÚC tại {0}. Nhấn Y để nhắc lại lệnh.', M[jEnd].name), { ack: true }); });
      }
    }
    // đường đơn (mini-Shinkansen): thêm các lần dừng tránh tàu ngược chiều ở ga (kể cả ga không có lịch dừng: 運転停車 [N: Wikipedia JP Akita Shinkansen])
    if (W.line.single && W.line.single.length) {
      const L = W.line, inSingle = km => L.single.some(([a, b]) => km > a && km < b);
      const cand = M.map((m, k) => k).filter(k => k > 0 && k < M.length - 1 && !usedJ.has(k) && inSingle(L.stations[M[k].i].km) && !(W.player.cp && M[k].i === W.player.cp[0]));
      const singleKm = L.single.reduce((a, [x, y]) => a + Math.max(0, Math.min(y, L.kmEnd) - x), 0), n = cand.length ? clamp(Math.round(span / 1000 / 45 * (0.7 + rnd() * 0.6)), 1, 4) : 0;
      for (let q = 0; q < n && cand.length; q++) {
        const j = cand.splice(Math.floor(rnd() * cand.length), 1)[0], dwell = 70 + Math.floor(rnd() * 5) * 25, tNotice = Math.max(0, (M[j].arr != null ? M[j].arr : (M[j].pt || 0)) - 700 - rnd() * 300);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || M[j].xwait) return; M[j].xwait = dwell;
          if (!M[j].stop && M[j].pt != null) { M[j].stop = true; M[j].arr = M[j].pt; M[j].dep = M[j].pt + dwell; fillPlan(M); }
          else T.holds[j] = Math.max(T.holds[j] || 0, (M[j].dep != null ? M[j].dep : (M[j].arr || 0)) + dwell);
          T.orderAt = w.t; w.say('warn', _t('Điều độ: tuyến đường đơn, DỪNG TRÁNH tàu ngược chiều tại {0} (~{1} s). Dừng đúng vạch, chờ tàu ngược chiều vào ga rồi mới chạy tiếp.', M[j].name, dwell)); });
      }
    }
    W.opposing = []; if (!W.oppCat) for (let t = 100 + rnd() * 120; t < planT + 900; t += 90 + rnd() * 140) W.opposing.push(Math.round(t));      // có danh mục tàu thật (W.oppCat) thì tàu ngược chiều lấy từ lịch, không sinh ngẫu nhiên
    W.events.sort((a, b) => a.at - b.at);
  }


  // Tạo sự kiện có chủ đích (dùng cho bài hướng dẫn và kiểm thử). kind: rain | workers | animal | hold | overtake | eqk | wire | fire | sick | leadstop
  function inject(W, kind, o) {
    o = o || {}; const T = W.player, M = T.M, sgn = M[M.length - 1].s >= M[0].s ? 1 : -1;
    if (kind === 'rain') { const s0 = Math.min(T.x + sgn * (o.ahead || 1500), T.x + sgn * ((o.ahead || 1500) + 9000)), s1 = Math.max(T.x + sgn * (o.ahead || 1500), T.x + sgn * ((o.ahead || 1500) + 9000)); W.zones.push({ s0, s1, v: 70 / 3.6, tA: W.t, tB: W.t + 900, kind: 'rain', label: _t('mưa ≥ 50 mm/h') }); W.say('warn', _t('Mưa 50 mm/h: chạy chậm 70 km/h trong vùng mưa. Nhấn Y để nhắc lại lệnh.'), { ack: true }); }
    else if (kind === 'workers') { const s = T.x + sgn * (o.ahead || 6000), s0 = Math.min(s, s + sgn * 3000), s1 = Math.max(s, s + sgn * 3000); W.workers.push({ s0, s1, checked: false, hornOK: false }); W.zones.push({ s0, s1, v: 230 / 3.6, tA: W.t, tB: W.t + 1500, kind: 'order', label: _t('nhân viên làm việc') }); W.say('warn', _t('Điều độ: có nhân viên làm việc cạnh đường phía trước. BẤM CÒI (H) khi tới gần. Nhấn Y để nhắc lại lệnh.'), { ack: true }); }
    else if (kind === 'animal') { W.animals.push({ s: T.x + sgn * (o.ahead || 6000), active: true, resolved: false, hornOK: false }); W.say('warn', _t('Báo từ trạm: hươu xuất hiện gần đường ray phía trước. Bấm còi (H) khi còn khoảng 1 km.')); }
    else if (kind === 'hold') { const j = Math.min(M.length - 1, nextTarget(T)); const rel = W.t + (o.sec || 90) + 60; T.holds[j] = rel; W.say('warn', _t('Điều độ: giữ tàu tại {0} thêm {1} s. Nhấn Y để nhắc lại lệnh.', M[j].name, o.sec || 90), { ack: true }); }
    else if (kind === 'overtake') { W.decision = { t0: W.t, timeout: 40, text: _t('Điều độ đề nghị: cho tàu nhanh phía sau vượt. Chấp nhận giữ thêm 90 s?'), a: { label: _t('Chấp nhận (Y)'), fn: w2 => { w2.netScore += 3; w2.say('stop', _t('Đã chấp nhận. +3 điểm phối hợp.')); } }, b: { label: _t('Từ chối (N)'), fn: w2 => { w2.netScore -= 3; w2.say('warn', _t('Đã từ chối. −3 điểm phối hợp.')); } } }; W.say('warn', W.decision.text + _t('  [Y] chấp nhận · [N] từ chối (40 s).')); }
    else if (kind === 'eqk') { W.eqkAt = W.t; W.eqkActive = true; W.eqkRelease = W.t + (o.sec || 300); for (const X of allTrains(W)) X.cut = true; W.say('bad', _t('CẢNH BÁO ĐỘNG ĐẤT: cắt điện, tàu phanh khẩn cấp. Giữ nguyên. Phát thanh trấn an hành khách (M).')); }
    else if (kind === 'wire') { const s = T.x + sgn * 12000; W.wires.push({ s, tA: W.t, tB: W.t + 1800 }); W.zones.push({ s0: s - 1500, s1: s + 1500, v: 0, tA: W.t, tB: W.t + 1800, kind: 'wire', hold: true, label: _t('dây điện hỏng') }); startHold(W, s + 1500, 1800, 'wire'); W.say('bad', _t('SỰ CỐ DÂY ĐIỆN: DỪNG chạy, về ga gần nhất, chờ khôi phục. Nhấn Y để nhắc lại lệnh.'), { ack: true }); }
    else if (kind === 'fire') { W.fireActive = true; W.fireEnd = W.t + 900; startHold(W, 1e12, 900, 'fire'); W.faults.push({ car: 6, kind: 'fire', text: _t('Toa 6: báo cháy/khói'), level: 'bad', t: W.t }); W.say('bad', _t('BÁO CHÁY toa 6: nếu trong hầm thì KHÔNG dừng, ra khỏi hầm rồi dừng ở ga gần nhất. Báo điều độ (Y).'), { ack: true }); }
    else if (kind === 'atcfault') { const ah = o.ahead || 5000, s = T.x + sgn * ah, dur = o.sec || 90, tB = W.t + ah / 55 + dur; W.zones.push({ s0: Math.min(s, s + sgn * 1500), s1: Math.max(s, s + sgn * 1500), v: 0, tA: W.t, tB, kind: 'atcfault', label: _t('ATC: tín hiệu 0') }); W.say('bad', _t('ATC báo TÍN HIỆU 0 phía trước ({0} mất mã hoặc tính lỗi: nguyên tắc fail-safe, không có tín hiệu thì coi là dừng). Dừng trước vùng, chờ điều độ xử lý (~{1} s). Nhấn Y để nhắc lại lệnh.', ATCN[W.line.meta.atc] || 'ATC', Math.round(dur)), { ack: true }); }
    else if (kind === 'leadstop' && W.lead) { W.leadHoldUntil = W.t + (o.sec || 300); W.leadStopAt = W.t; W.say('warn', _t('Điều độ: tàu phía trước dừng khẩn. ATC sẽ giữ khoảng cách.')); }
    return true;
  }

  // ---- Chế độ điều độ: mạng lưới nhiều tàu tự chạy, người chơi ra lệnh ---------------------
  function createNetwork(lineId, dir, opts) {
    opts = opts || {}; const W = baseWorld(lineId, dir, opts.diff, opts.seed, opts.weather), L = W.line, rnd = rng((opts.seed || 1) * 31 + 7);
    const t0 = opts.t0 != null ? opts.t0 : 8 * 3600, span = opts.span || 5400;
    const cat = catalogOf(L, dir).filter(r => { const f = r.s[0], l = r.s[r.s.length - 1], tf = f[2] != null ? f[2] : f[1], tl = l[1] != null ? l[1] : l[2]; return tl > t0 && tf < t0 + span && tf > t0 - 1800; });
    W.net = { trains: [], t0, span, recs: cat, catchUp: false, delayLog: [], conflicts: 0 }; W.isNet = true; W.running = true;
    for (const rec of cat) {
      const seq = trainSeq(rec), M = fillPlan(seq.map(e => ({ name: _s(L.stations[e.i]), rom: L.stations[e.i].en, jp: L.stations[e.i].jp, i: e.i, s: sOfKm(L.stations[e.i].km, dir, L.kmEnd), stop: e.stop, loop: !!L.stations[e.i].loop, arr: e.arr != null ? e.arr - t0 : null, dep: e.dep != null ? e.dep - t0 : null })));
      M[0].arr = null; M[M.length - 1].dep = null;
      const T = newTrain(M, W, { lead: true, veh: rec.v, label: _tl(rec.t, rec.n), load: 0.4 + rnd() * 0.6, id: rec.t + rec.n, cp: rec.cp }); T.rec = rec; T.cls = rec.t; W.net.trains.push(T);
    }
    // sự kiện ngẫu nhiên cho mạng: thời tiết, tàu hỏng/bệnh nhân, động đất
    const ev = (at, fn) => W.events.push({ at, fire: fn, done: false });
    const n = W.diff.events[0] + 1 + Math.floor(rnd() * 2);
    const midS = () => { const a = sOfKm(L.stations[0].km, dir, L.kmEnd), b = sOfKm(L.stations[L.stations.length - 1].km, dir, L.kmEnd); const trs = W.net.trains.filter(T => T.phase === 'run'); const T = trs[Math.floor(rnd() * trs.length)]; return T ? T.x : (a + b) / 2; };
    for (let i = 0; i < n; i++) {
      const at = 300 + rnd() * (span - 1200), k = Math.floor(rnd() * 4);
      if (k === 0) ev(at, w => { const c = midS() + 15000 * (rnd() - 0.2), hw = 25000, d = 900 + rnd() * 900; w.zones.push({ s0: c - hw, s1: c + hw, v: 70 / 3.6, tA: w.t, tB: w.t + d, kind: 'rain', label: _t('mưa ≥ 50 mm/h') }); w.say('warn', _t('Mưa lớn: toàn vùng chạy chậm 70 km/h.')); });
      else if (k === 1) ev(at, w => { const trs = w.net.trains.filter(T => T.phase === 'run'); if (!trs.length) return; const T = trs[Math.floor(rnd() * trs.length)], d = 240 + rnd() * 420; T.cut = true; T.stuckUntil = w.t + d; w.say('bad', _t('{0} dừng khẩn giữa đường (hành khách bệnh/thiết bị), ~{1}.', T.label, fmtT(d))); });
      else if (k === 2) ev(at, w => { const trs = w.net.trains.filter(T => T.phase === 'run' || T.phase === 'dwell'); if (!trs.length) return; const T = trs[Math.floor(rnd() * trs.length)], d = 180 + rnd() * 240; T.holds[T.k] = Math.max(T.holds[T.k] || 0, w.t + d); if (T.phase === 'dwell') w.say('warn', _t('{0} bị giữ tại {1} ~{2} (sự cố cửa).', T.label, T.M[T.k].name, fmtT(d))); else T.holds[Math.min(T.M.length - 1, nextTarget(T))] = w.t + d + 60; });
      else ev(at, w => { const c = midS(); w.zones.push({ s0: c - 12000, s1: c + 12000, v: 0, tA: w.t, tB: w.t + 900, kind: 'wind', hold: true, label: _t('gió ≥ 30 m/s') }); startHold(w, c + 12000, 900, 'wind'); w.say('bad', _t('Gió mạnh ≥ 30 m/s: các tàu trong vùng phải dừng ở ga gần nhất (~15 phút).')); });
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
    hold(W, T, j, sec) { if (!T || j <= T.k || j > T.M.length - 1 || !T.M[j].stop) return false; const base = T.M[j].dep != null ? T.M[j].dep : (T.M[j].arr || 0); T.holds[j] = Math.max(T.holds[j] || 0, base + sec, W.t + sec); W.say('stop', _t('Lệnh: giữ {0} tại {1} thêm {2} s.', T.label, T.M[j].name, sec)); W.cmds = (W.cmds || 0) + 1; return true; },
    release(W, T, j) { if (!T || T.holds[j] == null) return false; delete T.holds[j]; if (T.waitFor) T.waitFor = null; W.say('stop', _t('Lệnh: thả {0} tại {1}.', T.label, T.M[j] ? T.M[j].name : '?')); W.cmds = (W.cmds || 0) + 1; return true; },
    skip(W, T, j) { if (!T || j <= T.k || j >= T.M.length - 1 || !T.M[j].stop) return false; if (T.phase === 'run' && stationDiverts(W.line, T.M[j].i, W.dir, W) && T.M[j].s - T.x < G.turnoutIn + 300) { W.say('warn', _t('Không thể cho {0} thông qua {1}: tàu đã gần/ vào ghi sang đường sân ga.', T.label, T.M[j].name)); return false; } T.M[j].stop = false; fillPlan(T.M); W.say('stop', _t('Lệnh: {0} THÔNG QUA {1}.', T.label, T.M[j].name)); W.cmds = (W.cmds || 0) + 1; return true; },
    overtake(W, slow, fast, j) { if (!slow || !fast || j <= slow.k || !slow.M[j].stop) return false; slow.waitFor = { train: fast, s: slow.M[j].s }; slow.holds[j] = Math.max(slow.holds[j] || 0, 0); W.say('stop', _t('Lệnh: {0} chờ tại {1} cho {2} vượt.', slow.label, slow.M[j].name, fast.label)); W.cmds = (W.cmds || 0) + 1; return true; }
  };
  function netScore(W) {
    const trs = W.net.trains, rows = [];
    let totalMin = 0, late5 = 0, n = 0, maxD = 0, blocked = 0;
    for (const T of trs) { const last = T.results[T.results.length - 1]; if (!last) continue; const dl = Math.max(0, last.delay / 60); const wgt = T.cls === 'Nozomi' ? 1.3 : T.cls === 'Hikari' ? 1.0 : 0.8; totalMin += dl * wgt; n++; if (dl > 5) late5++; maxD = Math.max(maxD, dl); blocked += T.blockedT || 0; rows.push([T.label, T.phase === 'end' ? _t('đã tới ga cuối') : _t('đang chạy'), Math.round(dl * 10) / 10]); }
    n = Math.max(1, n);
    const avg = totalMin / n, score = Math.max(0, Math.round(100 - avg * 8 - late5 * 3 - maxD * 1.2 - blocked / 600 - (W.cmds || 0) * 0.3));
    return { score, avg: Math.round(avg * 10) / 10, late5, maxD: Math.round(maxD * 10) / 10, blocked: Math.round(blocked), n, rows, cmds: W.cmds || 0 };
  }

  function score(T, W) {
    if (W.mission) return missionScore(T, W);
    const D = W.diff, out = []; let tot = 0, n = 0;
    T.results.forEach(r => {
      if (r.overrun) { out.push([r.station, _t('CHẠY QUÁ GA'), 0, 0]); n++; return; }
      const ae = Math.abs(r.err), k = D.tolK, acc = ae <= 0.5 * k ? 100 : ae <= 1 * k ? 90 : ae <= 2 * k ? 75 : ae <= 5 * k ? 50 : ae <= 15 * k ? 30 : 10;
      const ex = r.excused || 0, late = r.delay - ex, pun = late <= 15 && late >= -30 ? 100 : late > 15 ? Math.max(20, 100 - (late - 15) * 0.5 * D.timeK) : Math.max(60, 100 + (late + 30) * 0.2);
      out.push([r.station + (r.extra ? _t(' (dừng thêm)') : ''), _t('lệch {0}{1} m · {2} {3} s', r.err >= 0 ? '+' : '', r.err.toFixed(2), r.delay >= 0 ? _t('trễ') : _t('sớm'), Math.abs(r.delay).toFixed(0)) + (ex > 5 ? _t(' (miễn {0} s do sự kiện)', ex.toFixed(0)) : ''), acc, Math.round(pun)]);
      tot += acc + pun; n++;
    });
    n = Math.max(1, n);
    const comfort = Math.max(0, 100 - T.comfort * D.comfortK), atcPen = T.atcCount * 8, earlyPen = Math.min(30, T.earlyDep * 0.3);
    const ackPen = Math.min(20, W.ackPen), hornPen = Math.min(20, T.hornPen + T.animalHit * 8), wiperPen = Math.min(10, Math.round(T.wiperBad / 20)), lampPen = Math.min(10, Math.round((T.lampBad || 0) / 30)), atcOffPen = Math.min(30, Math.round((T.atcOffBad || 0) / 8) + (T.atcCuts || 0) * 3);
    const colPen = T.collision ? 100 : 0, anxPen = Math.min(15, Math.round(Math.max(0, T.anxMax - 60) / 2.5)) + (T.panic ? 10 : 0), firePen = T.fireTunnel ? 15 : 0, deadPen = Math.min(20, (T.deadViol || 0) * 6), xingPen = Math.min(40, (T.xingHit || 0) * 25), netBonus = clamp(W.netScore || 0, -9, 9);
    const final = Math.max(0, Math.min(100, Math.round(tot / (2 * n) * 0.7 + comfort * 0.3 - atcPen - earlyPen - ackPen - hornPen - wiperPen - lampPen - atcOffPen - anxPen - firePen - deadPen - xingPen - colPen + netBonus)));
    return { out, comfort: Math.round(comfort), atcPen, earlyPen: Math.round(earlyPen), ackPen, hornPen, wiperPen, lampPen, atcOffPen, anxPen, firePen, deadPen, xingPen, netBonus, final, kwh: Math.round(T.kwh), regen: Math.round(T.regen), btMax: T.btMax || 0 };
  }

  const api = { injectQuake, passersAt, refreshOpposing, rearVis, ATCN, INSPECT, SENSORS, makeMission, toggleMeasure, markDefect, measureQ, oppKey, trunkOff, tAtKm, shareInfo, pickForeign, COUPLE_GAP, singleW, singleEff, oppHidden: (W, T) => singleEff(W, T.x) > 0.25, G, VEH, DIFF, WEATHER, LINE_META, NOTCH_MIN, NOTCH_MAX, notchName, rng, sOfKm, kmOfS, lineOf, biomeAt, gradeAt, gradeKm, inTunnel, structAt, curveAt, lampOn, needsLight, cycleLamp, toggleATC, togglePan, turnoutZones, divertsAt, sharesPlatformLane, switchPoints, stationDiverts, trainSeq, timeAt, makeTrip, fillPlan, catalogOf, pickLead, passers,
    createWorld, createNetwork, inject, netTick, netScore, dispatch: D_, tick, step, allowedSpeed, plannedTime, autopilot, autoDepart, autoExtras, nextTarget, score, fmtT, allTrains, massOf, resistOf, tractiveOf,
    setPower, setBrake, coast, toggleCS, adjustCS, toggleWiper, honk, confirmATC, requestClose, ackOldest, announcePA, answerDecision, departBlock, departNow, handleCmd };
  if (typeof module !== 'undefined') module.exports = api; else root.Sim = api;
})(typeof window !== 'undefined' ? window : globalThis);
