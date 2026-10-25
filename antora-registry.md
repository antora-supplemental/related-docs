---
name: "Related docs"
description: "Links every page to your org's other docs sites (team, partner, public) through a generated registry page."
---

# Overview

New readers who land on a public docs hub often need a different site (team docs, partner portal). This Antora extension generates a registry page of associated docs sites and bakes a slim link at the top and/or bottom of every page. No runtime JavaScript.

## Install

```bash
pnpm add -D github:antora-supplemental/related-docs#v0.1.0
```

## Playbook

```yaml
antora:
  extensions:
    - require: '@antora-supplemental/related-docs'
      label: Team docs (members only)
      sites:
        - name: Team docs
          url: https://team.docs.example.com
          audience: team
          requires_login: true
```

No other docs sites? Say so explicitly: `sites: none`.

## Links

- Repository: https://github.com/antora-supplemental/related-docs
