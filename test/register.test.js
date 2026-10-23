'use strict'
const test = require('node:test')
const assert = require('node:assert')
const register = require('../lib/index.js')

function fakeContext () {
  const logs = []
  const handlers = {}
  const log = (level) => (msg) => logs.push([level, msg])
  return {
    logs,
    handlers,
    getLogger: () => ({ info: log('info'), warn: log('warn'), error: log('error') }),
    getVariables: () => ({}),
    on (name, fn) { handlers[name] = fn },
  }
}

test('sites: none registers nothing and logs nothing', () => {
  const ctx = fakeContext()
  register.call(ctx, { config: { sites: 'none' } })
  assert.deepStrictEqual(Object.keys(ctx.handlers), [])
  assert.deepStrictEqual(ctx.logs, [])
})

test('missing config registers nothing and logs one info hint', () => {
  const ctx = fakeContext()
  register.call(ctx, { config: {} })
  assert.deepStrictEqual(Object.keys(ctx.handlers), [])
  assert.strictEqual(ctx.logs.length, 1)
  assert.strictEqual(ctx.logs[0][0], 'info')
  assert.match(ctx.logs[0][1], /sites: none/)
})

test('configured sites register both hooks', () => {
  const ctx = fakeContext()
  register.call(ctx, { config: { sites: [{ name: 'a', url: 'https://a' }] } })
  assert.deepStrictEqual(Object.keys(ctx.handlers).sort(), ['contentClassified', 'pagesComposed'])
})

test('register keeps a non-zero arity so Antora passes config', () => {
  assert.ok(register.length >= 1)
})
