# Lodash Usage Inventory

## Round 4 — lodash (main package)
Scanned: scripts/, src/, packages/ (excluding node_modules, dist)
Result: NO usages of `require('lodash')` or `from 'lodash'` found in any source/script file.
Action: Removed `"lodash": "^4.17.21"` from root devDependencies (it was listed but never imported).

## Round 5 — lodash sub-packages in packages/server-renderer

### packages/server-renderer/src/template-renderer/parse-template.ts
- Line 1: `const compile = require('lodash.template')`
- Replacement: custom `compile(tmpl)` function using Function constructor + with(data)
  to support arbitrary JS expressions (e.g. `{{{ renderResourceHints() }}}`)
  while applying HTML escaping for `{{ }}` delimiters.

### packages/server-renderer/src/webpack-plugin/client.ts  
- Line 2: `const uniq = require('lodash.uniq')`
- Replacement: `const uniq = <T>(arr: T[]): T[] => [...new Set(arr)]`
  (native Set-based deduplication)
