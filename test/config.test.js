'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { normalizeConfig } = require('../lib/config')

test('sites: none is an explicit opt-out', () => {
  assert.strictEqual(normalizeConfig({ sites: 'none' }).status, 'none')
  assert.strictEqual(normalizeConfig({ sites: false }).status, 'none')
  assert.strictEqual(normalizeConfig({ sites: [], explicitNone: true }).status, 'none')
  assert.strictEqual(normalizeConfig({ enabled: false, sites: [{ name: 'x', url: 'https://x' }] }).status, 'none')
})

test('missing sites is unconfigured (hidden, hint logged)', () => {
  const c = normalizeConfig({})
  assert.strictEqual(c.status, 'unconfigured')
  assert.deepStrictEqual(c.errors, [])
  assert.strictEqual(normalizeConfig({ sites: [] }).status, 'unconfigured')
})

test('valid sites normalize with defaults', () => {
  const c = normalizeConfig({ sites: [{ name: 'Team', url: 'https://team.example.com', audience: 'Team', requiresLogin: 'yes' }] })
  assert.strictEqual(c.status, 'enabled')
  assert.strictEqual(c.sites[0].audience, 'team')
  assert.strictEqual(c.sites[0].audienceLabel, 'Team')
  assert.strictEqual(c.sites[0].requiresLogin, true)
  assert.strictEqual(c.top.enabled, true)
  assert.strictEqual(c.footer.enabled, true)
  assert.strictEqual(c.index.path, 'related-docs')
})

test('invalid sites are reported and dropped', () => {
  const c = normalizeConfig({ sites: [{ name: '', url: 'ftp://x' }, { name: 'ok', url: '/other/' }] })
  assert.strictEqual(c.sites.length, 1)
  assert.strictEqual(c.errors.length, 2)
})

test('placements accept booleans and objects', () => {
  const c = normalizeConfig({ top: false, footer: { position: 'site-footer', label: 'More docs' }, sites: [{ name: 'a', url: 'https://a' }] })
  assert.strictEqual(c.top.enabled, false)
  assert.strictEqual(c.footer.enabled, true)
  assert.strictEqual(c.footer.position, 'site-footer')
  assert.strictEqual(c.footer.label, 'More docs')
})

test('index: false disables page; path is trimmed', () => {
  assert.strictEqual(normalizeConfig({ index: false }).index.enabled, false)
  assert.strictEqual(normalizeConfig({ index: { path: '/meta/related-docs.adoc' } }).index.path, 'meta/related-docs')
})

test('dataSites merge after inline sites', () => {
  const c = normalizeConfig({ sites: [{ name: 'a', url: 'https://a' }] }, { dataSites: [{ name: 'b', url: 'https://b' }] })
  assert.deepStrictEqual(c.sites.map((s) => s.name), ['a', 'b'])
})

test('accepts snake_case and Antora-lowercased keys', () => {
  const c = normalizeConfig({ direct_link_when_single: true, linkurl: '/x/', sites: [{ name: 'a', url: 'https://a', requires_login: true, loginnote: 'SSO' }] })
  assert.strictEqual(c.directLinkWhenSingle, true)
  assert.strictEqual(c.linkUrl, '/x/')
  assert.strictEqual(c.sites[0].requiresLogin, true)
  assert.strictEqual(c.sites[0].loginNote, 'SSO')
})
