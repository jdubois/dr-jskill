# Front-End Development with Vue.js for Spring Boot Applications

## Contents
- [Overview](#overview)
- [Versions (managed via `versions.json`)](#versions-managed-via-versionsjson)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Development Workflow](#development-workflow)
- [Vue.js Application Structure](#vuejs-application-structure)
- [Spring Boot SPA Controller](#spring-boot-spa-controller)
- [Best Practices](#best-practices)
- [CORS Configuration for Development](#cors-configuration-for-development)
- [Testing Your Application](#testing-your-application)
- [Additional Resources](#additional-resources)

## Overview
This guide covers creating front-end applications for Spring Boot using **Vue.js 3** and **Vite 5**, with hot reload during development and optimized production builds integrated into the Spring Boot package.

## Versions (managed via `versions.json`)
| Tool | Version |
|------|---------|
| Node.js | 22.14.0 |
| npm | 10.10.0 |
| Vue.js | 3.x |
| Vite | 5.x |
| Pinia | 2.x |
| Vue Router | 4.x |

> Tip: `corepack enable` to use `pnpm`/`yarn` if preferred. Default instructions assume `npm`.

## Architecture

**Development Mode:**

1. Vite dev server runs on port 5173 with hot reload
2. Proxies API calls to Spring Boot backend on port 8080
3. Fast HMR (Hot Module Replacement)

**Production Mode:**

1. Vue.js app built and minified by Vite
2. Static assets copied to `src/main/resources/static`
3. Served directly by Spring Boot

## Project Structure

```
my-spring-boot-app/
├── frontend/                    # Vue.js application
│   ├── src/
│   │   ├── main.js             # Vue entry point
│   │   ├── App.vue             # Root component
│   │   ├── components/         # Vue components
│   │   ├── views/              # Page views
│   │   ├── router/             # Vue Router
│   │   ├── stores/             # Pinia stores (state management)
│   │   └── services/           # API services
│   ├── public/                 # Public assets
│   ├── index.html              # HTML entry point
│   ├── vite.config.js          # Vite configuration
│   ├── package.json            # Node dependencies
│   └── .gitignore
├── src/
│   └── main/
│       ├── java/               # Spring Boot backend
│       └── resources/
│           └── static/         # Production build output (auto-generated)
└── pom.xml
```

## Setup Instructions

### 1. Create Vue.js Project

From your Spring Boot project root:

```bash
# Create Vue.js project with Vite
npm create vue@latest frontend

# Follow the prompts:
# ✔ Add TypeScript? … No
# ✔ Add JSX Support? … No
# ✔ Add Vue Router for Single Page Application development? … Yes
# ✔ Add Pinia for state management? … Yes
# ✔ Add Vitest for Unit Testing? … Yes
# ✔ Add an End-to-End Testing Solution? › No
# ✔ Add ESLint for code quality? … Yes
# ✔ Add Prettier for code formatting? … Yes

cd frontend
npm install
```

### 2. Configure Vite for Spring Boot Integration

Update `frontend/vite.config.js`:

```javascript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  }
})
```

### 3. Configure Maven for Frontend Build

Add to your `pom.xml`:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <mainClass>${start-class}</mainClass>
            </configuration>
        </plugin>
        
        <!-- Frontend Maven Plugin for Node/npm -->
        <plugin>
            <groupId>com.github.eirslett</groupId>
            <artifactId>frontend-maven-plugin</artifactId>
            <version>1.15.1</version>
            <configuration>
                <workingDirectory>frontend</workingDirectory>
                <installDirectory>target</installDirectory>
            </configuration>
            <executions>
                <!-- Install Node and npm -->
                <execution>
                    <id>install node and npm</id>
                    <goals>
                        <goal>install-node-and-npm</goal>
                    </goals>
                    <configuration>
                        <nodeVersion>v22.14.0</nodeVersion>
                        <npmVersion>10.10.0</npmVersion>
                    </configuration>
                </execution>
                
                <!-- Install npm dependencies -->
                <execution>
                    <id>npm install</id>
                    <goals>
                        <goal>npm</goal>
                    </goals>
                    <configuration>
                        <arguments>install</arguments>
                    </configuration>
                </execution>
                
                <!-- Build frontend -->
                <execution>
                    <id>npm run build</id>
                    <goals>
                        <goal>npm</goal>
                    </goals>
                    <configuration>
                        <arguments>run build</arguments>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### 4. Update Frontend package.json Scripts

Edit `frontend/package.json`:

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore",
    "format": "prettier --write src/"
  }
}
```

## Development Workflow

### Starting Development Environment

**Terminal 1 - Spring Boot Backend:**
```bash
./mvnw spring-boot:run
```

**Terminal 2 - Vue.js Frontend (with hot reload):**
```bash
cd frontend
npm run dev
```

Access the application at **http://localhost:5173** (Vue.js dev server with hot reload).

API calls to `/api/*` are automatically proxied to Spring Boot at `http://localhost:8080`.

### Production Build

```bash
# Build everything (frontend + backend)
./mvnw clean package

# Run the packaged application
java -jar target/my-app.jar

# Access at http://localhost:8080
```

The frontend is built and bundled into the Spring Boot JAR automatically.

## Vue.js Application Structure

### Main Entry Point (frontend/src/main.js)

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

### Root Component (frontend/src/App.vue)

```vue
<template>
  <div id="app">
    <Navbar />
    <main class="container my-5">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import { RouterView } from 'vue-router'
</script>

<style>
:root {
  --primary-color: #0d6efd;
  --secondary-color: #6c757d;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}
</style>
```

### Navigation Component (frontend/src/components/Navbar.vue)

```vue
<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container">
      <RouterLink class="navbar-brand" to="/">My Spring Boot App</RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/" activeClass="active">Home</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/about" activeClass="active">About</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/items" activeClass="active">Items</RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
```

### Footer Component (frontend/src/components/Footer.vue)

```vue
<template>
  <footer class="bg-light py-4 mt-auto">
    <div class="container text-center">
      <p class="text-muted mb-0">&copy; 2026 Spring Boot Application</p>
    </div>
  </footer>
</template>
```

### Router Configuration (frontend/src/router/index.js)

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      // Lazy-loaded route
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/items',
      name: 'items',
      component: () => import('../views/ItemsView.vue')
    },
    {
      path: '/items/:id',
      name: 'item-detail',
      component: () => import('../views/ItemDetailView.vue'),
      props: true
    }
  ]
})

export default router
```

### API Service Layer (frontend/src/services/api.js)

```javascript
/**
 * Base API configuration and utilities
 */
const API_BASE_URL = '/api'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }
  
  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      )
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null
    }
    
    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error: ' + error.message, 0, null)
  }
}

/**
 * API methods
 */
export const api = {
  // GET request
  get: (endpoint) => fetchApi(endpoint, { method: 'GET' }),
  
  // POST request
  post: (endpoint, data) => fetchApi(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // PUT request
  put: (endpoint, data) => fetchApi(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // DELETE request
  delete: (endpoint) => fetchApi(endpoint, { method: 'DELETE' })
}

export { ApiError }
```

### Item API Service (frontend/src/services/itemService.js)

```javascript
import { api } from './api'

export const itemService = {
  // Get all items
  async getAll() {
    return await api.get('/items')
  },
  
  // Get single item by ID
  async getById(id) {
    return await api.get(`/items/${id}`)
  },
  
  // Create new item
  async create(item) {
    return await api.post('/items', item)
  },
  
  // Update existing item
  async update(id, item) {
    return await api.put(`/items/${id}`, item)
  },
  
  // Delete item
  async delete(id) {
    return await api.delete(`/items/${id}`)
  }
}
```

### Pinia Store (frontend/src/stores/itemStore.js)

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { itemService } from '@/services/itemService'

export const useItemStore = defineStore('item', () => {
  // State
  const items = ref([])
  const currentItem = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const itemCount = computed(() => items.value.length)
  const hasItems = computed(() => items.value.length > 0)

  // Actions
  async function fetchItems() {
    loading.value = true
    error.value = null
    try {
      items.value = await itemService.getAll()
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch items:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchItemById(id) {
    loading.value = true
    error.value = null
    try {
      currentItem.value = await itemService.getById(id)
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch item:', err)
    } finally {
      loading.value = false
    }
  }

  async function createItem(item) {
    loading.value = true
    error.value = null
    try {
      const created = await itemService.create(item)
      items.value.push(created)
      return created
    } catch (err) {
      error.value = err.message
      console.error('Failed to create item:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateItem(id, item) {
    loading.value = true
    error.value = null
    try {
      const updated = await itemService.update(id, item)
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err.message
      console.error('Failed to update item:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteItem(id) {
    loading.value = true
    error.value = null
    try {
      await itemService.delete(id)
      items.value = items.value.filter(i => i.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('Failed to delete item:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    items,
    currentItem,
    loading,
    error,
    // Getters
    itemCount,
    hasItems,
    // Actions
    fetchItems,
    fetchItemById,
    createItem,
    updateItem,
    deleteItem,
    clearError
  }
})
```

### Home View (frontend/src/views/HomeView.vue)

```vue
<template>
  <div class="home">
    <div class="row">
      <div class="col-lg-8 mx-auto">
        <h1 class="display-4">Welcome to Spring Boot</h1>
        <p class="lead">
          A modern web application built with Spring Boot and Vue.js 3.
        </p>

        <div class="card mt-4">
          <div class="card-body">
            <h5 class="card-title">Getting Started</h5>
            <p class="card-text">
              Your Spring Boot application with Vue.js is running! This front-end
              is connected to your REST API endpoints with hot reload during development.
            </p>
            <button class="btn btn-primary" @click="handleClick">
              Test Button
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
function handleClick() {
  alert('Button clicked! Your Vue.js app is working.')
}
</script>
```

### Items List View (frontend/src/views/ItemsView.vue)

```vue
<template>
  <div class="items">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1>Items</h1>
      <button class="btn btn-primary" @click="showCreateModal">
        <i class="bi bi-plus-circle"></i> Create Item
      </button>
    </div>

    <!-- Error Alert -->
    <div v-if="store.error" class="alert alert-danger alert-dismissible" role="alert">
      {{ store.error }}
      <button
        type="button"
        class="btn-close"
        @click="store.clearError()"
      ></button>
    </div>

    <!-- Loading Spinner -->
    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Items List -->
    <div v-else-if="store.hasItems" class="row">
      <div
        v-for="item in store.items"
        :key="item.id"
        class="col-md-6 col-lg-4 mb-4"
      >
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">{{ item.name }}</h5>
            <p class="card-text">{{ item.description }}</p>
          </div>
          <div class="card-footer bg-transparent">
            <RouterLink
              :to="{ name: 'item-detail', params: { id: item.id } }"
              class="btn btn-sm btn-outline-primary"
            >
              View Details
            </RouterLink>
            <button
              class="btn btn-sm btn-outline-danger ms-2"
              @click="handleDelete(item.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-5">
      <p class="text-muted">No items found. Create your first item to get started.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useItemStore } from '@/stores/itemStore'

const store = useItemStore()

onMounted(() => {
  store.fetchItems()
})

function showCreateModal() {
  // Implement modal logic or navigate to create page
  alert('Create item functionality - implement modal or navigate to form')
}

async function handleDelete(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    await store.deleteItem(id)
  }
}
</script>
```

### Item Detail View (frontend/src/views/ItemDetailView.vue)

```vue
<template>
  <div class="item-detail">
    <RouterLink to="/items" class="btn btn-sm btn-outline-secondary mb-3">
      &larr; Back to Items
    </RouterLink>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="alert alert-danger" role="alert">
      {{ store.error }}
    </div>

    <!-- Item Details -->
    <div v-else-if="store.currentItem" class="card">
      <div class="card-header">
        <h2>{{ store.currentItem.name }}</h2>
      </div>
      <div class="card-body">
        <p>{{ store.currentItem.description }}</p>
        <dl class="row">
          <dt class="col-sm-3">ID:</dt>
          <dd class="col-sm-9">{{ store.currentItem.id }}</dd>

          <dt class="col-sm-3">Created:</dt>
          <dd class="col-sm-9">{{ formatDate(store.currentItem.createdAt) }}</dd>
        </dl>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" @click="handleEdit">Edit</button>
        <button class="btn btn-danger ms-2" @click="handleDelete">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useItemStore } from '@/stores/itemStore'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const store = useItemStore()
const router = useRouter()

onMounted(() => {
  store.fetchItemById(props.id)
})

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString()
}

function handleEdit() {
  alert('Edit functionality - implement edit form')
}

async function handleDelete() {
  if (confirm('Are you sure you want to delete this item?')) {
    await store.deleteItem(props.id)
    router.push('/items')
  }
}
</script>
```

## Spring Boot SPA Controller

To support Vue Router with HTML5 history mode, create a controller that forwards all non-API requests to index.html:

```java
package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {
    
    /**
     * Forward all routes to index.html to support Vue Router HTML5 history mode.
     * Excludes API routes and static resources.
     */
    @GetMapping(value = {
        "/",
        "/{path:[^\\.]*}",
        "/**/{path:[^\\.]*}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
```

This controller ensures that refreshing the browser on any Vue.js route (e.g., `/items/123`) serves the index.html file, allowing Vue Router to handle the routing.

## Best Practices

### 1. Component Organization

- Single File Components (SFC): Use `.vue` files with `<template>`, `<script>`, and `<style>` sections
- Composition API: Prefer `<script setup>` for cleaner, more maintainable code
- Component Naming: Use PascalCase for component names (e.g., `ItemCard.vue`)
- Props Validation: Always define prop types and requirements

### 2. State Management

- Pinia Stores: Use Pinia for application state
- Store Organization: One store per domain entity (e.g., `itemStore.js`, `userStore.js`)
- Composition API Style: Use `ref()` and `computed()` in stores
- Actions for API Calls: Keep API logic in store actions

### 3. API Integration

- Service Layer: Separate API calls into service files (e.g., `itemService.js`)
- Error Handling: Implement consistent error handling patterns
- Loading States: Track loading states in stores
- TypeScript (Optional): Add TypeScript for better type safety

### 4. Routing

- Lazy Loading: Use dynamic imports for route components to reduce initial bundle size
- Route Guards: Implement navigation guards for authentication
- Named Routes: Use named routes instead of path strings
- Props Mode: Pass route params as props to components

### 5. Bootstrap Integration

- Import Once: Import Bootstrap CSS/JS in `main.js`
- Utility Classes: Leverage Bootstrap's utility classes
- Responsive Grid: Use Bootstrap's grid system for layouts
- Icons: Consider Bootstrap Icons with `npm install bootstrap-icons`

### 6. Performance

- Code Splitting: Use lazy-loaded routes for better initial load times
- Terser Minification: Configured in Vite for production builds
- Tree Shaking: Vite automatically removes unused code
- Asset Optimization: Vite optimizes images and fonts automatically

### 7. Development Workflow

- Hot Module Replacement: Vite provides instant updates during development
- Environment Variables: Use `.env` files for configuration
- ESLint + Prettier: Maintain code quality and consistent formatting
- Component Testing: Use Vitest for unit testing Vue components

### 8. Security

- CORS Configuration: Configure Spring Boot to allow Vite dev server during development
- CSRF Protection: Ensure Spring Security CSRF tokens are properly handled
- Input Validation: Validate user inputs on both client and server
- Sanitization: Sanitize data before rendering (Vue does this automatically for text)

## CORS Configuration for Development

Add this to your Spring Boot application to allow the Vite dev server:

```java
package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {
    
    /**
     * CORS configuration for development with Vite dev server.
     * In production, the Vue.js app is served from the same origin,
     * so CORS is not needed.
     */
    @Bean
    public CorsFilter corsFilter() {
        // Only enable CORS if DEV_MODE environment variable is set
        String devMode = System.getenv("DEV_MODE");
        if (!"true".equals(devMode)) {
            return new CorsFilter(new UrlBasedCorsConfigurationSource());
        }
        
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        
        return new CorsFilter(source);
    }
}
```

Start Spring Boot in development mode:
```bash
DEV_MODE=true ./mvnw spring-boot:run
```

## Testing Your Application

### Development Testing
1. Start Spring Boot backend: `./mvnw spring-boot:run`
2. Start Vite dev server: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173`
4. Make changes and see them instantly with hot reload

### Production Testing
1. Build: `./mvnw clean package`
2. Run: `java -jar target/my-app.jar`
3. Navigate to `http://localhost:8080`
4. All routes should work including direct navigation to `/items`, `/about`, etc.

### Browser DevTools
- **Vue DevTools Extension**: Install for inspecting Vue components and Pinia stores
- **Console**: Check for errors and API responses
- **Network Tab**: Monitor API calls to Spring Boot backend
- **Performance Tab**: Profile Vue.js rendering and API calls

## Additional Resources

- [Vue.js 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/)
- [Frontend Maven Plugin](https://github.com/eirslett/frontend-maven-plugin)
- [Spring Boot Static Content](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.static-content)
