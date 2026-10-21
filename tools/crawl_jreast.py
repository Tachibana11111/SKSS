"""Lấy lịch tàu Shinkansen (ngày thường, chuyến định kỳ không ◆) từ trang lịch tàu số của JR East.

Đọc có kiểm soát: 1 yêu cầu mỗi `--delay` giây, lưu đệm HTML để không tải lại, chỉ các trang danh sách ga
Tokyo / Shinagawa / Omiya (mọi trang có tiêu đề chứa '新幹線' và là ngày thường) rồi các trang chi tiết chuyến.

Chạy:  python -X utf8 tools/crawl_jreast.py --cache <thư mục đệm> --out docs/data
Dùng cho game cá nhân. Không tái phân phối dữ liệu.
"""
import argparse
import calendar
import csv
import datetime as dt
import html
import os
import re
import sys
import time
import urllib.request

BASE = "https://timetables.jreast.co.jp/"
VER = "2610"
STATIONS = {"1039": "Tokyo", "0788": "Shinagawa", "0350": "Omiya"}
UA = {"User-Agent": "Mozilla/5.0 (personal hobby project; low rate)"}
# Ga của mini-Shinkansen: dùng để tách hai nhánh của tàu ghép (Komachi, Tsubasa).
MINI_STATIONS = {"雫石", "田沢湖", "角館", "大曲", "秋田", "米沢", "高畠", "赤湯", "かみのやま温泉", "山形",
                 "天童", "さくらんぼ東根", "村山", "大石田", "新庄", "羽前千歳", "北山形"}


def get(url, cache, delay):
    path = os.path.join(cache, re.sub(r"[^A-Za-z0-9]+", "_", url) + ".html")
    if os.path.exists(path):
        return open(path, encoding="utf-8").read()
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            s = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
            open(path, "w", encoding="utf-8").write(s)
            time.sleep(delay)
            return s
        except Exception as e:  # noqa: BLE001
            print("retry", url, e, file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    return ""


def strip(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def list_pages(st, cache, delay, suffix="0"):
    """Trả về các trang của ga có tiêu đề chứa 新幹線 (suffix '0' = ngày thường, '1' = thứ Bảy/ngày nghỉ)."""
    top = get(f"{BASE}timetable/list{st}.html", cache, delay)
    ids = sorted(set(re.findall(r"tt%s/(%s\d+)\.html" % (st, st), top)))
    pages = []
    for pid in ids:
        if not pid.endswith(suffix):
            continue
        url = f"{BASE}{VER}/timetable/tt{st}/{pid}.html"
        s = get(url, cache, delay)
        m = re.search(r"<h2>([^<]*)</h2>", s[s.find("timetable-daydetail-heading"):])
        heading = strip(m.group(1)) if m else ""
        if "新幹線" in heading:
            pages.append((pid, heading, s))
    return pages


def parse_entries(heading, s):
    rows = []
    for tr in re.finditer(r'<tr id="time_(\d+)">(.*?)</tr>', s, re.S):
        hour = int(tr.group(1))
        for d in re.finditer(
            r'<div class="timetable_time"([^>]*)>(.*?)</div>\s*(?=<div class="timetable_time"|</td>)',
            tr.group(2), re.S):
            attrs, body = d.group(1), d.group(2)
            href = re.search(r'href="([^"]+train/[^"]+\.html)"', body)
            minute = re.search(r'<span class="minute">(?:<span class="sp">)?(\d+)', body)
            if not href or not minute:
                continue

            def attr(name):
                m = re.search(r'data-%s="([^"]*)"' % name, attrs)
                return m.group(1) if m else ""
            rows.append({
                "heading": heading, "time": f"{hour:02d}:{minute.group(1)}",
                "train": attr("train"), "dest": attr("dest"), "flag": attr("misc"),
                "ext": attr("ext"),
                "href": href.group(1).replace("../../", ""),
            })
    return rows


def parse_calendar(s):
    ok, valid = [], []
    for cal in re.finditer(r'<table[^>]*class="calendar-month">(.*?)</table>', s, re.S):
        body = cal.group(1)
        cap = re.search(r"(\d{4})年(\d{1,2})月", body)
        if not cap:
            continue
        y, m = int(cap.group(1)), int(cap.group(2))
        for td in re.finditer(r'<td class="([^"]*)">\s*<span[^>]*>\s*(\d+)\s*</span>', body):
            d = int(td.group(2))
            if d < 1 or d > calendar.monthrange(y, m)[1]:
                continue
            date = dt.date(y, m, d)
            if "invalid" in td.group(1):
                continue
            valid.append(date)
            if "ok" in td.group(1):
                ok.append(date)
    return ok, valid


def parse_train(s):
    ok, valid = parse_calendar(s)
    tables = re.findall(r'<table id="tbl_train"[^>]*>(.*?)</table>', s, re.S)
    out = []
    for t in tables:
        name = re.search(r"<th>列車名</th>(.*?)</tr>", t, re.S)
        num = re.search(r"<th>列車番号</th>(.*?)</tr>", t, re.S)
        equip = re.search(r"<th>設備</th>\s*<td[^>]*>(.*?)</td>", t, re.S)
        remark = re.search(r"<th>備考</th>\s*<td[^>]*>(.*?)</td>", t, re.S)
        stops = []
        for tr in re.finditer(r'<tr class="time">(.*?)</tr>', t, re.S):
            b = tr.group(1)
            st = strip(re.search(r'<th class="time">(.*?)</th>', b, re.S).group(1))
            tds = re.findall(r'<td class="time">(.*?)</td>', b, re.S)
            plats = [strip(x) for x in re.findall(r'<td class="platform">(.*?)</td>', b, re.S)]
            times = re.findall(r"(\d\d:\d\d)\s*(着|発|通過)", tds[0] if tds else b)
            arr = next((x for x, k in times if k == "着"), "")
            dep = next((x for x, k in times if k == "発"), "")
            pas = next((x for x, k in times if k == "通過"), "")
            # Dòng tách/ghép có cột thứ hai: giờ của đoàn thứ hai (đoàn tách ra, ghi '分割'/'併合').
            t2 = re.findall(r"(\d\d:\d\d)\s*(着|発|通過)", tds[1]) if len(tds) > 1 else []
            arr2 = next((x for x, k in t2 if k == "着"), "")
            dep2 = next((x for x, k in t2 if k == "発"), "")
            stops.append((st, arr, dep, pas, plats[0] if plats else "", arr2, dep2, plats[1] if len(plats) > 1 else ""))
        def cells(m):
            # tàu ghép có nhiều ô (mỗi đoàn một ô): nối bằng '+'
            if not m:
                return ""
            return "+".join(x for x in (strip(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", m.group(1), re.S)) if x)
        out.append({
            "name": cells(name),
            "number": cells(num),
            "equip": strip(equip.group(1)) if equip else "",
            "remark": strip(remark.group(1)) if remark else "",
            "stops": stops,
        })
    return out, ok, valid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--delay", type=float, default=1.2)
    ap.add_argument("--include-diamond", action="store_true", help="cũng lấy các chuyến ◆ (mặc định bỏ)")
    ap.add_argument("--day", choices=["weekday", "holiday"], default="weekday", help="loại ngày")
    ap.add_argument("--stations", default="", help="thêm mã ga, cách nhau bằng dấu phẩy (vd. 0854,0039)")
    ap.add_argument("--diamond-stations", default="", help="mã ga (trong --stations) lấy cả chuyến ◆, vd. 0854")
    a = ap.parse_args()
    suffix = "0" if a.day == "weekday" else "1"
    diamond_labels = {"ga" + x for x in a.diamond_stations.split(",") if x}
    tag = "weekday" if a.day == "weekday" else "holiday"
    for extra in [x for x in a.stations.split(",") if x]:
        STATIONS[extra] = "ga" + extra
    os.makedirs(a.cache, exist_ok=True)
    os.makedirs(a.out, exist_ok=True)

    entries = []
    for st, label in STATIONS.items():
        for pid, heading, s in list_pages(st, a.cache, a.delay, suffix):
            es = parse_entries(heading, s)
            for e in es:
                e["station"], e["page"] = label, pid
            entries += es
            print(label, pid, heading, len(es), flush=True)
    with open(os.path.join(a.out, f"lists-{tag}-2610.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["station", "page", "heading", "time", "train", "dest", "flag", "ext", "href"])
        w.writeheader()
        w.writerows(entries)

    todo = []
    seen = set()
    for e in entries:
        if e["href"] in seen:
            continue
        if e["flag"] and not a.include_diamond and e["station"] not in diamond_labels:
            continue
        seen.add(e["href"])
        todo.append(e["href"])
    print("train pages to fetch:", len(todo), flush=True)

    trains_rows, stop_rows = [], []
    ok_by_train = {}
    for n, href in enumerate(todo, 1):
        s = get(BASE + VER + "/" + href.replace("train/", "train/", 1) if not href.startswith(VER) else BASE + href, a.cache, a.delay)
        if not s:
            print("FAILED", href, flush=True)
            continue
        parts, ok, valid = parse_train(s)
        tid = href.split("/")[-1].replace(".html", "")
        ok_by_train[tid] = set(ok)
        for k, p in enumerate(parts):
            trains_rows.append({
                "train_id": tid, "part": k, "name": p["name"], "number": p["number"],
                "from": p["stops"][0][0] if p["stops"] else "",
                "to": p["stops"][-1][0] if p["stops"] else "",
                "n_stops": len(p["stops"]), "equipment": p["equip"], "remark": p["remark"],
                "days_ok": len(ok), "days_valid": 0, "dow_pattern_MonSun": "",
            })
            # Tàu ghép: trang gộp hai đoàn vào một bảng (nhánh Shinkansen rồi nhánh mini-Shinkansen
            # sau điểm tách). Từ ga đầu tiên của tuyến Akita/Yamagata trở đi là nhánh 1 (đoàn thứ hai).
            branch = 0
            for i, (st, arr, dep, pas, plat, arr2, dep2, plat2) in enumerate(p["stops"], 1):
                if st in MINI_STATIONS:
                    branch = 1
                stop_rows.append({"train_id": tid, "part": k, "number": p["number"], "name": p["name"],
                                  "seq": i, "branch": branch, "station": st, "arr": arr, "dep": dep,
                                  "pass": pas, "platform": plat, "arr2": arr2, "dep2": dep2, "platform2": plat2})
        if n % 25 == 0:
            print(f"{n}/{len(todo)}", flush=True)

    # Lịch trên trang để trống cả ngày không chạy lẫn ngày ngoài kỳ hiệu lực, nên so với cửa sổ ngày chung:
    # từ ngày chạy sớm nhất đến muộn nhất trong toàn bộ dữ liệu. Ngày chạy = ô "ok".
    all_ok = set().union(*ok_by_train.values()) if ok_by_train else set()
    if all_ok:
        lo, hi = min(all_ok), max(all_ok)
        window = [lo + dt.timedelta(days=i) for i in range((hi - lo).days + 1)]
        wcount = [sum(1 for d in window if d.weekday() == i) for i in range(7)]
        for row in trains_rows:
            oks = ok_by_train[row["train_id"]]
            row["days_valid"] = len(window)
            row["dow_pattern_MonSun"] = "".join(
                "MTWTFSS"[i] if sum(1 for d in oks if d.weekday() == i) >= 0.8 * wcount[i] else "-"
                for i in range(7))
        print("window", lo, hi, len(window), flush=True)
    with open(os.path.join(a.out, f"trains-{tag}-2610.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(trains_rows[0].keys()))
        w.writeheader()
        w.writerows(trains_rows)
    with open(os.path.join(a.out, f"stops-{tag}-2610.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["train_id", "part", "number", "name", "seq", "branch", "station",
                                          "arr", "dep", "pass", "platform", "arr2", "dep2", "platform2"])
        w.writeheader()
        w.writerows(stop_rows)
    print("DONE", len(trains_rows), "train-parts,", len(stop_rows), "stop rows", flush=True)


if __name__ == "__main__":
    main()
