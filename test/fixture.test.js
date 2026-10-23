'use strict'
// Full Antora build of test/fixture. Skips when @antora/site-generator is not installed
// or when the default UI bundle cannot be fetched (offline).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

let generateSite
try { generateSite = require('@antora/site-generator') } catch { generateSite = null }

test('fixture Antora build injects element and generates index page', { skip: !generateSite && 'antora not installed', timeout: 120000 }, async (t) => {
  const dir = path.join(__dirname, 'fixture')
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'related-docs-'))
  const cacheDir = path.join(os.tmpdir(), 'related-docs-antora-cache')
  // content source is this repository (url: ../.., start_path: test/fixture/docs), worktree of HEAD
  try {
    await generateSite(['--playbook', path.join(dir, 'antora-playbook.yml'), '--to-dir', out, '--cache-dir', cacheDir, '--quiet'])
  } catch (err) {
    if (/ui-bundle|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(String(err && err.message))) return t.skip('offline: ' + err.message)
    throw err
  }
  const home = fs.readFileSync(path.join(out, 'fixture', 'index.html'), 'utf8')
  assert.match(home, /data-related-docs="top"/)
  assert.match(home, /data-related-docs="footer"/)
  assert.match(home, /href="\.\.\/fixture\/related-docs\/"/)
  const index = fs.readFileSync(path.join(out, 'fixture', 'related-docs', 'index.html'), 'utf8')
  assert.match(index, /team\.docs\.example\.org/)
  assert.match(index, /Partner portal/)
  assert.doesNotMatch(index, /data-related-docs="top"/)
})
