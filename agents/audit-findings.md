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
*(pending)*

## Round 2 — HIGH: rollup bump to 2.80.x
*(pending)*

## Round 3 — HIGH: overrides batch (braces, cross-spawn, tar-fs, minimatch, etc.)
*(pending)*

## Round 4 — HIGH: remove lodash (no patch)
*(pending)*

## Round 5 — HIGH: replace lodash.template in server-renderer (no patch)
*(pending)*

## Round 6 — MODERATE: esbuild bump to 0.25.x
*(pending)*

## Round 7 — MODERATE: postcss bump to 8.5.10
*(pending)*

## Round 8 — MODERATE: overrides batch (micromatch, bn.js, qs, ajv, vite, etc.)
*(pending)*

## Round 9 — LOW: overrides batch (tmp, diff, @tootallnate/once)
*(pending)*

## Round 10 — LOW: acknowledge elliptic advisory 1112030 (no patch)
*(pending)*
