/*
 * Consent handling is a privacy control, so it gets the only automated coverage on the site: the
 * real module is driven against a minimal window/document stub. Each case imports its own copy of
 * the module, because the loader deliberately keeps per-page-session state in module scope.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

let nextCase = 0

async function withStubbedBrowser({storage = 'available'} = {}) {
  const store = new Map()
  const listeners = new Map()
  const injectedScripts = []

  const unavailable = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }

  const localStorage =
    storage === 'available'
      ? {
          getItem: (key) => (store.has(key) ? store.get(key) : null),
          setItem: (key, value) => store.set(key, String(value))
        }
      : {getItem: unavailable, setItem: unavailable}

  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }

  const createScript = () => {
    const scriptListeners = new Map()
    return {
      addEventListener(type, handler) {
        scriptListeners.set(type, [...(scriptListeners.get(type) ?? []), handler])
      },
      dispatch(type) {
        ;(scriptListeners.get(type) ?? []).forEach((handler) => handler())
      }
    }
  }

  globalThis.document = {
    title: 'Dr JSkill',
    cookie: '',
    head: {
      appendChild(script) {
        injectedScripts.push(script)
      }
    },
    createElement: createScript
  }

  globalThis.window = {
    location: {hostname: 'www.julien-dubois.com', href: 'https://www.julien-dubois.com/dr-jskill/guide/', pathname: '/guide/'},
    localStorage,
    addEventListener(type, handler) {
      listeners.set(type, [...(listeners.get(type) ?? []), handler])
    },
    removeEventListener() {},
    dispatchEvent(event) {
      ;(listeners.get(event.type) ?? []).forEach((handler) => handler(event))
    }
  }

  // A query string gives every case an unshared module instance.
  const analytics = await import(`./analytics.js?case=${nextCase++}`)

  return {
    analytics,
    injectedScripts,
    // gtag.js only runs some time after the tag is injected. Until then commands sit in the queue,
    // and they are delivered on load only if the opt-out flag is clear at that moment.
    finishScriptLoad() {
      const dropped = globalThis.window[`ga-disable-${analytics.GA_MEASUREMENT_ID}`] !== false
      if (dropped) {
        globalThis.window.dataLayer.length = 0
      }

      injectedScripts.forEach((script) => script.dispatch('load'))
    },
    // What another tab writing to the shared key looks like from here.
    writeInAnotherTab(value) {
      ;(listeners.get('storage') ?? []).forEach((handler) =>
        handler({key: 'jdubois-analytics-consent', newValue: value})
      )
    },
    configOptions: () => Array.from(globalThis.window.dataLayer ?? []).find((entry) => entry[0] === 'config')?.[2],
    disabled: () => globalThis.window[`ga-disable-${analytics.GA_MEASUREMENT_ID}`],
    pageViews: () =>
      Array.from(globalThis.window.dataLayer ?? [])
        .filter((entry) => entry[0] === 'event' && entry[1] === 'page_view')
        .map((entry) => entry[2].page_path)
  }
}

test('nothing is loaded before a decision is made', async () => {
  const {analytics, injectedScripts, disabled} = await withStubbedBrowser()

  analytics.applyConsent(analytics.readConsent())

  assert.equal(injectedScripts.length, 0)
  assert.equal(disabled(), true)
})

test('refusing keeps the tag out of the document', async () => {
  const {analytics, injectedScripts, disabled} = await withStubbedBrowser()

  analytics.setConsent('denied')

  assert.equal(injectedScripts.length, 0)
  assert.equal(disabled(), true)
})

test('accepting, withdrawing and accepting again re-enables analytics in the same page session', async () => {
  const {analytics, injectedScripts, disabled} = await withStubbedBrowser()

  analytics.setConsent('granted')
  assert.equal(disabled(), false)

  analytics.setConsent('denied')
  assert.equal(disabled(), true)

  analytics.setConsent('granted')
  assert.equal(disabled(), false)
  assert.equal(injectedScripts.length, 1, 'the gtag.js script is injected only once')
})

test('page views resume after re-consent', async () => {
  const {analytics, pageViews, finishScriptLoad} = await withStubbedBrowser()

  analytics.setConsent('granted')
  finishScriptLoad()
  assert.deepEqual(pageViews(), ['/guide/'], 'the page consent was given on')

  analytics.setConsent('denied')
  analytics.trackPageView('/guide/panels/')
  assert.deepEqual(pageViews(), ['/guide/'], 'a withdrawn reader is not tracked')

  analytics.setConsent('granted')
  analytics.trackPageView('/guide/panels/')
  assert.deepEqual(
    pageViews(),
    ['/guide/', '/guide/', '/guide/panels/'],
    'the page re-consent was given on, then the navigation'
  )
})

test('the automatic page view is declined so every hit goes through trackPageView', async () => {
  const {analytics, configOptions} = await withStubbedBrowser()

  analytics.setConsent('granted')

  assert.deepEqual(configOptions(), {send_page_view: false})
})

test('re-picking the answer already in force does not report the page again', async () => {
  const {analytics, pageViews, finishScriptLoad} = await withStubbedBrowser()

  analytics.setConsent('granted')
  finishScriptLoad()
  analytics.setConsent('granted')

  assert.deepEqual(pageViews(), ['/guide/'])
})

test('toggling consent before gtag.js loads reports the page once', async () => {
  const {analytics, pageViews, finishScriptLoad} = await withStubbedBrowser()

  // Commands queued before the script arrives are delivered on load, so a page queued during the
  // first consent period would otherwise be sent alongside the one queued on re-consent.
  analytics.setConsent('granted')
  analytics.setConsent('denied')
  analytics.setConsent('granted')
  finishScriptLoad()

  assert.deepEqual(pageViews(), ['/guide/'])
})

test('a withdrawal made in another tab is honoured here', async () => {
  const {analytics, disabled, pageViews, writeInAnotherTab} = await withStubbedBrowser()
  const seen = []

  analytics.watchOtherTabs()
  analytics.onConsentChange((consent) => seen.push(consent))
  analytics.setConsent('granted')

  writeInAnotherTab('denied')

  assert.equal(disabled(), true)
  assert.equal(analytics.readConsent(), 'denied')
  assert.deepEqual(seen, ['granted', 'denied'], 'the components are told, so their state follows')

  analytics.trackPageView('/guide/panels/')
  assert.deepEqual(pageViews(), ['/guide/'], 'nothing more is reported')
})

test('a browser that refuses storage still gets the banner, not assumed consent', async () => {
  const {analytics, injectedScripts, disabled} = await withStubbedBrowser({storage: 'unavailable'})

  assert.equal(analytics.readConsent(), null)

  analytics.applyConsent(analytics.readConsent())

  assert.equal(injectedScripts.length, 0)
  assert.equal(disabled(), true)
})

test('the choice is honoured for the session when it cannot be persisted', async () => {
  const {analytics, disabled, pageViews, finishScriptLoad} = await withStubbedBrowser({storage: 'unavailable'})

  analytics.setConsent('granted')
  assert.equal(analytics.readConsent(), 'granted')
  assert.equal(disabled(), false)
  finishScriptLoad()

  analytics.trackPageView('/guide/panels/')
  assert.deepEqual(pageViews(), ['/guide/', '/guide/panels/'], 'navigation is measured despite the failed write')

  analytics.setConsent('denied')
  assert.equal(analytics.readConsent(), 'denied')
  assert.equal(disabled(), true)

  analytics.trackPageView('/guide/setup/')
  assert.deepEqual(pageViews(), ['/guide/', '/guide/panels/'], 'withdrawal is honoured too')

  analytics.setConsent('granted')
  assert.equal(disabled(), false)
  assert.deepEqual(pageViews(), ['/guide/', '/guide/panels/', '/guide/'], 'the page re-consent was given on')
})
