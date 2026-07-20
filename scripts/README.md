# Scripts

- `harvest-ny.py` — builds `data/ny-code-size.json`. Fetches every NY law from the
  Open Legislation API at 1 January 2015–2026 via the historical `date=` parameter,
  counts sections and words, and runs the coverage-artifact checks (all-laws vs
  fixed-cohort growth, law count by year, activeDate advancement).
- `check-ny-static.py` — quantifies the laws whose `activeDate` never advances,
  to confirm they are genuinely unamended rather than unversioned.

Both read the API key from the macOS Keychain (`security find-generic-password -s
nysenate-openleg -w`). The key is never printed, logged or written to disk.
Responses are cached to the session scratchpad so re-runs do not refetch.
