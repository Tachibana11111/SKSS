# 04 – Biểu đồ chạy tàu (diagram) và nguyên tắc xếp lịch

Chú thích độ tin cậy: **[N]** có nguồn tra cứu (link cuối file) · **[D]** rút ra từ bộ dữ liệu lịch thật trong `data/` (có thể kiểm lại bằng script) · **[I]** suy luận từ dữ liệu, chưa có nguồn ghi trực tiếp · **[K]** kiến thức nền của Claude, chưa kiểm chứng · **[?]** chưa rõ.
Phiên bản 4 (2026-10-20): viết lại hoàn chỉnh sau khi lấy lịch thật (ngày thường và ngày nghỉ), 15 chuyến mẫu có giờ từng ga, và các nguồn kỹ thuật.

## 1. Quy mô và đặc điểm

- Chạy trên tuyến riêng, **không có tàu hàng, không có tàu đêm** (ngoại lệ một lần: tàu đêm thử nghiệm "Tokaido Lumière Express" ngày **8/8/2026**, Tokyo 22:00 → Shin-Osaka 6:59, đỗ khoảng 6 giờ ở Gifu-Hashima, xem tài liệu 08 mục 5), không giao cắt đồng mức (trừ Yamagata/Akita). Tuy mật độ cực cao, **tài nguyên không dồi dào**: gần như không có đoàn tàu và tổ lái dự phòng **[N]** (Tomii 2010).
- Số chuyến mỗi ngày: Tokaido 323 chuyến/ngày (2010), tối đa 372 chuyến/ngày (FY2023, gồm tàu tăng cường) **[N]**.
- **Số dòng khởi hành từ Tokyo (chiều xuống) trong lịch 10/2026 [D]:**

| Tuyến | Ngày thường | Ngày nghỉ | Ghi chú |
|---|---|---|---|
| Tokaido/Sanyo | 301 (Nozomi 234, Hikari 31, Kodama 36) | 323 (Nozomi 255, Hikari 31, Kodama 37) | ◆ = chỉ chạy một số ngày: 180 (thường) / 203 (nghỉ) |
| Tohoku/Hokkaido | 113 | 132 | |
| Joetsu | 43 (Toki 31, Tanigawa 12) | chưa lấy | |
| Hokuriku (Tokyo) | 63 (Kagayaki 22, Hakutaka 16, Asama 25) | chưa lấy | Tsurugi không chạy từ Tokyo |

"Dòng" ≠ "chuyến thực chạy": các dòng ◆ cùng giờ loại trừ nhau theo ngày (xem `data/README.md`).
- Giờ đầu/cuối từ Tokyo: Tokaido đầu 06:00 (Nozomi đi Hakata), cuối 22:48 (Kodama đi Mishima); Tohoku đầu 06:04 (ngày nghỉ 06:00), cuối 22:24 (Nasuno); Joetsu đầu 06:08, cuối 22:40; Hokuriku đầu 06:16, cuối 22:08 **[D]**.

## 2. Kiểu dừng ga Tokaido (Tokyo → Shin-Osaka) **[N]**

● = tất cả dừng · ▲ = một số chuyến · | = đi qua. km tính từ Tokyo (km thực).

| Ga | km | Nozomi | Hikari | Kodama |
|---|---|---|---|---|
| Tokyo | 0 | ● | ● | ● |
| Shinagawa | 6.8 | ● | ● | ● |
| Shin-Yokohama | 25.5 | ● | ● | ● |
| Odawara | 76.7 | \| | ▲ | ● |
| Atami | 95.4 | \| | ▲ | ● |
| Mishima | 111.3 | \| | ▲ | ● |
| Shin-Fuji | 135.0 | \| | \| | ● |
| Shizuoka | 167.4 | \| | ▲ | ● |
| Kakegawa | 211.3 | \| | \| | ● |
| Hamamatsu | 238.9 | \| | ▲ | ● |
| Toyohashi | 274.2 | \| | ▲ | ● |
| Mikawa-Anjo | 312.8 | \| | \| | ● |
| Nagoya | 342.0 | ● | ● | ● |
| Gifu-Hashima | 367.1 | \| | ▲ | ● |
| Maibara | 408.2 | \| | ▲ | ● |
| Kyoto | 476.3 | ● | ● | ● |
| Shin-Osaka | 515.4 | ● | ● | ● |

- **Hikari có hai mẫu dừng [N]+[D]:**
  - Mẫu **:03 đi Okayama**: dừng Shizuoka và Hamamatsu (Mishima dừng hoặc không). Mẫu chuyến mẫu: Hikari 703 dừng Shinagawa, Shin-Yokohama, Shizuoka, Hamamatsu, Nagoya, Kyoto, Shin-Osaka, Shin-Kobe, Nishi-Akashi, Himeji, Aioi, Okayama.
  - Mẫu **:33 đi Shin-Osaka**: dừng Odawara **hoặc** Toyohashi (chuyến mẫu 633 dừng Odawara; 635 dừng Toyohashi), cộng Nagoya, Gifu-Hashima, Maibara, Kyoto.
- Nozomi dừng 6 ga cố định ở Tokaido; trên Sanyo dừng cố định Shin-Kobe, Okayama, Hiroshima, Kokura, Hakata; Himeji, Fukuyama, Shin-Yamaguchi mỗi chuyến chọn một (Tokuyama 4 cặp/ngày) **[N]**.

## 3. Mẫu lịch theo giờ

### 3.1 Tokaido: lưới giờ 3 phút **[D]**
- **301/301 giờ khởi hành ngày thường (và toàn bộ ngày nghỉ) đều là bội số của 3 phút**, nên có tối đa 20 ô khởi hành mỗi giờ; thực tế dùng 16 (12 Nozomi + 2 Hikari + 2 Kodama) và từ 14/3/2026 tối đa 17 (13 + 2 + 2) **[N]**. Đây là bằng chứng mạnh (nhưng gián tiếp) cho khoảng cách tối thiểu **3 phút**, xem mục 12.
- **Mẫu cố định hằng giờ (dòng không ◆):**

| Loại | Phút xuất phát từ Tokyo | Điểm đến thường gặp |
|---|---|---|
| Hikari | **:03** và **:33** | :03 → Okayama; :33 → Shin-Osaka |
| Kodama | **:27** và **:57** | :27 → Nagoya; :57 → Shin-Osaka (chuyến ngắn Nagoya hoặc Mishima/Shizuoka/Hamamatsu buổi tối) |
| Nozomi định kỳ | **:00, :12, :30, :48** | luân phiên Hakata (:12 và :30), Hiroshima (:00 và :48), Shin-Osaka |
| Nozomi tăng cường | :06, :09, :18, :21, :24, :39, :42, :45, :51, :54 | phần lớn có ◆, điền vào các ô trống lúc cao điểm |

- **Ban ngày ngày thường:** 7–9 chuyến định kỳ mỗi giờ (dòng không ◆); khi tính cả ◆ có 18–22 dòng/giờ, nhưng một ngày cụ thể chạy tối đa 16–17 chuyến/giờ **[D]**.
- Ban ngày: Nozomi cơ bản 5 chuyến/giờ (2 Hakata, 1 Hiroshima, 1 Shin-Osaka, + 1 không định kỳ), Hikari 2/giờ, Kodama 2/giờ Tokyo–Nagoya và 1/giờ đi tiếp Shin-Osaka **[N]**.
- Chuyến ngắn của Kodama: Tokyo–Mishima/Shizuoka/Hamamatsu (số hiệu 900–922), Mishima/Shizuoka/Nagoya–Shin-Osaka (860–868) **[N]**.
- Số hiệu chuyến mẫu **[D]**: Nozomi 15/17/61/63; Hikari 633/635/703; Kodama 807/809/915; kèm hậu tố A (Tokaido/Sanyo) hoặc B/M (Tohoku/Akita; vd. Hayabusa 4101B, Komachi 3003M). Quy luật đánh số đầy đủ **[?]**.
- Toa tự do: toa 1–2 Nozomi (toa 3 đổi sang chỉ định từ 15/3/2025); toa 8–10 là Green; dịp lễ lớn toàn bộ ghế chỉ định **[N]**. Nozomi định kỳ luôn 16 toa **[N]**.

### 3.2 Lịch sử lưới Tokaido **[N]**
1964: 1 Hikari + 1 Kodama mỗi giờ (cặp "1–1", 4 giờ/5 giờ); 1965: Hikari 3:10; 1980: 5 + 5; 1992: Nozomi ra đời (2:30); 2003: cấu trúc "2 Hikari + 2 Kodama" ổn định đến nay; 2013–14: tối đa 10 Nozomi/giờ; 3/2020: 12 Nozomi ("12-2-2", tối đa 16); 14/3/2026: tối đa 13 Nozomi (13-2-2 = 17).

### 3.3 Các tuyến khác
- **Tohoku/Hokkaido (từ Tokyo) [D]:** ~101/113 giờ khởi hành là bội số của 4 phút (gợi ý lưới 4 phút), tối đa ~8–9 dòng/giờ. Mẫu định kỳ hay gặp: Hayabusa+Komachi :20, Yamabiko+Tsubasa :00, Yamabiko :36, Hayabusa :56, Nasuno nhiều ở :00/:12. Có 39/113 dòng ngày thường là tàu ghép (Hayabusa+Komachi 25, Yamabiko+Tsubasa 14). Ngày nghỉ 132 dòng (Hayabusa 36, Hayabusa+Komachi 27, Yamabiko 36, Yamabiko+Tsubasa 19, Nasuno 14).
- **Joetsu [D]:** Toki 31 dòng, Tanigawa 12 dòng. Ban ngày Toki đều đặn ở :40 (và :16 vào các giờ giữa ngày, phần lớn có ◆), tức khoảng 1–2 chuyến/giờ; Tanigawa tập trung sáng sớm và chiều tối.
- **Hokuriku [D]:** ban ngày Asama (Nagano) ở :04 hầu như mỗi giờ; Hakutaka ở :24; Kagayaki (Kanazawa/Tsuruga) chủ yếu sáng và chiều tối, nhiều dòng ◆.
- **Sanyo/Kyushu [N]:** Nozomi (Sanyo) ~1–2 chuyến/giờ; Mizuho khoảng 8 cặp/ngày; Sakura 16 cặp Shin-Osaka–Kagoshima-Chuo (từ 16/3/2024); Kodama ~1 chuyến/giờ; Tsubame 0–1 chuyến/giờ; **Kyushu không có ga tránh** nên tàu không vượt nhau ở ga. **Lưu ý thời sự [N, tin báo chí, chưa kiểm chứng sâu]:** tháng 7/2026 có trận động đất mạnh ở Kumamoto làm Kyushu Shinkansen ngừng chạy; đoạn Hakata–Kumamoto chạy lại từ 31/7 với số chuyến giảm. Dữ liệu JR West ngày 20/10/2026 vẫn có 24 chuyến Mizuho/Sakura (kể cả Mizuho 601) đi thẳng **Kagoshima-Chuo**, tức đến tháng 10 đã chạy thông suốt lại. Đây là chất liệu thực tế cho phần sự cố (09).
- **Hokkaido [N]:** Hayabusa 10 cặp Tokyo–Shin-Hakodate-Hokuto + 1 cặp Sendai–; Hayate 2 cặp.

### 3c. Bộ lịch đầy đủ của chuyến định kỳ ngày thường (570 chuyến, cả hai chiều) **[D]**
Lấy trực tiếp từ HTML của JR East (xem `data/README.md`); bao gồm mọi chuyến **không ◆** của các trang Tokyo (xuống) và Omiya (lên về Tokyo), giờ từng ga, số sân, số hiệu, ngày chạy. Đã đối chiếu: các file lấy trước đó khớp 100%, 128 dòng ga của 15 chuyến mẫu không sai lệch nào.

| Loại tàu | Số chuyến | Xuống / Lên | Hậu tố số hiệu |
|---|---|---|---|
| Nozomi | 120 | 55 / 65 | A |
| Hikari | 62 | 30 / 32 | A |
| Kodama | 75 | 36 / 39 | A |
| Hayabusa (kể cả ghép Komachi) | 48 | 24 / 24 | B |
| Yamabiko (kể cả ghép Tsubasa) | 74 | 36 / 38 | B |
| Nasuno | 31 | 15 / 16 | B |
| Tsubasa (không ghép, chiều ghi riêng) | 8 | 4 / 4 | B và M |
| Toki | 48 | 24 / 24 | C |
| Tanigawa | 22 | 11 / 11 | C (2 chuyến E) |
| Asama | 34 | 17 / 17 | E |
| Hakutaka | 28 | 14 / 14 | E |
| Kagayaki | 20 | 10 / 10 | E |
| **Tổng** | **570** | | |

(Ngày chạy trong kỳ lịch 18/9–31/12/2026: 509 chuyến chạy mọi ngày; 19 chỉ thứ Hai–thứ Sáu; 18 không chạy Chủ nhật; 9 không chạy thứ Bảy; số còn lại có mẫu khác, vd. không chạy thứ Sáu; 4 chuyến hầu như không chạy trong kỳ này.)

- **Quy tắc số hiệu [D]:** số **lẻ = chiều xuống, chẵn = chiều lên**. Hậu tố: **A** Tokaido/Sanyo/Kyushu, **B** Tohoku/Hokkaido (và phần Shinkansen của Yamagata/Akita), **M** phần mini-Shinkansen của Komachi/Tsubasa (tàu ghép có hai số, vd. Hayabusa 3003B + Komachi 3003M), **C** Joetsu, **E** Hokuriku/Nagano. Dải số quan sát: Nozomi 1–293, Hikari 630–722, Kodama 801–922, Hakutaka 551–578, Asama 600–633, Nasuno 251–282; tàu JR East còn có số 4 chữ số (vd. Kagayaki 3501E, Hayabusa 4101B, Komachi 3003M).
  - **Quy tắc chữ số nghìn [N]+[D]:** theo quy tắc chung của JR, chữ số nghìn phân loại tàu: **1–5 = định kỳ, 6–7 = theo mùa, 8–9 = tăng cường (臨時)**; ví dụ Hayabusa 1 là 3001B. Dải trăm theo tuyến (2023): Tohoku/Hokkaido 1–200, Joetsu 300–400, Hokuriku 500.
  - **Riêng chữ số 4 [D]:** cả 11/11 chuyến Hayabusa mang số 4xxx đều **dừng ở Kurikoma-Kogen**, còn 27/27 chuyến 3xxx và 8/8 chuyến 1xxx đều **không dừng**; khớp ghi chép rằng JR East dùng số 4000 cho tàu dừng ga này (có thiết bị hỗ trợ dừng ga riêng). Trong dữ liệu, số 1xxx (Toki 14, Yamabiko 6, Hayabusa 2), 2xxx (Tanigawa 5) và 3xxx (Kagayaki, Komachi, Hayabusa) đều là chuyến định kỳ; 6xxx (Yamabiko, 4 chuyến) là nhóm "theo mùa" nhưng vẫn có trong lịch ngày thường. Nguồn tabiris xác nhận dải: Nozomi 1–470, Hikari 500–670, Kodama 700–880, Mizuho 600–610, Sakura 400–410/540–570, Tsubame 300–340 **[N]**.
- **Tỷ lệ N700S [D]:** trong chuyến Tokaido ghi rõ dòng xe: Nozomi 29/120 (khoảng 24%), Hikari 6/62, Kodama 10/75; còn lại là N700/N700A. (Dòng xe chỉ có trên trang Tokaido/Sanyo.)
- **Số chuyến theo giờ, giờ thường ngày [D]:** xem `lists-weekday-2610.csv` (cột `time`, `flag`).

**Khoảng cách giữa các chuyến định kỳ liên tiếp tại một ga [D]** (chỉ tính chuyến không ◆, nên là cận trên; thực tế còn dày hơn vì có tàu tăng cường): Shinagawa chiều xuống: tối thiểu 2 phút (1 lần), phổ biến 3 phút (35 lần), 6 (18), 9 (30); Nagoya: 1–3 phút; Kyoto chiều lên: tối thiểu 3, thường 3 hoặc 6 phút; **Shin-Osaka tối thiểu 3 phút**; Omiya: phổ biến 4 phút (82/74 lần) và 8 phút; Sendai: tối thiểu 3 phút. Tức **ngay trong lịch định kỳ, tại các ga lớn khoảng cách nhỏ nhất vẫn là 3 phút**, ăn khớp với lưới giờ 3 phút.

### 3c-2. Lịch ngày nghỉ (土曜・休日) so với ngày thường, JR East **[D]**
Cùng cách lấy, trang "thứ Bảy/ngày nghỉ" (`data/*-holiday-2610.csv`): **540 chuyến định kỳ** (ngày thường 570).

| Loại | Ngày thường | Ngày nghỉ |
|---|---|---|
| Nozomi | 120 | 114 |
| Hikari | 62 | 62 |
| Kodama | 75 | 69 |
| Hayabusa | 48 | 48 |
| Yamabiko | 74 | 74 |
| Nasuno | 31 | 27 |
| Toki | 48 | 47 |
| Tanigawa | 22 | 15 |
| Asama | 34 | 30 |
| Hakutaka | 28 | 26 |
| Kagayaki | 20 | 20 |
| Tsubasa (không ghép) | 8 | 8 |

- **Mẫu phút định kỳ của Tokaido không đổi** giữa ngày thường và ngày nghỉ (Hikari :03/:33, Kodama :27/:57, Nozomi :00/:12/:30/:48). Ngày nghỉ khác ở **tàu tăng cường**: số dòng ◆ ở ga Tokyo tăng từ 265 lên 360 (Tokaido 180 → 203), nên ngày nghỉ chạy dày hơn ở các khung giờ thường.
- Các tuyến có ít chuyến hơn vào ngày nghỉ là tuyến thiên về đi làm: Nasuno (31 → 27), Tanigawa (22 → 15), Asama (34 → 30), Kodama (75 → 69).

### 3d. Một ngày thật: thứ Ba 20/10/2026, qua ga Shin-Osaka (JR West) **[D]**
Nguồn: JRおでかけネット (JR West), ga Shin-Osaka, hai chiều, đúng ngày 20/10/2026. Khác với lịch JR East (gộp mọi ngày), đây là các chuyến **thực chạy hôm đó**, có giờ từng ga kể cả ga tàu đi qua. Mỗi chuyến phải **rời Shin-Osaka**, nên các chuyến kết thúc tại Shin-Osaka (và Kyushu chiều lên) không có trong tập này.

| Hướng | Nozomi | Hikari | Kodama | Sakura | Mizuho | Tổng |
|---|---|---|---|---|---|---|
| Xuống (Okayama/Hakata/Kagoshima) | 60 | 15 | 13 | 17 | 8 | **113** |
| Lên (về Kyoto/Tokyo) | 108 | 30 | 17 | – | – | **155** |

- Có **45/268** chuyến đánh dấu ◆ (có thể không chạy ngày khác).
- **Chuyến rời Shin-Osaka theo giờ, ngày thật (thứ Ba 20/10):** chiều **xuống tối đa 9 chuyến/giờ** (8–10 giờ), chiều **lên tối đa 11 chuyến/giờ** (7–9 giờ và 16 giờ); **cả hai chiều cộng lại tối đa 20 chuyến/giờ** (8–10 giờ). Giữa trưa mỗi chiều khoảng 5–6 (xuống) và 9 (lên); buổi tối 21 giờ 6 + 5, 22 giờ 5 + 3, 23 giờ 2 (chỉ xuống).
  - *Đính chính:* trong các bản nháp trước tôi ghi nhầm "20 chuyến/giờ" là số **một chiều** và kết luận lưới 3 phút "được dùng kín". Thực ra 20 là tổng hai chiều; mỗi chiều chỉ 9–11 chuyến/giờ, nên lưới 3 phút (tối đa 20 ô mỗi chiều) **không bị dùng kín** ở Shin-Osaka vào ngày này.
- **Cùng ga, thứ Bảy 24/10/2026 (ngày nghỉ):** tổng **310 chuyến** (thứ Ba 268): Nozomi lên 139 (108 thứ Ba), Nozomi xuống 68 (60), Sakura xuống 19 (17), Hikari xuống 16 (15). Chiều **xuống tối đa 11 chuyến/giờ**, chiều **lên tối đa 15 chuyến/giờ**, hai chiều cộng lại tối đa **26 chuyến/giờ** (8–10 giờ). Có 88/310 chuyến ◆ (45/268 thứ Ba). Chỉ 253 chuyến trùng hai ngày; thứ Bảy có thêm 57 chuyến và thiếu 15 chuyến so với thứ Ba, tức khoảng **18% chuyến thứ Bảy không có vào thứ Ba** (chủ yếu Nozomi tăng cường).
- **Khoảng cách giữa hai chuyến liên tiếp cùng chiều rời Shin-Osaka:** tối thiểu **3 phút** ở chiều xuống (24 lần thứ Ba, 27 lần thứ Bảy) và chiều lên (60 lần thứ Ba, 90 lần thứ Bảy), chỉ một lần 2 phút mỗi chiều lên. Khoảng 3 phút lặp rất nhiều lần nên **3 phút là khoảng cách tối thiểu thực tế**; nhưng đây là bằng chứng thống kê chứ chưa phải quy định công bố.
- **Đến Tokyo theo giờ (chuyến lên qua Shin-Osaka):** tối đa 11/giờ (Nozomi 8, Hikari 2, Kodama 1) vào 11–12 giờ và 18–20 giờ; tập này không gồm tàu kết thúc ở Nagoya/Shizuoka/Mishima.
- **Nozomi đi lên 108 chuyến ngày thật so với 65 chuyến định kỳ** trong dữ liệu JR East (không ◆): nghĩa là ngày 20/10 chạy thêm khoảng 40 chuyến Nozomi tăng cường so với lịch định kỳ.
- **Điểm xuất phát/kết thúc nhiều nhất:** Shin-Osaka → Tokyo 74, Hakata → Tokyo 40, Tokyo → Hakata 38, Shin-Osaka → Kagoshima-Chuo 24, Hiroshima → Tokyo 18, Tokyo → Hiroshima 15, Tokyo ↔ Okayama 14 + 14, Shin-Osaka → Hakata 8; đường Nagoya/Hiroshima/Okayama làm điểm đầu/cuối cho một số ít chuyến.
- **Sân ga Shin-Osaka:** xuống dùng sân 20, 21, 22 (21: 50 chuyến, 20: 36, 22: 27); lên dùng sân 23–27 (27: 56, 26: 37, 25: 32, 24: 16, 23: 14). Tức 3 sân xuống, 5 sân lên (khớp "5 sân 8 đường").

### 3e. Kyushu chiều lên và Nishi-Kyushu (từ bảng giờ PDF, lịch từ 14/3/2026) **[D]**
Nguồn: bảng giờ của shinkansenkenkyu.com (Kyushu "全列車" chiều lên 6 trang; Kamome/Relay Kamome chiều xuống và lên, 3 trang mỗi chiều). Các PDF ghi **cấm tự ý đăng lại và trích dẫn**, nên ở đây chỉ ghi **số liệu tổng hợp** (thời gian chạy, dừng, số chuyến), không chép bảng giờ gốc. Tệp gốc và bản đã đọc nằm ở `data/raw-pdf/` (chỉ dùng cá nhân). Các bảng chỉ ghi "chuyến định kỳ", không ghi ngày thường hay nghỉ.

**Kyushu Shinkansen, chiều lên (về Hakata/Shin-Osaka): 53 chuyến mỗi ngày**
- **Sakura 23, Tsubame 22, Mizuho 8.** Dòng xe: Sakura chủ yếu N700 8 toa (21 chuyến) và 2 chuyến 800 6 toa; Tsubame chủ yếu 800 6 toa (18) và 4 chuyến N700 8 toa; Mizuho luôn N700 8 toa (có toa Green; 800 6 toa không có Green).
- **Số chuyến tới Hakata mỗi giờ:** 1–3 (cao nhất 3 vào 8 giờ); chuyến đầu đến Hakata **6:57**, chuyến cuối **23:54** (Sakura).
- **Tiếp tục sang Sanyo:** 25 chuyến đi tiếp tới Shin-Osaka (phần lớn Sakura/Mizuho), 1 tới Kokura, 1 tới Hiroshima; 26 chuyến kết thúc tại Hakata (phần lớn Tsubame).
- **Sân ga Hakata khi đến (chiều lên):** sân **11** (23 chuyến), **14** (15), **12** (14).
- **Thời gian chạy (phút, trung vị; min–max):**
  - Sakura: Kagoshima-Chuo → Sendai 12 · Sendai → Izumi 12 · Izumi → Shin-Minamata 7 · Shin-Minamata → Shin-Yatsushiro 14 · Shin-Yatsushiro → Kumamoto 10 (10–11) · Sendai → Kumamoto (không dừng giữa) 34 · **Kumamoto → Kurume 21 (19–23)** · Kurume → Shin-Tosu 5 (4–7) · Shin-Tosu → Hakata 13 (12–13).
  - Tsubame (dừng mọi ga): Kumamoto → Shin-Tamana 10 · → Shin-Omuta 8 · → Chikugo-Funagoya 6 · → Kurume 8 · Kurume → Shin-Tosu 4 · Shin-Tosu → Hakata 13 (12–14).
  - Mizuho: Kagoshima-Chuo → Kumamoto **43**; Kumamoto → Hakata **32**.
- **Dừng:** tại Kumamoto Sakura/Mizuho/Tsubame đều **1 phút**; chỉ một số chuyến Tsubame dừng lâu (đến 11 phút) vì kết thúc hoặc đổi hướng tại Kumamoto. Các ga trung gian chỉ có giờ rời nên không tính được thời gian dừng.
- Khớp với số liệu chiều xuống của JR West (mục 4): Hakata → Shin-Tosu 12, Kurume → Kumamoto 20, Kumamoto → Kagoshima-Chuo 50 (Mizuho).

**Nishi-Kyushu Shinkansen và Relay Kamome**
- **Kamome (Shinkansen Takeo-Onsen ↔ Nagasaki): 24 chuyến xuống, 23 chuyến lên.**
- **Relay Kamome (tàu thường Hakata ↔ Takeo-Onsen, đồng bộ với Kamome):** chiều xuống 19 chuyến "Relay Kamome" và 3 chuyến "Midori (Relay Kamome)"; chiều lên 16 và 5.
- **Thời gian chạy Kamome (phút, trung vị):** Takeo-Onsen → Ureshino-Onsen **6–7** · Ureshino-Onsen → Shin-Omura **9** · Shin-Omura → Isahaya **6–7** · Isahaya → Nagasaki **8** (8–9). Chuyến tốc hành bỏ qua ga nhỏ: Takeo-Onsen → Isahaya **16** phút, Takeo-Onsen → Shin-Omura 12. Chiều lên: Nagasaki → Isahaya 9 · Isahaya → Shin-Omura 7 · Shin-Omura → Ureshino 8–9 · Ureshino → Takeo-Onsen 6.
- **Relay Kamome (tàu thường):** Hakata → Tosu **22** (20–28) · Tosu → Shin-Tosu 4 · Shin-Tosu → Saga 14 (13–16) · Saga → Kouhoku 10 (9–13) · Kouhoku → Takeo-Onsen 11 (9–14); Saga → Takeo-Onsen (tàu nhanh) 20 (20–24).
- **Ba kiểu dừng của Kamome** (đã biết từ nguồn khác): tốc hành 1 (Takeo-Onsen, Isahaya, Nagasaki), tốc hành 2 (thêm Shin-Omura), mọi ga (thêm Ureshino-Onsen) **[N]**.
- **Đổi tàu tại Takeo-Onsen (đối diện sân ga): 3 phút** (17/18 trường hợp chiều xuống, 14/16 chiều lên; còn lại 4–5 phút). Đây là chiều **đồng bộ lịch** giữa tàu thường và Shinkansen, tức một chuyến Relay Kamome trễ quá vài phút sẽ khiến Kamome phải chờ hoặc hành khách lỡ chuyến: tình huống điều độ điển hình.
- **Tuyến Nishi-Kyushu không nối ray với phần còn lại** của Shinkansen (xem tài liệu 01), nên không có tàu liên thông.

## 4. Thời gian chạy giữa các ga (từ 15 chuyến mẫu, ngày thường 10/2026) **[D]**

Dữ liệu gốc ở `data/stops-weekday-2610.csv` (15 chuyến mẫu này nằm trong đó và đã được đối chiếu khớp 100%). Thời gian tính từ lúc rời ga trước đến lúc đến ga sau (phút). Một số cặp có hai giá trị vì thay đổi theo từng chuyến (biên độ).

**Tokaido (Nozomi):** Tokyo–Shinagawa 6 · Shinagawa–Shin-Yokohama 10–11 · Shin-Yokohama–Nagoya **77–81** · Nagoya–Kyoto 33–34 · Kyoto–Shin-Osaka 13–14.
**Sanyo (Nozomi):** Shin-Osaka–Shin-Kobe 12 · Shin-Kobe–Okayama 31–32 · Okayama–Hiroshima 36–38 · Hiroshima–Shin-Yamaguchi 31 · Shin-Yamaguchi–Kokura 19 · Kokura–Hakata 15–16.
**Tohoku (Hayabusa):** Tokyo–Ueno 5 · Ueno–Omiya 18 · Omiya–Sendai 66–68 · Sendai–Morioka 38–39 · Morioka–Shin-Aomori 47 · Shin-Aomori–Shin-Hakodate-Hokuto 57.
**Kodama (Tokaido):** Shin-Yokohama–Odawara 14–15 · Odawara–Atami 7–9 · Atami–Mishima 7 · Mishima–Shin-Fuji 8–9 · Shin-Fuji–Shizuoka 11 · Shizuoka–Kakegawa 13 · Kakegawa–Hamamatsu 10–11 · Hamamatsu–Toyohashi 11–12 · Toyohashi–Mikawa-Anjo 12 · Mikawa-Anjo–Nagoya 11 · Nagoya–Gifu-Hashima 10 · Gifu-Hashima–Maibara 12 · Maibara–Kyoto 18 · Kyoto–Shin-Osaka 15.

**Hokkaido (từ dữ liệu JR East qua ga Shin-Aomori, 7 chuyến, cả hai chiều) [D]:** Morioka → Shin-Aomori 47; Shin-Aomori → Shin-Hakodate-Hokuto **57**; chia ra: Shin-Aomori → Okutsugaru-Imabetsu 15, Okutsugaru-Imabetsu → Kikonai **33** (đoạn hầm Seikan dùng chung ray, 160 km/h), Kikonai → Shin-Hakodate-Hokuto 12. Dừng: Shin-Aomori 2, Okutsugaru-Imabetsu và Kikonai 0–1. Ví dụ chuyến lên: Shin-Hakodate-Hokuto 17:26 → Shin-Aomori 18:23/18:25 → Morioka 19:13 → Sendai 19:53 → Omiya 21:01 → Tokyo 21:23 (tổng 3 giờ 57 phút). Hayate chỉ chạy đoạn ngắn (Morioka–Shin-Hakodate-Hokuto, Shin-Aomori–Shin-Hakodate-Hokuto), dừng tất cả ga.

**Sanyo và Kyushu (ngày thật JR West, trung vị; min–max) [D]:**

| Chặng | Loại | Phút |
|---|---|---|
| Shin-Osaka → Shin-Kobe | mọi loại | 12 (12–13) |
| Shin-Kobe → Nishi-Akashi → Himeji → Aioi → Okayama | Hikari | 7 → 10 → 7 → 15 |
| Shin-Kobe → Okayama | Nozomi / Sakura | 31 (31–33) / 33–34 |
| Okayama → Fukuyama → Hiroshima | Nozomi/Sakura | 15–16 → 23–24 |
| Hiroshima → Shin-Yamaguchi → Kokura | Nozomi | 30–31 → 18–19 |
| Hiroshima → Tokuyama → Kokura | Nozomi/Sakura | 21–22 → 27–28 |
| Hiroshima → Kokura | Mizuho | 45–46 |
| Kokura → Hakata | mọi loại | 15 (15–17) |
| Hakata → Shin-Tosu → Kurume | Sakura | 12 → 3–4 |
| Hakata → Kurume → Kumamoto | Mizuho | 14 → 20 |
| Kumamoto → Kagoshima-Chuo | Mizuho | 50 (50–51) |
| Kumamoto → Shin-Yatsushiro → Shin-Minamata → Izumi → Sendai | Sakura | 13 → 16 → 6 → 10 → 11 |
| Sendai → Kagoshima-Chuo | Sakura | 12 |
| Kodama Sanyo: Okayama → Shin-Kurashiki → Fukuyama → Shin-Onomichi → Mihara → Higashi-Hiroshima → Hiroshima | | 9 → 11 → 7 → 6 → 11 → 11 |

**Thời gian chạy từ toàn bộ 570 chuyến (trung vị; min–max) [D]:**

| Chặng | Loại | Phút |
|---|---|---|
| Tokyo → Shinagawa | mọi loại | 6 (6–7) |
| Shinagawa → Shin-Yokohama | mọi loại | 10 (10–11) |
| Shin-Yokohama → Nagoya | Nozomi | 78 (75–82) |
| Nagoya → Kyoto | Nozomi / Hikari | 34 (33–35) |
| Kyoto → Shin-Osaka | Nozomi | 13–14 (12–15) |
| Shin-Osaka → Shin-Kobe | Nozomi / Hikari | 12 |
| Shin-Kobe → Okayama | Nozomi | 31 (31–32) |
| Okayama → Hiroshima | Nozomi | 36 (35–38) |
| Hiroshima → Kokura | Nozomi | 45 (45–46) |
| Kokura → Hakata | Nozomi | 15 (15–16) |
| Tokyo → Ueno / Ueno → Omiya | mọi tàu Tohoku/Joetsu/Hokuriku | 5 / 18 (17–19) |
| Omiya → Sendai | Hayabusa | 67 (66–73) |
| Sendai → Morioka | Hayabusa | 39 (38–40) |
| Morioka → Shin-Aomori | Hayabusa | 47 |
| Shin-Aomori → Shin-Hakodate-Hokuto | Hayabusa | 57 |
| Omiya → Utsunomiya → Koriyama → Fukushima | Yamabiko | 23 → 27 → 13 |
| Fukushima → Yonezawa (mini) | Tsubasa | 32 (31–34) |
| Morioka → Tazawako (mini) | Komachi | 32 (29–39) |
| Omagari → Akita | Komachi | 31 (30–36) |
| Omiya → Nagano (Hokuriku) | Kagayaki | 55 (54–62) |
| Nagano → Toyama → Kanazawa | Kagayaki | 45–46 → 19 |
| Omiya → Takasaki | Toki | 22–23 |
| Nagaoka → Niigata (Joetsu) | Toki | 9 + 12 |

Biên độ lớn nhất nằm ở Shin-Yokohama–Nagoya (7 phút giữa min và max) và Omiya–Sendai (7 phút): đó là **dự phòng (đệm) của lịch**, tức một chuyến chạy bù trễ được vài phút nếu có thể chạy nhanh hơn kế hoạch.

**Tốc độ trung bình tính từ km thực [I]:** Shin-Yokohama→Nagoya 316,5 km trong 77–81 phút ≈ **234–246 km/h**; Nagoya→Kyoto 134,3 km trong 33–34 phút ≈ **237–244 km/h**; Kyoto→Shin-Osaka 39,1 km trong 13–14 phút ≈ **168–180 km/h** (đoạn ngắn, có tăng/giảm tốc). Biên độ 4 phút ở đoạn Shin-Yokohama–Nagoya cho thấy lịch có **dự phòng (đệm) thay đổi theo từng chuyến**.

**Tổng thời gian chuyến mẫu [D]:** Nozomi 15 Tokyo→Hakata 4:57; Nozomi 17 → Hakata 5:00; Nozomi 61 → Hiroshima 3:59; Hikari 703 → Okayama 3:59; Hikari 633 → Shin-Osaka 2:51; Hikari 635 → Shin-Osaka 2:54; Kodama 807 → Shin-Osaka 3:54; Kodama 809 → Nagoya 2:39; Hayabusa 101 → Morioka 2:46; Hayabusa 5 → Shin-Hakodate-Hokuto 3:57; Hayabusa+Komachi 07:32 → Akita 3:53 (Shin-Aomori 3:20); Yamabiko+Tsubasa 08:07 → Yamagata 2:58; Nasuno 251 → Nasushiobara 1:08.

## 5. Thời gian dừng và việc tàu nhanh vượt tàu chậm **[D]**

### 5.1 Thời gian dừng (phút)
| Loại tàu | Dừng thông thường | Ghi chú |
|---|---|---|
| Nozomi | **1–2** (Shinagawa 1, Shin-Yokohama 1, Nagoya 1–2, Kyoto 1–2, Shin-Osaka 2, ga Sanyo 0–1) | không chờ ở đâu (là tàu vượt) |
| Hikari | 1 ở Shinagawa/Shin-Yokohama, **2–6** ở các ga chờ | chờ tàu nhanh vượt |
| Kodama | 1 ở Shinagawa/Shin-Yokohama/Atami, **3–6** ở các ga chờ | dừng chờ ở gần như mọi ga có đường thông qua |
| Hayabusa/Yamabiko (Tohoku) | 0–2, riêng Ichinoseki 4 và Utsunomiya 4 (có tàu vượt) | Furukawa/Kurikoma-Kogen dừng 0 (đến và đi cùng phút) |

### 5.2 Các ga mà tàu chờ tàu nhanh vượt (suy ra từ dừng ≥3 phút) **[D]/[I]**
- **Kodama 807 (Tokyo→Shin-Osaka, 07:57):** chờ ở Odawara 5, Mishima 4, Shin-Fuji 4, Shizuoka 3, Kakegawa 4, Hamamatsu 4, Toyohashi 5, Mikawa-Anjo 5, **Nagoya 6**, Gifu-Hashima 5, **Maibara 6**. Tổng thời gian dừng **56 phút trên 234 phút (24%)**.
- **Kodama 809 (đến Nagoya, 08:27):** chờ ở Odawara 5, Mishima 4, Shin-Fuji 5, Shizuoka 5, Kakegawa 2, Hamamatsu 4, Toyohashi 5, Mikawa-Anjo 4; tổng dừng 37 phút trên 159 phút.
- **Hikari 703 (Okayama):** Shizuoka 5, Hamamatsu 4, **Kyoto 6**, Nishi-Akashi 4, Himeji 3, Aioi 4.
- **Hikari 633/635 (Shin-Osaka):** Toyohashi 5 (635), Gifu-Hashima 5, Maibara 5; Kyoto chỉ 2.
- **Kết luận [I]:** ga có đường thông qua dùng làm điểm vượt (Odawara, Mishima, Shin-Fuji, Shizuoka, Kakegawa, Hamamatsu, Toyohashi, Mikawa-Anjo, Gifu-Hashima, Maibara; Nishi-Akashi, Himeji, Aioi trên Sanyo), cộng các ga 4 đường lớn (Nagoya, Kyoto) cũng được dùng để vượt (dừng 6 phút) dù không có đường thông qua riêng. Nhờ đó khớp với mục 5 tài liệu 02 và với ghi chú Wikipedia về vượt ở Aioi, Hamamatsu, Nishi-Akashi.
- Dừng 3–6 phút ở các ga này là **thời gian chờ**, không phải thời gian lên xuống khách; lịch Kodama vì vậy chậm hơn nhiều so với tốc độ chạy thuần.

### 5.3 Thời gian dừng đo trên toàn bộ 570 chuyến (trung vị; khoảng) **[D]**
- **Nozomi:** Shinagawa 1 · Shin-Yokohama 1 · Nagoya 1 (1–2) · Kyoto 2 (1–2) · Shin-Osaka 2 (2–3) · Shin-Kobe 1 · Okayama 1 · Hiroshima 1 · Kokura 1.
- **Hikari (chờ vượt):** Shizuoka 4 (1–6) · Hamamatsu 4 (1–7) · **Gifu-Hashima 6 (2–7)** · Maibara 5 (3–6) · Nishi-Akashi 3 (3–4) · Himeji 3 (3–4) · Aioi 5 (3–9) · Nagoya 2 (1–6) · Kyoto 2 (1–6); Odawara/Mishima 1 (các chuyến này chỉ dừng ngắn).
- **Kodama (chờ vượt ở hầu hết ga có đường thông qua):** Odawara 5 (1–6) · Mishima 5 (1–6) · Shin-Fuji 5 (1–7) · Shizuoka 4 (1–5) · Kakegawa 2 (1–9) · Hamamatsu 4 (2–6) · Toyohashi 5 (2–7) · Mikawa-Anjo 5 (2–7) · **Nagoya 6 (4–6)** · Gifu-Hashima 5 (3–5) · Maibara 5 (4–6) · Kyoto 1 (1–2).
- **Sanyo (ngày thật 20/10/2026, JR West) [D]:**
  - **Nozomi:** 1 phút ở mọi ga Sanyo (Shin-Kobe, Himeji, Okayama, Fukuyama, Hiroshima, Shin-Yamaguchi, Tokuyama, Kokura); Hakata (cuối tuyến) 2.
  - **Hikari:** Himeji 3 (0–4), Nishi-Akashi 3 (0–4), Aioi 5 (0–10) là ga chờ vượt; Shin-Kobe 1.
  - **Kodama (rất dài):** Nishi-Akashi 3 (0–7), Himeji 3 (1–6), Aioi 4 (0–7), **Okayama 7 (1–15)**, Shin-Kurashiki 3 (1–4), Fukuyama 3 (1–5), **Mihara 7,5 (3–12)**, Higashi-Hiroshima 4 (0–7), **Shin-Iwakuni 7**, Shin-Yamaguchi 3, Asa 4, **Shin-Shimonoseki 4 (0–11)**; Hiroshima, Kokura, Tokuyama 1 (có lúc đến 9).
  - **Sakura/Mizuho (Sanyo–Kyushu):** 1 phút ở mọi ga, riêng Hakata 2 phút (nguồn không nêu lý do) **[?]**.
- **Kyushu [D]:** Sakura/Mizuho 1 phút ở **mọi ga** (Shin-Tosu, Kurume, Kumamoto, Shin-Yatsushiro, Shin-Minamata, Izumi, Sendai); không có chờ vượt, khớp việc **tuyến Kyushu không có ga tránh** **[N]**.
- **Tohoku (xác nhận ga có đường thông qua nhờ thời gian dừng dài):** Utsunomiya 3 (tối đa 8), Nasushiobara 3, Ichinoseki 3, Kitakami 3, Fukushima 4 và Morioka 5 (ga tách ghép). Sendai 2, Koriyama 1 (tối đa 7). Tàu tách ghép dừng lâu nhất (Morioka tối đa 8, Fukushima tối đa 11 khi có xử lý trễ).
- **Hokuriku:** Nagano 2 (Kagayaki/Hakutaka, tối đa 10), Kanazawa 2, các ga trung gian 0–1.
- **Joetsu:** chủ yếu 0–1 phút; Takasaki, Omiya có lúc đến 3 phút (Toki tối đa 6 ở Jomo-Kogen).

### 5.4 Ga Tohoku: chỗ vượt
Các ga Utsunomiya, Nasushiobara, Ichinoseki, Kitakami được dùng làm điểm chờ vượt, khớp với bảng cấu trúc ga ở tài liệu 02 mục 5 (có đường thông qua), nên bảng đó được **củng cố [D]** cho bốn ga này.

## 6. Sân ga sử dụng **[D]**
- **Tokyo (Tokaido):** sân 14–19. Nozomi thường sân 18 hoặc 19, Hikari 14/15/17, Kodama 14/17. Tàu Shinagawa luôn sân 23 hoặc 24, Shin-Yokohama sân 3 hoặc 4.
- **Tokyo (Tohoku):** sân 20–22 (Hayabusa/Nasuno sân 20, một chuyến Yamabiko+Tsubasa sân 22).
- **Shin-Osaka:** sân 21, 22 (Nozomi tiếp tục đi Sanyo), 24, 25 (tàu kết thúc hoặc quay đầu).
- Nagoya sân 16/17, Kyoto sân 13/14, Hiroshima 11/12, Hakata 13/16, Okayama 21/22, Sendai 11/12/14, Morioka 13/14, Omiya 17.
- Ga trung gian dùng sân cố định (vd. Odawara 13, Mishima 5, Shin-Fuji 2, Shizuoka 6, Hamamatsu 6, Gifu-Hashima 2, Maibara 11). Ý nghĩa: tàu chờ vượt luôn vào đúng đường ngoài, tàu nhanh qua đường giữa.

## 7. Tàu ghép và tách (Tohoku) **[D]**
- **Hayabusa 3003B + Komachi 3003M:** ghép giữa Tokyo và Morioka. Tách ở Morioka (sân 14): tàu đến **09:44**, **Komachi** rời **09:46** (2 phút), **Hayabusa** rời **09:48** (4 phút). Tuyến lên: ghép ở sân 11.
- **Yamabiko 127B + Tsubasa 127M:** ghép Tokyo–Fukushima. Tách ở Fukushima (sân 14): tàu đến 09:45, rời 09:49–09:50 (4–5 phút). Đoạn sau tách: Sendai (Yamabiko) 10:11; Yamagata (Tsubasa) 11:05.
- Số lượng: 39/113 dòng ngày thường là tàu ghép (khoảng một phần ba) **[D]**.
- Hạ tầng: Fukushima và Morioka là 2 ga duy nhất ở Nhật có thể xem tách/ghép hằng ngày **[N]**. Trước 2025 từng xảy ra 2 sự cố tàu ghép **bị tách khỏi nhau khi đang chạy** (9/2024 và 3/2025, đoạn Ueno–Omiya), phải dừng khẩn cấp; JR East ngừng ghép tạm thời rồi cho chạy lại từ 14/3/2025 với biện pháp cố định cơ khí khi ghép; báo cáo 12/2025 nêu nguyên nhân là mảnh kim loại chạm công tắc và lỗi đầu ra bộ điều khiển **[N]**. Đây là chất liệu cho phần sự cố (09).
- Quy tắc xử lý trễ ở nơi ghép: xem mục 10.

## 8. Quay đầu và chuẩn bị tàu **[N]**
- Số chuyến đến Tokyo vào giờ cao điểm: khoảng 12 chuyến/giờ; tàu quay đầu nhanh nhất khoảng **15 phút** (nguồn tạp chí, không chính thức).
- Dọn vệ sinh: đội 56 người, 7 nhóm, mỗi nhóm dọn khoảng 15 chuyến/ngày; hoàn tất trong **dưới 10 phút** (nguồn trafficnews).
- Cửa lên tàu mở khoảng 5 phút trước giờ khởi hành (ước tính cho hành khách, không phải quy định) **[?]**.
- Tomii (2010): ở ga cuối cần giữ đủ thời gian quay đầu vì phải dọn vệ sinh và thay đồ vải, nên khó hấp thụ trễ ở đó.
- **Số "7 phút" đã được xác minh một phần [N]:** tại Tokyo (tuyến Tohoku/Joetsu, do JR East Technohart TESSEI) từ lúc tàu đến đến lúc tàu quay đầu rời ga thường là **12 phút**; trong đó dọn vệ sinh chỉ **7 phút**, mỗi tàu do **một đội 23 người**, từ ga Tokyo của Tohoku/Joetsu khai trương 1991. Từ 4 sân ga, tàu có thể khởi hành cách nhau tối thiểu **3 phút**. Một nguồn khác (karapaia) ghi 16 phút từ lúc tàu vào ga đến lúc tàu kế tiếp vào cùng sân; hai số khác nhau vì cách tính (tàu đến → tàu đi, hay tàu vào sân → tàu vào sân kế). Bên Tokaido (JR Central, đội 56 người chia 7 nhóm) báo trước là **dưới 10 phút** dọn và quay đầu tối thiểu ~**15 phút**.
- **Đo từ dữ liệu: thời gian chiếm sân khi quay đầu [D].** Tính từ lúc tàu kết thúc đến sân X đến lúc chuyến kế tiếp rời **cùng sân X** (cận dưới của thời gian quay đầu; lịch vận dụng đoàn tàu không công khai nên không biết đoàn nào nối chuyến nào):

| Ga / sân | Số cặp | Tối thiểu | Trung vị |
|---|---|---|---|
| **Tokyo, các sân Tokaido 14–19** | 113 | **15 phút** (mọi sân) | 15 |
| **Tokyo, các sân Tohoku/Joetsu/Hokuriku 20–23** | 143 | **11–12 phút** | 12 |
| Shin-Osaka (sân 23–25, chuyến kết thúc của JR East ghép với chuyến xuất phát của JR West) | 9 | 24 phút | 54 (mẫu nhỏ) |
| Hakata (sân 13) | 8 | 27 phút | 27 (mẫu nhỏ) |
| Morioka (sân 12–13) | 11 | 46 phút | 66 (mẫu nhỏ) |

  Hai con số tại Tokyo khớp nguồn bài báo: **15 phút (Tokaido)** và **12 phút (Tohoku/Joetsu)**. Số liệu Shin-Osaka, Hakata, Morioka chỉ là cận dưới trên mẫu nhỏ (chuyến định kỳ ngày thường của JR East ghép với chuyến JR West ngày 20/10), nên chỉ dùng tham khảo. Thời gian quay đầu công bố chính thức của JR West/JR Kyushu không tìm được.

## 9. Đúng giờ **[N]**
- **Chuỗi trễ trung bình (tính cả thiên tai) [N]:** 1997–2012 ~0,5 phút; FY2008 0,6; FY2015 12 giây; FY2016 24 giây; FY2019 0,2 phút; FY2023 1,6; FY2024 1,4 (xem tài liệu 05 §5.4). Các số 0,2 và 0,6 không mâu thuẫn, chỉ là hai năm khác nhau.
- Quy tắc: tàu chậm **hơn 1 phút** so với lịch mới bị coi là "trễ".
- Trễ trung bình Tokaido: **0,6 phút** (FY2008) và khoảng 0,6 phút/chuyến suốt 1987–2013 (so với 3,1 phút thời JNR 1972–1986); **1,6 phút** FY2023 và **1,4 phút** FY2024 (tính cả thiên tai).
- Ngày tuyết: kỷ lục xấu 1976 (635 chuyến hủy, trễ TB 20,1 phút); sau đầu tư phun nước và vòi áp lực, 15 năm không hủy chuyến vì tuyết, trễ TB ngày tuyết 1,4–1,7 phút (FY2006–07).
- Tham chiếu cho game: ngày bình thường trễ TB dưới 1 phút là mức tốt.

## 10. Nguyên tắc điều chỉnh khi trễ (Tomii 2010) **[N]**
1. **Không bao giờ hủy một phần chuyến** (hủy giữa đường): chạy đường dài, có đặt chỗ.
2. Khó hấp thụ trễ ở ga cuối vì phải dọn vệ sinh.
3. Điều chỉnh tinh vi theo đoàn tàu và tổ lái: ví dụ đoàn tàu của chuyến trễ chạy rỗng về depot, lấy đoàn khác ra chạy chuyến sau; vì không có dự phòng nên kéo theo hàng loạt thay đổi.
4. **Tàu ghép Yamagata/Akita:** nếu trễ ít hơn ngưỡng x thì Tohoku chờ để ghép; từ x đến y thì bỏ ghép, mini-Shinkansen chạy riêng; hơn y thì ghép vào chuyến kế tiếp. Giá trị x, y không công khai.
5. Tàu tuyến thường có thể làm trễ Shinkansen (nối chuyến, chờ tối đa theo quy định); trễ ở Yamagata/Akita lan sang Tohoku, Joetsu, Hokuriku vì dùng chung ray ở một số đoạn.
6. Điều độ có thể thao tác tay khi hệ thống tự động (PRC) hỏng; tập luyện thường xuyên.
7. Triết lý "đơn giản hết mức": ít dùng cách bố trí đường phức tạp, tài xế Shinkansen có giấy phép riêng, bố cục ghế các dòng tàu giống nhau để thay tàu không cần thông báo.
8. Hạn chế thiên tai: tàu giảm tốc khi tuyết để tuyết không bám thân xe.

## 11. Ý nghĩa cho game (ghi chú ban đầu)
- Lưới 3 phút của Tokaido là **cơ chế lõi**: mỗi giờ có 20 "ô" khởi hành; tàu nhanh phải vào đúng ô, tàu chậm dành ô cho tàu nhanh vượt. Mỗi tàu chậm chờ 3–6 phút ở ga có đường thông qua; nếu trễ vài phút thì mất ô và gây dây chuyền.
- Hai nhịp độ khác nhau: Tokaido dày, đều, lưới 3 phút, ít tàu ghép; Tohoku ít chuyến hơn (lưới 4 phút), tàu ghép/tách ở Morioka/Fukushima, dài, chịu thời tiết.
- Màn điều độ cốt lõi: khi một chuyến trễ, người chơi chọn (a) chờ, (b) cho tàu nhanh vượt ở ga có đường thông qua, (c) đổi đoàn tàu hoặc tổ lái, (d) bỏ ghép (Tohoku). Không có lựa chọn "hủy giữa đường".
- Có thể dựng **bộ lịch chuẩn** ngay từ dữ liệu: các chuyến định kỳ theo mẫu phút ở mục 3.1, thời gian chạy ở mục 4, thời gian dừng ở mục 5.

## 12. Lỗ hổng còn lại **[?]**
**Đã giải quyết trong lần hoàn thiện này:** giờ qua ga giữa và chiều lên/xuống (JR East 570 chuyến + JR West 268 chuyến ngày thật); quy luật số hiệu; ý nghĩa ◆ và ngày chạy từng chuyến; "7 phút" quay đầu (xác minh được ở Tokyo); headway (3 phút là khoảng cách tối thiểu thực tế: lặp lại 24–90 lần mỗi chiều ở Shin-Osaka; đã đính chính con số "20 chuyến/giờ" là hai chiều cộng lại).

**Còn lại (đều mức thấp, không chặn mục 05):**
- **Headway ghi trực tiếp trong tài liệu kỹ thuật:** vẫn là suy ra từ dữ liệu; sẽ đối chiếu với nguyên lý ATC ở mục 06.
- **Kyushu chiều xuống đầy đủ (Tsubame xuống) và từng ga của Kyushu/Kamome ngày nghỉ:** chưa có bảng riêng; Tsubame xuống có thể suy ra từ chiều lên (đối xứng, đã có thời gian chạy từng ga). Bảng Kyushu chiều xuống (PDF) chưa tải vì không cần thiết.
- **Thời gian quay đầu công bố chính thức tại Shin-Osaka, Hakata, Morioka:** không có; chỉ có cận dưới đo từ dữ liệu (mục 8).
- **Cờ ◆ cụ thể ngày nào chạy:** đã đọc được từ lịch ngày chạy từng chuyến (`dow_pattern_MonSun`) cho các chuyến định kỳ; các chuyến ◆ không lấy trang chi tiết (trừ Shin-Aomori).
- Bài Tomii viết 2010; một số số liệu (6 đường/14 chuyến ở Tokyo) đã cũ, đã thay bằng số liệu 2026.

## Nguồn
- JR East – Lịch tàu số ga Tokyo, tháng 10/2026: [Tokaido/Sanyo](https://timetables.jreast.co.jp/2610/timetable/tt1039/1039010.html), [Tohoku/Hokkaido](https://timetables.jreast.co.jp/2610/timetable/tt1039/1039020.html), [Joetsu](https://timetables.jreast.co.jp/2610/timetable/tt1039/1039050.html), [Hokuriku](https://timetables.jreast.co.jp/2610/timetable/tt1039/1039060.html), ngày nghỉ [Tokaido](https://timetables.jreast.co.jp/2610/timetable/tt1039/1039011.html) và [Tohoku](https://timetables.jreast.co.jp/2610/timetable/tt1039/1039021.html), cùng các trang chi tiết chuyến và trang ga Shinagawa/Omiya (xem `data/README.md`)
- JR West – [JRおでかけネット, ga Shin-Osaka](https://timetable.jr-odekake.net/station-timetable/2815002001) (xuống) và [chiều lên](https://timetable.jr-odekake.net/station-timetable/2815002002), ngày 20/10/2026, cùng các trang chi tiết chuyến
- Quy luật số hiệu: [tabiris – trainnumber](https://shinkansen.tabiris.com/trainnumber.html); thời gian dọn vệ sinh/quay đầu: [trafficnews](https://trafficnews.jp/post/56214), [moneypost](https://www.moneypost.jp/968459)
- Tomii N., *How the punctuality of the Shinkansen has been achieved*, Computers in Railways XII, 2010 – [PDF](https://www.witpress.com/Secure/elibrary/papers/CR10/CR10011FU1.pdf)
- Wikipedia: [Tokaido Shinkansen](https://en.wikipedia.org/wiki/Tokaido_Shinkansen); tiếng Nhật [のぞみ](https://ja.wikipedia.org/wiki/のぞみ_(列車)), [ひかり](https://ja.wikipedia.org/wiki/ひかり_(列車)), [こだま](https://ja.wikipedia.org/wiki/こだま_(列車)), [東海道新幹線](https://ja.wikipedia.org/wiki/東海道新幹線), [山陽新幹線](https://ja.wikipedia.org/wiki/山陽新幹線), [九州新幹線](https://ja.wikipedia.org/wiki/九州新幹線), [北陸新幹線](https://ja.wikipedia.org/wiki/北陸新幹線), [北海道新幹線](https://ja.wikipedia.org/wiki/北海道新幹線)
- [trainstobeyond – Tokaido timetable](https://trainstobeyond.com/tokaido-shinkansen-timetable/) (đối chiếu giờ :03/:33, :27)
- Trafficnews: [のぞみ 12本化](https://trafficnews.jp/post/85456), [品川折り返し・清掃](https://trafficnews.jp/post/56214); [ITmedia – 折り返し](https://www.itmedia.co.jp/business/articles/2405/24/news041_2.html)
- JR East – các thông báo sự cố tàu ghép: [2025/12/02](https://www.jreast.co.jp/press/2025/20251202_ho01.pdf), [2024/09/19](https://www.jreast.co.jp/info/2024/20240919_ho02.pdf); [Trafficnews – tách ghép tái khởi động](https://trafficnews.jp/post/528579); [tohokukanko – tách ghép Morioka](https://www.tohokukanko.jp/attractions/detail_1010307.html)
- JR Central – [Annual report 2025](https://global.jr-central.co.jp/en/company/ir/annualreport/_pdf/annualreport2025-13.pdf); Nagoya University – [JR Central presentation](https://ercscd.env.nagoya-u.ac.jp/jpn/announcements/TOtake_JRC.pdf)
