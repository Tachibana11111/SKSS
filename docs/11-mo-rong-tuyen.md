# 11 · Mở rộng tuyến: Joetsu, Hokuriku, Hokkaido, Yamagata, Akita, Nishi-Kyushu

Tra cứu ngày 2026-10-22. Nhãn: **[N]** có nguồn · **[D]** từ dữ liệu trong `docs/data/` · **[I]** suy luận / đơn giản hóa · **[K]** kiến thức nền chưa kiểm chứng · **[?]** chưa rõ.
Mọi tuyến chỉ dùng cá nhân. Dữ liệu sinh bằng `tools/build_lines.py` + `tools/build_struct.py` (chạy lại: `python -X utf8 tools/build_lines.py`).

## 1. Các tuyến trong game (7)

| Id | Tuyến | Ga | Chuyến (ngày thường) | Tàu |
|---|---|---|---|---|
| `tsk` | Tokaido–Sanyo–Kyushu (Tokyo–Kagoshima-Chuo) | 46 | 396 | N700, N700S, N700 8 toa, 800 |
| `toh` | Tohoku **+ Hokkaido** (Tokyo–Shin-Hakodate-Hokuto) | 26 | 173 | E5 (H5 dùng chung mô hình) |
| `jts` | Joetsu (Tokyo–Niigata) | 12 | 70 | E7 |
| `hok` | Hokuriku (Tokyo–Tsuruga) | 24 | 82 | E7 / W7 |
| `nks` | Nishi-Kyushu (Takeo-Onsen–Nagasaki) | 5 | 47 | N700S 8000 (6 toa) |
| `yam` | Yamagata mini-Shinkansen (Tokyo–Shinjo) | 19 | 30 | E8, ghép E5 + E8 |
| `aki` | Akita mini-Shinkansen (Tokyo–Akita) | 23 | 32 | E6, ghép E5 + E6 |

Đi ra khỏi Tokyo giữ nguyên đoạn Tokyo–Omiya (kết cấu, đường cong sao chép từ tuyến cha để các tuyến khớp nhau; `SHARE_FROM` trong `build_struct.py`).

## 2. Nguồn dữ liệu

| Hạng mục | Nguồn | Nhãn |
|---|---|---|
| km, 配線 từng ga, tỷ lệ kết cấu Joetsu | https://ja.wikipedia.org/wiki/上越新幹線 | [N] |
| km, 配線, tỷ lệ kết cấu theo 3 đoạn, SP đổi tần số, R tối thiểu 600 m | https://ja.wikipedia.org/wiki/北陸新幹線 | [N] |
| km Hokkaido (38,5 / 113,3 / 148,8), hầm Seikan 53,85 km, đoạn ray ba ~82 km, 140/160 km/h, 定点 竜飛・吉岡, kết cấu 7/4/24/65 | https://ja.wikipedia.org/wiki/北海道新幹線 | [N] |
| km Yamagata (từ Fukushima), 130 km/h, dốc 37,5‰, đoạn đơn/đôi, 41 đường ngang Yamagata–Shinjo | https://ja.wikipedia.org/wiki/山形新幹線 | [N] |
| km Akita (từ Morioka), 130 km/h, switchback Omagari, 大地沢・志度内 信号場 | https://ja.wikipedia.org/wiki/秋田新幹線 | [N] |
| km Nishi-Kyushu, hầm 俵坂 5.705 / 新長崎 7.460 / 木場 2.885 / 久山 4.990 m, 260 km/h, 2面2線 | https://ja.wikipedia.org/wiki/西九州新幹線 | [N] |
| Lịch Joetsu/Hokuriku/Hokkaido/Yamagata/Akita (phần Shinkansen thật) | JR East 2610 (`docs/data/README.md`) | [D] |
| Lịch Kamome | PDF Nishi-Kyushu đã tải theo phép (`docs/data/raw-pdf/`) | [D] |
| Toạ độ ga | API Wikipedia (19 ga); các ga không có toạ độ điền tay | [N] / [K] |

## 3. Mô hình đặc thù và chỗ đơn giản hóa

**Chung.** Tham số riêng từng tuyến nằm trong `LINE_META` (`sim.js`): giới hạn tốc độ, tuyết, hầm, cảnh quan, dốc, tàu mặc định (`defVeh`), hướng lật hình (`flipDown`), lời phát thanh (`pa`), điểm cứu hộ (`refuges`), ghi chú dọc tuyến (`notes`), đoạn đổi tần số (`freq`).

- **Joetsu [I]:** hầm Nakayama (R = 1.500 m): Wikipedia ghi hạn chế 160 km/h (số cũ), lịch 2026 chạy nhanh hơn nhiều nên dùng 260 km/h. Vị trí Nakayama và Oshimizu theo km là [K]. Lịch Joetsu rất căng (Takasaki–Echigo-Yuzawa 23 phút) vượt khả năng tăng/giảm tốc của mô hình: tự lái trễ tới ~3,5 phút.
- **Hokuriku, đoạn cách điện [N tên SP, I vị trí km]:** 新軽井沢SP (~149,5 km), 新高田SP (~293,5), 新糸魚川SP (~322); 50 → 60 → 50 → 60 Hz. Quy tắc game: biển 予告 (500 m trước), 惰行 ở đầu đoạn, 力行 sau đoạn; kéo lực khi vào đoạn = hồ quang, mất lực 12 s, phạt 6 điểm. Tự lái trôi qua.
- **Hokkaido / Seikan [N]:** kéo dài tuyến `toh`. Đoạn dùng chung ray ba với tàu hàng: 140 km/h ngoài hầm, 160 km/h trong hầm; hầm 715,9–769,8 km (vị trí suy từ 実キロ). Dừng ở 竜飛/吉岡 khi có cháy trong hầm là đúng quy trình; dừng nơi khác trong hầm bị phạt. **Chưa mô hình:** tàu hàng gặp nhau, phân tách thời gian giờ cao điểm (260 km/h) [?].
- **Nishi-Kyushu:** 5 ga, không có đường tránh. Giờ đến ở ga giữa = giờ đi − 60 s [I] (PDF chỉ ghi giờ đi). Lỗi gõ 16:47 trong PDF (Kamome 56) đã sửa thành 19:47. Chuyến Relay Kamome (Hakata–Takeo-Onsen) không có trong game.
- **Mini-Shinkansen (Yamagata, Akita):**
  - Phần Shinkansen thật dùng giờ [D]; phần đường sắt thường chỉ có giờ ở Tsubasa chạy một mình chiều lên, còn lại **ước tính [I]** theo tốc độ trung bình (96 / 93 km/h, đèo Itaya / Sengan-toge 72 / 78 km/h) rồi chỉnh để tự lái đúng giờ.
  - Chiều lên của tàu ghép: lấy giờ từ tàu Yamabiko cùng số nếu có [D], không thì ước tính [I].
  - **Ghép / tách toa** ở Fukushima (Yamabiko + Tsubasa) và Morioka (Hayabusa + Komachi): thời gian lấy từ thời gian dừng trong lịch (100–300 s) [I]; không được khởi hành khi đang ghép/tách. Chuyến bắt đầu sau ga ghép/tách đã ở dạng sau khi ghép/tách.
  - **Đường đơn:** các đoạn đơn/đôi theo tên đoạn [N], km là [I]. Đường ngược chiều nhập vào đường ta; tàu ngược chiều không xuất hiện ở đoạn đơn (chưa mô hình gặp tàu tại ga) [?].
  - **Đường ngang** (Yamagata 53, Akita 45; số lượng Yamagata–Shinjo 41 là [N], còn lại [I]): chuông, rào chắn, đèn đỏ. Sự kiện hiếm: xe kẹt trên đường ngang, đèn tín hiệu đặc biệt (特殊信号発光機) nhấp nháy 600 m trước; không phanh kịp = va chạm (phạt 25 điểm). ATC không bảo vệ trường hợp này [I].
  - **Tốc độ qua đường cong:** v = √(1,3 · R) (đường sắt thường, chưa có nghiêng thân) [I]; chỉ áp dụng ở phần đường sắt thường.
  - **Omagari:** tàu đổi chiều chạy (switchback) [N]; game chỉ có thông báo, giữ nguyên hướng nhìn [I].
- **Tàu (VEH):** E7 12 toa 300 m, 9,6 MW; E6/E8 7 toa 148,7 m ~5 MW, ~336 t; ghép E5 + E6/E8 17 toa 404 m. Số công suất/khối lượng là [I]; chiều dài E6/E8 là xấp xỉ [K].

## 4. Hạn chế đã biết

- **Hình tàu:** E7, E6, E8, H5 dùng tạm mô hình E5 (xanh lá), Kamome dùng ảnh N700S-8000 đã có. Cần tải thêm ảnh từ rail.kychung.com cho E7/W7, E6, E8, H5 (xin phép người dùng trước khi tải).
- Tiếng còi thật chưa có.
- `transfers.js` (tuyến đổi tàu tại ga) cho ga mới là [K].
- Hokuriku: Tsuruga là ga cuối hiện nay; đoạn Tsuruga–Shin-Osaka chưa có.
- Hokkaido: Shin-Hakodate-Hokuto–Sapporo chưa khai thác (dự kiến 2038).
