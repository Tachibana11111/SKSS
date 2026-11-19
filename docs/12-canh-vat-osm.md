# 12. Cảnh vật thật từ OpenStreetMap (bản đồ nhỏ và buồng lái)

Dữ liệu © OpenStreetMap contributors, giấy phép ODbL 1.0 (nguồn: Geofabrik, `download.geofabrik.de/asia/japan/`, dữ liệu tới 2026-10-20). **Chỉ dùng cá nhân.** Tệp tải về và dữ liệu đã biên dịch (`data-osm/`, `prototype/drive/world/`) được `.gitignore` bỏ ra: không đưa vào repo, không chia sẻ.

## Đường ống (tools/)
1. Tải 7 tệp vùng `*-latest.osm.pbf` (Kanto, Tohoku, Hokkaido, Chubu, Kansai, Chugoku, Kyushu; ~2,3 GB) vào `data-osm/`.
2. `osm_align.py`: dựng đường ray thật cho từng tuyến [D]: lấy các đường `railway=rail` có `highspeed=yes` (và đường sắt thường khổ 1435 của mini-Shinkansen), tìm đường đi ngắn nhất **có hướng** giữa các ga (đường một chiều ⇒ đúng đường xuống), nội suy km của game theo tỉ lệ giữa các ga. Kết quả `align_<tuyến>.json`.
3. `osm_features.py` (chạy theo từng vùng, rất chậm: giờ-đồng-hồ): trích nhà, vùng sử dụng đất, sông, đường bộ, đường sắt khác trong hành lang ±800 m, đổi sang toạ độ (s, d) theo đường ray (s = km·1000 của game, d dương = bên trái đường xuống).
4. `osm_export.py`: biên dịch thành `prototype/drive/world/<tuyến>/<k>.js` (đoạn 4 km; base64 của dữ liệu nhị phân; dạng `.js` để mở được cả bằng `file://`). Nhà được rút thành hình chữ nhật xoay; lớp phủ đất thành lưới 20 m.

## Chạy trong game
- `world.js`: nạp các đoạn bằng thẻ `<script>`, truy vấn (nhà, lớp phủ đất, cột điện), vẽ bản đồ nhỏ. Tuyến dùng chung đoạn đầu với tuyến cha (jts←toh, hok←jts, yam/aki←toh) lấy dữ liệu của tuyến cha.
- `strips.js` (buồng lái): mỗi bên đường có 3 lớp **dải tranh 2D** (gần / giữa / xa) chiếu phối cảnh bằng lát hẹp, uốn theo đường ray; nội dung (nhà kiểu Nhật, cây, cột điện, dây) vẽ từ dữ liệu OSM theo từng đoạn 250 m rồi nhớ lại. Dải đặt ngoài hành lang đường sắt và sân ga, nên vật thể không bao giờ đè lên đường. Đường ngang vẫn là vật 3D riêng.
- Không có dữ liệu (hoặc ở đoạn chưa phủ): game dùng phong cảnh sinh ngẫu nhiên theo vùng như trước.

## Nhãn và hạn chế
- [D] vị trí nhà, đường, cột điện, rừng/ruộng/công viên: từ OSM. Độ cao nhà: `building:levels` hoặc `height` nếu có, không thì suy theo loại [I].
- [I] kiểu mái, màu tường, cửa sổ, ban công, biển hiệu: sinh theo loại nhà, không phải hình thật.
- OSM không có địa hình: núi non vẫn dựa dữ liệu cũ. Kết cấu cầu/hầm của tuyến (`struct`) vẫn là suy luận [I]: vài chỗ hầm/cầu không trùng thực tế.
- Độ phủ (km có dữ liệu): ~95%; các đoạn thiếu chủ yếu là núi/hầm ít dữ liệu.
- Tỉ lệ km giữa OSM và km của game lệch vài % ở một số đoạn (ghi trong `data-osm/align.log`).

## Hạ tầng nhà ga (2026-10-23)
- **Ghi riêng từng đường [I]:** mỗi đường ga rẽ khỏi cặp đường chính bằng một ghi riêng, lần lượt từ đường gần ra đường xa (cách nhau ~85 m); dịch ngang 1 m mất ~13 m chiều dài (ghi số 12 [K]). Ghi đầu cách vạch dừng ~1.130 m, ghi cuối xong cách vạch ≥ 380 m (trước sân ga). Camera trước/sau và bản đồ nhỏ dùng chung hàm `Layout.trackW`. Ở chỗ rẽ vẽ thanh nối lưỡi ghi, hộp máy chuyển ghi và đèn báo.
- **Tường bao quanh ga:** hai bên phạm vi sân ga là tường bê tông + tấm chắn trong suốt cao (≈ 4,4 + 2,2 m), đoạn cổ ga là hàng rào thấp (1,9 m); bám theo mép hành lang nên ga đỗ ở đường rìa nhánh cũng được bọc kín. Vẽ cả trên bản đồ nhỏ.
- **Chi tiết sân ga:** gạch cảnh báo nổi ở mép, số toa trên nền, đèn cột (sáng ban đêm), ghế, máy bán hàng, cầu thang, đồng hồ cột, biển số đường (番線), nhân viên sân ga giơ tay chỉ tay khi tàu vào; số người đông hay thưa theo quy mô ga (số đường).
- **Dọc đường:** cổng đỡ dây điện (hai cột + xà) mỗi 48 m ở cổ ga và trong ga; mốc km mỗi 1 km; tấm chắn ồn trong suốt trên cầu cạn khu dân cư.
- **Bố trí ga từ OSM (thử nghiệm, KHÔNG áp dụng):** `tools/osm_stations.py` + `tools/osm_layout.py` trích sân ga/đường ray quanh 123 ga. Kết quả: chỉ ~39 ga có dữ liệu sân ga, ~34 ga ra bố trí hợp lý, nhiều ga lẫn đường tránh/đề-pô nên mã suy ra không đáng tin hơn mã gốc (Wikipedia JP, [N]). Báo cáo ở `docs/data/osm-layouts.json` để đối chiếu; bố trí ga trong game giữ nguyên mã `2-4-1`... (mô hình [I]).
- **Chưa làm:** bãi đỗ tàu/đề-pô thật quanh ga lớn (OSM đánh dấu đường đề-pô Shinkansen cùng thẻ `highspeed` nên chưa tách được), hệ phun nước chống tuyết.
- **Hiệu năng:** hồ sơ đường cong/cao độ tính một lần cho cả tuyến (bảng ngang nhanh ~50 lần), lớp nền bản đồ nhỏ dùng lại ảnh khi tàu đi < 5 m, phím **F3** hiện fps và ms từng thành phần.

## Giá đỡ dây điện trên cao (2026-11-14)

Trước đây mọi nơi dùng một kiểu cổng thép. Nay `Sim.supportAt(L, tuyến, km, {single, wide})` chọn kiểu giá, chất liệu cột và kiểu treo dây; `cabview.js` (`gantry`, `wire`) vẽ theo đó (khung 2D ngang cũ đã bỏ). **Ràng buộc thiết kế (người dùng): không bao giờ đặt cột giữa hai đường** (`Sim.supportColumns` lọc bỏ cột nằm giữa các dây): hai cột ở hai mép ngoài hoặc một cột bên (đường đơn).

| Kiểu | Dùng ở | Nhãn |
|---|---|---|
| `portal`: cổng thép Vトラス (hai cột + xà kép có giằng zích zắc) | nền đắp, đoạn bằng | tên kiểu **[N]**, gán cho nền đắp **[I]** |
| `pipe`: xà ống thép nhẹ (một xà mảnh, cột ống thép hoặc bê tông) | cầu cạn, cầu | **[N]** có dùng ở đoạn nâng cao, **[I]** gán cho mọi cầu cạn/cầu |
| `cage`: xà かご (xà sâu, giằng chéo) | hành lang rộng > 18 m (ga nhiều đường) | **[N]** かごビーム dùng ở ga nhiều đường; ngưỡng 18 m **[I]** |
| `bracket`: cột bên + tay đòn xoay (可動ブラケット) + thanh chống chéo | đường đơn (Akita, Yamagata sau ngã rẽ) | **[N]** tay đòn xoay "dùng nhiều ở Shinkansen"; gán cho đường đơn **[I]** |
| `tunnel`: giá treo gắn vào vòm hầm | hầm | **[I]** (không có nguồn về từng hầm; dây cứng chưa mô phỏng) |

- **Chất liệu cột** (`steel`, `conc`, `pipe`): chọn ngẫu nhiên cố định theo từng đoạn 6 km (cùng vị trí luôn cùng kết quả) trong tập của tuyến (`SUP_POLES`): đây là **[I]**, không phải dữ liệu từng đoạn. Căn cứ chỉ ở mức "có cả ba loại": cột bê tông (PC) trên cầu cạn Tohoku và Hokuriku dùng cả cột bê tông lẫn cột ống thép nhẹ **[K]** (đọc từ kết quả tìm kiếm, chưa đọc nguyên văn).
- **Kiểu treo dây** (`Sim.wireAt`): compound nặng (thêm dây phụ) ở Tokaido, Sanyo, Joetsu, Tohoku phía nam Morioka, đoạn chung của Hokuriku và hai nhánh mini cho tới ngã rẽ; simple (chỉ dây treo + dây tiếp điện) ở Kyushu (sau Hakata), Hokuriku từ Takasaki, Tohoku từ Morioka (gồm Hokkaido), Tây Kyushu, và nhánh Akita/Yamagata sau ngã rẽ. Phân chia này theo bài Wikipedia **[N]** (bài còn cảnh báo thiếu chú thích; ranh giới chính xác từng ga là **[I]**).

Nguồn đã đọc (chỉ dùng để chọn kiểu, không chép nguyên văn):
- [架空電車線方式 (Wikipedia)](https://ja.wikipedia.org/wiki/%E6%9E%B6%E7%A9%BA%E9%9B%BB%E8%BB%8A%E7%B7%9A%E6%96%B9%E5%BC%8F): phân loại ビーム/ブラケット, ngưỡng chiều cao dây 4.800–5.300 mm, kiểu treo dây theo tuyến Shinkansen.
- [電車線のビームたち (miiyarog.com)](https://miiyarog.com/train-line/): blog của người từng làm ở hãng phụ tùng; tên Vトラス, かご, 鋼管ビーム, 逆Vブラケット, 可動ブラケット. Là ý kiến cá nhân, tên do tác giả tự gọi.
- [電車線設備の解説 (名泗架線工事)](https://meishikasen.co.jp/column/kasenkouji/1549): vai trò của ビーム/ブラケット, 可動ブラケット theo nhiệt độ.

**Chưa có / hạn chế:** chưa có dữ liệu loại giá ở từng đoạn thật; chưa mô phỏng dây cứng trong hầm, cột đôi ở ga, cột đổi kiểu ở đoạn chuyển compound sang simple; khung cửa sổ hành khách (`winview.js`) vẫn dùng cột OSM.

## Mặt đầu/đuôi tàu ướm theo mũi tàu (2026-11-14)

Trước đây tàu ngược chiều, tàu phía trước, tàu vượt và tàu đỗ chờ nối được vẽ bằng hai phần rời: thân là các lát cắt của ảnh nhìn ngang (đường nét mũi thon dần), còn mặt đầu/đuôi là **một tấm ảnh mặt trước phẳng cỡ đầy đủ** dựng ở đầu mũi, nên tấm phẳng thò ra khỏi đường nét mũi. Nay `drawFront` (`cabview.js`) **cắt ảnh mặt trước thành 48 dải ngang** (`NOSE_ROWS`); dải càng cao càng lùi sâu vào thân theo đường nét mũi (`noseRows`): tại chiều cao nào đường nét mũi chạm tới thì dải nằm ở độ sâu tương ứng. Mặt trước vì vậy nghiêng ra sau như kính chắn gió, ôm theo mũi. Đèn pha/đèn đuôi đặt theo mặt phẳng ở đầu mũi.
- **Hình dáng mũi [D] từ ảnh:** `noseOf` đọc kênh trong suốt của ảnh nhìn ngang một lần cho mỗi ảnh (đầu tàu ở bên phải ảnh, đuôi bên trái) và `noseFromHeights` suy ra độ dài mũi (m) và tỉ lệ chiều cao theo khoảng cách từ đầu mũi. Chiều cao chuẩn là **trung vị** chiều cao thân (không lấy điểm cao nhất vì cần lấy điện và hộp thiết bị trên mái làm mũi dài giả) và độ dài mũi bị chặn ≤ 18 m. Kết quả đo trên các ảnh hiện có (đầu / đuôi, m): N700 6,1 / 5,6; N700S 8,3 / 9,1; E5 và H5 12,8 / 12,8; E6 12,6 / 12,5; E7 8,8 / 2,0; E8 7,6 / 7,6; E926 4,9 / 4,7; E2 4,7 / 2,0; S800 12,8 / 18; Kamome và T4 18 / 18 (chạm trần chặn). Mũi thấp nhất khoảng 30–43% chiều cao thân. Các số đo này chỉ phản ánh ảnh nhìn ngang (khoảng cách thật của từng mẫu có thể khác vài mét) **[D từ ảnh, I về ý nghĩa]**; Kamome và n700s8 không có ảnh mặt trước riêng nên dùng ảnh của N700S.
- **Hệ số:** `NOSE_DEPTH = 1`: dải mặt trước ở **đúng** độ sâu của đường nét mũi trong ảnh nhìn ngang. Thử 0,7 (cho mặt nghiêng nhẹ hơn) làm mặt trước nằm gần camera hơn thân 30% độ sâu nên hở một khe tối giữa thân và mặt, rộng ~27 px ở cự ly 10 m; đặt 1 thì khớp. Thân (`fxOpp`) vẽ ở thành gần camera cách trục 1,85 m, nên `noseRows` dịch ngang mặt trước (`dxw`) để mép gần của nó trùng đúng thành thân (mặt trước rộng 3,4 m × hệ số co `fw`); `NOSE_N = 10` mẫu hồ sơ mũi.
- Thử và bỏ hai cách khác: chồng nhiều bản đầy đủ của ảnh mặt trước (lộ thành nhiều mặt xếp dọc, kèm phần nền tối trong suốt của ảnh), và khối màu bao lồi giữa các lớp (thành mảng phẳng lệch khỏi mặt tàu).
- Chỉ dựng khi mặt tàu đủ lớn (> 24 px); ở xa hoặc không đọc được ảnh (không có DOM, ảnh bị chặn khi mở bằng `file://`) thì vẽ tấm phẳng như cũ.
- **Cỡ mặt trước theo thân thật:** game vẽ thân 2D của mọi mẫu cao 3,7 m theo cả chiều cao ảnh nhìn ngang, nên mẫu có ụ/cần lấy điện trên mái bị thân thấp hơn (thân thật = 3,7 m × trung vị chiều cao / chiều cao ảnh: T4 3,05 m, E6/E8 3,18 m, E926 3,45 m, N700 3,70 m), trong khi mặt trước vẽ theo tỉ lệ ảnh của nó (T4 3,69 m, E926 4,63 m, E6/E8 3,53 m) nên cao hơn thân. `noseRows` co mặt trước theo `bodyR` (chiều cao co đủ khớp thân, chiều rộng co nửa mức để khỏi méo; chặn 0,6–1,1).
- **Mặt trước Kamome (N700S-8000, Nishi-Kyushu Shinkansen) [D]:** cắt từ hình mặt trước trong chính bản vẽ `src_n700s8.webp` (rail.kychung.com, CC BY-NC-ND 4.0, chỉ dùng cá nhân) bằng `tools/build_front_sprites.py kamome` thành `assets/front_kamome.png` (thân trắng, phần dưới mũi đỏ, đèn pha; đã có trong `fronts.js`); trước đó dùng tạm ảnh N700S không có dải đỏ.
- **Tàu đỗ ga, vào ga, rời ga (`W.stabled`) cũng có mặt đầu/đuôi:** đầu gần camera của tàu đỗ (thấp) là ĐẦU nếu tàu quay ngược chiều ta, là ĐUÔI nếu cùng chiều; vẽ cả khi tàu đang chạy vào/ra ga (`sb.front` di chuyển). Khe hở giữa thân và mặt xử lý theo mặt phẳng thân `xb` (thân đỗ ga vẽ ở trục đường, tàu ngược chiều vẽ ở thành gần cách trục 1,85 m): tâm mặt trước đặt ở `faceX(xb, làn, fw) = xb − dấu·1,7·fw` để mép gần của nó trùng đúng `xb`, nên đúng ở mọi làn, hai bên đường, không phụ thuộc cự ly (phối cảnh tự co theo cự ly).
- **Chỗ nối giữa hai đoàn của đoàn ghép (E5+E6, E6+E5, E5+E8, E8+E5...):** `slicesVeh` vẽ thêm mặt mũi vát của đoàn nằm phía xa camera ở mỗi chỗ nối (tàu quay đầu về camera: đầu của đoàn sau; quay đuôi về camera: đuôi của đoàn trước), vẽ trước thân để thân đoàn gần phủ lên, nên lộ ra trong khe giữa hai thân. Dùng chung cho tàu ngược chiều, tàu đỗ, tàu vào/rời ga và tàu thông qua (đều qua `slicesVeh`). Chỉ vẽ khi đủ gần để dựng mũi vát (tham số `inner` của `drawFront`), ở xa bỏ qua để khỏi hiện các tấm phẳng nhỏ ở mỗi chỗ nối. Không có đèn (đầu nối ở trong).

## Nền đất: tấm bê tông và hàng rào thép (2026-11-15)

Đoạn đường trên **nền đất** (kết cấu `g`; không phải cầu cạn `v`, cầu `b`, hầm `t`, và không ở vùng ga) có hai thứ mới trong khung buồng lái (`cabview.js`) và cửa sổ hành khách (`winview.js`); luật nằm ở `Sim.slabAt` / `Sim.fenceAt` (`sim.js`):

- **Tấm bê tông nằm dưới lớp đá dăm:** rộng từ chân hàng rào trái tới chân hàng rào phải (đường đôi 14,1 m, đường đơn 9,8 m), màu bê tông xám (RGB ≈ 142,142,136 ban ngày). **Lớp đá dăm có tà vẹt vẽ đè lên không đổi**: dải ±2,1 m quanh tim mỗi đường, màu nền sẫm của đường ray, dùng chung với ga, cầu cạn và cầu. Cầu, hầm và ga không có tấm bê tông.
- **Hàng rào thép:** cao `FENCE_H` = 3,6 m (ngang tàu), mắt lưới mờ để vẫn thấy cảnh phía sau, cọc mỗi 5 m. **Nằm ngoài cột giá đỡ điện, cách cột `FENCE_OFF` = 1,0 m.** Cột giá đỡ nằm ở `xr + 1,0` = **3,9 m** cách tim đường ngoài cùng (2,9 m là mép hành lang) nên hàng rào ở 4,9 m: đường đôi rộng 14,1 m giữa hai hàng rào, đường đơn 9,8 m. (Bản mockup đầu ghi cột ở 2,9 m là nhầm mép hành lang với vị trí cột.)
- **Hở ở đường ngang:** quanh mỗi đường ngang của Yamagata và Akita (`L.xings`) hàng rào ngắt 11 m (±5,5 m); các tuyến Shinkansen thật không có đường ngang nên hàng rào liên tục.
- **Vùng ga:** không có hàng rào và tấm bê tông trong vùng ga (1150 m trước và 630 m sau vạch ga ở khung buồng lái và cửa sổ; ±700 m ở khung 2D); ga đã có tường bao riêng (`enclose`).
- **Hệ quả thiết kế:** đoạn có hàng rào không còn động vật chạy cắt ngang, nên **sự kiện động vật đã bỏ hẳn** (cả tàu người chơi và tàu danh mục), kèm hươu trong khung 2D/3D, còi tự bấm cho hươu, điểm trừ va chạm động vật, âm va chạm và câu PA. Sự kiện "xe kẹt đường ngang" của tàu danh mục chỉ còn xảy ra ở đường ngang thật.

**Nhãn:** toàn bộ là quy ước thiết kế **[I]** (do người dùng đề ra). Thực tế Shinkansen dùng nhiều loại kết cấu nền; ý "mọi đoạn nền đất đều có tấm bê tông và hàng rào kín" là đơn giản hóa chưa đối chiếu từng đoạn **[K]**. **Chưa làm:** bản đồ nhỏ nhìn từ trên (`topview.js`) chưa vẽ hàng rào; cánh cửa/lối qua hàng rào cho nhân viên bảo trì; hàng rào ở đoạn ga cổ (đường tỏa ra) vẫn theo tường ga cũ.
