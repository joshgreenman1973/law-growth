#!/usr/bin/env python3
"""Quantify the NY laws whose activeDate never advances across 2015-2026.

A law that returns the same activeDate for every requested date either (a) genuinely
was not amended in 11 years, or (b) is not really versioned by the API. Either way we
need to know how much of the corpus they represent before trusting the trend.
"""
import json, re, subprocess
from pathlib import Path

CACHE = Path("/private/tmp/claude-501/-Users-joshgreenman-Experiments/"
             "f9de9f92-0135-4539-a4de-4c209c84a135/scratchpad/ny-cache")
YEARS = [f"{y}-01-01" for y in range(2015, 2027)]
WORD = re.compile(r"\S+")


def walk(node, out):
    if isinstance(node, dict):
        out.append(node)
        for v in node.values():
            walk(v, out)
    elif isinstance(node, list):
        for v in node:
            walk(v, out)


def measure(doc):
    r = (doc or {}).get("result") or {}
    lv = r.get("lawVersion") or {}
    nodes = []
    walk(r, nodes)
    secs = words = 0
    seen = set()
    for n in nodes:
        if n.get("docType") != "SECTION":
            continue
        did = n.get("locationId") or n.get("docLevelId") or id(n)
        if did in seen:
            continue
        seen.add(did)
        secs += 1
        t = n.get("text")
        if isinstance(t, str):
            words += len(WORD.findall(t))
    return secs, words, lv.get("activeDate")


idx = json.loads((CACHE / "law-index.json").read_text())
laws = {i["lawId"]: (i.get("lawType"), i.get("name")) for i in idx["result"]["items"]}

static, advancing = [], []
for lid in laws:
    dates, sizes = [], {}
    for y in YEARS:
        f = CACHE / f"{lid}_{y}.json"
        if not f.exists():
            continue
        try:
            s, w, ad = measure(json.loads(f.read_text()))
        except Exception:
            continue
        if s == 0:
            continue
        dates.append(ad)
        sizes[y] = w
    if not dates:
        continue
    (static if len(set(dates)) == 1 else advancing).append((lid, sizes))

def total(group, y):
    return sum(s.get(y, 0) for _, s in group)

st15, st26 = total(static, YEARS[0]), total(static, YEARS[-1])
ad15, ad26 = total(advancing, YEARS[0]), total(advancing, YEARS[-1])

print(f"STATIC-activeDate laws:    {len(static):>3}")
print(f"ADVANCING-activeDate laws: {len(advancing):>3}")
print()
print(f"  static words 2015 {st15:>12,}  2026 {st26:>12,}  "
      f"growth {st26/st15 if st15 else 0:.4f}")
print(f"  advanc words 2015 {ad15:>12,}  2026 {ad26:>12,}  "
      f"growth {ad26/ad15 if ad15 else 0:.4f}")
print()
print(f"  static share of corpus (2026): {100*st26/(st26+ad26):.2f}%")
print()
print("  static laws, largest first:")
for lid, s in sorted(static, key=lambda t: -t[1].get(YEARS[-1], 0))[:12]:
    lt, nm = laws.get(lid, ("?", "?"))
    print(f"    {lid:6} {s.get(YEARS[-1],0):>9,} words  {lt:14} {nm[:44]}")
