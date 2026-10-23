'use strict'

const MARKER = 'data-related-docs'

function escapeHtml (text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Escape text for use inside an AsciiDoc link macro label or plain paragraph. */
function escapeAdoc (text) {
  return String(text).replace(/\]/g, '\\]').replace(/\{/g, '\\{').replace(/\|/g, '{vbar}')
}

const STYLE = `<style ${MARKER}-style>
.related-docs{--_rd-bg:var(--related-docs-bg,color-mix(in srgb,currentColor 6%,transparent));--_rd-border:var(--related-docs-border,color-mix(in srgb,currentColor 18%,transparent));display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .75rem;margin:var(--related-docs-margin,0 0 1rem);padding:var(--related-docs-padding,.45rem .8rem);border:1px solid var(--_rd-border);border-radius:var(--related-docs-radius,.4rem);background:var(--_rd-bg);color:var(--related-docs-fg,inherit);font-size:var(--related-docs-font-size,.875rem);line-height:1.4}
.related-docs--footer{margin:var(--related-docs-footer-margin,2rem 0 0)}
.related-docs__link{font-weight:600;color:var(--related-docs-link,inherit);text-decoration:underline;text-underline-offset:.15em}
.related-docs__desc{opacity:.85}
.related-docs__lock{font-size:.8em;opacity:.8}
.related-docs-index__login{font-size:.85em;opacity:.85}
@media print{.related-docs{display:none}}
</style>`

/**
 * Build the banner element HTML.
 * @param {'top'|'footer'} slot
 * @param {object} cfg normalized config
 * @param {string} href resolved link target (relative or absolute)
 * @param {object|null} single site when linking directly
 */
function buildElementHtml (slot, cfg, href, single) {
  const p = cfg[slot]
  const label = p.label || (single ? single.name : cfg.label)
  const desc = p.description != null ? p.description : (single && !cfg.description ? single.description : cfg.description)
  const lock = single && single.requiresLogin ? ' <span class="related-docs__lock" title="Requires login">(login required)</span>' : ''
  const ext = /^https?:/.test(href) ? ' rel="noopener"' : ''
  return (
    `<aside class="related-docs related-docs--${slot}" ${MARKER}="${slot}" aria-label="Related documentation sites">` +
    `<a class="related-docs__link" href="${escapeHtml(href)}"${ext}>${escapeHtml(label)}</a>${lock}` +
    (desc ? `<span class="related-docs__desc">${escapeHtml(desc)}</span>` : '') +
    '</aside>'
  )
}

function insertAfterOpenTag (html, re, snippet) {
  const m = re.exec(html)
  if (!m) return null
  const end = html.indexOf('>', m.index) + 1
  return html.slice(0, end) + snippet + html.slice(end)
}

/**
 * Inject top/footer elements + style into composed page HTML. Idempotent.
 * Positions:
 *   top: 'article' (start of <article class="doc">) | 'body' (right after <body>)
 *   footer: 'article' (end of <article class="doc">) | 'site-footer' (start of <footer class="footer">)
 * Falls back to body start / before </body> when the anchor is missing.
 */
function injectIntoHtml (html, { topHtml, footerHtml, topPosition = 'article', footerPosition = 'article' }) {
  if (html.includes(`${MARKER}=`)) return html
  let out = html
  if (topHtml) {
    let next = topPosition === 'article' ? insertAfterOpenTag(out, /<article\b[^>]*class="[^"]*\bdoc\b/i, topHtml) : null
    if (next == null) next = insertAfterOpenTag(out, /<body\b/i, topHtml)
    if (next != null) out = next
  }
  if (footerHtml) {
    let next = null
    if (footerPosition === 'site-footer') next = insertAfterOpenTag(out, /<footer\b[^>]*class="[^"]*\bfooter\b/i, footerHtml)
    if (next == null && footerPosition !== 'body') {
      const i = out.lastIndexOf('</article>')
      if (i !== -1) next = out.slice(0, i) + footerHtml + out.slice(i)
    }
    if (next == null) {
      const i = out.lastIndexOf('</body>')
      if (i !== -1) next = out.slice(0, i) + footerHtml + out.slice(i)
    }
    if (next != null) out = next
  }
  if (out !== html) {
    const h = out.indexOf('</head>')
    out = h !== -1 ? out.slice(0, h) + STYLE + out.slice(h) : STYLE + out
  }
  return out
}

/** Generate the AsciiDoc source of the registry/index page. */
function buildIndexAdoc (cfg) {
  const lines = [`= ${cfg.index.title}`, ':page-related-docs-index: ', ':page-role: related-docs-index', '']
  if (cfg.index.intro) lines.push(escapeAdoc(cfg.index.intro), '')
  const groups = new Map()
  for (const s of cfg.sites) {
    if (!groups.has(s.audienceLabel)) groups.set(s.audienceLabel, [])
    groups.get(s.audienceLabel).push(s)
  }
  lines.push('[cols="2,1,4,1",options="header",role="related-docs-index"]', '|===', '|Site |Audience |What it covers |Access', '')
  for (const [, list] of groups) {
    for (const s of list) {
      const access = s.requiresLogin ? (s.loginNote ? `Login required: ${escapeAdoc(s.loginNote)}` : 'Login required') : 'Public'
      lines.push(`|${s.url}[${escapeAdoc(s.name)}^]`, `|${escapeAdoc(s.audienceLabel)}`, `|${escapeAdoc(s.description || '')}`, `|${access}`, '')
    }
  }
  lines.push('|===', '')
  return lines.join('\n')
}

module.exports = { MARKER, STYLE, buildElementHtml, buildIndexAdoc, escapeAdoc, escapeHtml, injectIntoHtml }
