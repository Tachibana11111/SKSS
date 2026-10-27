# Lái Shinkansen (bản thử)

Game lái tàu Shinkansen của 5 công ty JR, chạy hoàn toàn trong trình duyệt (HTML/JS, không cần cài gì). Dự án sở thích, **không chính thức và không liên quan tới JR hay bất kỳ công ty nào được nhắc tên**. Tên, mẫu tàu, tên ga là tên gọi thật chỉ nhằm mô phỏng.

**Chơi:** trang GitHub Pages của kho này (xem tab *Settings → Pages*), hoặc mở `prototype/drive/index.html` bằng Chrome/Edge.

## Có gì
7 tuyến (Tokaido–Sanyo–Kyushu, Tohoku–Hokkaido, Joetsu, Hokuriku, Nishi-Kyushu, Yamagata, Akita), 13 nấc điều khiển, ATC, đoạn cách điện đổi tần số, cần vẹt, thời tiết, sự cố ngẫu nhiên, cảnh vật dựng từ dữ liệu OpenStreetMap. Tài liệu nghiệp vụ nằm ở [`docs/`](docs/00-progress.md), thiết kế ở [`docs/10-thiet-ke-game.md`](docs/10-thiet-ke-game.md).

## Điều khiển nhanh
| Phím | Việc |
|---|---|
| W / S | tăng / giảm cần gia tốc (13 nấc) |
| ↓ / ↑ | tăng / giảm cần phanh (nhả về 0 mới kéo lại) |
| Space · Q | về N · phanh khẩn |
| Enter | đóng cửa, đèn sáng thì kéo cần để đi |
| C · [ ] | tốc độ không đổi · chỉnh ∓5 km/h |
| A · G · V · L | ATC (bấm 2 lần để cắt) · cần vẹt · gạt mưa · đèn pha |
| Y / N · M | nhắc lại lệnh, chấp nhận / từ chối · phát thanh trấn an |
| X · K | (tàu kiểm tra) bật đo · đánh dấu lỗi |
| Tab · B · H · O | đổi khung nhìn · camera cuối đoàn · chế độ tập trung · ẩn điện đàm |
| , · . | cửa sổ hành khách bên trái · bên phải (toa giữa đoàn, bấm lại để về buồng lái) |
| J | bật/tắt tiếng ù cabin máy bay (cũng có ô ở menu phải) |
| D | mở/đóng bản đồ toàn quốc (47 tỉnh, 10 tuyến theo màu Wikipedia, mọi tàu chạy theo lịch thật; con lăn zoom, kéo di chuyển, bấm ga hoặc tàu xem chi tiết; cũng có nút trên bản đồ nhỏ) |
| P | còi (game cũng tự bấm còi ở khu làm việc, hươu, ga không dừng, đường ngang, tàu đứng phía trước) |
| Esc · nút ⏸ · F9 | tạm dừng · chụp cảnh (ảnh + tệp JSON dựng lại cảnh) |
| 1 2 3 · T · R | tua ×1/×4/×16 · tự lái · chạy lại |

Lần đầu vào trang có wizard ba trang (chọn chế độ, phím bấm, ghi công); xem lại ở tab Hồ sơ. Mở tab **Hướng dẫn** để học 4 bài: lái và dừng ga, thiết bị, sự cố, cần vẹt và ATC.
Chạy ở máy: `python -m http.server` trong thư mục `prototype/drive` rồi mở `http://localhost:8000` (mở thẳng tệp thì âm thanh nền ga không tua được).

## Kiểm thử và triển khai
```
node tests/run.js                # kiểm thử mô phỏng (~4 phút)
node tests/run.js --time         # in thời gian từng phần
node tests/run.js --shard=1/4    # chỉ chạy lô 1 trong 4 (chia để chạy song song)
```
GitHub Actions: `ci.yml` chạy kiểm thử mỗi lần đẩy mã; `pages.yml` chạy kiểm thử rồi đưa thư mục `prototype/drive` lên GitHub Pages.

## Ghi công và giấy phép tài nguyên
| Thành phần | Tác giả / nguồn | Giấy phép |
|---|---|---|
| Biểu tượng tab trang (`prototype/drive/assets/logo.png`) | 西日本旅客鉄道 (JR West), [File:Shinkansen-W.png](https://commons.wikimedia.org/wiki/File:Shinkansen-W.png), Wikimedia Commons | CC BY-SA 4.0 |
| Hình tàu 2D (N700, N700S, E5, E6, E7/W7, E8, H5, 800, N700S-8000, 923, E926, E2) và hình mặt trước cắt từ các hình đó | Nanyue Express / K.Y. Chung — [rail.kychung.com](https://rail.kychung.com/) | CC BY-NC-ND 4.0. Dải toa trong `prototype/drive/assets/*_strip.*` là bản cắt ghép từ hình gốc; **chỉ dùng phi thương mại**, chủ sở hữu hình có quyền yêu cầu gỡ. Xem `prototype/drive/assets/NGUON.md`. |
| Bản đồ, nhà, đường, công viên, cây | © OpenStreetMap contributors — [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright), dữ liệu tải từ [Geofabrik](https://download.geofabrik.de/) | ODbL 1.0. Dữ liệu biên dịch trong `prototype/drive/world/` là cơ sở dữ liệu phái sinh, cũng theo ODbL. |
| Tiếng nền ga và tàu qua ga | Flavien Gillié, "Odawara Station, Préfecture de Kanagawa, Japon – Shinkansen train leaving for Tokyo", Internet Archive `aporee_70029_81567` | Public Domain Mark 1.0 |
| Bố trí đường và sân ga từng ga | Wikipedia tiếng Nhật (các bài về từng ga) | CC BY-SA 4.0 |
| Lịch tàu thật tháng 10/2026 (`docs/data/`, `data-lines.js`) | JR East (lịch tàu số), JR West / JRおでかけネット (một ngày thật) | Dữ liệu thuộc về JR East, JR West và Kotsu Shimbunsha; đọc từ trang công khai (robots.txt cho phép). Dùng làm dữ liệu mô phỏng, không chính thức. |
| Số liệu kỹ thuật, quy trình, sự cố | Danh mục nguồn ở cuối từng tệp trong `docs/` (JR Central, JTSB, trafficnews, Wikipedia…) | Chỉ trích dẫn, không chép nguyên văn |

Nếu bạn là chủ sở hữu một tài nguyên ở trên và muốn gỡ hoặc ghi công khác, hãy mở issue; tài nguyên sẽ được gỡ.

## Giấy phép
**Mã nguồn** (các tệp `.js`, `.html`, `.py` do tác giả viết) theo [MIT](LICENSE), © 2026 Tachibana11111.

Giấy phép MIT **không áp dụng** cho: hình tàu và dải toa (CC BY-NC-ND 4.0, K.Y. Chung), dữ liệu OpenStreetMap đã biên dịch (ODbL), âm thanh, lịch tàu và tài liệu nghiệp vụ; mỗi thứ giữ giấy phép hoặc điều kiện riêng ghi ở bảng trên. Tên "Shinkansen", "JR" và tên các mẫu tàu thuộc chủ sở hữu tương ứng; giấy phép này không cấp quyền dùng chúng.
