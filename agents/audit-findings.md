# Audit Findings Log

Each round records the `pnpm audit` summary after the change is applied.

## Baseline (before any fixes)
- Critical: 5, High: 28, Moderate: 28, Low: 10 (total: 71)

Key critical vulns:
- pbkdf2 (CVE): returns uninitialized memory — path: server-renderer > webpack > crypto-browserify
- sha.js: hash rewind — same path
- form-data: unsafe random boundary — path: jsdom > form-data
- handlebars: JS injection — path: conventional-changelog-cli > handlebars

Key high vulns:
- rollup < 2.80.0: path traversal (direct devDep)
- lodash: code injection (direct devDep, no patch in 4.x)
- lodash.template: command injection (server-renderer dep, no patch)
- braces, cross-spawn, tar-fs, minimatch, serialize-javascript, flatted,
  socket.io-parser, picomatch, ws, immutable: various (transitive)
- vite > rollup@4 < 4.59.0: path traversal (via vitest)

Key moderate vulns:
- esbuild ≤ 0.24.2: CORS bypass (direct devDep)
- postcss < 8.5.10: XSS (direct devDep)
- micromatch, bn.js, brace-expansion, qs, ajv, follow-redirects,
  yaml, uuid, vite < 5.4.21: various (transitive)

Key low vulns:
- tmp, diff, @tootallnate/once: various (transitive)
- elliptic: risky crypto (NO PATCH — to be acknowledged)

---

## Round 1 — CRITICAL overrides (pbkdf2, sha.js, form-data, handlebars)
- Critical: 0, High: 24, Moderate: 26, Low: 9 (total: 59) ✓
- vue2 unit tests: 108 files / 1449 tests — all pass
- bootstrap-vue tests: 164 suites / 1694 tests — all pass

## Round 2 — HIGH: rollup bump to 2.80.x
- Critical: 0, High: 23, Moderate: 26, Low: 9 (total: 58) ✓
- vue2 unit tests: pass | build: pass
- bootstrap-vue tests: 164/164 pass

## Round 3 — HIGH: overrides batch (braces, cross-spawn, tar-fs, minimatch, etc.)
- Critical: 0, High: 3, Moderate: 20, Low: 8 (total: 31) ✓
- Remaining high: lodash (no patch), lodash.template (no patch), +1 TBD
- vue2 unit tests: pass
- bootstrap-vue tests: 164/164 pass

## Round 4 — HIGH: remove lodash (no patch)
- Critical: 0, High: 3, Moderate: 20, Low: 8 (total: 31) — unchanged
- lodash had no usages in source/scripts; removed from devDeps cleanly
- Remaining high: 2x lodash.template (server-renderer, Round 5) + 1x lodash
  transitive via api-extractor (no patch — will ignore after Round 5)
- vue2 unit tests: pass
- bootstrap-vue tests: 164/164 pass

## Round 5 — HIGH: replace lodash.template in server-renderer (no patch)
- Critical: 0, High: 1, Moderate: 20, Low: 8 (total: 29) ✓
- Remaining high: lodash (transitive via api-extractor) — no 4.18.0 exists, will ignore advisory
- lodash.template replaced with inline compile() using Function constructor + with(data) for expression support
- lodash.uniq replaced with [...new Set(arr)]
- vue2 unit tests: 108/108 pass | SSR tests: 154/154 pass
- bootstrap-vue tests: 164/164 pass

## Round 6 — MODERATE: esbuild bump to 0.25.x
- Critical: 0, High: 1, Moderate: 19, Low: 8 (total: 28) ✓
- vue2 unit tests: pass | bootstrap-vue: 164/164 pass

## Round 7 — MODERATE: postcss bump to 8.5.10
- Critical: 0, High: 1, Moderate: 19, Low: 8 (total: 28) — same total (postcss transitive vuln already overridden)
- vue2 unit tests: pass | bootstrap-vue: 164/164 pass

## Round 8 — MODERATE: overrides batch (micromatch, bn.js, qs, ajv, vite, etc.)
- Critical: 0, High: 1, Moderate: 7, Low: 4 (total: 12) ✓
- Note: vite constrained to ">=5.4.21 <6" to stay compatible with vitest@1.6.1
- vue2 unit tests: pass | bootstrap-vue: 164/164 pass

## Round 9 — LOW: overrides batch (tmp, diff, @tootallnate/once)
*(pending)*

## Round 10 — LOW: acknowledge elliptic advisory 1112030 (no patch)
*(pending)*
