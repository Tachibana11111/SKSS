# Nhật ký tiến độ

Cập nhật lần cuối: 2026-10-21 (Phase 1–2: prototype 0.4)

## Giai đoạn hiện tại: 0 – Xây bộ tri thức nghiệp vụ

| # | Tài liệu | Trạng thái |
|---|---|---|
| 01 | Tổng quan 5 công ty JR | bản 2 |
| 02 | Hạ tầng | bản 3 |
| 03 | Đoàn tàu | bản 4 (thêm E6/E8/E3/ALFA-X, khối lượng, phanh) |
| 04 | Biểu đồ chạy tàu | **bản 5** (lịch thật 570 + 268 chuyến, lưới 3 phút xác nhận, thời gian chạy/dừng, ghép/tách, quay đầu) |
| 05 | Điều độ | **bản 1 xong** (hệ thống COMTRAC/COSMOS/SIRIUS, trung tâm Tokyo/Osaka, các bàn, 運転整理, quy trình sự cố, ý nghĩa cho game; còn lỗ hổng ghi ở §9) |
| 06 | Tín hiệu & an toàn | **bản 2** (thêm gió/mưa/tuyết, thiết bị phát hiện, EGS/bảo vệ tàu, sự cố 2016–2025, cận dưới headway 38 giây; còn 6 lỗ hổng không công khai ở §10) |
| 07 | Lái tàu | **bản 1 xong** (tổ lái, đường vào nghề, mô phỏng, buồng lái/13 nấc, lái theo biểu đồ 15 giây, dừng ga và TASC mùa thu 2026, GOA2 ~2028, mô hình game; còn ghi chú ở §11) |
| 08 | Ga & depot | **bản 2** (đã xử lý lỗ hổng: chu kỳ JR East, đội dọn, hệ thống nhập đổi xe bảo trì 7/2029, Hamamatsu, Oi, cửa chắn FY2026) — bản 1: (sân ga/quay đầu/cửa chắn, 12 depot của 5 JR kèm số đường–sức chứa, chu kỳ kiểm tra, bảo trì đêm 0–6 giờ, tàu đêm 8/8/2026, ngập Nagano; lỗ hổng ở §8) |
| 10 | Thiết kế game | **bản 1** (`10-thiet-ke-game.md`: chế độ, tuyến/tàu, ATC, sự kiện, chấm điểm, độ khó, hiệu chuẩn, giới hạn) |
| 09 | Sự cố | **bản 1 xong** (thống kê FY2022 122 vụ, động đất 2004–2026 kèm thời gian khôi phục 13–52 ngày, bão/mưa, thiết bị/ghép tách, dây điện 1/2024, an ninh, gấu, khung khôi phục, thư viện sự kiện game; lỗ hổng ở §10) |
| – | `audit-cross-01-09.md` | **rà soát chéo 01–09 xong (2026-10-21)**: 5 lỗi đã sửa, các chênh lệch còn lại ở mục C |
| – | `audit-01-04.md` | kết quả hoàn thiện lần 3: các hạng mục chính đã xong; còn 6 mục mức thấp |
| – | `data/` | JR East 570 chuyến (6.219 dòng ga) + JR West 268 chuyến (6.777 dòng ga); `tools/` chứa script lấy và phân tích dữ liệu |

**Trạng thái 01–04:** hoàn thiện. Các hạng mục audit đã xong; còn lại 6 mục mức thấp, không chặn mục 05 (xem `audit-01-04.md` mục C). Người dùng cần xem lại và xác nhận trước khi sang 05 (đã chốt ở các lượt trước).

## Công cụ
- `tools/crawl_jreast.py`, `tools/crawl_jrwest.py` (lấy dữ liệu chậm 1,2 giây/yêu cầu, có đệm, đọc từ HTML), `tools/analyze_timetable.py` (phân tích). Chạy lại bằng `python -X utf8 tools/<tên>.py` (xem tham số ở đầu file).

## Quy ước tài liệu
- Nhãn: **[N]** có nguồn · **[D]** rút ra từ dữ liệu trong `data/` · **[I]** suy luận · **[K]** kiến thức nền Claude, chưa kiểm chứng · **[?]** chưa rõ.

## Quyết định đã chốt
- **(2026-10-21) Lõi game:** lái tàu kết hợp điều độ ngẫu nhiên (người chơi lái; sự kiện điều độ/thời tiết/sự cố ngẫu nhiên theo seed). Làm **Tokaido trước**. Công cụ tạm thời: web (HTML/JS, mở file trực tiếp). Có 4 mức độ khó (Dễ/Thường/Khó/Chuyên gia). Tàu chạy trước + thời tiết đã thêm ở prototype 0.2.
- Game cá nhân, không phân phối (được dùng tên/logo thật; dữ liệu lịch chỉ dùng cá nhân, không tái phân phối).
- Làm nghiệp vụ trước, thiết kế game và code sau.
- Chưa chốt: engine lâu dài (web hay Godot/Unity nếu muốn cảnh 3D), mở rộng tuyến sau Tokaido (Tohoku có tàu ghép/tách).

## Phát hiện đáng chú ý (ảnh hưởng thiết kế)
- 2 "thế giới": Tokaido–Sanyo–Kyushu (60 Hz, liên thông) và Tohoku–Joetsu–Hokuriku–Hokkaido (50 Hz, JR East). Tokaido và Tohoku không nối ray tại Tokyo. Hokuriku xen kẽ 50/60 Hz bốn đoạn. Tokaido 60 Hz nhờ trạm đổi tần số (Tsunashima, Nishi-Sagami; ranh lưới ở sông Fuji).
- Quy tắc tần số: N700 chỉ 60 Hz, E5/H5 chỉ 50 Hz, E7/W7 cả hai.
- **Lưới giờ 3 phút ở Tokaido/Sanyo:** mọi giờ khởi hành là bội số của 3; tại Shin-Osaka khoảng cách thực tế nhỏ nhất giữa hai chuyến cùng chiều là 3 phút (lặp 24–90 lần); cao điểm mỗi chiều 9–11 chuyến/giờ (thứ Bảy xuống 11, lên 15), cả hai chiều 20–26 (đính chính: không phải 20 chuyến một chiều). Mẫu cố định từ Tokyo: Hikari :03/:33, Kodama :27/:57, Nozomi :00/:12/:30/:48 + tăng cường. Tohoku ~lưới 4 phút, ~1/3 chuyến là tàu ghép.
- Tàu chậm dừng chờ 3–6 phút ở ga có đường thông qua và ở Nagoya/Kyoto; Kodama mất khoảng 24% thời gian chuyến để chờ; Kodama Sanyo chờ có khi đến 15 phút (Okayama). Nozomi dừng 1–2 phút. Kyushu không có chờ vượt.
- Chạy bù: thời gian chạy có biên độ 4–7 phút giữa hai chuyến cùng loại ở đoạn dài (Shin-Yokohama–Nagoya, Omiya–Sendai): đó là dự phòng của lịch.
- Ngày thật 20/10/2026: 108 Nozomi chiều lên qua Shin-Osaka so với 65 định kỳ: khoảng 40 chuyến tăng cường trong ngày.
- Tách tàu: Morioka (Komachi 2 phút, Hayabusa 4 phút); Fukushima 4–5 phút; 2 sự cố tàu ghép bị tách giữa đường (9/2024, 3/2025); quay đầu tại Tokyo 12 phút (dọn 7 phút).
- Quy tắc điều độ: không bao giờ hủy một phần chuyến; thiếu tàu/tổ lái dự phòng nên thay đổi gây dây chuyền; chỉ trễ >1 phút mới tính là trễ; trễ TB Tokaido 0,6 phút (FY2008), 1,4 phút (FY2024).
- Phanh khẩn cấp Tokaido 285 km/h: ~3 km. Seikan: Shinkansen dùng chung ray với tàu hàng. 営業キロ ≠ 実キロ: game dùng km thực.

## Việc tiếp theo
- **(2026-10-21) Bước hoàn thiện 0.4 xong:** đã giải quyết các vấn đề tự nêu (git, kiểm thử 2.564 kiểm tra, tài liệu thiết kế, hướng dẫn, điều độ chủ động, sự cố từ docs/09, độ dốc/tải/nhiệt phanh/điện, hồ sơ/xem lại/tổng kết, dữ liệu Sanyo–Kyushu–Tohoku và cả hai chiều). **Việc còn lại theo thứ tự:** (1) người dùng chơi thử và phản hồi; (2) ~~quyết định góc nhìn~~ **đã chốt D: 2D + khung nhìn buồng lái phía trước (cabview.js), xong ngày 2026-10-21**; (3) dữ liệu còn thiếu ở docs/10 §11.
- **Prototype 0.3:** thêm 6 nhóm thiết bị buồng lái (hai cần, tốc độ không đổi + xác nhận ATC, còi + gạt mưa, đóng cửa, nhắc lệnh điều độ, TIMS); bảng so với buồng lái thật ở docs/07 §4.3. Chưa biết số nút thật: chờ ảnh/video buồng lái N700S từ người dùng nếu muốn bám sát.
- **Prototype 0.2** (`prototype/drive/`, xem `prototype/README.md`): 79 chuyến Tokaido chiều lên có lịch thật (tools/build_tokaido_catalog.py), chiều xuống đối xứng ước tính, tàu chạy trước + ATC giữ khoảng cách, thời tiết (mưa 50/60 mm, gió 30 m/s, tuyết Sekigahara, động đất), lệnh điều độ ngẫu nhiên (giữ tàu, thông qua, dừng thêm, chạy chậm, tàu trước dừng), 4 độ khó. Chờ người dùng chơi thử và phản hồi.
- **Phase 0 xong (9/9 tài liệu + rà soát chéo).** Chờ người dùng xem lại, rồi sang Phase 1 (chọn lõi game).
- Người dùng xem 01–04 và xác nhận/sửa. (PDF Kyushu/Nishi-Kyushu đã tải theo phép, xem `data/raw-pdf/README.md`; chỉ dùng cá nhân.)
- Sau đó: mục 05 (điều độ) và 06 (tín hiệu & an toàn), nơi đối chiếu headway và nguyên lý phanh.

## Câu hỏi còn mở cho người dùng
- Thích phần nào nhất: điều độ, lái tàu hay cả hai? Công cụ lập trình quen thuộc? Tuyến muốn bắt đầu?
- (Đã giải quyết) tải PDF lịch Kyushu/Nishi-Kyushu.
- **(2026-10-21) Sửa theo phản hồi chơi thử:** (1) Nhật chạy bên trái: khung buồng lái lật làm sân ga của ta bên trái, đường ngược chiều bên phải, thêm sân ga cho đường bên kia; (2) hành lang đường sắt: cây/ruộng/nhà/toà nhà không lấn vào đường và sân ga; (3) cảnh 2D lật hướng theo chiều đi (đông/bắc = phải, tây/nam = trái); (4) tàu ngược chiều vẽ phía sau tàu của ta; (5) tàu ngược chiều lướt chậm hơn (~4,5 s) và tiếng gặp nhau bắt đầu sớm 2 s để khớp hình.
- **(2026-10-21) Bố trí ga/kết cấu/đường cong:** mỗi ga có bố trí đường-sân riêng (nguồn Wikipedia JP), tuyến có cầu cạn/cầu/hầm/đường cong theo tỷ lệ thật (vị trí là suy luận); xem docs/02 mục 8. Thêm `layout.js`, `tools/build_struct.py`, kiểm thử mục 10 (3.807 kiểm tra).
