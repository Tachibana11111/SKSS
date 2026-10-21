# Dữ liệu lịch tàu thật (tháng 10/2026)

Mục đích: dữ liệu nền cho game điều độ Shinkansen (cá nhân, không phân phối). Tất cả đọc từ trang công khai, **chậm** (1,2 giây/yêu cầu), lưu đệm, và đã được đối chiếu chéo.

## Nguồn 1 – JR East, lịch tàu số, bản "2610" (tháng 10/2026)
Script: `tools/crawl_jreast.py` (`--day weekday|holiday`). Trang danh sách: ga **Tokyo** (xuống), **Shinagawa** (Tokaido/Sanyo xuống và lên), **Omiya** (Tohoku/Joetsu/Hokuriku lên về Tokyo), cộng **Shin-Aomori** (kể cả chuyến ◆, để có các chuyến Hokkaido). Mỗi dòng danh sách có link tới trang chi tiết chuyến.

| File | Nội dung |
|---|---|
| `lists-weekday-2610.csv`, `lists-holiday-2610.csv` | Mọi dòng khởi hành trên các trang danh sách (cả ◆): ga, giờ, loại, điểm đến, cờ ◆, link chuyến |
| `trains-weekday-2610.csv` | **596 chuyến** ngày thường: 570 định kỳ (không ◆) + 26 chuyến từ Shin-Aomori (gồm ◆); tên, số hiệu (tàu ghép có hai số), từ–đến, dòng xe (chỉ Tokaido/Sanyo), mẫu ngày chạy |
| `stops-weekday-2610.csv` | **6.469 dòng ga**: giờ đến/đi, số sân; `branch` (0 = Shinkansen, 1 = nhánh mini-Shinkansen của tàu ghép); `arr2/dep2/platform2` = giờ đoàn thứ hai ở dòng tách/ghép (Morioka, Fukushima) |
| `trains-holiday-2610.csv`, `stops-holiday-2610.csv` | **540 chuyến** thứ Bảy/ngày nghỉ (không ◆), **5.992 dòng ga** |

**Cờ ◆ (運転日注意):** chuyến chỉ chạy vào một số ngày; các dòng ◆ cùng giờ loại trừ lẫn nhau. Ngày chạy thật nằm ở lịch dạng bảng của trang chi tiết (ô `class="ok"`), script đọc thành `dow_pattern_MonSun` (so với cửa sổ ngày chung 18/9–31/12/2026; `-` là ngày không chạy).

## Nguồn 2 – JR West (JRおでかけネット), một ngày thật, ga Shin-Osaka
Script: `tools/crawl_jrwest.py --date YYYYMMDD`. Chỉ chuyến **rời Shin-Osaka** (nên không có tàu kết thúc ở Shin-Osaka, Kyushu chiều lên, Tsubame, Kamome).

| File | Nội dung |
|---|---|
| `jrwest-shinosaka-list-20261020.csv`, `jrwest-trains-20261020.csv`, `jrwest-stops-20261020.csv` | **Thứ Ba 20/10/2026**: 268 chuyến, 6.777 dòng ga (kể cả ga qua, `pass = Y`) |
| `jrwest-*-20261024.csv` | **Thứ Bảy 24/10/2026**: 310 chuyến, 7.752 dòng ga, cùng định dạng |

Dữ liệu có bản quyền của JR West và Kotsu Shimbunsha; **chỉ dùng cá nhân cho game, không tái phân phối**. robots.txt của cả hai trang cho phép.

## Kiểm chứng
- 4 CSV Tokyo xuống và 15 chuyến mẫu đọc tay bằng công cụ tóm tắt đã được đối chiếu với dữ liệu đọc trực tiếp từ HTML: **khớp 100%** (301/113/43/63 giờ khởi hành; 128 dòng ga, 0 sai lệch), nên đã xoá để tránh trùng.
- Số giờ khởi hành mỗi trang khớp số phần tử HTML thật.
- Ba lỗi của bộ đọc đã sửa: (1) thuộc tính `data-ext` làm sót dòng; (2) tàu ghép gộp hai đoàn vào một bảng (nay tách nhánh, lấy đủ hai số hiệu); (3) dòng tách/ghép có cột giờ thứ hai.
- Tại Tokyo, thời gian chiếm sân khi quay đầu đo từ dữ liệu (15 phút Tokaido, 11–12 phút Tohoku) khớp nguồn bài báo độc lập.

## Phân tích
- `python -X utf8 tools/analyze_timetable.py docs/data`: số chuyến, dải số hiệu, thời gian dừng, thời gian chạy giữa ga, khoảng cách giữa các chuyến.
- `python -X utf8 tools/analyze_extra.py docs/data`: chữ số nghìn của số hiệu, thời gian chiếm sân khi quay đầu.
- Kết quả đã tổng hợp trong `docs/04-bieu-do-chay-tau.md`.

## Giới hạn
- **JR East:** chỉ chuyến định kỳ ngày thường/ngày nghỉ; chuyến ◆ chỉ có ở danh sách (trừ Shin-Aomori). Không gồm tàu không qua Tokyo/Omiya/Shinagawa/Shin-Aomori (một số chuyến ngắn Mishima/Shizuoka, Tsurugi, Shin-Osaka–Nagoya…).
- **JR West:** chỉ một ngày mỗi tệp, chỉ chuyến rời Shin-Osaka. **Chưa có:** Kyushu chiều lên, Tsubame, Kamome (Nishi-Kyushu): chỉ có trên bảng PDF/ảnh.
- Lịch đổi mỗi kỳ sửa đổi. Dòng xe chỉ có trên trang Tokaido/Sanyo.
