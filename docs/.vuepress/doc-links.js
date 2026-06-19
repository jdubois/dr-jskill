const markdownExtension = /\.md$/i
const readmeFile = 'README.md'

export function toDocLink(file) {
  const normalized = file.replaceAll('\\', '/')

  if (normalized === readmeFile) {
    return '/'
  }

  if (normalized.endsWith(`/${readmeFile}`)) {
    return `/${normalized.slice(0, -readmeFile.length - 1).toLowerCase()}`
  }

  return `/${normalized.replace(markdownExtension, '').toLowerCase()}`
}
