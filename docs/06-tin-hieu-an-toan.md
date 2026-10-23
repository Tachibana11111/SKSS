# 06 – Tín hiệu và an toàn

Nhãn: **[N]** có nguồn (link cuối file) · **[D]** rút ra từ dữ liệu trong `data/` · **[I]** suy luận hoặc đề xuất cho game, chưa phải sự thật đã xác minh · **[K]** kiến thức nền Claude chưa kiểm chứng · **[?]** chưa rõ hoặc nguồn mâu thuẫn.
Phiên bản 1 (2026-10-20). Liên quan: tài liệu 02 (hạ tầng, điện), 03 (phanh, gia tốc), 04 (headway thực tế), 05 (điều độ), 09 (sự cố và thiên tai).

## 1. Nguyên lý: tín hiệu nằm trong buồng lái, hệ thống tự phanh **[N]**
- Ở tốc độ cao, người lái **không thể dựa vào đèn tín hiệu bên đường**. Tín hiệu cho biết **tốc độ cho phép** và hiện ngay trên đồng hồ trong cabin; hệ thống **ATC** (Automatic Train Control) so tốc độ thực với tốc độ cho phép, **vượt thì tự phanh**, về mức cho phép thì nhả phanh. Từ **1/10/1964** (Tokaido khai trương).
- Khác với **ATS** trên tuyến thường: ATS không kiểm tra tốc độ liên tục mà chỉ can thiệp khi đã xảy ra việc như vượt tín hiệu; Shinkansen chọn ATC vì tốc độ cao và quãng phanh dài vài km.
- Nguyên lý tương tự (analog): dòng tín hiệu ATC chạy trong **mạch ray (軌道回路)** của từng khối; ăng-ten ở đầu đoàn thu bằng cảm ứng, mạch trên tàu giải mã thành tốc độ cho phép. Tàu phía sau nhận tín hiệu của khối phía trước thấp hơn khi có tàu chạy trước.

## 2. Các hệ ATC theo tuyến **[N]**

| Hệ | Dùng ở | Từ khi | Ghi chú |
|---|---|---|---|
| ATC-1 (1A, 1B, 1D, 1W) | Tokaido, Sanyo | 1964 | Analog, **phanh nhiều bậc**. 1A cho 210 km/h; 1D sửa sau sự cố depot Osaka, hai tần số, hợp 50/60 Hz |
| ATC-2 | Tohoku, Joetsu (Hokuriku dùng ATC-HS) | năm khai trương không nêu trong nguồn (khoảng 1982 **[K]**) | Dựa trên ATC-1D. Thay bằng DS-ATC |
| **ATC-NS** | **Tokaido, Sanyo, Hakata-Minami** | Tokaido **18/3/2006**; Sanyo 19/2/2017 (dùng cho lịch mới từ **4/3/2017**) | Số hóa, **phanh một giai đoạn**; tàu **tự tính đường cong giảm tốc** |
| **DS-ATC** | Tohoku, Joetsu, Hokuriku, Hokkaido (kể cả Seikan) | 12/2002 (Morioka–Hachinohe); xong Tohoku 2007; **toàn tuyến JR East 2013**; Hokkaido **22/3/2016** | Số hóa; tàu **chọn mẫu giảm tốc tạo sẵn** (từ cơ sở dữ liệu trên tàu) |
| **KS-ATC** | Kyushu, Nishi-Kyushu | trước ATC-NS | Giống ATC-NS nhưng khi dừng ga phanh **ba giai đoạn** |
| RS-ATC | Tohoku/Joetsu (dự phòng) | | Vô tuyến, **giới hạn 110 km/h**, mỗi ga một tàu |
| ATC-L (cũ) | Seikan | 1987 → thay bằng DS-ATC 22/3/2016 | |

**Khác biệt ATC-NS và DS-ATC [N]:** DS-ATC gửi thông tin điểm dừng, tàu tra mẫu giảm tốc **đã lưu sẵn**; ATC-NS gửi **số khối phía trước, mã tuyến, giới hạn tốc độ tạm thời**, tàu **tự tính** mẫu giảm tốc theo thời gian thực. Trang tham khảo nói ATC-NS lúc mới triển khai từng có lỗi tính toán dẫn đến tín hiệu dừng, còn DS-ATC ít gặp hơn.

## 3. Cấp tốc độ tín hiệu **[N]**
- **Tokaido/Sanyo (ATC-1):** ban đầu 0 · 30 · 70 · 110 · 160 · 210 km/h; sau mở rộng lên 300: **0 · 30 · 70 · 120 · 170 · 220 · 230 · 255 · 270 · 275 · 285 · 300**.
- **Tohoku/Joetsu/Hokuriku (ATC-2):** 0 · 30 · 70 · 110 · 160 · 210 · 240, sau thêm 260 và 275.
- **Tín hiệu 0 có ba loại (ATC-1):** 01, 02 (đi tiếp sau khi lái tàu **bấm xác nhận**) và **03 = dừng tuyệt đối**. Dưới 30 km/h phải bấm nút xác nhận (確認ボタン) thì phanh ATC mới nhả; với DS-ATC không cần xác nhận dưới 75 km/h.
- **Phanh nhiều bậc (cũ):** gần ga hạ giới hạn từng nấc (vd. 270 → 230 → 170), tàu phanh và nhả nhiều lần, xóc, tốn thời gian và hạn chế rút headway. **Phanh một giai đoạn (số hóa):** giảm một lần từ tốc độ đang chạy xuống tốc độ mục tiêu, êm hơn và rút thời gian chạy.

## 4. Chi tiết kỹ thuật các lớp bảo vệ

### 4.1 Dự phòng của thiết bị trên tàu **[N]**
Bộ thu ATC trên tàu có **3 hệ**, bộ kiểm tra tốc độ có **3 kênh độc lập**; **phanh chỉ tác động khi cả 3 kênh cùng ra lệnh**. Máy phát tốc độ (2 cái), bộ điều khiển, đồng hồ tốc độ kèm đèn tín hiệu. Với DS-ATC/ATC-NS: cơ sở dữ liệu tuyến và mẫu tốc độ nằm trên tàu, đo quãng đường bằng máy phát tốc độ và **hiệu chỉnh vị trí bằng bộ phát đáp (transponder)** dưới đường.

### 4.2 Mặt đất
- Mạch ray gửi tín hiệu theo khối; **trạm điểm P** cách biên khối khoảng **150 m** phát tín hiệu P; **vòng cảm ứng** trước đường xuất phát phát tín hiệu **03** (khi không có lộ trình, tín hiệu 03 luôn được phát) **[N]**.
- **Cảm biến xâm nhập** ở các điểm nhập tuyến chung để chặn tàu khác nếu tàu vượt mốc dừng **[N]**.
- Ga cuối không có đoạn vượt đủ dài có **thiết bị kiểm soát tốc độ dừng (速度照査停止制御装置)**; Tokaido dùng **6 cảm biến trục bánh và 3 vòng cảm ứng** **[N]**.
- **Liên động và ATC hợp nhất:** **SAINT-LAN** (Shinkansen ATC and Interlocking System – LAN, Hitachi) tích hợp ATC và liên động (cũng dùng DS-ATC); thiết bị liên động điện tử dòng ADX2000; mặt đất ATC-NS có CTC-W **[N]**.
- **CTC/PRC:** điều khiển tập trung từ trung tâm, tự động đặt lộ trình theo biểu đồ (xem tài liệu 05).

### 4.3 Hỗ trợ khi vào ga Tokyo (Tokaido) **[N]**
Điểm bắt đầu phanh ATC khi vào ga Tokyo được dời **gần vị trí dừng** hơn (để rút thời gian); để giúp người lái phanh tay, có **chức năng hỗ trợ dừng**: tàu nhận tín hiệu từ **transponder** trước ga; dưới **30 km/h** người lái bấm "確認扱い" cho ATC nhả phanh; nếu phanh tay không đủ và tàu vào vùng **phanh hỗ trợ**, phanh hỗ trợ tự tác động để tránh **chạy quá**.

### 4.4 Thiết bị hỗ trợ khác **[N]**
- **Chạy tốc độ không đổi (N700A, chỉ Tokaido):** người lái bấm công tắc khi lịch rối; hệ thống lấy tín hiệu và tình trạng ray từ ATC, đặt tốc độ mục tiêu, chọn lực kéo/phanh tối ưu để **bù trễ nhanh**.
- **Hệ thống tự động vận hành GOA2 (N700S)** đang phát triển (xem §8).

## 5. Phản ứng khi mất tín hiệu hoặc sự cố thiết bị **[N]**
- ATC-1: tàu không được xác nhận dưới 30 km/h thì **phanh ATC vẫn giữ** và tàu dừng.
- DS-ATC: nếu người lái không thao tác tay, phanh ATC đưa tàu **dừng ở cuối lộ trình**.
- **Mất tín hiệu ATC, hỏng thiết bị hay tàu lùi** (theo mô tả cho D-ATC của tuyến thường): **phanh khẩn cấp ngay**. Nguyên tắc **fail-safe**: không có tín hiệu thì coi là dừng.
- **Mất điện** (vd. khi động đất): tàu **tự phanh khi dừng cấp điện** (xem 5.2).

### 5.1 Hệ thống cảnh báo động đất (nhắc lại từ tài liệu 02) **[N]**
Tokaido: "Terrace" (21 máy đo xa cách tuyến >50 km, phát hiện sóng P) cùng máy đo dọc tuyến; khi cảnh báo, **trạm biến áp tự động cắt điện cấp cho tàu**, tàu phanh trước khi sóng S tới. JR East: UrEDAS, dùng thêm dữ liệu đáy biển S-net từ 11/2017. Việc điều khiển cho tàu **dừng khẩn cấp** đi qua radio tàu tới tổ lái.

### 5.2 Bảo vệ tàu (防護無線) **[N]**
Trên tuyến thường, **防護無線** (radio bảo vệ) là tín hiệu nguy hiểm báo cho **các tàu quanh hiện trường dừng ngay** (khi có sự cố như trật bánh có thể lấn sang đường bên cạnh); trước đây phải đặt pháo hiệu cách 800 m. Tín hiệu có thể nhận được cả từ tuyến khác; trên tuyến thường JR Central lắp radio bảo vệ ở **mọi buồng lái** **[N]**.

**Với Shinkansen, các cơ chế bảo vệ tìm được [N]:**
- **EGS (công tắc nối đất bảo vệ):** khi nhân viên phát hiện bất thường, bấm để **cắt cưỡng bức điện cấp cho dây điện trên không** và **phanh khẩn cấp các tàu gần đó** (JR Central nêu trong báo cáo an toàn; nguồn không nói rõ chỗ lắp trên Shinkansen).
- **Công tắc bảo vệ tàu** ở lối đi bảo trì dọc tuyến và **máy phát radio bảo vệ cầm tay** cho nhân viên làm việc để báo khẩn cho các tàu gần đó.
- **Hệ radio tàu số dùng cáp rò (LCX)** nối điều độ viên với tổ lái; từ thời Tokaido–Sanyo cũ đã có radio tàu, radio bảo vệ, radio nội bộ ga và cảnh báo xe bảo trì tiến gần (nguồn 1982, cấu hình hiện nay có thể khác).
- **Chưa xác nhận [?]:** người lái Shinkansen có tự bấm radio bảo vệ như tuyến thường không, và có chức năng **tự động ép dừng tàu ở đường kề** khi có sự cố hay không (nguồn không nêu).

### 5.3 Gió, mưa, tuyết (tài liệu 09 chi tiết)
- **Mưa (Tokaido) [N]:** quy tắc 2014: **chạy chậm 70 km/h** khi mưa 1 giờ ≥ **50 mm**, hoặc mưa liên tục ≥ **250 mm** và mưa 10 phút ≥ 2 mm; **dừng** khi mưa 1 giờ ≥ **60 mm**, hoặc liên tục ≥ **300 mm** và 10 phút ≥ 2 mm, hoặc liên tục ≥ **150 mm** và mưa giờ ≥ **40 mm** (ví dụ bão số 18 ngày 6/10/2014). Báo 2023: chỉ số chính là **mưa theo giờ, ngưỡng 60 mm** (có 4 chỉ số); khi mới khai trương ngưỡng chỉ **30 mm** và được nâng lên 60 mm nhờ gia cố nền đắp. **Khoảng một nửa Tokaido là nền đắp** (Sanyo 18%, Joetsu 1%), nên dễ ngừng; từ **tháng 6/2022** thêm chỉ số **土壌雨量指数** (lượng nước trong đất) của Cục Khí tượng; JR Central tháng 5/2025 chuyển sang đặt **ngưỡng riêng từng máy đo mưa**, và 5/2026 công bố rà soát quy định mưa.
- **Gió [N]:** **Tokaido: dừng khi gió ≥ 30 m/s; ≥ 35 m/s phải có nhân viên kiểm tra ray và thiết bị** (nên gió yếu đi vẫn lâu mới chạy lại). **JR East (Shinkansen):** quyết định theo **gió tức thời** từ máy đo kiểu 3 cốc; **bất kỳ một máy nào vượt ngưỡng** là ra lệnh hạn chế; còn có **hệ cảnh báo gió mạnh** dự đoán gió tối đa, **vượt ngưỡng thực hoặc dự báo** đều kích hoạt; số máy đo gió Shinkansen **158** (2012; 89 năm 2005). Ví dụ: 4/4/2026 Hokuriku Shinkansen dừng Nagano–Toyama vì máy đo giữa Iiyama và Joetsu-Myoko vượt ngưỡng. **Ngưỡng cụ thể cho Shinkansen JR East không tìm được** (giá trị của tuyến thường: 20 m/s hạn chế 25 km/h, 25 m/s hạn chế 25 km/h, 30 m/s dừng; điều kiện giải trừ **30 phút liên tục không vượt ngưỡng**) **[?]**.
- **Tuyết (Tokaido) [N]:** đoạn **Maibara – Sekigahara – Gifu-Hashima**; tốc độ tối đa đo được trong một ngày tuyết (1/2017): khoảng **120 km/h** ở Sekigahara/Tarui, **170 km/h** gần Otsu, rồi tăng lên khoảng **230 km/h** sau Kyoto (thay vì 285). Lý do: tuyết cuộn lên bám thân tàu, thành khối băng rơi làm bắn đá ba lát. **Vòi phun nước dọc khoảng 70 km** (Gifu, Shiga) làm tuyết ướt, lượng nước giới hạn **khoảng 5 mm/giờ** (để nền không yếu đi). Tokaido Shinkansen đến Kyoto trễ khoảng 25 phút trong ví dụ đó. Tohoku: có hệ **phun nước tan tuyết** đoạn Hachinohe–Shin-Aomori; Joetsu đã dùng từ **1982**. Ngưỡng lượng tuyết cụ thể không tìm được **[?]**.

### 5.4 Thiết bị phát hiện bất thường **[N]**
- **Nhiệt độ gầm bệ:** JR Central đặt máy đo hồng ngoại **bên cạnh và dưới ray** ở **5 điểm** trên toàn tuyến Tokaido, đo nhiệt độ bánh xe và hộp trục của mỗi tàu đi qua; theo dõi **xu hướng nhiệt giữa các điểm** để phát hiện sớm hơn.
- **Áp suất lò xo hơi:** phân tích tự động cho **mọi đoàn**; **N700S** có hệ **phát hiện rung bệ** nâng cấp, dữ liệu truyền vô tuyến về trung tâm phân tích, nhân viên **giám sát 24/24** để tìm "dấu hiệu bất thường".
- **Chống trật bánh lấn ra ngoài:** **chốt chặn lệch hướng** gắn giữa bệ của **toàn bộ 135 đoàn** của JR Central và **thanh ray chắn trật bánh** đang lắp trên đường.
- **Dây điện trên không:** thiết bị đo ba chiều dây điện và phát hiện lỗi phụ kiện, gắn **trên nóc** tàu chạy (công bố 2023); công nghệ phát hiện vật cản gần dây điện từ tàu thương mại (công bố 10/2025).
- **JR East:** nghiên cứu **phát hiện trật bánh** cho tàu **không người lái** (tàu ngoài cuộc phải được báo để dừng).
- **Chưa tìm thấy [?]:** thiết bị phát hiện **đá lăn, vật lạ trên ray** hoặc người xâm nhập đường chuyên dụng (hàng rào cao là biện pháp chính; tài liệu 04).

## 6. Dữ liệu an toàn
- **Không có tai nạn trật bánh hoặc va chạm gây chết hành khách** trên các tuyến Shinkansen khổ chuẩn kể từ 1964 (JR Central: không có trật bánh/va chạm của tàu khai thác thương mại, không có hành khách trên tàu tử vong hay bị thương vì tai nạn tàu). Đây là nền tảng của việc dùng ATC và đường chuyên dụng trên cầu cạn **[N]**.
- **Ngoại lệ về định nghĩa [N]:** vụ **tự thiêu trên Nozomi 225 ngày 30/6/2015** làm hành khách tử vong (MLIT xếp là **tai nạn cháy tàu** đầu tiên của Shinkansen); các ca tử vong khác như ngã tại ga Mishima (12/1995) và điện giật tại Shin-Yokohama (2014) không phải do tàu va chạm hay trật bánh. Vì thế "tử vong bằng 0" phụ thuộc cách định nghĩa tai nạn.
- **Sự cố nghiêm trọng không có người chết [N]:**
  - **4/2016:** Kyushu Shinkansen trật bánh trong động đất Kumamoto **[N]** (đoàn rỗng 6 toa đang về depot, trật bánh toàn bộ ở ~80 km/h, không khách; xem 09 §2.2 **[N]**).
  - **11/12/2017, Nozomi 34 (JR West, Hakata → Tokyo):** có mùi lạ và tiếng ồn, tàu chạy tiếp hơn **3 giờ**; kiểm tra tại Nagoya mới thấy rò dầu và **khung bệ nứt 14 cm (bệ cao 17 cm, còn 3 cm là gãy)**; **vụ "sự cố nghiêm trọng" (重大インシデント) đầu tiên của Shinkansen**; báo cáo JTSB 3/2019 kết luận lỗi của nhà sản xuất bệ (Kawasaki Heavy Industries) lẫn JR West; JR West đặt người phụ trách an toàn chuyên trách Shinkansen, nguyên tắc "**không do dự, dừng tàu**", huấn luyện nhận biết mùi, thay toàn bộ bệ lỗi (xong 5/12/2018), thêm giám sát nhiệt độ và thiết bị phát hiện bất thường bệ.
  - **9/2024 và 3/2025:** tàu ghép Hayabusa/Komachi **tách nhau khi đang chạy** (xem tài liệu 04 mục 7); Bộ Đất đai (MLIT) xếp là **重大インシデント**, JTSB cử 3 điều tra viên.
- **Tính đến 2026:** **không tìm được tai nạn làm chết hành khách trên Shinkansen trong 2025–10/2026** (lượt tìm chỉ ra các sự cố nghiêm trọng nêu trên, không có số tử vong); không có thống kê chính thức cập nhật trong tay **[?]**. Bài Tomii (2010) ghi "46 năm không có hành khách tử vong hay bị thương trên tàu".

## 7. Headway, khối đường và giới hạn thực tế

### 7.1 Những gì có nguồn
- Nguồn tìm được **không công bố** chiều dài khối, công thức khoảng cách an toàn, hay headway thiết kế (Wikipedia tiếng Nhật, trafficnews, toretabi, JR Central đều không có số). **Phanh khẩn cấp ở 285 km/h dừng sau khoảng 3 km** (N700A; tài liệu 03) **[N]**.
- Lợi ích của ATC số: **rút thời gian giảm tốc nên tăng số chuyến**, phục hồi nhanh khi trễ **[N]**.
- JR Central **xếp giờ theo đơn vị 15 giây** cho giờ đến/qua/đi mỗi ga **[N]**.

### 7.2 Phân tích từ dữ liệu **[D]/[I]**
- **3 phút là khoảng cách tối thiểu thực tế** giữa hai chuyến cùng chiều (tài liệu 04: lặp 24–90 lần/chiều ở Shin-Osaka; mọi giờ khởi hành Tokaido là bội số của 3).
- **Ở 285 km/h (≈ 79 m/s), 3 phút tương đương khoảng 14 km** giữa hai tàu cùng tốc độ, tức **dài hơn nhiều** quãng phanh ~3 km. Vậy trên **đường hở, giữa hai ga, khối đường không phải nút thắt** của headway 3 phút **[I]**.
- **Nút thắt nằm ở ga và điểm nhập/tách** **[I]**: số đường và đường thông qua (tài liệu 02), thời gian chiếm sân khi quay đầu (15 phút Tokaido ⇒ cần nhiều sân), chuyển ghi, và **tàu nhanh vượt tàu chậm** (tàu chậm dừng chờ 3–6 phút; tài liệu 04). JR Central cũng dời điểm phanh ATC ở Tokyo gần sân dừng để rút thời gian vào ga (§4.3).
- **Cận dưới lý thuyết của khoảng cách tàu [I]:** nếu khoảng cách an toàn tối thiểu giữa hai tàu cùng tốc độ xấp xỉ quãng phanh khẩn cấp **3.000 m**, thì ở 285 km/h (79,2 m/s) khoảng cách thời gian tối thiểu chỉ khoảng **38 giây (cộng biên an toàn)**. Con số này **nhỏ hơn nhiều** 3 phút của lịch thực; nghĩa là headway 3 phút là **ràng buộc vận hành ở ga và điểm nhập tuyến**, không phải giới hạn của ATC trên đường hở. Đây là suy luận từ hai số có nguồn (quãng phanh ~3 km và tốc độ 285 km/h), **không** phải số do JR Central công bố.
- **Chiều dài khối (閉塞区間): không tìm được số trong mọi nguồn công khai** (Wikipedia tiếng Nhật và Anh, JR Central, JR East, MLIT, bài báo kỹ thuật, bốn lượt tìm riêng). Chỉ biết nguyên tắc: đường chia thành các đoạn cố định, mỗi đoạn một tàu; khối càng dài thì khoảng cách phanh càng thoải mái nhưng headway càng lớn; khối ngắn hơn là lợi ích của phanh một giai đoạn **[N]**. Dùng **giả định tham số hóa [I]** cho game (ví dụ cho phép cấu hình khối 1–3 km), đánh dấu rõ là giả định.
- **Hệ quả cho mô phỏng [I]:** có thể mô hình hóa headway tối thiểu 3 phút **tại ga/điểm xung đột** (ô thời gian), không cần tách khối đường chi tiết; khối đường chỉ cần khi mô phỏng **tàu chậm chạy trước** (tàu sau bị giới hạn tốc độ).

## 8. Xu hướng: tự động hóa và vô tuyến **[N]**
- **JR Central** phát triển **hệ thống tự động vận hành GOA2** cho Tokaido (N700S): **vẫn có lái tàu ngồi trên tàu** để xử lý bất thường, hệ thống hỗ trợ điều khiển. Hệ gồm (1) **chạy đúng giờ tự động:** tính **đường cong vận hành theo thời gian thực** từ tín hiệu phía trước, giới hạn tạm thời (kể cả chạy chậm đột xuất), độ dốc, hầm, giờ hiện tại và giờ qua/đến các ga; kiểm tra **mỗi 0,1 giây** xem có đến đúng giờ không và cập nhật; (2) **TASC (dừng đúng vị trí):** tạo mẫu phanh theo bộ phát đáp ở ga; dùng dữ liệu hàng loạt của tàu thương mại để tối ưu thời điểm phanh. Thử ban đêm từ **11/2021**; công bố thử Hamamatsu–Shizuoka ngày **11/5/2023** (qua Kakegawa đúng giờ, vào Shizuoka sớm 2 giây).
- **JR East – ATC vô tuyến [N]:** theo báo chí 2019, JR East dự kiến đưa **ATC vô tuyến** làm hệ bảo vệ thế hệ kế tiếp của Shinkansen, gắn với **ATO (tự động lái)** và mục tiêu tàu **không người lái** cho đoàn tàu mới dự kiến đưa vào cùng **đoạn Sapporo (xuân 2031 theo bài 2019; hiện nhiều khả năng lùi sang khoảng FY2038, xem tài liệu 01)**. Shinkansen **đã có RS-ATC vô tuyến** làm dự phòng (110 km/h): dùng khi DS-ATC không dùng được hoặc khi chạy luân phiên trên một đường lúc sự cố. Tàu thử **ALFA-X** dùng để thử độ tin cậy thiết bị ATC vô tuyến trên tàu. Ngày triển khai cụ thể cho Shinkansen **chưa có** **[?]**; đối với tuyến thường, ATACS dự kiến 2028–2031 (Yamanote, Keihin-Tohoku).
- Điều này liên quan trực tiếp tới tài liệu 07 (lái tàu): người lái ngày nay vẫn tự tính tốc độ theo giờ ghi trong biểu đồ (giờ qua/đến, chạy chậm kế hoạch, thời tiết).

## 9. Ý nghĩa cho game **[I]**
- **Mô hình tín hiệu cho người chơi lái tàu:** đồng hồ tốc độ kèm **tốc độ cho phép (ATC)**; vượt thì phanh tự động (và bị phạt); bậc tốc độ theo bảng §3; **nút xác nhận** dưới 30 km/h (Tokaido) hoặc 75 km/h (DS-ATC); phanh nhiều bậc/một giai đoạn tùy tuyến.
- **Mô hình điều độ:** khoảng cách tối thiểu 3 phút ở ga/điểm xung đột; tàu chậm chạy trước giới hạn tàu sau (tín hiệu hạ cấp); lỗi ATC → tín hiệu 0 → phải dừng và xử lý (tài liệu 09).
- **Sự cố tín hiệu hợp lý hóa:** mất tín hiệu → phanh; lỗi ATC-NS tính toán → tín hiệu dừng; mất điện/động đất → tàu tự phanh; bảo vệ tàu quanh hiện trường.
- **Chế độ "tự động":** có thể làm như GOA2 (tàu tự đúng giờ, người chơi giám sát), dùng cho người chơi chỉ muốn điều độ.
- **Phân biệt hai thế giới:** Tokaido/Sanyo (ATC-NS, 60 Hz), Tohoku/Joetsu/Hokuriku/Hokkaido (DS-ATC, 50 Hz), Kyushu (KS-ATC); khác nhau ở cách phanh khi vào ga (hai giai đoạn dừng ở 30 km/h so với 75 km/h; ba giai đoạn ở Kyushu).

## 10. Lỗ hổng: đã giải quyết và còn lại

**Đã giải quyết:**
- **Gió Tokaido:** dừng ở 30 m/s, kiểm tra ở 35 m/s (§5.3). **Mưa:** bộ ngưỡng 2014 đầy đủ và lịch sử (30 mm → 60 mm), tỉ lệ nền đắp, chỉ số đất. **Tuyết:** tốc độ 120/170/230 km/h, phun nước 70 km (§5.3).
- **Gió JR East Shinkansen:** cơ chế (3 cốc, gió tức thời, một máy vượt là hạn chế, dự báo, 158 máy) và ví dụ 4/4/2026 (§5.3).
- **Bảo vệ tàu và thiết bị phát hiện:** EGS, công tắc bảo vệ, radio cầm tay, LCX; nhiệt độ gầm bệ (5 điểm), rung bệ N700S, chốt chặn lệch hướng (135 đoàn), đo dây điện (§5.2, §5.4).
- **ATC vô tuyến của JR East:** kế hoạch (2019), RS-ATC dự phòng, thử trên ALFA-X (§8).
- **Số liệu an toàn 2025–2026:** không có tử vong; các sự cố nghiêm trọng 2016, 2017, 2024–2025 (§6).
- **Headway thiết kế:** không có số công bố, nhưng đã có **cận dưới lý thuyết ~38 giây** và giải thích vì sao 3 phút là ràng buộc ở ga (§7.2).

**Không giải quyết được (đã thử nhiều nguồn, không công khai):**
- **Chiều dài khối đường** và **công thức khoảng cách an toàn**: dùng giả định tham số hóa nhãn [I].
- **Mẫu giảm tốc cụ thể** của ATC-NS/DS-ATC và **cấp tốc độ chi tiết của hệ số hóa**: nguồn chỉ nêu nguyên lý (tàu tính hay chọn mẫu); số hóa dùng mẫu liên tục nên không có bậc cố định như analog.
- **Ngưỡng gió cụ thể của Shinkansen JR East**, **ngưỡng lượng tuyết**: chỉ có cơ chế.
- **Thông số ATC riêng của Nishi-Kyushu** (số giai đoạn phanh): chỉ biết dùng KS-ATC cùng Kyushu.
- **Radio bảo vệ trên buồng lái Shinkansen** có do người lái bấm không, và có tự ép dừng tàu ở đường kề không: chưa xác nhận.
- **Phát hiện đá lăn và vật lạ trên ray**: không tìm được thiết bị.

## Nguồn
- Wikipedia tiếng Nhật: [自動列車制御装置](https://ja.wikipedia.org/wiki/自動列車制御装置), [デジタルATC](https://ja.wikipedia.org/wiki/デジタルATC)
- JR Central Technological Report: [東海道新幹線の自動運転システムに関する技術開発](https://company.jr-central.co.jp/company/technology/_pdf/report_02.pdf)
- trafficnews: [山陽新幹線で新ATC導入 (2017)](https://trafficnews.jp/post/61664/); [防護無線](https://trafficnews.jp/post/94088); [地震時の車内](https://trafficnews.jp/post/56714/2)
- toretabi: [ATC (トレたび)](https://toretabi.jp/train/vol40/01.html); newswitch: [ATC-NS](https://newswitch.jp/p/8219)
- Hitachi Review: SAINT/SAINT-LAN [2007_11_07](https://www.hitachihyoron.com/jp/pdf/2007/11/2007_11_07.pdf)
- JR East: [強風規制(tuyến thường)](https://www.jreast.co.jp/eco/pdf/pdf_2008/p10_11.pdf); [地震対策 (UrEDAS/S-net) báo cáo](https://www.jreast.co.jp/eco/report/pdf_2013/p56.pdf)
- JR Central: [Terrace](https://jr-central.co.jp/news/release/_pdf/000014824.pdf); mưa: [trafficnews](https://trafficnews.jp/post/127583), [JR Central 2025](https://jr-central.co.jp/news/release/_pdf/000045614.pdf)
- Gió/mưa/tuyết Tokaido: [trafficnews – mưa 2023](https://trafficnews.jp/post/127583), [trafficnews – bộ ngưỡng mưa 2014](https://trafficnews.jp/post/36226/), [trafficnews – tuyết](https://trafficnews.jp/post/63316/3), [shizuoka-np – gió 30/35 m/s](https://www.at-s.com/snews/article/ats/1866326.html); JR East gió: [mlit](https://www.mlit.go.jp/common/000013076.pdf), [JR East Tech Review 35](https://www.jreast.co.jp/development/tech/pdf_35/Tech-35-36-41.pdf)
- Thiết bị phát hiện: [JR Central Technology Report 12](https://company.jr-central.co.jp/company/technology/_pdf/report_12.pdf), [report 2024-05](https://company.jr-central.co.jp/others/report/_pdf/report2024-05.pdf), [trafficnews – cảm biến dây điện](https://trafficnews.jp/post/129898), [JR East ICT](https://www.jreast.co.jp/development/theme/ict/pdf/ict51.pdf); bảo vệ tàu: [JR Central safety report 2025](https://company.jr-central.co.jp/others/report/_pdf/report2025-07.pdf)
- Sự cố nghiêm trọng: [trafficnews – 1 năm sau nứt bệ](https://trafficnews.jp/post/82339), [Toyo Keizai](https://toyokeizai.net/articles/-/214798), [coki.jp – tàu ghép tách](https://coki.jp/article/news/48884/)
- ATC vô tuyến: [newswitch](https://newswitch.jp/p/17666), [trafficnews – ATACS](https://trafficnews.jp/post/113288)
- An toàn: [nippon.com](https://www.nippon.com/ja/in-depth/d01045/), [itmedia – cháy Nozomi 225](https://www.itmedia.co.jp/makoto/spv/1507/03/news012.html), [trafficnews – tự thiêu](https://trafficnews.jp/post/41259/); Tomii 2010 ([PDF](https://www.witpress.com/Secure/elibrary/papers/CR10/CR10011FU1.pdf))

## Cập nhật 24/10/2026: ATC trong game theo hệ
- Mỗi tuyến có hệ ATC riêng (`LINE_META.atc`): **ATC-NS** (Tokaido/Sanyo), **DS-ATC** (Tohoku, Joetsu, Hokuriku, Yamagata, Akita), **KS-ATC** (Nishi-Kyushu); tên hiện dưới số ATC trên đồng hồ **[N]**. Yamagata/Akita dùng DS-ATC chỉ là suy luận cho đoạn chung với Tohoku **[I]**.
- **KS-ATC dừng ga ba giai đoạn** **[N: ba giai đoạn]**: mẫu dừng ga là bậc thang 160 → 110 → 60 km/h rồi vào mẫu liên tục; các mức km/h là **[I]** (nguồn chỉ nói "ba giai đoạn").
- **Tín hiệu 0 (mất mã/tính lỗi)** **[N: fail-safe, không có tín hiệu thì coi là dừng; ATC-NS từng có lỗi tính toán]**: sự cố `atcfault`, ATC hạ tốc độ cho phép về 0 trước một khối ~1,5 km trong 1,5 phút (**[I]**) rồi nhả; xuất hiện ngẫu nhiên thay cho cảnh báo ổ trục ở tuyến ATC-NS (độ khó có sự cố thiết bị). Nút xác nhận vẫn bỏ (ATC tự nhả) theo quyết định trước.
