'use strict'

/**
 * Normalize related-docs playbook config.
 *
 * Shapes accepted for `sites`:
 *   - 'none' (or false)       explicit opt-out: no element, no index page, no log
 *   - [] with explicitNone    same as 'none'
 *   - array of site objects   { name, url, audience?, description?, requiresLogin?, loginNote? }
 *   - missing / []            "not configured": hide everything, log one info hint
 */

const AUDIENCES = ['public', 'team', 'partners', 'customers', 'internal', 'other']

const DEFAULTS = {
  label: 'Related docs sites',
  description: '',
  directLinkWhenSingle: false,
  top: { enabled: true, position: 'article', label: null, description: null },
  footer: { enabled: true, position: 'article', label: null, description: null },
  index: {
    enabled: true,
    component: null,
    version: null,
    module: 'ROOT',
    path: 'related-docs',
    title: 'Related docs sites',
    intro: 'This organization publishes more than one documentation site. Pick the one that matches what you need.',
  },
}

/** Read a key in camelCase, snake_case, or the lowercased form Antora produces from camelCase YAML. */
function pick (obj, key) {
  if (!obj || typeof obj !== 'object') return undefined
  if (obj[key] !== undefined) return obj[key]
  const snake = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
  if (obj[snake] !== undefined) return obj[snake]
  return obj[key.toLowerCase()]
}

function toBool (value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  const s = String(value).trim().toLowerCase()
  if (['false', 'no', 'off', '0'].includes(s)) return false
  if (['true', 'yes', 'on', '1'].includes(s)) return true
  return fallback
}

function placement (raw, base) {
  if (raw === undefined || raw === null) return { ...base }
  if (typeof raw !== 'object') return { ...base, enabled: toBool(raw, base.enabled) }
  const position = raw.position === 'site-footer' || raw.position === 'body' ? raw.position : base.position
  return {
    enabled: toBool(raw.enabled, true),
    position,
    label: raw.label != null ? String(raw.label) : null,
    description: raw.description != null ? String(raw.description) : null,
  }
}

function normalizeSite (raw, i, errors) {
  if (!raw || typeof raw !== 'object') {
    errors.push(`sites[${i}] must be an object`)
    return null
  }
  const name = raw.name != null ? String(raw.name).trim() : ''
  const url = raw.url != null ? String(raw.url).trim() : ''
  if (!name) errors.push(`sites[${i}].name is required`)
  if (!/^(https?:\/\/|\/)/.test(url)) errors.push(`sites[${i}].url must be absolute (http/https) or root-relative`)
  if (!name || !/^(https?:\/\/|\/)/.test(url)) return null
  let audience = raw.audience != null ? String(raw.audience).trim().toLowerCase() : 'other'
  if (!audience) audience = 'other'
  const requiresLogin = toBool(pick(raw, 'requiresLogin'), false)
  return {
    name,
    url,
    audience,
    audienceLabel: pick(raw, 'audienceLabel') != null ? String(pick(raw, 'audienceLabel')) : audience.charAt(0).toUpperCase() + audience.slice(1),
    description: raw.description != null ? String(raw.description).trim() : '',
    requiresLogin,
    loginNote: pick(raw, 'loginNote') != null ? String(pick(raw, 'loginNote')).trim() : '',
  }
}

/**
 * @param {object} config extension config from the playbook
 * @param {object} [opts] { dataSites } sites loaded from dataFile (merged after inline sites)
 * @returns {{ status: 'enabled'|'none'|'unconfigured', sites: object[], errors: string[], ...}}
 */
function normalizeConfig (config = {}, opts = {}) {
  const errors = []
  const rawSites = config.sites
  const explicitNone =
    rawSites === 'none' || rawSites === false || toBool(pick(config, 'explicitNone'), false) || config.enabled === false
  const base = {
    label: config.label != null ? String(config.label) : DEFAULTS.label,
    description: config.description != null ? String(config.description) : DEFAULTS.description,
    directLinkWhenSingle: toBool(pick(config, 'directLinkWhenSingle'), DEFAULTS.directLinkWhenSingle),
    top: placement(config.top, DEFAULTS.top),
    footer: placement(config.footer, DEFAULTS.footer),
    index: normalizeIndex(config.index),
    linkUrl: pick(config, 'linkUrl') ? String(pick(config, 'linkUrl')) : null,
    errors,
  }
  if (explicitNone) return { ...base, status: 'none', sites: [] }
  const list = []
  if (Array.isArray(rawSites)) list.push(...rawSites)
  else if (rawSites != null) errors.push("sites must be a list, 'none', or omitted")
  if (Array.isArray(opts.dataSites)) list.push(...opts.dataSites)
  const sites = list.map((s, i) => normalizeSite(s, i, errors)).filter(Boolean)
  if (!sites.length) return { ...base, status: 'unconfigured', sites: [] }
  return { ...base, status: 'enabled', sites }
}

function normalizeIndex (raw) {
  const d = DEFAULTS.index
  if (raw === false || raw === 'false') return { ...d, enabled: false }
  if (!raw || typeof raw !== 'object') return { ...d }
  return {
    enabled: toBool(raw.enabled, true),
    component: raw.component ? String(raw.component) : null,
    version: raw.version != null ? String(raw.version) : null,
    module: raw.module ? String(raw.module) : d.module,
    path: raw.path ? String(raw.path).replace(/^\/+|\/+$/g, '').replace(/\.adoc$/, '') : d.path,
    title: raw.title ? String(raw.title) : d.title,
    intro: raw.intro != null ? String(raw.intro) : d.intro,
  }
}

module.exports = { normalizeConfig, AUDIENCES, DEFAULTS, pick, toBool }
