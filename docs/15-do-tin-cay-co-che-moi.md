# 15. Độ tin cậy của các cơ chế mới (tháng 11/2026)

Theo quy ước của dự án: **[N]** có nguồn (link ở tài liệu gốc), **[D]** từ dữ liệu/mã đã kiểm, **[I]** suy luận/đơn giản hóa của game, **[K]** kiến thức nền chưa kiểm chứng, **[?]** chưa rõ. Bảng dưới liệt kê các cơ chế thêm sau docs 10–13 (bản đồ thống nhất, sự cố ngẫu nhiên cho mọi tàu, ngó buồng lái, tàu kiểm tra) và nói rõ cái nào dựa trên nguồn, cái nào là con số của game.

## 1. Chuyển động của tàu trên bản đồ

| Cơ chế | Nhãn | Căn cứ / ghi chú |
|---|---|---|
| Giờ rời và giờ đến mỗi ga dừng | **[D]** | Lịch công bố 2610 (JR East) và 20/10/2026 (JR West), docs/data/README.md |
| Tăng tốc đều 0,6 m/s², phanh theo đường cong ATC 0,72 m/s² giữa hai ga | **[I]** | Hình dạng đường tốc độ do game chọn; chỉ đảm bảo đúng giờ đến/đi. 0,72 trùng `G.aATC` của tàu thật trong game |
| Giới hạn 80 km/h trong 1.150 m trước và 630 m sau ga có ghi rẽ vào đường sân ga | **[I]** | Giá trị do game đặt (docs/10 mục "Ghi, đường sân ga"); không có nguồn công bố giá trị chính xác |
| Mưa ≥ 50 mm/h: chạy 70 km/h; mưa ≥ 60 mm/h và gió ≥ 30 m/s: dừng | **[N]** | Quy tắc Tokaido, docs/06 §5.3 (áp cho mọi tuyến ở đây là đơn giản hóa **[I]**) |
| Ô mưa/gió/tuyết và vị trí động đất của chuyến | **[I]** (ngẫu nhiên theo seed) / **[N]** (chế độ thực tế: Open-Meteo, P2PQuake) | docs/10, `realmode.js` |
| Tàu sau không vượt tàu trước giữa hai ga, chỉ vượt ở ga có đường tránh | **[I]** | Cách giữ giãn cách của game; thực tế do hệ thống điều khiển vận hành |

## 2. Sự cố ngẫu nhiên áp cho mọi tàu

Tất cả là **[I]**: loại sự kiện lấy từ docs/05, 06, 09 (mô tả có nguồn), nhưng **tần suất, thời lượng và cách quy ra giữ tàu** là con số của game.

| Sự kiện | Hiệu ứng trên bản đồ | Nhãn |
|---|---|---|
| Lệnh điều độ giữ tàu / điều chỉnh lịch / nhường tàu vượt | Giữ 60–150 s hoặc 90 s tại ga dừng | **[I]** |
| Hành khách bệnh | Giữ 180 s tại ga dừng | **[I]** |
| Cửa lỗi | Giữ 60–150 s tại ga dừng | **[I]** |
| Hỏng thiết bị (nhiệt độ ổ trục cao…) | Giữ ngắn tại ga; riêng chuyến ta/tàu ngồi: hạn chế ≤ 230 km/h tới hết chuyến ([N] docs/06 §5.4) | **[I]** / **[N]** |
| Thông qua ga | Đoàn không dừng ở ga kế, hai đoạn nối liền | **[I]** |
| Chạy chậm theo lệnh | ≤ 170 km/h trong 10–20 phút | **[I]** |
| Nhân viên làm việc | ≤ 230 km/h trong ~90 s (còi do tự lái) | **[I]** |
| Thú va chạm | 30% số lần: dừng 6–10 phút | **[I]** |
| Xe kẹt ở đường ngang | Dừng 2–5 phút | **[I]** |
| Đứt dây điện / cháy | Dừng 10–25 phút (hiếm, theo độ khó) | **[I]** |
| Số sự kiện mỗi tàu | Theo độ khó: dễ 1; thường 2–3; khó 4–5; chuyên gia 6–7; nhân theo thời gian chạy (tối đa ở chuyến ≥ 2,5 giờ) | **[I]** |

Không có nguồn nào nói các sự cố này xảy ra với tần suất đó trên mạng thật; mục đích là cho bản đồ "sống" và trễ lan truyền hợp lý. Tàu kiểm tra không có sự cố liên quan hành khách (bệnh, cửa lỗi, dừng thêm).

## 3. Chế độ tự do và ngó buồng lái

| Cơ chế | Nhãn | Ghi chú |
|---|---|---|
| Tàu được chọn chạy theo mô phỏng thật (ATC, giới hạn tuyến, ghi rẽ) | **[I]** | Cùng luật như tàu của ta, không phải dữ liệu vận hành thật |
| Tự lái xử lý sự cố: nhắc lệnh sau ~6 s, hộp thoại sau ~8 s, còi tự động, đóng cửa | **[I]** | Quy ước của game (`autoExtras`) |
| Bản sao trên bản đồ khớp tàu thật | **[I]** | Cơ chế đồng bộ của game |
| PA phát ngầm khi ở tàu khác; thời lượng câu ≈ 500 ms + 150 ms/ký tự | **[I]** | Chỉ để tính phần còn lại khi quay về |

## 4. Tàu kiểm tra (Doctor Yellow T4, East i E926)

| Cơ chế | Nhãn | Ghi chú |
|---|---|---|
| Có tồn tại tàu kiểm tra, chạy đêm giữa chuyến khách cuối và đầu | **[N]** | docs/10 mục "Nhiệm vụ kiểm tra tự do" |
| Giờ và ga dừng của các chuyến kiểm tra trong danh mục | **[I]** | Không có bảng giờ công bố; giờ lùi theo chuyến khách cuối của tuyến (`retimeInspect`) |
| Dải đo 160–270 km/h (T4), 140–275 km/h (E926), các cảm biến | **[I]** | Chỉ đúng về loại phép đo |
| Kế hoạch 190 km/h trung bình cho nhiệm vụ | **[I]** | Dùng khi chạy tay; tự lái không bám nó nữa |
| Tự lái chạy theo giới hạn ATC cao nhất của tuyến (ngang tàu khách) | **[I]** | Thay đổi 11/2026 theo yêu cầu người dùng |
| Đỗ ga theo biểu đồ nhưng không mở cửa, không phát thanh | **[I]** | Không chở khách |

## 5. Dữ liệu giờ tàu

- **Sửa lỗi Tsubame 333/334 (11/2026) [D]:** bảng PDF JR Kyushu của chuyến Tsubame 334 có một ga bị gõ nhầm giờ (23:12 thay vì 20:12); bộ sinh dữ liệu từng cộng thêm 24 giờ cho các ga sau, làm chuyến này "chạy" tới 44:44 và chuyến đối xứng 333 tới 70:44. Đã thay giờ lệch bằng trung điểm hai ga kề — giá trị 20:12 là nội suy **[I]**, không đối chiếu nguồn. Chuyến xuống Tsubame 333 vốn là đối xứng ước tính **[I]**.
- **Kiểm tra tự động (bộ sinh + test):** mọi chuyến khách phải có giờ không giảm dọc hành trình, hai ga liền nhau cách nhau không quá 3 giờ, không có giờ vượt 28:00. Vi phạm làm `tools/build_lines.py` dừng và làm `tests/run.js` báo lỗi.
