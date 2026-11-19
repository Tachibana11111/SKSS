# 16. Kế hoạch ga Takasaki và nút giao Joetsu – Hokuriku

Ngày chốt: 2026-11-19. **Trạng thái: đã làm xong trong game, nhưng đã đổi kiến trúc so với các quyết định 5, 6, 10, 11, 12 bên dưới:** người dùng bỏ hai tầng (cầu cạn Joetsu, Hokuriku chui dưới), nay là một mặt phẳng, Hokuriku lên cắt đồng mức qua hai đường chính. Kết quả cuối ở `docs/14` §8b và `docs/15` §12; phần dưới giữ làm lịch sử quyết định. Các mockup `tks_nut_giao.html` và `tks_3d.html` mô tả bản hai tầng đã bỏ. Nhãn: [D] từ dữ liệu sơ đồ · [I] suy luận/quyết định thiết kế · [K] kiến thức nền · [?] chưa rõ.

## 1. Dữ liệu nền (đã nghiên cứu)

- Nguồn: hình `hokuriku/030_01.svg` (Takasaki, nhìn từ Hokuriku) và `joetsu/010_02.svg` (Honjo-Waseda – Takasaki – Jomo-Kogen); đồ thị `docs/data/haisen/tks_graph.json` (từ 030_01) và `jts_graph.json` (từ 010_02), mockup `tks_layout.html` (đủ 36/36 cạnh, 6 đường của ga). Công cụ: `tools/haisen_graph.py tks`, `tools/haisen_xo.py`.
- [D] Cả hai hình cho **cùng token `dPdduuPu`** (6 đường, 2 sân ga) và **cùng ghi chéo**: đơn s phía tây (~240 m trước ga khi xuống), đơn r phía đông (~240 m sau ga khi xuống). Mã game `2-4-1` đã khớp (cùng topo `dPdDUuPu`), không đổi mã.
- Takasaki có mặt ở **cả hai tuyến** `jts` và `hok` trong game: mọi thay đổi phải làm cho cả hai (cùng một ga vật lý).
- 1 đơn vị sơ đồ ≈ 8,1 m (54 đv = sân ga 440 m) [I]; hình không theo tỉ lệ.

## 2. Quyết định đã chốt với người dùng

1. Hai đầu chữ X của Takasaki đổi thành **ghi chéo đơn**; phải **verify rõ đường nào qua đường nào, cả hai chiều, hai đầu ga** (như Urasa): chiều xuống phía tây **s** (chính lên → chính xuống), phía đông **r** (chính xuống → chính lên); chiều lên đảo trước/sau, loại giữ nguyên theo chiều chạy.
2. Honjo-Waseda: `xo = []` ở cả hai tuyến (hình không có ghi chéo).
3. **Chuỗi ghi phía đông, chiều về Honjo-Waseda (đường lên)** [D], đã được người dùng xác nhận: (1) 44,3 đv (~360 m) đường nhánh dưới → chính lên (trước ghi chéo đơn); ghi chéo đơn r ở 29,5 đv (~240 m); (2) 19,4 đv (~160 m) chính lên → nhánh dưới; ghi rìa 14,8 → 4,9 đv (nhánh dưới → rìa dưới); (3) 9,9 → 4,9 đv chính lên → nhánh dưới; phía tây: ghi rìa 5,2 đv, (4) 14,8 đv nhánh dưới → chính lên. Phía **xuống** là bố cục chuẩn (hai ghi mỗi đầu).
4. **Đường nhánh dưới kéo dài** về phía đông thành đường Hokuriku chiều lên (về Takasaki) thay vì chỉ nhập lại đường chính lên Joetsu như `2-4-1` chuẩn.
5. **Hokuriku → Takasaki chạy DƯỚI gầm cầu cạn của hai đường chính Joetsu**, rồi lượn vào đường nhánh dưới của ga. Đây là **quyết định thiết kế của người dùng**; cách đọc quy ước nét đứt của hình gốc (hai đường chính bị đứt) của tôi [I] cho kết quả ngược lại (Hokuriku đi trên). Ghi vào tài liệu là "theo yêu cầu người dùng", không ghi như nguồn.
6. Cầu: **một mặt cầu rộng phủ cả hai đường chính** (bê tông liền), tàu Hokuriku chui qua một lần.
7. Takasaki → Hokuriku (chiều xuống): **giữ nguyên cách game đang vẽ ngã rẽ** (cách tôi hiểu "hạ độ cao", vẽ ở `tks_nut_giao.html` mục 3: ga Takasaki và cầu cạn Joetsu ở trên cao, cả hai đường Hokuriku rời ga rồi hạ dần xuống gần mặt đất; đường lên sau đó chui dưới cầu, đường xuống đi lệch về phía bắc nên không ở dưới cầu; chờ người dùng xác nhận) (đường nhánh tách dần khỏi đường chính xuống ở km 107). Người dùng nói thêm "nó sẽ hạ độ cao xuống cùng đường lên": đường Hokuriku chiều xuống cũng hạ độ cao cùng với đường chiều lên [?: cần hỏi lại mức hạ (m), đoạn dài, và hạ so với cái gì khi bắt đầu làm].
8. Giữ ngã rẽ km 107 [K] của game (hình chỉ cho khoảng ~840 m tính theo sân ga, không theo tỉ lệ).
9. Bỏ hai đường cụt (depot) hai bên ga như các lần trước.
10. **Đường Hokuriku lên chui dưới cầu không được đụng vào cột dầm của Joetsu** (yêu cầu 19/11): các trụ cầu Joetsu nằm sát đường Hokuriku lên phải dời hoặc bỏ bớt, nhịp cầu dài ra ở chỗ chui qua. Mockup 3D tính khoảng cách từ trụ tới tim đường Hokuriku (nửa bề rộng bản dầm Hokuriku 3,5 m + nửa thân trụ 0,9 m + khoảng hở ~0,8 m = 5,2 m) và bỏ các trụ vi phạm (ở bố cục mặc định: 3 trụ).
12. **Ở xa nút giao, hai đường Hokuriku (xuống và lên) trở về một đôi đường đôi chuẩn, sát nhau** (yêu cầu 19/11, người dùng đưa ảnh minh hoạ cặp đường đôi của game, khoảng cách 4,3 m = `ADJ` trong `layout.js`/`cabview.js`): trước khi tách và sau khi nhập lại, hai đường song song cách nhau 4,3 m và dùng chung một bản dầm; chỉ gần Takasaki chúng mới dang ra (đường xuống rẽ ra từ đường chính xuống, đường lên chui dưới cầu rồi vào đường nhánh dưới). Mockup 3D: hội tụ từ ~26 m về 4,3 m trên ~350 m (nút "Đôi đường Hokuriku (xa nút giao)"). Độ cao: đường lên hạ ~9,4 m để chui dưới cầu rồi **giữ phẳng** cho tới khi đường xuống hạ kịp (~9,4 m) rồi cả hai cùng hạ xuống mặt đất, để hai đường sát nhau luôn cùng độ cao [I]. Phía người lái đường xuống đi bên trái, đường lên bên phải khi hướng về Hokuriku (đi bên trái như ngoài đời) [I].
11. **Đường Hokuriku lên có cột dầm riêng** (yêu cầu 19/11): suốt đoạn đường nhánh dưới kéo dài ngoài mép cầu cạn ga và đoạn hạ dốc, có bản dầm rộng 7 m dày ~2,2 m và các bệnh cột (hai cột nối bằng xà mũ) cách nhau 30 m, cho tới khi đường chạm mặt đất. Trước đó đoạn này lơ lửng, không có gì đỡ. Đường Hokuriku xuống cũng có bản dầm và cột dầm theo cùng cách.

## 3. Hạng mục sẽ làm

### Bước 1 (làm trước, nhỏ): ghi chéo đơn và Honjo-Waseda

- `tools/build_lines.py` XO: Takasaki `[['b','s'],['a','r']]` và Honjo-Waseda `[]`, **cho cả `jts` và `hok`**; sinh lại `data-lines.js`.
- Test: sửa các ràng buộc cũ (33i: "các ga Tokyo – Takasaki chưa khai báo xo" thành "Tokyo – Kumagaya"; 33j tương tự; 33f đếm số ga có `xo`: jts 6 → 8, hok 18 → 20); thêm kiểm tra dữ liệu, vị trí hai chiều, hướng vẽ s/r (như Urasa), cabview trước/sau và minimap cho Takasaki trên cả hai tuyến.
- Ảnh kiểm chứng từ cổng 8765: 4 vị trí mỗi ga (trong ga và từ ngoài vào, hai chiều), kèm camera sau và minimap, cho Takasaki và Honjo-Waseda, trên cả hai tuyến.
- Chạy test đầy đủ, soak `jts` và `hok` so với bản trước; commit/push khi người dùng bảo.

### Bước 2 (việc lớn, riêng): nút giao và bố cục phía đông Takasaki

1. **Đọc mã trước** (chưa đọc hết): dựng ngã rẽ trong `cabview.js` (khoảng dòng 183–210, 433), `sim.js` (`trunkOff`, `lateralTable`, `joinState`), `winview.js` (229–239), `topview.js` (56).
2. **Bố cục ga riêng cho Takasaki** (ví dụ mã mới hoặc tham số theo tuyến/chiều): đường nhánh dưới kéo dài về phía đông, ba mối nối (1), (2), (3) sang đường chính lên, ghi (4) phía tây. Phải cách ly để không ảnh hưởng các ga `2-4-1` khác (Gifu-Hashima, Fukushima, Echigo-Yuzawa).
3. **Bảng lệch ngang riêng cho nút giao**: đường Hokuriku chiều lên đi dưới cầu cắt hai đường chính Joetsu rồi lượn vào đường nhánh dưới (độ lệch đổi dấu; `trunkOff` hiện chỉ cho một bên, không đổi dấu).
4. **Vẽ mặt cầu cạn** của hai đường chính Joetsu (kèm quyết định 10 và 11: trụ cầu Joetsu không đụng đường Hokuriku lên, cột dầm riêng của Hokuriku lên và xuống): buồng lái trước và sau (tái sử dụng cách vẽ của `drawBridge`: mặt cầu trên cao, thân cầu, trụ), minimap, cửa sổ hành khách. Mặt cầu dài ~80–150 m. Tàu Joetsu chạy trên cầu; đường Hokuriku bên dưới không hiện ở buồng lái Joetsu.
5. **Độ cao** (cần hỏi lại, xem 2.7): đường Hokuriku hạ độ cao; các đường khác hiện vẽ cùng một mặt phẳng.
6. Kiểm tra tàu "ma", tàu dẫn đường, ATC, `offMain`, `leaderOf` khi các đường cắt nhau.
7. **Làm bản thử vẽ mặt cầu** bằng dữ liệu giả cho người dùng xem trước, rồi mới nối dữ liệu thật; ảnh kiểm chứng cả hai camera, minimap và cửa sổ; test; tài liệu `docs/14`, `docs/15`.

## 4. Việc còn mở khác

- Kumagaya (hình `010_01` Omiya – Kumagaya) và Tokyo – Omiya: chưa đánh giá (thuộc nhóm Tokyo – Takasaki còn lại).
- 58–59 vấn đề soak có sẵn (nhóm "hai đoàn ghép lệch nhau" chiếm đa số; ca Asama 626 chiều lên đứng trước Karuizawa) chưa tìm nguyên nhân gốc.
- Tokaido–Sanyo kèm Hakata, Tohoku, Yamagata, Akita chưa dựng lại.

## 5. Tệp nghiên cứu Takasaki chưa commit

`docs/data/haisen/tks_graph.json`, `tks_layout.html`, `tks_nut_giao.html` (mockup nút giao: nhìn từ trên xuống, mặt cắt ngang và mặt cắt dọc; độ cao là minh hoạ [I]), `tks_3d.html` (mockup 3D tương tác, xoay/zoom bằng chuột, không phụ thuộc thư viện ngoài; độ cao, dốc, kích thước cầu là minh hoạ [I]), thay đổi trong `tools/haisen_graph.py` (cấu hình `tks`, `main_span`, chịu một hình), `docs/data/haisen/README.md`, `docs/00-progress.md`. Không commit `docs/data/haisen/preview_figs.html` và `docs/rebuild_tokyo.md`.
