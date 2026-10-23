'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { normalizeConfig } = require('../lib/config')
const { buildElementHtml, buildIndexAdoc, injectIntoHtml } = require('../lib/render')

const three = normalizeConfig({
  sites: [
    { name: 'Public docs', url: 'https://docs.example.org', audience: 'public' },
    { name: 'Team docs', url: 'https://team.docs.example.org', audience: 'team', requiresLogin: true, loginNote: 'GitHub org membership' },
    { name: 'Partner portal', url: 'https://partners.example.org', audience: 'partners', description: 'APIs [beta] | SLAs' },
  ],
})

test('index adoc lists every site with audience and access', () => {
  const adoc = buildIndexAdoc(three)
  assert.match(adoc, /^= Related docs sites/)
  assert.match(adoc, /\|https:\/\/team\.docs\.example\.org\[Team docs\^\]/)
  assert.match(adoc, /Login required: GitHub org membership/)
  assert.match(adoc, /APIs \[beta\\\] \{vbar\} SLAs/)
  assert.strictEqual((adoc.match(/^\|https?:/gm) || []).length, 3)
})

test('element html escapes and marks slot', () => {
  const html = buildElementHtml('top', { ...three, label: 'A <b>' }, '../docs/related-docs/', null)
  assert.match(html, /data-related-docs="top"/)
  assert.match(html, /A &lt;b&gt;/)
  assert.match(html, /href="\.\.\/docs\/related-docs\/"/)
})

test('single direct link shows login flag', () => {
  const html = buildElementHtml('footer', three, 'https://team', three.sites[1])
  assert.match(html, /login required/)
})

const PAGE = '<html><head><title>x</title></head><body><header></header><main><article class="doc"><h1>T</h1></article></main><footer class="footer">f</footer></body></html>'

test('inject top+footer into article, add style once, idempotent', () => {
  const out = injectIntoHtml(PAGE, { topHtml: '<aside data-related-docs="top">T</aside>', footerHtml: '<aside data-related-docs="footer">F</aside>' })
  assert.match(out, /<article class="doc"><aside data-related-docs="top">/)
  assert.match(out, /F<\/aside><\/article>/)
  assert.strictEqual((out.match(/data-related-docs-style/g) || []).length, 1)
  assert.strictEqual(injectIntoHtml(out, { topHtml: 'x', footerHtml: 'y' }), out)
})

test('site-footer and body positions', () => {
  const out = injectIntoHtml(PAGE, { topHtml: '<i data-related-docs="top"></i>', footerHtml: '<i data-related-docs="footer"></i>', topPosition: 'body', footerPosition: 'site-footer' })
  assert.match(out, /<body><i data-related-docs="top">/)
  assert.match(out, /<footer class="footer"><i data-related-docs="footer">/)
})

test('falls back to body when no article', () => {
  const out = injectIntoHtml('<html><head></head><body><p>x</p></body></html>', { topHtml: '<i data-related-docs="top"></i>', footerHtml: '<i data-related-docs="footer"></i>' })
  assert.match(out, /<body><i data-related-docs="top">/)
  assert.match(out, /<i data-related-docs="footer"><\/i><\/body>/)
})
