# 02 – Hạ tầng

Chú thích độ tin cậy: **[N]** có nguồn tra cứu (link cuối file) · **[K]** kiến thức nền của Claude, chưa kiểm chứng · **[?]** chưa rõ.
Phiên bản 2 (2026-10-20): viết lại sau khi tra Wikipedia tiếng Nhật của từng tuyến. Các phát hiện từ phiên bản 1 đã được sửa (xem mục 9).

## 1. Khái niệm quan trọng: 営業キロ (km kinh doanh) khác 実キロ (km thực) **[N]**
Hai con số khác nhau cho cùng một tuyến. **営業キロ** dùng để tính giá vé, thường được căn theo tuyến thường song song. **実キロ** là chiều dài đường ray thật. Trong game, hãy dùng **実キロ** cho mô phỏng chạy tàu (thời gian, phanh) và **営業キロ** nếu muốn tính giá vé.

| Tuyến | 営業キロ | 実キロ |
|---|---|---|
| Tokaido (Tokyo – Shin-Osaka) | 552.6 | 515.4 |
| Sanyo (Shin-Osaka – Hakata) | 644.0 | 553.7 |
| Tohoku (Tokyo – Shin-Aomori) | 713.7 | 674.9 |
| Joetsu (Omiya – Niigata) | 303.6 | 269.5 |
| Hokuriku (Takasaki – Tsuruga) | 470.6 | 470.6 (theo infobox; **[?]** có thể khác) |
| Kyushu (Hakata – Kagoshima-Chuo) | 288.9 | 256.8 |
| Nishi-Kyushu (Takeo-Onsen – Nagasaki) | 69.6 | 66.0 |
| Hokkaido (Shin-Aomori – Shin-Hakodate-Hokuto) | 148.8 | 148.8 |

Ghi chú: Tokyo – Niigata (qua Omiya) là 333.9 km kinh doanh, 300.8 km thực **[N]**.

## 2. Khổ ray, độ dốc, bán kính cong **[N]**

| Tuyến | Độ dốc tối đa | Bán kính cong tối thiểu | Ghi chú |
|---|---|---|---|
| Tokaido | 20‰ | 2.500 m (Tokyo, Shizuoka đông, Aichi, Kyoto, Osaka); 3.000 m (Kanagawa, Shizuoka tây, Gifu, Shiga) | |
| Sanyo | 18‰ (cơ bản 15‰) | cơ bản 4.000 m; tối thiểu 1.000 m | 142 hầm, chiếm 50,8% chiều dài (56,4% phía tây Okayama); hầm nổi tiếng: Rokko và Kobe |
| Kyushu | 35‰ (cơ bản 15‰) | cơ bản 4.000 m; tối thiểu 500 m | dốc nhất trong các tuyến tra được |
| Tohoku | 25‰ ở đoạn ngầm gần Ueno (chỉ nêu độ dốc này) | **4.000 m** (infobox); đoạn Omiya về Ueno có đường cong 600–2.000 m liên tiếp, là nguyên nhân giới hạn 110/130 km/h | hầm dài: Iwate-Ichinohe 25,8 km, Hakkoda 26,5 km (Wikipedia tiếng Anh); hầm ngầm đô thị: Ueno số 2 (1.495 m), Ueno số 1 (1.133 m), Akabanedai (585 m) |
| Hokuriku | **30‰** (3,0%) | **4.000 m** | |
| Hokkaido | **20,8‰** (kế hoạch thi công MLIT) | **4.000 m** (cơ bản) | [N] |
| Joetsu | **[?]** không tìm được nguồn | **[?]** (là tuyến do JNR xây, không thuộc nhóm "tuyến chỉnh bị") | hầm Nakayama giới hạn 160 km/h vì đường cong |

- **Chuẩn chung cho tuyến "full-spec" [N]** (Wikipedia tiếng Nhật, bài Shinkansen): bán kính cong cơ bản **4.000 m**; độ dốc cơ bản **15‰**, cho phép 18‰ với đoạn dài tối đa 2,5 km và 20‰ với đoạn dài tối đa 2,0 km. Đoạn Tokyo–Omiya (đô thị): Tohoku ghi đường cong 400/600–2.000 m (hai nguồn khác nhau: 400 m và 600 m) và độ dốc 25‰ ở đoạn ngầm gần Ueno. Hokuriku có đoạn 30‰ liên tục giữa Annaka-Haruna và Karuizawa.

- Khổ 1435 mm cho mọi tuyến. Seikan có đoạn **ray 3 khổ** (1435 + 1067) chung với tàu hàng **[N]**.
- Mini-Shinkansen (Yamagata, Akita): đường thường nới khổ, có giao cắt đồng mức và không có hàng rào, không áp dụng luật Shinkansen riêng **[N]**.

## 3. Điện: điện áp và tần số **[N]**

Tất cả tuyến Shinkansen dùng **25 kV AC** (mini-Shinkansen 20 kV).

| Tuyến | Tần số |
|---|---|
| Tokaido | **60 Hz** toàn tuyến (nguồn ghi rõ không có đoạn 50 Hz) |
| Sanyo, Kyushu, Nishi-Kyushu | **60 Hz** |
| Tohoku, Joetsu, Hokkaido | **50 Hz** toàn tuyến |
| Hokuriku | **xen kẽ bốn đoạn:** 50 Hz (Takasaki – Shin-Karuizawa) → 60 Hz (Shin-Karuizawa – Shin-Takada) → 50 Hz (Shin-Takada – Shin-Itoigawa) → 60 Hz (Shin-Itoigawa – Tsuruga) |

- Các điểm chuyển đổi trên Hokuriku là các **đoạn trung hòa (SP)** tại Shin-Karuizawa, Shin-Takada, Shin-Itoigawa. E7/W7 đi qua **không cắt lực kéo** **[N]**. Đoạn 50 Hz giữa Shin-Takada và Shin-Itoigawa có thiết bị ATC và điện hỗ trợ cho cả hai tần số để dự phòng khi trạm biến áp lân cận hỏng.
- **Mâu thuẫn nhỏ về ranh giới Hokuriku [?]:** Wikipedia tiếng Anh viết "50 Hz Tokyo–Karuizawa, 60 Hz Karuizawa–Itoigawa, 50 Hz Itoigawa–Kurobe-Unazuki, 60 Hz đến Tsuruga"; tiếng Nhật ghi các điểm đổi là Shin-Karuizawa, Shin-Takada, Shin-Itoigawa (đoạn 50 Hz thứ hai là Shin-Takada–Shin-Itoigawa). Cả hai đều là 4 đoạn xen kẽ; ta ưu tiên bản tiếng Nhật (chi tiết hơn). E7/W7 dùng bộ biến đổi trên tàu và tự đổi tần số.
- **Tokaido 60 Hz toàn tuyến [N]:** ranh giới lưới điện 50/60 Hz của Nhật ở **sông Fuji (Fujikawa)**; phía đông Fujikawa lưới là 50 Hz, nên JR Central lấy điện 50 Hz từ lưới rồi **đổi sang 60 Hz** bằng các **trạm biến đổi tần số (FC)**, gồm kiểu quay và kiểu tĩnh (static), đặt ở vùng 50 Hz như **Tsunashima (Kanagawa)** và **Nishi-Sagami**. Kế hoạch thay hết sang kiểu tĩnh: nguồn 2021 ghi Nishi-Sagami vận hành từ cuối FY2027; nguồn 2026 ghi toàn bộ đến cuối FY2037 (hai nguồn khác phạm vi). Cần cho game: nếu một trạm FC hỏng thì cả đoạn phía đông Fujikawa mất điện.

## 4. Tốc độ tối đa theo tuyến/đoạn **[N]**

| Tuyến / đoạn | Tốc độ tối đa (km/h) |
|---|---|
| Tokaido | 285 (từ 2023); tốc độ thương mại trung bình đầu–cuối 219 |
| Sanyo | 300 (N700, N700S, 500); 285 (700); tốc độ thương mại trung bình Shin-Osaka – Hakata 235 |
| Tohoku: Tokyo – Ueno | 110 |
| Tohoku: Ueno – Omiya | 130 |
| Tohoku: Omiya – Utsunomiya | 275 |
| Tohoku: Utsunomiya – Morioka | **320** |
| Tohoku: Morioka – Shin-Aomori | 260 |
| Joetsu (Omiya – Niigata) | 275 từ 18/3/2023 (trước đó 240); hầm Nakayama bị giới hạn 160 do đường cong |
| Hokuriku | 260 |
| Kyushu: Hakata – Hakata-Bunso | 120 |
| Kyushu: Hakata-Bunso – Kagoshima-Chuo | 260 |
| Nishi-Kyushu | 260 |
| Hokkaido (ngoài Seikan) | 260 |
| Seikan (đoạn dùng chung ~82 km) | 160 (từ 3/2019; 140 lúc mở 2016) |

Ghi chú: Tokyo – Ueno – Omiya là đoạn tuyến đô thị đông dân, nên tốc độ thấp.

## 5. Ga, đường tránh (ga vượt) và số đường **[N]**

### Tokaido (17 ga, km thực từ Tokyo xem tài liệu 04)
| Cấu trúc ga | Ga |
|---|---|
| Dừng đủ 4 đường (không đường thông qua riêng) | Shinagawa, Shin-Yokohama, Nagoya, Kyoto |
| 2 sân 2 đường + đường thông qua | Odawara, Shin-Fuji, Shizuoka, Kakegawa, Hamamatsu, Mikawa-Anjo |
| 2 sân 3 đường + đường thông qua | Maibara, Toyohashi |
| 2 sân 4 đường + đường thông qua | Gifu-Hashima |
| 1 sân 2 đường + đường thông qua | Mishima |
| 2 sân 2 đường **không** có đường thông qua | Atami (tàu thông qua chạy trên đường chính) |
| Tokyo | 3 sân 6 đường |
| Shin-Osaka | 5 sân 8 đường |

### Sanyo (19 ga)
- **Có đường thông qua** (2 sân 2–3 đường): Nishi-Akashi, Himeji (3 đường), Aioi, Shin-Kurashiki, Fukuyama, Shin-Onomichi, Mihara, Higashi-Hiroshima, Shin-Iwakuni (3), Tokuyama, Shin-Yamaguchi, Ato, Shin-Shimonoseki (3).
- **Ga lớn dừng đủ 4 đường:** Okayama, Hiroshima, Kokura. **Shin-Kobe: 2 sân 2 đường, không có đường vượt.**
- Shin-Osaka 5 sân 8 đường; Hakata 3 sân 6 đường.
- Trạm tín hiệu Kurate (鞍手信号場) ở km thực 520.3 từ Shin-Osaka.

### Kyushu
- **Không có ga nào có đường thông qua** (nguồn nói rõ). Nghĩa là tàu không thể vượt nhau tại ga trên tuyến này; lịch phải xếp để tàu cùng tốc độ **[N]**.

### Joetsu
- **Mọi ga trung gian đều có đường thông qua**; hai đầu (Omiya, Niigata) thì không **[N]**.
- Chi nhánh Gala-Yuzawa (1,8 km, chỉ mùa đông, ga tạm) **[N]**.

### Tohoku
- Danh sách km kinh doanh các ga: Tokyo 0 · Ueno 3.6 · Omiya 30.3 · (Washimiya SS 50.9) · Oyama 80.6 · Utsunomiya 109.5 · Nasushiobara 157.8 · Shin-Shirakawa 185.4 · Koriyama 226.7 · Fukushima 272.8 · Shiroishi-Zao 306.8 · Sendai 351.8 · Furukawa 395.0 · Kurikoma-Kogen 416.2 · Ichinoseki 445.1 · Mizusawa-Esashi 470.1 · Kitakami 487.5 · Shin-Hanamaki 500.0 · Morioka 535.3 · Iwate-Numakunai 566.4 · Ninohe 601.0 · Hachinohe 631.9 · Shichinohe-Towada 668.0 · Shin-Aomori 713.7 (đây là 営業キロ, dùng cho vé).
- Kurikoma-Kogen, Mizusawa-Esashi, Shin-Hanamaki là **ga "gậy" (棒線駅), không có đường tránh** **[N]**.
- **Cấu trúc ga (bảng "配線分類" và mục "各駅の構造" của [Wikipedia tiếng Nhật 東北新幹線](https://ja.wikipedia.org/wiki/東北新幹線), đối chiếu lại 21/10/2026, khớp bảng dưới; vẫn nên so với sơ đồ [haisenryakuzu.net](https://www.haisenryakuzu.net/documents/jr/shinkansen/tohoku)) [N]:**

| Ga | Cấu trúc | Đường thông qua |
|---|---|---|
| Tokyo | 2 sân 4 đường (ga cuối) | không |
| Ueno | 2 sân 4 đường | không |
| Omiya | 3 sân 6 đường | không |
| Oyama | 2 sân 3 đường | có |
| Utsunomiya | 2 sân 2 đường | có |
| Nasushiobara | 2 sân 3 đường | có |
| Shin-Shirakawa | 2 sân 2 đường | có |
| Koriyama | 2 sân 3 đường | có |
| Fukushima | 2 sân 4 đường | có |
| Shiroishi-Zao | 2 sân 3 đường | có |
| Sendai | 2 sân 4 đường | không |
| Furukawa | 2 sân 2 đường | có |
| Ichinoseki | 2 sân 2 đường | có |
| Kitakami | 2 sân 3 đường | có |
| Morioka | 2 sân 4 đường | không |
| Iwate-Numakunai, Ninohe, Shichinohe-Towada | 2 sân 2 đường | không |
| Hachinohe | 2 sân 4 đường | không |
| Shin-Aomori | 2 sân 4 đường | không |

  Số sân thực tế khớp nguồn Tomii (Tokyo Tohoku 4 đường) và số hiệu sân quan sát trong lịch (Sendai 11/12/14, Morioka 13/14, Omiya 17).

### Hokuriku
- Có đường tránh (không kề sân ga): Kumagaya, Honjo-Waseda, Takasaki, Kagaonsen, Echizen-Takefu. Fukui là ga đảo duy nhất (1 sân 2 đường) trong mạng Shinkansen. Đoạn Annaka-Haruna – Ueda không có đường tránh ở ga trung gian **[N]**.
- Km kinh doanh từ Takasaki: Annaka-Haruna 18.5 · Karuizawa 41.8 · Sakudaira 59.4 · Ueda 84.2 · Nagano 117.4 · Iiyama 147.3 · Joetsu-Myoko 176.9 · Itoigawa 213.9 · Kurobe-Unazuki 253.1 · Shin-Takaoka 305.8 · Kanazawa 345.5 · Komatsu 372.6 · Kagaonsen 387.1 · Awara-Onsen 403.4 · Echizen-Takefu 440.4 · Tsuruga 470.6.

### Hokkaido
- 4 ga: Shin-Aomori, Okutsugaru-Imabetsu, Kikonai, Shin-Hakodate-Hokuto, cộng 2 trạm tín hiệu **[N]**.

## 6. Hầm Seikan và tàu hàng **[N]**

- Đoạn dùng chung dài khoảng 82 km (Shin-Nakoguni – Kikonai), ray 3 khổ, điện 25 kV 50 Hz.
- Tốc độ Shinkansen 160 km/h (3/2019).
- **Quy tắc vận hành:** vào các ngày lễ lớn (Golden Week, Obon, Tết) dùng **phân khung giờ** (時間帯区分方式): có khung giờ không có tàu hàng để Shinkansen chạy 260 km/h. Hệ thống phát hiện tàu hàng vào nhầm đoạn sẽ tự đưa Shinkansen xuống tốc độ thấp. **Chuyến cuối Chủ nhật bị hủy** để bảo trì hầm.
- Tàu hàng dùng đầu máy EH800 hai điện áp.

## 7. Depot (cơ sở bảo dưỡng và đỗ tàu) **[N]**

| Tuyến | Depot |
|---|---|
| Tokaido | Oi (giữa Tokyo và Shinagawa), Mishima, Hamamatsu (xưởng), Nagoya, Torikai (giữa Kyoto và Shin-Osaka) |
| Sanyo | Hakata Sogo Sharyosho (chỉ nêu một) |
| Tohoku | Tokyo Shinkansen Sharyo Center (Oku), Morioka Center (Mitake); đường lưu xe ở Ueno, Oyama, Nasushiobara, Sendai, Shin-Aomori |
| Joetsu | Niigata Shinkansen Sharyo Center |
| Hokuriku | Nagano Shinkansen Sharyo Center, Hakusan Sogo Sharyosho, chi nhánh Tsuruga |
| Kyushu | Kumamoto Sogo Sharyosho; đường lưu xe tại Sendai (Kagoshima) |
| Nishi-Kyushu | Omura (chi nhánh của Kumamoto Sogo Sharyosho) |
| Hokkaido | Hakodate Shinkansen Sogo Sharyosho |

## 8. Trung tâm điều hành và hệ thống **[N]**

*(Bản đầy đủ hơn, gồm CYGNUS/Hokkaido và trung tâm Kanazawa, ở tài liệu 05 §1; danh sách depot đầy đủ ở tài liệu 08 §3.)*

| Phạm vi | Hệ thống | Trung tâm |
|---|---|---|
| Tokaido + Sanyo | COMTRAC, tín hiệu ATC-NS, đóng khối trong cabin | Tokyo Shinkansen Sogo Shireisho (trung tâm chính); trung tâm dự phòng ở Osaka |
| Tohoku, Joetsu, Hokuriku (JR East) | COSMOS | Shinkansen Sogo Shireisho (JR East) |
| Kyushu (Hakata-Bunso – Kagoshima-Chuo) | SIRIUS | Hakata Sogo Shirei Center |
| Kyushu đoạn Hakata – Hakata-Bunso | COMTRAC (do Tokyo điều) | Tokyo Shirei-sho |

- **Tín hiệu:** Tokaido/Sanyo dùng **ATC-NS** (tín hiệu trong cabin, đưa vào Tokaido từ 3/2006, tạo mẫu giảm tốc trên tàu theo thời gian thực); JR East dùng **DS-ATC** (chọn mẫu giảm tốc đã tính sẵn; đưa vào Tohoku từ 2002 đến 2007). Chi tiết ở tài liệu 06 **[N]**.
- **Hệ thống cảnh báo động đất [N]:** Tokaido có hệ **"Terrace"** gồm máy đo ngoài khơi và 21 máy đo xa cách tuyến hơn 50 km (phát hiện sóng P), máy đo dọc tuyến và thông tin ngoài; khi có cảnh báo, **trạm biến áp tự động cắt điện cấp cho tàu** để tàu giảm tốc trước khi sóng S tới. Mất điện khi có động đất là hành vi bình thường. JR East dùng hệ UrEDAS và, từ 11/2017, dùng dữ liệu máy đo đáy biển S-net (vùng Thái Bình Dương phía đông) để phát hiện sớm hơn. Chi tiết xử lý sự cố ở tài liệu 09.

Chi tiết cách vận hành các hệ thống điều hành sẽ ở tài liệu 05 và 06.

## 9. Sửa lỗi so với phiên bản 1
- Tần số Hokuriku: phiên bản 1 ghi "đông 50 Hz, tây 60 Hz" là quá đơn giản; thực tế là **bốn đoạn xen kẽ**.
- Mâu thuẫn chiều dài tuyến (515.4/552.6, 674.9/713.7…) đã giải quyết: đó là **実キロ và 営業キロ**.
- Chuyến Tokaido 60 Hz toàn tuyến đã xác nhận ("không có đoạn 50 Hz"), nhưng cách cấp điện ở khu Tokyo vẫn **[?]**.

## 10. Lỗ hổng còn lại **[?]**
- **Bán kính cong và độ dốc của Joetsu:** đã thử lần lượt Wikipedia tiếng Nhật và Anh, MLIT, JICA, trang tổng hợp (một trang xếp hạng độ dốc chặn truy cập nên bỏ qua) và hai lượt tìm kiếm riêng; **không có nguồn công khai**. Dùng **chuẩn chung của tuyến full-spec** (cơ bản 4.000 m và 15‰, tối đa 18–20‰) làm giá trị thay thế **[I]**, vì Joetsu cùng thế hệ và tiêu chuẩn thiết kế với Tohoku (4.000 m).
- Độ dốc tối đa Tohoku ngoài 25‰ gần Ueno: không tìm được; dùng chuẩn chung.
- Số đường các ga Joetsu và Hokuriku; ghép chính xác tên ga ↔ cấu trúc ga Tohoku (cần sơ đồ trực tiếp).
- Vị trí chính xác các trạm FC và trạm biến áp khác; danh sách hầm/cầu đầy đủ.
- Giới hạn tốc độ chi tiết theo từng đoạn của Sanyo, Joetsu và Hokuriku (chỉ có số tối đa); giới hạn tốc độ qua đường cong/ga.

## Nguồn
- Wikipedia tiếng Nhật: [東海道新幹線](https://ja.wikipedia.org/wiki/東海道新幹線), [山陽新幹線](https://ja.wikipedia.org/wiki/山陽新幹線), [東北新幹線](https://ja.wikipedia.org/wiki/東北新幹線), [上越新幹線](https://ja.wikipedia.org/wiki/上越新幹線), [北陸新幹線](https://ja.wikipedia.org/wiki/北陸新幹線), [九州新幹線](https://ja.wikipedia.org/wiki/九州新幹線), [西九州新幹線](https://ja.wikipedia.org/wiki/西九州新幹線), [北海道新幹線](https://ja.wikipedia.org/wiki/北海道新幹線)
- Wikipedia tiếng Anh: [Seikan Tunnel](https://en.wikipedia.org/wiki/Seikan_Tunnel), [Hokkaido Shinkansen](https://en.wikipedia.org/wiki/Hokkaido_Shinkansen), [Tokaido Shinkansen](https://en.wikipedia.org/wiki/Tokaido_Shinkansen)
- [Tetsudo.com – giải thích 営業キロ/実キロ](https://www.tetsudo.com/column/615/)
- Wikipedia tiếng Nhật: [新幹線](https://ja.wikipedia.org/wiki/新幹線) (chuẩn chung); MLIT – [kế hoạch thi công Hokkaido](https://www.mlit.go.jp/common/001129141.pdf)
- Wikipedia tiếng Anh: [Tohoku Shinkansen](https://en.wikipedia.org/wiki/Tohoku_Shinkansen), [Hokuriku Shinkansen](https://en.wikipedia.org/wiki/Hokuriku_Shinkansen), [Joetsu Shinkansen](https://en.wikipedia.org/wiki/Joetsu_Shinkansen)
- Tần số/đổi tần số Tokaido: [JR Central – FC](https://jr-central.co.jp/news/release/_pdf/000042735.pdf), [Trafficnews – FC](https://trafficnews.jp/post/37258), [Trafficnews – Nishi-Sagami](https://trafficnews.jp/post/107531)
- Cảnh báo động đất: [JR Central – Terrace](https://jr-central.co.jp/news/release/_pdf/000014824.pdf), [Trafficnews – 3 trụ cột](https://trafficnews.jp/post/36087/2)- ATC: [newswitch – ATC-NS](https://newswitch.jp/p/8219)
- OpenStreetMap wiki – [OpenRailwayMap/Tagging in Japan](https://wiki.openstreetmap.org/wiki/OpenRailwayMap/Tagging_in_Japan)

## 8. Dữ liệu bố trí ga, kết cấu và đường cong dùng trong game (21/10/2026)

Sinh bởi `tools/build_struct.py` vào `prototype/drive/data-lines.js`; vẽ bởi `layout.js`, `cabview.js`, `scene.js`.

**Bố trí ga [N]** (Wikipedia JP [東海道](https://ja.wikipedia.org/wiki/東海道新幹線), [山陽](https://ja.wikipedia.org/wiki/山陽新幹線), [東北](https://ja.wikipedia.org/wiki/東北新幹線), [九州](https://ja.wikipedia.org/wiki/九州新幹線)): mỗi ga có mã `số sân-số đường-thông qua` (ví dụ Odawara 2-2-1, Gifu-Hashima 2-4-1, Shin-Osaka 5-8-0). Cờ ga tránh (`loop`) nay lấy từ đây (Tokaido–Sanyo–Kyushu 23 ga, Tohoku 10 ga). Kyushu: bài ghi danh sách ga theo nhóm, tôi ghép tên theo thứ tự nên có thể lệch [?].
- **Kiểu sân ga:** chỉ có nguồn ở vài ga (2面4線 là sân đảo, Mishima 1面2線 sân đảo, Shin-Kobe 2面2線 sân hai bên, Fukui là ga đảo duy nhất ở Hokuriku). Cách xếp đường/sân cụ thể của các ga còn lại (ví dụ 2面3線, 3面6線, 5面8線, sân đảo nằm giữa hai đường cùng chiều hay giữa đường xuống và lên) là **suy luận [I]**, định nghĩa ở `layout.js` (`TOK`).
- Nhật chạy bên trái: đường xuống nằm bên trái đường lên khi nhìn theo chiều xuống [N chung; áp vào sơ đồ là I].

**Kết cấu tuyến** (nền đất / cầu cạn / cầu / hầm) **[N tỷ lệ, I vị trí]:**
- Tokaido: nền 53%, cầu 11%, cầu cạn 22%, hầm 13%. Sanyo: 12/9/28/50 (hầm 142 cái; chỉ Nishi-Akashi–Himeji không có hầm). Tohoku: Tokyo–Morioka 5/16/56/23, Morioka–Hachinohe 14/3/9/73, Hachinohe–Shin-Aomori 15/5/18/62 (Omiya–Utsunomiya không có hầm). Kyushu: Hakata–Shin-Yatsushiro 5/14/51/30, Shin-Yatsushiro–Kagoshima-Chuo 12/7/12/69.
- **Không tìm được nguồn công khai cho vị trí từng đoạn theo km.** Game sinh ngẫu nhiên cố định sao cho tổng khớp tỷ lệ, giữ ga ngoài hầm (trừ Tokyo/Ueno Tohoku đi ngầm), giữ các hầm lớn đã biết (Tanna, Rokko, Iwate-Ichinohe, Hakkoda), Tokyo–Shinagawa trên cao, Ueno–Omiya trên cao.

**Đường cong:** bán kính cơ bản 4.000 m. Tokaido: 2.500 m (Tokyo, Shizuoka phía đông, Aichi, Kyoto, Osaka) và 3.000 m (nơi khác) theo đơn vị hành chính; chỗ gấp nhất ~600 m giữa cầu Tamagawa và Musashi-Kosugi; đô thị có cong 1.000–1.500 m. Sanyo: rải rác 3.500 m, tối thiểu 1.000 m. Tohoku: tối thiểu 400 m (Tokyo–Omiya 400–2.000 m). Kyushu: tối thiểu 500 m **[N]**. Vị trí, độ dài và hướng rẽ từng cong là **[I]** sinh ngẫu nhiên cố định.

## 9. Đầu tuyến Tokyo: các đường sân ga nối vào hai đường chính thế nào (đối chiếu sơ đồ HaisenNet, 2026-10-23)
Nguồn: sơ đồ ray [Tokaido 01](https://www.haisenryakuzu.net/documents/jr/shinkansen/tokaido/figures/020_01.svg) và [Tohoku 01](https://www.haisenryakuzu.net/documents/jr/shinkansen/tohoku/figures/010_01.svg) của HaisenNet (hình SVG, không có số đường; chỉ đọc, không chép).
- **[D] Tokyo Tokaido (14–19):** 3 sân đảo, 6 đường. 3 đường phía trên của sơ đồ nhập vào một đường chính, 3 đường phía dưới nhập vào đường chính kia. Giữa hai đường chính ngay sau cổ ga có **một ghi chữ X** (cắt chéo hai đường chính); sau đó là cụm đường chéo khác ở phía Shinagawa.
- **[D] Tokyo Tohoku (20–23):** 2 sân đảo, 4 đường. Đường 1–2 (trên) nhập vào đường thứ 3, đường 3 chạy thẳng thành đường chính trên; đường 4 chạy thẳng thành đường chính dưới. Hai ghi chữ X nối hai đường chính (một ở cổ ga, một ở phía Ueno).
- **[I] Ý nghĩa:** mỗi nhóm đường sân ga chỉ nối trực tiếp vào MỘT đường chính. Tàu chạy ra từ một đường thuộc nhóm của đường chính ngược chiều phải qua ghi chữ X để sang đường chính đúng chiều (Nhật chạy bên trái; đường chính trên/dưới của sơ đồ là đường xuống/lên theo suy luận hướng vẽ, chưa kiểm chứng). Vì mọi đường sân ga dùng cho cả tàu vào lẫn ra, **không** phải mọi tàu xuất phát ở đường rìa bên phải; chỉ tàu dùng nhóm đường "ngược" mới qua X. Nozomi dùng cả 14–19 (xem §6).
- **[?]** Chưa biết đường nào (14–19, 20–23) nối với đường chính nào, và tỉ lệ chuyến đi qua X.
- **So với game:** `layout.js` ghi mỗi đường là d/u (ví dụ Tokyo Tokaido `dPddPuuPu` = ba đường d bên trái, ba đường u bên phải; Tohoku `dPduPu`). Với Tokaido khớp nhóm 3+3. Với Tohoku sơ đồ cho 3+1 (đường 3 chạy thẳng vào đường chính cùng nhóm với đường 1–2) còn game đặt 2+2. Game chưa mô phỏng ghi chữ X ở đầu tuyến: tàu của người chơi luôn xuất phát trên đường d và đi thẳng.
