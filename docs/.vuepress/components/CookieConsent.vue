<script setup>
import {onMounted, onUnmounted, ref} from 'vue'
import {applyConsent, onConsentChange, readConsent, setConsent, watchOtherTabs} from '../analytics.js'

const visible = ref(false)

// The banner is client-only: rendering it during the static build would ship a prompt that is
// already answered for returning readers, and would flash before hydration for everyone else.
onMounted(() => {
  const consent = readConsent()
  applyConsent(consent)
  visible.value = consent === null
})

onUnmounted(
  onConsentChange((consent) => {
    visible.value = consent === null
  })
)

// The banner is the one component always on the page, so it owns the listener that keeps this tab
// in step with a choice made in another one.
onUnmounted(watchOtherTabs())

function accept() {
  setConsent('granted')
  visible.value = false
}

function decline() {
  setConsent('denied')
  visible.value = false
}
</script>

<template>
  <Transition name="drjskill-consent">
    <aside
      v-if="visible"
      class="drjskill-consent"
      role="region"
      aria-labelledby="drjskill-consent-title"
      aria-describedby="drjskill-consent-description"
    >
      <div class="drjskill-consent__text">
        <p id="drjskill-consent-title" class="drjskill-consent__title">Analytics cookies</p>
        <p id="drjskill-consent-description" class="drjskill-consent__description">
          Dr JSkill would like to use Google Analytics to understand which documentation pages are useful. Nothing is set
          unless you accept, and declining changes nothing about how the site works. See the
          <RouteLink to="/privacy">privacy notice</RouteLink> for details or to change your mind later.
        </p>
      </div>
      <div class="drjskill-consent__actions">
        <button type="button" class="drjskill-consent__button" @click="decline">Decline</button>
        <button type="button" class="drjskill-consent__button drjskill-consent__button--primary" @click="accept">
          Accept
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.drjskill-consent {
  position: fixed;
  z-index: 100;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 1.5rem;
  max-width: 62rem;
  margin: 0 auto;
  padding: 1rem 1.25rem;
  border: 1px solid var(--drjskill-border);
  border-radius: 1.1rem;
  background: var(--drjskill-surface-solid);
  box-shadow: var(--drjskill-shadow-md);
  color: var(--drjskill-text);
}

.drjskill-consent__text {
  flex: 1 1 22rem;
}

.drjskill-consent__title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 700;
}

.drjskill-consent__description {
  margin: 0;
  color: var(--drjskill-text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.drjskill-consent__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.6rem;
}

.drjskill-consent__button {
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--drjskill-border-alt);
  border-radius: 0.75rem;
  background: transparent;
  color: var(--drjskill-text);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.drjskill-consent__button:hover {
  border-color: var(--drjskill-green);
  background: var(--drjskill-nav-hover-bg);
}

.drjskill-consent__button--primary {
  border-color: transparent;
  background: var(--drjskill-green);
  color: #ffffff;
}

.drjskill-consent__button--primary:hover {
  border-color: transparent;
  background: var(--drjskill-green-dark);
}

.drjskill-consent-enter-active,
.drjskill-consent-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.drjskill-consent-enter-from,
.drjskill-consent-leave-to {
  opacity: 0;
  transform: translateY(0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .drjskill-consent-enter-active,
  .drjskill-consent-leave-active {
    transition: none;
  }
}

@media (max-width: 40rem) {
  .drjskill-consent__actions {
    width: 100%;
  }

  .drjskill-consent__button {
    flex: 1 1 0;
  }
}
</style>
