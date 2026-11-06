# 13. Melody và chuỗi thông báo (PA) — quy tắc trong game

Nhãn: **[N]** theo yêu cầu của người chơi (cá nhân, không phân phối) · **[I]** suy luận/đơn giản hóa.

## Nguồn âm thanh [N]
Một file âm thanh `prototype/drive/assets/melody/melodies.m4a` (khoảng 3,9 MB, tải một lần từ video nhạc nền đang dùng ở menu, id `bddFo2Vzi4A`; chỉ dùng cá nhân). Mỗi melody là một đoạn trong file, mốc [từ, đến] ở `melody.js` (`SEG`), đo bằng cách giải mã âm thanh rồi lấy đoạn có tiếng giữa các mốc ghi trong `music.js`. Mục "West Kyūshū (Departure/Arrival)" ở 02:54 bỏ theo yêu cầu.

## Chuỗi phát [N]
Giữa hai đoạn (melody, PA) ngắt **1 giây** (người chơi tự chỉnh bằng `prototype/drive/gaps.html`, chốt 2026-11-06; yêu cầu ban đầu là 2,5 giây); các PA liên tiếp cùng một sự kiện chỉ có melody trước PA đầu tiên.
- **Ấn đóng cửa (mọi ga, kể cả ga đầu):** PA nhắc đóng cửa → ngắt → melody khởi hành của ga (nếu ga có) → đèn cửa xanh. Thời gian chờ này **cố định** (PA 5 s + 1 s + độ dài melody) để mô phỏng vẫn tất định (`Melody.depChain`, `T.doorDur`); người chơi phải đóng cửa sớm hơn, tàu tự lái cũng đóng sớm hơn.
- **Ga đầu, sau khi đèn xanh:** melody đặc thù của tuyến (theo đoạn) → PA cảm ơn/giới thiệu chuyến → các ga dừng kèm giờ đến (tên → ngắt 0 s → giờ → ngắt 0,5 s → ga kế; ga cuối "終点…") → PA ga dừng kế tiếp.
- **Ga giữa tuyến, sau đèn xanh:** PA ga kế tiếp (+ xin lỗi nếu trễ > 2 phút), không melody.
- **Sắp tới ga:** cách ga **2,5 km** (3,5 km ở Hakata, Kumamoto, Kagoshima-Chuo; không quá 60% khoảng cách tới ga dừng trước — ví dụ Ueno 2,4 km) → melody (ga đặc biệt: melody riêng của ga) → "まもなく…" → đổi tàu → bên cửa mở. **Ga cuối:** cùng một chuỗi, thêm PA cảm ơn ở cuối (một melody duy nhất), không còn PA "終点…" khi dừng.
- **Sự kiện/sự cố:** mưa/tuyết chạy chậm, ngừng chạy do mưa/gió, va chạm động vật, tàu trước gặp sự cố, động đất xong chạy lại → melody tuyến (theo đoạn đang chạy) → ngắt → PA. **Động đất lúc bắt đầu:** tiếng bíp 4 nốt như cũ (ngắt 0,2 s trước PA). Trễ giờ/điều chỉnh lịch: không melody.
- PA khẩn (urgent) ngắt chuỗi đang phát; thoát ra menu thì ngắt hết (`GameAudio.stopAll`).
- Melody khởi hành phát qua bộ lọc (nhỏ hơn, bớt âm cao) như tiếng sân ga; âm lượng chung với PA.

## Melody theo tuyến/đoạn [N]/[I]
| Tuyến/đoạn | Melody |
|---|---|
| Tohoku, Hokkaido, Akita, Yamagata | 00:00 |
| Joetsu; Hokuriku từ Tokyo tới Joetsu-Myoko | 00:09 |
| Hokuriku từ Joetsu-Myoko tới Tsuruga | 00:17 |
| Tokyo – Shin-Osaka | 00:43 (JR Tokai) |
| Shin-Osaka – Hakata | 00:59 (JR West) |
| Hakata – Kagoshima-Chuo | 01:08 |
| Nishi-Kyushu | 03:06 |

Ga ranh giới (Joetsu-Myoko, Shin-Osaka, Hakata) vẫn dùng melody của đoạn đang đi tới, đổi sau khi rời ga [I].

## Melody khởi hành theo ga [N]
Tokyo … Kyoto: 00:31 · Shin-Osaka: hướng Hakata 00:48, hướng Tokyo 00:31 [I] · Shin-Kobe … Kokura: 00:48 · Hakata: hướng Shin-Osaka 00:48 [I], hướng Kyushu không có · các ga Kyushu khác: 01:55 · Kumamoto: 02:15 · Kagoshima-Chuo (đi về Tokyo): 02:33 · Nishi-Kyushu: Takeo-Onsen (đi Nagasaki) 03:12, Ureshino-Onsen 03:23, Shin-Omura 03:33, Isahaya 03:46, Nagasaki (đi Takeo-Onsen) 03:57. Tohoku/Joetsu/Hokuriku: không có.
Melody vào ga (chỉ ở mốc 3,5 km): Hakata 01:20, Kumamoto 01:32, Kagoshima-Chuo 01:43.

## Mã nguồn
`melody.js` (bảng + quy tắc, dùng chung sim và audio) · `sim.js` (`requestClose`, `depLead`, nhắc trên điện đàm) · `audio.js` (`chain`/`pump`/`play`, `announce`) · kiểm thử mục 33 trong `tests/run.js`.
