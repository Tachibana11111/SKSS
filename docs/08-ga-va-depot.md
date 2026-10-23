# 08 – Ga và depot: sân ga, quay đầu, bảo dưỡng tàu và bảo trì ban đêm

Nhãn: **[N]** có nguồn (link cuối file) · **[D]** từ dữ liệu trong `data/` · **[I]** suy luận hoặc đề xuất cho game · **[K]** kiến thức nền Claude chưa kiểm chứng · **[?]** chưa rõ hoặc nguồn mâu thuẫn.
Phiên bản 1 (2026-10-20). Liên quan: 02 (cấu trúc ga, danh sách depot), 03 (đoàn tàu), 04 (dừng, quay đầu, sân ga), 05 (điều độ), 06 (an toàn), 07 (lái tàu).

## 1. Hai vòng đời của một đoàn tàu
Một đoàn Shinkansen sống qua hai vòng song song: **vòng chạy** (từ depot ra ga, chạy các chuyến, quay đầu ở ga cuối, về depot đêm) và **vòng bảo dưỡng** (kiểm tra theo ngày và theo quãng đường, định kỳ vào xưởng lớn). Trong game điều độ và vận dụng, hai vòng này xung đột nhau: mỗi đoàn có số km/ngày phải kiểm tra, lại **không có đoàn dự phòng** (tài liệu 04–05).

## 2. Ga

### 2.1 Cấu trúc (nhắc lại từ tài liệu 02)
- Tokaido: Tokyo 3 sân 6 đường; Shinagawa, Shin-Yokohama, Nagoya, Kyoto 4 đường; Shin-Osaka 5 sân 8 đường; các ga trung gian có hoặc không có đường thông qua (Atami không có; Mishima 1 sân 2 đường + thông qua; Gifu-Hashima 2 sân 4 đường + thông qua) **[N]**.
- Tohoku: Tokyo 2 sân 4 đường; Omiya 3 sân 6 đường; các ga có đường thông qua (Oyama, Utsunomiya, Ichinoseki, Kitakami…) **[N]**.
- Sân ga dùng trong lịch thật: Tokyo Tokaido sân 14–19, Tokyo Tohoku sân 20–22/23, Shin-Osaka xuống 20–22, lên 23–27, Nagoya 16/17, Kyoto 13/14, Hakata 13/16 **[D]** (tài liệu 04 mục 6).

### 2.2 Quay đầu và dọn tàu **[N]/[D]**
- **Tokyo, Tohoku/Joetsu:** từ lúc tàu đến đến lúc rời **12 phút** (đo từ dữ liệu: tối thiểu 11–12 phút), dọn trong **7 phút**, **đội 23 người** mỗi tàu (JR East Technohart TESSEI, từ 1991); từ **4 sân** tàu rời cách nhau tối thiểu 3 phút.
- **Tokyo, Tokaido:** **15 phút** (đo từ dữ liệu, mọi sân 14–19). **Đội dọn:** hai con số khác nhau là **hai thời điểm khác nhau**, không mâu thuẫn: **năm 2016 là 7 nhóm, mỗi nhóm 56 người, mỗi nhóm khoảng 15 chuyến/ngày** (có thể thêm một nhóm cơ động vào mùa cao điểm); **năm 2023 là 1 nhóm 36 người, làm trong 10 phút** mỗi lượt (JR Central, *JR Jikokuhyo*). Đơn vị làm dọn quay đầu ở Tokyo của Tokaido là **Shinkansen Maintenance Tokai (新幹線メンテナンス東海)**, **không phải** JR East TESSEI (đó là đội "7 phút" của Tohoku/Joetsu). Còn việc dọn **trước ngày khai thác** là **23 người, 45 phút một đoàn** (2020). "Express Dresser": nhân viên vệ sinh khoảng **1.400 người** ở ga Tokyo và depot; việc gồm xoay ghế, thay bọc tựa, kiểm tra ghế ướt, nhặt rác, lau sàn.
- **Thời điểm đóng cửa (đo bằng blog, không chính thức) [?]:** tại Tokyo, cửa bắt đầu đóng khoảng **34 giây trước giờ khởi hành** (từ −41 đến −28 giây); một bản đo khác ghi trung bình **+1,2 giây** quanh giờ khởi hành (không đồng nhất). Sau khi trưởng tàu bấm công tắc, cửa N700 bắt đầu mở sau khoảng **4 giây** (một câu trả lời diễn đàn). **Thời gian cửa mở chính thức**: không công bố. Một số blog nói giờ dừng trong biểu đồ Tokyo 2:30, Nagoya 3:00, Kyoto 2:00 nhưng **mâu thuẫn dữ liệu lịch thật** (Nozomi dừng 1–2 phút), nên bỏ qua.
- **Shin-Osaka, Hakata, Morioka:** cận dưới đo từ dữ liệu 24, 27 và 46 phút (mẫu nhỏ, tài liệu 04).
- Cửa lên tàu mở khoảng **5 phút** trước giờ rời Tokyo (ước tính cho hành khách) **[?]**.

### 2.3 Cửa chắn sân ga (可動柵) **[N]**
- Tokaido đi đầu Nhật Bản: **Atami là ga đầu tiên có cửa chắn sân ga (1974)**; Tokyo và Atami có đủ các sân; **Nagoya và Kyoto xong 2016**; Shinagawa, Shin-Yokohama, Shin-Osaka lắp từng phần; Shin-Yokohama dự kiến xong 2018; **Shin-Osaka sân 20–26 lắp cửa rộng khoảng 5 m, tiến độ 2018–2022**. **Cập nhật 2026:** JR Central đặt mục tiêu **lắp cửa chắn ở toàn bộ ga Tokaido** (kế hoạch đầu tư FY2026: 7.180 tỷ yên tổng, 170 tỷ cho an toàn và vận hành ổn định) và lắp **thanh chặn trật bánh trên toàn tuyến**, **gia cố nền đắp**; bài không nêu danh sách ga hay tiến độ **[?]** (nên coi chưa hoàn tất toàn bộ).
- **TASC** (dừng chính xác từ mùa thu 2026, tài liệu 07) cho phép **làm ngắn cửa chắn** và giảm chi phí.

### 2.4 Hành khách và lên xuống
- Đoàn Tokaido 16 toa chở tối đa khoảng **1.300** người; mỗi lần dừng có thể hơn **1.000** người lên xuống (lái tàu JR West nói) **[N]**.
- **Trưởng tàu** làm cả nhiệm vụ đóng/mở cửa và phục vụ; từ khoảng 2028 lái tàu sẽ có chức năng đóng/mở cửa từ buồng lái (tài liệu 07) **[N]**.
- **Dừng 1–2 phút ở Nozomi** (tài liệu 04) là cửa sổ rất chặt: mỗi lần dừng phải kịp lên xuống.
- **Đường nhập/tách ga:** tàu chờ vượt (3–6 phút) cần đường thông qua (tài liệu 02, 04). Ga không có đường thông qua (Atami) là điểm nghẽn.

## 3. Depot và xưởng theo công ty
Bảng chung là các số liệu lấy từ Wikipedia tiếng Nhật (có thể đã cũ, nhãn **[N]**). "Sức chứa" là số toa lưu tối đa (đường × số toa).

### 3.1 JR Central (Tokaido)
| Cơ sở | Vị trí và chức năng | Số liệu |
|---|---|---|
| **Oi (大井車両基地)** | Shinagawa, Tokyo; 仕業検査 (hằng ngày), 交番検査 (định kỳ), 修繕, **kiểm tra đặc tính ATC**; liền kề ga hàng hóa Tokyo; mở **9/1973**; nối tuyến chính bằng **đường chạy rỗng tách gần Tamachi**; không nhìn thấy từ cửa sổ tàu | diện tích **379.000 m²** (Wikipedia) hay **384.000 m² (khoảng 8 sân Tokyo Dome)** (JR Central 2017) **[?]**; **67 đoàn đăng ký (2017)**; số đường lưu **không công bố** **[?]** |
| **Hamamatsu (浜松工場)** | xưởng **kiểm tra toàn phần (全般検査)** và **kiểm tra bogie** cho Tokaido; khởi đầu **1912** là xưởng sửa đầu máy hơi nước, **chỉ làm Shinkansen từ 2011**; **dây chuyền kiểm tra mới chạy từ 5/1/2017** (nâng thân tàu bằng kích thay vì cẩu, kháng chấn, robot mài đầu tàu đầu tiên của Shinkansen); khoảng **1.400 người** (kể cả đối tác) | **một đoàn 16 toa: 15 ngày trước đây, 14 ngày với dây chuyền mới**; số đoàn mỗi năm không công bố **[?]**; ước lượng nhu cầu ở §4 |
| **Mishima (三島車両所)** | liền kề ga Mishima; **仕業検査 và kiểm tra đột xuất**; **không có xe đăng ký**; lưu đêm N700A/N700S; **Kodama đầu và cuối Tokyo–Mishima** (khớp dữ liệu: Kodama cuối từ Tokyo 22:48 đi Mishima). Do ga Atami không đủ chỗ làm đường lưu, và Shizuoka đắt đất, chọn Mishima (1966; mở rộng 1969) | **2 đường xuất/nhập, 12 đường lưu điện, 3 đường 仕業, 1 đường thông, 1 đường xe công vụ**; sức chứa số cụ thể **[?]** |
| **Nagoya (名古屋車両所)** | Nakamura, Nagoya, bên sông Shonai; **仕業 và kiểm tra đột xuất**; **không có xe đăng ký**; **lưu đêm** các tàu xuất phát Nagoya sáng sớm/đêm khuya và **chờ các Kodama quay đầu ban ngày**; đường chạy rỗng song song tuyến chính ~**2,1 km** từ ga Nagoya rồi ~**1,4 km** nữa; mở **3/1975** | **11 đường nhập/xuất**, **3 đường 仕業** |
| **Torikai (鳥飼車両基地)** | Settsu, Osaka; 4 đơn vị: 仕業, 修繕, 交番, **kiểm tra bogie**; tàu chạy rỗng từ Shin-Osaka tới | **17 đường nhập/xuất**, **27 đường lưu điện (20 + 7)**, 2 đường thông, 2 đường kiểm tra định kỳ, 1 sửa chữa tạm, 1 khôi phục, 3 đường ghép/kéo, 2 đường mài, 2 đường thay bogie; **2019: JR Central đầu tư khoảng 3,6 tỷ yên chống ngập** vì nằm cạnh sông An-i-gawa |

### 3.2 JR East (Tohoku, Joetsu, Hokuriku)
| Cơ sở | Chức năng | Số liệu |
|---|---|---|
| **Tokyo Shinkansen Rolling Stock Center** (Kami-Nakazato, Kita-ku, gần Tabata) | 仕業検査, sửa chữa đột xuất, vệ sinh, **lưu đậu** cho tàu xuất phát/kết thúc ở Tokyo và Ueno; **không có xe đăng ký thường trú**; **chỉ vào/ra từ phía Ueno** | 130.000 m²; **18 đường lưu** (hữu dụng ≥ 480 m), **sức chứa 324 toa (18 × 18)**; 3 đường kiểm tra trong ngày (nhà dài 430 m); 2 máy rửa; 2 đường chạy rỗng |
| **Shinkansen Sogo Sharyo Center (Sendai)** (Rifu, Miyagi) | từ 仕業/交番 đến **全般検査**, kiểm tra bogie, cải tạo, nhận xe mới, thanh lý; **mọi đoàn Shinkansen JR East định kỳ vào đây**; Đổi tên **新幹線総合車両ベース** ngày 1/7/2026 | **608 toa đăng ký** (1/4/2024); sức chứa **352 toa (16 × 22)**; năng lực 2009: 全般検査 428 toa, 台車検査 461, 交番検査 5.162, 仕業検査 44.708 (đơn vị toa/năm) |
| **Oyama (Tochigi)** | **chỉ lưu đậu và rửa tàu**; **không có xe đăng ký**; mỗi sáng sớm có **Nasuno 252 xuất phát từ Oyama đi Tokyo**; do Tokyo thiếu chỗ lưu khi Hokkaido/Hokuriku mở rộng nên E7/W7 cũng vào đây; trạm lưu đậu phụ **Nasushiobara** (4 → 8 đường năm 2010; báo chí nói có kế hoạch lên 26 đường, chưa xác nhận) | 47.534 m²; **7 đường lưu**, 2 đường 仕業 (450 m, cho 16 toa), 1 máy rửa, 1 đường kéo, 2 đường chạy rỗng; có đường sửa tạm kèm thiết bị thay bogie |
| **Morioka (Mitake)** | 仕業, 交番 (từ 1997), **tan tuyết**, lưu đậu đêm cho tàu xuất phát/kết thúc ở Morioka; không có xe đăng ký | 122.209 m²; 6 đường lưu; 2 đường 仕業 (dùng cả để tan tuyết); sức chứa **72 toa (12 × 6)**, mở rộng đến 16 × 6 |
| **Niigata** (Joetsu) | lưu đậu, 仕業/交番, sửa chữa tạm, mài bánh; đường lưu **đều có mái che** chống tuyết | **E7 20 đoàn = 240 toa**; **sức chứa 224 toa (16 × 14)**, quy hoạch 320 toa (16 × 20); đường nội bộ ~15 km; 14 đường lưu, 6 đường kiểm tra; đại tu ở trung tâm tổng hợp Sendai |
| **Nagano** (Hokuriku) | 仕業/交番, kiểm tra ATC, kiểm tra radio tàu | **E7 19 đoàn = 228 toa**; 11 đường lưu, sức chứa 132 toa (12 × 11); **bão Hagibis 13/10/2019**: đê sông Chikuma vỡ, **10 đoàn (120 toa) ngập**, hai đoàn trật bánh, **toàn bộ bị loại** (8 E7 + 2 W7), thiệt hại ~15 tỷ yên; phục hồi chức năng kiểm tra xong **10/2021**; biện pháp chống ngập ~**50 tỷ yên** (nâng thiết bị điện, tấm chắn nước, quy trình bão, **diễn tập đưa tàu lên đoạn cầu cạn**) |

### 3.3 JR West
| Cơ sở | Chức năng | Số liệu |
|---|---|---|
| **Hakata Sogo Sharyosho** (Kasuga/Nakagawa, ~9 km phía nam Hakata) | 仕業, 交番, 台車, **全般検査**, kiểm tra đặc tính ATC; **ga Hakata-Minami nằm trong khuôn viên** (tuyến Hakata-Minami mở 1990, dùng tàu ra vào depot chạy thương mại); có chi nhánh Okayama và Hiroshima; mở **1974** | 501.783 m² (bảng thông tin; văn bản ~42 vạn m² **[?]**); **21 đường lưu**, 6 đường lưu điện, 3 đường 仕業, 2 đường 交番, 1 đường hoàn thiện 全般, 2 đường thay bogie, **3 máy rửa**; **sức chứa 486 toa (18 × 27)**; N700 họ **856 toa**, 700 E 128 toa, 500 V 32 toa (có thể không khớp), **Doctor Yellow T5** (7 toa) |
| **Hakusan Sogo Sharyosho** (Ishikawa; Hokuriku) | depot và xưởng; **chi nhánh Tsuruga** (8/2023) làm 仕業 | 279.964 m²; **W7 22 đoàn = 264 toa**; 9 đường lưu, 1 đường 仕業, 2 đường 交番, 1 đường tan tuyết, 1 đường 全般; **sức chứa 108 toa (12 × 9)**; Tsuruga 7 đường, 84 toa |

### 3.4 JR Kyushu và JR Hokkaido
| Cơ sở | Chức năng | Số liệu |
|---|---|---|
| **Kumamoto Sogo Sharyosho** (JR Kyushu, ~10 km phía nam ga Kumamoto) | 全般検査, 台車検査, 交番検査, 仕業検査, kiểm tra ATC, sơn; Kawauchi (Kagoshima) chỉ còn lưu đậu đêm; **Omura** (chi nhánh) quản lý N700S Nishi-Kyushu | ~200.000 m², 1,4 km × 150 m; **13 đường lưu (8 toa)**, sức chứa **104 toa**; 2 đường 仕業, 2 đường 交番, 1 đường 全般, 1 đường thay bogie; **năng lực: 仕業 ~10 đoàn/ngày, 交番 1–2 đoàn/ngày, 台車 và 全般 mỗi loại ~10 đoàn/năm**; xe: **800 (8 đoàn 6 toa = 48 toa)** và **N700-8000 R1–R11 (88 toa)**; **28/7/2026 động đất làm vênh 7 chỗ ray trong khuôn viên** |
| **Hakodate Shinkansen Sogo Sharyosho** (JR Hokkaido, Nanae/Hokuto) | depot tổng hợp: 仕業 đến 全般検査, bảo trì đường và điện; mở 3/2016 | ~360.000 m² (cơ sở chính), vốn trên **37 tỷ yên**; **4 đường lưu (mở rộng lên 12 khi kéo dài đến Sapporo)**, **sức chứa 40 toa**; **H5: 3 đoàn = 30 toa (H1, H3, H4)**; **đường sưởi tuyết (融雪線)**; đường lưu đặt trong nhà che tuyết; 6 toa H2 hỏng vì động đất 3/2022 chuyển về dùng đào tạo |

## 4. Chu kỳ kiểm tra tàu **[N]**
| Kiểm tra | Chu kỳ cũ (N700) | Chu kỳ mới (N700A, N700S) | Nơi làm |
|---|---|---|---|
| **仕業検査** (trước chạy) | ~**2 ngày một lần** | như cũ | depot đêm (Oi, Mishima, Nagoya, Torikai, Hakata…) |
| **交番検査** | **30 ngày hoặc 30.000 km** | **45 ngày hoặc 60.000 km** (từ 3/2016, lần đầu từ 1964, cho N700 cải tạo tương đương N700A) | Oi, Torikai… |
| **台車検査** | **18 tháng hoặc 600.000 km** | **20 tháng hoặc 800.000 km** (kế hoạch, N700S/N700A; N700-X loại trừ) | Hamamatsu, Torikai |
| **全般検査** | **36 tháng hoặc 1,2 triệu km** | **40 tháng hoặc 1,6 triệu km** (kế hoạch; áp dụng cho N700S trước, rồi toàn bộ đến cuối FY2026) | **Hamamatsu** |

- Lý do kéo dài: giám sát xe tốt hơn (nhiệt độ bogie, áp suất lò xo hơi, rung bệ N700S; tài liệu 06), cho phép **vận dụng đoàn tàu linh hoạt hơn, giảm nhân lực, giảm chi phí** khoảng **4 tỷ yên/năm**; từ đó cho phép tăng chuyến (bài trafficnews).
- **JR West (Hakata):** 仕業 mỗi 2 ngày; 交番 30 ngày hoặc 30.000 km; 全般検査 36 tháng hoặc 1,2 triệu km (số cũ). Trước 全般検査 có bước chuẩn bị "5 tháng trước"; quy trình: dừng tàu, kiểm tra điện, cấp điện thử, kiểm tra pantograph, kiểm tra từng bộ phận tháo ra, **mỗi công đoạn có người phụ trách xác nhận**, cuối cùng **chạy thử** mới đưa vào vận hành.
- **JR East [N] (Wikipedia tiếng Nhật, mục 全般検査):** **仕業検査 tối đa 3 ngày (72 giờ)**, trước đây 2 ngày; **交番検査 60.000 km** (không giới hạn số ngày, trừ vài xe); **台車検査: E2/E3 18 tháng hoặc 600.000 km; E5, E6, E7, E8: 800.000 km, không giới hạn thời gian**; **全般検査: E2/E3 36 tháng hoặc 1,2 triệu km; E5, E6, E7, E8: 1,6 triệu km**, không giới hạn thời gian (áp dụng cho xe vào kiểm tra từ **2/2021**). **Mức tối đa theo thông báo của nhà nước cho điện Shinkansen:** 交番 30 ngày/30.000 km, 台車 1 năm 6 tháng/600.000 km, 全般 3 năm/1,2 triệu km; công ty có thể rút ngắn hoặc kéo dài theo quy định riêng. JR Central: từ **4/2022** kéo dài chu kỳ 台車 và 全般 cho **N700S**, sau áp dụng N700A (con số 20 tháng/800.000 km và 40 tháng/1,6 triệu km ở bảng trên). JR East công bố xe đo kiểm Shinkansen mới ứng dụng AI/DX vào **FY2029** (10/2025).
- **Ước lượng nhu cầu của xưởng Hamamatsu [I]:** nếu Tokaido có khoảng **130–170 đoàn** (số cũ ~130 đoàn, nhưng đang tăng nhờ N700S: 36 đoàn đến FY2028 theo kế hoạch cũ, thêm 8 đoàn FY2027 và 7 đoàn FY2028) và mỗi đoàn vào 全般検査 sau khoảng **40 tháng**, thì cần khoảng **39–51 đoàn mỗi năm**, tức **3–4 đoàn mỗi tháng**; với 14 ngày mỗi đoàn thì xưởng cần **ít nhất 2 dây chuyền chạy song song** (chưa tính 台車検査 20 tháng, làm ở Hamamatsu và Torikai). Đây là suy luận từ số đoàn ước lượng và chu kỳ công bố, **không phải số liệu công bố**.
- **Doctor Yellow / Doctor S:** đo ray, dây điện, tín hiệu, khoảng 10 ngày một lần; T4 ngừng 29/1/2025; T5 (JR West) dự kiến 1/2027; "Doctor S" từ N700S (tài liệu 03).

## 5. Bảo trì đường ban đêm **[N]**
- **Khung giờ:** tàu khách chạy khoảng **6:00–0:00**; **0:00–6:00 là giờ bảo trì chính** (trước đây Tokaido không có tàu đêm).
- **Quy mô:** mỗi đêm khoảng **50 chuyến xe bảo trì (保守用車)** đi từ **cơ sở bảo trì** tới hiện trường để bảo trì đường ray và thiết bị điện. Khi đi, xe **đảo chiều và đổi sân ngay tại ga**, việc đó gọi là **入換 (nhập đổi)**; một chuỗi 入換 sắp theo thứ tự là **入換計画 (kế hoạch nhập đổi)**.
- **Quy trình hiện nay [N] (thông cáo JR Central 4/3/2026):** ban ngày **nhân viên bảo trì đường tự làm kế hoạch nhập đổi bằng tay** từ kế hoạch bảo trì (vị trí, nội dung công việc) theo cách bố trí đường của từng ga (mỗi ga khác nhau), một người khác kiểm tra, rồi đối chiếu với nhân viên ga. Ban đêm mỗi lần nhập đổi, **người phụ trách hiện trường** dùng **thiết bị đàm thoại dọc tuyến** yêu cầu **nhân viên ga** (ngồi ở phòng làm việc của ga) **bấm ghi**; hai bên xác nhận lẫn nhau, đúng thứ tự và đúng hướng để đảm bảo an toàn.
- **Hệ thống mới "線路開通システム" [N]:** **tự lập kế hoạch nhập đổi** từ kế hoạch bảo trì (giảm khoảng **8 phần 10** thời gian lập và đối chiếu); ban đêm người phụ trách **bấm ghi trên máy tính bảng** theo kế hoạch, **chỉ cho thao tác đúng thứ tự đã định**, có thể **nhập đổi nhiều xe cùng lúc**, giảm xác nhận tay và thời gian chờ. **Dự kiến vận hành từ 7/2029.** Số nhân viên bảo trì mỗi đêm **không công bố**.
- **An toàn khi đóng điện và mở đường:** trước chuyến đầu tiên phải xác nhận ray (tài liệu 05: chạy tàu kiểm tra trước khi chạy lại); xe bảo trì từng gặp sự cố, ví dụ **xe bảo trì trật bánh giữa Hamamatsu và Nagoya** làm đình trệ cả ngày (nguồn Jiji).
- **Ví dụ kích thước một đêm:** diễn tập đêm 29/5/2015 (kịch bản động đất, cho khách đi bộ dọc ray tới Shin-Yokohama) có **299 người** tham gia; trước đây một công trình thay đá dăm ban đêm có 10–20 người vận hành máy nặng (2004, cũ).
- **Thử nghiệm tàu đêm 2026 [N]:** ngày **8/8/2026** JR Central cho chạy **"Tokaido Lumière Express"**: **Tokyo 22:00 → Shin-Osaka 6:59 sáng 9/8**, **đỗ khoảng 6 giờ ở Gifu-Hashima (khoảng 0:00–6:00)** để hành khách ngủ trên tàu, **461 người**, **15.000 yên**, bán hết trong 2 ngày. Lý do không chạy suốt đêm là giờ bảo trì; hạn chế: **tiếng ồn và rung từ bảo trì ngay tại ga**, đèn sáng suốt đêm, không có xe bán hàng. JR Central xem là kiểm chứng và đang xét chạy thêm.

## 6. Thiên tai và ga/depot
- **Bão Hagibis 2019** (Nagano): xem 3.2 (10 đoàn bị loại, ~15 tỷ yên). Bài học: nâng thiết bị điện, tấm chắn nước, **quy trình đưa tàu lên cầu cạn khi có bão**.
- **Torikai:** từng ngập năm **1967**, không mất toa nào nhờ đưa tàu lên tuyến chính; **động đất Hanshin 1995** làm tàu mới phải chở bằng đường biển; nằm cạnh sông An-i-gawa nên đầu tư chống ngập (2019).
- **Kumamoto (Kyushu):** động đất **28/7/2026** làm vênh 7 chỗ ray trong depot.
- **Hakodate:** đường lưu trong nhà, **đường sưởi tuyết**.
- Chi tiết xử lý thiên tai và dòng sự kiện ở tài liệu 09.

## 7. Ý nghĩa cho game **[I]**
- **Hai lớp cạnh tranh:** mỗi đoàn có **vòng bảo dưỡng** (仕業 mỗi ~2 ngày, 交番 mỗi 45 ngày/60.000 km, 台車 20 tháng, 全般 40 tháng) và **vòng chạy**; vận dụng đoàn tàu là bài toán lập lịch; chạy bù trễ không được phá chu kỳ kiểm tra.
- **Depot có sức chứa và số đường hữu hạn:** lưu đêm theo sức chứa; sân kiểm tra ít (Tokyo 3 đường 仕業); chỗ nghẽn khi nhiều đoàn kết thúc cùng lúc.
- **Ga có số đường và đường thông qua** quyết định khả năng vượt (Atami không vượt được); thời gian chiếm sân 15 phút Tokaido, 11–12 phút Tohoku.
- **Bảo trì ban đêm (0–6 giờ):** cửa sổ cố định; xe bảo trì cạnh tranh với tàu đêm thử nghiệm; mở khóa "tàu đêm" như nội dung 2026.
- **Sự kiện:** ngập depot (Nagano), vênh ray (Kumamoto), xe bảo trì trật bánh, tuyết (đường sưởi), động đất làm mất khả năng kiểm tra.
- **Trade-off thiết kế:** kéo dài chu kỳ kiểm tra tiết kiệm chi phí nhưng cần giám sát xe tốt hơn (mở khóa bằng công nghệ).

## 8. Lỗ hổng: đã giải quyết và còn lại

**Đã giải quyết (lần rà soát này):**
- **Chu kỳ kiểm tra JR East** cho mọi dòng (E2/E3 và E5/E6/E7/E8), cùng mức tối đa theo thông báo nhà nước (§4).
- **Đội dọn Tokaido:** không mâu thuẫn; 56 người × 7 nhóm là năm 2016, 36 người/nhóm là 2023; đơn vị là Shinkansen Maintenance Tokai (không phải TESSEI) (§2.2).
- **Bảo trì ban đêm:** quy trình nhập đổi xe bảo trì, hệ thống mới, giảm khoảng 80% thời gian lập kế hoạch, dự kiến vận hành 7/2029 (§5).
- **Xưởng Hamamatsu:** 15 → 14 ngày mỗi đoàn, dây chuyền mới 5/1/2017, khoảng 1.400 người; kèm ước lượng nhu cầu ≥ 2 dây chuyền [I] (§3.1, §4).
- **Oi:** 67 đoàn đăng ký (2017), diện tích 379.000 hoặc 384.000 m² (hai nguồn) (§3.1).
- **Cửa chắn sân ga:** mục tiêu toàn bộ ga trong kế hoạch FY2026 (§2.3). **Thời gian đóng cửa:** đo bằng blog (khoảng 34 giây trước giờ khởi hành) (§2.2).
- **Tổng số đoàn:** có ước lượng ~130 đoàn (nguồn cũ) và kế hoạch N700S (36 đoàn đến FY2028; thêm 8 đoàn FY2027, 7 đoàn FY2028), 383 chuyến/ngày (FY2024).

**Không giải quyết được (không công khai, hoặc chỉ có nguồn yếu):**
- **Số đường lưu và sức chứa của Oi và Hamamatsu:** không nguồn nào nêu (bài kỹ thuật bị khóa hoặc không có). Mishima và Nagoya có số đường nhưng không có "sức chứa" công bố.
- **Số đoàn chạy mỗi ngày (運用) và tổng số đoàn chính xác của JR Central:** lịch vận dụng và biên chế không công khai; chỉ có ước lượng.
- **Số đoàn xử lý mỗi năm ở Hamamatsu** và **năng lực năm của các xưởng JR Central:** không công bố; chỉ có ước lượng [I].
- **Thời gian cửa mở chính thức** và **số nhân viên bảo trì ban đêm:** không công bố (chỉ có khoảng 50 xe/đêm).
- **Danh sách ga đã có cửa chắn sân ga năm 2026:** không có (chỉ có tình trạng 2016–2018 và mục tiêu toàn bộ).
- **Shin-Aomori (Aomori) và Nasushiobara** (cơ sở lưu đậu phụ của JR East): chỉ có thông tin sơ lược.

## Nguồn
- Wikipedia tiếng Nhật (bổ sung): [名古屋車両所](https://ja.wikipedia.org/wiki/名古屋車両所), [三島車両所](https://ja.wikipedia.org/wiki/三島車両所), [小山新幹線車両センター](https://ja.wikipedia.org/wiki/小山新幹線車両センター)
- Wikipedia tiếng Nhật: [新幹線総合車両センター](https://ja.wikipedia.org/wiki/新幹線総合車両センター), [鳥飼車両基地](https://ja.wikipedia.org/wiki/鳥飼車両基地), [大井車両基地](https://ja.wikipedia.org/wiki/大井車両基地), [博多総合車両所](https://ja.wikipedia.org/wiki/博多総合車両所), [熊本総合車両所](https://ja.wikipedia.org/wiki/熊本総合車両所), [函館新幹線総合車両所](https://ja.wikipedia.org/wiki/函館新幹線総合車両所), [東京新幹線車両センター](https://ja.wikipedia.org/wiki/東京新幹線車両センター), [盛岡新幹線車両センター](https://ja.wikipedia.org/wiki/盛岡新幹線車両センター), [新潟新幹線車両センター](https://ja.wikipedia.org/wiki/新潟新幹線車両センター), [長野新幹線車両センター](https://ja.wikipedia.org/wiki/長野新幹線車両センター), [白山総合車両所](https://ja.wikipedia.org/wiki/白山総合車両所)
- Chu kỳ kiểm tra: [tetsudo-ch – kéo dài chu kỳ N700S/N700A](https://tetsudo-ch.com/12189848.html), [trafficnews – chu kỳ kiểm tra](https://trafficnews.jp/post/39342), [trafficnews – kéo dài và tăng chuyến](https://trafficnews.jp/post/47496), [traicy – giảm 4 tỷ yên](https://www.traicy.com/?p=232999), [JR West Blue Signal – Hakata](https://www.westjr.co.jp/company/info/issue/bsignal/13_vol_146/rail/index.html)
- Depot Tokaido: [trafficnews – nhìn từ trên không](https://trafficnews.jp/post/135304), [tabi-mag – Oi](https://tabi-mag.jp/tk1692/), [tabi-mag – Torikai](https://tabi-mag.jp/os0408/)
- Bổ sung: [Wikipedia – 全般検査 (chu kỳ JR East)](https://ja.wikipedia.org/wiki/全般検査), [trafficnews – Oi mở cửa 2017](https://trafficnews.jp/post/78830), [Toyo Keizai – xưởng Hamamatsu](https://toyokeizai.net/articles/-/154688), [traicy – đầu tư FY2026](https://www.traicy.com/posts/20260327366357/)
- Bảo trì đêm: [JR Central 4/3/2026 – hệ thống mở đường (線路開通システム)](https://jr-central.co.jp/news/release/_pdf/000044949.pdf), [trafficnews – diễn tập đêm](https://trafficnews.jp/post/40498/), [Jiji – xe bảo trì trật bánh](https://sp.m.jiji.com/english/show/34388)
- Tàu đêm 2026: [kumanichi (Kyodo)](https://kumanichi.com/articles/2023695), [Business Journal](https://biz-journal.jp/economy/post_395216.html), [tabiris](https://tabiris.com/?p=64163)
- Cửa chắn sân ga: [trafficnews – Nagoya/Kyoto](https://trafficnews.jp/post/49143/), [trafficnews – Shin-Osaka](https://trafficnews.jp/post/81108), [trafficnews – nhanh nhất Nhật Bản](https://trafficnews.jp/post/36660)
- Nhân sự, dọn tàu: [toretabi – Q&A JR Central](https://www.toretabi.jp/railway_info/jr-kiitemita2303.html); TASC: [JR Central 29/9/2025](https://jr-central.co.jp/news/release/_pdf/000044655.pdf)

## 9. Công trình trong ga, từ lớn đến nhỏ (tìm hiểu 2026-10-23)
Nhãn: **[N]** có nguồn · **[K]** kiến thức nền chưa kiểm chứng · **[?]** chưa tìm được. Phần lớn nguồn là trang hướng dẫn khách và Wikipedia, ít tài liệu thiết kế.

### 9.1 Công trình lớn
- **Ga cao tầng xếp chồng [N]:** sân ga Shinkansen ở tầng trên cùng, sảnh/soát vé ở giữa, tàu thường và metro ở dưới. Niigata: sân ga tầng 3, sảnh tầng 2, thêm cửa soát vé chuyển tàu ngay trên sân ga ([Wikipedia](https://ja.wikipedia.org/wiki/%E6%96%B0%E6%BD%9F%E9%A7%85)). Shin-Osaka: sân ga tầng 4, soát vé tầng 3, tàu thường tầng 1 (trang hướng dẫn khách, yếu). Tsuruga: sân ga cao khoảng 37 m (trang kỷ lục không chính thức, cần kiểm lại).
- **Mái ga [N, ít]:** Niigata có mái phủ toàn bộ sân ga tàu thường bằng khung thép ([JR東日本建築設計](https://www.jred.co.jp/projects/p172.html)). **[?]** chưa có số liệu mái sân ga Shinkansen.
- **Đường thông qua không sân ga [N]:** Shin-Fuji có đường chính không sân ga và đường phụ có sân ga hai bên; khi sự cố, hành khách chuyển tàu qua tấm ván bắc ([trafficnews](https://trafficnews.jp/post/98190)).
- **Đường lên xuống [N]:** cầu thang, thang cuốn, thang máy. Tokyo: thang cuốn chạy lên từ sảnh soát vé ([wadattsu261](https://wadattsu261.com/content/tokyo-tokaidoshinkansen-metromarunouchiline-transfer-information/)). Vị trí cầu thang quyết định chỗ tàu 8 toa dừng ở sân ga 16 toa của Sanyo: gần cầu thang ở giữa, hoặc dồn về một đầu như Shin-Kobe ([Impress](https://travel.watch.impress.co.jp/docs/series/inoue/1457383.html)).
- **Cầu vượt bộ hành giữa các sân ga [K]:** có ở ga mặt đất và ga cũ; ga Shinkansen cao tầng thường nối các sân ga qua sảnh bên dưới. Dùng trong game theo quyết định thiết kế (docs/10), không phải mô tả ga thật.

### 9.2 Biển và thiết bị cho lái tàu
- **Biển dừng (停止位置目標) [N]:** treo từ mái, đứng cạnh đường, hoặc đặt giữa hai ray; số trên biển là số toa của đoàn, dùng chung một ký hiệu nếu mọi đoàn dừng cùng chỗ ([Impress](https://travel.watch.impress.co.jp/docs/series/inoue/1457383.html)).

### 9.3 Công trình nhỏ ở mép sân ga
- **Vạch cảnh báo và gạch dẫn đường [N]**, có loại có vạch ở phía trong của sân ga ([JR West](https://www.jr-odekake.net/railroad/service/barrierfree/eye/); [Wikipedia](https://ja.wikipedia.org/wiki/%E3%83%97%E3%83%A9%E3%83%83%E3%83%88%E3%83%9B%E3%83%BC%E3%83%A0)).
- **Cửa chắn sân ga, hàng rào, cảm biến ở mép sân ga [N]** (hồng ngoại, phát hiện vật nhô ra khi tàu vào/ra).
- **Nút dừng khẩn [N]:** ấn xong tàu không tự dừng, chỉ báo cho nhân viên ([JR East](https://www.jreast.co.jp/saferelief/operationguide/pdf/emergency.pdf)); khoảng 50 m một nút ở các ga Shinkansen Kyushu ([JR Kyushu](https://www.jrkyushu.co.jp/company/esg/safety/pdf/220131_okyakusama.pdf)).
- **Chỗ trú dưới sân ga, bậc thoát khỏi đường ray, thảm cảm biến người ngã, tấm lấp khe, nút báo khẩn [N, chung]:** loại thiết bị nêu trong Wikipedia, chưa rõ ga Shinkansen nào có cái nào.

### 9.4 Bảo trì và tuyết
- **Xe bảo trì [N]:** mỗi đêm khoảng 50 đoàn xe bảo trì chạy trên Tokaido; tại ga, xe bảo trì quay đầu hoặc đổi đường bằng nhân viên bẻ ghi tay ([JR Central](https://jr-central.co.jp/news/release/_pdf/000044949.pdf)).
- **Tuyết [N]:** vòi phun nước đặt trong đường ray ở Joetsu (từ Jomo-Kogen trở bắc), Tohoku (Hachinohe–Aomori) và Maibara–Sekigahara (68,5 km); không nói riêng sân ga ([trafficnews](https://trafficnews.jp/post/48453/2)).

### 9.5 Chưa tìm được
Cầu thang hoặc thang sắt cho tổ lái (theo người dùng chỉ có ở depot, không cần ở ga); chi tiết mái ga Shinkansen; hàng rào phía ngoài; kích thước thang máy.

### 9.6 Số hiệu ga (駅ナンバリング) của ga Shinkansen: chưa có dữ liệu kiểm chứng (2026-10-24)
- **[N] Không có.** Trang Wikipedia tiếng Nhật của [東海道新幹線](https://ja.wikipedia.org/wiki/%E6%9D%B1%E6%B5%B7%E9%81%93%E6%96%B0%E5%B9%B9%E7%B7%9A), [山陽新幹線](https://ja.wikipedia.org/wiki/%E5%B1%B1%E9%99%BD%E6%96%B0%E5%B9%B9%E7%B7%9A), [東北新幹線](https://ja.wikipedia.org/wiki/%E6%9D%B1%E5%8C%97%E6%96%B0%E5%B9%B9%E7%B7%9A), [九州新幹線](https://ja.wikipedia.org/wiki/%E4%B9%9D%E5%B7%9E%E6%96%B0%E5%B9%B9%E7%B7%9A) và [北陸新幹線](https://ja.wikipedia.org/wiki/%E5%8C%97%E9%99%B8%E6%96%B0%E5%B9%B9%E7%B7%9A) không ghi số hiệu ga riêng cho các ga Shinkansen. Các số trong bảng (JC01, JT03, JR-A46, JB17...) đều là số của tuyến thường hoặc tàu điện nối với ga đó, không phải số của Shinkansen (chỉ đọc 100.000 ký tự đầu mỗi trang, phần cuối chưa đọc).
- **[N] JR Central** chỉ công bố số hiệu cho **tuyến thường** (ví dụ Tokaido: CA-00 Atami, CA-68 Nagoya) ([trafficnews](https://trafficnews.jp/post/79232)); chưa tìm được nguồn nói ga Shinkansen dùng số này.
- **[?]** Các tuyến Joetsu, Hokuriku, Hokkaido, Yamagata, Akita, Nishi-Kyushu chưa kiểm tra riêng.
- **Quyết định:** game **không hiện số hiệu ga** trên biển tên ga cho tới khi có nguồn chính thức cho từng ga. Không dùng số của tuyến thường thay cho số Shinkansen.
