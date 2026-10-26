# Việc cần làm

1. ~~Làm sàn nền của ga theo màu cố định~~ **Xong (2026-10-24, chờ người dùng thử):** nền đất đúng trong đoạn hàng rào của ga (từ đầu rào tới cuối rào, cùng hằng số FA/FB với tường rào, chuyển êm 60 m nằm bên trong) cố định màu xi măng/đá dăm, không đổi theo quần xã; có tuyết thì vẫn trắng. Chỉ đổi màu nền đất trong `cabview.js`, không đụng hàng rào.

2. Số hiệu ga trên biển tên ga: **tạm dừng, không có dữ liệu kiểm chứng.** Wikipedia (Tokaido, Sanyo, Tohoku, Kyushu, Hokuriku) không ghi số hiệu ga cho ga Shinkansen; JR Central chỉ công bố cho tuyến thường. Xem `docs/08` §9.6. Làm tiếp khi có nguồn chính thức (JR từng công ty), kiểm tra riêng Joetsu, Hokuriku, Hokkaido, Yamagata, Akita, Nishi-Kyushu.

3. **Giao diện đáp ứng (responsive) để chơi được trên thiết bị di động.** Hiện bố cục toàn màn hình cố định 1920×1080 và hai menu bên; cần bố cục riêng cho màn hình nhỏ (cảm ứng, xoay ngang, cỡ nút, bảng điều khiển gọn).

4. **Mở thử trên điện thoại không nghe thấy tiếng phát thanh (PA).** Nghi do SpeechSynthesis (giọng nói của trình duyệt) bị hạn chế trên trình duyệt di động (cần cử chỉ người dùng, thiếu giọng Nhật/Việt, tự tắt khi chuyển tab). Cần kiểm tra từng trình duyệt, kèm phương án dự phòng (phụ đề luôn hiện, âm báo hiệu).

5. **Màn hình tổng kết sau khi xong chuyến: đồng hồ "thời gian chạy" vẫn tiếp tục chạy** thay vì đứng yên ở giá trị lúc kết thúc. Cần đóng băng thời gian (và các số liệu tính theo giờ) khi `T.finished`.

6. **Đèn hầm chuyển từ đèn trần sang đèn sườn (hai bên vách) ở hầm có đèn** (hầm đô thị và quanh ga ngầm; các hầm vùng đồi núi vẫn không đèn). Cửa sổ hành khách cũng phải có vệt đèn trên vách lướt qua.

7. **Thêm tường và trần sát vách ở TẤT CẢ các hầm** (điều kiện để dùng đèn sườn ở mục 6). Hiện vào hầm giống như vào một không gian tối rộng, đoạn hầm cong còn nhìn chéo được tới cuối đoạn cong. Cần dựng vỏ hầm hẹp đúng kiểu (tường hai bên, trần, mặt cắt theo số đường), bám theo đường cong để không nhìn xuyên.
   - **Đoạn ghi rẽ nhánh trong hầm sau ga Takasaki** (Hokuriku tách/nhập với Joetsu): phải quyết định cách xử lý tường và đèn ở chỗ mặt cắt hầm rộng ra (hai hầm sát nhau hay một hầm rộng có vách ngăn), đèn sườn hai phía của mỗi nhánh; **đã chọn hướng A (2026-10-27): hai vỏ hầm hẹp riêng, tách bằng khối đá hình nêm ở giữa, mỗi nhánh có tường/trần sát vách và đèn sườn ở vách ngoài** (hướng B, một hầm rộng có hàng cột giữa, để sau nếu muốn). Cấu tạo thật chưa có tài liệu nên là suy luận [I]. **Lưu ý (người dùng, 2026-10-27): vỏ hầm phải ăn theo bề rộng thay đổi của chính đoạn ray và các chuyển ghi** (đường tách/nhập, độ lệch ngang của `trunkOff`, ghi chữ X, đường ga toả ra): tường và trần tính từ đường ray ngoài cùng ở từng vị trí s, không dùng bề rộng cố định; áp dụng cho mọi hầm có ghi, không riêng Takasaki. Chưa làm vội.
