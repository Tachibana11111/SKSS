// Màu tên tàu trên bảng giờ ở màn thiết lập chuyến đi (nền tối). Gốc: màu tên tàu/màu tuyến trên bảng chỉ dẫn và Wikipedia JA (日本の鉄道ラインカラー一覧), nguồn ayaito.net/webtips/color_code/12759;
// đã làm sáng thêm chút cho dễ đọc trên nền tối. Nozomi/Hikari/Kodama, Yamabiko/Toki/Tsubasa/Asama đối chiếu được với ảnh bảng giờ thật; Kagayaki/Hakutaka/Tsurugi chỉ có một nguồn [?].
(function (root) {
  root.TRAIN_COL = {
    Nozomi: '#ffe600', Hikari: '#ff4b4b', Kodama: '#5c8dff', Mizuho: '#ffa500', Sakura: '#ff7fbf', Tsubame: '#40e0d0', Kamome: '#ff4a55',      // Tokaido · Sanyo · Kyushu · Nishi-Kyushu
    Hayabusa: '#4ccb66', Hayate: '#4ccb66', Yamabiko: '#4ccb66', Nasuno: '#4ccb66', Tsubasa: '#ff7a3c', Komachi: '#ff5fb0',      // Tohoku · Hokkaido (xanh lá), Yamagata (cam), Akita (hồng)
    Toki: '#ff9c8a', Tanigawa: '#ff9c8a', Asama: '#b073ff', Kagayaki: '#ffe600', Hakutaka: '#ff4b4b', Tsurugi: '#5c8dff'      // Joetsu · Hokuriku
  };
})(typeof window !== 'undefined' ? window : globalThis);
