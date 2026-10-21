"""Phân tích bổ sung: chữ số nghìn của số hiệu JR East, thời gian chiếm sân ga khi quay đầu.

Chiếm sân = từ lúc tàu kết thúc đến sân X đến lúc chuyến kế tiếp rời chính sân X. Đây là cận dưới của thời gian
quay đầu (không biết đoàn tàu nào nối với chuyến nào, vì lịch vận dụng đoàn tàu không công khai).
Chạy:  python -X utf8 tools/analyze_extra.py docs/data
"""
import csv
import re
import statistics as st
import sys
import unicodedata
from collections import Counter, defaultdict

d = sys.argv[1] if len(sys.argv) > 1 else "docs/data"


def tm(s):
    m = re.fullmatch(r"(\d\d):(\d\d)", s or "")
    return int(m[1]) * 60 + int(m[2]) if m else None


def pf(s):
    return unicodedata.normalize("NFKC", s or "").strip()


# ---------- JR East ----------
trains = {(r["train_id"], r["part"]): r for r in csv.DictReader(open(f"{d}/trains-weekday-2610.csv", encoding="utf-8"))}
stops = defaultdict(list)
for r in csv.DictReader(open(f"{d}/stops-weekday-2610.csv", encoding="utf-8")):
    stops[(r["train_id"], r["part"])].append(r)

print("== Chữ số nghìn của số hiệu (JR East), theo loại ==")
c = defaultdict(Counter)
for key, t in trains.items():
    for nm, nu in zip(t["name"].split("+"), t["number"].split("+")):
        m = re.match(r"\d+", nu)
        if m and len(m.group(0)) == 4:
            c[nm.split()[0]][m.group(0)[0]] += 1
for k, v in sorted(c.items()):
    print(k, dict(v))

print("\n== Ga Kurikoma-Kogen: tàu 4xxx có dừng không? ==")
res = Counter()
for key, t in trains.items():
    nu = t["number"].split("+")[0]
    m = re.match(r"\d+", nu)
    if not m or not (t["name"].startswith("はやぶさ") or t["name"].startswith("やまびこ")):
        continue
    stop_k = any(r["station"] == "くりこま高原" and (r["arr"] or r["dep"]) for r in stops[key])
    th = m.group(0)[0] if len(m.group(0)) == 4 else "-"
    res[(th, "dừng" if stop_k else "không dừng")] += 1
for k, v in sorted(res.items()):
    print(k, v)

print("\n== Mẫu ngày chạy theo chữ số nghìn ==")
dp = defaultdict(Counter)
for key, t in trains.items():
    nu = t["number"].split("+")[0]
    m = re.match(r"\d+", nu)
    th = m.group(0)[0] if m and len(m.group(0)) == 4 else "-"
    dp[th][t["dow_pattern_MonSun"]] += 1
for k, v in sorted(dp.items()):
    print(k, dict(v.most_common(4)))

# ---------- chiếm sân ----------
arr, dep = defaultdict(list), defaultdict(list)  # (ga, sân) -> [phút]


def add_east(station_en, jp, tokaido_range=None):
    for key, rows in stops.items():
        t = trains[key]
        first, last = rows[0], rows[-1]
        if last["station"] == jp and tm(last["arr"]) is not None:
            arr[(station_en, pf(last["platform"]))].append(tm(last["arr"]))
        if first["station"] == jp and tm(first["dep"]) is not None:
            dep[(station_en, pf(first["platform"]))].append(tm(first["dep"]))


add_east("Tokyo", "東京")
add_east("Morioka", "盛岡")
add_east("Shin-Osaka", "新大阪")  # chỉ phần tàu kết thúc ở Shin-Osaka (JR East); chuyến xuất phát lấy từ JR West
add_east("Hakata", "博多")

# ---------- JR West (một ngày thật) ----------
wt = {r["train_id"]: r for r in csv.DictReader(open(f"{d}/jrwest-trains-20261020.csv", encoding="utf-8"))}
ws = defaultdict(list)
for r in csv.DictReader(open(f"{d}/jrwest-stops-20261020.csv", encoding="utf-8")):
    ws[r["train_id"]].append(r)
for tid, rows in ws.items():
    served = [r for r in rows if not r["pass"]]
    if not served:
        continue
    first = served[0]
    if first["station"] == "新大阪" and tm(first["dep"]) is not None:
        dep[("Shin-Osaka (JR West)", pf(first["platform"]))].append(tm(first["dep"]))
    if first["station"] == "博多" and tm(first["dep"]) is not None:
        dep[("Hakata (JR West)", pf(first["platform"]))].append(tm(first["dep"]))

# ghép: arr của JR East với dep của (JR East hoặc JR West) cùng ga
pairs = [("Tokyo", "Tokyo"), ("Morioka", "Morioka"), ("Shin-Osaka", "Shin-Osaka (JR West)"), ("Hakata", "Hakata (JR West)")]
print("\n== Chiếm sân khi quay đầu: từ tàu đến (kết thúc) đến chuyến kế tiếp rời cùng sân (phút) ==")
for a_name, d_name in pairs:
    plats = sorted({p for (s, p) in arr if s == a_name})
    allg = []
    for p in plats:
        gaps = []
        deps = sorted(dep.get((d_name, p), []))
        for a in sorted(arr[(a_name, p)]):
            nxt = [x for x in deps if x >= a]
            if nxt and nxt[0] - a <= 90:
                gaps.append(nxt[0] - a)
        if len(gaps) >= (4 if a_name == "Tokyo" else 1):
            q = sorted(gaps)
            print(f"{a_name:11s} sân {p:>3s}: n={len(gaps):3d} min={q[0]:2d} p10={q[len(q)//10]:2d} trung vị={st.median(gaps):4.1f} p90={q[(len(q)*9)//10]:2d}")
            allg += gaps
    if allg:
        q = sorted(allg)
        print(f"{a_name:11s} TẤT CẢ: n={len(allg)} min={q[0]} p10={q[len(q)//10]} trung vị={st.median(allg)}")
