import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {toDocLink} from './doc-links.js'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const workshopOrder = [
  'README.md',
  '00-introduction.md',
  '01-setup.md',
  '02-getting-started.md',
  '03-generated-application.md',
  '04-adding-users.md',
  '05-professional-frontend.md',
  '06-testing.md',
  '07-performance.md',
  '08-deployment.md',
  '09-going-further.md',
  'appendix-a-prompts.md',
  'appendix-b-troubleshooting.md'
]

export function createDocsSidebar() {
  return [folderGroup('Workshop', 'workshop', workshopOrder)]
}

function folderGroup(text, folder, order) {
  const files = listMarkdownFiles(folder)
  const ordered = [
    ...order.filter((file) => files.includes(file)),
    ...files.filter((file) => !order.includes(file)).sort((left, right) => left.localeCompare(right))
  ]

  return {
    text,
    collapsible: true,
    children: ordered.map((file) => toSidebarItem(`${folder}/${file}`))
  }
}

function listMarkdownFiles(folder) {
  const dir = path.join(docsRoot, folder)
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir).filter((file) => file.endsWith('.md'))
}

function toSidebarItem(file) {
  return {
    text: readTitle(file),
    link: toDocLink(file)
  }
}

function readTitle(file) {
  const content = fs.readFileSync(path.join(docsRoot, file), 'utf8')
  const heading = content.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : file.replace(/\.md$/, '').replaceAll('-', ' ')
}
