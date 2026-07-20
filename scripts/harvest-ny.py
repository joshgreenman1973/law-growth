#!/usr/bin/env python3
"""
Harvest the size of New York state statutory law at annual snapshots, 2015-2026.

STOCK measure: sections and words of NY Consolidated Laws in force on 1 January
of each year, via the NY Senate Open Legislation API's historical `date=` param.

The API key is read from the macOS Keychain and never written anywhere.
Responses are cached to the scratchpad so re-runs don't refetch.
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error, re
from pathlib import Path

API = "https://legislation.nysenate.gov/api/3"
OUT = Path("/Users/joshgreenman/Experiments/law-growth/data/ny-code-size.json")
CACHE = Path("/private/tmp/claude-501/-Users-joshgreenman-Experiments/"
             "f9de9f92-0135-4539-a4de-4c209c84a135/scratchpad/ny-cache")
YEARS = [f"{y}-01-01" for y in range(2015, 2027)]


def key():
    return subprocess.run(
        ["security", "find-generic-password", "-s", "nysenate-openleg", "-w"],
        capture_output=True, text=True, check=True).stdout.strip()


K = key()


def get(path, params, cache_name, tries=5):
    """GET with cache + backoff. Never logs the key."""
    cf = CACHE / (cache_name + ".json")
    if cf.exists():
        try:
            return json.loads(cf.read_text())
        except Exception:
            cf.unlink()
    qs = "&".join(f"{a}={b}" for a, b in params.items())
    url = f"{API}{path}?{qs}&key={K}"
    safe = f"{path}?{qs}"
    for t in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                d = json.loads(r.read().decode())
            cf.parent.mkdir(parents=True, exist_ok=True)
            cf.write_text(json.dumps(d))
            return d
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and t < tries - 1:
                time.sleep(2 ** t * 2)
                continue
            print(f"  HTTP {e.code} on {safe}", flush=True)
            return None
        except Exception as e:
            if t < tries - 1:
                time.sleep(2 ** t * 2)
                continue
            print(f"  FAIL {type(e).__name__} on {safe}", flush=True)
            return None
    return None


def walk(node, out):
    """Yield every dict node in the law tree."""
    if isinstance(node, dict):
        out.append(node)
        for v in node.values():
            walk(v, out)
    elif isinstance(node, list):
        for v in node:
            walk(v, out)


WORD = re.compile(r"\S+")


def measure(doc):
    """Return (sections, words, activeDate) for one law response."""
    r = (doc or {}).get("result") or {}
    lv = r.get("lawVersion") or {}
    nodes = []
    walk(r, nodes)
    secs = 0
    words = 0
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


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    idx = get("/laws", {"limit": "1000"}, "law-index")
    if not idx:
        print("FATAL: could not list laws")
        sys.exit(1)
    laws = [(i["lawId"], i.get("lawType"), i.get("name"))
            for i in idx["result"]["items"]]
    print(f"{len(laws)} laws in index "
          f"({sum(1 for l in laws if l[1]=='CONSOLIDATED')} consolidated)", flush=True)

    per_year = {}
    active_dates = {}
    law_presence = {}

    for date in YEARS:
        tot_s = tot_w = 0
        present = []
        con_s = con_w = 0
        for lid, ltype, _ in laws:
            d = get(f"/laws/{lid}", {"date": date, "full": "true"},
                    f"{lid}_{date}")
            if not d or not d.get("success"):
                continue
            s, w, ad = measure(d)
            if s == 0:
                continue
            present.append(lid)
            tot_s += s
            tot_w += w
            if ltype == "CONSOLIDATED":
                con_s += s
                con_w += w
            active_dates.setdefault(lid, {})[date] = ad
        per_year[date] = {"laws": len(present), "sections": tot_s, "words": tot_w,
                          "consolidated_sections": con_s, "consolidated_words": con_w}
        law_presence[date] = set(present)
        print(f"  {date}: laws={len(present)} sections={tot_s:,} words={tot_w:,}",
              flush=True)

    # ---- artifact checks ----
    cohort = set.intersection(*law_presence.values()) if law_presence else set()
    cohort_series = {}
    for date in YEARS:
        cs = cw = 0
        for lid in sorted(cohort):
            d = get(f"/laws/{lid}", {"date": date, "full": "true"}, f"{lid}_{date}")
            if not d or not d.get("success"):
                continue
            s, w, _ = measure(d)
            cs += s
            cw += w
        cohort_series[date] = {"sections": cs, "words": cw}
        print(f"  cohort {date}: sections={cs:,} words={cw:,}", flush=True)

    def growth(d, k):
        a, b = d[YEARS[0]][k], d[YEARS[-1]][k]
        return round(b / a, 4) if a else None

    # does activeDate actually advance?
    advancing = stale = 0
    for lid, m in active_dates.items():
        vals = [m.get(y) for y in YEARS if m.get(y)]
        if len(set(vals)) > 1:
            advancing += 1
        else:
            stale += 1

    out = {
        "metric": "Size of New York state statutory law in force, annual snapshots",
        "unit": "sections and words",
        "source_url": "https://legislation.nysenate.gov/api/3/laws",
        "provenance": (
            "GET /api/3/laws/{lawId}?date=YYYY-MM-DD&full=true for every law in "
            "/api/3/laws, at 1 January 2015-2026. Sections counted as tree nodes "
            "with docType=='SECTION', deduplicated by locationId. Words are "
            "whitespace tokens over each section's text field. Key read from "
            "macOS Keychain, never logged. Responses cached; backoff on 429/5xx."
        ),
        "retrieved": "2026-07-20",
        "basis": "annual_snapshot_jan1",
        "artifact_checks": {
            "law_count_by_year": {d: per_year[d]["laws"] for d in YEARS},
            "all_laws_growth_sections": growth(per_year, "sections"),
            "all_laws_growth_words": growth(per_year, "words"),
            "fixed_cohort_size": len(cohort),
            "fixed_cohort_growth_sections": growth(cohort_series, "sections"),
            "fixed_cohort_growth_words": growth(cohort_series, "words"),
            "laws_with_advancing_activeDate": advancing,
            "laws_with_static_activeDate": stale,
        },
        "series": [dict(date=d, **per_year[d],
                        cohort_sections=cohort_series[d]["sections"],
                        cohort_words=cohort_series[d]["words"]) for d in YEARS],
    }
    OUT.write_text(json.dumps(out, indent=1))
    print("\n=== ARTIFACT CHECKS ===")
    print(json.dumps(out["artifact_checks"], indent=1))
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
