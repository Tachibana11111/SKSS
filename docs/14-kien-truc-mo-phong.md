# 14. Kiến trúc mô phỏng: thế giới, danh mục tàu, bản đồ và chế độ ngó buồng lái

Tài liệu cho người sửa mã (kể cả chính tác giả sau vài tháng). Nhãn: **[D]** từ mã/dữ liệu đã kiểm, **[I]** suy luận/đơn giản hóa của game, **[K]** kiến thức nền chưa kiểm chứng, **[?]** chưa rõ. Chi tiết nghiệp vụ nằm ở docs 03–09; độ tin cậy từng cơ chế mới nằm ở `docs/15-do-tin-cay-co-che-moi.md`.

## 1. Hai loại "tàu" trong game [D]

| | Tàu mô phỏng thật | Bản sao danh mục (catalog twin) |
|---|---|---|
| Là gì | `Train` trong một thế giới `W`: có vị trí `x`, vận tốc `v`, cần ga/phanh, ATC, cửa, pha `phase` (`dwell`/`run`/`end`) | Một mục trong `NatCat.build(LINES)`: lịch (`ta`/`td` từng ga dừng), không có vật lý |
| Ở đâu | `W.player` (tàu ta lái), `W.lead` (tàu đi trước), `W.net.trains` (chế độ điều độ), tàu vào buồng lái (§5) | Mọi tàu trong lịch thật của 7 tuyến (~880 đoàn); hiện trên bản đồ toàn quốc, tooltip ga, tàu đỗ ga, tàu ngược chiều |
| Vị trí | Tích phân vật lý mỗi `Sim.tick` (0,05 s) | `NatCat.stateOf(LN, c, giờ − độ trễ, skip)`: tra bảng đoạn |

Hai loại gặp nhau ở **vị trí độ trễ** `d = W.haz.delay.get(c.key)` (`delay`, `hold`, `rate`, `why`, `skip`, `slowT`…): bản đồ cho mỗi bản sao một độ trễ, rồi đọc vị trí từ lịch tại giờ `now − delay`. Tàu thật nhìn bản đồ qua `NatCat.updateObstacle` (tàu phía trước gần nhất trong 15 km → `W.obs` → ATC giữ khoảng cách).

## 2. NatCat: danh mục, độ trễ và giữ tàu (`natcat.js`)

- **`build`**: dựng danh mục từ `LINES[*].trains` (khoá `key` = tuyến + loại + số + chiều). **[D]**
- **`segTable` / `stateOf`**: mỗi đoạn giữa hai ga dừng có bảng (thời gian → quãng đường, tốc độ): tăng tốc đều 0,6 m/s², chạy đều, phanh theo đường cong ATC 0,72 m/s², giới hạn 80 km/h trong 1.150 m trước và 630 m sau ga có ghi rẽ; tốc độ chạy đều tìm sao cho tổng thời gian khớp lịch. **[I]** Tham số `skip` (tập chỉ số ga dừng được cho thông qua) nối hai đoạn liền nhau.
- **`step(W)`**: cập nhật độ trễ theo bước 5 s từ `WARM` (1800 s) trước giờ xuất phát tới giờ hiện tại: (1) giữ tàu `hold` do động đất/giữ theo ô thời tiết/sự cố ngẫu nhiên; (2) làm chậm trong ô mưa (70 km/h) và vùng `slow`; (3) giãn cách: tàu sau không được vượt tàu trước giữa hai ga (chỉ vượt ở ga có đường tránh khi tàu trước đang đỗ); (4) đường đơn (mini-Shinkansen). **[I]** nguyên lý; ngưỡng thời tiết **[N]** (docs/06 §5.3).
- **Sự cố ngẫu nhiên cho mọi đoàn (`planOf` / `applyEv`)**: số sự kiện lấy theo `W.diff.events`, loại và thời điểm sinh từ hạt giống của chuyến và khoá đoàn (cùng seed → giống hệt). Loại ở ga dừng (giữ tàu, hành khách bệnh, cửa lỗi, nhường tàu vượt, hỏng thiết bị, thông qua ga) và loại giữa đường (thú, xe kẹt đường ngang, nhân viên làm việc, chạy chậm, đứt dây, cháy). Đoàn ghép: đoàn Tohoku sinh, đoàn mini nhận cùng lúc. Tàu kiểm tra không có sự cố hành khách. **[I]**
- **Thiên tai/động đất/thời tiết** là chung cả bản đồ (`H.cells`, `H.quakes`), dựng từ kế hoạch của chuyến (`W.hazPlan`) hoặc dữ liệu thật ở chế độ thực tế. **[I]/[N]**

## 3. Bản đồ toàn quốc (`natmap.js`)

`draw(ctx, x, y, w, h, W, T, o)` luôn nhận **thế giới của tàu ta** (`mapW()`/`mapT()` trong `index.html`), kể cả khi đang ngồi buồng lái tàu khác. `gather` đọc độ trễ của `W.haz`, làm trơn bằng `shownDelay` (tăng tối đa 0,9 s mỗi giây, hoặc 1,0 khi đang bị giữ, để tàu không lùi và tàu bị giữ đứng yên hẳn), ghi đè vị trí tàu của ta và tàu đang ngồi bằng vị trí thật.

## 4. Thế giới `W`, đoàn tàu `T` và kiểm thử "ngoài trình duyệt"

`Sim.createWorld(lineId, trip, opts)` tạo `W` (tuyến, chiều, độ khó, thời tiết, sự kiện, `W.haz` lúc cần). `Sim.tick(W, dt, input, auto)` tiến mô phỏng; `auto = true` bật tự lái (`autoRaw`: tốc độ mục tiêu = giới hạn ATC trừ biên an toàn, phanh theo đường cong tới vạch dừng, bám giờ kế hoạch trừ tàu kiểm tra). Mọi thứ chạy được trong Node (không cần trình duyệt): `node tests/run.js`.

## 5. Chế độ tự do: vào buồng lái tàu khác (`index.html`, `natmap.js`, `sim.js`, `natcat.js`)

```
HOME = { W: thế giới của tàu ta, T }          // đứng yên trong biến toàn cục khi đang ở tàu khác
W, T = thế giới/tàu đang ngồi                 // W.fgn = { c } (mục danh mục), W.home = HOME, T.foreign = true
HOME.W.fgnW = thế giới tàu được chọn          // để bản đồ vẽ nó ở vị trí thật
```

1. **Vào** (`enterCab`): `Sim.spawnAt(line, rec, giờ, {km, kmh, dwellI})` dựng thế giới riêng: chuyến từ ga dừng gần nhất phía sau tới ga cuối, đặt đúng vị trí/tốc độ/trạng thái đỗ; tốc độ đầu bị chặn trong ATC của vị trí. Đoàn Tohoku đang ghép được đặt thành đoàn ghép (không dựng lại cảnh ghép ở ga xuất phát). Tàu kiểm tra: không hành khách (`T.noPax`, cửa đóng khi đỗ, không PA).
2. **Mỗi khung** (`frame`): `Sim.tick(W)` (tàu ngồi, `auto` khoá bật), `NatMap.follow(W)`, `Sim.tick(HOME.W, …, true)` (tàu ta tự lái nền).
3. **`follow`**: dừng tàu khi bản đồ của tàu ta đang giữ nó (`d.hold > 0` → `T.mapCap = 0`, ATC), đồng bộ thời tiết (ô mưa → vùng 70 km/h trên tuyến tàu đó).
4. **`NatCat.alignFgn`** (trong `step(HOME.W)`): kéo độ trễ của bản sao tàu đang ngồi cho khớp vị trí thật (hoặc trạng thái đỗ), nên các tàu khác tính giãn cách theo tàu thật; `delayOf` của thế giới `W.fgn` đọc từ `HOME.W.haz`.
5. **`NatCat.bindEvents` + `Sim.fgnEvent`**: sự cố chưa xảy ra của đoàn đó được đưa vào `W.events` của thế giới riêng và tạo hiện tượng thật (thông báo, vùng chạy chậm, giữ tàu, hộp thoại…); tự lái xử lý (`autoExtras`: nhắc lệnh sau ~6 s, hộp thoại sau ~8 s, còi; `autoDepart`: đóng cửa). Sự kiện đã xảy ra thì đánh dấu `done` để bản đồ không lặp.
6. **Khoá điều khiển**: `doAct` bỏ mọi thao tác khi `HOME` (trừ động đất thật); `fullui.js` làm mờ cần, 2 nút dưới minimap, 10 nút bảng điều khiển.
7. **Phát thanh** (`audio.js`): mỗi thế giới có kênh riêng (`W._aud`); tàu không ngồi chạy ngầm (`bgTick` + `vtick`), quay về phát nốt phần còn lại.
8. **Quay về** (`backHome`): hoán đổi lại `W/T`, tự lái vẫn bật (người chơi tắt bằng T); thế giới tàu kia bị bỏ (`AUD.park` cất phần PA dở theo khoá tàu).

## 6. Bất biến và bẫy đã gặp [D]

- **Không bước (`step`) thế giới `W.fgn`**: nó dùng bản đồ của tàu ta (`step` thoát ngay nếu `W.fgn`).
- **`stateOf` phải nhận `d.skip`** ở mọi nơi tính vị trí theo độ trễ (bản đồ, `step`, `updateObstacle`, test); quên thì đoàn bị cho thông qua ga hiện "đổi thứ tự" giả.
- **Đoàn ghép** (`coupleOf`) đi chung nên sự cố áp cho cả hai cùng lúc (`partnerOf`); nếu chỉ áp một đoàn thì đoàn kia vượt qua giữa đường.
- **Tàu kiểm tra** (`Sim.INSPECT[rec.v]`): không sự cố hành khách, không PA, tự lái chạy theo ATC cao nhất; thế giới điều độ (`createNetwork`) không có `W.trip`, mọi điều kiện đọc `W.trip` phải kiểm tra tồn tại.
- **Thứ tự tick/step**: `Sim.tick(W)` chạy trước `NatMap.follow` → sự kiện của thế giới ngồi xảy ra trước khi bản đồ kịp giữ tàu.
- **Kiểm thử**: mỗi bất biến trên có test trong `tests/run.js` (phần bản đồ toàn quốc, phần khởi động nhiều giờ, phần tự lái, phần dữ liệu). Chạy song song: `node tests/run-parallel.js`.

## 6b. Đoàn ghép Tohoku + mini (Hayabusa/Komachi, Yamabiko/Tsubasa) [D/I]

- **Hai bản ghi một đoàn.** `coupleOf(rec)` nối bản ghi Tohoku (`role 'toh'`) với bản ghi mini (`role 'mini'`) cùng số hiệu; `splitKm` = km ga ghép/tách (Morioka 496,5; Fukushima 255,1). Mẫu tàu theo vị trí là `vehAt(rec, km)`: đang đi chung thì `E6+E5`/`E5+E6`, đã tách thì chỉ còn mini (`rec.cp[1]` cho Komachi/Tsubasa chiều xuống, vì bản ghi chiều xuống ghi sẵn "E6+E5" từ ga xuất phát). Nhãn tên là `labelAt`.
- **Vạch dừng lùi (`m.sOrig`).** Chiều lên, tàu mini tới ga ghép dừng cách đuôi đoàn Tohoku đang chờ đúng chiều dài E5 + khe nối (≈ 255 m); `m.sOrig` là vị trí tham chiếu của ga (hình học sân ga, ghi), `m.s` là vạch dừng thật. Mọi thứ vẽ theo hình học sân ga (số toa, biển tên ga, đồng hồ cột, nhân viên: `cabview.js`) phải neo theo `sOrig` (`q.d`), chỉ vạch dừng mục tiêu neo theo `m.s` (`q.dm`). Bản đồ vẽ mũi tên tàu ta theo `Sim.mapX(T)` (bù dần về `sOrig` khi tới gần vạch lùi) để tàu đã vào ga không bị vẽ cách ga ~250 m.
- **Tàu đỗ ở ga ghép/tách trong góc nhìn (`refreshDwellers`).** Đoàn ghép đang đỗ ngay tại ga ghép được vẽ thành **hai đoàn riêng cùng đường** (`W.stabled`: Tohoku và mini, mini ở phía bắc). Tách (chiều xuống): vào ga cùng nhau, mini rời trước, Tohoku rời sau ≥ 25 s. Ghép (chiều lên): Tohoku vào trước, mini vào sau ≥ 20 s rồi cả hai cùng rời. Đối tác ghép của chính tàu ta không vẽ thêm ở đường kề.
- **Ghép chiều lên: chờ Tohoku thật (`joinState`, `joinBlock`, `joinGate`, `joinSync`, `joinGeom` trong `sim.js`).** Đoàn Tohoku đối tác là bản sao danh mục (có độ trễ/giữ). Quy tắc theo thứ tự: (1) tàu mini **chờ ở ga dừng liền trước ga ghép** (Shizukuishi, Yonezawa) cho tới khi dự đoán nó tới ga ghép sau Tohoku ≥ 20 s (`eta ≤ bây giờ + 0,92·tr − 20`, `tr` = thời gian chạy kế hoạch gốc); bị giữ thì chờ không giờ; (2) trên đường, giờ đến kế hoạch ở ga ghép dời thành `eta + 110 s` để tự lái/người lái canh theo; (3) ATC chặn tàu mini **ngoài đoạn ghi nối vào tuyến Tohoku** (junction `line:'toh'`, cách ga ~2 km, dài ~1,2 km) với đệm 500 m, tới khi Tohoku còn ≤ 45 s là đỗ (đã qua khỏi đoạn ghi); (4) đoàn Tohoku chờ chỉ hiện 34 s trước giờ đến, chạy vào ga (hãm từ 90 km/h trong 420 m) và đỗ ở vị trí tham chiếu; (5) mini vào ga, dừng ở vạch lùi rồi nối 100–300 s (tính theo thời gian đỗ gốc). Chưa có Tohoku thật thì không nối, tàu mini đã vào ga thì chờ ở vạch (`cpWait`).
- **Đường đơn (`singleStep`, `snapHold`).** Tàu danh mục bị giữ vì đường đơn phía trước có tàu ngược chiều được kéo về **đúng ga** (không đứng cách ga ~200 m), và tìm "ga phía trước" bằng khoảng cách km theo chiều chạy (không dùng `segOf` khi đang đứng đúng ga).

## 7. Hạn chế đã biết [?]

- Hai thế giới (tàu ta, tàu ngồi) tự chọn đường vào ga riêng (ga Tokyo): khi quay về, tàu kia có thể hiện ở đường khác với lúc ngồi buồng lái. Đã quyết định chưa xử lý.
- Tàu ngồi buồng lái chỉ chịu sự cố do kế hoạch danh mục; mô hình giữ tàu giữa đường (`still`) coi tàu như đứng trên đường chính.
- Bản đồ chưa có các giới hạn ATC khác (đường cong, vùng chậm cố định) ngoài mưa và ghi rẽ; tàu ngồi buồng lái có đủ.
- Ước lượng thời gian câu PA khi phát ngầm theo độ dài chữ (150 ms/ký tự) **[I]**.
- Chiều xuống (mini ở phía trước tách ở Morioka/Fukushima rồi chạy trước ra nhánh): chưa kiểm xem mini có chiếm đoạn ghi nối khi đoàn Tohoku còn đang tách hay không.
- Tàu mini đã vào ga ghép mà Tohoku mới bị giữ (rất hiếm, sau điểm thả 45 s) vẫn chờ ở vạch lùi trong sân ga; đoàn Tohoku hiện ra phía trước nó chứ không đi xuyên qua.
