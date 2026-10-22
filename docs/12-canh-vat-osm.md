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
