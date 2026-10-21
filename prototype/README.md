# Prototype lái tàu (bản 0.3)

Mở `prototype/drive/index.html` trực tiếp bằng Chrome/Edge (không cần cài gì). Có thể chạy `node prototype/drive/selftest.js` để kiểm tra mô phỏng bằng tự lái.

## Tệp
- `sim.js`: lõi mô phỏng (vật lý lực kéo/phanh, ATC: mẫu giảm tốc + giới hạn vùng + giữ khoảng cách tàu trước, thế giới sự kiện, chấm điểm).
- `data-tokaido.js`: 79 chuyến Tokaido chiều lên (Shin-Osaka → Tokyo) từ lịch JR West 20/10/2026. Sinh bằng `tools/build_tokaido_catalog.py` (dữ liệu chỉ dùng cá nhân).
- `index.html`: giao diện, điều khiển, bản đồ tuyến, điện đàm.

## Cách chơi
Chọn chiều, tàu, ga đi/đến, độ khó, thời tiết, seed rồi Bắt đầu. Enter khởi hành; ↑/↓ chỉnh nấc; Space = N; Q = phanh khẩn; A = tự lái; 1/2/3 = tua nhanh.
Mục tiêu: dừng đúng vạch, đúng giờ, êm, ATC không phải phanh thay bạn, và xử lý đúng lệnh điều độ.

## Dữ liệu thật và phần tự đặt
- **Thật [D]:** giờ từng ga của 79 chuyến chiều lên; km các ga (docs/04); tàu chạy trước = chuyến thật khởi hành sớm hơn mà không bị vượt; tàu vượt qua ga tránh khi ta đang đỗ = nội suy từ lịch thật.
- **Chiều xuống [I]:** lấy đối xứng từ chiều lên (không có lịch chiều xuống từ Tokyo trong dữ liệu).
- **Số liệu tàu:** N700 715 t, 2,6 km/h/s, 13 nấc (docs/03, 07). **[I]:** công suất, sức cản, nấc phanh B1–B7, mẫu ATC 0,72 m/s², giới hạn Tokyo–Shinagawa 110 / đến km 90 là 270, bán kính tàu 400 m, đệm 400 m, thời gian sự kiện, xác suất sự kiện.
- **Thời tiết (docs/06 §5.3):** mưa 50 mm/h → 70 km/h, 60 mm/h → dừng; gió ≥ 30 m/s → dừng; tuyết Sekigahara 120/170 km/h; động đất → cắt điện, phanh khẩn, kiểm tra rồi chạy ≤ 70 km/h (docs/09).
- **Độ khó:** Dễ (gợi ý nấc phanh, dung sai rộng, 1 sự kiện) / Thường / Khó (không gợi ý, ATC chặt, 4–5 sự kiện, phản ứng phanh chậm hơn) / Chuyên gia (6–7 sự kiện, thêm sự cố nhiệt độ bệ trục, phản ứng chậm nhất).
- **Chưa có:** độ dốc, đường cong, cảnh buồng lái, âm thanh, tàu phía sau, phân phối khách, Tohoku/Sanyo.
- **Tự lái** chỉ để xem mẫu/kiểm tra; ở độ khó Khó trở lên nó có thể bị ATC phanh.

## Bản 0.3: buồng lái đầy đủ hơn
- Hai cần riêng (gia tốc P0–P13, phanh B1–B7/EB) có liên động; tốc độ không đổi (C); nút xác nhận ATC (X); còi (H); gạt mưa (V); đóng cửa (Enter) rồi mới khởi hành; nhắc lại lệnh điều độ (Y); bảng TIMS; nút bấm chuột.
- Sự kiện mới: khu nhân viên làm việc (phải bấm còi), động vật trên đường (còi xua đuổi, không thì va chạm), lỗi cửa toa (TIMS), thời tiết gắn với vị trí tàu để mưa/gió thật sự gặp được.
- Phím tự lái đổi sang T (A không còn dùng).
- Phần "thiết bị buồng lái": xem docs/07 §4.3 (chỗ nào có nguồn, chỗ nào là [I]/[K]).
- Bản 0.3b: đoàn tàu vẽ lại dạng N700 nhìn từ bên cạnh (16 toa, mũi khí động học, dải xanh, cần lấy điện, giá chuyển hướng) bằng canvas, không dùng ảnh tải về. Mũi tàu cố định trên màn hình, sân ga/biển khoảng cách/vạch trượt lại gần; có thước ±3 m khi gần vạch.
- Bản 0.3c: âm thanh tổng hợp bằng WebAudio (audio.js, không dùng file âm thanh): tiếng chạy/gió/mưa theo tốc độ, motor kéo, trụ điện lướt qua, phanh kêu/xì hơi, còi, chuông và còi cửa, ATC báo động, báo động động đất, điện đàm theo mức, chuông đến ga. Mọi âm là mô phỏng gần đúng [I].
- Bản 0.3d: âm thanh mở rộng (audio.js v2): phát thanh trên tàu bằng giọng nói của trình duyệt (SpeechSynthesis; tiếng Nhật hoặc Anh) kèm phụ đề tiếng Việt trong khung điện đàm; tiếng hành khách (rì rầm, ho, em bé, bước chân, vali); cơ khí (gạt cần, tiếp điểm, máy nén khí, xì hơi phanh, cửa khí nén, chuông ga, quạt gió, đoạn cách điện); hầm (có tiếng nổ áp suất, hầm Tanna vị trí xấp xỉ); tàu ngược chiều; sấm, gió hú, động đất. Lời phát thanh là mẫu tự soạn [I], không phải bản ghi JR.
- Bản 0.3e: dùng ảnh tàu thật (bản vẽ N700 của rail.kychung.com, CC BY-NC-ND 4.0, đã tải với sự đồng ý của người dùng): `tools/build_n700_sprite.py` cắt 16 toa, xoá nền, ghép dải ngang `drive/assets/n700_strip.png`. Khung cảnh cận (4,5 px/m, kéo giãn dọc ×2) hiện đầu tàu thật; không có ảnh thì tự dùng bản vẽ bằng code. Xem `drive/assets/NGUON.md`: chỉ dùng cá nhân, không chia sẻ.
- Bản 0.3f: khung cảnh cận cảnh viết lại thành `drive/scene.js`: bầu trời theo giờ trong ngày (ngày/hoàng hôn/đêm, sao, cửa sổ nhà sáng đèn), phong cảnh theo km (thành phố, đồng ruộng, núi thấp, núi Phú Sĩ ở km ~140 xấp xỉ [I]), tàu trước (nén theo khoảng cách), tàu vượt qua đường thông qua khi đỗ ga tránh, tàu ngược chiều (lịch trong sim, khớp với âm thanh), công nhân + đèn cảnh báo, hươu (bỏ chạy khi bấm còi, va chạm thì chớp sáng + rung), biển chạy chậm (số km/h) và biển giải toả, cửa hầm, tuyết, gió (cây nghiêng, vệt gió), sét (đồng bộ tiếng sấm), rung khi động đất, sân ga có biển tên ga (kanji + romaji), hành khách (giảm dần khi lên tàu), cửa chắn sân ga (mở khi mở cửa), nhân viên sân ga giơ tay khi đóng cửa. Tất cả vẽ bằng code [I], chỉ tàu dùng ảnh.
