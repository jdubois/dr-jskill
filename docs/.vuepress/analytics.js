/*
 * Consent-gated Google Analytics.
 *
 * Nothing here runs on the server and nothing touches the network until the reader has explicitly
 * accepted: the gtag.js script is injected only after a `granted` decision, so a visitor who
 * ignores or declines the banner never has an analytics cookie written. The decision itself is
 * normally kept in localStorage rather than a cookie, which keeps the "remember my choice" storage
 * strictly necessary and outside the consent requirement; when the browser refuses that store the
 * answer is held in memory for the current page session instead.
 */

export const GA_MEASUREMENT_ID = 'G-92TRR0HJMQ'

const CONSENT_STORAGE_KEY = 'jdubois-analytics-consent'
const CONSENT_EVENT = 'drjskill:analytics-consent'
const GRANTED = 'granted'
const DENIED = 'denied'

let scriptLoaded = false
// Set once gtag.js has run, after which commands are dispatched rather than queued.
let scriptReady = false
const queuedBeforeReady = new Set()
let lastTrackedPath = null
// Whether hits are currently being sent. Consent transitions are read from this rather than from
// `ga-disable-*`, which is a flag the page shares with anything else a reader may have installed.
let measuring = false
// The answer given during this page session, which outranks storage: it is the reader's latest
// word, and it is all there is when a private browsing mode refuses the write.
let sessionConsent = null

export function readConsent() {
  if (typeof window === 'undefined') {
    return null
  }

  if (sessionConsent) {
    return sessionConsent
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return stored === GRANTED || stored === DENIED ? stored : null
  } catch {
    // Private browsing modes can throw on access. Treat an unreadable store as "not asked yet"
    // rather than assuming consent.
    return null
  }
}

export function setConsent(consent) {
  const normalized = consent === GRANTED ? GRANTED : DENIED

  // Recorded before the write is attempted, so a store that rejects or silently keeps a stale
  // value cannot outvote the choice just made.
  sessionConsent = normalized

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, normalized)
  } catch {
    // A rejected write only costs the reader the banner on their next visit, so honour the choice
    // for this session anyway.
  }

  applyConsent(normalized)
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, {detail: normalized}))
}

export function onConsentChange(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = (event) => listener(event.detail)
  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}

export function watchOtherTabs() {
  if (typeof window === 'undefined') {
    return () => {}
  }

  // The session answer outranks storage, so a withdrawal made in another tab would otherwise be
  // invisible here until a reload. `storage` fires in every other tab but the writing one, which
  // is exactly the reconciliation needed.
  const handler = (event) => {
    if (event.key !== CONSENT_STORAGE_KEY) {
      return
    }

    // A cleared entry is someone erasing site data, which is a withdrawal rather than an invitation
    // to keep measuring.
    const consent = event.newValue === GRANTED ? GRANTED : DENIED
    if (consent === sessionConsent) {
      return
    }

    sessionConsent = consent
    applyConsent(consent)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, {detail: consent}))
  }

  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function applyConsent(consent) {
  if (consent === GRANTED) {
    loadGoogleAnalytics()
    return
  }

  disableGoogleAnalytics()
}

export function trackPageView(path) {
  if (!scriptLoaded || readConsent() !== GRANTED || path === lastTrackedPath) {
    return
  }

  lastTrackedPath = path

  if (!scriptReady) {
    // Commands pushed before gtag.js arrives sit in the queue and are only sent on load, where the
    // opt-out flag is read as it stands at that moment. A page queued during an earlier consent
    // period is therefore still delivered once consent is restored, so queueing it again would
    // report it twice. Under-counting a genuine repeat visit within those few hundred milliseconds
    // is the safer side of that trade.
    if (queuedBeforeReady.has(path)) {
      return
    }

    queuedBeforeReady.add(path)
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  })
}

function loadGoogleAnalytics() {
  // Lifting the opt-out flag belongs to every accept, not only the first one. A reader who
  // withdraws and then consents again keeps the already-injected tag, so gating this on the
  // script being absent would leave the flag a withdrawal set in place and mute the rest of the
  // page session.
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false

  if (measuring) {
    // Re-picking the answer already in force changes nothing and must not report the page twice.
    return
  }

  measuring = true

  if (!scriptLoaded) {
    scriptLoaded = true
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // gtag.js reads `arguments` verbatim, so this cannot be a rest-parameter forward.
      window.dataLayer.push(arguments)
    }

    window.gtag('js', new Date())
    // The automatic page view is declined so that every hit goes through `trackPageView`. Its own
    // view of what has been reported is then the whole truth, which matters when a reader
    // withdraws and consents again before the script has finished loading: the queued commands
    // are only processed on load, and an implicit view queued back then would arrive alongside
    // the explicit one below.
    window.gtag('config', GA_MEASUREMENT_ID, {send_page_view: false})

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.addEventListener('load', () => {
      scriptReady = true
      queuedBeforeReady.clear()
    })
    document.head.appendChild(script)
  }

  // Whether this is a first accept or a withdrawal reversed, the page the reader is on is the one
  // page a freshly consenting reader expects to be counted.
  lastTrackedPath = null
  trackPageView(window.location.pathname)
}

function disableGoogleAnalytics() {
  measuring = false

  // Withdrawal has to be as effective as refusal, so an already-loaded tag is muted through the
  // opt-out flag gtag.js checks before every hit, and its cookies are removed.
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true
  lastTrackedPath = null
  clearAnalyticsCookies()
}

function clearAnalyticsCookies() {
  const names = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((name) => name === '_ga' || name === '_gid' || name.startsWith('_ga_') || name.startsWith('_gat'))

  const hostname = window.location.hostname
  // The tag may have scoped its cookie to the exact host or to the registrable domain, and a
  // mismatched delete is a silent no-op, so try every candidate.
  const domains = new Set(['', hostname, `.${hostname}`, toRegistrableDomain(hostname)].filter(Boolean))
  domains.add('')

  names.forEach((name) => {
    domains.forEach((domain) => {
      const domainPart = domain ? `; domain=${domain}` : ''
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT${domainPart}`
    })
  })
}

function toRegistrableDomain(hostname) {
  const labels = hostname.split('.')
  return labels.length > 2 ? `.${labels.slice(-2).join('.')}` : undefined
}
