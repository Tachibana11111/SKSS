# Prototype lái tàu + điều độ (bản 0.4)

Mở `prototype/drive/index.html` trực tiếp bằng Chrome/Edge (không cần cài gì). Kiểm thử mô phỏng: `node tests/run.js` (không cần trình duyệt). Thiết kế đầy đủ, số liệu thật/tự đặt, giới hạn: **`docs/10-thiet-ke-game.md`**.

## Menu
Mở game là vào **màn hình chủ**: Lái tàu · Học lái · Hồ sơ · Cài đặt. Bấm **P** (hoặc Esc) khi đang chơi để mở menu **Tạm dừng**: Tiếp tục · Cài đặt · Hồ sơ · Chụp cảnh (F9) · Chơi lại · Về menu chính (hai nút cuối có hộp xác nhận). Esc quay lại màn trước.
- **Lái tàu:** màn Thiết lập chuyến đi: tuyến (7 tuyến: Tokaido–Sanyo–Kyushu, Tohoku–Hokkaido, Joetsu, Hokuriku, Nishi-Kyushu, Yamagata, Akita; xem `docs/11-mo-rong-tuyen.md`), chiều, tàu, ga đi/đến, độ khó, thời tiết, seed, ghép tàu nhánh. Sự kiện ngẫu nhiên theo seed.
- **Học lái:** 4 bài từng bước, mỗi bài một thẻ (đánh dấu bài đã xong). **Hồ sơ:** thành tích, kết quả tốt nhất, lịch sử, xoá dữ liệu.
- **Cài đặt:** phát thanh, cảnh vật, về ×1 khi có điện đàm. Âm lượng và ù cabin ở nút loa trên thanh biểu tượng.
- Chế độ **Điều độ** (`dispatch.js`) hiện không có nút vào trong menu.

## Tệp
- `sim.js` lõi mô phỏng · `scene.js` khung cảnh nhìn ngang · `cabview.js` khung nhìn buồng lái phía trước (giả 3D) · `layout.js` bố trí ga, đường cong, cao độ · `audio.js` âm thanh và phát thanh · `dispatch.js` điều độ · `tutorial.js` · `store.js` hồ sơ · `index.html` giao diện.
- `data-lines.js` dữ liệu tuyến + lịch tàu thật (sinh bằng `tools/build_lines.py`; chỉ dùng cá nhân).
- `assets/`: ảnh tàu N700 (CC BY-NC-ND, không chia sẻ; xem `assets/NGUON.md`, được `.gitignore` bỏ qua), sinh lại bằng `tools/build_n700_sprite.py`.

## Lịch sử bản
0.1 lõi lái + tự lái · 0.2 tàu trước, thời tiết, điều độ ngẫu nhiên, độ khó, lịch Tokaido thật · 0.3 buồng lái đầy đủ hơn, tàu thật, âm thanh, khung cảnh · **0.4** nhiều tuyến/loại tàu, độ dốc, tải khách, nhiệt phanh, điện năng, sự cố mới (dây điện, cháy, bệnh, kế hoạch ngừng chạy, quyết định cho vượt, bất an hành khách), chế độ điều độ, hướng dẫn, hồ sơ, xem lại, tổng kết, bộ kiểm thử, git.

## Âm thanh thật (bản 0.4b)
- **Tiếng còi đã tắt** (chưa có bản ghi còi thật của từng dòng tàu; không dùng tiếng tự tổng hợp). Bấm H vẫn có hiệu lực (sự kiện công nhân/hươu), chỉ hiện chữ CÒI.
- **Nền ga và tàu qua ga dùng bản ghi thật Odawara** (`assets/audio/odawara_leaving.mp3`, public domain; xem `assets/NGUON.md`): đỗ ga thì phát nền ga lặp (10–118 s), tàu vượt ở ga tránh và tàu ngược chiều dùng các đoạn tàu qua. Các âm khác (cửa, chuông, ATC, mưa, tiếng chạy…) vẫn tổng hợp.
- Nếu mở bằng `file://` mà không nghe nền ga, chạy `python tools/serve.py prototype/drive 8765` rồi mở http://localhost:8765 (máy chủ này hỗ trợ tua âm thanh).
