"""Tổng hợp thống kê từ các bảng đã đọc (parsed-*.csv): số chuyến, thời gian chạy giữa ga, thời gian dừng, đổi tàu.

Chỉ in số liệu tổng hợp (không đăng lại bảng gốc).
Chạy:  python -X utf8 -I tools/analyze_pdf_tables.py docs/data/raw-pdf
"""
import csv
import re
import statistics as st
import sys
from collections import Counter, OrderedDict, defaultdict

d = sys.argv[1] if len(sys.argv) > 1 else "docs/data/raw-pdf"
T = re.compile(r"^(\d{1,2}):(\d{2})$")


def tm(s):
    m = T.match(s or "")
    return int(m[1]) * 60 + int(m[2]) if m else None


def load(fn):
    R = list(csv.DictReader(open(f"{d}/{fn}", encoding="utf-8")))
    trains = OrderedDict()
    for r in R:
        t = trains.setdefault((r["file"], r["page"], r["table"], r["header"], r["number"]),
                              {"name": r["name"], "series": r["series"], "cars": r["cars"], "rows": []})
        t["rows"].append(r)
    return trains


def stops_of(t):
    """Danh sách (ga, loại 着/発, phút) theo thứ tự hàng, chỉ giữ ô có giờ."""
    out = []
    for r in t["rows"]:
        m = tm(r["value"])
        if r["kind"] in ("着", "発") and m is not None:
            out.append((r["row"], r["kind"], m, r["block"]))
    return out


def summarize(fn, label):
    trains = load(fn)
    print(f"\n===== {label}: {len(trains)} chuyến =====")
    kinds = Counter(re.sub(r"\d+", "", t["name"]) for t in trains.values())
    print("loại:", dict(kinds))
    print("dòng xe/số toa:", dict(Counter((re.sub(r"\d+", "", t["name"]), t["series"], t["cars"]) for t in trains.values())))
    seg, dw = defaultdict(list), defaultdict(list)
    for t in trains.values():
        k = re.sub(r"\d+", "", t["name"])
        st_ = stops_of(t)
        for (a, ak, am, ab), (b, bk, bm, bb) in zip(st_, st_[1:]):
            if a == b and ak == "着" and bk == "発":
                dw[(k, a)].append(bm - am)
            elif 0 <= bm - am <= 90:  # bỏ khoảng phi lý (ghép nhầm chuyến/cột)
                seg[(k, a, b)].append(bm - am)
    print("-- thời gian dừng (phút): loại, ga: n, min, trung vị, max")
    for (k, s), v in sorted(dw.items()):
        print(f"  {k} {s}: n={len(v)} min={min(v)} med={st.median(v)} max={max(v)}")
    print("-- thời gian chạy giữa ga (phút), từ giờ rời ga trước đến giờ đến ga sau (hoặc giờ rời nếu ga chỉ có 発)")
    for (k, a, b), v in sorted(seg.items(), key=lambda x: (x[0][0], -len(x[1]))):
        if len(v) >= 3:
            print(f"  {k} {a}->{b}: n={len(v)} min={min(v)} med={st.median(v)} max={max(v)}")
    # giờ rời ga đầu theo giờ
    firsts = defaultdict(int)
    for t in trains.values():
        s = stops_of(t)
        if s:
            firsts[s[0][2] // 60] += 1
    print("-- chuyến theo giờ của ga đầu có giờ:", dict(sorted(firsts.items())))
    return trains


if __name__ == "__main__":
    summarize("parsed-kyushu-up.csv", "Kyushu chiều lên (Sakura/Tsubame/Mizuho)")
    summarize("parsed-nishikyushu-down.csv", "Nishi-Kyushu chiều xuống (Kamome + Relay Kamome)")
    summarize("parsed-nishikyushu-up.csv", "Nishi-Kyushu chiều lên (Kamome + Relay Kamome)")
