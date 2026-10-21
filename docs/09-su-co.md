# 09 – Sự cố và thiên tai: phân loại, các vụ có thật, thời gian khôi phục và thư viện sự kiện cho game

Nhãn: **[N]** có nguồn (link cuối file) · **[D]** từ dữ liệu trong `data/` · **[I]** suy luận hoặc đề xuất cho game (không phải sự thật đã xác minh) · **[K]** kiến thức nền Claude chưa kiểm chứng · **[?]** chưa rõ hoặc nguồn mâu thuẫn.
Phiên bản 1 (2026-10-21). Liên quan: 04 (trễ, ghép/tách), 05 (điều độ), 06 (ngưỡng gió/mưa/tuyết, thiết bị phát hiện), 07 (xử lý của lái tàu), 08 (depot, bảo trì đêm).

## 1. Bức tranh thống kê và phân loại

### 1.1 Số liệu tổng **[N]**
- **Số vụ cản trở vận chuyển (輸送障害) của Shinkansen JR, năm tài khóa 2022: 122 vụ**, gồm **52 do nguyên nhân bên ngoài** (xâm nhập đường, va chạm động vật…), **34 nguyên nhân nội bộ** (thiết bị, nhân viên) và **36 do thiên tai** (bảng MLIT). Phân tích nhỏ hơn (số vụ va chạm động vật riêng) không có.
- **Trễ trung bình hằng năm (Tokaido)**, tính cả thiên tai: từ khoảng 12 giây (FY2015) đến 1,6 phút (FY2023), 1,4 phút (FY2024) (tài liệu 05). Thiên tai chi phối năm xấu.
- **Số chuyến Tokaido mỗi ngày:** 372 (FY2023), 383 (FY2024).
- **Không tin dùng:** một blog ước lượng tỷ lệ trễ theo mức (dưới 1 phút gần như mỗi ngày, trên 10 phút khoảng 0,1%, trên 30 phút vài đến khoảng chục lần/năm) nhưng **không kèm nguồn và tự mâu thuẫn**, nên chỉ để ý tưởng **[?]**.

### 1.2 Nhóm sự kiện dùng trong game
| Nhóm | Ví dụ | Mục |
|---|---|---|
| **Động đất** | Chuetsu 2004, Tohoku 2011, Kumamoto 2016/2026, Fukushima 2022, Yamanashi 6/2026 | §2 |
| **Mưa, gió, bão, tuyết** | bão 10/2024, mưa Mishima 8/2023, Hagibis 2019, tuyết Sekigahara | §3 |
| **Thiết bị và xe** | nứt bệ 2017, tàu ghép tách 2024–25, E5 phanh khẩn 8/2025 | §4 |
| **Cơ sở hạ tầng, điện** | dây điện võng 1/2024, xe bảo trì, bảo trì kéo dài | §5 |
| **Hành khách, an ninh** | cháy Nozomi 225, đâm Nozomi 265, bệnh đột ngột, lái tàu rời ghế | §6 |
| **Động vật, vật lạ** | va chạm gấu ở Akita Shinkansen | §7 |
| **Báo động giả, dừng phòng ngừa** | cảnh báo động đất khẩn cấp báo quá mức 16/10/2026 | §2.4 |

## 2. Động đất

### 2.1 Cơ chế (nhắc lại) **[N]**
Hệ phát hiện sớm (Terrace của JR Central, UrEDAS và máy đo S-net của JR East) **cắt điện cấp cho tàu** khi dự đoán rung mạnh; tàu **tự phanh khẩn cấp** khi mất điện; lệnh dừng đến tổ lái qua radio tàu. **Mất điện khi có động đất là hành vi bình thường.** Ví dụ: **2016** chuyến Kyushu: 8 tàu khác trên tuyến **tự phanh khẩn cấp khoảng 3 giây sau động đất**; **2011**: hai tàu ở đoạn rung mạnh nhất bị cắt điện **12–15 giây** trước khi vượt ngưỡng dừng.

### 2.2 Các vụ lớn **[N]**
| Vụ | Thông tin chính | Khôi phục |
|---|---|---|
| **23/10/2004, Chuetsu (M6.8)** | **Toki 325** trật bánh ở cầu cạn **Urasa–Nagaoka** khi chạy khoảng **200 km/h**; **8/10 toa trật bánh**; **154 người trên tàu, không ai bị thương**; **lần trật bánh đầu tiên của Shinkansen khi khai thác thương mại từ 1964**; điều tra JR East 2008: không do hư hại công trình mà do **rung lắc theo sóng địa chấn** ("trật bánh kiểu lắc") | chưa có số trong nguồn tra |
| **11/3/2011, Tohoku (M9.0)** | trong vùng Sendai/Morioka có **14 chuyến đang chạy, 13 có khách**; **không chuyến nào trật bánh**; hư hại điện hóa cột ~540 chỗ, cột cầu cạn ~100, trạm biến áp ~10 (bảng so sánh MLIT) hoặc **khoảng 1.200 chỗ** (nguồn khác); cột cầu cạn **đã gia cố chống động đất hoặc xây theo chuẩn mới sau Hanshin 1995 không bị hại** | **49 ngày**: Morioka–Ichinoseki 23/4, Sendai–Fukushima 25/4, Ichinoseki–Sendai 29/4 (toàn tuyến) |
| **14/4/2016 (tiền chấn), Kumamoto** | **đoàn rỗng 6 toa (800 series)** đi từ ga Kumamoto về depot **trật bánh toàn bộ** ở tốc độ khoảng **80 km/h**, cách ga khoảng 1,3 km (hay ~10 km tới depot, hai nguồn khác nhau **[?]**); **không có hành khách**; 8 tàu khác không sao; **bản chấn 16/4 01:25 (M7.3, cường độ 7)** | **13 ngày** toàn tuyến |
| **16/3/2022 23:36, ngoài khơi Fukushima (M7.3)** | **Yamabiko 223** (H5 + E6, 17 toa) giữa Fukushima và Shiroishi-Zao; hệ phát hiện sớm kích hoạt phanh khẩn cấp; dừng cách **Shiroishi-Zao khoảng 2 km**; **16/17 toa trật bánh**; **78 người (75 khách + 3 nhân viên)**: một nguồn ghi **không ai bị thương**, một nguồn của cục vận tải ghi **6 người bị thương** **[?]**; hành khách **chờ khoảng 4 giờ**, xuống bằng cửa thoát hiểm lúc khoảng **3:30 sáng**; hư hại cột điện gãy, ray lệch, cầu cạn, thiết bị ga | **29 ngày** (chạy lại **14/4**, dự kiến ban đầu khoảng 20/4); từng đoạn: 22/3, 2/4, 4/4; **đoạn Koriyama–Ichinoseki chạy chậm**; **biểu đồ tạm khoảng 80%** |
| **1/1/2024, Noto** | toàn tuyến JR East tạm ngừng; **Nagano–Kanazawa** và **Echigo-Yuzawa–Niigata** ngừng cả ngày; Hokuriku chạy toàn tuyến lại **15:20 ngày 2/1** (theo tiêu đề tin) | tuyến thường mới là nơi hại nặng |
| **26/6/2026, Yamanashi (M5.6, độ sâu 20 km, cường độ 6 yếu)** | hệ phòng chống động đất của Tokaido kích hoạt; **tàu hai chiều Tokyo–Shizuoka** dừng khẩn cấp, kiểm tra ray và thiết bị | tài liệu 05 ghi chạy lại toàn bộ sau khoảng **15 phút** |
| **28/7/2026, Kumamoto (cường độ 7)** | **Kyushu Shinkansen** hư hại lớn: **khoảng 600 chỗ** (tiêu đề) hoặc **khoảng 900 chỗ** (nội dung) cùng một bài, **tập trung gần đới đứt gãy Hinagu**, đoạn **Shin-Yatsushiro – Shin-Minamata**; nặng nhất **cầu Mizunagawa** (cách Shin-Yatsushiro ~2 km về phía nam): nhiều trụ **lún và dịch chuyển**, ray hư; ga Shin-Yatsushiro (cột sân ga, tấm ốp, kính); **tường chắn âm rơi** đoạn Kumamoto–Shin-Yatsushiro; một đoạn ray đứt; **35 người chết** trong động đất (tin 31/7) | **Hakata–Kumamoto: 31/7 (3 ngày)**, **Shin-Minamata–Kagoshima-Chuo: 7/8**, **toàn tuyến 18/9 (52 ngày)**; sau đó **khoảng 90% biểu đồ**, **đoạn ~10 km quanh Shin-Yatsushiro giảm tốc 70 km/h**, thời gian Hakata–Kagoshima-Chuo **dài thêm tối đa 8 phút** (so với **13 ngày năm 2016**; một bình luận độc giả cho rằng năm 2016 tâm chấn ở Mashiki, không có Shinkansen, còn 2026 ở khu vực Yatsushiro nơi tuyến đi qua **[?]**) |

### 2.3 Bài học và đối sách **[N]**
- **Trật bánh do rung, không phải do hư công trình** (2004): nhà khai thác đưa **chốt chặn lệch hướng** (逸脱防止ストッパ) ở **toàn bộ 135 đoàn** của JR Central và **thanh chặn trật bánh** trên đường (tài liệu 06); JR East và JR Central có **cách tiếp cận khác nhau** (ngăn lệch hướng so với ngăn trật bánh) **[?]**, chi tiết bị khóa.
- **Tăng cường cột cầu cạn** theo chuẩn sau Hanshin có hiệu quả (2011).
- **Phát hiện sớm hơn:** JR East bổ sung dữ liệu đáy biển S-net từ 11/2017 (tài liệu 06 §5.1).
- **Thời gian khôi phục phụ thuộc loại hư hại:** hệ thống điện và ray mất vài ngày; **trụ cầu lún** hoặc **ga hư** mất cả tháng (2026).

### 2.4 Dừng phòng ngừa và báo động giả **[N]**
**16/10/2026 khoảng 12:40:** do **cảnh báo động đất khẩn cấp (EEW)** (sau đó **hủy**, và Cục Khí tượng nói đã **dự báo quá mức**), **Tokaido Shinkansen dừng hai chiều giữa Shin-Yokohama và Toyohashi**, **chạy lại lúc 12:55 (khoảng 15 phút)**. Đây là mẫu "dừng phòng ngừa ngắn" cho game.

## 3. Mưa, gió, bão, tuyết (ngưỡng đã ở tài liệu 06)

| Vụ | Diễn biến |
|---|---|
| **6/10/2014, bão số 18** | nhiều trạm mưa đạt "mưa liên tục ≥ 150 mm và mưa giờ ≥ 40 mm" nên **ngừng chạy**; Shinagawa–Shizuoka hủy nhiều chuyến; Kodama chỉ ~1 chuyến/giờ Nagoya–Shin-Osaka; liên thông Sanyo ngừng |
| **15/8/2019 (nhiều khả năng), bão số 10** | Sanyo ngừng cả ngày giữa Shin-Osaka và Kokura; Tokaido **chạy quay đầu Tokyo–Shin-Osaka**, hủy khoảng 55–60 chuyến |
| **Hagibis, 12–13/10/2019** | đê sông Chikuma vỡ, **depot Nagano ngập, 10 đoàn bị loại** (tài liệu 08) |
| **Tuyết, 1/2017** | Sekigahara/Tarui ~120 km/h, gần Otsu 170 km/h, đến Kyoto trễ khoảng 25 phút (tài liệu 06) |
| **16/8/2023, mưa lớn** | mưa giờ **80 mm** lúc 8:42, ngưỡng dừng 60 mm; **ngừng đến sau 14 giờ**; bắt đầu từ máy đo Mishima–Shizuoka |
| **16/8/2024, bão số 7** | **công bố 14/8 lúc 18:00**: **ngừng cả ngày Tokyo–Nagoya**, Nagoya–Shin-Osaka cũng ngừng; chạy thêm Kodama tăng cường |
| **30/8/2024, bão số 10** | công bố 29/8: **Mishima–Nagoya ngừng cả ngày**, Nozomi/Hikari **ngừng Tokyo–Shin-Osaka**, Kodama **khoảng 2 chuyến/giờ mỗi chiều** ở Tokyo–Mishima và Nagoya–Shin-Osaka; sau đó **mưa ở Shizuoka** làm **ngừng toàn tuyến từ chuyến đầu**; **Nagoya–Shin-Osaka chạy lại khoảng 10:00**, **Tokyo–Nagoya ngừng cả ngày** |

- **Vì sao ngừng sớm theo kế hoạch (計画運休) [N]:** gió ≥ 30 m/s dừng và ≥ 35 m/s phải kiểm tra ray, nên gió yếu đi vẫn lâu mới chạy lại; vì vậy JR Central **công bố trước 1 ngày** khi dự báo vượt ngưỡng.
- **Chuỗi tác động [I]:** mưa → ngưỡng → dừng đoạn → tàu dừng hai bên → khách tại ga → chạy lại có giới hạn → biểu đồ giảm (như 2022, 2026: ~80–90%).

## 4. Thiết bị và đoàn tàu

| Vụ | Diễn biến |
|---|---|
| **11/12/2017, Nozomi 34 (JR West)** | nứt khung bệ 14 cm trên bệ cao 17 cm, tàu chạy tiếp hơn 3 giờ; **重大インシデント đầu tiên của Shinkansen** (tài liệu 06) |
| **19/9/2024, Hayabusa + Komachi** | tàu ghép **tách nhau khi đang chạy**; phanh tự động dừng; dừng khoảng 5 giờ; theo báo, khoảng cách giữa hai phần sau khi dừng khoảng 300 m **[?]** |
| **6/3/2025, Ueno–Omiya** | **Komachi 21 (toa 7) tách khỏi Hayabusa 21 (toa 8)** khi chạy khoảng **61 km/h**; **17 toa; cách nhau khoảng 8 m**; cần khóa nối mở/đóng không đều; **không có thương vong**; JTSB xếp **重大インシデント**; JR East **ngừng toàn bộ ghép nối**, rồi chạy lại **14/3/2025** có khóa cố định cơ khí; báo cáo 12/2025: một lần do **mảnh kim loại chạm công tắc** (công tắc bị bỏ hẳn), một lần do **bộ điều khiển xuất sai** (tài liệu 04) |
| **24/8/2025, Yamabiko 63** | E5 10 toa **chạy đơn**, giữa Omiya và Oyama **phanh khẩn cấp** vì **thiết bị liên quan ghép nối** hoạt động sai (thiết bị nhận biết ghép và chuyển điện buồng lái); **dừng khoảng 3 giờ**; nguyên nhân chưa rõ **[?]** |

## 5. Hạ tầng, điện và bảo trì

| Vụ | Diễn biến |
|---|---|
| **23/1/2024 ~9:58, Ueno–Oyama (Tohoku), Ueno–Kumagaya (Joetsu/Hokuriku)** | **quả nặng giữ dây điện** hỏng, **dây võng xuống khoảng 150 m** (đoạn Ueno–Omiya, chiều lên), pantograph tàu đi qua bị hư, **mất điện**; **ngừng cả ngày** Tokyo–Sendai và Tokyo–Takasaki; **283 chuyến hủy**, khoảng **120.500 người** bị ảnh hưởng; **hai công nhân bị bỏng khi khôi phục**, mất khoảng **20 giờ**; **JR East chạy tàu tốc hành tạm trên tuyến Joban chỉ trong khoảng 1 giờ**; **Bộ trưởng yêu cầu điều tra** và gửi cảnh báo cho toàn ngành; JR East công bố đối sách 30/1 |
| **2024 (Tohoku)** | 6/3 tàu **chạy quá ga** ở Koriyama; 29/3 trục trặc truyền điện; 2/4 xe công trình rò dầu ở Fukushima (mỗi vụ dừng vài giờ) |
| **23/9/2024, Sanyo** | **đoàn xe bảo trì hỏng trong hầm Hanyu (Sanyo-Onoda)** và công việc bảo trì từ 22/9 **kéo dài**: **Hiroshima–Kokura ngừng từ chuyến đầu hơn 5 giờ, chạy lại khoảng 11:30**, ngày cuối kỳ nghỉ ba ngày (ga đông nghẹt) |
| **Xe bảo trì trật bánh giữa Hamamatsu và Nagoya** | làm đình trệ cả ngày, **hai người bị thương** (nguồn Jiji, ngày không xác định **[?]**) |

Liên hệ tài liệu 08: **bảo trì 0–6 giờ** là cửa sổ cứng; chỉ cần một xe bảo trì hỏng hoặc công việc trễ là tàu đầu bị ảnh hưởng; nhập đổi xe bảo trì ở ga là điểm rủi ro (hệ thống mới dự kiến 7/2029).

## 6. Hành khách, an ninh và vận hành

| Vụ | Diễn biến |
|---|---|
| **30/6/2015, Nozomi 225** | tự thiêu trong toa, **một hành khách tử vong**, MLIT xếp **tai nạn cháy tàu** đầu tiên của Shinkansen (tài liệu 06); nguyên tắc cháy trong hầm: ra khỏi hầm rồi mới dừng (tài liệu 07) |
| **9/6/2018, Nozomi 265 (Shin-Yokohama–Odawara)** | người cầm dao tấn công: **1 người chết, 2 phụ nữ bị thương**; JR Central trước đó đã lắp **camera an ninh** (cuối 12/2017: đã hoàn thành **90% đoàn kiểu N700A**, kể cả toa xảy ra vụ việc); trang bị trong tàu: **khiên, gậy chặn người (sasumata), găng và áo chống dao**, **bình xịt phòng vệ** của tổ lái, **huấn luyện** dùng túi hoặc đệm ghế để tự vệ; **từ 1/4/2019 quy định hành lý cấm mang dao vào toa** (được ghi trong quy định) |
| **2021, Hikari 633** | lái tàu rời ghế khoảng 3 phút (tài liệu 07) |
| **2018** | lái tàu khởi hành sớm 25 giây (tài liệu 07) |
| **Hành khách bệnh đột ngột** | điều độ bàn 輸送旅客 điều xe cứu thương (tài liệu 05) |

- **Chưa tìm thấy [?]:** quyết định về **kiểm tra hành lý ở ga** (chỉ tìm thấy tranh luận "an ninh trong tàu hay kiểm tra hành lý"); số vụ bệnh/xâm nhập mỗi năm.

## 7. Động vật và vật lạ **[N]**
- **Gấu:** **Akita Shinkansen** (Komachi) va chạm gấu; ví dụ **6/2025** tàu dừng **khoảng 40 phút** (lời kể của hành khách, **không phải công bố chính thức**); tiêu đề báo Akita (12/2025): **trong tỉnh có 137 vụ gấu va xe, gấp 6 lần năm trước, tàu 51 vụ** (chỉ thấy tiêu đề); toàn quốc 2025: **số lần gấu xuất hiện kỷ lục (50.801)**, nhiều thương vong. **Số liệu va chạm động vật của JR East và của Komachi mỗi năm không tìm được** **[?]**.
- **Vật lạ trên dây điện, vật bay vào đường:** nằm trong 65 tình huống mô phỏng của JR Central (tài liệu 07); thiết bị phát hiện chưa tìm được (tài liệu 06).

## 8. Khung phản ứng chung và thời gian khôi phục

### 8.1 Các bước **[N]/[I]**
1. **Phát hiện/dừng:** cắt điện, phanh tự động, lái tàu báo điều độ (tài liệu 05–07).
2. **Nắm tình hình:** hiện trường xác nhận; nguyên tắc "dừng trước" (tài liệu 05).
3. **Kế hoạch khôi phục và thông báo** (bàn 輸送列車, 輸送旅客, 情報指令).
4. **Khôi phục từng đoạn:** kiểm tra ray và dây, chạy thử, **chạy chậm**, **biểu đồ giảm** (80–90%).
5. **Đưa khách ra khỏi tàu khi dừng lâu:** ga trung gian, cửa thoát hiểm, cầu nối (tài liệu 05 §5.4); 2022: **chờ ~4 giờ**.
6. **Phục hồi bình thường:** tăng dần số chuyến, bỏ chạy chậm.

### 8.2 Thời gian khôi phục tham chiếu **[N]**
| Sự kiện | Thời gian |
|---|---|
| Cảnh báo động đất khẩn cấp báo quá (10/2026) | khoảng **15 phút** |
| Động đất vừa (Yamanashi cường độ 6, một số vụ) | khoảng **15 phút đến vài giờ** (một vụ tàu chạy lại sau 15 phút) |
| Dây điện võng, mất điện (1/2024) | khoảng **20 giờ** |
| Tàu ghép tách / bảo trì kéo dài (9/2024) | khoảng **5 giờ** |
| Bão (kế hoạch ngừng cả ngày) | **1 ngày** |
| Động đất Kumamoto 2016 | **13 ngày** |
| Động đất Fukushima 2022 | **29 ngày** |
| Động đất Tohoku 2011 | **49 ngày** |
| Động đất Kumamoto 2026 | **52 ngày** (từng đoạn: 3 ngày, 10 ngày, 52 ngày) |

## 9. Thư viện sự kiện cho game **[I]**
Mỗi sự kiện có: **kích hoạt, phát hiện, hành động ngay, thời lượng, hiệu ứng lên lịch, lựa chọn của người chơi**, và **mức độ nghiêm trọng**. Tham số lấy từ bảng ở trên.
| Sự kiện | Kích hoạt | Hiệu ứng | Thời lượng (tham chiếu) | Lựa chọn người chơi |
|---|---|---|---|---|
| EEW báo giả / động đất nhỏ | ngẫu nhiên | dừng vài chục phút một đoạn | 15 phút – vài giờ | chờ, đổi thứ tự khi chạy lại, dồn tàu về ga |
| Động đất lớn | hiếm | ngừng cả đoạn, hư hại từng đoạn, chạy chậm | 3–52 ngày (nhiều giai đoạn) | thứ tự khôi phục đoạn, lịch tạm 80–90%, sơ tán khách |
| Mưa vượt ngưỡng | theo dự báo | dừng hoặc 70 km/h theo ngưỡng | vài giờ – 1 ngày | ngừng theo kế hoạch hay chờ |
| Gió ≥ 30 m/s | bão | dừng; ≥ 35 m/s phải kiểm tra | 1 ngày | công bố trước một ngày, tàu tăng cường |
| Tuyết (Sekigahara) | mùa đông | giới hạn 120–170 km/h | theo ngày | chấp nhận trễ, đổi Kodama |
| Dây điện/ điện | thiết bị | mất điện một đoạn | ~20 giờ | cứu bằng tuyến khác, quay đầu |
| Tàu ghép tách / phanh khẩn | thiết bị | dừng giữa đường, kiểm tra | 3–5 giờ | bỏ ghép (x, y), chạy tàu đơn |
| Bảo trì kéo dài | đêm | tàu đầu trễ/ngừng | vài giờ | đổi đoàn, chạy bù |
| Hành khách bệnh | ngẫu nhiên | dừng tại ga | vài phút | kéo dài dừng ga, cho tàu sau vượt |
| An ninh (cháy, dao) | rất hiếm | dừng khẩn cấp, cảnh sát | vài giờ | dừng/ra khỏi hầm, báo điều độ |
| Gấu va chạm (Akita) | theo mùa | dừng, kiểm tra | ~40 phút | chuyển ghép, đổi tàu |
- **Mối quan hệ với các tài liệu khác:** ngưỡng chạy chậm/dừng (06), thao tác lái (07), điều độ (05), depot và bảo trì (08), thời gian chạy/dừng (04).
- **Kịch bản "tháng thiên tai":** bão + động đất + sự cố thiết bị trong một ngày để thử khả năng chịu tải của lịch (như tuần 9/2024).

## 10. Lỗ hổng: đã cố tra nhưng không công khai hoặc nguồn yếu **[?]**
- **Thống kê chi tiết theo nguyên nhân:** số vụ va chạm động vật, bệnh/xâm nhập mỗi năm; chỉ có tổng FY2022 (122/52/34/36).
- **Số chuyến/số người bị ảnh hưởng** của nhiều vụ nhỏ.
- **Chi tiết hư hại năm 2022 và 2004:** số cột/cầu; thời gian khôi phục 2004.
- **Cách JR East và JR Central khác nhau về chống trật bánh** (bài bị khóa); số chốt chặn trên tuyến.
- **Xử lý hành khách khi dừng lâu** ngoài ví dụ 2022 (nước, toilet), số lần dừng lâu mỗi năm.
- **Số liệu va chạm gấu của Komachi** và **chi tiết vụ xe bảo trì trật bánh Hamamatsu–Nagoya** (ngày).
- **Điều tra nguyên nhân E5 phanh khẩn 8/2025**; **tình trạng an ninh** (kiểm tra hành lý) sau 2019.

## Nguồn
- Động đất: [MLIT – 2011 Tohoku (000141656)](https://www.mlit.go.jp/common/000141656.pdf), [trafficnews – chạy lại Tohoku 14/4/2022](https://trafficnews.jp/post/117653), [Toyo Keizai – trật bánh 2022](https://toyokeizai.net/articles/-/539930), [JR East – Chuetsu 2004](https://www.jreast.co.jp/e/investor/ar/2005/pdf/ar2005_17.pdf), [JTSB – RA2007-8-1e (Toki 325)](https://jtsb.mlit.go.jp/eng-rail_report/English/RA2007-8-1e.pdf), [kumanichi – trật bánh 2016](https://kumanichi.com/articles/1916943)
- 2026: [kumanichi – Kyushu chạy lại 52 ngày](https://kumanichi.com/articles/2037194), [kumanichi – khó chạy lại (6/8)](https://kumanichi.com/articles/2022842), [sakigake – hư hại 600/900 chỗ](https://www.sakigake.jp/news/article/20260819CO0114/), [carview – so với 2016](https://carview.yahoo.co.jp/news/detail/24a70934c3c9e1a2fce0c3fd00c773ac6fc044b0/?mode=short), [udn – Yamanashi 6/2026](https://udn.com/news/story/6812/9591366), [NHK – EEW 16/10/2026](https://news.web.nhk/newsweb/na/nd-20261016de60374)
- Bão, mưa: [trafficnews – bão 10/2024](https://trafficnews.jp/post/134653), [trafficnews – 16/8/2024](https://trafficnews.jp/post/134346), [trafficnews – mưa 2023](https://trafficnews.jp/post/127583), [trafficnews – ngưỡng mưa 2014](https://trafficnews.jp/post/36226/), [shizuoka-np – gió 30/35 m/s](https://www.at-s.com/snews/article/ats/1866326.html)
- Thiết bị, điện: [JTSB – tiến độ 3/2025](https://jtsb.mlit.go.jp/railway/p-pdf/keika20260219-2-p.pdf), [sakigake – E5 phanh 24/8/2025](https://www.sakigake.jp/news/article/20250826CO0091/), [J-CAST – 9/2024](https://www.j-cast.com/2024/09/23493912.html?p=all), [Biz Journal – dây điện 23/1/2024](https://biz-journal.jp/2024/01/post_371599.html), [jiji – dây điện](https://sp.m.jiji.com/english/show/30856), [jiji – xe bảo trì trật bánh](https://sp.m.jiji.com/english/show/34388)
- An ninh: [Toyo Keizai – Nozomi 265](https://toyokeizai.net/articles/-/225309), [trafficnews – cấm dao 2019](https://trafficnews.jp/post/82496), [itmedia – cháy Nozomi 225](https://www.itmedia.co.jp/makoto/spv/1507/03/news012.html)
- Động vật: [sakigake – gấu và tàu](https://www.sakigake.jp/news/article/20251207AK0010/), [kumanichi – Akita Shinkansen va gấu](https://kumanichi.com/articles/2008375)
- Thống kê: [MLIT – cản trở vận chuyển](https://www.mlit.go.jp/tetudo/content/001446491.pdf)
