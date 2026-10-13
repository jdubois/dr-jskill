<script setup>
import {computed} from 'vue'
import {usePageFrontmatter} from 'vuepress/client'

const frontmatter = usePageFrontmatter()
const year = new Date().getFullYear()
const hasSidebar = computed(() => !frontmatter.value.home && frontmatter.value.sidebar !== false)
</script>

<template>
  <footer class="drjskill-site-footer" :class="{'drjskill-site-footer--sidebar': hasSidebar}">
    <p>
      &copy; {{ year }}
      <a href="https://www.julien-dubois.com" target="_blank" rel="noopener noreferrer">Julien Dubois</a>
    </p>
  </footer>
</template>

<style>
.drjskill-site-footer {
  padding: 1.5rem 2rem;
  color: var(--drjskill-text-muted);
  font-size: 0.9rem;
  text-align: center;
}

.drjskill-site-footer p {
  margin: 0;
}

.drjskill-site-footer a {
  color: var(--drjskill-green-dark);
  font-weight: 600;
}

.drjskill-site-footer a:focus-visible {
  outline: 2px solid var(--drjskill-green-dark);
  outline-offset: 2px;
}

.drjskill-site-footer--sidebar {
  padding-inline-start: calc(var(--sidebar-width) + 2rem);
}

@media (max-width: 959px) {
  .drjskill-site-footer--sidebar {
    padding-inline-start: calc(var(--sidebar-width-mobile) + 2rem);
  }
}

@media (max-width: 719px) {
  .drjskill-site-footer--sidebar {
    padding-inline-start: 2rem;
  }
}
</style>
