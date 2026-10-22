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
