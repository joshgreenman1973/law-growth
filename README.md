# The growing code

How much law is on the books, and how much more than there used to be — measured directly, at the federal, New York state and New York City levels.

**Live:** https://joshgreenman1973.github.io/law-growth/ · **Method and caveats:** `methodology.html`

## The finding

**Stock** — the size of the law in force:

| | | |
|---|---|---|
| US Code, words | 1.9M (1926) → 47.4M (2023) | **24.8×** |
| US Code, words | 32.5M (2000) → 47.4M (2023) | **1.46×** |
| US Code, pages | 36,480 (2000) → 53,380 (2024) | **1.46×** |
| CFR pages | 138,049 (2000) → 194,395 (2024) | **1.41×** |

**Flow** — laws enacted per year, 2000–04 against 2020–24 averages:

| | | |
|---|---|---|
| Congress, public laws | 257 → 162/yr | **0.63×** |
| New York City local laws | 70 → 146/yr | **2.09×** |
| New York state chapter laws | 670 → 704/yr | **1.05×** |

Federal law on the books grew ~46% since 2000 while Congress enacted 37% fewer laws per year. Stock and flow are not convertible: most laws amend laws that already exist, so counting enactments says little about the size of the corpus. The two US Code measures are independent (words from a research dataset, pages from government publication metadata) and agree at r = 0.9945 on levels, finishing at 146.1 and 146.3 indexed to 2000.

Stock is not a ratchet — the CFR shrank in 15 of the 74 years since 1950, most sharply in 1996 (−6,074 pages) and 1985 (−5,895).

## Why you measure the code, not the enactments

A statute that rewrites 40 sections is one enactment; so is one that repeals a chapter. But a *code* is the consolidated text with every amendment already applied, so comparing it at two dates nets amendments out automatically. The binding constraint is therefore archival, not conceptual — did anyone keep a machine-readable copy?

| Corpus | Snapshots from |
|---|---|
| US Code | 1926 |
| Code of Federal Regulations | 1950 |
| NY Consolidated Laws | Oct 2014 (API key required) |
| NYC Administrative Code | 2022 (Internet Archive copies of a publisher file) |
| NYCRR | never (Westlaw-licensed) |

## A measurement that was discarded

Parsing archived NYC Administrative Code XML showed 9,656 → 12,206 sections in four years (+26%). It is not real. Sections, words, chapters and the publisher's *file count* all grew ~1.25×. The decisive evidence: the earliest local law in the unconsolidated-laws appendix is 2015 in the June 2022 snapshot and 1985 in every snapshot after — American Legal backfilled 30 years of local laws in one step, and 1,332 laws already in force in 2022 appear as new sections.

Attribution: 52% publisher backfill, 17% unnumbered technical material, at most 30% real enactment. A restricted subset (numbered sections only) gives +7.8% over four years with ~11% residual contamination. Reported in the methodology, not plotted.

## Structure

```
index.html          the story
methodology.html    sources, queries, validation, failed checks
styles.css
app.js              hand-rolled SVG charts, no libraries
data/
  data.json                          combined bundle the page reads
  nyc-local-laws.json                1998–2024
  nys-chapter-laws.json              1995–2025
  federal-public-laws.json           1995–2026
  federal-register-pages.json        1976–2026
  federal-register-categories.json   1976–2026
  federal-register-documents.json    2000–2026 (collected, not charted)
  cfr-pages.json                     1950–2024
  us-code-size.json                  1926–2023, words (STOCK)
  us-code-pages-govinfo.json         1994–2024, pages (STOCK, independent)
  nyc-code-size.json                 2022–2026, NOT usable as a series — see reason field
```

Each source file carries `provenance` (the exact query or URL) and `notes` (caveats) alongside its series. `data/data.json` is derived from the others and adds nothing but the 2000-indexed values.

## Sources

- NYC Open Data, City Council Legislation — dataset `6ctv-n46c`
- NYS Legislative Bill Drafting Commission chapter lists — `public.leginfo.state.ny.us`
- GovInfo PLAW collection sitemaps
- Office of the Federal Register publication statistics
- GWU Regulatory Studies Center, RegStats

## Gotchas worth keeping

- `6ctv-n46c` uses the literal string `"NA"`, not `NULL`, for unenacted bills. `IS NOT NULL` alone lets them through.
- The Federal Register statistics page returns an **empty body** to a default curl user-agent. Use a browser UA and check for zero-length responses.
- The Federal Register API caps a query's reported `count` at 10,000. A whole-year query returns exactly `10000` — the cap, not the answer. Sum monthly queries.
- Senate "Résumé of Congressional Activity" files before 2009 return HTTP 200 with an HTML soft-404 body that is not a PDF.
- The NYC Legistar API now requires a token (`403 Token is required`); guides describing it as keyless are stale.
- The GWU CFR CSV URL is date-stamped and changes on update — scrape the link, don't hardcode it.

Data retrieved July 19, 2026. Built with AI assistance (Claude); no human editor has reviewed it.
