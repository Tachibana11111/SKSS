# 15. Độ tin cậy của các cơ chế mới (tháng 11/2026)

Theo quy ước của dự án: **[N]** có nguồn (link ở tài liệu gốc), **[D]** từ dữ liệu/mã đã kiểm, **[I]** suy luận/đơn giản hóa của game, **[K]** kiến thức nền chưa kiểm chứng, **[?]** chưa rõ. Bảng dưới liệt kê các cơ chế thêm sau docs 10–13 (bản đồ thống nhất, sự cố ngẫu nhiên cho mọi tàu, ngó buồng lái, tàu kiểm tra) và nói rõ cái nào dựa trên nguồn, cái nào là con số của game.

## 1. Chuyển động của tàu trên bản đồ

| Cơ chế | Nhãn | Căn cứ / ghi chú |
|---|---|---|
| Giờ rời và giờ đến mỗi ga dừng | **[D]** | Lịch công bố 2610 (JR East) và 20/10/2026 (JR West), docs/data/README.md |
| Tăng tốc đều 0,6 m/s², phanh theo đường cong ATC 0,72 m/s² giữa hai ga | **[I]** | Hình dạng đường tốc độ do game chọn; chỉ đảm bảo đúng giờ đến/đi. 0,72 trùng `G.aATC` của tàu thật trong game |
| Giới hạn 80 km/h trong 1.300 m trước và 870 m sau ga (từ 18/11: bao cả đoạn cắt ghi chữ X ở ga cuối) có ghi rẽ vào đường sân ga | **[I]** | Giá trị do game đặt (docs/10 mục "Ghi, đường sân ga"); không có nguồn công bố giá trị chính xác |
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

- **[D]** Ghi chéo bốn ga Hokkaido đọc từ hình 010_01–010_05 (đồ thị `docs/data/haisen/hkd_graph.json`): Shin-Aomori X kép hai đầu; Okutsugaru-Imabetsu đơn `'s'` trước ga + đơn `'r'` sau ga; Kikonai đơn `'r'` trước ga + đơn `'s'` sau ga (hai ga là ảnh gương của nhau); Shin-Hakodate-Hokuto X kép trước ga. **Sửa lỗi 17/11:** bộ trích từng bỏ sót ghi chéo đơn ở một đầu của Okutsugaru-Imabetsu và Kikonai (điều kiện nhận ghi chéo phụ thuộc thứ tự hai nút của cạnh nên cạnh nối đường lên → đường xuống bị xếp nhầm vào 'đường ga'); đã sửa trong `tools/haisen_graph.py`. **[I]** khoảng cách tới mép sân ga: Shin-Aomori 160 m (cả hai đầu), Okutsugaru-Imabetsu 120/240 m, Kikonai 120/200 m, Shin-Omura 40 m (đổi theo tỉ lệ 54 đơn vị = 440 m); ga cuối và X kép ga cuối vẫn dùng vị trí chung 1300/720 m.
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

## 10. Hokuriku Shinkansen (Annaka-Haruna – Tsuruga): đánh giá từ sơ đồ và đã đưa vào game (18/11/2026)

- **[D]** Bảy hình 021_02–030_08 (hokuriku/) ghép khớp ≤ 1,0 đơn vị ở sáu chỗ nối; hai đường chính cùng cao độ suốt tuyến (đồ thị `docs/data/haisen/hok_graph.json`, mockup `hok_layout.html`). Cả 18 ga có token khớp mã bố cục hiện có của game (không đổi mã); ghi chéo chỉ có ở 6 ga 4 đường, Fukui và Tsuruga.
- **[D]** `xo`: Karuizawa, Nagano, Kanazawa X kép hai đầu; Joetsu-Myoko X kép trước + đơn s sau; Toyama đơn s trước + X kép sau; Fukui hai đơn r (gap 160/40 m); Tsuruga chỉ X trước; 11 ga 2 đường không có ghi chéo (Annaka-Haruna, Sakudaira, Ueda, Iiyama, Itoigawa, Kurobe-Unazuki-Onsen, Shin-Takaoka, Komatsu, Kagaonsen, Awara-Onsen, Echizen-Takefu).
- **[I]** Tsuruga: mockup cắt bốn đường (2 xuống, 2 lên) tại một vị trí và đặt 4 chắn cuối, bỏ ghi đơn s sau ga và đường dẫn về depot theo yêu cầu người dùng. Khoảng cách ghi chéo → mét theo tỉ lệ 54 đơn vị = 440 m.
- **Kiểm chứng:** test mục 33i (dữ liệu, vị trí hai chiều, thứ tự so với chỗ đường tránh, vẽ cabview trước/sau và minimap hai chiều); ảnh chụp 4 vị trí mỗi ga từ cổng 8765 (trong ga và từ ngoài vào ga, hai chiều) và camera sau cho Joetsu-Myoko, Toyama, Fukui.

## 11. Joetsu Shinkansen (Jomo-Kogen – Niigata): đánh giá từ sơ đồ và đã đưa vào game (19/11/2026)

- **[D]** Bốn hình 010_02–020_05 (joetsu/) ghép khớp ≤ 0,2 đơn vị ở ba chỗ nối (đồ thị `docs/data/haisen/jts_graph.json`, mockup `jts_layout.html`). Cả 6 ga có token khớp mã bố cục hiện có (không đổi mã); Niigata (`3-4-0`, `PdPduPu`) trùng hệt.
- **[D]** `xo`: Jomo-Kogen đơn s trước + đơn r sau; Echigo-Yuzawa đơn s trước + X kép sau; Urasa hai ghi đơn mỗi bên (trước ga s xa ~240 m rồi r gần ~120 m; sau ga r gần ~120 m rồi s xa ~240 m, cùng thứ tự ở cả hai chiều); Nagaoka đơn s trước + đơn r sau; Tsubame-Sanjo đơn r trước + đơn s sau; Niigata chỉ X trước.
- **[I]** Urasa: khoảng cách hai ghi đơn một bên = 190 m (150 m dài ghi trong game + 40 m theo hình; hình thật dài ghi ngắn hơn game), ghi gần giữ vị trí cũ 1300/720 m, ghi xa lệch thêm (phần tử thứ tư của `xo`).
- **[I]** Theo yêu cầu người dùng: Echigo-Yuzawa dùng bố cục ga hiện có, không vẽ nhánh Joetsu Line / Gala-Yuzawa (đuôi phía đông dựng lại theo khuôn Takasaki); Niigata bịt bằng 4 chắn cuối trên mockup (game đã có sẵn chắn cuối ở ga cuối).
- **Kiểm chứng:** test mục 33j (dữ liệu, vị trí hai chiều, thứ tự và khoảng cách Urasa, hướng vẽ từng ghi đơn, thứ tự so với chỗ đường tránh, vẽ cabview trước/sau và minimap); ảnh chụp từ cổng 8765, mỗi ghi chéo một ảnh tiến tới theo thứ tự chạy (hai chiều) và ảnh camera sau.

## Sức chứa ga ở chế độ mạng (2026-11-18)

- **[D]** Thí nghiệm (giữ 2–3 tàu đỗ 1500 s bằng lệnh `hold`): trước sửa có tới 2–3 tàu đứng cùng lúc ở Kurume (1 đường dừng) và 3 tàu ở Shin-Tosu (2 đường dừng); sau sửa không vượt số đường dừng (khoảng cách tàu chờ phía sau ≈ 398 m, sát đệm ATC 400 m).
- **[I]** Sức chứa = số đường dừng cùng chiều của mã ga (`Layout.stopCount`); không phân biệt đường chính hay đường nhánh. Tàu chạy suốt qua ga không dừng thì giữ cách xử lý cũ (bỏ qua tàu đỗ).
- **[?]** Chưa gán đường dừng cụ thể cho từng tàu, chưa mô phỏng việc tàu chờ ngoài ga để lấy đường trống theo đường ghi chéo.
- **[D]** Phân loại làn theo bố cục các đường (A = nhánh có sân ga, B = chính kiêm dừng, C = thông không sân ga): 6 kiểu (A,B,C) = (0,1,0) 80 ga-chiều, (1,0,1) 68, (1,1,0) 61, (2,0,1) 20, (2,1,0) 7, (3,1,0) 2; không kiểu nào có cả B và C.
- **[I]** Làn thông (`Layout.hasThrough`) suy từ bố cục, không dựa cờ `loop`: Okutsugaru-Imabetsu chiều xuống và Kikonai chiều lên có làn thông dù `loop` = false. Tàu chạy suốt không bị tàu đỗ ở đường dừng chắn ở các ga có làn thông; tàu dừng khẩn ở đường chính (`mainStop`) thì vẫn chắn. Sự kiện "dừng thêm vì tàu phía sau cần vượt" chỉ ở ga có làn thông hoặc từ 2 đường dừng cùng chiều.
- **[?]** Chưa gán làn cho từng tàu: làn dừng chọn theo số thứ tự ga (giới hạn 80 km/h và hình vẽ theo làn đó); trong mô hình ưu tiên "tàu dừng vào A trước, hết A mới vào B" thì quy tắc chắn tàu chạy suốt tương đương với đếm sức chứa như đang làm.
- **[I]** Cờ `loop` trong từng chuyến (`M[].loop`) tính THEO CHIỀU qua `stationLoop` (`sim.js`): cờ của ga (chữ số thứ ba của mã) hoặc `Layout.hasThrough` của chiều đó. Okutsugaru-Imabetsu chỉ có cờ khi chạy xuống, Kikonai chỉ khi chạy lên. Dữ liệu lịch hiện không có tàu nào chạy thẳng qua hai ga này lúc ta đỗ, nên phần vẽ tàu vượt trên làn thông không sân ga chưa được kiểm chứng bằng mắt [?].

## 12. Ga Takasaki và nút giao Joetsu – Hokuriku (19/11/2026)

- **[D]** Hình học ga (6 đường, hai sân ga, vị trí các ghi tách/nhập, ba ghi nối, hai ghi đơn s/r) từ hai hình `hokuriku/030_01` và `joetsu/010_02` (cùng token `dPdduuPu`); đường nhánh dưới kéo dài về phía đông thành đường Hokuriku lên.
- **[I]** Khoảng cách ngã rẽ: hình chỉ ~840 m kể từ sân ga, game giữ km 107 [K] (cách vạch dừng ~2 km); độ dài ghi trong ga (hình ngắn hơn, game kéo dài cho thuôn); đường cong S của ghi; đường Hokuriku lên cắt đồng mức hai đường chính Joetsu và hội tụ về đôi đường 4,3 m trên 360 m; Hokuriku chiều lên luôn qua đường nhánh dưới.
- **Đã thử và bỏ:** bản hai tầng (Hokuriku lên chui dưới cầu cạn Joetsu, mockup `tks_3d.html`, `tks_nut_giao.html`) theo yêu cầu người dùng; hai mockup giữ lại làm tài liệu nghiên cứu, không phản ánh bản trong game.
- **Hạn chế:** Hokuriku lên đi đường nhánh dưới cả khi không dừng nhưng chưa có giới hạn tốc độ rẽ ghi; cửa sổ hành khách vẽ làn B ở cùng mặt phẳng.

## 13. Kumagaya và Honjo-Waseda (19/11/2026)

- **[D]** Hai hình `joetsu/010_01` (Kumagaya, cùng hình với Omiya) và `010_02` (Honjo-Waseda) ghép khớp ở chỗ nối hai đường chính (`kh_graph.json`, `kh_layout.html`). Token Kumagaya `PdduuPu` = `2-3-1`, Honjo-Waseda `PdduuP` = `2-2-1`: không đổi mã. Honjo-Waseda không có ghi chéo; Kumagaya có ghi `s` xa (~361 m) và `r` gần (~240 m) trước ga, một ghi `s` (~239 m) sau ga.
- **[I]** Ga có đường tránh nên giữ vị trí cũ 1300/720 m, ghi `s` xa lệch thêm 190 m (như Urasa): khoảng cách theo hình khác nhau chút.

## 14. Fukushima và ngã rẽ Yamagata (22/11/2026)

- **[D]** Từ hình `ou_1/030_01` và `tohoku/010_05`: ga 6 đường, hai sân ga đảo (token `dPdDUuPu` = mã `2-4-1`); phía tây hai ghi đơn liền nhau giữa hai đường chính (s xa rồi r gần), phía đông một ghi đơn r; các đường ngoài tách theo thang (đường chính → đường nhánh → đường rìa); nhánh Yamagata có HAI đường mini rời đường ngoài phía nam ở phía đông ga rồi vượt qua hai đường chính sang phía bắc; một đường nữa đến từ ga tuyến thường Ou Line (không dựng).
- **[theo yêu cầu người dùng]** Hai đường rìa (bắc, nam) kéo dài sang đông, cách ghi đơn r khoảng 100 m rẽ bắc thành đường đôi Yamagata (ngã rẽ cách ga ~1,0 km thay vì 2,0 km); không cầu vượt (cắt đồng mức); mã bố cục riêng `2-4-1f`; chiều lên Yamabiko chờ ở đường rìa nam để Tsubasa tới ghép; thêm hai ghi đơn trên đoạn đường đôi sau khi tách khỏi tuyến cha; không dựng Ou Line.
- **[I]** Số đo theo 8,15 m/đơn vị sơ đồ (sơ đồ không theo tỉ lệ): vị trí các ghi tách/nhập (−700…−456 m và 60…305 m quanh vạch dừng), độ dài ghi nối rìa → nhánh (164 m); đường rìa nam hội tụ về đôi đường trên 600 m (độ dốc ngang ≤ ~1:6; mockup ban đầu 330 m cho độ dốc gấp 2 lần); khoảng cách 34,3 m giữa hai đường rìa tại ngã rẽ; vị trí hai ghi đơn trên đường đôi (z ≈ 1700 và 1900 m, không có trong sơ đồ).
- **Hạn chế:** không có cao độ trong sơ đồ (cắt đồng mức); tàu mini cũng đi đường rìa khi không dừng (thực tế mọi chuyến Yamagata đều dừng ở Fukushima); tàu Tohoku khác dùng ghi nối rìa → nhánh → đường chính (đoạn này là [I]).
