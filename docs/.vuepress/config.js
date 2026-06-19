import fs from 'node:fs'
import path from 'node:path'
import {viteBundler} from '@vuepress/bundler-vite'
import {defaultTheme} from '@vuepress/theme-default'
import {defineUserConfig} from 'vuepress'
import {inferRoutePath} from 'vuepress/shared'
import {toDocLink} from './doc-links.js'
import {createDocsSidebar} from './sidebar.js'

const siteBase = normalizeBase(process.env.VUEPRESS_BASE || (process.argv.includes('dev') ? '/' : '/dr-jskill/'))
const publicSiteUrl = 'https://www.julien-dubois.com/dr-jskill'

const siteDescription = "An Agent Skill for generating Spring Boot applications following Julien Dubois' best practices."

export default defineUserConfig({
  base: siteBase,
  lang: 'en-US',
  title: 'Dr JSkill',
  description: siteDescription,
  head: [
    ['link', {rel: 'icon', type: 'image/svg+xml', href: `${siteBase}favicon.svg`}],
    ['meta', {name: 'theme-color', content: '#C2683E'}],
    ['meta', {property: 'og:type', content: 'website'}],
    ['meta', {property: 'og:title', content: 'Dr JSkill'}],
    ['meta', {property: 'og:description', content: siteDescription}]
  ],
  bundler: viteBundler(),
  plugins: [
    cleanDocsPermalinksPlugin(),
    cleanMarkdownDocLinksPlugin(),
    lazyLoadMarkdownImagesPlugin()
  ],
  theme: defaultTheme({
    hostname: 'https://www.julien-dubois.com',
    themePlugins: {
      seo: {
        canonical: toCanonicalUrl
      }
    },
    repo: 'jdubois/dr-jskill',
    docsRepo: 'https://github.com/jdubois/dr-jskill',
    docsBranch: 'main',
    docsDir: 'docs',
    editLink: true,
    lastUpdated: true,
    contributors: false,
    logo: null,
    navbar: [
      {text: 'Workshop', link: toDocLink('workshop/README.md')},
      {text: 'Ecosystem', link: toDocLink('WORKS-WITH.md')}
    ],
    sidebar: createDocsSidebar()
  })
})

function normalizeBase(value) {
  if (!value || value === '/') {
    return '/'
  }
  const prefixed = value.startsWith('/') ? value : `/${value}`
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`
}

function toCanonicalUrl(page) {
  return page.path === '/' ? `${publicSiteUrl}/` : `${publicSiteUrl}${page.path}`
}

function cleanDocsPermalinksPlugin() {
  return {
    name: 'drjskill-clean-docs-permalinks',
    extendsPageOptions(options, app) {
      if (!options.filePath) {
        return
      }

      const filePathRelative = path.relative(app.dir.source(), options.filePath)
      if (filePathRelative.startsWith('..') || !filePathRelative.endsWith('.md')) {
        return
      }

      options.frontmatter = {
        permalink: toDocLink(filePathRelative),
        ...options.frontmatter
      }
    },
    extendsPage(page) {
      if (!page.filePathRelative?.endsWith('.md')) {
        return
      }

      const cleanPath = toDocLink(page.filePathRelative)
      if (cleanPath !== '/') {
        page.pathInferred = `${cleanPath}.html`
      }
    }
  }
}

function lazyLoadMarkdownImagesPlugin() {
  return {
    name: 'drjskill-lazy-load-markdown-images',
    extendsMarkdown(markdown) {
      const rawImageRule =
        markdown.renderer.rules.image ??
        ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

      markdown.renderer.rules.image = (tokens, index, options, env, self) => {
        const token = tokens[index]
        if (token.attrIndex('loading') < 0) {
          token.attrPush(['loading', 'lazy'])
        }
        if (token.attrIndex('decoding') < 0) {
          token.attrPush(['decoding', 'async'])
        }
        return rawImageRule(tokens, index, options, env, self)
      }
    }
  }
}

function cleanMarkdownDocLinksPlugin() {
  return {
    name: 'drjskill-clean-markdown-doc-links',
    extendsMarkdown(markdown, app) {
      const cleanRouteByInferredRoute = createCleanRouteByInferredRoute(app.dir.source())
      const rawLinkOpenRule =
        markdown.renderer.rules.link_open ??
        ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

      markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
        rawLinkOpenRule(tokens, index, options, env, self)
        rewriteMarkdownDocLink(tokens[index], cleanRouteByInferredRoute)
        return self.renderToken(tokens, index, options)
      }
    }
  }
}

function createCleanRouteByInferredRoute(docsRoot) {
  return listMarkdownFiles(docsRoot).reduce((cleanRouteByInferredRoute, file) => {
    const normalizedFile = file.replaceAll(path.sep, '/')
    cleanRouteByInferredRoute.set(inferRoutePath(`/${normalizedFile}`).toLowerCase(), toDocLink(normalizedFile))
    return cleanRouteByInferredRoute
  }, new Map())
}

function listMarkdownFiles(root, directory = '') {
  return fs.readdirSync(path.join(root, directory), {withFileTypes: true}).flatMap((entry) => {
    if (entry.name === '.vuepress') {
      return []
    }

    const relativePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return listMarkdownFiles(root, relativePath)
    }

    return entry.isFile() && entry.name.endsWith('.md') ? [relativePath] : []
  })
}

function rewriteMarkdownDocLink(token, cleanRouteByInferredRoute) {
  const routeAttrIndex = token.attrIndex('to')
  const hrefAttrIndex = token.attrIndex('href')
  const attrIndex = routeAttrIndex >= 0 ? routeAttrIndex : hrefAttrIndex

  if (attrIndex < 0) {
    return
  }

  const attr = token.attrs[attrIndex]
  const cleanRoute = toCleanMarkdownDocRoute(attr[1], cleanRouteByInferredRoute)
  if (cleanRoute) {
    attr[1] = cleanRoute
  }
}

function toCleanMarkdownDocRoute(route, cleanRouteByInferredRoute) {
  const match = route.match(/^([^#?]*)([#?].*)?$/)
  if (!match) {
    return null
  }

  const [, pathname, hashAndQuery = ''] = match
  const cleanRoute = cleanRouteByInferredRoute.get(pathname.toLowerCase())
  return cleanRoute ? `${cleanRoute}${hashAndQuery}` : null
}
