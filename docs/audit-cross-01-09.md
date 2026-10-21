# Rà soát chéo 01–09

Ngày: 2026-10-21. Phương pháp: đối chiếu các số liệu và sự kiện xuất hiện ở nhiều tài liệu (tốc độ, quãng phanh, headway, hệ thống/trung tâm điều hành, số chuyến, số đoàn, depot, ngưỡng thời tiết, sự cố, thời gian khôi phục). Đây là rà soát lấy mẫu theo từ khóa, không phải đọc lại từng dòng cả 9 tài liệu.

## A. Đã khớp giữa các tài liệu
- Quãng phanh khẩn cấp ~3 km ở 285 km/h (03, 06); headway 3 phút và cận dưới ~38 giây (04, 06).
- COMTRAC/COSMOS/SIRIUS/CYGNUS, trung tâm Tokyo/Osaka/Kanazawa/Hakata/Sapporo (02, 05).
- Ngưỡng gió 30/35 m/s, mưa 50/60 mm, tuyết Sekigahara (06, 09).
- Số chuyến Tokaido 372 (FY2023) và 383 (FY2024) (04, 08, 09): khác năm, không mâu thuẫn.
- Trễ trung bình 0,5/0,6/1,4/1,6 phút (04, 05, 09): khác năm.
- Ghép/tách 9/2024, 3/2025 và nguyên nhân (04, 09); ngập depot Nagano (08, 09); Nozomi 34 (06, 09).
- Độ dài Hokuriku 470,6 km, tốc độ tối đa theo dòng tàu (01, 02, 03).

## B. Lỗi và mâu thuẫn tìm thấy, đã sửa
| # | Vấn đề | Cách xử lý |
|---|---|---|
| 1 | 09 §2.3 nói JR East "thay toàn bộ 135 máy đo… từ 3/2024": **không có nguồn** (nhiều khả năng lẫn với "135 đoàn" của JR Central) | Xóa, thay bằng S-net từ 11/2017 (có ở 06) |
| 2 | 09 ghi giờ chạy lại sau động đất Yamanashi 6/2026 là "chưa rõ", trong khi 05 §6 đã ghi ~15 phút | 09 dùng số của 05; bỏ khỏi danh sách lỗ hổng |
| 3 | 06 §5 vẫn gán nhãn [K] cho chi tiết Kumamoto 2016 (đoàn rỗng về depot), 09 đã có nguồn | 06 đổi sang [N], dẫn 09 §2.2 |
| 4 | 05 §6 ghi "Fukushima 2021 … ~80% số chuyến, Nasushiobara–Ichinoseki" trùng mẫu với vụ 3/2022 (09) | Đánh dấu [?] chờ xác nhận năm |
| 5 | 02 §7–8 cũ hơn 05/08 (thiếu CYGNUS, Kanazawa, danh sách depot đủ) | Thêm ghi chú trỏ sang 05 §1 và 08 §3 |

## C. Chênh lệch còn lại (không sửa được bằng nguồn hiện có)
- **Số liệu "đoàn":** 135 đoàn (JR Central, 06) và ước ~130 đoàn (08) là hai nguồn khác loại/thời điểm; game dùng ~135 hoặc số theo khai báo của người chơi.
- **Số người bị thương Fukushima 3/2022:** 0 so với 6 (09), nguồn mâu thuẫn.
- **Số chỗ hư hại Kyushu 7/2026:** 600 so với 900 (09).
- **Vị trí Kumamoto 2016:** cách ga ~1,3 km hay cách depot ~10 km (09): hai nguồn.
- **Tần số/ngưỡng JR East:** gió, mưa của Shinkansen JR East không công khai (06).
- Các lỗ hổng cuối mỗi tài liệu (01–09) vẫn giữ nguyên; không có lỗ hổng nào mới bị phát hiện là chặn Phase 1.

## D. Đánh giá mức sẵn sàng cho Phase 1
| Nhu cầu của game | Mức dữ liệu | Ghi chú |
|---|---|---|
| Biểu đồ chạy tàu thật (Tokaido/Sanyo, Tohoku) | Rất tốt | 838 chuyến có giờ từng ga |
| Mô hình điều độ, sự cố, khôi phục | Tốt | 05, 09; không có luật ưu tiên chính thức, phải đặt [I] |
| Động lực học tàu (gia tốc, phanh) | Trung bình | N700S/E5 không công bố, dùng giá trị thay thế [I] |
| Lái tàu | Tốt về quy trình, thiếu số nấc phanh | 07 |
| Cấu trúc ga/ depot | Tốt cho Tokaido/Tohoku, trung bình cho Sanyo/Kyushu | 08 |
| Độ phân giải đường ray (dốc, cong, khối) | Yếu cho Joetsu, **không có chiều dài khối** | 02, 06 |

Kết luận: đủ để chọn lõi game; phần thiếu nào cũng có thể thay bằng giá trị đơn giản hóa gắn nhãn [I].
