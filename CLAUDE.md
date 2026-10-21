# Dự án: Game điều hành Shinkansen (sở thích cá nhân)

## Bối cảnh
- Người dùng muốn làm game điều hành/phân phối/quy trình/lái Shinkansen của các công ty JR. Chỉ dùng cá nhân, KHÔNG phân phối -> không lo bản quyền, được dùng tên/logo thật.
- Người dùng chưa có kinh nghiệm thiết kế game. Claude dẫn dắt thiết kế; người dùng quyết định ở các điểm then chốt. Giao tiếp bằng tiếng Việt.
- Shinkansen do 5 công ty vận hành (JR East, Central, West, Kyushu, Hokkaido). JR Shikoku không có.

## Cách làm việc (quan trọng)
- Giai đoạn 0: xây bộ tri thức nghiệp vụ (không code) trong `docs/`. Giai đoạn 1: chọn lõi game. Giai đoạn 2: prototype.
- **Tiến độ nằm ở `docs/00-progress.md`. Đọc file này ĐẦU TIÊN khi bắt đầu phiên mới hoặc sau compact, và cập nhật sau mỗi mảng hoàn thành.**
- Mỗi tài liệu nghiệp vụ phải ghi rõ: phần nào có nguồn (kèm link), phần nào là suy luận/đơn giản hóa/chưa kiểm chứng.
- Ghi nguồn bằng link; không chép nguyên văn văn bản có bản quyền.

- Dữ liệu lịch tàu thật nằm ở `docs/data/` (đọc `docs/data/README.md` để biết nguồn và giới hạn). `docs/audit-01-04.md` ghi lỗ hổng còn lại.
- `tools/` có script lấy dữ liệu lịch (crawl_jreast.py, crawl_jrwest.py: chậm, có đệm, chỉ dùng cá nhân) và analyze_timetable.py. Không tải hàng loạt thêm khi chưa cần; không tải file (PDF) khi chưa hỏi người dùng.
- Nhãn trong tài liệu: [N] có nguồn · [D] từ dữ liệu · [I] suy luận · [K] kiến thức nền chưa kiểm chứng · [?] chưa rõ.
- Người dùng muốn hoàn thiện 01–04 và "an tâm" trước khi làm 05 trở đi: không sang 05 khi chưa được người dùng đồng ý.

## Danh sách tài liệu nghiệp vụ (docs/)
01 tổng quan 5 JR · 02 hạ tầng · 03 đoàn tàu · 04 biểu đồ chạy tàu · 05 điều độ · 06 tín hiệu & an toàn · 07 lái tàu · 08 ga & depot · 09 sự cố

## Cập nhật 2026-10-21
- Dự án đã ở trong **git** (kho cục bộ, không có remote; không đẩy lên mạng). `.gitignore` bỏ qua tài nguyên có giấy phép NC/ND và PDF gốc.
- Thiết kế game nằm ở `docs/10-thiet-ke-game.md`; prototype ở `prototype/drive/` (xem `prototype/README.md`). **Chạy `node tests/run.js` sau mỗi thay đổi ở `sim.js`.**
- Góc nhìn đã chốt (2026-10-21): phương án D = giữ 2D nhìn ngang + thêm khung nhìn buồng lái phía trước (cabview.js, giả 3D). Không đổi sang engine 3D thật khi chưa được người dùng quyết định.
- Ảnh tàu N700 (`prototype/drive/assets/`) chỉ dùng cá nhân: không chia sẻ, không đóng gói.

## Cập nhật 2026-10-22
- Game có 7 tuyến: `tsk`, `toh` (+Hokkaido), `jts`, `hok`, `nks`, `yam`, `aki`. Tham số riêng từng tuyến nằm trong `LINE_META` (`sim.js`) và `tools/build_struct.py`; xem `docs/11-mo-rong-tuyen.md`. Thêm tuyến mới = thêm danh sách ga trong `build_lines.py`, cấu hình trong `build_struct.py`, `LINE_META`, rồi chạy lại `python -X utf8 tools/build_lines.py` và `node tests/run.js`.
- Hình E7/E6/E8/H5 chưa có: đang dùng tạm mô hình E5. Không tải thêm ảnh khi chưa hỏi người dùng.
