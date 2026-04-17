# Front-End Development with React for Spring Boot Applications

## Contents
- [Overview](#overview)
- [Versions (managed via `versions.json`)](#versions-managed-via-versionsjson)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Development Workflow](#development-workflow)
- [React Application Structure](#react-application-structure)
- [Spring Boot SPA Controller](#spring-boot-spa-controller)
- [Best Practices](#best-practices)
- [CORS Configuration for Development](#cors-configuration-for-development)
- [Testing Your Application](#testing-your-application)
- [Additional Resources](#additional-resources)

## Overview
This guide covers creating front-end applications for Spring Boot using React 19 and Vite, with hot reload during development and optimized production builds integrated into the Spring Boot package.

## Versions (managed via `versions.json`)

> Regenerate this table with `node scripts/sync-versions-in-docs.mjs` after bumping `versions.json`.

<!-- versions:start -->
| Tool | Version |
|------|---------|
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| React | 19.x |
| Vite | 8.x |
| React Router | 6.x |
<!-- versions:end -->

> Tip: `corepack enable` for pnpm/yarn if desired. Default instructions assume `npm`. No OpenAPI client generation is provided; use `fetch`/`axios` as needed.

## Architecture

**Development Mode:**

1. Vite dev server runs on port 5173 with hot reload
2. Proxies API calls to Spring Boot backend on port 8080
3. Fast HMR (Hot Module Replacement)

**Production Mode:**

1. React app built and minified by Vite
2. Static assets copied to `src/main/resources/static`
3. Served directly by Spring Boot

## Project Structure

```
my-spring-boot-app/
├── frontend/                    # React application
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Root component
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom hooks
│   │   ├── context/            # Context providers
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

### 1. Create React Project

From your Spring Boot project root:

```bash
# Create React project with Vite
npm create vite@latest frontend -- --template react

cd frontend
npm install

# Install React Router, Bootstrap and Bootstrap Icons
npm install react-router-dom bootstrap@5.3.8 bootstrap-icons@1.13.1
```

### 2. Configure Vite for Spring Boot Integration

Update `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
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
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

## Development Workflow

### Starting Development Environment

**Terminal 1 - Spring Boot Backend:**
```bash
./mvnw spring-boot:run
```

**Terminal 2 - React Frontend (with hot reload):**
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

## React Application Structure

### Main Entry Point (frontend/src/main.jsx)

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Bootstrap CSS + JS + Icons
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Root Component (frontend/src/App.jsx)

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ItemsPage from './pages/ItemsPage'
import ItemDetailPage from './pages/ItemDetailPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="container my-5">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
```

### Navigation Component (frontend/src/components/Navbar.jsx)

```jsx
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">My Spring Boot App</Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">About</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/items">Items</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
```

### Footer Component (frontend/src/components/Footer.jsx)

```jsx
export default function Footer() {
  return (
    <footer className="bg-light py-4 mt-auto">
      <div className="container text-center">
        <p className="text-muted mb-0">&copy; 2026 Spring Boot Application</p>
      </div>
    </footer>
  )
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

### Custom Hook for Items (frontend/src/hooks/useItems.js)

```javascript
import { useState, useEffect } from 'react'
import { itemService } from '../services/itemService'

export function useItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await itemService.getAll()
      setItems(data)
    } catch (err) {
      setError(err.message)
      console.error('Failed to fetch items:', err)
    } finally {
      setLoading(false)
    }
  }

  const createItem = async (item) => {
    setLoading(true)
    setError(null)
    try {
      const created = await itemService.create(item)
      setItems(prev => [...prev, created])
      return created
    } catch (err) {
      setError(err.message)
      console.error('Failed to create item:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async (id, item) => {
    setLoading(true)
    setError(null)
    try {
      const updated = await itemService.update(id, item)
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      return updated
    } catch (err) {
      setError(err.message)
      console.error('Failed to update item:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (id) => {
    setLoading(true)
    setError(null)
    try {
      await itemService.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setError(err.message)
      console.error('Failed to delete item:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem
  }
}
```

### Home Page (frontend/src/pages/HomePage.jsx)

```jsx
export default function HomePage() {
  const handleClick = () => {
    alert('Button clicked! Your React app is working.')
  }

  return (
    <div className="home">
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <h1 className="display-4">Welcome to Spring Boot</h1>
          <p className="lead">
            A modern web application built with Spring Boot and React 19.
          </p>

          <div className="card mt-4">
            <div className="card-body">
              <h5 className="card-title">Getting Started</h5>
              <p className="card-text">
                Your Spring Boot application with React is running! This front-end
                is connected to your REST API endpoints with hot reload during development.
              </p>
              <button className="btn btn-primary" onClick={handleClick}>
                Test Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Items List Page (frontend/src/pages/ItemsPage.jsx)

```jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useItems } from '../hooks/useItems'

export default function ItemsPage() {
  const { items, loading, error, fetchItems, deleteItem } = useItems()

  useEffect(() => {
    fetchItems()
  }, [])

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteItem(id)
    }
  }

  const handleCreate = () => {
    alert('Create item functionality - implement modal or navigate to form')
  }

  return (
    <div className="items">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Items</h1>
        <button className="btn btn-primary" onClick={handleCreate}>
          <i className="bi bi-plus-circle"></i> Create Item
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => {}}
          ></button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Items List */}
      {!loading && items.length > 0 && (
        <div className="row">
          {items.map(item => (
            <div key={item.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{item.name}</h5>
                  <p className="card-text">{item.description}</p>
                </div>
                <div className="card-footer bg-transparent">
                  <Link
                    to={`/items/${item.id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    View Details
                  </Link>
                  <button
                    className="btn btn-sm btn-outline-danger ms-2"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-5">
          <p className="text-muted">No items found. Create your first item to get started.</p>
        </div>
      )}
    </div>
  )
}
```

### Item Detail Page (frontend/src/pages/ItemDetailPage.jsx)

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { itemService } from '../services/itemService'

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await itemService.getById(id)
        setItem(data)
      } catch (err) {
        setError(err.message)
        console.error('Failed to fetch item:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id])

  const handleEdit = () => {
    alert('Edit functionality - implement edit form')
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemService.delete(id)
        navigate('/items')
      } catch (err) {
        setError(err.message)
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="item-detail">
      <Link to="/items" className="btn btn-sm btn-outline-secondary mb-3">
        &larr; Back to Items
      </Link>

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Item Details */}
      {item && (
        <div className="card">
          <div className="card-header">
            <h2>{item.name}</h2>
          </div>
          <div className="card-body">
            <p>{item.description}</p>
            <dl className="row">
              <dt className="col-sm-3">ID:</dt>
              <dd className="col-sm-9">{item.id}</dd>

              <dt className="col-sm-3">Created:</dt>
              <dd className="col-sm-9">{formatDate(item.createdAt)}</dd>
            </dl>
          </div>
          <div className="card-footer">
            <button className="btn btn-primary" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger ms-2" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

## Spring Boot SPA Controller

To support React Router with HTML5 history mode, implement an `ErrorController` that forwards 404s for non-API paths to `index.html`. This lets `ResourceHttpRequestHandler` serve static files first, lets `@RestController` mappings win naturally, and only kicks in on unmapped paths — keeping proper JSON 404s for `/api/**` and `/actuator/**`:

```java
package com.example.demo.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController implements ErrorController {

    /**
     * When no controller matches, Spring dispatches to /error. For non-API
     * 404s we forward to index.html so React Router can take over; API and
     * actuator 404s propagate normally with their default error response.
     */
    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request) {
        Integer status = (Integer) request.getAttribute(
                RequestDispatcher.ERROR_STATUS_CODE);
        String path = (String) request.getAttribute(
                RequestDispatcher.ERROR_REQUEST_URI);

        if (status != null
                && status == HttpStatus.NOT_FOUND.value()
                && path != null
                && !path.startsWith("/api/")
                && !path.startsWith("/actuator/")) {
            return "forward:/index.html";
        }
        return ResponseEntity
                .status(status != null ? status : 500)
                .build();
    }
}
```

This approach ensures that refreshing the browser on any React route (e.g., `/items/123`) serves `index.html` so React Router can render the page, while typos under `/api/**` or `/actuator/**` still return a real 404.

## Best Practices

### 1. Component Organization

- Functional Components: Use functional components with hooks
- Component Naming: Use PascalCase for component names (e.g., `ItemCard.jsx`)
- Props Validation: Use PropTypes or TypeScript for type checking
- Single Responsibility: Each component should have a single purpose

### 2. State Management

- Local State: Use `useState` for component-local state
- Custom Hooks: Extract reusable logic into custom hooks
- Context API: Use Context for global state when needed
- React Query (Optional): Consider for advanced data fetching and caching

### 3. API Integration

- Service Layer: Separate API calls into service files
- Error Handling: Implement consistent error handling patterns
- Loading States: Track loading states explicitly
- TypeScript (Optional): Add TypeScript for better type safety

### 4. Routing

- React Router: Use React Router for navigation
- Lazy Loading: Use `React.lazy()` for code splitting
- Named Routes: Consider using named constants for routes
- Route Parameters: Use `useParams` hook for accessing route params

### 5. Bootstrap Integration

- Import Once: Import Bootstrap CSS/JS in `main.jsx`
- Utility Classes: Leverage Bootstrap's utility classes
- Responsive Grid: Use Bootstrap's grid system for layouts
- Icons: Bootstrap Icons are installed and imported in `main.jsx`; use `<i className="bi bi-..."/>` anywhere

### 6. Performance

- **Route-level code splitting** — use `React.lazy` + `<Suspense>` for page components:
  ```jsx
  const ItemsPage = React.lazy(() => import('./pages/ItemsPage'))
  // wrap <Routes> in <Suspense fallback={<Spinner />}>
  ```
- **Memoization** — `React.memo`, `useMemo`, `useCallback` for components and values that are expensive to compute *and* rendered often. Don't wrap everything; unnecessary memoization costs more than it saves.
- **Production build** — ship the bundle produced by `./mvnw -Pprod package` (or `npm run build`). Vite applies minification, tree shaking, and content-hashed filenames.
- **Long-term asset caching** — hashed `/assets/**` files are safe to cache for a year. Configure `Cache-Control` on the Spring side (see `references/SPRING-BOOT-4.md` → Performance → Static resource caching). Keep `index.html` uncached.

### 7. Development Workflow

- Hot Module Replacement: Vite provides instant updates
- Environment Variables: Use `.env` files for configuration
- ESLint: Maintain code quality with ESLint
- Component Testing: Consider Vitest or React Testing Library

### 8. Security

- CORS Configuration: Configure Spring Boot for Vite dev server during development
- CSRF Protection: Handle Spring Security CSRF tokens properly
- Input Validation: Validate user inputs on both client and server
- XSS Protection: React escapes content by default in JSX

## CORS Configuration for Development

Add this to your Spring Boot application to allow the Vite dev server. The bean is only registered when the `dev` profile is active, so no CORS filter is created in production:

```java
package com.example.demo.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
@Profile("dev")
public class CorsConfig {

    /**
     * Allows the Vite dev server (http://localhost:5173) to call the
     * Spring Boot API during development. In production the React app
     * is served from the same origin, so no CORS configuration is
     * registered.
     */
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
```

Start Spring Boot with the `dev` profile active:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
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
- **React DevTools Extension**: Install for inspecting React components and state
- **Console**: Check for errors and API responses
- **Network Tab**: Monitor API calls to Spring Boot backend
- **Performance Tab**: Profile React rendering and API calls

## Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/)
- [Frontend Maven Plugin](https://github.com/eirslett/frontend-maven-plugin)
- [Spring Boot Static Content](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.static-content)
