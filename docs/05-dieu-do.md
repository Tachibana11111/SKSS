# 05 – Điều độ (dispatching): trung tâm điều hành, hệ thống và cách xử lý khi lịch rối

Nhãn: **[N]** có nguồn (link cuối file) · **[D]** từ dữ liệu trong `data/` · **[I]** suy luận hoặc đề xuất cho game, không phải sự thật đã xác minh · **[K]** kiến thức nền Claude, chưa kiểm chứng · **[?]** chưa rõ hoặc nguồn mâu thuẫn.
Phiên bản 1 (2026-10-20). Phần thiên tai chi tiết (gió, mưa, động đất, tuyết) nằm ở tài liệu 09; phần tín hiệu ATC ở tài liệu 06.

## 1. Bức tranh tổng thể: hệ thống quản lý vận hành và trung tâm điều hành

| Hệ thống | Phạm vi | Do ai vận hành | Khai thác | Trung tâm điều hành |
|---|---|---|---|---|
| **COMTRAC** (Computer Aided Traffic Control) | Tokaido, Sanyo, nhánh Hakata-Minami; từ 2011 gồm cả đoạn Hakata – Hakata-Bunso của Kyushu | JR Central và JR West **chung** | 1972 (cùng lúc mở Sanyo đến Okayama); nâng cấp 3/2011 khi liên thông Kyushu | **Tokyo (総合指令所)**; dự phòng **Osaka (第2総合指令所)** |
| **COSMOS** (Computerized Safety, Maintenance and Operation Systems of Shinkansen) | Tohoku, Joetsu, Hokuriku (Nagano), Yamagata, Akita | JR East (phát triển cùng JR East Information Systems và Hitachi); JR West phần Hokuriku | **11/1995**, thay COMTRAC/SMIS dùng từ 1982 | Trung tâm Shinkansen tổng hợp của **JR East**; **Kanazawa** (JR West, từ 2015) |
| **SIRIUS** (Super Intelligent Resource and Innovated Utility for Shinkansen Management) | Kyushu (Hakata-Bunso – Kagoshima-Chuo) | JR Kyushu | 2004; nâng cấp 2011 | **Hakata**; liên kết với COMTRAC; Tokyo có nhân viên liên lạc của JR Kyushu |
| **CYGNUS** | Hokkaido (Shin-Aomori – Shin-Hakodate-Hokuto), gồm đoạn Seikan dùng chung ray với tàu hàng | JR Hokkaido | Từ khai trương 26/3/2016 | **Sapporo 総合指令所** (JR Hokkaido): thiết bị trung tâm của hệ thống radio tàu (do Mitsubishi Electric lắp) nằm ở đó; nguồn không nêu rõ phòng Shinkansen riêng **[?]**. CYGNUS **phối hợp với COSMOS** ở Shin-Aomori |
| Hệ thống tuyến thường (ATOS, PRC…) | Tuyến thường (Yamagata/Akita ngoài đoạn Shinkansen, Relay Kamome) | JR East, JR Kyushu… | | Trung tâm riêng (vd. Tokyo của JR East ~500 chỉ huy cho tuyến thường) |

Nguồn: Wikipedia tiếng Nhật (COMTRAC, COSMOS), Hitachi, trafficnews, mynavi **[N]**.

**CYGNUS [N]:** nắm tình trạng vận hành tàu; **tự động chuyển ghi theo biểu đồ**; ghi lịch sử vận hành từng phương tiện; cấp dữ liệu cho bảng thông tin ga; hỗ trợ xử lý sự cố. Tàu hàng đi vào đoạn dùng chung (Shin-Nakakoguni – Kikonai, khoảng 82 km) **nằm dưới quản lý của CYGNUS**, và CYGNUS được **kết nối với hệ thống tuyến thường** (Tsugaru-Kaikyo, Dōnan Isaribi, Hakodate; tên tuyến theo kiến thức nền **[K]** vì bản dịch nguồn bị lỗi).
**Nishi-Kyushu [?]:** không tìm được tên hệ thống điều hành hay vị trí trung tâm. Biết: JR Kyushu lập đơn vị vận hành Nishi-Kyushu cùng ngày khởi huấn luyện 20/6/2022; NEC cung cấp một hệ thống bảo đảm an toàn; toàn bộ Kyushu Shinkansen do **Hakata** điều hành (SIRIUS). **Nhiều khả năng** Nishi-Kyushu cũng do Hakata điều hành **[I]**, nhưng chưa có xác nhận. Lịch: **47 chuyến Kamome mỗi ngày** (24 xuống + 23 lên theo bảng giờ, khớp con số 47 của nguồn), 1 chuyến/giờ mỗi chiều, giờ cao điểm 2 **[N]**/**[D]**.

**Hai thế giới điều độ [I]:** Tokaido–Sanyo–Kyushu chạy liên thông nên điều hành tập trung ở Tokyo cho cả ba công ty; Tohoku–Joetsu–Hokuriku–Hokkaido thuộc JR East (và JR Hokkaido, một phần JR West). Hai nhóm **không** dùng chung trung tâm (khớp với việc hai tuyến Tokaido và Tohoku không nối ray ở Tokyo).

## 2. Lịch sử tự động hóa **[N]**
1. **1964:** Tokaido mở; **CTC** (điều khiển tập trung): bảng hiển thị vị trí tàu, chuyển ghi từ trung tâm; điều độ viên **thao tác tay** nên còn khả năng sai sót.
2. **1972:** **COMTRAC**: nhập sẵn biểu đồ chạy tàu vào máy tính, **tự động thiết lập lộ trình** (PRC) và điều khiển ghi; điều độ viên đỡ phải thao tác tay. Được gọi là "PTC đầu tiên trên thế giới" (JNR + Hitachi).
3. **Thập niên 1970:** kế hoạch thêm đối thoại điều độ viên – máy trên màn hình CRT, truyền dữ liệu điều độ tự động, bố trí đoàn tàu tự động khi mở rộng đến Hakata.
4. **1995:** **UWS**, hệ chuyên gia điều chỉnh vận hành cho Tokaido/Sanyo (kiến trúc ESTRAC-III, ứng dụng hệ chuyên gia đầu tiên cho lịch tàu): tạo phương án điều chỉnh khả thi "trong thời gian ngắn"; hữu ích trong đợt tuyết lớn 1996.
5. **1995 (JR East):** **COSMOS** thay hệ cũ; **2004:** SIRIUS (Kyushu); **2011:** nâng cấp COMTRAC/SIRIUS cho liên thông Kyushu.
6. **Gần đây:** nghiên cứu AI/học máy hỗ trợ dự đoán xung đột và đề xuất phương án điều chỉnh (Hitachi, Mitsubishi Electric); thiết bị nhập điều chỉnh vận hành dạng **máy tính bảng** (JR East, tuyến Joban, 2021) thay vì chuột; **chưa có dấu hiệu máy tự quyết định hoàn toàn trên Shinkansen**.

## 3. Cấu trúc trung tâm điều hành Tokaido/Sanyo/Kyushu (Tokyo) **[N]**

- **Một phòng, ba công ty.** Nhân viên JR Central, JR West và JR Kyushu làm việc chung (đồng phục khác nhau); có **ba chỉ huy trưởng** của ba công ty (theo một bài báo) và chức danh **輸送指令長** (chỉ huy vận chuyển) cùng **総合指令長** (tổng chỉ huy, người chịu trách nhiệm cao nhất về điều hành). JR Kyushu có **trung tâm Shinkansen riêng ở Hakata** và **cử nhân viên liên lạc** đến Tokyo.
- **Bảng hiển thị:** trung tâm dự phòng Osaka có bảng chia hai đoạn Tokyo–Hakata (dài khoảng **22 m**, tương đương một toa tàu thường, nhìn được từ mọi vị trí) và Hakata–Kagoshima-Chuo; Tokyo có thiết bị tương đương, thấy toàn bộ vị trí tàu từ Tokyo đến Kagoshima-Chuo. Phía trước bảng có **sáu bàn**.
- **Các bàn (指令) và việc của từng bàn:**

| Bàn | Nhiệm vụ chính | Quyết định điển hình |
|---|---|---|
| **輸送(列車)指令** (điều độ tàu) | Giám sát vận hành, điều khiển lộ trình qua CTC, **lập kế hoạch khôi phục** | Hủy chuyến, cho tàu quay đầu ở ga giữa, chọn tàu nào đi trước |
| **輸送(旅客)指令** (điều độ hành khách) | Truyền thông tin chậm tàu đến ga và trưởng tàu; điều phối xe cứu thương khi hành khách đột ngột bệnh | Thông báo cho ga và nhân viên |
| **運用指令** (vận dụng) | Thông báo thay đổi cho lái tàu và trưởng tàu; **quyết định đoàn tàu nào chạy ngày hôm sau** | Đổi đoàn tàu và tổ lái |
| **電力指令** | Giám sát cấp điện, điều khiển từ xa trạm biến áp/trạm phân vùng | Cắt/cấp điện (kể cả khi có động đất) |
| **施設指令** | Thu khí tượng, động đất; quản lý bảo trì ray; chỉ đạo khôi phục | Đoạn nào được chạy chậm hay dừng |
| **信号通信指令** | Giám sát COMTRAC, CTC, ATC và thông tin liên lạc | Xử lý sự cố thiết bị |
| **情報指令** (thêm sau) | Đăng thông tin chậm tàu lên website/SNS | Nội dung và thời điểm đăng |
| **車両指令** (thêm sau) | Dùng dữ liệu xe để xử lý nhanh khi xe hỏng | Cách xử lý sự cố xe |

- **Chỉ huy trưởng và dự phòng:** trung tâm **dự phòng Osaka (第2総合指令所)**, mở **1999** sau động đất Hanshin-Awaji (1995), bố trí giống hệt Tokyo, là hệ "二重系" (hai lớp dự phòng) cho thảm họa lớn. **Quyền điều hành được chuyển sang Osaka một ngày mỗi năm** (vd. 2/12/2017; một bài báo cho biết **7/12/2024** cũng chuyển từ Tokyo sang Osaka) để luyện tập; nguồn khác nói "vài lần mỗi năm" **[?]** (mâu thuẫn nhỏ).
- **Ca trực [N, JR West, bàn 施設/電力/信号通信 của Sanyo]:** một ca kéo dài **từ 9:30 đến 10:00 sáng hôm sau, tổng 24 giờ 30 phút**; bàn **施設指令** có **6 nhân viên** (kể cả người trên 60 tuổi). Có **兼務指令員** (điều độ viên kiêm nhiệm: người bình thường làm lái tàu hoặc nhân viên ga) được bố trí ở trung tâm Osaka khi luyện tập. Số tổng cộng điều độ viên Shinkansen vẫn **không công khai**; chỉ có tuyến thường JR East: ~500 chỉ huy cho phòng Tokyo, 24/7 **[N, tuyến thường]**.
- **Cách ra quyết định [N]:** các bàn họp **指令間協議** (thảo luận giữa các bàn) rồi trung tâm **quyết định chung**; cấp trên nghe ý kiến nhân viên trước; ưu tiên hàng đầu là an toàn hành khách và nhân viên. Ước tính thời gian khôi phục lấy từ báo cáo tiến độ của nhân viên hiện trường qua điện thoại; trước khi cho chạy lại phải **chạy tàu kiểm tra** và xác nhận ray lần cuối. Một bài báo ghi nhân viên bàn **輸送列車** đều là **cựu lái tàu Shinkansen** (không nêu công ty) **[?]**.

## 4. Công cụ và luồng thông tin

### 4.1 Máy làm gì và người làm gì
- **Tàu không tự chọn đường**: lộ trình do mặt đất đặt bằng cách chuyển ghi. COMTRAC tự động đặt lộ trình theo biểu đồ đã nhập, theo dõi tàu, điều khiển ghi, **dự đoán biểu đồ tương lai và cảnh báo điều độ viên** khi sắp lệch **[N]**.
- **Khi có bất thường**, hệ thống tính phương án (giới hạn tốc độ, đổi ga vượt, hủy chuyến, chạy tàu đặc biệt) và hỗ trợ điều độ viên; điều độ viên vẫn **có thể thao tác thủ công và xác nhận** thay đổi **[N]**.
- **COSMOS:** có chức năng dự báo biểu đồ sau khi tàu chậm, cảnh báo, **mô phỏng phương án**; hệ thống **chỉ bắt đầu điều chỉnh sau khi điều độ viên phê duyệt**. Điều độ viên cũng phê duyệt chuyển giữa **giờ chạy tàu và giờ bảo trì** (ban đêm) và nhập thay đổi biểu đồ **[N]**.
- **Kế hoạch trước ngày [N]:** kế hoạch cơ bản, kế hoạch sóng (波動計画, tức điều chỉnh theo nhu cầu thay đổi), kế hoạch kiểm tra xe, kế hoạch theo ngày, bố trí đoàn tàu và nhân viên, chuyển đổi biểu đồ (ダイヤ切替) và tạo dữ liệu điều khiển lộ trình.
- **Thủ công vẫn còn:** JR Central cho biết điều độ viên vẫn dùng **PC cùng biểu đồ giấy (ダイヤグラム) và thước kẻ** để ghi phương án **[N]**. Nghiên cứu JR East ghi rằng điều chỉnh vận hành truyền thống trên tuyến thường làm **hoàn toàn bằng tay**, và Shinkansen là một trong số ít hệ có hỗ trợ dự báo khi rối **[N]**.
- **Dữ liệu biểu đồ gốc cho lái tàu** đưa vào **thẻ IC**, giảm soạn lại bảng giờ thủ công **[N]**.
- **Phụ thuộc mạng truyền thông:** hệ cần máy tính lưu biểu đồ, hệ theo dõi hiển thị và mạng nối trung tâm với ga. Vụ cháy cáp năm 2012 cho thấy tàu không chạy được dù ray và dây điện còn nguyên **[N]**.

### 4.2 Luồng ra quyết định tiêu biểu **[N]**
- **輸送列車指令** lập kế hoạch khôi phục và quyết định hủy/quay đầu → **輸送旅客指令** báo ga và trưởng tàu → **運用指令** báo lái tàu → **情報指令** đăng thông tin; **施設/電力/信号通信指令** cung cấp tình trạng hạ tầng.
- Ngay sau động đất Tohoku 2011, trung tâm Tokyo (cũng bị rung mạnh) việc đầu tiên là **nắm tình hình và dừng khẩn cấp mọi tàu**; Tokaido không hư hại lớn nhưng đã có sẵn biểu đồ mới ngày 12/3, nên các bộ phận phối hợp để chuyến đầu ngày 12/3 (Nozomi 1) chạy đúng giờ theo biểu đồ mới.

## 5. Điều chỉnh vận hành (運転整理) trên Shinkansen

### 5.1 Danh mục biện pháp (tổng quát, từ Wikipedia tiếng Nhật) **[N]**
Đổi giờ chạy · **抑止/通知運転** (giữ tàu, cho tàu sau chờ tín hiệu ga trước, tránh dừng giữa ga) · **điều chỉnh thời gian** (cố ý trễ xuất phát để giãn khoảng cách) · dừng hoặc bỏ ga tạm thời · đổi chủng loại (hạ cấp) · **đổi thứ tự chạy**, đổi ga vượt, đổi đường vào/ra ga · hủy chuyến, cắt chuyến, **部分運休 kèm quay đầu giữa đường** · **đổi vận dụng đoàn tàu/nhân viên** · tàu đặc biệt, kéo dài, tàu thời vụ.
Bài không nêu điều chỉnh tốc độ và chạy chậm, nhưng trong thực tế Shinkansen cả hai đều dùng (xem 5.3 và tài liệu 09).

### 5.2 Các nguyên tắc riêng của Shinkansen (rút từ nguồn)
1. **Không hủy một phần chuyến** là nguyên tắc thông thường khi **xử lý trễ** (Tomii 2010): không cắt phần cuối của một chuyến đang chạy dở vì hành khách bị bỏ lại giữa tuyến. Điều này **không mâu thuẫn** với việc "hủy hoặc quay đầu giữa đường" mà bàn 輸送列車指令 có quyền quyết định, vì đó là **hai biện pháp khác nhau [I]**: (a) *cắt một chuyến đơn lẻ giữa đường để gỡ trễ* (hầu như không dùng); (b) *kế hoạch chạy quay đầu ở một ga cuối do cả đoạn tuyến bị đóng* (đã **lên kế hoạch trước**, vd. ngày **15** (nhiều khả năng **15/8/2019, bão số 10**; năm suy ra từ tên bão **[I]**): Tokaido ngừng liên thông với Sanyo (Sanyo ngừng cả ngày giữa Shin-Osaka và Kokura), toàn bộ tàu chạy **quay đầu Tokyo–Shin-Osaka**, hủy khoảng **55–60 chuyến** tùy nguồn, trải từ khung 8–16 giờ chiều xuống và 10–19 giờ chiều lên **[N]**). Trong trường hợp (b) mọi hành khách biết trước ga cuối nên không bị bỏ giữa đường.
2. **Đổi đoàn tàu:** trên Tokaido mọi đoàn có **cùng số toa và cùng sức chứa**, nên đoàn nào cũng chạy được Nozomi/Hikari/Kodama. Khi một chuyến đến ga cuối trễ, đưa **đoàn khác** vào chuyến quay đầu để xuất phát đúng giờ; vì không có đoàn dự phòng nên việc này kéo theo hàng loạt thay đổi vận dụng đoàn tàu và tổ lái **[N]**.
3. **Kodama và ga Atami:** **Atami là ga duy nhất không thể cho tàu chờ vượt**, nên **Odawara và Mishima** là điểm then chốt: phải quyết bao nhiêu Nozomi/Hikari đi trước, và làm sao để Kodama "chạy thoát" đến Odawara/Mishima mà không bị kẹt. Cho Kodama chờ liên tục thì giữ được lịch tốc hành nhưng Kodama trễ thêm nhiều; điều độ viên phải cân **khôi phục lịch** và **tiện lợi hành khách** **[N]**. Khớp dữ liệu: Odawara và Mishima là ga chờ vượt phổ biến của Kodama (dừng 5 phút), Atami chỉ dừng 1 phút **[D]**.
4. **Tàu ghép Tohoku:** quy tắc ngưỡng x, y (chờ để ghép / bỏ ghép / ghép vào chuyến sau); chi tiết ở tài liệu 04 mục 10 **[N]**.
5. **Đổi sân ga:** khi nối chuyến thay đổi, tàu có thể rời từ sân khác với kế hoạch **[N, một nguồn]**.
6. **Nối tàu thường:** Shinkansen chờ tàu tuyến thường trong giới hạn chờ quy định; trễ ở Yamagata/Akita lan sang Tohoku/Joetsu/Hokuriku **[N]**.
7. **Không có tàu và tổ lái dự phòng:** nên đưa tàu rỗng về depot rồi lấy đoàn khác thì kéo theo thay đổi lớn **[N]**.
8. **Tiêu chí đánh giá phương án:** không thể chỉ so tổng thời gian trễ hay thời điểm khôi phục mà phải xét **khung giờ** (cao điểm sáng, giữa ngày, đêm) và **mức bất tiện cho hành khách** **[N]**. Nghiên cứu RTRI (Tomii 2005) lập bài toán tối ưu có ràng buộc để **giảm thiểu sự không hài lòng của hành khách**.

### 5.3 Các tình huống mẫu (để mô phỏng) **[I], dựa trên 5.1–5.2**
| Tình huống | Biện pháp có thể dùng |
|---|---|
| Nozomi trễ 5 phút giữa đường | Cho Hikari/Kodama chờ lâu hơn ở ga vượt; hoặc nhường ô 3 phút kế tiếp |
| Tàu trễ đến ga cuối | Đổi đoàn cho chuyến quay đầu; chạy tàu rỗng về depot |
| Hikari trễ đúng lúc cần vượt tại Hamamatsu | Chuyển vượt sang ga kế (Toyohashi/Mikawa-Anjo) hoặc đổi thứ tự |
| Tuyết ở Gifu-Hashima – Maibara | Chạy chậm đoạn đó càng ngắn càng tốt (cảm biến tuyết + báo cáo) |
| Dừng lâu giữa đường | Đưa tàu vào ga gần nhất rồi cho khách xuống |
| Tàu ghép Tohoku trễ ở Morioka/Fukushima | Quyết định chờ, bỏ ghép hoặc ghép chuyến sau theo ngưỡng x, y |

### 5.4 Điều khiển khi dừng lâu giữa đường **[N]**
Nếu dự kiến phải ngừng lâu (vd. mưa lớn), tàu được đưa vào **ga trung gian** để khách xuống. Tại Shin-Fuji, Kakegawa và Mikawa-Anjo có **trung tâm chuyển tiếp (中継台)** với 4 vị trí cho mỗi chuyến (toa 2, 6, 11, 14, cả hai chiều); JR Central trang bị **cầu nối 175 cm × 75 cm** cho mọi đoàn tàu (đến 6/2020) để cho khách, kể cả người dùng xe lăn, xuống. Việc xuống do trưởng tàu cùng nhân viên JR Central Passengers thực hiện. Tokaido năm FY2019 có 378 chuyến/ngày **[N]**. (Về "trễ trung bình 0,2 phút" xem mục dưới: **không mâu thuẫn** với 0,6 phút của FY2008, vì mỗi năm một khác.)

**Chuỗi trễ trung bình hằng năm của Tokaido (đều tính cả trễ do thiên tai) [N]:** trung bình năm 1997–2012 khoảng 0,5 phút/chuyến; FY2008 0,6 phút (36 giây); FY2015 **12 giây**; FY2016 **24 giây**; FY2019 **0,2 phút** (báo cáo thường niên JR Central 2020); FY2023 1,6 phút; FY2024 1,4 phút. Tức giá trị dao động từ khoảng 0,2 đến 1,6 phút tùy năm, chủ yếu theo mức thiên tai (các năm gần đây cao hơn vì mưa lớn/bão). Hai con số 0,2 và 0,6 chỉ là hai năm khác nhau trong chuỗi đó.

## 6. Quy trình xử lý sự cố và chạy lại **[N]**
1. **Phát hiện** (ATC, báo của lái tàu, cảm biến thời tiết/động đất, báo từ hiện trường) → **dừng khẩn cấp hoặc 抑止**. Nguyên tắc của chỉ huy trưởng JR West: **"dừng tàu trước"**, nghi ngờ thì dừng; chỉ cho chạy khi **xác nhận được an toàn**; sách hướng dẫn không bao quát hết tình huống, nên cần đào tạo liên tục.
2. **Nắm tình hình:** chờ nhân viên hiện trường xác nhận; đây là **việc khó nhất** (quyết định cho chạy lại khi chưa đủ thông tin).
3. **Lập kế hoạch khôi phục, thông báo** theo luồng ở 4.2; **情報指令** đăng nhanh, theo thời gian thực, văn phong giúp hành khách tự quyết định (khó ở chỗ đăng đến đâu: báo "có thể hủy" mà tình hình không xấu đi thì hành khách thiệt).
4. **Chạy lại có điều kiện:** theo từng đoạn, kiểm tra thiết bị, chạy chậm hoặc giảm số chuyến. Ví dụ: động đất Yamanashi (cường độ 6-): tàu tự cắt điện, dừng khẩn cấp, sau khoảng **15 phút** chạy lại toàn bộ; động đất Noto 2024: dừng toàn Tohoku/Joetsu/Hokuriku rồi chạy lại **từng đoạn đã xác nhận**, một số đoạn Joetsu/Hokuriku nghỉ đến sáng hôm sau; Kumamoto 2016: sửa chữa khẩn cấp, **chạy thử**, rồi mở **từng đoạn**; Fukushima 2021 [?: có thể là vụ 3/2022, xem 09 §2.2]: chạy lại toàn tuyến nhưng **giảm tốc độ và chỉ ~80% số chuyến** ở Nasushiobara–Ichinoseki.
5. **Phối hợp:** bàn **施設指令** thu khí tượng/động đất, chỉ đạo khôi phục; **電力指令** cấp lại điện.

## 7. Phối hợp giữa các công ty và loại tuyến **[N]/[I]**
- **Tokaido ↔ Sanyo ↔ Kyushu:** điều hành chung tại Tokyo; JR Kyushu điều Kyushu từ Hakata, có người liên lạc ở Tokyo. Khi trễ lan xuyên công ty, các bàn phối hợp tại một phòng.
- **JR East ↔ JR Hokkaido:** COSMOS liên kết CYGNUS; trễ ở Seikan (tàu hàng, hầm dùng chung ray) ảnh hưởng chuyến Tokyo–Shin-Hakodate.
- **Tuyến thường:** tàu mini-Shinkansen nối chuyến với tuyến thường; Relay Kamome nối Kamome ở Takeo-Onsen trong 3 phút (tài liệu 04 mục 3e).
- **Giới hạn giữa các công ty:** chia chi phí/tiền thuê đường khi trễ: **chưa có nguồn** **[?]**.

## 8. Ý nghĩa cho game **[I]**
- **Vai người chơi:** điều độ viên **輸送列車指令** (quyết định thứ tự, ga vượt, đổi đoàn, hủy/quay đầu), các bàn khác (điện, hạ tầng, tín hiệu, thông tin, vận dụng) có thể là **AI/sự kiện** cung cấp thông tin và ràng buộc. Có thể chia chế độ chơi theo bàn.
- **Công cụ trong game:** bảng vị trí tàu thời gian thực (như bảng 22 m); biểu đồ (ダイヤ); **dự báo biểu đồ** và **mô phỏng phương án** (như COSMOS), hệ thống chỉ thực thi khi người chơi **phê duyệt**.
- **Hành động hợp lệ:** đổi thứ tự/ga vượt; thêm chờ; đổi đoàn; chạy tàu đặc biệt; hạn chế tốc độ; **quay đầu giữa đường** (hình phạt lớn); bỏ ghép (Tohoku). **Không có** "hủy một phần chuyến" như lựa chọn thường.
- **Ràng buộc thật cần cài:** Atami không vượt được; ô 3 phút (Tokaido); thời gian chiếm sân khi quay đầu 15 phút Tokaido, 11–12 phút Tohoku; không đoàn/tổ lái dự phòng; tàu thường chờ nối chuyến theo giới hạn.
- **Điểm số:** trễ trung bình (đúng giờ khi ≤1 phút), **sự bất tiện của hành khách** theo khung giờ (không chỉ tổng phút trễ), số chuyến hủy/quay đầu, thời gian khôi phục.
- **Khó nhất cần mô phỏng:** quyết định chạy lại khi **thiếu thông tin** (chờ hiện trường), và **giao tiếp** (nội dung thông báo hành khách).

## 9. Lỗ hổng: đã giải quyết và còn lại

**Đã giải quyết (lần rà soát này):**
- **Hai điểm "mâu thuẫn":** thực ra không mâu thuẫn. (1) "Không hủy một phần chuyến" là nguyên tắc khi gỡ trễ từng chuyến; còn quay đầu ở Shin-Osaka là kế hoạch trước khi cả đoạn tuyến bị đóng (§5.2 mục 1). (2) 0,2 phút (FY2019) và 0,6 phút (FY2008) là hai năm khác nhau trong một chuỗi từ 12 giây (FY2015) đến 1,6 phút (FY2023) (§5.4).
- **Trung tâm JR Hokkaido:** Sapporo 総合指令所 cho radio tàu; hệ CYGNUS (chức năng, quản lý tàu hàng ở Seikan) (§1). Vị trí chính xác phòng Shinkansen vẫn chưa xác nhận.
- **Ca trực:** 24 giờ 30 phút (9:30–10:00 hôm sau) ở bàn hạ tầng/điện/tín hiệu của JR West; bàn 施設 6 người (§3). **Quy trình quyết định:** họp liên bàn rồi quyết định chung (§3).

**Không giải quyết được (đã thử nhiều nguồn, không công khai), nên mô hình hóa bằng giả định [I]:**
- **Tổng số điều độ viên** và số người mỗi bàn ở Tokyo/JR East/JR Kyushu.
- **Quy tắc ưu tiên chính thức** khi hai chuyến xung đột và **ngưỡng cụ thể** (bao nhiêu phút trễ thì đổi thứ tự, bao nhiêu thì hủy). Chỉ có nguyên tắc định tính: an toàn trước; không đánh giá chỉ theo tổng phút trễ mà theo khung giờ và bất tiện của hành khách; cân giữa tàu tốc hành và Kodama; ngưỡng x, y chỉ có ở tàu ghép mini-Shinkansen nhưng không công bố giá trị. Trong game đề xuất dùng các nguyên tắc này làm **hàm điểm** thay vì số cứng.
- **Hệ điều hành Nishi-Kyushu** (tên hệ thống, trung tâm): chỉ suy ra nhiều khả năng do Hakata điều hành.
- **Chi tiết kỹ thuật COSMOS/SIRIUS/CYGNUS** (kiến trúc, thời gian phản hồi) và **lịch vận dụng đoàn tàu/tổ lái** (cần ở tài liệu 08): không công khai.

## Nguồn
- Wikipedia tiếng Nhật: [COMTRAC](https://ja.wikipedia.org/wiki/COMTRAC), [新幹線総合システム (COSMOS)](https://ja.wikipedia.org/wiki/新幹線総合システム), [運転整理](https://ja.wikipedia.org/wiki/運転整理)
- Hitachi: [Shinkansen control systems](https://www.hitachi.co.jp/products/it/control_sys/railway_solution/safety_transport/shinkansen.html); [Hitachi Review 2022, tablet GD cho ATOS và AI](https://www.hitachihyoron.com/jp/archive/2020s/2022/01/pdf/2022_01_10.pdf)
- trafficnews: [第2総合指令所 (2018-12)](https://trafficnews.jp/post/82314), [指令所の役割と引っ越し](https://trafficnews.jp/post/79158), [第2総合指令所の詳細](https://trafficnews.jp/post/495251/2)
- JR West "Blue Signal" 192: [総合指令長インタビュー](https://www.westjr.co.jp/company/info/issue/bsignal/21_vol_192/rail/)
- bestcarweb: [新幹線が遅延: 指令所の役割](https://bestcarweb.jp/feature/column/585163?prd=2) (trang 2 và 3)
- mynavi: [鉄道とIT: 運行管理システム](https://news.mynavi.jp/techplus/article/railway_it-2/)
- gendai.media: [東京総合指令室 (JR East tuyến thường)](https://gendai.media/articles/-/41571)
- tetsudo.com: [Shin-Fuji huấn luyện xử lý dừng lâu](https://www.tetsudo.com/report/300/)
- JR West Blue Signal 206: [bàn 施設/電力/信号通信 Sanyo, ca trực](https://www.westjr.co.jp/company/info/issue/bsignal/25_vol_206/rail/); JR West tuyển dụng: [điều độ viên 施設](https://www.westjr.co.jp/company/recruit/fresh/person/p69/)
- CYGNUS: [mynavi 2016](https://news.mynavi.jp/article/20160319-cygnus/); [Hitachi Review 2016](https://www.hitachihyoron.com/jp/archive/2010s/2016/03/pdf/2016_03_02.pdf); [Mitsubishi Electric Giho 2017 (radio tàu ở Sapporo)](https://www.giho.mitsubishielectric.co.jp/giho/pdf/2017/1706108.pdf)
- Nishi-Kyushu: [trafficnews – huấn luyện](https://trafficnews.jp/post/119824)
- Trễ trung bình theo năm: [nippon.com](https://www.nippon.com/ja/features/h00201/), [banzokubiology](https://banzokubiology.com/tokaido-delay-frequency/), [gendai.media](https://gendai.media/articles/-/54719)
- Bão 15/8/2019, quay đầu Tokyo–Shin-Osaka: [tetsudo-ch](https://tetsudo-ch.com/9588537.html), [livedoor](https://news.livedoor.com/article/detail/16926464/)
- Hyoudou et al., *An Expert System for Train Operation Adjustment of Shinkansen*, 1997: [TRID](https://trid.trb.org/View/505831)
- Tomii et al., *Train Operation Rescheduling Algorithm Based on Passenger Satisfaction*, RTRI: [J-STAGE](https://www.jstage.jst.go.jp/article/rtriqr/46/3/46_3_167/_article)
- Tomii N., *How the punctuality of the Shinkansen has been achieved*, 2010: [PDF](https://www.witpress.com/Secure/elibrary/papers/CR10/CR10011FU1.pdf)
- Chạy lại sau động đất: [JR East 2021](https://www.jreast.co.jp/press/2020/20210226_ho05.pdf), [Jiji](https://sp.m.jiji.com/english/show/18981), [Jiji 2](https://sp.m.jiji.com/english/show/10574)
