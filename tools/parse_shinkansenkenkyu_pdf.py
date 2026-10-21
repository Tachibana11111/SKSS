"""Đọc bảng giờ PDF của shinkansenkenkyu.com (Kyushu, Nishi-Kyushu) thành CSV (giờ từng ga theo từng chuyến).

Lưu ý bản quyền: các PDF ghi "無断転載・無断引用厳禁" (cấm tự ý đăng lại/trích dẫn). Chỉ dùng cá nhân để phân tích;
không đăng lại bảng gốc. Tài liệu chỉ ghi số liệu tổng hợp (thời gian chạy, dừng).
Một trang có thể chứa nhiều khối (mỗi khối bắt đầu bằng hàng "列車番号"), vd. Relay Kamome rồi Kamome.
Chạy:  python -X utf8 tools/parse_shinkansenkenkyu_pdf.py <pdf> <csv ra>
Cần PyMuPDF (pymupdf). Chạy với -I khi đọc file tải về.
"""
import csv
import os
import re
import sys

import pymupdf

SKIP = ("列車番号", "列車名", "車両形式", "両数", "グリーン車", "指定席", "自由席", "備考")


def clean(c):
    return (c or "").replace("\n", " ").strip()


def parse(pdf):
    doc = pymupdf.open(pdf)
    out = []
    for pno, page in enumerate(doc, 1):
        for tno, tab in enumerate(page.find_tables().tables, 1):
            rows = [[clean(c) for c in r] for r in tab.extract()]
            cols, names, series, cars = [], {}, {}, {}
            cur_block, last_label, hno = "", "", 0
            for r in rows:
                if len(r) < 5:
                    continue
                label = r[1]
                if label == "列車番号":  # khối mới: đọc lại các cột
                    hno += 1
                    cols = [(i, v) for i, v in enumerate(r) if re.fullmatch(r"\d{3,4}[A-Z]", v)]
                    names, series, cars = {}, {}, {}
                    last_label = ""
                    continue
                if not cols:
                    continue
                if r[0]:
                    cur_block = r[0]
                if label == "列車名":
                    names = {i: r[i].replace(" ", "") for i, _ in cols if i < len(r)}
                    continue
                if label == "車両形式":
                    series = {i: r[i] for i, _ in cols if i < len(r)}
                    continue
                if label == "両数":
                    cars = {i: r[i] for i, _ in cols if i < len(r)}
                    continue
                kind = r[3] if len(r) > 3 else ""
                if not label and kind in ("着", "発") and last_label:
                    label = last_label  # ô tên ga gộp hai hàng (着/発), vd. Kumamoto
                if label:
                    last_label = label
                if not label or label in SKIP:
                    continue
                for i, num in cols:
                    out.append({
                        "file": os.path.basename(pdf), "page": pno, "table": tno, "header": hno,
                        "number": num, "name": names.get(i, ""), "series": series.get(i, ""),
                        "cars": cars.get(i, ""), "block": cur_block, "row": label, "kind": kind,
                        "value": r[i] if i < len(r) else "",
                    })
    return out


if __name__ == "__main__":
    pdf, dst = sys.argv[1], sys.argv[2]
    rows = parse(pdf)
    with open(dst, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(pdf, len(rows), "cells")
