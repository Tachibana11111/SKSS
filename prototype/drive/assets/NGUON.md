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
