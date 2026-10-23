'use strict'

/**
 * Antora extension: point readers at an org's other docs sites.
 *
 * - Generates a registry page (default `<component>::related-docs.adoc`) listing every
 *   associated docs site (name, URL, audience, description, login flag).
 * - Bakes a slim link element at the top and/or bottom of every page (no runtime JS).
 * - `sites: none` is the explicit "this org has no other docs sites" opt-out.
 *
 * Playbook:
 *
 *   antora:
 *     extensions:
 *       - require: '@antora-supplemental/related-docs'
 *         label: Team docs (members only)
 *         sites:
 *           - name: FTN Team Docs
 *             url: https://team.docs.example.com
 *             audience: team
 *             requires_login: true
 */

const fs = require('fs')
const path = require('path')
const { normalizeConfig, pick } = require('./config')
const { buildElementHtml, buildIndexAdoc, injectIntoHtml } = require('./render')

const PKG = '@antora-supplemental/related-docs'

function loadDataFile (file, baseDir) {
  if (!file) return null
  const abs = path.resolve(baseDir || process.cwd(), file)
  const text = fs.readFileSync(abs, 'utf8')
  let data
  if (/\.json$/i.test(abs)) data = JSON.parse(text)
  else data = require('js-yaml').load(text)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.sites)) return data.sites
  throw new Error(`${file}: expected a list of sites or { sites: [...] }`)
}

function pickComponentVersion (contentCatalog, playbook, idx) {
  let name = idx.component
  if (!name && playbook && playbook.site && playbook.site.startPage) {
    const m = /^(?:([^:@]+)@)?([^:]+)::/.exec(playbook.site.startPage)
    if (m) name = m[2]
  }
  const components = contentCatalog.getComponents()
  const component = name ? contentCatalog.getComponent(name) : components[0]
  if (!component) return null
  const version = idx.version != null
    ? component.versions.find((v) => v.version === idx.version)
    : component.latest
  return version ? { component: component.name, version: version.version } : null
}

function register ({ config = {}, playbook }) {
  const logger = this.getLogger(PKG)
  let dataSites = null
  try {
    dataSites = loadDataFile(pick(config, 'dataFile'), playbook && playbook.dir)
  } catch (err) {
    logger.error(`related-docs: could not read dataFile: ${err.message}`)
  }
  const cfg = normalizeConfig(config, { dataSites })
  for (const e of cfg.errors) logger.warn(`related-docs: ${e}`)
  if (cfg.status === 'none') return
  if (cfg.status === 'unconfigured') {
    logger.info("related-docs: no sites configured; element hidden. Set `sites: none` if this org has no other docs sites.")
    return
  }
  const single = cfg.sites.length === 1 && cfg.directLinkWhenSingle ? cfg.sites[0] : null
  let indexPage = null
  let warnedNoTarget = false

  this.on('contentClassified', ({ contentCatalog }) => {
    if (!cfg.index.enabled) return
    const vars = this.getVariables ? this.getVariables() : {}
    const target = pickComponentVersion(contentCatalog, vars.playbook || playbook, cfg.index)
    if (!target) {
      logger.warn('related-docs: no component found for the index page; skipping it')
      return
    }
    const relative = `${cfg.index.path}.adoc`
    const existing = contentCatalog.getById({ ...target, module: cfg.index.module, family: 'page', relative })
    if (existing) {
      logger.info(`related-docs: ${target.component}::${relative} exists in content; using it as the index page`)
      indexPage = existing
      return
    }
    indexPage = contentCatalog.addFile({
      contents: Buffer.from(buildIndexAdoc(cfg)),
      path: relative,
      src: { ...target, module: cfg.index.module, family: 'page', relative, origin: { type: 'generated', url: PKG } },
    })
  })

  this.on('pagesComposed', ({ contentCatalog }) => {
    let count = 0
    for (const page of contentCatalog.getPages((p) => p.out)) {
      if (page === indexPage) continue
      const root = ((page.pub && page.pub.rootPath) || '.').replace(/\/$/, '')
      let href
      if (cfg.linkUrl) href = cfg.linkUrl.startsWith('/') ? root + cfg.linkUrl : cfg.linkUrl
      else if (single) href = single.url
      else if (indexPage && indexPage.pub) href = root + indexPage.pub.url
      else if (cfg.sites.length === 1) href = cfg.sites[0].url
      else {
        if (!warnedNoTarget) logger.warn('related-docs: index page disabled and no linkUrl set; element hidden')
        warnedNoTarget = true
        continue
      }
      const html = page.contents.toString()
      const after = injectIntoHtml(html, {
        topHtml: cfg.top.enabled ? buildElementHtml('top', cfg, href, single) : '',
        footerHtml: cfg.footer.enabled ? buildElementHtml('footer', cfg, href, single) : '',
        topPosition: cfg.top.position,
        footerPosition: cfg.footer.position,
      })
      if (after !== html) {
        page.contents = Buffer.from(after)
        count++
      }
    }
    if (count) logger.info(`related-docs: linked ${count} page(s) to ${single ? single.url : 'the related docs index'}`)
  })
}

module.exports = register
module.exports.register = register
module.exports._internal = { normalizeConfig, buildElementHtml, buildIndexAdoc, injectIntoHtml, pickComponentVersion, loadDataFile }
