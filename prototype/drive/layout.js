// Bố trí đường và sân ga của một ga (số sân, số đường, đường thông qua, sân đảo/hai bên) và hình học dọc tuyến (đường cong, cao độ).
// Mã ga 'sân-đường-thông qua' lấy từ data-lines.js (Wikipedia JP, xem tools/build_struct.py). Kiểu sân đảo/hai bên chỉ có nguồn ở vài ga; phần còn lại là suy luận [I].
// Chuỗi bố trí viết theo chiều chạy XUỐNG (km tăng), trái -> phải khi nhìn từ buồng lái; Nhật chạy bên trái nên đường xuống nằm bên trái đường lên.
//   d/u = đường dừng chiều xuống/lên, D/U = đường thông qua chiều xuống/lên, P = sân ga.
(function (root) {
  const TOK = { '2-2-0': 'PduP', '2-2-1': 'PdDUuP', '2-3-1': 'PdDUuPu', '2-3-1c': 'dPdDUuP', '2-3-0': 'PduPu', '2-4-0': 'dPduPu', '2-4-0s': 'dPduPu', '2-4-1': 'dPdDUuPu', '2-4-1k': 'dPdDUuPu', '2-4-1f': 'dPdDUuPu', '1-2-1': 'DdPuU', '3-6-0': 'dPddPuuPu', '5-8-0': 'PdPddPduPuuPu', '1-2-0': 'dPu', '1-2-0t': 'dPu', '2-2-0w': 'PddP', '3-4-0': 'PdPduPu', '2-4-0t': 'dPddPu', '2-3-0a': 'PdduP', '2-3-0b': 'PduuP', '2-3-0c': 'dPduP', '1-1-0': 'dP', '2-2-1s': 'PDdP', '1-1-0m': 'Pd', '1-3-1k': 'dPDd', '2-3-1t': 'PdDPd', '2-3-1h': 'dPdDP', '2-2-1o': 'PDPd', '0-2-1s': 'dD', '0-2-1n': 'Dd' };      // 0-2-1s / 0-2-1n: tín hiệu trường Shidonai / Ochizawa (không sân ga; đường tránh phía nam / phía bắc)      // 2-3-0c: Chikugo-Funagoya (Kyushu 010_02): đường tránh nằm ở phía đường xuống, sân ga đảo giữa đường tránh và đường chính xuống [D sơ đồ]; ảnh gương của 2-3-0 (PduPu). 2-3-0a / 2-3-0b: Okutsugaru-Imabetsu / Kikonai theo hình 010_02 / 010_04 (hai đường chính cạnh hai sân ga ngoài + một đường 1435 mm mảnh sát một sân ga; chiều xuống: ga a dừng ở đường mảnh phía trên, ga b dừng ngay trên đường chính xuống) [D sơ đồ, I vai trò đường mảnh; vẫn tính là ga tránh được như mã cũ 2-2-1]. 2-4-0t: Tokyo (Tohoku/Joetsu/Hokuriku) theo sơ đồ ray HaisenNet: 3 đường nhập đường chính xuống, 1 đường nhập đường chính lên [D sơ đồ, I hướng]
  // Ga trên đường ĐƠN có đường chính (thông qua D) + đường nhánh/đường tránh (d), tuyến Tazawako (sơ đồ 配線略図.net tazawako/010_01–010_04): tàu chạy suốt bám đường chính ở CẢ HAI chiều, tàu phải dừng/chờ rẽ vào đường nhánh. Chiều lên chỉ đảo trái-phải (không đổi d↔u/D↔U).
  // Không có đường ngược chiều thật (đường ảo trùng đường chính, như ga một đường). Mỗi đường nhánh có ĐÚNG MỘT ghi mỗi đầu (không chữ X); bảng HIER theo chuỗi token CHIỀU XUỐNG: [chỉ số đường, đường mẹ, in0, len tách, out0, len nhập] đổi từ tọa độ sơ đồ (1 đv ≈ 8,15 m; z = 20 + (x_đầu_tây_sân_ga − x)·8,15).
  const MAINUP = new Set(['2-2-1s', '1-3-1k', '2-3-1t', '2-3-1h', '2-2-1o', '0-2-1s', '0-2-1n']);
  const HIER = { '2-2-1s': [[2, 1, 540, 82, 61, 82]], '2-2-1o': [[3, 1, 610, 164, 61, 164]], '0-2-1s': [[0, 1, 540, 82, 61, 82]], '0-2-1n': [[1, 0, 540, 82, 61, 82]],      // 0-2-1s/n: tín hiệu trường: nhánh 4,3 m như Ugo-Yotsuya;      // Ugo-Yotsuya/Ugo-Nagano/Jindai (đường nhánh phía bắc, lệch 4,3 m), Okama (nhánh phía bắc cách đường chính 10,7 m vì sân ga đảo ở giữa)
    // Độ dài mỗi ghi ≥ 13 × độ lệch + 25 m (như ghi #12 của game, độ dốc tối đa ~1:9): các đoạn theo sơ đồ (10 đơn vị ≈ 82 m) quá ngắn cho độ lệch 10,7 m nên kéo dài ra phía NGOÀI ga, giữ nguyên chỗ rẽ gần sân ga
    '1-3-1k': [[0, 2, 663, 164, 62, 164], [3, 2, 745, 82, 144, 82]],      // Kakunodate: nhánh nam (sân ga đảo kề, lệch 10,7 m) + nhánh bắc (không sân ga, lệch 4,3 m), cùng rẽ khỏi đường chính
    '2-3-1t': [[1, 2, 583, 82, 142, 82], [4, 2, 610, 164, 61, 164]],      // Tazawako: nhánh nam (sân ga phía nam, 4,3 m) + nhánh bắc (sân ga đảo, 10,7 m)
    '2-3-1h': [[2, 3, 616, 82, 183, 82], [0, 3, 666, 220, 61, 220]] };      // Shizukuishi: nhánh 1 (4,3 m) và nhánh 2 (sân ga đảo, 15 m) cùng rẽ khỏi đường chính; nhánh 2 rẽ sớm hơn nhánh 1 nên không cắt nhau (theo sơ đồ nhánh 2 tách từ nhánh 1, nhưng khoảng cách sơ đồ quá ngắn)      // Shizukuishi: nhánh 1 rẽ khỏi đường chính, nhánh 2 (sân ga đảo) rẽ khỏi nhánh 1
  const SOLOS = new Set(['1-1-0', '1-1-0m']), SOLO = '1-1-0';      // ga một đường một sân ga bên (Kita-Omagari, tuyến đường đơn): không có đường ngược chiều thật; đường ngược chiều ảo luôn nhập vào đường của ta (sim.singleEff bỏ qua vùng ga này)
  const ADJ = -4.3, TRK_GAP = 4.3, EDGE = 1.75, ISLAND = 7.2, SIDE = 9.0;       // toạ độ mô hình: X dương = phía "sân ga của đường ta"; đường ngược chiều gần nhất ở X = ADJ
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // chuỗi theo chiều chạy của tàu: chiều lên thì đảo trái-phải và đổi d<->u
  function tokens(code, dir) {
    let s = TOK[code] || TOK['2-2-0'];
    if (SOLOS.has(code) || MAINUP.has(code)) return dir === 'up' ? s.split('').reverse().join('') : s;      // ga một đường dùng chung hai chiều: chỉ đảo trái-phải
    if (dir === 'up') s = s.split('').reverse().map(c => ({ d: 'u', u: 'd', D: 'U', U: 'D' }[c] || c)).join('');
    return s;
  }
  // ---- Takasaki (hình hokuriku/030_01 và joetsu/010_02): sáu đường, hai sân ga; đường nhánh dưới (S1) KHÔNG nhập lại đường chính ngoài ga mà kéo dài về phía đông thành đường Hokuriku chiều lên (qua nút giao dưới cầu cạn Joetsu).
  // Toạ độ theo hình (1 đv ≈ 8,15 m, cuối sân ga ở x = 334,3 ↔ z = +20 m so với vạch dừng); chỉ số theo chuỗi token CHIỀU XUỐNG: 0 N1 (ngoài cùng phía bắc), 2 N2, 3 đường chính xuống, 4 đường chính lên, 5 S1 (nhánh dưới), 7 S2 (ngoài cùng phía nam).
  // [chỉ số, đường mẹ (đường ta tách ra từ đó), in0, len tách, out0, len nhập]: z tách = -in0 .. -in0+len, z nhập = out0 .. out0+len2 so với vạch dừng (khung chiều xuống). Mỗi ghi rẽ khỏi đường MẸ (chuỗi N2→N1, S1→S2) chứ không từ đường chính.
// ---- Sendai (Tohoku, hình tohoku/020_xx): chiều XUỐNG, đầu phía đông, đường chính xuống rẽ lên NHẬP vào đường ngoài phía bắc, đi tiếp trên đường ngoài rồi rẽ xuống thành đường chính lại; đoạn đường chính thẳng ở giữa không có [D sơ đồ]. Chiều lên không có (sơ đồ KHÔNG đối xứng quay 180°).
  // z tính từ vạch dừng (khung chiều xuống): rẽ khỏi đường chính ở +60 m (sân ga hết ở +20, sơ đồ cách 40 m), dài 200 m (S-curve làm trơn, độ dốc tối đa ≈ 1:12); đi thẳng 80 m (sơ đồ ≈ 80 m); trả về đường chính trong 200 m [I tỉ lệ: sơ đồ không theo tỉ lệ]
  const SEN = '2-4-0s', DET = { z0: 60, len: 200, hold: 80, ret: 200 };
  const TKS = '2-4-1k', TKS_EXT = 60000, TKS_Z = d => 20 + (d - 334.3) * 8.15;
  const TKS_T = [[2, 3, 661, 81, 222, 81], [0, 2, 580, 160, 60, 160], [5, 4, 661, 81, TKS_EXT, 50], [7, 5, 580, 160, 60, 160]];      // 23/11/2026: độ dài ghi ≥ 13 × độ lệch + 25 m (độ dốc tối đa ≥ 1:9,8; trước đây đầu ra đường ngoài 81 m cho lệch 10,7 m = 1:5): đường ngoài (lệch 10,7 m) dài 160 m, đường nhánh (lệch 4,3 m) 81 m; đường ngoài bắt đầu ngay khi đường nhánh rẽ xong (−580 m) và nhập lại xong trước khi đường nhánh nhập (60..220 < 222 m)      // kéo dài các ghi cho thuôn (độ dốc ≤ ~1:10 ở giữa đường cong S); đầu cuối giữ đúng vị trí trong hình
  const TKS_L = [[60, 95], [160, 65], [381, 100]];      // ghi nối đường nhánh dưới S1 với đường chính lên: [z bắt đầu, dài] (e28, e29, e33 trong hình) [D]
  // ---- Fukushima (Tohoku, hình ou_1/030_01, docs/data/haisen/fukushima_plan.html): sáu đường, hai sân ga đảo; hai đường RÌA (bắc và nam) tách từ đường nhánh sân ga (phân cấp: đường chính → đường nhánh → đường rìa) chứ không từ đường chính,
  // phía đông đường nhánh nhập lại đường chính còn đường rìa KHÔNG nhập lại mà kéo dài thành hai đường Yamagata (ngã rẽ cách ga ~1,0 km, junction có cờ fk). Tàu không đi Yamagata (Tohoku, Akita) dừng ở đường rìa rồi đi qua ghi nối rìa → đường nhánh → đường chính.
  // [chỉ số vật lý, đường mẹ, in0, len tách, out0, len nhập]: cùng quy ước TKS_T (khung chiều xuống; chỉ số theo chuỗi token CHIỀU XUỐNG: 0 rìa bắc, 2 nhánh bắc, 3 đường chính xuống, 4 đường chính lên, 5 nhánh nam, 7 rìa nam). [I] số đo theo hình (1 đv ≈ 8,15 m)
  const FUK = '2-4-1f', FUK_T = [[2, 3, 700, 80, 224, 81], [0, 2, 620, 164, TKS_EXT, 50], [5, 4, 700, 80, 224, 81], [7, 5, 620, 164, TKS_EXT, 50]], FUK_LINK = { z0: 60, len: 164 };      // ghi nối đường rìa → đường nhánh (khung chiều xuống) ở z 60..224 m sau vạch; độ dài theo quy tắc ghi thật của game (1 m ngang ≈ 13 m dọc: rìa cách nhánh 10,7 m)
  const TKS_SHIFT = 400;                               // quay 180° (chiều lên): z' = -400 - z, vì sân ga chiếm -420..+20 ở cả hai chiều
  const physIdx = (j, n, dir, rev) => ((dir === 'up') !== !!rev) ? n - 1 - j : j;
  function tksTracks(tracks, n, dir, rev, X) {
    const byP = p => tracks.find(t => physIdx(t.i, n, dir, rev) === p);
    for (const [p, par, in0, len1, out0, len2] of TKS_T) { const t = byP(p), tp = byP(par); if (!t) continue;
      t.plain = tp.main ? t.plain : tp.x; t.len = len1; t.len2 = len2;                  // đường ngoài tách từ đường mẹ ga: vị trí gốc là vị trí đường mẹ
      if (dir === 'up') { t.in0 = TKS_SHIFT + out0 + len2; t.len = len2; t.out0 = in0 - len1 - TKS_SHIFT; t.len2 = len1; } else { t.in0 = in0; t.out0 = out0; }
      t.tks = p; }
    for (const t of tracks) { t.phys = physIdx(t.i, n, dir, rev); }
  }
  function hierTracks(tracks, n, dir, rev, rows) {      // như tksTracks nhưng theo bảng HIER của mã ga (đường mẹ có thể là đường nhánh khác)
    const byP = p => tracks.find(t => !t.virt && physIdx(t.i, n, dir, rev) === p);
    for (const [p, par, in0, len1, out0, len2] of rows) { const t = byP(p), tp = byP(par); if (!t || !tp) continue;
      t.plain = tp.main ? t.plain : tp.x; t.len = len1; t.len2 = len2;
      if (dir === 'up') { t.in0 = TKS_SHIFT + out0 + len2; t.len = len2; t.out0 = in0 - len1 - TKS_SHIFT; t.len2 = len1; } else { t.in0 = in0; t.out0 = out0; } }
  }
  function fukTracks(tracks, n, dir, rev) {
    const byP = p => tracks.find(t => physIdx(t.i, n, dir, rev) === p);
    for (const [p, par, in0, len1, out0, len2] of FUK_T) { const t = byP(p), tp = byP(par); if (!t) continue;
      t.plain = tp.main ? t.plain : tp.x; t.len = len1; t.len2 = len2;
      if (dir === 'up') { t.in0 = TKS_SHIFT + out0 + len2; t.len = len2; t.out0 = in0 - len1 - TKS_SHIFT; t.len2 = len1; } else { t.in0 = in0; t.out0 = out0; }
      t.fkp = p; }
    for (const t of tracks) t.phys = physIdx(t.i, n, dir, rev);
    for (const [p, par] of [[0, 2], [7, 5]]) { const t = byP(p), tp = byP(par); if (t && tp) t.fkr = { par: tp, z0: dir === 'up' ? -TKS_SHIFT - FUK_LINK.z0 - FUK_LINK.len : FUK_LINK.z0, len: FUK_LINK.len, pre: dir === 'up' }; }      // fkr: đường rìa (kéo dài sang đông / từ đông tới) và ghi nối với đường nhánh; chiều lên khung quay 180° nên ghi nối nằm TRƯỚC ga và đi từ nhánh sang rìa
  }
  function fukLinks(tracks, n, dir, rev) {
    const byP = p => tracks.find(t => physIdx(t.i, n, dir, rev) === p), out = [];
    for (const [p, par] of [[0, 2], [7, 5]]) { const t = byP(p), tp = byP(par); if (t && tp) out.push({ z0: t.fkr.z0, len: t.fkr.len, a: dir === 'up' ? tp : t, b: dir === 'up' ? t : tp, det: true }); }      // chỉ đường rìa thuộc chiều ta (rìa bắc chiều xuống, rìa nam chiều lên) mới có ghi nối vẽ trong khung này; đường rìa ngược chiều vẽ ở khung kia
    return out;
  }
  function tksLinks(tracks, n, dir, rev) {
    const s1 = tracks.find(t => physIdx(t.i, n, dir, rev) === 5), u = tracks.find(t => physIdx(t.i, n, dir, rev) === 4); if (!s1 || !u) return [];
    return TKS_L.map(([z0, len]) => ({ z0: dir === 'up' ? -TKS_SHIFT - z0 - len : z0, len, a: s1, b: u }));
  }
  // ghi nối trong khung ĐANG NHÌN (camera sau: z' = -z - len); a, b = hai đường được nối
  const linksOf = (st, rear) => (st.links || []).map(l => ({ z: rear ? -l.z0 - l.len : l.z0, len: l.len, a: rear && l.det ? l.b : l.a, b: rear && l.det ? l.a : l.b, det: !!l.det }));      // ghi nối đi từ đường a sang đường b theo chiều tiến z; camera sau (thế giới gương) đảo a, b với ghi của Sendai (đường chính → đường ngoài theo chiều chạy)
  // pick: chọn đường dừng khi có nhiều đường (số nguyên). Trả về {tracks, plats, ref, opp, stops, ours}
  // ---- Omagari (switchback tuyến Akita, docs/data/haisen/omagari_plan.html, 22/11/2026): ga cụt, hai đường dừng giữa hai sân ga, ghi gộp 2→1, đường đơn 500 m, ghi tách 1→2, hai đường song song (Kita-Ōmagari bắc K, Akita nam L)
  // có ghi chéo X nối K → L, rồi tách hẳn. Toạ độ TUYỆT ĐỐI của mạng đường: u (m) từ chắn cuối ra phía ngoài (tây), X (m) bắc dương. Khung ĐẾN (ph = 'A'): tàu chạy về chắn cuối (z = 15 − u, trái = bắc);
  // khung ĐI (ph = 'B', sau khi đổi đầu): tàu chạy ra ngoài (z = u − ub, trái = nam); toạ độ khung = sgn·(X − X_ta) với sgn = +1 (A) / −1 (B). Mọi vật vẽ theo toạ độ TƯƠNG ĐỐI so với đường của ta.
  const OMA = '2-2-0w', OMU = { merge: [455, 535], split: [1035, 1115], xo: [1235, 1385], div: [1465, 1765], end: 8000, endOpp: 3500, ub: 165, buf: 15, pb: 344, plen: 359 };
  const omSm = (a, b, u) => smooth(a, b, u);
  function omTrack(id, u) {      // X tuyệt đối của đường id tại u (null nếu ngoài phạm vi)
    const M = OMU;
    if (id === 'A') return u >= 0 && u <= M.merge[1] ? 0 : null;
    if (id === 'B') return u >= 0 && u <= M.merge[1] ? (u <= M.merge[0] ? -4.3 : -4.3 * (1 - omSm(M.merge[0], M.merge[1], u))) : null;
    if (id === 'S') return u >= M.merge[1] && u <= M.split[0] ? 0 : null;
    if (id === 'K' || id === 'L') { if (u < M.split[0] || u > M.end) return null; const sg = id === 'K' ? 1 : -1, x = u < M.split[1] ? 4.3 * omSm(M.split[0], M.split[1], u) : u <= M.div[0] ? 4.3 : 4.3 + 15.7 * omSm(M.div[0], M.div[1], u); return sg * x; }
    if (id === 'X') return u >= M.xo[0] && u <= M.xo[1] ? 4.3 - 8.6 * omSm(M.xo[0], M.xo[1], u) : null;
    return null;
  }
  const omPk = pk => { const v = pk && typeof pk === 'object' ? (pk.i | 0) : (pk | 0); return { ph: v >= 10 ? 'B' : 'A', lane: v % 10 === 1 ? 1 : 0 }; };      // mã chọn: 10·(đã đổi đầu) + làn (0 = đường A phía bắc, 1 = đường B phía nam)
  const omPkCode = (ph, lane) => (ph === 'B' ? 10 : 0) + (lane ? 1 : 0);
  function omLine(dir, ph) { return ((dir === 'down') === (ph === 'A')) ? 'K' : 'L'; }      // đường ngoài của ta: xuống: đến từ K (Kita-Ōmagari), đi sang L (Akita); lên: ngược lại
  function omOurs(dir, pk, u) { const q = omPk(pk), M = OMU; if (u <= M.merge[1]) return omTrack(q.lane ? 'B' : 'A', Math.max(0, u)); if (u <= M.split[0]) return 0; const x = omTrack(omLine(dir, q.ph), u); return x === null ? omTrack(omLine(dir, q.ph), M.end) : x; }
  function omOther(dir, pk, u) { const q = omPk(pk), M = OMU; if (u <= M.merge[1]) return omTrack(q.lane ? 'A' : 'B', Math.max(0, u)); if (u <= M.split[0]) return 0; const x = omTrack(omLine(dir, q.ph) === 'K' ? 'L' : 'K', u); return x === null ? omTrack(omLine(dir, q.ph) === 'K' ? 'L' : 'K', M.end) : x; }
  const omSgn = pk => omPk(pk).ph === 'A' ? 1 : -1;
  // u ↔ z của khung đang nhìn (ub = chiều dài tàu + 12 m: đầu tàu cách chắn cuối sau khi đổi đầu)
  const omU = (pk, z, ub) => omPk(pk).ph === 'A' ? OMU.buf - z : z + (ub || OMU.ub);
  const omZ = (pk, u, ub) => omPk(pk).ph === 'A' ? OMU.buf - u : u - (ub || OMU.ub);
  function omRelOther(dir, pk, u) { return omSgn(pk) * (omOther(dir, pk, u) - omOurs(dir, pk, u)); }      // làn "ngược" (đường chính còn lại gần nhất) so với đường của ta
  function omRelTrack(dir, pk, id, u) { const x = omTrack(id, u); return x === null ? null : omSgn(pk) * (x - omOurs(dir, pk, u)); }
  function omaStation(pkIn, dir) {
    const q = omPk(pkIn), sg = q.ph === 'A' ? 1 : -1, xo = q.lane ? 0 : -4.3, xOurs = q.lane ? -4.3 : 0, xOth = q.lane ? 0 : -4.3, ub = (pkIn && pkIn.ub) || OMU.ub;
    const rel = x => sg * (x - xOurs), pl = (a, b) => { const p = rel(a), r = rel(b); return { xa: Math.min(p, r), xb: Math.max(p, r), side: false }; };
    const tOurs = { i: 0, x: 0, c: 'd', own: true, thr: false, plain: 0, main: true }, tOth = { i: 1, x: rel(xOth), c: 'd', own: true, thr: false, plain: 0, main: false };
    const plats = [pl(1.75, 10.75), pl(-15.05, -6.05)], plat = plats.find(p => Math.abs(Math.min(Math.abs(p.xa), Math.abs(p.xb)) - EDGE) < 0.01) || plats[0];
    const a = q.ph === 'A';
    return { code: OMA, dir, pb: a ? OMU.pb : ub, pf: a ? 20 : OMU.plen - ub, tracks: [tOurs, tOth], links: [], detour: null, oppDet: null, plats, stops: [tOurs, tOth], platTracks: [tOurs, tOth], ref: 0, opp: tOth.x, oppT: tOth, ours: tOurs, plat, platSign: (plat.xa + plat.xb) / 2 > 0 ? 1 : -1, extent: [Math.min(0, tOth.x, ...plats.map(p => p.xa)), Math.max(0, tOth.x, ...plats.map(p => p.xb))], om: { ph: q.ph, lane: q.lane, sgn: sg, ub } };
  }
  function station(code, dir, pick, rev) {
    if (code === OMA) return omaStation(pick, dir);      // rev: nhìn NGƯỢC chiều chạy (camera sau): đảo thứ tự trái-phải, giữ nguyên vai trò đường ta / đường ngược chiều
    const s = rev ? tokens(code, dir).split('').reverse().join('') : tokens(code, dir), n = s.length, isT = i => s[i] !== 'P', width = i => (i > 0 && i < n - 1 && isT(i - 1) && isT(i + 1)) ? ISLAND : (i === 0 || i === n - 1) ? SIDE : ISLAND;
    const c = [0];
    for (let i = 1; i < n; i++) c[i] = c[i - 1] + (isT(i) && isT(i - 1) ? TRK_GAP : EDGE + width(isT(i) ? i - 1 : i) / 2);
    const idxT = []; for (let i = 0; i < n; i++) if (isT(i)) idxT.push(i);
    const solo = SOLOS.has(code) || MAINUP.has(code); if (solo) idxT.push(n);      // đường ngược chiều ảo (chỉ số n, không có ký tự trong chuỗi)
    const lc = ch => (ch || 'u').toLowerCase();      // chỉ số n (đường ảo) → 'u'
    let ref = idxT.find(i => s[i] === 'D');
    const oppIdx = idxT.filter(i => lc(s[i]) === 'u'), ownIdx = idxT.filter(i => lc(s[i]) === 'd');
    if (ref === undefined) ref = ownIdx.reduce((b, i) => Math.min(...oppIdx.map(o => Math.abs(c[o] - c[i]))) < Math.min(...oppIdx.map(o => Math.abs(c[o] - c[b]))) ? i : b, ownIdx[0]);
    const opp = idxT.find(i => s[i] === 'U') !== undefined ? idxT.find(i => s[i] === 'U') : oppIdx.reduce((b, i) => Math.abs(c[i] - c[ref]) < Math.abs(c[b] - c[ref]) ? i : b, oppIdx[0]);
    const X = i => solo && i === n ? 0 : -(c[i] - c[ref]);      // đường ngược chiều ảo (ga một đường / ga tránh trên đường đơn) trùng ĐƯỜNG CHÍNH (x = 0): tàu ngược chiều chạy suốt đi trên đường chính, còn tàu đỗ ở đường tránh                           // X dương = bên trái màn hình (trước khi lật)
    const tracks = idxT.map(i => ({ i, x: X(i), virt: solo && i === n, c: s[i] || 'u', own: lc(s[i]) === 'd', thr: s[i] === 'D' || s[i] === 'U', plain: lc(s[i]) === 'd' ? 0 : (rev ? -ADJ : ADJ), main: i === ref || i === opp }));
    // ghi thật: mỗi đường rẽ khỏi cặp đường chính bằng một ghi riêng, lần lượt từ đường gần ra đường xa (cách nhau ~85 m); dịch ngang 1 m mất ~13 m chiều dài (ghi #12), nên đường ga thoát ra nhanh và gọn
    { const outer = tracks.filter(t => !t.main).sort((a, b) => Math.abs(a.x - a.plain) - Math.abs(b.x - b.plain));
      outer.forEach((t, k) => { const dx = Math.abs(t.x - t.plain); t.len = clamp(13 * dx + 25, 40, 400); t.in0 = Math.max(1130 - 85 * k, 385 + t.len);      // ghi dài (độ lệch lớn, Tokyo) phải rẽ xong trước đầu sân ga: bắt đầu sớm hơn (đường lệch nhiều vẫn bắt đầu sau hoặc cùng lúc đường gần hơn nên không cắt nhau)
       t.out0 = 40 + 70 * (outer.length - 1 - k); t.rank = k; if (MAINUP.has(code)) { t.len = 82; t.in0 = 540; t.out0 = 61; } }); }      // MAINUP: ghi cách sát đầu sân ga (sơ đồ: ~10 đơn vị = 80 m): tách ở 520→440 m trước vạch, nhập lại ở 40→120 m sau vạch
    if (HIER[code]) hierTracks(tracks, n, dir, rev, HIER[code]);
    if (code === TKS) tksTracks(tracks, n, dir, rev, X);
    if (code === FUK) fukTracks(tracks, n, dir, rev);
    let detour = null;      // Sendai chiều xuống: đường ngoài phía bắc (vật lý 0) kéo dài thành đường chính tạm thời; đường chính (own, main) rẽ vào nó
    if (code === SEN && dir === 'down') { const tN = tracks.find(t => physIdx(t.i, n, dir, rev) === 0), mT = tracks.find(t => t.main && t.own); if (tN && mT) { tN.out0 = DET.z0 + DET.len + DET.hold; tN.len2 = DET.ret; tN.det = true; detour = { t: tN, main: mT, z0: DET.z0, len: DET.len, zEnd: tN.out0 + tN.len2 }; } }
    const oppT = tracks.find(t => t.i === opp);
    const plats = []; for (let i = 0; i < n; i++) if (!isT(i)) { const w = width(i); plats.push({ xa: X(i) - w / 2, xb: X(i) + w / 2, side: i === 0 || i === n - 1 }); }
    // đường dừng của ta: đường chiều ta (d) có sân ga kề bên
    const stops = tracks.filter(t => t.own && !t.thr && plats.some(p => Math.abs(Math.min(Math.abs(p.xa - t.x), Math.abs(p.xb - t.x)) - EDGE) < 0.01));
    if (!stops.length) { const nt = tracks.filter(t => t.own && !t.thr); (nt.length ? nt : tracks.filter(t => t.own)).forEach(t => stops.push(t)); }      // không sân ga (tín hiệu trường): đường dừng là đường tránh, không phải đường chính
    const ours = pick === -1 ? (stops.find(t => !t.main) || stops[0]) : pick && typeof pick === 'object' ? (tracks.find(t => t.i === pick.i) || stops[0]) : stops[Math.abs(pick | 0) % stops.length];       // pick là đối tượng {i}: ép chọn đúng đường theo chỉ số trong chuỗi bố trí (camera sau)
    // sân ga kề đường dừng của ta
    const plat = plats.find(p => Math.abs(Math.min(Math.abs(p.xa - ours.x), Math.abs(p.xb - ours.x)) - EDGE) < 0.01) || null;
    const platSign = plat ? ((plat.xa + plat.xb) / 2 > ours.x ? 1 : -1) : 1;
    const platTracks = tracks.filter(t => !t.thr && plats.some(p => Math.abs(Math.min(Math.abs(p.xa - t.x), Math.abs(p.xb - t.x)) - EDGE) < 0.01));      // mọi đường có sân ga kề (cả hai nhóm d và u): ga cuối dùng cho cả tàu vào lẫn ra
    // chiều LÊN: đường ngoài phía bắc (vật lý) là đường ngoài CỦA CHIỀU NGƯỢC; đường chính xuống thật (làn ngược chiều) đi vòng qua nó như ở chiều xuống. Khung chiều lên = quay 180° (z' = -400 - z) nên đoạn vòng nằm TRƯỚC ga (460–940 m trước vạch).
    let oppDet = null;
    if (code === SEN && dir === 'up') { const dn = station(code, 'down', 0, false), tD = dn.tracks.find(t => physIdx(t.i, 6, 'down', false) === 0), tU = tracks.find(t => physIdx(t.i, n, dir, rev) === 0), oM = tracks.find(t => t.i === opp);
      if (tD && tU && oM) { tU.in0 = TKS_SHIFT + tD.out0 + tD.len2; tU.len = tD.len2; tU.det = true; oppDet = { t: tU, main: oM, link: { z0: -TKS_SHIFT - DET.z0 - DET.len, len: DET.len }, zA: -TKS_SHIFT - (DET.z0 + DET.len + DET.hold + DET.ret), zB: -TKS_SHIFT - DET.z0 }; } }
    const links = code === TKS ? tksLinks(tracks, n, dir, rev) : code === FUK ? fukLinks(tracks, n, dir, rev) : detour ? [{ z0: detour.z0, len: detour.len, a: detour.main, b: detour.t, det: true }] : oppDet ? [{ z0: oppDet.link.z0, len: oppDet.link.len, a: oppDet.t, b: oppDet.main, det: true }] : [];
    return { code, dir, pb: code === '1-2-0t' ? 240 : 420, pf: 20, tracks, links, detour, oppDet, plats, stops, platTracks, ref, opp: X(opp), oppT, ours, plat, platSign, extent: [Math.min(...tracks.map(t => t.x), ...plats.map(p => p.xa)), Math.max(...tracks.map(t => t.x), ...plats.map(p => p.xb))] };
  }
  // trọng số "đã chia ra các đường của ga" tại vị trí s (m): 0 ở xa, 1 trong phạm vi sân ga; sM = vị trí vạch dừng
  // mức "đã toả hết" của cả ga (theo đường ngoài cùng): dùng cho bề rộng hành lang; từng đường có trackW riêng (ghi riêng)
  const spread = (s, sM) => smooth(sM - 760, sM - 430, s) * (1 - smooth(sM + 40, sM + 380, s));
  // ghi thật: dịch ngang tuyến tính (góc không đổi ~1:12), tách khỏi / nhập vào đường kia tại một điểm rõ ràng (hình chữ Y), không toả mượt mơ hồ
  const ramp = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
  // vị trí ngang (X mô hình) đường ĐI của tàu ta tại vị trí s so với vạch dừng sM. Đường d: như cũ (x·trackW). Đường u (ga cuối: tàu xuất phát/đến ở nhóm đường nối vào đường chính ngược chiều):
  // đường ga nhập vào đường chính ngược chiều, rồi qua ghi chữ X (dài 150 m, ở xa vạch XA trước / XB sau vạch) để sang đường chính của ta. w = trackW của đường, sp = spread của ga; xa/xb theo hướng nhìn (camera sau đổi chỗ)
  const laneOf = (t, s, sM, w, sp, xa, xb) => {
    const xt = t.main ? t.plain + (t.x - t.plain) * sp : t.plain + (t.x - t.plain) * w; if (t.own) return xt;
    const dz = sM - s, sm = u => smooth(0, 1, u), cin = sm((xa - dz) / 150), cout = sm((-dz - xb) / 150);
    return xt * cin * (1 - cout);
  };
  // dịch ngang làm trơn (smoothstep): đường ga tách khỏi đường chính theo tiếp tuyến rồi song song với đường chính, không bẻ gấp ở chỗ nhập (như ghi chữ X)
  const ease = u => u * u * (3 - 2 * u);
  // vị trí ngang (X mô hình) của ĐƯỜNG CHÍNH của ta tại s khi ga có đoạn vòng (Sendai chiều xuống): 0 trước ghi, rồi bám đường ngoài (t.x) rồi trả về 0; dùng cho tàu chạy trên đường chính (thông qua hoặc đỗ ở đường chính)
  const detourX = (st, s, sM) => { const d = st && st.detour; if (!d) return 0; const t = d.t; return t.x * ease(ramp(sM + d.z0, sM + d.z0 + d.len, s)) * (1 - ease(ramp(sM + t.out0, sM + t.out0 + t.len2, s))); };
  // chiều LÊN tại Sendai: độ lệch THÊM (X mô hình) của làn ngược chiều so với đường chính ngược chiều: 0 → (đường ngoài − đường chính) → 0 (đoạn vòng nằm trước ga, trong khung chiều lên)
  const oppDetourX = (st, s, sM) => { const d = st && st.oppDet; if (!d) return 0; const t = d.t; return (t.x - d.main.x) * ease(ramp(sM - t.in0, sM - t.in0 + t.len, s)) * (1 - ease(ramp(sM + d.link.z0, sM + d.link.z0 + d.link.len, s))); };
  // khoảng z (so với vạch dừng, khung chiều chạy) mà đường chính của tàu thông qua phải đi vòng qua ghi: dùng cho hạn chế tốc độ (null nếu ga không có)
  const detourSpan = (code, dir) => code === SEN && dir === 'down' ? { z0: DET.z0, z1: DET.z0 + DET.len + DET.hold + DET.ret } : null;
  const trackW = (t, s, sM) => t.in0 === undefined ? 1 : ease(ramp(sM - t.in0, sM - t.in0 + t.len, s)) * (1 - ease(ramp(sM + t.out0, sM + t.out0 + (t.len2 || t.len), s)));
  // trọng số làn của CAMERA trên đường dừng t (Fukushima): tàu đi Yamagata (follow) bám đường rìa kéo dài; tàu khác (Tohoku, Akita) rời đường rìa qua ghi nối sang đường nhánh rồi nhập lại đường chính (chiều lên: đi từ đường chính qua đường nhánh vào đường rìa)
  const laneW = (t, s, sM, follow) => {
    const w = trackW(t, s, sM), r = t.fkr; if (!r || t.x === t.plain) return w;
    const par = r.par, lp = par.plain + (par.x - par.plain) * trackW(par, s, sM), lr = lp + (t.x - lp) * w;      // đường rìa tách từ đường nhánh: ở w = 0 nó đi theo làn của đường nhánh (chưa phải x của đường nhánh)
    const e = ease(ramp(sM + r.z0, sM + r.z0 + r.len, s)), R = follow ? lr : (r.pre ? lp + (lr - lp) * e : lr + (lp - lr) * e);
    return (R - t.plain) / (t.x - t.plain);      // đổi về trọng số theo công thức laneOf (plain + (x - plain)·w)
  };

  // đường cong: bảng [km0, km1, R, sg] theo km; trả về độ cong (1/m, dương = rẽ phải theo chiều chạy) tại s (m dọc tuyến theo chiều chạy)
  function curvatureAt(L, Sim, dir, s) {
    const km = Sim.kmOfS(s, dir, L.kmEnd);
    for (const [a, b, R, sg] of L.curves || []) if (km >= a && km < b) return (dir === 'up' ? -sg : sg) / R;
    return 0;
  }
  // ---- Hồ sơ hình học tính MỘT LẦN cho cả tuyến theo từng chiều (ô 10 m): hướng θ(s), tích phân Θ(s) và cao độ; mọi bảng ngang/cao độ lấy từ đây
  // (trước đây mỗi khung hình dò lại danh sách đường cong/kết cấu hàng trăm lần: tốn vài ms và là một nguồn giật ở đoạn cong)
  const _prof = new WeakMap(), CELL = 10;
  function profile(L, Sim, dir) {
    let m = _prof.get(L); if (!m) _prof.set(L, m = {}); if (m[dir]) return m[dir];
    const Lm = L.kmEnd * 1000, n = Math.ceil(Lm / CELL) + 8, kc = new Float64Array(n), th = new Float64Array(n + 1), Th = new Float64Array(n + 1), raw = new Float64Array(n), el = new Float64Array(n);
    raw.fill(ELEV.g);
    const rng = (a, b) => dir === 'up' ? [(L.kmEnd - b) * 1000, (L.kmEnd - a) * 1000] : [a * 1000, b * 1000];
    for (const [a, b, R, sg] of L.curves || []) { const [s0, s1] = rng(a, b), v = (dir === 'up' ? -sg : sg) / R; for (let j = Math.max(0, Math.floor(s0 / CELL)); j < Math.min(n, Math.ceil(s1 / CELL)); j++) { const ov = Math.min(s1, (j + 1) * CELL) - Math.max(s0, j * CELL); if (ov > 0) kc[j] += v * ov / CELL; } }      // độ cong trung bình trong ô (đường cong không trùng biên ô)
    for (const [a, b, k] of L.struct || []) { const [s0, s1] = rng(a, b), v = ELEV[k] || 0; for (let j = Math.max(0, Math.floor(s0 / CELL)); j < Math.min(n, Math.ceil(s1 / CELL)); j++) raw[j] = v; }
    for (let j = 0; j < n; j++) { th[j + 1] = th[j] + kc[j] * CELL; Th[j + 1] = Th[j] + th[j] * CELL + 0.5 * kc[j] * CELL * CELL; }
    const pre = new Float64Array(n + 1); for (let j = 0; j < n; j++) pre[j + 1] = pre[j] + raw[j]; const r = 8;
    for (let j = 0; j < n; j++) { const a = Math.max(0, j - r), b = Math.min(n - 1, j + r); el[j] = (pre[b + 1] - pre[a]) / (b - a + 1); }
    return (m[dir] = { th, Th, kc, el, n });
  }
  const at = (arr, s) => { const f = Math.max(0, s) / CELL, j = Math.min(arr.length - 2, Math.floor(f)), t = f - j; return arr[j] + (arr[j + 1] - arr[j]) * t; };
  const atTh = (P, s) => { s = Math.max(0, s); const j = Math.min(P.n - 1, Math.floor(s / CELL)), d = s - j * CELL; return P.th[j] + P.kc[j] * d; };                                  // hướng θ(s) (chính xác trong ô)
  const atThh = (P, s) => { s = Math.max(0, s); const j = Math.min(P.n - 1, Math.floor(s / CELL)), d = s - j * CELL; return P.Th[j] + P.th[j] * d + 0.5 * P.kc[j] * d * d; };    // Θ(s)
  // độ cong trung bình trong cửa sổ ±half quanh s (1/m): làm mượt chỗ vào/ra cong (đường cong là cung tròn nên độ cong nhảy bậc; ngoài đời có đoạn chuyển tiếp)
  function curvatureSmooth(L, Sim, dir, s, half) { const P = profile(L, Sim, dir); return (atTh(P, s + half) - atTh(P, s - half)) / (2 * half); }
  // độ lệch ngang (m, dương = sang TRÁI màn hình: cùng dấu X mô hình) của đường tại khoảng cách z phía trước so với phương nhìn hiện tại, bảng mỗi `step` m
  function lateralTable(L, Sim, dir, x, zmax, step) {
    const P = profile(L, Sim, dir), n = Math.ceil(zmax / step) + 1, out = new Float32Array(n), t0 = at(P.th, x), T0 = at(P.Th, x);
    for (let i = 1; i < n; i++) { const z = i * step, s = x + z; out[i] = -(at(P.Th, s) - T0 - t0 * z); }
    return out;
  }
  // độ lệch ngang của đường PHÍA SAU tàu (khoảng cách z = i·step phía sau đầu tàu), cùng quy ước dấu với lateralTable (dương = bên trái hướng đi).
  // Tàu đang trong đường cong thì đoạn đường phía sau cũng cong.
  function lateralTableBack(L, Sim, dir, x, zmax, step) {
    const P = profile(L, Sim, dir), n = Math.ceil(zmax / step) + 1, out = new Float32Array(n), t0 = at(P.th, x), T0 = at(P.Th, x);
    for (let i = 1; i < n; i++) { const u = i * step, s = x - u; out[i] = -(t0 * u - (T0 - at(P.Th, s))); }
    return out;
  }
  // cao độ tuyến so với mặt đất quanh đó (m): nền 2, cầu cạn 9, cầu 13, hầm 0; chuyển tiếp mượt
  const ELEV = { g: 2, v: 9, b: 13, t: 0 };
  function elevTable(L, Sim, dir, x, zmax, step) {
    const P = profile(L, Sim, dir), n = Math.ceil(zmax / step) + 1, out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = at(P.el, x + i * step);
    return out;
  }
  // tàu dừng ở ga này phải rẽ ghi sang đường sân ga (đường dừng khác đường chính)? [I theo bố trí]
  const _div = {};
  // ga có làn THÔNG (đường của ta không kề sân ga: đường thông chữ hoa D/U hoặc đường chính không có sân ga, như Okutsugaru-Imabetsu chiều xuống): tàu chạy suốt đi làn đó nên không bị tàu đỗ ở đường dừng chắn. Suy từ bố cục các đường, không dựa vào cờ loop (chữ số thứ ba của mã ga)
  const _thr = {}; function hasThrough(code, dir) { const k = code + dir; if (_thr[k] === undefined) { const sc = station(code, dir, 0); _thr[k] = sc.tracks.some(t => t.own && !sc.stops.includes(t)); } return _thr[k]; }
  function diverts(code, dir, pick) { const k = code + dir + (pick && typeof pick === 'object' ? 'o' + pick.i : pick); if (_div[k] === undefined) _div[k] = station(code, dir, pick).ours.x !== 0; return _div[k]; }
  const _sc = {};
  function stopCount(code, dir) { const k = code + dir; if (_sc[k] === undefined) _sc[k] = station(code, dir, 0).stops.length; return _sc[k]; }
  // ghi chéo (渡り線) giữa hai đường chính quanh ga. ls.xo = [[side, kind, gap?]] (gap: mét từ mép sân ga tới ghi chéo; không có = vị trí cố định cũ 1300 m trước / 720 m sau vạch) viết theo chiều XUỐNG: side 'b' trước vạch dừng / 'a' sau vạch; kind 'd' = chữ X kép, 's' = một đường chéo đi từ đường ngược chiều sang đường ta, 'r' = ngược lại (từ đường ta sang đường ngược chiều)
  // (theo chiều tàu chạy; đúng cả hai chiều vì sơ đồ đối xứng quay 180°). Ga không khai báo xo (tuyến chưa dựng lại từ sơ đồ ghi) = chữ X kép ở cả hai đầu như trước.
  // Trả về [{z, kind, flip}]: z = điểm bắt đầu so với vạch dừng trong khung ĐANG NHÌN (camera sau: đảo dấu, flip=true); mỗi ghi chéo dài XLEN.
  const XA_M = 1300, XB_M = 720, XLEN = 150, PL_BACK = 420, PL_FRONT = 20;      // sân ga vẽ từ 420 m trước tới 20 m sau vạch dừng (cabview/topview)
  function xovers(ls, dir, rear) {
    const xo = ls && ls.xo ? ls.xo : [['b', 'd'], ['a', 'd']], out = [];
    for (const [side, kind, gap, ext] of xo) { const sd = dir === 'up' ? (side === 'b' ? 'a' : 'b') : side;      // phần tử thứ tư ext (m, chỉ khi gap null/bỏ trống = vị trí cũ 1300/720 m): lệch THÊM ra xa ga, để đặt hai ghi đơn liên tiếp một bên (Urasa: ghi gần ở vị trí cũ, ghi xa lệch ~190 m = 150 m dài ghi + 40 m cách nhau theo hình)
      if (gap !== undefined && gap !== null) { const z = sd === 'b' ? -(PL_BACK + gap) - XLEN : PL_FRONT + gap; out.push(rear ? { z: -z - XLEN, kind, flip: true } : { z, kind, flip: false }); continue; }      // gap: khoảng cách (m) từ đầu/cuối sân ga tới ghi chéo, theo sơ đồ
      const z = sd === 'b' ? -(XA_M + (ext || 0)) : XB_M + (ext || 0); out.push(rear ? { z: kind === 'd' ? -z : -z - XLEN, kind, flip: true } : { z, kind, flip: false }); }
    return out;
  }
  // Những đường cong nào của một ghi chéo cần vẽ: 0 = từ đường ta sang đường ngược chiều (lerp(0, oppAt)), 1 = từ đường ngược chiều sang đường ta (lerp(oppAt, 0)); "từ → sang" tính theo chiều tiến của khung đang nhìn.
  // kind 'd' = cả hai; 's' = opp → ours theo chiều tàu chạy (Shin-Omura); 'r' = ours → opp theo chiều tàu chạy (Okutsugaru-Imabetsu, Kikonai). Camera sau (flip) là thế giới gương nên đảo chiều tiến.
  const xoLines = xv => xv.kind === 'd' ? [0, 1] : (xv.kind === 's') === !xv.flip ? [1] : [0];
  // ---- Hướng địa lý của tuyến (độ, theo chiều kim đồng hồ từ hướng Bắc) tại vị trí s theo chiều chạy: lấy từ toạ độ các ga (nội suy giữa trung điểm các đoạn)
  // cộng độ lệch cục bộ khi vào đường cong (đường cong là dữ liệu sinh [I], nên độ lệch chỉ là hiệu ứng, tắt dần trong ~2,5 km sau khi ra cong)
  // các điểm địa lý của tuyến theo km: ga + điểm cứu hộ trong hầm (chỉ để uốn đường trên bản đồ/hướng la bàn theo đúng lộ trình thật, ví dụ hầm Seikan đi qua mũi Tappi và mũi Yoshioka chứ không phải đường thẳng Imabetsu–Kikonai)
  // tên điểm cứu hộ theo ngôn ngữ giao diện: ja = tên Nhật + furigana; en/vi = tên đã dịch ("Tappi Emergency Point" / "Điểm cứu hộ Tappi"); jp luôn là tên Nhật (biển trong hầm)
  const refugeName = rf => { const ja = !!(root.I18N && root.I18N.lang === 'ja'); return { jp: rf.jp, name: ja ? rf.jp : (typeof _t === 'function' ? _t('Điểm cứu hộ {0}', rf.en) : 'Điểm cứu hộ ' + rf.en), kana: ja ? rf.kana || '' : '', sub: ja ? rf.kana || '' : (typeof _t === 'function' ? _t('Điểm cứu hộ {0}', rf.en) : 'Điểm cứu hộ ' + rf.en) }; };
  const _geo = new WeakMap();
  function geoPoints(L) { let g = _geo.get(L); if (!g) { g = L.stations.map(s => ({ km: s.km, lat: s.lat, lon: s.lon })); for (const w of (L.meta && L.meta.refugeInfo) || []) g.push({ km: w.km, lat: w.lat, lon: w.lon, wp: true }); g.sort((a, b) => a.km - b.km); _geo.set(L, g); } return g; }
  const _bc = {};
  function brg(a, b) { const r = Math.PI / 180, f1 = a.lat * r, f2 = b.lat * r, dl = (b.lon - a.lon) * r, y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl); return (Math.atan2(y, x) / r + 360) % 360; }
  function baseBearings(L) { if (_bc[L.id]) return _bc[L.id]; const st = geoPoints(L), mids = []; for (let i = 0; i + 1 < st.length; i++) mids.push({ km: (st[i].km + st[i + 1].km) / 2, b: brg(st[i], st[i + 1]) });
    for (let i = 1; i < mids.length; i++) { while (mids[i].b - mids[i - 1].b > 180) mids[i].b -= 360; while (mids[i].b - mids[i - 1].b < -180) mids[i].b += 360; } return (_bc[L.id] = mids); }
  function bearingAt(L, Sim, dir, s) {
    const km = Sim.kmOfS(s, dir, L.kmEnd), mids = baseBearings(L); let b;
    if (!mids.length) b = 0; else if (km <= mids[0].km) b = mids[0].b; else if (km >= mids[mids.length - 1].km) b = mids[mids.length - 1].b; else { let i = 0; while (mids[i + 1].km < km) i++; b = lerp(mids[i].b, mids[i + 1].b, (km - mids[i].km) / (mids[i + 1].km - mids[i].km)); }
    if (dir === 'up') b += 180;
    let dev = 0; for (const [a, c, R, sg] of L.curves || []) { const sgn = dir === 'up' ? -sg : sg, ln = (c - a) * 1000, full = ln / R * 180 / Math.PI * sgn;
      if (dir === 'down') { if (km <= a) continue; dev += km < c ? full * (km - a) / (c - a) : full * Math.exp(-(km - c) / 2.5); } else { if (km >= c) continue; dev += km > a ? full * (c - km) / (c - a) : full * Math.exp(-(a - km) / 2.5); } }
    return ((b + clamp(dev, -35, 35)) % 360 + 360) % 360;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  // số cầu bộ hành trên cao của một ga theo mã bố trí: ≥ 3 sân ga → 3 lối; 2 sân ga và ≥ 4 đường → 2 lối; 2 sân ga ít đường → 1 lối; 1 sân ga → không có (ga ngầm do nơi gọi loại thêm)
  const _bn = {}; function bridgeCountOf(code) { if (_bn[code] === undefined) { const s = station(code, 'down', 0), np = s.plats.length; _bn[code] = np < 2 ? 0 : np >= 3 ? 3 : s.tracks.filter(t => !t.thr).length >= 4 ? 2 : 1; } return _bn[code]; }
  root.Layout = { MAINUP, isSolo: code => SOLOS.has(code), isSingle: code => SOLOS.has(code) || MAINUP.has(code), HIER, SOLO, OMA, OMU, omTrack, omOurs, omOther, omRelOther, omRelTrack, omU, omZ, omPk, omPkCode, omLine, TKS, TKS_EXT, FUK, laneW, SEN, DET, detourX, oppDetourX, detourSpan, linksOf, hasThrough, refugeName, geoPoints, xovers, xoLines, XLEN, bridgeCountOf, laneOf, pickOf: (st, i, W) => W && W.termPick && W.termPick[i] !== undefined ? { i: W.termPick[i] } : st && st.side ? -1 : i, lateralTableBack, bearingAt, stopCount, diverts, TOK, ADJ, EDGE, tokens, station, spread, trackW, curvatureAt, curvatureSmooth, lateralTable, elevTable, ELEV, smooth };
  if (typeof module !== 'undefined') module.exports = root.Layout;
})(typeof window !== 'undefined' ? window : globalThis);
