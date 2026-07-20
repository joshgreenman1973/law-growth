# The growing code

Twenty-five years of legal output at three levels of government: New York City, New York state and the federal government.

**Live:** `index.html` · **Method and caveats:** `methodology.html`

## The finding

Between 2000–04 and 2020–24, comparing period averages:

| | Metric | Change |
|---|---|---|
| New York City | local laws enacted per year | 70 → 146 (**2.09×**) |
| New York state | chapter laws enacted per year | 670 → 704 (**1.05×**) |
| Congress | public laws enacted per year | 257 → 162 (**0.63×**, −37%) |
| Federal regulatory code | pages in the CFR | 138,049 → 194,395 (**1.41×**) |

Lawmaking moved down and sideways: the City Council roughly doubled its output, Albany held flat, and Congress passed more than a third fewer laws. The federal regulatory code grew anyway — because the counts above are *flow* (enacted per year) while a code is *stock* (everything enacted and not repealed), and repeal is rare.

A separate finding: Federal Register pages fell 43% from 2024 to 2025 (106,109 → 60,917), with final-rule pages down 63% while presidential-document pages hit 2,072, the highest in any year since the category table begins in 1976.

## Why not "pages of code"

The original framing — measure the size of each code in pages — is not achievable. There is no historical page or word count of the NYC Administrative Code or the NYCRR; both are published commercially. The one apparent source (Mercatus State RegData) has two New York snapshots whose word count *falls* by 4.6 million between 2017 and 2023, which is a corpus-construction artifact, not deregulation. It was excluded. See `methodology.html`.

Only the Code of Federal Regulations can be measured as stock, and it is labelled as such and shown separately from the flow measures.

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
