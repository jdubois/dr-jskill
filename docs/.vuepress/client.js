import {nextTick, onMounted, onUnmounted, watch} from 'vue'
import {defineClientConfig, onContentUpdated, useRoute} from 'vuepress/client'
import './styles/index.css'

export default defineClientConfig({
  setup() {
    const route = useRoute()
    let scheduleSidebarSync = () => {}
    let cleanupSidebarSync = () => {}
    let refreshSidebarLinkToggles = () => {}
    let cleanupSidebarLinkToggles = () => {}

    const syncAfterDomUpdate = () => {
      void nextTick(() => {
        refreshSidebarLinkToggles()
        scheduleSidebarSync()
      })
    }

    onMounted(() => {
      const sidebarSync = setupSidebarScrollSync()
      scheduleSidebarSync = sidebarSync.schedule
      cleanupSidebarSync = sidebarSync.cleanup
      const sidebarLinkToggles = setupSidebarLinkToggles(() => scheduleSidebarSync())
      refreshSidebarLinkToggles = sidebarLinkToggles.refresh
      cleanupSidebarLinkToggles = sidebarLinkToggles.cleanup
      refreshSidebarLinkToggles()
      scheduleSidebarSync()
    })

    onContentUpdated(syncAfterDomUpdate)
    watch(() => route.fullPath, syncAfterDomUpdate)

    onUnmounted(() => {
      cleanupSidebarSync()
      cleanupSidebarLinkToggles()
    })
  }
})

function setupSidebarLinkToggles(scheduleSidebarSync) {
  const onClick = (event) => {
    if (!isPlainLeftClick(event)) {
      return
    }

    if (!(event.target instanceof Element)) {
      return
    }

    const link = event.target.closest('.vp-sidebar .vp-sidebar-item.auto-link[href]')
    if (!link || !isCurrentSidebarLink(link)) {
      return
    }

    const children = getToggleChildren(link)
    if (!children) {
      return
    }

    event.preventDefault()
    toggleSidebarLinkChildren(link, children)
    scheduleSidebarSync()
  }

  document.addEventListener('click', onClick)

  return {
    refresh: refreshSidebarLinkToggles,
    cleanup() {
      document.removeEventListener('click', onClick)
    }
  }
}

function refreshSidebarLinkToggles() {
  document.querySelectorAll('.vp-sidebar .vp-sidebar-item.auto-link[href]').forEach((link) => {
    const children = getToggleChildren(link)
    link.classList.toggle('drjskill-sidebar-link-toggle', Boolean(children))

    if (children) {
      syncSidebarLinkToggleState(link, children)
    } else {
      link.classList.remove('drjskill-sidebar-link-toggle--collapsed')
      link.removeAttribute('aria-expanded')
    }
  })
}

function isPlainLeftClick(event) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
}

function isCurrentSidebarLink(link) {
  const url = toUrl(link)
  if (!url || normalizePathname(url.pathname) !== normalizePathname(window.location.pathname)) {
    return false
  }

  return !url.hash || url.hash === window.location.hash
}

function getToggleChildren(link) {
  const sibling = link.nextElementSibling
  return sibling?.classList.contains('vp-sidebar-children') ? sibling : null
}

function toggleSidebarLinkChildren(link, children) {
  children.hidden = !children.hidden
  syncSidebarLinkToggleState(link, children)
}

function syncSidebarLinkToggleState(link, children) {
  const expanded = !children.hidden
  link.classList.toggle('drjskill-sidebar-link-toggle--collapsed', !expanded)
  link.setAttribute('aria-expanded', String(expanded))
}

function setupSidebarScrollSync() {
  let frame = 0

  const schedule = () => {
    if (frame) {
      return
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0
      scrollSidebarToCurrentSection()
    })
  }

  const cleanup = () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)

    if (frame) {
      window.cancelAnimationFrame(frame)
    }
  }

  window.addEventListener('scroll', schedule, {passive: true})
  window.addEventListener('resize', schedule)

  return {schedule, cleanup}
}

function scrollSidebarToCurrentSection() {
  const sidebar = document.querySelector('.vp-sidebar')
  if (!sidebar) {
    return
  }

  const target = findCurrentSidebarLink()
  if (!target) {
    return
  }

  keepElementVisible(sidebar, target)
}

function findCurrentSidebarLink() {
  const links = Array.from(document.querySelectorAll('.vp-sidebar .vp-sidebar-item.auto-link[href]')).filter(
    isElementVisible
  )
  const currentPath = normalizePathname(window.location.pathname)
  const pageLinks = []
  const headingLinks = []

  links.forEach((link) => {
    const url = toUrl(link)
    if (!url || normalizePathname(url.pathname) !== currentPath) {
      return
    }

    if (url.hash) {
      headingLinks.push({link, id: decodeHash(url.hash)})
    } else {
      pageLinks.push(link)
    }
  })

  const headingTargets = headingLinks
    .map(({link, id}) => ({link, element: document.getElementById(id)}))
    .filter(({element}) => element)
  const activeHeading = findActiveHeading(headingTargets)

  return activeHeading?.link ?? pageLinks[0] ?? headingTargets[0]?.link
}

function findActiveHeading(headingTargets) {
  const topOffset = getScrollTopOffset()
  let activeHeading = null

  headingTargets.forEach((headingTarget) => {
    if (headingTarget.element.getBoundingClientRect().top <= topOffset) {
      activeHeading = headingTarget
    }
  })

  return activeHeading
}

function getScrollTopOffset() {
  const navbar = document.querySelector('.vp-navbar')
  return (navbar?.getBoundingClientRect().height ?? 0) + 32
}

function keepElementVisible(container, element) {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const margin = 56

  if (elementRect.top < containerRect.top + margin) {
    container.scrollTop += elementRect.top - containerRect.top - margin
  } else if (elementRect.bottom > containerRect.bottom - margin) {
    container.scrollTop += elementRect.bottom - containerRect.bottom + margin
  }
}

function isElementVisible(element) {
  return element.getClientRects().length > 0
}

function toUrl(link) {
  const href = link.getAttribute('href')
  return href ? new URL(href, window.location.href) : null
}

function normalizePathname(pathname) {
  return pathname.endsWith('/') ? `${pathname}index.html` : pathname
}

function decodeHash(hash) {
  return decodeURIComponent(hash.slice(1))
}
