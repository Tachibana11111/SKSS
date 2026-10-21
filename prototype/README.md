# Prototype lái tàu + điều độ (bản 0.4)

Mở `prototype/drive/index.html` trực tiếp bằng Chrome/Edge (không cần cài gì). Kiểm thử mô phỏng: `node tests/run.js` (không cần trình duyệt). Thiết kế đầy đủ, số liệu thật/tự đặt, giới hạn: **`docs/10-thiet-ke-game.md`**.

## Ba chế độ (thanh trên cùng)
- **Lái tàu:** chọn tuyến (Tokaido–Sanyo–Kyushu hoặc Tohoku), chiều, chuyến thật, ga đi/đến, độ khó, thời tiết, seed. Sự kiện ngẫu nhiên theo seed.
- **Điều độ:** nhiều tàu thật tự chạy, biểu đồ chạy tàu; lệnh giữ / thông qua / cho vượt.
- **Hướng dẫn:** 3 bài từng bước. **Hồ sơ:** thành tích, kết quả tốt nhất, lịch sử, xoá dữ liệu.

## Tệp
- `sim.js` lõi mô phỏng · `scene.js` khung cảnh · `audio.js` âm thanh và phát thanh · `dispatch.js` điều độ · `tutorial.js` · `store.js` hồ sơ · `index.html` giao diện.
- `data-lines.js` dữ liệu tuyến + lịch tàu thật (sinh bằng `tools/build_lines.py`; chỉ dùng cá nhân).
- `assets/`: ảnh tàu N700 (CC BY-NC-ND, không chia sẻ; xem `assets/NGUON.md`, được `.gitignore` bỏ qua), sinh lại bằng `tools/build_n700_sprite.py`.

## Lịch sử bản
0.1 lõi lái + tự lái · 0.2 tàu trước, thời tiết, điều độ ngẫu nhiên, độ khó, lịch Tokaido thật · 0.3 buồng lái đầy đủ hơn, tàu thật, âm thanh, khung cảnh · **0.4** nhiều tuyến/loại tàu, độ dốc, tải khách, nhiệt phanh, điện năng, sự cố mới (dây điện, cháy, bệnh, kế hoạch ngừng chạy, quyết định cho vượt, bất an hành khách), chế độ điều độ, hướng dẫn, hồ sơ, xem lại, tổng kết, bộ kiểm thử, git.

## Âm thanh thật (bản 0.4b)
- **Tiếng còi đã tắt** (chưa có bản ghi còi thật của từng dòng tàu; không dùng tiếng tự tổng hợp). Bấm H vẫn có hiệu lực (sự kiện công nhân/hươu), chỉ hiện chữ CÒI.
- **Nền ga và tàu qua ga dùng bản ghi thật Odawara** (`assets/audio/odawara_leaving.mp3`, public domain; xem `assets/NGUON.md`): đỗ ga thì phát nền ga lặp (10–118 s), tàu vượt ở ga tránh và tàu ngược chiều dùng các đoạn tàu qua. Các âm khác (cửa, chuông, ATC, mưa, tiếng chạy…) vẫn tổng hợp.
- Nếu mở bằng `file://` mà không nghe nền ga, chạy `python tools/serve.py prototype/drive 8765` rồi mở http://localhost:8765 (máy chủ này hỗ trợ tua âm thanh).
