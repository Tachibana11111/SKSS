"""Lấy lịch một ngày thật của các chuyến Shinkansen qua ga Shin-Osaka từ JRおでかけネット (JR West).

Ga Shin-Osaka (mã 2815002): 001 = chiều xuống (Okayama/Hakata/Kagoshima), 002 = chiều lên (Kyoto/Tokyo).
Trang liệt kê các chuyến chạy đúng ngày được chọn; mỗi chuyến có trang chi tiết với giờ từng ga (kể cả ga qua).
Đọc có kiểm soát: 1 yêu cầu mỗi `--delay` giây, lưu đệm HTML. robots.txt cho phép; dữ liệu có bản quyền JR West
và Kotsu Shimbunsha, chỉ dùng cá nhân cho game, không tái phân phối.

Chạy:  python -X utf8 tools/crawl_jrwest.py --cache <thư mục đệm> --out docs/data --date 20261020
"""
import argparse
import csv
import html
import os
import re
import sys
import time
import urllib.request

BASE = "https://timetable.jr-odekake.net"
UA = {"User-Agent": "Mozilla/5.0 (personal hobby project; low rate)"}


def get(url, cache, delay):
    path = os.path.join(cache, re.sub(r"[^A-Za-z0-9]+", "_", url) + ".html")
    if os.path.exists(path):
        return open(path, encoding="utf-8").read()
    for attempt in range(3):
        try:
            s = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8", "replace")
            open(path, "w", encoding="utf-8").write(s)
            time.sleep(delay)
            return s
        except Exception as e:  # noqa: BLE001
            print("retry", url, e, file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    return ""


def strip(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def parse_station(s):
    rows = []
    for tr in re.finditer(r'<tr class="body-row"><td class="hour">(\d+)</td>(.*?)</tr>', s, re.S):
        hour = int(tr.group(1))
        for it in re.finditer(r'<div class="minute-item">(.*?)</a></div>', tr.group(2), re.S):
            b = it.group(1)
            href = re.search(r'href="(/train-timetable/(\d+)\?date=\d+)"', b)
            if not href:
                continue
            minute = re.search(r'<span class="[^"]*minute[^"]*">(\d+)</span>', b)
            typ = strip(re.search(r'<span class="train-type">(.*?)</span></div>', b, re.S).group(1)) if 'train-type' in b else ""
            dest = re.search(r'<span class="destination">([^<]*)</span>', b)
            plat = re.search(r'<span class="platform_number">([^<]*)</span>', b)
            rows.append({"train_id": href.group(2), "href": href.group(1), "hour": hour,
                         "minute": minute.group(1) if minute else "", "type": typ,
                         "dest": dest.group(1) if dest else "", "platform": plat.group(1) if plat else "",
                         "diamond": "◆" if "◆" in b else ""})
    return rows


def parse_train(s):
    name = re.search(r'<div class="route-name"><p>(.*?)</p>', s, re.S)
    stops = []
    for tr in re.finditer(r'<tr><td class="cell-fixed">([^<]*)</td><td class="text">(.*?)</td><td>([^<]*)</td></tr>', s, re.S):
        st, cell, plat = strip(tr.group(1)), tr.group(2), strip(tr.group(3))
        times = re.findall(r'(\d\d:\d\d)<span class="destination">(着|発)</span>', cell)
        arr = next((t for t, k in times if k == "着"), "")
        dep = next((t for t, k in times if k == "発"), "")
        passed = "レ" in strip(cell) and not times
        stops.append({"station": st, "arr": arr, "dep": dep, "pass": "Y" if passed else "", "platform": plat})
    return strip(name.group(1)) if name else "", stops


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--date", default="20261020")
    ap.add_argument("--delay", type=float, default=1.2)
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)

    lists = []
    for direction, label in (("001", "xuong"), ("002", "len")):
        s = get(f"{BASE}/station-timetable/2815002{direction}?date={a.date}", a.cache, a.delay)
        es = parse_station(s)
        for e in es:
            e["direction"] = label
        print("Shin-Osaka", label, len(es), flush=True)
        lists += es
    with open(os.path.join(a.out, f"jrwest-shinosaka-list-{a.date}.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["direction", "hour", "minute", "type", "dest", "platform", "diamond", "train_id"])
        w.writeheader()
        for e in lists:
            w.writerow({k: e[k] for k in w.fieldnames})

    seen, todo = set(), []
    for e in lists:
        if e["train_id"] not in seen:
            seen.add(e["train_id"])
            todo.append(e)
    print("train pages:", len(todo), flush=True)
    trains, stops = [], []
    for n, e in enumerate(todo, 1):
        s = get(f"{BASE}/train-timetable/{e['train_id']}?date={a.date}", a.cache, a.delay)
        if not s:
            print("FAILED", e["train_id"], flush=True)
            continue
        name, rows = parse_train(s)
        served = [r for r in rows if not r["pass"]]
        trains.append({"train_id": e["train_id"], "direction": e["direction"], "name": name,
                       "from": served[0]["station"] if served else "", "to": served[-1]["station"] if served else "",
                       "n_stops": len(served), "n_pass": len(rows) - len(served)})
        for i, r in enumerate(rows, 1):
            stops.append({"train_id": e["train_id"], "seq": i, **r})
        if n % 25 == 0:
            print(f"{n}/{len(todo)}", flush=True)
    for fn, rows in ((f"jrwest-trains-{a.date}.csv", trains), (f"jrwest-stops-{a.date}.csv", stops)):
        with open(os.path.join(a.out, fn), "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    print("DONE", len(trains), "trains,", len(stops), "stop rows", flush=True)


if __name__ == "__main__":
    main()
