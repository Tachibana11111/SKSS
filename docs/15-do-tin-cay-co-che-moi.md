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

## 6. Ghép/tách Tohoku + mini và đường đơn (11/2026)

| Cơ chế | Nhãn | Ghi chú |
|---|---|---|
| Hai bản ghi cùng số hiệu, cùng giờ ở đoạn chung là một đoàn ghép | **[D]** | Dò từ lịch hai tuyến (`miniPairs`); các cặp Hayabusa/Komachi và Yamabiko/Tsubasa |
| Chiều lên: mini nối vào đuôi Tohoku ở Morioka/Fukushima; chiều xuống: Tohoku tách, mini chạy trước | **[N]** | Mô tả vận hành Akita/Yamagata Shinkansen (docs/11); mức chi tiết thời gian là **[I]** |
| Lịch cho hai đoàn cùng giờ tới ga ghép | **[D]** | Dữ liệu thật; trong game Tohoku vào ga trước, mini vào sau (thứ tự là **[I]**) |
| Tàu mini phải chờ ngoài đoạn ghi nối cho tới khi Tohoku đỗ | **[I]** | Suy luận từ an toàn tuyến chung: không để hai đoàn cùng chiếm đoạn ghi nối |
| Đoạn ghi nối cách ga ghép 2 km, dài 1,2 km | **[I]** | Giá trị trong `LINE_META.junctions`, không có nguồn công bố |
| Chờ ở ga liền trước ga ghép (Shizukuishi, Yonezawa) | **[I]** | Chính sách của game theo yêu cầu thiết kế; hệ số 0,92 (thời gian chạy thực ≈ 90–98% kế hoạch) đo trong mô phỏng |
| Nối 100–300 s, đoàn Tohoku vào ga 34 s, hãm từ 90 km/h trong 420 m | **[I]** | Giá trị của game |
| Tàu bị giữ do đường đơn đứng đúng ga | **[I]** | Cách mô hình hoá giữ tàu; giữa hai ga chỉ một chiều được chiếm |

## Ghi chú soak test (2026-11-15)

Soak test là công cụ kiểm tra bất biến, không phải nguồn dữ liệu: ngưỡng của nó (đứng > 40 phút, đỗ ga > 60 phút, trễ > 4 giờ, nhảy vị trí) là **[I]**, chọn để lọc lỗi rõ ràng chứ không phải quy định vận hành thật.

## 7. Hạ tầng ga dựng lại từ sơ đồ 配線略図.net: Nishi-Kyushu (16/11/2026)

- **[D]** Đường chính, ghi, giao cắt, sân ga, chắn cuối đường đọc từ hình học SVG (xanh #0070c0 = Shinkansen, xám = Sasebo Line, hình chữ U đen = sân ga). Mã sân ga trích được (`PduP` ×4, `dPduPu` Nagasaki) khớp mã `2-2-0`/`2-4-0` đang dùng.
- **[I]** Hai hình khớp nhau bằng hai đường chính tại x=419.8 (nguồn không ghi chỗ nối); đường trên là đường xuống (Nhật chạy bên trái); vị trí ghi chéo trong game dùng hằng 1300/720 m vì sơ đồ không theo tỉ lệ.
- **[?]** Ký hiệu tín hiệu (hướng, loại) và các nét navy: chú giải của nguồn không giải thích; mockup bỏ chúng. Ý nghĩa ký hiệu A/B nối hình chỉ suy từ hình.
- **Giản lược có chủ ý:** bỏ Sasebo Line, bỏ cụm depot và cả ghi vào depot (đã thử làm một nhánh tượng trưng rồi bỏ để giữ gọn), bỏ tín hiệu.

## 8. Hokkaido dựng lại từ sơ đồ và điểm cứu hộ Seikan (17/11/2026)

- **[D]** Ghi chéo bốn ga Hokkaido đọc từ hình 010_01–010_05 (đồ thị `docs/data/haisen/hok_graph.json`): Shin-Aomori X kép hai đầu; Okutsugaru-Imabetsu đơn `'s'` trước ga + đơn `'r'` sau ga; Kikonai đơn `'r'` trước ga + đơn `'s'` sau ga (hai ga là ảnh gương của nhau); Shin-Hakodate-Hokuto X kép trước ga. **Sửa lỗi 17/11:** bộ trích từng bỏ sót ghi chéo đơn ở một đầu của Okutsugaru-Imabetsu và Kikonai (điều kiện nhận ghi chéo phụ thuộc thứ tự hai nút của cạnh nên cạnh nối đường lên → đường xuống bị xếp nhầm vào 'đường ga'); đã sửa trong `tools/haisen_graph.py`. **[I]** khoảng cách tới mép sân ga: Shin-Aomori 160 m (cả hai đầu), Okutsugaru-Imabetsu 120/240 m, Kikonai 120/200 m, Shin-Omura 40 m (đổi theo tỉ lệ 54 đơn vị = 440 m); ga cuối và X kép ga cuối vẫn dùng vị trí chung 1300/720 m.
- **[D → game]** Okutsugaru-Imabetsu (`PdduP`) và Kikonai (`PduuP`) trích được từ hình 010_02/010_04 đã vào game thành hai mã bố trí mới `2-3-0a` và `2-3-0b` (ba đường, hai sân ga ngoài; trước là `2-2-1`, bốn đường và có `loop` = 1). **[I]** vai trò đường 1435 mm nét mảnh (là đường dừng khi rẽ vào ở Okutsugaru-Imabetsu chiều xuống và Kikonai chiều lên; ở hướng kia tàu dừng thẳng trên đường chính); hai ga không còn tính là ga tránh được (cờ `loop` = 0 vì không có đường thông qua; kiểm tra lịch thật: không có chuyến nào chạy qua trong lúc tàu khác đang dừng ở hai ga này nên lịch không đổi).
- **[N]** 竜飛定点 và 吉岡定点 (cũ: 竜飛海底駅, 吉岡海底駅; 2 sân ga bên, 2 đường, rộng sân ga 84 cm; nơi chứa tới ~1000 người; phun nước, hút khói, ITV, phát thanh khẩn): toạ độ, độ sâu 135 m / 149,5 m, km thật khớp (19,5 / 23,0 km), từ Wikipedia JA (bài từng điểm) và trang JR Hokkaido (https://www.jrhokkaido.co.jp/corporate/shinkansen/tunnel.html). Hai nguồn tiếng Anh/Nhật lệch ≤ 80 m ở Yoshioka (game dùng bản JA). Ngày đóng ga 14 hay 15/3/2014 là nguồn lệch nhau, không ảnh hưởng game.
- **[I]** Dài 260 m, cao 1 m, rộng 1,3 m của sân ga trong buồng lái; màu đèn thoát hiểm xanh; hình dáng biển tên: nguồn không nêu. Sân ga thật đã dỡ hoặc rút ngắn sau 2014, nên đây là hình vẽ gợi ý, không phải hiện trạng.
- **[?]** Các nguồn không nói Tappi là "cực bắc Honshu" hay Yoshioka là "cực nam Hokkaido" (chỉ nói Yoshioka là ga cực nam Hokkaido khi còn hoạt động); toạ độ là điểm gần mặt đất, không phải vị trí dưới biển.
- **[K]** Cách đọc kana của 竜飛定点 (たっぴていてん) và 吉岡定点 (よしおかていてん) điền theo kiến thức nền, chưa đối chiếu nguồn chính thức; tên tiếng Anh/Việt ("Tappi Emergency Point", "Điểm cứu hộ Tappi") là bản dịch của tôi, không phải tên chính thức.

## 9. Kyushu Shinkansen (Hakata – Kagoshima-Chuo): đánh giá từ sơ đồ và đã đưa vào game, trừ Hakata (17/11/2026)

- **[D]** Năm hình `kyushu/010_01–010_05` ghép khít (bốn chỗ nối ≤ 0,6 đơn vị); đồ thị `docs/data/haisen/kyu_graph.json`, trang `kyu_layout.html`, trích bằng `tools/haisen_graph.py kyu`. **[!]** ở Hakata và Kagoshima-Chuo hai đường chính đổi cao độ trong hình nên bộ trích gán sai vai trò đường; hai ga này đánh giá bằng mắt.
- **Giữ nguyên mã bố trí (khớp hình):** Shin-Tosu `2-4-0`, Kurume `2-2-0`, Shin-Yatsushiro `2-2-0`, Shin-Omuta `2-2-0`, Shin-Tamana `2-2-0`, Kumamoto `2-4-0`, Shin-Minamata `2-3-0`, Izumi `2-2-0`, Sendai `2-2-0`, Kagoshima-Chuo `2-4-0` (4 đường, 2 sân như Nagasaki); Hakata `3-6-0` giữ, cần xem cùng hình Sanyo.
- **Cần đổi mã:** chỉ Chikugo-Funagoya (`2-3-0` → mã mới `dPduP`, đường tránh ở phía đường xuống, ảnh gương `2-3-0`). Shin-Yatsushiro giữ `2-2-0`: đường thứ ba trong hình là một **đường cụt** có chắn cuối sát sân ga trên; theo yêu cầu đã bỏ đường cụt cùng ghi vào nó khỏi đồ thị (`dropped` trong `kyu_graph.json`), nên ga còn `PduP`.
- **Ghi chéo (`xo`) khác mặc định cũ (X kép hai đầu mọi ga):** Kurume, Shin-Omuta, Shin-Tamana, Izumi: không có ghi chéo; Chikugo-Funagoya: đơn `s` trước + đơn `r` sau; Shin-Yatsushiro: đơn `r` trước (không có sau); Shin-Minamata: đơn `r` trước + đơn `s` sau; Sendai: đơn `r` sau; Kagoshima-Chuo: chỉ X kép trước (ga cuối; X sau nằm ngoài chắn cuối đường nên game vốn không vẽ, về cơ bản giữ nguyên); Shin-Tosu và Kumamoto: X kép hai đầu (giống mặc định).
- **[I]** khoảng cách ghi chéo → mét theo 54 đơn vị = 440 m (đa số 160 m; Sendai 80 m); chưa áp vào `build_lines.py`.
- **Đã áp vào game (17/11):** `xo` cho 11 ga theo bảng trên (Shin-Tosu, Kumamoto: X kép cách sân ga 160 m; Kurume, Shin-Omuta, Shin-Tamana, Izumi: không có ghi chéo; Chikugo-Funagoya: đơn `s` trước + đơn `r` sau; Shin-Yatsushiro: đơn `r` trước; Shin-Minamata: đơn `r` trước + đơn `s` sau; Sendai: đơn `r` sau 80 m; Kagoshima-Chuo: X kép trước, vị trí cũ vì ga cuối) và mã bố trí mới `2-3-0c` (`dPduP`) cho Chikugo-Funagoya. **Hakata chưa động** (ga chung với Sanyo, đợi mockup Sanyo). Đã kiểm bằng mắt cabview trước, cabview sau và minimap ở cả hai chiều.
