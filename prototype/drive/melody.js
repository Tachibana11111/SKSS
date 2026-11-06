// Melody (nhạc hiệu) của từng tuyến/ga: bảng đoạn âm thanh trong một file (assets/melody/melodies.m4a, lấy từ video nhạc nền ở menu; chỉ dùng cá nhân) và quy tắc chọn melody theo tuyến, đoạn, ga.
// Dùng chung cho sim.js (thời lượng cố định để tính giờ đèn cửa xanh: không phụ thuộc giọng đọc nên mô phỏng vẫn tất định) và audio.js (phát thật).
// Nguồn quy tắc: yêu cầu của người chơi (xem docs/12-melody.md); mốc [từ, đến] (giây trong file) đo bằng cách giải mã âm thanh rồi lấy đoạn có tiếng giữa các mốc ghi trong music.js.
(function (root) {
  const FILE = 'assets/melody/melodies.m4a';
  // id: [từ, đến] tính bằng giây trong file
  const SEG = {
    east_tohoku: [0.86, 8.79], east_joetsu: [10.17, 16.91], west_hokuriku: [18.38, 30.1],
    tokai_dep: [31.67, 43.0], tokai: [43.01, 48.0], west_dep: [48.0, 59.0], west: [59.0, 67.7],
    kyushu: [68.75, 79.88], arr_hakata: [80.56, 91.66], arr_kumamoto: [92.69, 103.0], arr_kagoshima: [103.0, 114.76],
    dep_kyushu: [115.36, 134.29], dep_kumamoto: [135.35, 152.53], dep_kagoshima: [153.7, 172.96],
    nk: [186.19, 191.12], dep_takeo: [192.24, 202.11], dep_ureshino: [203.35, 212.79], dep_shinomura: [214.0, 224.94], dep_isahaya: [227.03, 235.51], dep_nagasaki: [237.84, 248.1]
  };
  const GAP = 1.0, DOOR_PA = 5.0;      // ngắt giữa hai đoạn (giây); thời lượng cố định coi như PA nhắc đóng cửa dài (giây)
  const len = id => SEG[id] ? SEG[id][1] - SEG[id][0] : 0;
  const idx = (L, en) => L.stations.findIndex(s => s.en === en);
  // melody đặc thù của tuyến theo đoạn tàu đang chạy giữa hai ga kề nhau a, b (chỉ số ga trên tuyến). Ga ranh giới (Joetsu-Myoko, Shin-Osaka, Hakata) vẫn dùng melody của đoạn đang đi tới; đổi sau khi rời ga.
  function seg(L, a, b) {
    const hi = Math.max(a, b);
    switch (L.id) {
      case 'jts': return 'east_joetsu';
      case 'hok': return hi <= idx(L, 'Joetsu-Myoko') ? 'east_joetsu' : 'west_hokuriku';
      case 'nks': return 'nk';
      case 'tsk': { const so = idx(L, 'Shin-Osaka'), hk = idx(L, 'Hakata'); return hi <= so ? 'tokai' : hi <= hk ? 'west' : 'kyushu'; }
      default: return 'east_tohoku';      // Tohoku, Hokkaido, Akita, Yamagata
    }
  }
  // melody riêng khi sắp vào ga (chỉ ở cách ga 3,5 km): Hakata, Kumamoto, Kagoshima-Chuo (tuyến Tokaido-Sanyo-Kyushu)
  function arr(L, i) {
    if (L.id !== 'tsk') return null; const n = L.stations[i] && L.stations[i].en;
    return n === 'Hakata' ? 'arr_hakata' : n === 'Kumamoto' ? 'arr_kumamoto' : n === 'Kagoshima-Chuo' ? 'arr_kagoshima' : null;
  }
  // melody khởi hành của ga (chỉ có ở một số ga); dir: 'down' (xa Tokyo/Takeo-Onsen) hoặc 'up'
  function dep(L, i, dir) {
    const n = L.stations[i] && L.stations[i].en;
    if (L.id === 'tsk') {
      const so = idx(L, 'Shin-Osaka'), hk = idx(L, 'Hakata');
      if (i < so) return 'tokai_dep';
      if (i === so) return dir === 'down' ? 'west_dep' : 'tokai_dep';
      if (i < hk) return 'west_dep';
      if (i === hk) return dir === 'up' ? 'west_dep' : null;      // Hakata đi về phía Kyushu: không có melody khởi hành
      return n === 'Kumamoto' ? 'dep_kumamoto' : n === 'Kagoshima-Chuo' ? 'dep_kagoshima' : 'dep_kyushu';
    }
    if (L.id === 'nks') {
      return n === 'Takeo-Onsen' ? (dir === 'down' ? 'dep_takeo' : null) : n === 'Ureshino-Onsen' ? 'dep_ureshino' : n === 'Shin-Omura' ? 'dep_shinomura' : n === 'Isahaya' ? 'dep_isahaya' : n === 'Nagasaki' ? (dir === 'up' ? 'dep_nagasaki' : null) : null;
    }
    return null;
  }
  // thời gian chờ cố định kể từ lúc bấm đóng cửa tới khi đèn cửa được phép xanh ở ga có melody khởi hành: PA nhắc + ngắt + melody (0 nếu ga không có melody)
  function depChain(L, i, dir) { const id = dep(L, i, dir); return id ? DOOR_PA + GAP + len(id) : 0; }
  // khoảng cách kích hoạt chuỗi thông báo sắp tới ga (m): 2,5 km, hoặc 3,5 km với ga có melody riêng; không quá 60% khoảng cách tới ga dừng trước (ga gần nhau như Ueno)
  function trigger(L, i, gap) { const base = arr(L, i) ? 3500 : 2500; return gap > 0 ? Math.min(base, gap * 0.6) : base; }
  root.Melody = { FILE, SEG, GAP, DOOR_PA, len, seg, arr, dep, depChain, trigger };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Melody;
})(typeof window !== 'undefined' ? window : globalThis);
