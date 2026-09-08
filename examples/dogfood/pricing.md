# Public Price Reference, Not a Gateway Bill

The coordinator retrieved official DeepSeek documentation on 2026-09-08 through its authorized web-search route. No direct public account or model request was tested by that lookup. The source identifies `deepseek-v4-flash` as `DeepSeek-V4-Flash-0731`.

Source: <https://api-docs.deepseek.com/quick_start/pricing/>. USD per million tokens:

| Category | Off-Peak | Peak |
|---|---:|---:|
| Cache-Hit Input | $0.007 | $0.014 |
| Cache-Miss Input | $0.22 | $0.44 |
| Output | $0.66 | $1.32 |

The lookup lists peak hours as 01:00–04:00 and 06:00–10:00 UTC Monday–Friday, with other hours off-peak. Prices and availability can change.

Cache documentation: <https://api-docs.deepseek.com/guides/kv_cache/> identifies prompt cache-hit and cache-miss usage fields. Thinking documentation: <https://api-docs.deepseek.com/guides/thinking_mode/> documents Flash low/high/max effort. The surfaced pricing says total model input/output tokens; it did not separately establish a thinking-token rate or prove that gateway output accounting matches direct billing.

Illustration only: with 227,747 task input tokens treated as cache misses and 20,046 reported output tokens treated as billable output, `input × 0.22 / 1e6 + output × 0.66 / 1e6 = $0.0633337` off-peak. The peak-rate illustration is twice that, `$0.1266674`. This excludes both canaries and all coordinator model work. It does not estimate the actual gateway invoice, whose rates are unknown.

No billing/transport parity or account access follows from these rates. A separate reported reasoning field must not be added again without verifying whether it is already included in output. Zero-valued gateway cost metadata is not free usage.
