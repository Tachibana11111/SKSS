# 10 – Thiết kế game (bản 0.4)

Nhãn: **[N]** có nguồn (docs 01–09) · **[D]** từ dữ liệu lịch trong `docs/data/` · **[I]** do thiết kế tự đặt/đơn giản hóa (chưa có nguồn công khai) · **[?]** chưa rõ.
Phiên bản 1 (2026-10-21). Mã nguồn: `prototype/drive/`. Kiểm thử: `node tests/run.js`.

## 1. Tổng quan
Game cá nhân (không phân phối) mô phỏng **lái tàu Shinkansen kết hợp điều độ**, trên lịch tàu thật tháng 10/2026. Ba chế độ:
1. **Lái tàu:** người chơi lái một đoàn theo biểu đồ thật; điều độ, thời tiết và sự cố xảy ra ngẫu nhiên (theo seed) và người chơi phải xử lý.
2. **Điều độ:** xem cả mạng nhiều tàu tự chạy theo lịch thật (biểu đồ chạy tàu dạng đồ thị khoảng cách–thời gian); xử lý sự cố bằng lệnh giữ, thông qua, cho vượt.
3. **Hướng dẫn:** ba bài có chỉ dẫn từng bước, chạy trên mô phỏng thật.

Góc nhìn đã **chốt phương án D (2026-10-21)**: giữ **2D nhìn ngang** và thêm **khung nhìn buồng lái phía trước** (giả 3D bằng phép chiếu phối cảnh, `cabview.js`: ray hội tụ, sân ga/vạch dừng/biển khoảng cách phóng to khi lại gần, tàu chạy trước, tàu ngược chiều, tàu chạy qua, công nhân, hươu, biển báo, hầm, thời tiết). Tàu khác nhìn từ phía trước dùng hình mặt trước thật cắt từ bản vẽ rail.kychung.com; mọi thứ còn lại **vẽ bằng code** nên đơn giản. Đổi sang engine 3D thật vẫn chưa quyết định.

## 2. Tuyến và dữ liệu
| Tuyến | Ga | Chiều dài (km thực) | Chuyến | Nguồn |
|---|---|---|---|---|
| `tsk` Tokaido–Sanyo–Kyushu (Tokyo → Kagoshima-Chuo) | 46 | 1.325,9 | 396 (chiều xuống 175, chiều lên 221) | [D] lịch JR East 2610 + JR West 20/10/2026 |
| `toh` Tohoku (Tokyo → Shin-Aomori) | 23 | 674,9 | 149 | [D] lịch JR East 2610 |

- **km thực** của Sanyo, Kyushu, Tohoku lấy từ Wikipedia tiếng Nhật (tra 21/10/2026); Tokaido theo docs/04 **[N]**.
- **Chiều lên và xuống đều là lịch thật** cho phần lớn tàu nhờ trang JR East (Tokyo, Shinagawa, Omiya) cho cả hai chiều. **36 chuyến chiều lên chỉ Sanyo–Kyushu là lịch đối xứng (đánh dấu "(ước)")** vì dữ liệu chiều lên của Kyushu chỉ có trong PDF chưa đưa vào **[I]**.
- Không có: Joetsu, Hokuriku, Hokkaido, Yamagata/Akita (mini-Shinkansen), tàu ghép/tách (chuyến ghép chỉ lấy phần thân chính), lịch ngày nghỉ.
- Giờ ga thông qua được nội suy theo km giữa hai ga dừng **[I]**.
- Dữ liệu sinh bằng `tools/build_lines.py` (có thể chạy lại).

## 3. Tàu (docs/03 §2b)
| Mã | Dùng cho | Dài | Khối lượng | Gia tốc đầu | Công suất hiệu dụng | Tốc độ tối đa | Ghi chú |
|---|---|---|---|---|---|---|---|
| N700 | Nozomi/Hikari/Kodama | 404,7 m | 715 t | 0,72 m/s² (2,6 km/h/s) | 14,5 MW | 300 | **[N]** khối lượng, gia tốc; công suất **[I]** |
| N700S | cùng | 404,7 m | 700 t | 0,72 | 14,5 MW | 300 | **[I]** (JR Central không công bố; thấp hơn 15 t giả định) |
| N700 (8 toa) | Sakura/Mizuho | 204,7 m | 360 t | 0,72 | 8,4 MW | 285 | **[I]** |
| 800 series | Tsubame (chưa có chuyến) | 152 m | 255 t | 0,62 | 5,6 MW | 260 | **[I]** |
| E5 | Hayabusa/Hayate/Yamabiko/Nasuno | 253 m | 453,5 t | 0,475 (1,71 km/h/s) | 9,2 MW | 320 | **[N]** khối lượng, chiều dài, gia tốc; công suất **[I]** |

- Khối lượng khi chạy = khối lượng không tải + khách (hệ số tải 45–100% ngẫu nhiên × sức chứa × 70 kg). Tải đầy làm tàu tăng tốc chậm hơn **[I]**.
- Phanh thường dụng tối đa B7 = **0,75 m/s²** ≈ 2,70 km/h/s **[N]**; phanh khẩn **1,04 m/s²** (≈ 3 km từ 285 km/h) **[N]**.
- Sức cản: `(2000 + 80·v)·(m/715 t) + 19,5·v²·hệ số khí động·(0,55 + 0,45·dài/404,7)` **[I]**; E5 có hệ số khí động 0,55 **[I]**.

## 4. Điều khiển buồng lái
Tám thiết bị so với buồng lái thật xem docs/07 §4.3. Trong game:
- **Hai cần**: gia tốc P0–P13 (13 nấc, **[N]**) và phanh B1–B7 + EB (số nấc **[I]**); **liên động**: phải nhả phanh về 0 mới kéo được **[I]**.
- **Đóng cửa (Enter)** mất 9–15 s, có thể kẹt (5–20% tuỳ độ khó) **[I]**; đèn ĐÓNG CỬA sáng mới đi được; đi sớm bị trừ điểm.
- **Tốc độ không đổi (C)** chỉ ≥ 70 km/h, huỷ khi phanh/ATC **[N: có ở N700A Tokaido]**.
- **Xác nhận ATC (X)**: Dễ tự động, Thường tự sau 5 s, Khó/Chuyên gia phải bấm.
- **Còi (H), gạt mưa (V), phát thanh trấn an (M), nhắc lại lệnh (Y), từ chối (N)**; **tự lái (T)** để xem mẫu.
- **TIMS**: cửa, lỗi từng toa, dòng kéo, áp suất phanh, tải khách, điện năng, nhiệt má phanh, mức bất an hành khách.

## 5. Mô hình ATC và an toàn **[I]**
- Tốc độ cho phép = min của: giới hạn tuyến theo km (110 Tokyo–Shinagawa; 270 đến km 90; 285 Tokaido; 300 Sanyo; 260 Kyushu; Tohoku 110/275/320/260), trần của loại tàu, vùng giới hạn tạm (mưa 70, chạy chậm 170, nhân viên làm việc 230, tuyết, nhiệt ổ trục 230…), **mẫu giảm tốc 0,72 m/s²** tới vạch dừng + 30 m, tới đầu vùng giới hạn thấp hơn, và **khoảng cách tới tàu phía trước** (đệm 400 m).
- Vượt tốc độ cho phép quá ngưỡng (Dễ 6 km/h … Chuyên gia 0,3 km/h) → ATC phanh B7 cho tới khi dưới mẫu (và xác nhận nếu cần).
- Tàu đang đỗ ga, hoặc sắp rẽ vào đường tránh của ga có đường thông qua (trong 2,5 km), **không chặn** tàu phía sau **[I]**.
- Nhiệt má phanh: phanh đĩa nóng lên khi phanh; tái sinh chia bớt 70%/35%/5% theo tốc độ; **phanh khẩn không tái sinh**; > 0,8 thì lực phanh giảm tới −35% **[I]**. Một lần phanh khẩn từ ~270 km/h đủ gây mờ phanh.
- Độ dốc: hình dạng **giả lập** (tối đa theo docs/02: Tokaido 20‰, Sanyo 18‰, Kyushu 35‰, Tohoku 25‰ gần Ueno), ga nằm trên đoạn bằng **[I]**. Chưa có dữ liệu độ dốc thật theo km.
- Điện năng: công kéo/0,9; hoàn lại 75% công phanh tái sinh **[I]** (con số tuyệt đối chỉ để so sánh, có thể cao hơn thực tế khoảng 2 lần).

## 6. Sự kiện (từ docs/05, 06, 09)
Số sự kiện mỗi chuyến: Dễ 1 · Thường 2–3 · Khó 4–5 · Chuyên gia 6–7, cộng sự kiện hiếm (dây điện, cháy) với xác suất 0/10/25/50%.
| Sự kiện | Hiệu ứng | Việc người chơi | Nguồn |
|---|---|---|---|
| Mưa ≥ 50 mm/h | ATC 70 km/h trong vùng; kính mờ nếu không bật gạt mưa | giảm tốc, bật gạt mưa, nhắc lệnh | [N] docs/06 §5.3 |
| Mưa ≥ 60 mm/h hoặc gió ≥ 30 m/s | dừng chạy, tàu về ga gần nhất và chờ 10–25 phút | nhắc lệnh, phát thanh | [N] docs/06 |
| Tuyết | giới hạn vùng 120/170 (Tokaido) hoặc 200–230 (Tohoku) | chạy chậm | [N] docs/06; Tohoku [I] |
| Động đất | cắt điện, phanh khẩn, chờ 8–18 phút rồi chạy ≤ 70 km/h 12 km | phát thanh, chờ | [N] docs/06, 09 |
| Tàu trước dừng khẩn | ATC giữ khoảng cách | chờ | [N] docs/09 |
| Giữ tàu / thông qua / dừng thêm | thay đổi kế hoạch ga | nhắc lệnh, phanh đúng vạch | [N] docs/05 |
| Đề nghị cho tàu nhanh vượt | **quyết định**: Y chấp nhận (giữ 90 s, +3 điểm phối hợp) hoặc N từ chối (−3) | chọn trong 40 s | [N] docs/05; điểm [I] |
| Chạy chậm theo lệnh (170) | vùng 15–30 km | giảm tốc | [N] docs/05 |
| Nhân viên làm việc cạnh đường | ≤ 230 km/h và phải bấm còi | bấm H | [I] |
| Hươu/lợn rừng | bấm còi ~1 km trước thì bỏ chạy; không thì va chạm, phanh khẩn, dừng kiểm tra | bấm H | [N] docs/09 (động vật) |
| Lỗi cửa toa / nhiệt ổ trục | cửa kẹt một lần / ≤ 230 km/h tới hết chuyến | nhắc lệnh | [N] docs/06 |
| Hành khách bệnh trên tàu | dừng thêm 180 s ở ga để cứu thương | phanh đúng vạch | [N] docs/09 |
| **Dây điện hỏng** | mất điện đoạn phía trước, dừng ở ga gần nhất 25–50 phút, tàu đứng giữa đường làm khách bất an | phát thanh trấn an | [N] docs/09 (23/1/2024) |
| **Báo cháy toa N** | nếu trong hầm thì không được dừng; ngoài hầm thì dừng ở ga gần nhất; dừng trong hầm bị trừ 15 | báo điều độ, tránh dừng hầm | [N] docs/07 §3, 09 |
| **Kế hoạch ngừng chạy** | chuyến bị cắt ngắn, kết thúc sớm tại ga ở giữa | nhắc lệnh | [N] docs/09 (計画運休) |
| Bất an hành khách | tăng khi tàu đứng giữa đường (đầy sau 15 phút); phát thanh (M) giảm 45; 100% = hoảng loạn (−10) | nhấn M mỗi ~45 s | [I] |

## 7. Chấm điểm (mỗi chuyến, tối đa 100) **[I]**
`điểm = 0,7 × trung bình(độ chính xác dừng + đúng giờ)/2 + 0,3 × độ êm − ATC·8 − đi sớm − nhắc lệnh trễ − còi/động vật − gạt mưa − bất an − cháy ± phối hợp`
- Độ chính xác dừng theo ngưỡng ±0,5/1/2/5/15 m × hệ số độ khó (Dễ 2,0 … Chuyên gia 0,5).
- Đúng giờ: trong −30…+15 s được 100; trễ trừ dần; **thời gian mất do sự kiện được miễn trừ**.
- Độ êm: giật (đạo hàm gia tốc) > 0,7 m/s³ bị trừ.
- Nhắc lệnh: −2 nếu > 60 s, −4 nếu > 120 s không trả lời.
- Chế độ điều độ: `100 − trễ TB·8 − tàu trễ > 5 phút·3 − trễ lớn nhất·1,2 − thời gian bị kẹt/600 − số lệnh·0,3`, trọng số Nozomi 1,3 / Hikari 1,0 / Kodama 0,8.

## 8. Độ khó
| | Dễ | Thường | Khó | Chuyên gia |
|---|---|---|---|---|
| Gợi ý phanh | nấc cần + điểm bắt đầu | điểm bắt đầu | không | không |
| Ngưỡng ATC phanh | +6 km/h | +2 | +0,5 | +0,3 |
| Dung sai dừng | ×2 | ×1 | ×0,7 | ×0,5 |
| Đáp ứng phanh | 1,0 | 1,0 | 0,85 | 0,7 |
| Xác nhận ATC | tự động | sau 5 s | bấm X | bấm X |

## 9. Hồ sơ, xem lại, tổng kết
- Lưu trong `localStorage`: cài đặt, lịch sử 60 lần, kết quả tốt nhất theo cấu hình, 11 thành tích, bản ghi các chuyến tốt nhất (tối đa 12).
- **Xem lại (replay):** mô phỏng xác định (cùng seed + cùng thao tác theo số bước 0,05 s → cùng kết quả; có kiểm thử).
- **Tổng kết:** đồ thị tốc độ so với ATC theo thời gian, các ga, tin khẩn và danh sách điều cần cải thiện tự sinh.

## 10. Hiệu chuẩn và kiểm thử
- `node tests/run.js`: **2.564 kiểm tra đạt, 0 lỗi** (dữ liệu, tự lái, vật lý, ATC, cửa, sự kiện, xác định, chấm điểm, điều độ, hồ sơ, hướng dẫn).
- Tự lái đơn độc trên 79 chuyến mẫu của cả hai tuyến: **lệch giờ lớn nhất 38 s**, mọi ga dừng lệch < 3 m.
- Mạng điều độ không sự cố: trễ trung bình ≤ 1,5 phút ở cả 4 kịch bản (Tokaido xuống/lên, Tohoku xuống/lên); sự cố ngẫu nhiên đẩy trễ lên 1–3 phút và người chơi có thể cải thiện bằng lệnh.
- Hai lỗi nghiêm trọng đã tìm và sửa nhờ kiểm thử: (1) tàu chạy trước/tàu mạng bỏ qua thời gian đỗ ga; (2) tàu rẽ vào đường tránh chặn tàu nhanh phía sau làm kẹt cả tuyến.

## 11. Giới hạn đã biết **[?]**
- **Chưa có người chơi thật thử** (chỉ có bot/tự lái): cân bằng điểm và độ khó là ước đoán.
- Độ dốc là giả lập; công suất, sức cản, nấc phanh, mẫu ATC, thời lượng và xác suất sự kiện là **[I]**.
- Chưa có dữ liệu thật cho: số nút buồng lái N700S, độ dốc/cong theo km, độ trễ chính thức của ATC, lịch Kyushu chiều lên (PDF chưa dùng), lịch ngày nghỉ, Joetsu/Hokuriku/Hokkaido, tàu ghép/tách.
- **Hình tàu là ảnh của rail.kychung.com (CC BY-NC-ND)**: N700, N700S, E5, 800 series (và N700S-8000 sáu toa, chưa dùng). **N700 8 toa (Sakura/Mizuho) tạm dùng toa N700S** vì chưa có ảnh đúng livery Kyushu. Phong cảnh và người vẽ bằng code. **Âm thanh:** nền ga và tàu qua ga dùng bản ghi thật Odawara (public domain); tiếng còi **đã tắt** vì chưa có bản ghi còi thật của từng dòng tàu; các âm còn lại tổng hợp bằng code [I]. Quy tắc: **không tự vẽ tàu**, chỉ dùng ảnh từ nguồn đã được người dùng cho phép (xem `prototype/drive/assets/NGUON.md`).
- Góc nhìn đã chọn D (xem đầu tài liệu). Chưa quyết định có chuyển sang engine 3D thật hay không.

## 12. Cấu trúc mã
`sim.js` (lõi: vật lý, ATC, sự kiện, mạng, chấm điểm) · `scene.js` (khung cảnh) · `audio.js` (âm thanh, phát thanh) · `dispatch.js` (điều độ) · `tutorial.js` · `store.js` (hồ sơ) · `data-lines.js` (dữ liệu, sinh tự động) · `index.html` (giao diện, vòng lặp, kết thúc/tổng kết/hồ sơ) · `tests/run.js`.

## Bố trí ga, kết cấu và đường cong (cập nhật 21/10/2026)
- Mỗi ga có bố trí riêng (số đường, sân đảo/hai bên, đường thông qua) thay vì một kiểu cố định; tàu dừng chạy vào đường dừng có sân ga kề, tàu thông qua chạy đường thông qua; các đường toả ra từ đường chính trước ga ~1,1 km. Nguồn và phần suy luận: `docs/02-ha-tang.md` mục 8.
- Tuyến có đoạn nền đất, cầu cạn, cầu (sông bên dưới) và hầm (ở khung 2D mặt đất lùi xuống khi lên cầu cạn, hầm che hết phong cảnh); đường cong làm ray uốn ở khung buồng lái, thân tàu nghiêng nhẹ theo v²/R.
- Chưa làm: giới hạn tốc độ và độ êm theo bán kính cong; số đường ảnh hưởng sức chứa ga trong chế độ điều độ (hiện chỉ dùng cờ có đường thông qua).
