"""Phân tích bộ dữ liệu lịch tàu JR East (docs/data/*-weekday-2610.csv).

In ra: dải số hiệu, hướng, thời gian dừng theo ga, thời gian chạy giữa ga, khoảng cách giữa các chuyến.
Tàu ghép: nhánh 1 (đoàn mini-Shinkansen) dùng cột giờ thứ hai (arr2/dep2).
Chạy:  python -X utf8 tools/analyze_timetable.py docs/data
"""
import csv
import re
import statistics as st
import sys
from collections import Counter, defaultdict

d = sys.argv[1] if len(sys.argv) > 1 else "docs/data"
trains = list(csv.DictReader(open(f"{d}/trains-weekday-2610.csv", encoding="utf-8")))
stops = list(csv.DictReader(open(f"{d}/stops-weekday-2610.csv", encoding="utf-8")))

ROMAJI = {"のぞみ": "Nozomi", "ひかり": "Hikari", "こだま": "Kodama", "はやぶさ": "Hayabusa", "やまびこ": "Yamabiko",
          "なすの": "Nasuno", "つばさ": "Tsubasa", "こまち": "Komachi", "とき": "Toki", "たにがわ": "Tanigawa",
          "かがやき": "Kagayaki", "はくたか": "Hakutaka", "あさま": "Asama", "つるぎ": "Tsurugi", "はやて": "Hayate"}


def kind(name):
    k = name.split()[0]
    return ROMAJI.get(k, k)


def tm(s):
    m = re.fullmatch(r"(\d\d):(\d\d)", s or "")
    return int(m[1]) * 60 + int(m[2]) if m else None


info = {(r["train_id"], r["part"]): r for r in trains}
by_train = defaultdict(list)
for r in stops:
    by_train[(r["train_id"], r["part"])].append(r)


def kinds_of(key):
    names = info[key]["name"].split("+")
    k0 = kind(names[0])
    k1 = kind(names[1]) if len(names) > 1 else k0
    return k0, k1


def eff(r, branch):
    """Giờ hiệu lực của dòng ga với nhánh (nhánh 1 dùng cột thứ hai nếu có)."""
    if branch == 1:
        return tm(r["arr2"]) or tm(r["arr"]), tm(r["dep2"]) or tm(r["dep"])
    return tm(r["arr"]), tm(r["dep"])


print("== số chuyến theo loại và hậu tố số hiệu ==")
c = Counter()
for key, r in info.items():
    nums = r["number"].split("+")
    for nm, nu in zip(r["name"].split("+"), nums):
        c[(kind(nm), nu[-1])] += 1
for k, v in sorted(c.items()):
    print(k, v)

print("\n== dải số (3 chữ số cuối) theo loại, chẵn/lẻ ==")
rng = defaultdict(list)
for key, r in info.items():
    for nm, nu in zip(r["name"].split("+"), r["number"].split("+")):
        m = re.match(r"(\d+)", nu)
        if m:
            rng[kind(nm)].append(int(m[1]))
for k, v in sorted(rng.items()):
    odd = sorted(x for x in v if x % 2)
    even = sorted(x for x in v if not x % 2)
    print(k, "lẻ", (odd[0], odd[-1], len(odd)) if odd else None, "chẵn", (even[0], even[-1], len(even)) if even else None)

print("\n== hướng (xuống = xuất phát Tokyo; lên = kết thúc Tokyo) ==")
dirs = Counter()
for key, rows in by_train.items():
    a, b = rows[0]["station"], rows[-1]["station"]
    dirs[(kinds_of(key)[0], "xuống" if a == "東京" else "lên" if b == "東京" else "khác")] += 1
for k, v in sorted(dirs.items()):
    print(k, v)

dwell = defaultdict(list)
seg = defaultdict(list)
for key, rows in by_train.items():
    k0, k1 = kinds_of(key)
    prev = {0: None, 1: None}
    for i, r in enumerate(rows):
        br = int(r["branch"])
        k = k1 if br == 1 else k0
        a, dp = eff(r, br)
        if a is not None and dp is not None:
            dwell[(k, r["station"])].append(dp - a)
        # chặng chạy: từ ga trước (cùng nhánh) đến ga này
        if prev[br] is not None and a is not None:
            pst, pdep = prev[br]
            if a >= pdep:
                seg[(k, pst, r["station"])].append(a - pdep)
        if dp is not None:
            prev[br] = (r["station"], dp)
        # nhánh 1 bắt đầu từ cột thứ hai của ga tách
        if r["dep2"] and br == 0:
            prev[1] = (r["station"], tm(r["dep2"]))

print("\n== thời gian dừng (phút) theo loại và ga: n, min, trung vị, max (chỉ n>=6) ==")
for (k, s), v in sorted(dwell.items(), key=lambda x: (x[0][0], -len(x[1]))):
    if len(v) >= 6:
        print(f"{k:10s} {s:10s} n={len(v):3d} min={min(v)} med={st.median(v)} max={max(v)}")

print("\n== thời gian chạy giữa ga (phút): n, min, trung vị, max (chỉ n>=6) ==")
for (k, a, b), v in sorted(seg.items(), key=lambda x: (x[0][0], -len(x[1]))):
    if len(v) >= 6:
        print(f"{k:10s} {a}->{b} n={len(v):3d} min={min(v)} med={st.median(v)} max={max(v)}")

print("\n== sân ga hay dùng (top 4 mỗi ga, 28 ga đông nhất) ==")
pf = defaultdict(Counter)
for r in stops:
    if r["platform"]:
        pf[r["station"]][r["platform"]] += 1
for s_, cn in sorted(pf.items(), key=lambda x: -sum(x[1].values()))[:28]:
    print(s_, sum(cn.values()), cn.most_common(4))

print("\n== khoảng cách giữa các chuyến liên tiếp (định kỳ, ngày thường) tại ga, theo hướng ==")
for station in ["品川", "大宮", "名古屋", "京都", "新大阪", "仙台", "盛岡"]:
    for direction in ("xuống", "lên"):
        ts = []
        for key, rows in by_train.items():
            first, last = rows[0]["station"], rows[-1]["station"]
            dn = (first == "東京") if station != "新大阪" else (first == "東京")
            if direction == "xuống" and first != "東京":
                continue
            if direction == "lên" and last != "東京":
                continue
            for r in rows:
                if r["station"] == station:
                    a, dp = eff(r, int(r["branch"]))
                    t = dp if dp is not None else a
                    if t is not None:
                        ts.append(t)
        ts.sort()
        if len(ts) > 5:
            gaps = [b - a for a, b in zip(ts, ts[1:])]
            cg = Counter(gaps)
            print(f"{station} {direction}: n={len(ts)} min={min(gaps)} " + " ".join(f"{g}:{cg[g]}" for g in sorted(cg)[:8]))
