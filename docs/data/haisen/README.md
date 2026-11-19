# Sơ đồ bố trí đường ray (配線略図) của Shinkansen, từ 配線略図.net

**Nguồn:** 配線略図.net — https://www.haisenryakuzu.net/ (trang Shinkansen: https://www.haisenryakuzu.net/documents/jr/shinkansen/). Yamagata và Akita không có trang riêng, nằm trong trang tuyến thường: `ou_1` (奥羽本線 Fukushima–Akita) và `tazawako` (田沢湖線 Morioka–Omagari).

**Giấy phép:** tác giả cho phép dùng lại và chỉnh sửa theo **Creative Commons Attribution 4.0 (CC BY 4.0)** nếu ghi rõ nguồn: tên trang "配線略図.net" và địa chỉ https://www.haisenryakuzu.net/ (hoặc liên kết), ở gần nội dung được dùng, chữ dễ đọc. Điều khoản đầy đủ: https://www.haisenryakuzu.net/about/kiyaku/ (đọc 2026-11-16). Tác giả lưu ý đây là khảo sát cá nhân, có thể có sai sót; **không hỏi các công ty đường sắt** về nội dung này.

**Cách lấy:** người dùng đồng ý tải (2026-11-16). 76 tệp SVG (bỏ logo tiêu đề trang), mỗi lần cách 2 giây, định danh chung, theo `robots.txt` (tránh mọi URL chứa "ver"). Danh sách và URL từng tệp: `manifest.json`. Mỗi tuyến có ngày cập nhật khác nhau (xem trang chỉ mục): Tohoku và Hokkaido cũ nhất (2019).

**Cảnh báo:** tệp SVG là dữ liệu tải từ ngoài, không tin cậy: **không mở bằng trình duyệt hay công cụ chạy mã**; chỉ phân tích văn bản bằng script (Python `-I`). Chưa đưa vào git; quyết định sau.

**Tệp sinh ra (không phải bản gốc):** `mini_shinkansen_layout.html` (xếp các hình Tohoku/Yamagata/Akita cạnh nhau, không sửa nội dung SVG), `nks_graph.json` (đồ thị Nishi-Kyushu trích bằng `tools/haisen_graph.py`), `nks_layout.html` (nguyên bản ghép + mockup giản lược), và tương tự cho Hokkaido: `hkd_graph.json` + `hkd_layout.html` (5 hình 010_01–010_05 Shin-Aomori – Shin-Hakodate-Hokuto), và Kyushu: `kyu_graph.json` + `kyu_layout.html` (5 hình Hakata – Kagoshima-Chuo), và Hokuriku: `hok_graph.json` + `hok_layout.html` (7 hình `021_02`–`030_08`, Annaka-Haruna – Tsuruga; `030_01` Takasaki để sau vì dùng chung với Joetsu). và Joetsu: `jts_graph.json` + `jts_layout.html` (4 hình `010_02`–`020_05`, Jomo-Kogen – Niigata; `010_02` còn có Honjo-Waseda và Takasaki ngoài phạm vi). và Takasaki (nghiên cứu, hình Hokuriku `030_01`): `tks_graph.json` + `tks_layout.html`. `tools/haisen_xo.py` liệt kê ghi chéo theo ga từ các đồ thị này. Hai trang HTML nhúng SVG dạng ảnh đã lọc script/liên kết.

**Kiểm tra nguyên vẹn:** `manifest.json` ghi số byte và 16 ký tự đầu của SHA-256 của từng tệp SVG tải về; `.gitattributes` đặt `-text` cho các SVG này để git không đổi LF thành CRLF khi checkout trên Windows (đổi thì mã băm lệch).
- `kh_graph.json`, `kh_layout.html`: Kumagaya + Honjo-Waseda (ghép `joetsu/010_01` và `010_02`), từ `tools/haisen_graph.py kh`.
