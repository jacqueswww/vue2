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
- Critical: 0, High: 1, Moderate: 7, Low: 1 (total: 9) ✓
- vue2 unit tests: pass | bootstrap-vue: 164/164 pass

## Round 10 — Final fixes: lodash override + compiler-sfc postcss + CVE ignores
- `lodash: >=4.18.0` override — lodash 4.18.1 now exists and was installed ✓
- `ajv: >=6.14.0 <7` — constrained to avoid ajv 8.x breaking API change ✓
- `vite>esbuild: >=0.25.0` scoped override — fixes esbuild in vite dep tree ✓
- `packages/compiler-sfc` postcss bumped to ^8.5.10 ✓
- pnpm.auditConfig.ignoreCves: CVE-2025-14505 (elliptic, no patch) + CVE-2026-39365 (vite5 path traversal, only fixed in vite 6+)
- .npmrc: audit-level=high so pnpm audit exits 0

State: Critical: 0, High: 0, Moderate: 1*, Low: 1* (total: 2 — both acknowledged via ignoreCves)

## Round 11 — Replace ignoreCves with actual fixes (vitest 3.x + webpack 5)

- Remove pnpm.auditConfig.ignoreCves and .npmrc audit-level=high
- **CVE-2026-39365 (vite5 path traversal)**: upgrade vitest ^1→^3.2.4 (supports vite 5|6),
  change vite override from `>=5.4.21 <6` to `>=6.0.0 <7` — vitest now uses vite 6
- **CVE-2025-14505 (elliptic)**: upgrade server-renderer webpack 4→5 (drops node-libs-browser
  → crypto-browserify → elliptic chain); replace memory-fs with memfs in tests
- Webpack 5 compat fixes:
  - `Webpack4StyleChunkIdsPlugin`: named chunks keep string IDs, async chunks get numeric
    IDs starting from 0 (matches webpack 4 output format)
  - `chunk.auxiliaryFiles` in VueSSRClientPlugin: asset/resource files are now linked
    to owning chunk in client manifest (CSS preload+stylesheet restored)
  - `filenameRE` in source-map-support.ts: handle webpack 5 anonymous stack frames
    without parentheses
- Remove vite>esbuild scoped override (vite 6 ships with compatible esbuild)

Final state: **pnpm audit → No known vulnerabilities found** (0 total, no ignores)

- vue2 unit tests: 108/108 pass | SSR tests: 154/154 pass
- bootstrap-vue tests: 164/164 pass

## Bootstrap-vue dependency fixes (applied to /tmp/bootstrap-vue dev branch)

Changes committed locally (cannot push — proxy only authorized for vue2 repo):
- Bump direct devDeps: marked ^2→^4.0.10, rollup ^2.47→^2.80.0, lodash ^4.17→^4.18.0
- Remove vue-server-renderer (unused devDep; carrying lodash.template HIGH vuln)
- Add yarn resolutions for 35 transitive vuln packages (all critical/high)
- Remaining 14 HIGH: all in docs devDeps (nuxt, codesandbox, @nuxtjs/pwa) with no patch
- improved-yarn-audit --ignore-dev-deps passes with 0 vulnerabilities
- Patch saved at agents/bootstrap-vue-audit-fix.patch (apply to jacqueswww/bootstrap-vue dev branch)
