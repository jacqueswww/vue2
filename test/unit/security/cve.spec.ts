/**
 * CVE regression tests — verify that patched vulnerabilities do not regress.
 *
 * CVE-2024-9506  ReDoS in the Vue 2 HTML parser (this fork's primary fix)
 * CVE-2025-14505 elliptic crypto via webpack→crypto-browserify chain (fixed: webpack 5)
 * CVE-2026-39365 vite 5 path traversal (fixed: vite 6 via override + vitest 3)
 * HIGH-no-patch  lodash.template in server-renderer (fixed: replaced with compile())
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { compile } from 'web/compiler/index'
import { parseTemplate } from 'server/template-renderer/parse-template'

const projectRoot = process.cwd()

// ---------------------------------------------------------------------------
// CVE-2024-9506 — ReDoS in HTML parser
// The old endTag regex used (\s[^>]*)?\s*> which catastrophically backtracks
// when many non-> chars appear after a tag open with no closing >.
// The patched version uses [^>]* (a simple negated class, no backtracking).
// ---------------------------------------------------------------------------
describe('CVE-2024-9506 (HTML parser ReDoS)', () => {
  it('completes in < 1 s on a long malformed end tag (no closing >)', () => {
    // Simulates the attack: </div followed by ~500 spaces and no closing >
    const malicious = '<div>' + '</div' + ' '.repeat(500)
    const start = Date.now()
    try {
      compile(malicious)
    } catch (_) {
      // parse errors are fine; a hang is not
    }
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('completes in < 1 s on deeply-nested component-style tags', () => {
    // Exercises the ncname / qnameCapture regexes which incorporate unicodeRegExp
    const tag = 'my-' + 'x-'.repeat(50) + 'component'
    const malicious = `<${tag}>` + `</${tag}` + '!'.repeat(300)
    const start = Date.now()
    try {
      compile(malicious)
    } catch (_) {}
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('compiles valid templates correctly after the patch', () => {
    const result = compile('<div>{{ message }}</div>')
    expect(result.errors).toHaveLength(0)
    expect(result.render).toContain('message')
  })

  it('handles self-closing tags without hanging', () => {
    const malicious = '<input' + ' a=b'.repeat(200) + ' '
    const start = Date.now()
    try {
      compile(malicious)
    } catch (_) {}
    expect(Date.now() - start).toBeLessThan(1000)
  })
})

// ---------------------------------------------------------------------------
// CVE-2025-14505 — elliptic reachable via webpack→crypto-browserify chain
// Fixed by upgrading server-renderer webpack 4→5; webpack 5 does not
// automatically polyfill node core modules, so the chain is broken.
// We assert the installed webpack version in the server-renderer package is >= 5.
// ---------------------------------------------------------------------------
describe('CVE-2025-14505 (elliptic via webpack crypto-browserify chain)', () => {
  it('server-renderer uses webpack >= 5 (no crypto-browserify polyfill)', () => {
    // Resolve webpack from the server-renderer package directory so we get its
    // direct dependency, not a hoisted ancestor.
    const { createRequire } = require('module')
    const req = createRequire(
      resolve(projectRoot, 'packages/server-renderer/package.json')
    )
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const webpackPkg = req('webpack/package.json')
    const [major] = webpackPkg.version.split('.').map(Number)
    expect(major).toBeGreaterThanOrEqual(5)
  })

  it('crypto-browserify is not reachable from server-renderer webpack dep', () => {
    const { createRequire } = require('module')
    const req = createRequire(
      resolve(projectRoot, 'packages/server-renderer/package.json')
    )
    // webpack 5 does not ship node-libs-browser or crypto-browserify
    expect(() => req('crypto-browserify')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// CVE-2026-39365 — vite 5 path traversal
// Fixed by overriding vite to >= 6.0.0 (vitest 3 supports vite 5|6).
// Assert the vite version resolved for the project is >= 6.
// ---------------------------------------------------------------------------
describe('CVE-2026-39365 (vite 5 path traversal)', () => {
  it('vite resolved for vitest is >= 6.0.0', async () => {
    // Resolve vite from vitest's own require chain (vitest uses it as a peer)
    const { createRequire } = require('module')
    const req = createRequire(require.resolve('vitest/package.json'))
    const vitePkg = req('vite/package.json')
    const [major] = vitePkg.version.split('.').map(Number)
    expect(major).toBeGreaterThanOrEqual(6)
  })
})

// ---------------------------------------------------------------------------
// HIGH (no patch) — lodash.template in server-renderer
// The original code used require('lodash.template') which has a command
// injection CVE with no fix in the 4.x series.
// It was replaced by parse-template.ts compile() — a Function-based
// implementation supporting {{{ raw }}} and {{ escaped }} interpolation.
// ---------------------------------------------------------------------------
describe('lodash.template replacement in server-renderer (HIGH, no patch)', () => {
  it('parseTemplate splits head / neck / tail correctly', () => {
    const tmpl = `<!DOCTYPE html><html><head></head><body><!--vue-ssr-outlet--></body></html>`
    const parsed = parseTemplate(tmpl)
    expect(typeof parsed.head).toBe('function')
    expect(typeof parsed.neck).toBe('function')
    expect(typeof parsed.tail).toBe('function')
  })

  it('compile() renders plain text without modification', () => {
    const tmpl = `<!DOCTYPE html><html><head></head><body><!--vue-ssr-outlet--><p>hello world</p></body></html>`
    const parsed = parseTemplate(tmpl)
    expect(parsed.tail({})).toContain('hello world')
  })

  it('compile() interpolates {{ expr }} with HTML escaping', () => {
    const tmpl = `<html><head></head><body><!--vue-ssr-outlet-->{{ title }}</body></html>`
    const parsed = parseTemplate(tmpl)
    expect(parsed.tail({ title: 'My <App>' })).toContain('My &lt;App&gt;')
  })

  it('compile() renders {{{ rawExpr }}} without escaping', () => {
    const tmpl = `<html><head></head><body><!--vue-ssr-outlet-->{{{ rawHtml }}}</body></html>`
    const parsed = parseTemplate(tmpl)
    expect(parsed.tail({ rawHtml: '<b>bold</b>' })).toContain('<b>bold</b>')
  })

  it('compile() evaluates JS expressions in interpolation', () => {
    const tmpl = `<html><head></head><body><!--vue-ssr-outlet-->{{ count + 1 }}</body></html>`
    const parsed = parseTemplate(tmpl)
    expect(parsed.tail({ count: 41 })).toContain('42')
  })

  it('compile() treats null/undefined as empty string', () => {
    const tmpl = `<html><head></head><body><!--vue-ssr-outlet-->{{ val }}</body></html>`
    const parsed = parseTemplate(tmpl)
    // The compile() function uses with(data), so variables must exist in data.
    // The null/undefined check handles explicitly-nulled properties.
    expect(parsed.tail({ val: null })).not.toContain('null')
    expect(parsed.tail({ val: undefined })).not.toContain('undefined')
    expect(parsed.tail({ val: 0 })).toContain('0')
  })

  it('compile() escapes all XSS-relevant characters in {{ expr }}', () => {
    const tmpl = `<html><head></head><body><!--vue-ssr-outlet-->{{ xss }}</body></html>`
    const parsed = parseTemplate(tmpl)
    const out = parsed.tail({ xss: `"><script>alert(1)</script><"` })
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;')
    expect(out).toContain('&gt;')
    expect(out).toContain('&quot;')
  })
})
