# Rà soát lỗ hổng mục 01–04: kết quả hoàn thiện

Ngày: 2026-10-20. Lần 3 (sau yêu cầu "hoàn thành nốt các hạng mục trong audit").

## A. Các hạng mục audit đã hoàn thành
| Hạng mục (từ audit lần 2) | Kết quả | Nơi ghi |
|---|---|---|
| Giờ qua ga giữa cho mọi chuyến | **JR East:** 570 chuyến định kỳ ngày thường, 6.219 dòng ga, cả hai chiều. **JR West:** 268 chuyến ngày thật 20/10/2026, 6.777 dòng ga (kể cả ga qua) | `data/` |
| Chiều lên | Có (Omiya/Shinagawa up, Shin-Osaka up) | `data/`, 04 §3c–3d |
| Lịch Sanyo, Kyushu (chiều xuống) | Có: Nozomi/Hikari/Kodama/Sakura/Mizuho qua Shin-Osaka; thời gian chạy và dừng | 04 §4–5 |
| Hokkaido, Akita, Yamagata từng ga | Có qua các chuyến Hayabusa/Hayate đi Shin-Hakodate và tàu ghép Komachi/Tsubasa | `data/`, 04 |
| Headway | Khoảng cách tối thiểu thực tế là 3 phút (lặp 24–90 lần mỗi chiều ở Shin-Osaka, cả ngày thường lẫn thứ Bảy). **Đính chính:** "20 chuyến/giờ" là hai chiều cộng lại, không phải một chiều | 04 §3c–3d |
| Ghép/tách tàu: thời gian | Morioka: Komachi 2 phút, Hayabusa 4 phút; Fukushima: Tsubasa rời 09:49, Yamabiko 09:50 | 04 §7 |
| Ghép tên ga ↔ cấu trúc ga Tohoku | Bốn ga vượt (Utsunomiya, Nasushiobara, Ichinoseki, Kitakami) được **củng cố bằng thời gian dừng**; bảng cấu trúc ga vẫn lấy từ Wikipedia | 02 §5, 04 §5.3–5.4 |
| N700S, E6, E8 gia tốc/phanh; khối lượng N700 | N700 715 t, 2,6 km/h/s; E6 302,7 t; E8 305,7 t; N700S chưa có số | 03 §2b |
| E3, ALFA-X | Có (E3 đã hết chạy định kỳ; "Hakobyun" chở hàng) | 03 |
| Quy luật số hiệu | Lẻ = xuống, chẵn = lên; hậu tố A/B/C/E/M; dải số | 04 §3c |
| Ý nghĩa ◆ và ngày chạy từng chuyến | ◆ = chú ý ngày vận hành; lịch ngày chạy đọc được từ HTML | `data/` |
| "7 phút" quay đầu | Xác minh ở Tokyo (12 phút quay đầu, 7 phút dọn, 23 người/tàu, từ 1991) | 04 §8 |
| Bán kính cong, độ dốc | Hokkaido 20,8‰/4.000 m; chuẩn chung 15‰ (18‰, 20‰); Tohoku/Hokuriku có | 02 §2 |

## B. Sai sót và lỗi đã sửa trong quá trình hoàn thiện
- 03: E7 Tokyo–Omiya 110/130 km/h; 02: tần số Hokuriku bốn đoạn; 01: cột km Tokaido.
- 04 v3: chỗ "bốn lượt Nozomi vượt" không có căn cứ (đã xóa); quy luật số hiệu v3 sai (đã thay bằng dữ liệu).
- **Bộ đọc dữ liệu (tools/crawl_jreast.py):** phát hiện và sửa 3 lỗi (thuộc tính `data-ext` làm sót dòng tàu; tàu ghép gộp hai đoàn vào một bảng nên cần tách nhánh; dòng tách/ghép có cột giờ thứ hai). Mẫu ngày chạy tính lại cho đúng (lịch trên trang để trống cả ngày ngoài kỳ).
- Các file đọc tay trước đó đã được đối chiếu khớp 100% với dữ liệu đọc trực tiếp rồi xoá để tránh trùng.

## C. Các hạng mục đã đóng trong đợt hoàn thiện cuối (2026-10-20)
| Hạng mục | Kết quả |
|---|---|
| Kyushu chiều lên, Tsubame, Kamome, Relay Kamome | Từ 3 file PDF (đã được người dùng cho phép tải): 53 chuyến Kyushu lên, Kamome 24/23, thời gian chạy từng ga, đổi tàu 3 phút tại Takeo-Onsen (04 §3e). Chỉ ghi số liệu tổng hợp vì PDF cấm đăng lại |
| Hokkaido chiều xuống/lên | 7 chuyến qua Shin-Aomori: Imabetsu → Kikonai (Seikan) 33 phút (04 §4) |
| Lịch ngày nghỉ | JR East 540 chuyến (`*-holiday-2610.csv`); JR West thứ Bảy 24/10: 310 chuyến (04 §3c-2, §3d) |
| Chữ số nghìn số hiệu JR East | 1–5 định kỳ, 6–7 theo mùa, 8–9 tăng cường; 4xxx = Hayabusa dừng Kurikoma-Kogen (11/11) (04 §3c) |
| Thời gian quay đầu | Tokyo: 15 phút (sân Tokaido), 11–12 phút (sân Tohoku); Shin-Osaka/Hakata/Morioka: cận dưới trên mẫu nhỏ (04 §8) |
| Gia tốc N700S, giảm tốc E5/E6/E8 | **Không có nguồn công khai**; dùng giá trị thay thế nhãn [I] (03 §2b) |
| Bán kính cong/độ dốc Joetsu | **Không có nguồn công khai**; dùng chuẩn chung full-spec nhãn [I] (02 §2) |

## C2. Còn lại (đã thử nhiều nguồn, không chặn mục 05)
1. Gia tốc N700S và giảm tốc E5/E6/E8 chính thức (JR Central/JR East không công bố số).
2. Bán kính cong và độ dốc Joetsu; độ dốc tối đa Tohoku.
3. Thời gian quay đầu công bố chính thức tại Shin-Osaka, Hakata, Morioka.
4. Kyushu chiều xuống (Tsubame xuống) từng ga: suy ra từ chiều lên.

## D. Câu hỏi cho người dùng
- Không còn câu hỏi chặn. (Đã xử lý: tải 3 file PDF theo phép của người dùng.)

## E. Quy ước ghi chú
Nhãn [N]/[D]/[I]/[K]/[?] (xem đầu mỗi tài liệu). Khi một [?] hoặc [K] được xác minh, cập nhật nhãn và ghi nguồn; khi bác bỏ, sửa nội dung và ghi vào mục B ở đây.
