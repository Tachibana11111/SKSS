# Prototype lái tàu + điều độ (bản 0.4)

> README dành cho người chơi (ảnh chụp, tính năng, phím, ghi công) có 3 ngôn ngữ ở thư mục gốc: [Tiếng Việt](../README.md) · [English](../README.en.md) · [日本語](../README.ja.md). Tệp này là ghi chú kỹ thuật của thư mục `prototype/` (tiếng Việt).

Mở `prototype/drive/index.html` trực tiếp bằng Chrome/Edge (không cần cài gì). Kiểm thử mô phỏng: `node tests/run.js` (không cần trình duyệt). Thiết kế đầy đủ, số liệu thật/tự đặt, giới hạn: **`docs/10-thiet-ke-game.md`**.

## Menu
Mở game là vào **màn hình chủ**: Lái tàu · Học lái · Hồ sơ · Cài đặt. Bấm **P** (hoặc Esc) khi đang chơi để mở menu **Tạm dừng**: Tiếp tục · Cài đặt · Hồ sơ · Chụp cảnh (F9) · Chơi lại · Về menu chính (hai nút cuối có hộp xác nhận). Esc quay lại màn trước.
- **Lái tàu:** màn Thiết lập chuyến đi: tuyến (7 tuyến: Tokaido–Sanyo–Kyushu, Tohoku–Hokkaido, Joetsu, Hokuriku, Nishi-Kyushu, Yamagata, Akita; xem `docs/11-mo-rong-tuyen.md`), chiều, tàu, ga đi/đến, độ khó, thời tiết, seed, ghép tàu nhánh. Sự kiện ngẫu nhiên theo seed.
- **Học lái:** 4 bài từng bước, mỗi bài một thẻ (đánh dấu bài đã xong). **Hồ sơ:** thành tích, kết quả tốt nhất, lịch sử, xoá dữ liệu.
- **Cài đặt:** ngôn ngữ, cảnh vật, bảng phím tắt. Phát thanh cố định giọng Nhật + phụ đề; có điện đàm thì tua tự về ×1 (không còn tuỳ chọn). Âm lượng và ù cabin ở nút loa trên thanh biểu tượng.
- Chế độ **Điều độ** (`dispatch.js`) hiện không có nút vào trong menu.

## Trình phát nhạc (music.js)
Thẻ nhỏ ở góc dưới trái phát 21 giai điệu ga Shinkansen từ video YouTube `bddFo2Vzi4A` qua trình nhúng chính thức (IFrame API, video nằm ngoài màn hình, không lưu tệp). Chỉ hiện ở menu (màn chủ, thiết lập, học lái, cài đặt, hồ sơ, ghi công); vào game hoặc lớp tạm dừng thì nhạc tạm dừng và thẻ ẩn, về menu thì phát tiếp. Tự phát từ lần bấm hoặc gõ phím đầu tiên của người chơi (trình duyệt chặn tự phát trước đó). Có: phát/tạm dừng, bài trước/sau, một nút đổi chế độ (lặp danh sách, lặp một bài, ngẫu nhiên), tắt tiếng + âm lượng, thanh tiến trình bấm để tua, thu gọn thành nút tròn, tên bài chạy ngang khi dài (song ngữ Anh/Nhật; tiếng Việt dùng tên Anh). Cần có mạng; hỏng thì thẻ tự ẩn. Lưu ý: ẩn hoàn toàn hình video có thể trái điều khoản của YouTube (người dùng đã chọn cách này).

## Đa ngôn ngữ (English · 日本語 · Tiếng Việt)
Ngôn ngữ chọn ở **Cài đặt** (ô thả xuống có cờ tròn); mặc định theo ngôn ngữ trình duyệt (vi/ja/en, còn lại là en). Đổi ngôn ngữ lưu vào cài đặt rồi tải lại trang (chuyến đang chạy không được lưu, có hỏi xác nhận). Tiếng Nhật hiển thị tên ga bằng chữ Hán và tên tuyến bằng tên Nhật; tiếng Anh và tiếng Việt giữ tên ga La-tinh.
- Khoá dịch là chính câu tiếng Việt gốc: trong mã viết `_t('câu tiếng Việt')` hoặc `_t('Chuyến {0} đi {1}', a, b)`; văn bản tĩnh trong `index.html` được dịch tự động theo nội dung. Bản dịch nằm ở `lang-en.js` và `lang-ja.js`; thiếu thì hiện lại tiếng Việt.
- Thêm chuỗi mới: viết `_t(...)`, thêm bản dịch vào hai tệp `lang-*.js`, chạy `node tests/run.js` (mục 29 báo thiếu bản dịch, sai chỗ điền `{n}`, chuỗi tiếng Việt còn lọt ở en/ja, khoá thừa). Không đặt biến/hàm tên `_t` hoặc `_s` ở nơi khác.
- Bản dịch tiếng Nhật do Claude viết; thuật ngữ đường sắt nên nhờ người bản ngữ xem lại.
- Chưa dịch: README, `docs/`, chế độ Điều độ (`dispatch.js`, hiện không có nút vào).

## Tệp
- `sim.js` lõi mô phỏng · `scene.js` khung cảnh nhìn ngang · `cabview.js` khung nhìn buồng lái phía trước (giả 3D) · `layout.js` bố trí ga, đường cong, cao độ · `audio.js` âm thanh và phát thanh · `dispatch.js` điều độ · `tutorial.js` · `store.js` hồ sơ · `i18n.js` + `lang-en.js` + `lang-ja.js` đa ngôn ngữ · `index.html` giao diện.
- `music.js` trình phát nhạc (YouTube IFrame API) · `transfers.js` + `transfers-en.js` tuyến đổi tàu tại ga (tên Nhật/Anh) · `japanmap.js` (47 tỉnh, `tools/build_japan.py`) + `japanmap_nt.js` (đảo Lãnh thổ phương Bắc, `tools/build_kurils.py`).
- `data-lines.js` dữ liệu tuyến + lịch tàu thật (sinh bằng `tools/build_lines.py`; chỉ dùng cá nhân).
- `assets/`: ảnh tàu N700 (CC BY-NC-ND, không chia sẻ; xem `assets/NGUON.md`, được `.gitignore` bỏ qua), sinh lại bằng `tools/build_n700_sprite.py`.

## Lịch sử bản
0.1 lõi lái + tự lái · 0.2 tàu trước, thời tiết, điều độ ngẫu nhiên, độ khó, lịch Tokaido thật · 0.3 buồng lái đầy đủ hơn, tàu thật, âm thanh, khung cảnh · **0.4** nhiều tuyến/loại tàu, độ dốc, tải khách, nhiệt phanh, điện năng, sự cố mới (dây điện, cháy, bệnh, kế hoạch ngừng chạy, quyết định cho vượt, bất an hành khách), chế độ điều độ, hướng dẫn, hồ sơ, xem lại, tổng kết, bộ kiểm thử, git.

## Âm thanh thật (bản 0.4b)
- **Tiếng còi đã tắt** (chưa có bản ghi còi thật của từng dòng tàu; không dùng tiếng tự tổng hợp). Bấm H vẫn có hiệu lực (sự kiện công nhân/hươu), chỉ hiện chữ CÒI.
- **Nền ga và tàu qua ga dùng bản ghi thật Odawara** (`assets/audio/odawara_leaving.mp3`, public domain; xem `assets/NGUON.md`): đỗ ga thì phát nền ga lặp (10–118 s), tàu vượt ở ga tránh và tàu ngược chiều dùng các đoạn tàu qua. Các âm khác (cửa, chuông, ATC, mưa, tiếng chạy…) vẫn tổng hợp.
- Nếu mở bằng `file://` mà không nghe nền ga, chạy `python tools/serve.py prototype/drive 8765` rồi mở http://localhost:8765 (máy chủ này hỗ trợ tua âm thanh).

## Chế độ thực tế (`realmode.js`)
- Ô đánh dấu đầu cột "Độ khó và điều kiện" ở màn Thiết lập. Bật: Độ khó = Thường (khoá), Thời tiết = Thực tế (khoá), danh sách tàu chỉ gồm chuyến còn ga rời ga từ giờ Nhật Bản hiện tại (tàu kiểm tra luôn dùng được, chạy trong khung giờ sau chuyến cuối), ô "Từ" chỉ còn ga chưa rời ga.
- Khi bấm Bắt đầu: `RealMode.snapshot` gọi Open-Meteo (mưa mm/h, tuyết cm/h, gió giật m/s theo giờ, ≤ 9 ga mẫu dọc đoạn chạy) và P2PQuake (động đất 3 giờ gần nhất); kết quả lưu vào `recipe.real`, `sim.js` chỉ đọc snapshot nên vẫn xác định (xem lại, chạy lại bằng R đều giống nhau). Mỗi nguồn lỗi độc lập; mất thời tiết thì dùng thời tiết ngẫu nhiên theo seed.
- `sim.js` (`realWeather`, `realQuakes`): vùng mưa/tuyết/gió theo giờ và theo đoạn giữa hai ga mẫu: mưa ≥ 50 mm/h chạy 70 km/h, ≥ 60 mm/h dừng; gió giật ≥ 30 m/s dừng, ≥ 25 m/s 170 km/h, ≥ 20 m/s 230 km/h; mưa 30 mm/h 170 km/h; tuyết 230/160/110 km/h (< 1, ≥ 1, ≥ 3 cm/h). Các mức không phải của thời tiết ngẫu nhiên là [I]. Động đất thật 震度 ≥ 4 trong 120 km quanh một ga của đoạn chạy: chạy kiểm tra 110 km/h (70 km/h nếu ≥ 5) ±40 km trong 90 phút (180 phút nếu ≥ 6-).
- Động đất thật xảy ra TRONG lúc chơi: `index.html` thăm dò P2PQuake mỗi 60 s (chỉ khi đang chạy chế độ thực tế, không tạm dừng, không xem lại); trận mới ≥ 震度3 trong 15 phút gần nhất đi vào chuyến bằng thao tác `quake` (ghi trong `recActs`, nên xem lại đúng) → `Sim.injectQuake`: 震度 ước lượng giảm 1 mỗi 60 km, ≥ 3,5 tại tàu thì cắt điện sau sóng S (như động đất ngẫu nhiên), gần tuyến thì chạy kiểm tra chậm, xa thì chỉ thông báo [I]. Chế độ thực tế không còn động đất ngẫu nhiên theo seed.
- Giữ tàu theo vùng (cả chế độ thực tế và thường): mưa ≥ 60 mm/h và gió ≥ 30 m/s tạo **vùng giữ tàu** (`zone.gate`, theo giờ); tàu chờ ở ga ngay TRƯỚC vùng đó (kể cả ga xuất phát) tới khi hết hạn (`gateZone` trong `departBlock`). Ga xuất phát của người chơi nay cũng bị chặn bởi lệnh giữ tàu, vùng giữ tàu và mất điện (trước đây bỏ qua). Trong lúc bị giữ ở ga đầu đồng hồ chuyến vẫn chạy nhưng sự kiện ngẫu nhiên không tính giờ đó (`W.depOff`); sự kiện thời tiết thật, thiên tai tại ga đầu và động đất thật theo đồng hồ tuyệt đối (`abs`). Chế độ thường: xác suất theo độ khó (Thường 10%, Khó 25%, Chuyên gia 50%, theo hạt giống) có thiên tai/thời tiết đã hiệu lực tại ga xuất phát (mưa ≥ 60 mm/h, gió ≥ 30 m/s hoặc động đất), giữ tàu 5–15 phút.
- Tàu theo lịch trên bản đồ (danh mục `natcat.js`) cũng theo cùng quy tắc: mưa ≥ 60 mm/h và gió ≥ 30 m/s tạo **ô giữ tàu** (`cell.stop`: tâm, bán kính, khoảng giờ; từ thời tiết thật, sự kiện thiên tai ngẫu nhiên và sự kiện tại ga xuất phát). Đoàn đang đứng ga (kể cả ga xuất phát) tới giờ rời ga mà đoạn đường tới ga kế tiếp (tính cả ga chạy thông qua trong `rec.s`, lấy mẫu mỗi 20 km) chạm ô thì ở lại; đoàn đang chạy bị dừng (đóng băng sát ga, sai số < 0,45 km) ở ga NGAY TRƯỚC đoạn chạm ô, kể cả ga lẽ ra chạy thông qua (`gateFor`). Các tàu phía sau xếp hàng theo quy tắc giãn cách sẵn có. Động đất đã áp cho mọi đoàn từ trước; đoàn xuất hiện muộn sau trận động đất (kể cả tại ga xuất phát) bị giữ phần còn lại.
- Sửa kèm: phanh ATC không còn bị kẹt khi tàu bị tàu phía trước chắn sát ga rồi dừng (điều kiện nhả trước đây không bao giờ đạt khi giới hạn = 0).
- Hạn chế: lịch trong `docs/data/` là một ngày điển hình (không phân biệt cuối tuần/lễ); P2PQuake có độ trễ vài phút sau trận động đất.
