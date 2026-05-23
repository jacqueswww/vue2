export type ParsedTemplate = {
  head: (data: any) => string
  neck: (data: any) => string
  tail: (data: any) => string
}

const ESCAPE_RE = /{{([^{][\s\S]+?[^}])}}/g
const INTERPOLATE_RE = /{{{([\s\S]+?)}}}/g

function htmlEscape(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

type TemplateEntry = { index: number; end: number; expr: string; raw: boolean }

function compile(tmpl: string): (data: any) => string {
  const entries: TemplateEntry[] = []

  let m: RegExpExecArray | null
  INTERPOLATE_RE.lastIndex = 0
  while ((m = INTERPOLATE_RE.exec(tmpl)) !== null) {
    entries.push({ index: m.index, end: m.index + m[0].length, expr: m[1].trim(), raw: true })
  }
  ESCAPE_RE.lastIndex = 0
  while ((m = ESCAPE_RE.exec(tmpl)) !== null) {
    entries.push({ index: m.index, end: m.index + m[0].length, expr: m[1].trim(), raw: false })
  }
  // Sort by position; interpolate (raw) entries appear first when starting at same index
  entries.sort((a, b) => a.index - b.index || (b.raw ? 1 : -1))

  let src = "var __o='';\n"
  let last = 0
  for (const e of entries) {
    if (e.index < last) continue // skip entries that overlap a prior match
    src += `__o+=${JSON.stringify(tmpl.slice(last, e.index))};\n`
    last = e.end
    if (e.raw) {
      src += `__o+=(function(){var v=(${e.expr});return v==null?'':v;})();\n`
    } else {
      src += `__o+=(function(){var v=(${e.expr});return v==null?'':__esc(v);})();\n`
    }
  }
  src += `__o+=${JSON.stringify(tmpl.slice(last))};\n`
  src += 'return __o;'

  // eslint-disable-next-line no-new-func
  return new Function('__esc', `return function(data){with(data){${src}}}`)(htmlEscape)
}

export function parseTemplate(
  template: string,
  contentPlaceholder: string = '<!--vue-ssr-outlet-->'
): ParsedTemplate {
  if (typeof template === 'object') {
    return template
  }

  let i = template.indexOf('</head>')
  const j = template.indexOf(contentPlaceholder)

  if (j < 0) {
    throw new Error(`Content placeholder not found in template.`)
  }

  if (i < 0) {
    i = template.indexOf('<body>')
    if (i < 0) {
      i = j
    }
  }

  return {
    head: compile(template.slice(0, i)),
    neck: compile(template.slice(i, j)),
    tail: compile(template.slice(j + contentPlaceholder.length))
  }
}
