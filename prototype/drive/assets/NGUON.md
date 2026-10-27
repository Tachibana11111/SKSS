# Nguồn tài nguyên hình ảnh

Tất cả là bản vẽ 2D của **Nanyue Express / K.Y. Chung (rail.kychung.com)**, giấy phép **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 (CC BY-NC-ND 4.0)**.
Người dùng đã đồng ý cho tải vào ngày 2026-10-21. Chỉ dùng cá nhân/nội bộ trong dự án này; **không đưa lên mạng, không chia sẻ, không dùng thương mại** (điều kiện NC và ND). Các dải toa sinh ra bằng script là sản phẩm phái sinh, cũng không được chia sẻ.

| Tệp gốc (`src_*`/`n700_jrwest_large.webp`) | Nguồn | Dùng cho |
|---|---|---|
| `n700_jrwest_large.webp` | https://rail.kychung.com/en/2d-en/shinkansen-n700-series/ (ảnh `jrwest_n700_large.webp`) | N700 |
| `src_n700s.webp` | https://rail.kychung.com/en/2d-en/shinkansen-n700s-series/ (`jrwest_n700s_large.webp`) | N700S, và tạm cho N700 8 toa |
| `src_e5.webp` | https://rail.kychung.com/en/2d-en/shinkansen-e5-series/ (`jreast_e5.webp`) | E5 (Tohoku) |
| `src_s800.png` | https://rail.kychung.com/en/2d-en/shinkansen-700-series-2/ (`jrkyushu_800_large.png`) | 800 series (chưa có chuyến) |
| `src_n700s8.webp` | https://rail.kychung.com/en/2d-en/shinkansen-n700s-8000-series/ (`jrkyushu_n700s.webp`) | N700S-8000 sáu toa Kamome (chưa dùng) |

Sinh lại dải toa: `python -X utf8 tools/build_n700_sprite.py` (N700) và `python -X utf8 tools/build_vehicle_sprites.py` (còn lại). Các tệp `src_*`, `*_strip.*`, `sprites.js` nằm trong `.gitignore`.

## Âm thanh

| Tệp | Nguồn | Giấy phép | Ghi chú |
|---|---|---|---|
| `audio/odawara_leaving.mp3` (8,9 MB, 6 phút 30) | Internet Archive `aporee_70029_81567`, Flavien Gillié, "Odawara Station, Préfecture de Kanagawa, Japon – Shinkansen train leaving for Tokyo" | Public Domain Mark 1.0 | Đã tải 2026-10-21 với sự đồng ý của người dùng. Phân tích phổ: **không có tiếng còi**; có tiếng nền ga và các lần tàu qua/rời ga (khoảng 2:00, 3:00, 4:30, 5:30). Thư mục `audio/` nằm trong `.gitignore`. |

Chưa tải được: ba bản ghi trên Pixabay (Shinkansen pulling into the station; KoriyamaShinkansenStation; Train_horn) vì Pixabay chặn tải tự động bằng Cloudflare; tôi không vượt cơ chế chống bot. Người dùng có thể tự tải về và đặt vào `audio/`.

## Hình mặt trước (front_*.png)
Cắt từ chính các bản vẽ ở trên (góc hình mặt trước nhỏ trong ảnh nguồn) bằng `tools/build_front_sprites.py`; cùng giấy phép CC BY-NC-ND 4.0, chỉ dùng cá nhân, không phân phối. Dùng cho tàu chạy trước/ngược chiều trong khung nhìn buồng lái.

## Hình toa nhìn từ trên (top_*.png)
Dựng bằng `tools/build_top_sprites.py` từ **một** ảnh toa đầu nhìn từ trên xuống do người dùng cung cấp (`src_top_head.png`), lấy từ mô hình SimplePlanes "Shinkansen - The Bullet Train" (https://www.simpleplanes.com/a/5vwi55/Shinkansen-The-Bullet-Train; trang chặn truy cập tự động nên tôi không tải gì từ đó). Toa giữa cắt từ phần thân phẳng, toa đuôi là toa đầu lật dọc, tô màu theo từng mẫu tàu. Chỉ dùng cá nhân, không phân phối.

## Bổ sung 2026-10-22 (người dùng tự tải về)
Cùng nguồn Nanyue Express / K.Y. Chung, cùng giấy phép CC BY-NC-ND 4.0, chỉ dùng cá nhân. Người dùng tự tải và đặt vào `assets/`.

| Tệp | Dùng cho |
|---|---|
| `e7 w7.png` | E7/W7 (Joetsu, Hokuriku) -> dải `e7_strip.*` |
| `e6.png` | E6 (Komachi) -> `e6_strip.*` |
| `e8.png` | E8 (Tsubasa) -> `e8_strip.*` |
| `h5.png` | H5 (Hokkaido) -> `h5_strip.*` |
| `doctor yellow.png` | 923 Doctor Yellow -> `t4_strip.*` (tàu kiểm tra Tokaido/Sanyo) |
| `east-i.png` | E926 East i -> `e926_strip.*` (tàu kiểm tra JR East) |
| `jreast_e2-1000_large.png` (sao chép thành `src_e2.png`) | E2-1000 (10 toa) -> `e2_strip.*`, `front_e2.png`; người dùng tự tải 23/10/2026 từ rail.kychung.com (CC BY-NC-ND 4.0) |

Hình mặt trước (`front_*`) cắt từ góc các ảnh này bằng `tools/build_front_sprites.py`. Hình nhìn từ trên (`top_*`) vẫn dựng từ ảnh SimplePlanes, chỉ đổi màu theo mẫu tàu.

## Biểu tượng tab trang (logo.png)
`logo.png` (304×299): pictogram Shinkansen của 西日本旅客鉄道 (JR West), [File:Shinkansen-W.png](https://commons.wikimedia.org/wiki/File:Shinkansen-W.png) trên Wikimedia Commons, **CC BY-SA 4.0**; tải trực tiếp từ https://upload.wikimedia.org/wikipedia/commons/8/88/Shinkansen-W.png ngày 2026-10-23 theo yêu cầu của người dùng. Chưa chỉnh sửa. Dùng làm favicon (`<link rel="icon">` trong `index.html`).

## Bản đồ nền toàn quốc (japanmap.js)
Ranh giới 47 tỉnh Nhật Bản từ **geoBoundaries** (gbOpen, JPN ADM1, dữ liệu năm 2017), https://www.geoboundaries.org, giấy phép **ODbL 1.0**: phải ghi nguồn, bản dẫn xuất giữ cùng giấy phép. File gốc 2,2 MB nằm ở `tools/data-src/` (không đưa lên git); `tools/build_japan.py` đơn giản hoá thành `prototype/drive/japanmap.js` (~60 KB).
