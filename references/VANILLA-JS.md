# Front-End Development with Vanilla JavaScript for Spring Boot Applications

## Contents
- [Overview](#overview)
- [Versions (managed via `versions.json`)](#versions-managed-via-versionsjson)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Development Workflow](#development-workflow)
- [Vanilla JavaScript Application Structure](#vanilla-javascript-application-structure)
- [Spring Boot SPA Controller](#spring-boot-spa-controller)
- [Best Practices](#best-practices)
- [CORS Configuration for Development](#cors-configuration-for-development)
- [Testing Your Application](#testing-your-application)
- [Additional Resources](#additional-resources)

## Overview
This guide covers creating front-end applications for Spring Boot using plain JavaScript (no framework), modern ES6+ features, and Vite for development tooling. This approach provides maximum simplicity with hot reload during development and optimized production builds integrated into the Spring Boot package.

## Versions (managed via `versions.json`)

> Regenerate this table with `node scripts/sync-versions-in-docs.mjs` after bumping `versions.json`.

<!-- versions:start -->
| Tool | Version |
|------|---------|
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| Vite | 8.x |
| Bootstrap | 5.3+ |
<!-- versions:end -->

> Default instructions assume `npm`; `corepack enable` for pnpm/yarn. No OpenAPI client generation provided.

## Architecture

**Development Mode:**

1. Vite dev server runs on port 5173 with hot reload
2. Proxies API calls to Spring Boot backend on port 8080
3. Fast HMR (Hot Module Replacement)

**Production Mode:**

1. JavaScript app built and minified by Vite
2. Static assets copied to `src/main/resources/static`
3. Served directly by Spring Boot

## Project Structure

```
my-spring-boot-app/
├── frontend/                    # Vanilla JS application
│   ├── src/
│   │   ├── main.js             # Application entry point
│   │   ├── router.js           # Client-side routing
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   └── utils/              # Utility functions
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

### 1. Create Vanilla JS Project

From your Spring Boot project root:

```bash
# Create Vite project with vanilla template
npm create vite@latest frontend -- --template vanilla

cd frontend
npm install
```

### 2. Configure Vite for Spring Boot Integration

Update `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
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
  
  esbuild: {
    // Drop console.log / console.debug in production builds; keep warn/error.
    pure: ['console.log', 'console.debug']
  },

  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild'
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
                        <nodeVersion>v24.15.0</nodeVersion>
                        <npmVersion>11.12.1</npmVersion>
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
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^8.0.0"
  },
  "dependencies": {
    "bootstrap": "^5.3.0"
  }
}
```

## Development Workflow

### Starting Development Environment

**Terminal 1 - Spring Boot Backend:**
```bash
./mvnw spring-boot:run
```

**Terminal 2 - Vite Frontend (with hot reload):**
```bash
cd frontend
npm run dev
```

Access the application at **http://localhost:5173** (Vite dev server with hot reload).

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

## Vanilla JavaScript Application Structure

### HTML Entry Point (frontend/index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring Boot App</title>
</head>
<body>
  <div id="app">
    <nav id="navbar"></nav>
    <main class="container my-5" id="content"></main>
    <footer id="footer"></footer>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### Main Entry Point (frontend/src/main.js)

```javascript
// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Components and Router
import { initRouter } from './router.js'
import { renderNavbar } from './components/navbar.js'
import { renderFooter } from './components/footer.js'

// Application styles
import './style.css'

// Initialize application
function initApp() {
  // Render static components
  renderNavbar()
  renderFooter()
  
  // Initialize router
  initRouter()
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
```

### Client-Side Router (frontend/src/router.js)

```javascript
import { renderHomePage } from './pages/home.js'
import { renderAboutPage } from './pages/about.js'
import { renderItemsPage } from './pages/items.js'
import { renderItemDetailPage } from './pages/item-detail.js'

const routes = {
  '/': renderHomePage,
  '/about': renderAboutPage,
  '/items': renderItemsPage,
  '/items/:id': renderItemDetailPage
}

function matchRoute(path) {
  // Exact match
  if (routes[path]) {
    return { handler: routes[path], params: {} }
  }
  
  // Pattern match (e.g., /items/:id)
  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$')
      const match = path.match(regex)
      if (match) {
        const params = {}
        const paramNames = pattern.match(/:[^/]+/g)
        if (paramNames) {
          paramNames.forEach((name, i) => {
            params[name.slice(1)] = match[i + 1]
          })
        }
        return { handler, params }
      }
    }
  }
  
  return null
}

export function navigate(path) {
  window.history.pushState({}, '', path)
  render()
}

function render() {
  const path = window.location.pathname
  const match = matchRoute(path)
  
  const contentEl = document.getElementById('content')
  
  if (match) {
    match.handler(match.params)
  } else {
    contentEl.innerHTML = '<h1>404 - Page Not Found</h1>'
  }
  
  // Update active nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === path)
  })
}

export function initRouter() {
  // Handle navigation
  window.addEventListener('popstate', render)
  
  // Handle link clicks
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-link]')) {
      e.preventDefault()
      navigate(e.target.getAttribute('href'))
    }
  })
  
  // Initial render
  render()
}
```

### Navigation Component (frontend/src/components/navbar.js)

```javascript
export function renderNavbar() {
  const navbarEl = document.getElementById('navbar')
  
  navbarEl.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand" href="/" data-link>My Spring Boot App</a>
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
              <a class="nav-link" href="/" data-link>Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/about" data-link>About</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/items" data-link>Items</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `
}
```

### Footer Component (frontend/src/components/footer.js)

```javascript
export function renderFooter() {
  const footerEl = document.getElementById('footer')
  
  footerEl.innerHTML = `
    <footer class="bg-light py-4 mt-auto">
      <div class="container text-center">
        <p class="text-muted mb-0">&copy; 2026 Spring Boot Application</p>
      </div>
    </footer>
  `
}
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
import { api } from './api.js'

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

### Home Page (frontend/src/pages/home.js)

```javascript
export function renderHomePage() {
  const contentEl = document.getElementById('content')
  
  contentEl.innerHTML = `
    <div class="home">
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <h1 class="display-4">Welcome to Spring Boot</h1>
          <p class="lead">
            A modern web application built with Spring Boot and Vanilla JavaScript.
          </p>

          <div class="card mt-4">
            <div class="card-body">
              <h5 class="card-title">Getting Started</h5>
              <p class="card-text">
                Your Spring Boot application with Vanilla JavaScript is running! This front-end
                is connected to your REST API endpoints with hot reload during development.
              </p>
              <button class="btn btn-primary" id="testButton">
                Test Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Add event listener
  document.getElementById('testButton').addEventListener('click', () => {
    alert('Button clicked! Your Vanilla JavaScript app is working.')
  })
}
```

### Items List Page (frontend/src/pages/items.js)

```javascript
import { itemService } from '../services/itemService.js'
import { navigate } from '../router.js'

let items = []

export async function renderItemsPage() {
  const contentEl = document.getElementById('content')
  
  // Initial render with loading state
  contentEl.innerHTML = `
    <div class="items">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Items</h1>
        <button class="btn btn-primary" id="createBtn">
          <i class="bi bi-plus-circle"></i> Create Item
        </button>
      </div>
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  `
  
  try {
    items = await itemService.getAll()
    renderItemsList()
  } catch (error) {
    showError(error.message)
  }
}

function renderItemsList() {
  const contentEl = document.getElementById('content')
  
  const itemsHtml = items.length > 0
    ? items.map(item => `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${escapeHtml(item.name)}</h5>
            <p class="card-text">${escapeHtml(item.description)}</p>
          </div>
          <div class="card-footer bg-transparent">
            <a href="/items/${item.id}" data-link class="btn btn-sm btn-outline-primary">
              View Details
            </a>
            <button class="btn btn-sm btn-outline-danger ms-2" data-delete="${item.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('')
    : '<div class="text-center py-5"><p class="text-muted">No items found. Create your first item to get started.</p></div>'
  
  contentEl.innerHTML = `
    <div class="items">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Items</h1>
        <button class="btn btn-primary" id="createBtn">
          <i class="bi bi-plus-circle"></i> Create Item
        </button>
      </div>
      <div id="errorContainer"></div>
      <div class="row">
        ${itemsHtml}
      </div>
    </div>
  `
  
  // Add event listeners
  document.getElementById('createBtn')?.addEventListener('click', handleCreate)
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => handleDelete(Number(e.target.dataset.delete)))
  })
}

function handleCreate() {
  alert('Create item functionality - implement modal or navigate to form')
}

async function handleDelete(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      await itemService.delete(id)
      items = items.filter(item => item.id !== id)
      renderItemsList()
    } catch (error) {
      showError(error.message)
    }
  }
}

function showError(message) {
  const errorContainer = document.getElementById('errorContainer')
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="alert alert-danger alert-dismissible" role="alert">
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

### Item Detail Page (frontend/src/pages/item-detail.js)

```javascript
import { itemService } from '../services/itemService.js'
import { navigate } from '../router.js'

export async function renderItemDetailPage(params) {
  const contentEl = document.getElementById('content')
  const itemId = Number(params.id)
  
  // Initial render with loading state
  contentEl.innerHTML = `
    <div class="item-detail">
      <a href="/items" data-link class="btn btn-sm btn-outline-secondary mb-3">
        &larr; Back to Items
      </a>
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  `
  
  try {
    const item = await itemService.getById(itemId)
    renderItemDetail(item)
  } catch (error) {
    showError(error.message)
  }
}

function renderItemDetail(item) {
  const contentEl = document.getElementById('content')
  
  const createdDate = new Date(item.createdAt).toLocaleDateString()
  
  contentEl.innerHTML = `
    <div class="item-detail">
      <a href="/items" data-link class="btn btn-sm btn-outline-secondary mb-3">
        &larr; Back to Items
      </a>
      <div id="errorContainer"></div>
      <div class="card">
        <div class="card-header">
          <h2>${escapeHtml(item.name)}</h2>
        </div>
        <div class="card-body">
          <p>${escapeHtml(item.description)}</p>
          <dl class="row">
            <dt class="col-sm-3">ID:</dt>
            <dd class="col-sm-9">${item.id}</dd>

            <dt class="col-sm-3">Created:</dt>
            <dd class="col-sm-9">${createdDate}</dd>
          </dl>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" id="editBtn">Edit</button>
          <button class="btn btn-danger ms-2" id="deleteBtn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    </div>
  `
  
  // Add event listeners
  document.getElementById('editBtn').addEventListener('click', handleEdit)
  document.getElementById('deleteBtn').addEventListener('click', (e) => {
    handleDelete(Number(e.target.dataset.id))
  })
}

function handleEdit() {
  alert('Edit functionality - implement edit form')
}

async function handleDelete(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      await itemService.delete(id)
      navigate('/items')
    } catch (error) {
      showError(error.message)
    }
  }
}

function showError(message) {
  const errorContainer = document.getElementById('errorContainer')
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="alert alert-danger alert-dismissible" role="alert">
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

### About Page (frontend/src/pages/about.js)

```javascript
export function renderAboutPage() {
  const contentEl = document.getElementById('content')
  
  contentEl.innerHTML = `
    <div class="about">
      <h1>About</h1>
      <p>This is a Spring Boot application with a Vanilla JavaScript front-end.</p>
    </div>
  `
}
```

### App Styles (frontend/src/style.css)

```css
:root {
  --primary-color: #0d6efd;
  --secondary-color: #6c757d;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}
```

## Spring Boot SPA Controller

To support client-side routing with HTML5 history mode, create a controller that forwards all non-API requests to index.html:

```java
package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {
    
    /**
     * Forward all routes to index.html to support client-side routing.
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

This controller ensures that refreshing the browser on any route (e.g., `/items/123`) serves the index.html file, allowing the client-side router to handle the routing.

## Best Practices

### 1. Code Organization

- Modular Structure: Separate concerns into different files (components, pages, services)
- ES6 Modules: Use ES6 import/export for code organization
- Component Pattern: Use functions that render reusable UI components
- Single Responsibility: Each file should have a single clear purpose

### 2. State Management

- Local State: Keep state close to where it's used
- Module-Level State: Use module-level variables for shared state
- Event-Driven: Use custom events for component communication
- Immutability: Prefer immutable data patterns

### 3. API Integration

- Service Layer: Separate API calls into service files
- Error Handling: Implement consistent error handling patterns
- Loading States: Show loading indicators during async operations
- Promises/Async-Await: Use modern async patterns

### 4. Routing

- History API: Use `pushState` for client-side navigation
- Pattern Matching: Support dynamic route parameters
- Link Handling: Use data attributes for navigation links
- 404 Handling: Implement fallback for unknown routes

### 5. Bootstrap Integration

- Import Once: Import Bootstrap CSS/JS in main.js
- Utility Classes: Leverage Bootstrap's utility classes
- Responsive Grid: Use Bootstrap's grid system for layouts
- Component JS: Use Bootstrap's JavaScript components (modals, dropdowns, etc.)

### 6. Performance

- **Dynamic `import()` for heavy modules** — load chart libraries, rich editors, or route handlers only when needed:
  ```javascript
  button.addEventListener('click', async () => {
    const { renderChart } = await import('./chart.js')
    renderChart(data)
  })
  ```
- **Code splitting** — Vite automatically creates a separate chunk for every dynamic `import()`.
- **Production build** — `./mvnw -Pprod package` (or `npm run build`) runs Vite's minification, tree shaking, and content-hashed filenames.
- **Long-term asset caching** — hashed `/assets/**` files can be served with a 1-year `Cache-Control` (see `references/SPRING-BOOT-4.md` → Performance → Static resource caching). Keep `index.html` uncached.
- **Avoid unnecessary re-renders** — since there's no framework diffing, update only the DOM nodes that actually changed rather than rebuilding whole sections.

### 7. Security

- XSS Prevention: Always escape user content before rendering
- CORS Configuration: Configure Spring Boot for Vite dev server
- CSRF Protection: Handle Spring Security CSRF tokens properly
- Input Validation: Validate user inputs on both client and server

### 8. Development Workflow

- Hot Module Replacement: Vite provides instant updates
- Browser DevTools: Use console, debugger, and network tools
- Error Messages: Provide clear error messages to users
- Code Comments: Document complex logic

## CORS Configuration for Development

Add this to your Spring Boot application to allow the Vite dev server:

```java
package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {
    
    /**
     * CORS configuration for development with Vite dev server.
     * In production, the app is served from the same origin,
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

- Console: Check for errors and debug output
- Network Tab: Monitor API calls to Spring Boot backend
- Debugger: Set breakpoints in JavaScript code
- Performance Tab: Profile rendering and API calls

## Additional Resources

- [MDN Web Docs - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Vite Documentation](https://vitejs.dev/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/)
- [Frontend Maven Plugin](https://github.com/eirslett/frontend-maven-plugin)
- [Spring Boot Static Content](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.static-content)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
