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

## Bổ sung 2026-10-30 (người dùng tự tải về, chỉ cho hình nền menu)
Cùng nguồn Nanyue Express / K.Y. Chung (rail.kychung.com), cùng giấy phép CC BY-NC-ND 4.0, chỉ dùng cá nhân. Ba mẫu cũ này **chỉ** dùng làm hình nền menu chính (không nạp vào game, không có trong `sprites.js`); ảnh gốc không đưa vào git.

| Tệp gốc | Mẫu | Dải sinh ra |
|---|---|---|
| `jrwest_500_7000_large.webp` | 500 series 7000 (Kodama, 8 toa) | `w500_strip.png` |
| `jreast_e4_pink_large.png` | E4 Max (8 toa) | `e4_strip.png` |
| `jreast_e3-2000_large.webp` | E3-2000 Tsubasa (7 toa) | `e3_strip.*` |

Dựng bằng `python -X utf8 tools/build_vehicle_sprites.py w500 e4 e3` (500 series và E4 có nền chuyển sắc nên cắt bằng cách trừ nền đa thức rồi giữ thành phần liên thông lớn nhất; còn sót vài mảnh nền xanh rất mờ ở 500 series).

Hình mặt trước (`front_*`) cắt từ góc các ảnh này bằng `tools/build_front_sprites.py`. Hình nhìn từ trên (`top_*`) vẫn dựng từ ảnh SimplePlanes, chỉ đổi màu theo mẫu tàu.

## Logo JR (jr_hokkaido/east/central/west/kyushu.png)
Cắt từ ảnh tổng hợp logo các công ty JR do người dùng cung cấp (2026-10-30), tách nền thành trong suốt (logo một màu phẳng). Là nhãn hiệu của JR Hokkaido, JR East, JR Central, JR West, JR Kyushu; dùng ở màn hình chủ (theo yêu cầu của người dùng, có đưa vào git để hiện trên bản deploy GitHub Pages); thiếu tệp thì trang tự ẩn logo. Logo thuộc chủ sở hữu nhãn hiệu, chỉ để minh hoạ, dự án không chính thức và không liên quan tới JR.

## Biểu tượng tab trang (logo.png)
`logo.png` (304×299): pictogram Shinkansen của 西日本旅客鉄道 (JR West), [File:Shinkansen-W.png](https://commons.wikimedia.org/wiki/File:Shinkansen-W.png) trên Wikimedia Commons, **CC BY-SA 4.0**; tải trực tiếp từ https://upload.wikimedia.org/wikipedia/commons/8/88/Shinkansen-W.png ngày 2026-10-23 theo yêu cầu của người dùng. Chưa chỉnh sửa. Dùng làm favicon (`<link rel="icon">` trong `index.html`).

## Bản đồ nền toàn quốc (japanmap.js)
Ranh giới 47 tỉnh Nhật Bản từ **geoBoundaries** (gbOpen, JPN ADM1, dữ liệu năm 2017), https://www.geoboundaries.org, giấy phép **ODbL 1.0**: phải ghi nguồn, bản dẫn xuất giữ cùng giấy phép. File gốc 2,2 MB nằm ở `tools/data-src/` (không đưa lên git); `tools/build_japan.py` đơn giản hoá thành `prototype/drive/japanmap.js` (~60 KB).

## Các đảo Lãnh thổ phương Bắc (japanmap_nt.js)
Đường bờ Kunashiri (国後島), Etorofu (択捉島), Shikotan (色丹島) và nhóm Habomai (歯舞群島) lấy từ **OpenStreetMap** (`natural=coastline`, © OpenStreetMap contributors, **ODbL 1.0**: phải ghi nguồn, bản dẫn xuất giữ cùng giấy phép). Tải ngày 2026-10-30 qua Overpass API (bản sao https://maps.mail.ru/osm/tools/overpass/api/interpreter, vì overpass-api.de không truy cập được từ máy này) theo yêu cầu của người dùng; truy vấn `way["natural"="coastline"](43.2,145.2,45.6,148.95); out geom;`, kết quả 6,9 MB đặt ở `tools/data-src/kurils_overpass.json` (không đưa lên git). `python -X utf8 tools/build_kurils.py` nối các đoạn bờ thành vành khép kín, đơn giản hoá và ghi `prototype/drive/japanmap_nt.js` (~7 KB). Các đảo này do Nga quản lý thực tế, Nhật coi là lãnh thổ của mình; game chỉ vẽ nét đứt, tô nhạt để phân biệt với ranh giới 47 tỉnh.
`japanmap.js` từ 2026-10-30 giữ mọi đảo có trong nguồn geoBoundaries (424 đa giác, đảo nhỏ được đơn giản hoá nhẹ hơn), không còn bỏ đảo nhỏ hơn ~40 km².

## Ảnh xem trước ở màn Thiết lập chuyến đi (pv_*.png)
Dựng bằng `python -X utf8 tools/build_setup_preview.py` từ chính các bản vẽ ở trên (toa mũi + 2 toa kế sau, tỉ lệ 0.7, đủ phần mũi tàu); đăng ký trong `pv.js`. Cùng giấy phép CC BY-NC-ND 4.0, chỉ dùng cá nhân.
