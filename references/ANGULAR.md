# Front-End Development with Angular for Spring Boot Applications

## Contents
- [Overview](#overview)
- [Versions (managed via `versions.json`)](#versions-managed-via-versionsjson)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Development Workflow](#development-workflow)
- [Angular Application Structure](#angular-application-structure)
- [Spring Boot SPA Controller](#spring-boot-spa-controller)
- [Best Practices](#best-practices)
- [CORS Configuration for Development](#cors-configuration-for-development)
- [Testing Your Application](#testing-your-application)
- [Additional Resources](#additional-resources)

## Overview
This guide covers creating front-end applications for Spring Boot using Angular 21 and Angular CLI, with hot reload during development and optimized production builds integrated into the Spring Boot package.

## Versions (managed via `versions.json`)

> Regenerate this table with `node scripts/sync-versions-in-docs.mjs` after bumping `versions.json`.

<!-- versions:start -->
| Tool | Version |
|------|---------|
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| Angular | 21.x |
| Angular Router | 21.x |
<!-- versions:end -->

> Use `npx @angular/cli@latest` to scaffold; keep alignment with `engines` constraints. No OpenAPI client generation provided.

## Architecture

**Development Mode:**

1. Angular dev server runs on port 4200 with hot reload
2. Proxies API calls to Spring Boot backend on port 8080
3. Fast incremental builds

**Production Mode:**

1. Angular app built and minified
2. Static assets copied to `src/main/resources/static`
3. Served directly by Spring Boot

## Project Structure

```
my-spring-boot-app/
├── frontend/                    # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts     # Root component
│   │   │   ├── app.component.html   # Root template
│   │   │   ├── app.routes.ts        # Routing configuration
│   │   │   ├── components/          # Shared components
│   │   │   ├── pages/               # Page components
│   │   │   ├── services/            # Services and API calls
│   │   │   └── models/              # TypeScript interfaces
│   │   ├── index.html               # HTML entry point
│   │   ├── main.ts                  # Angular bootstrap
│   │   └── styles.css               # Global styles
│   ├── angular.json                 # Angular configuration
│   ├── package.json                 # Node dependencies
│   ├── tsconfig.json                # TypeScript config
│   └── .gitignore
├── src/
│   └── main/
│       ├── java/                    # Spring Boot backend
│       └── resources/
│           └── static/              # Production build output (auto-generated)
└── pom.xml
```

## Setup Instructions

### 1. Create Angular Project

From your Spring Boot project root:

```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Create Angular project
ng new frontend --routing --style=css --skip-git

cd frontend

# Install Bootstrap and Bootstrap Icons
npm install bootstrap@5.3.8 bootstrap-icons@1.13.1
```

### 2. Configure Angular for Spring Boot Integration

Update `frontend/angular.json` - modify the `build` section:

```json
{
  "projects": {
    "frontend": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "../src/main/resources/static",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": [],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "node_modules/bootstrap/dist/css/bootstrap.min.css",
              "node_modules/bootstrap-icons/font/bootstrap-icons.css",
              "src/styles.css"
            ],
            "scripts": [
              "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"
            ]
          }
        },
        "serve": {
          "options": {
            "proxyConfig": "proxy.conf.json"
          }
        }
      }
    }
  }
}
```

Create `frontend/proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
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
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build --configuration production",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  }
}
```

## Development Workflow

### Starting Development Environment

**Terminal 1 - Spring Boot Backend:**
```bash
./mvnw spring-boot:run
```

**Terminal 2 - Angular Frontend (with hot reload):**
```bash
cd frontend
npm start
```

Access the application at **http://localhost:4200** (Angular dev server with hot reload).

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

## Angular Application Structure

### App Configuration (frontend/src/app/app.config.ts)

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi())
  ]
};
```

### Routing Configuration (frontend/src/app/app.routes.ts)

```typescript
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ItemsComponent } from './pages/items/items.component';
import { ItemDetailComponent } from './pages/item-detail/item-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'items', component: ItemsComponent },
  { path: 'items/:id', component: ItemDetailComponent },
  { path: '**', redirectTo: '' }
];
```

### Root Component (frontend/src/app/app.component.ts)

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <div class="app-container">
      <app-navbar></app-navbar>
      <main class="container my-5">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
  `]
})
export class AppComponent {
  title = 'My Spring Boot App';
}
```

### Navigation Component (frontend/src/app/components/navbar/navbar.component.ts)

Generate with: `ng generate component components/navbar`

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand" routerLink="/">My Spring Boot App</a>
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
              <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/about" routerLinkActive="active">About</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/items" routerLinkActive="active">Items</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `,
  styles: []
})
export class NavbarComponent {}
```

### Footer Component (frontend/src/app/components/footer/footer.component.ts)

Generate with: `ng generate component components/footer`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  template: `
    <footer class="bg-light py-4 mt-auto">
      <div class="container text-center">
        <p class="text-muted mb-0">&copy; 2026 Spring Boot Application</p>
      </div>
    </footer>
  `,
  styles: []
})
export class FooterComponent {}
```

### Models (frontend/src/app/models/item.model.ts)

```typescript
export interface Item {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}
```

### API Service (frontend/src/app/services/item.service.ts)

Generate with: `ng generate service services/item`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Item } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private apiUrl = '/api/items';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  create(item: Partial<Item>): Observable<Item> {
    return this.http.post<Item>(this.apiUrl, item)
      .pipe(catchError(this.handleError));
  }

  update(id: number, item: Partial<Item>): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/${id}`, item)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
```

### Home Page (frontend/src/app/pages/home/home.component.ts)

Generate with: `ng generate component pages/home`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  template: `
    <div class="home">
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <h1 class="display-4">Welcome to Spring Boot</h1>
          <p class="lead">
            A modern web application built with Spring Boot and Angular 21.
          </p>

          <div class="card mt-4">
            <div class="card-body">
              <h5 class="card-title">Getting Started</h5>
              <p class="card-text">
                Your Spring Boot application with Angular is running! This front-end
                is connected to your REST API endpoints with hot reload during development.
              </p>
              <button class="btn btn-primary" (click)="handleClick()">
                Test Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class HomeComponent {
  handleClick() {
    alert('Button clicked! Your Angular app is working.');
  }
}
```

### Items List Page (frontend/src/app/pages/items/items.component.ts)

Generate with: `ng generate component pages/items`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="items">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Items</h1>
        <button class="btn btn-primary" (click)="handleCreate()">
          <i class="bi bi-plus-circle"></i> Create Item
        </button>
      </div>

      <!-- Error Alert -->
      @if (error) {
        <div class="alert alert-danger alert-dismissible" role="alert">
          {{ error }}
          <button
            type="button"
            class="btn-close"
            (click)="error = null"
          ></button>
        </div>
      }

      <!-- Loading Spinner -->
      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      }

      <!-- Items List -->
      @if (!loading && items.length > 0) {
        <div class="row">
          @for (item of items; track item.id) {
            <div class="col-md-6 col-lg-4 mb-4">
              <div class="card h-100">
                <div class="card-body">
                  <h5 class="card-title">{{ item.name }}</h5>
                  <p class="card-text">{{ item.description }}</p>
                </div>
                <div class="card-footer bg-transparent">
                  <a
                    [routerLink]="['/items', item.id]"
                    class="btn btn-sm btn-outline-primary"
                  >
                    View Details
                  </a>
                  <button
                    class="btn btn-sm btn-outline-danger ms-2"
                    (click)="handleDelete(item.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading && items.length === 0) {
        <div class="text-center py-5">
          <p class="text-muted">No items found. Create your first item to get started.</p>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ItemsComponent implements OnInit {
  items: Item[] = [];
  loading = false;
  error: string | null = null;

  constructor(private itemService: ItemService) {}

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading = true;
    this.error = null;
    this.itemService.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  handleCreate() {
    alert('Create item functionality - implement modal or navigate to form');
  }

  handleDelete(id: number) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.itemService.delete(id).subscribe({
        next: () => {
          this.items = this.items.filter(item => item.id !== id);
        },
        error: (err) => {
          this.error = err.message;
        }
      });
    }
  }
}
```

### Item Detail Page (frontend/src/app/pages/item-detail/item-detail.component.ts)

Generate with: `ng generate component pages/item-detail`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="item-detail">
      <a routerLink="/items" class="btn btn-sm btn-outline-secondary mb-3">
        &larr; Back to Items
      </a>

      <!-- Loading -->
      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      }

      <!-- Error -->
      @if (error) {
        <div class="alert alert-danger" role="alert">
          {{ error }}
        </div>
      }

      <!-- Item Details -->
      @if (item) {
        <div class="card">
          <div class="card-header">
            <h2>{{ item.name }}</h2>
          </div>
          <div class="card-body">
            <p>{{ item.description }}</p>
            <dl class="row">
              <dt class="col-sm-3">ID:</dt>
              <dd class="col-sm-9">{{ item.id }}</dd>

              <dt class="col-sm-3">Created:</dt>
              <dd class="col-sm-9">{{ item.createdAt | date }}</dd>
            </dl>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary" (click)="handleEdit()">Edit</button>
            <button class="btn btn-danger ms-2" (click)="handleDelete()">Delete</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ItemDetailComponent implements OnInit {
  item: Item | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemService: ItemService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadItem(id);
  }

  loadItem(id: number) {
    this.loading = true;
    this.error = null;
    this.itemService.getById(id).subscribe({
      next: (data) => {
        this.item = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  handleEdit() {
    alert('Edit functionality - implement edit form');
  }

  handleDelete() {
    if (this.item && confirm('Are you sure you want to delete this item?')) {
      this.itemService.delete(this.item.id).subscribe({
        next: () => {
          this.router.navigate(['/items']);
        },
        error: (err) => {
          this.error = err.message;
        }
      });
    }
  }
}
```

### Main Bootstrap (frontend/src/main.ts)

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

## Spring Boot SPA Controller

To support Angular Router with HTML5 history mode, implement an `ErrorController` that forwards 404s for non-API paths to `index.html`. This lets `ResourceHttpRequestHandler` serve static files first, lets `@RestController` mappings win naturally, and only kicks in on unmapped paths — keeping proper JSON 404s for `/api/**` and `/actuator/**`:

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
     * 404s we forward to index.html so Angular Router can take over; API
     * and actuator 404s propagate normally with their default error response.
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

This approach ensures that refreshing the browser on any Angular route (e.g., `/items/123`) serves `index.html` so Angular Router can render the page, while typos under `/api/**` or `/actuator/**` still return a real 404.

## Best Practices

### 1. Component Organization

- Standalone Components: Use standalone components (Angular 14+)
- Component Naming: Use kebab-case for file names (e.g., `item-card.component.ts`)
- TypeScript: Leverage TypeScript's type safety
- Single Responsibility: Each component should have a single purpose

### 2. State Management

- Services: Use services for state management
- RxJS: Leverage Observables for reactive programming
- NgRx (Optional): Consider NgRx for complex state management
- Signals (New): Consider Angular Signals for simpler state

### 3. API Integration

- HttpClient: Use Angular's HttpClient for API calls
- Services: Separate API calls into injectable services
- Error Handling: Implement consistent error handling with RxJS operators
- Interceptors: Use HTTP interceptors for auth, errors, etc.

### 4. Routing

- RouterModule: Use Angular Router for navigation
- Lazy Loading: Use `loadChildren` for route-based code splitting
- Route Guards: Implement guards for authentication and authorization
- Route Parameters: Use `ActivatedRoute` for accessing route params

### 5. Bootstrap Integration

- Import in angular.json: Add Bootstrap to styles and scripts arrays
- Utility Classes: Leverage Bootstrap's utility classes
- Responsive Grid: Use Bootstrap's grid system for layouts
- Icons: Bootstrap Icons are wired into `angular.json` styles; use `<i class="bi bi-..."></i>` anywhere

### 6. Performance

- **Lazy-loaded routes** — use `loadComponent` (standalone components) in `app.routes.ts`:
  ```typescript
  { path: 'items', loadComponent: () => import('./pages/items/items.component').then(m => m.ItemsComponent) }
  ```
- **OnPush change detection** — set `changeDetection: ChangeDetectionStrategy.OnPush` on components that render from immutable inputs or signals. Drastically cuts dirty-checking cost.
- **`@for` with `track`** — always provide a `track` expression in `@for` (or `trackBy` with `*ngFor`) so Angular reuses DOM nodes.
- **Signals over `async` pipes on hot paths** — signals skip the zone roundtrip and integrate cleanly with OnPush.
- **Production build** — `./mvnw -Pprod package` runs `ng build --configuration production`, which enables AOT, minification, tree shaking, and file hashing.
- **Long-term asset caching** — hashed output is safe to cache for a year; configure `Cache-Control` on the Spring side (see `references/SPRING-BOOT-4.md` → Performance → Static resource caching). Keep `index.html` uncached.

### 7. Development Workflow

- Hot Module Replacement: Angular CLI provides instant updates
- Environment Files: Use environment files for configuration
- TypeScript Strict Mode: Enable strict mode for better type safety
- Testing: Use Jasmine and Karma for unit testing

### 8. Security

- CORS Configuration: Configure Spring Boot for Angular dev server
- CSRF Protection: Handle Spring Security CSRF tokens properly
- Input Validation: Validate user inputs on both client and server
- Sanitization: Angular sanitizes content automatically

## CORS Configuration for Development

Add this to your Spring Boot application to allow the Angular dev server. The bean is only registered when the `dev` profile is active, so no CORS filter is created in production:

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
     * Allows the Angular dev server (http://localhost:4200) to call the
     * Spring Boot API during development. In production the Angular app
     * is served from the same origin, so no CORS configuration is
     * registered.
     */
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of("http://localhost:4200"));
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
2. Start Angular dev server: `cd frontend && npm start`
3. Navigate to `http://localhost:4200`
4. Make changes and see them instantly with hot reload

### Production Testing
1. Build: `./mvnw clean package`
2. Run: `java -jar target/my-app.jar`
3. Navigate to `http://localhost:8080`
4. All routes should work including direct navigation to `/items`, `/about`, etc.

### Browser DevTools
- **Angular DevTools Extension**: Install for inspecting Angular components and services
- **Console**: Check for errors and API responses
- **Network Tab**: Monitor API calls to Spring Boot backend
- **Performance Tab**: Profile Angular rendering and API calls

## Additional Resources

- [Angular Documentation](https://angular.io/)
- [Angular CLI Documentation](https://angular.io/cli)
- [RxJS Documentation](https://rxjs.dev/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/)
- [Frontend Maven Plugin](https://github.com/eirslett/frontend-maven-plugin)
- [Spring Boot Static Content](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.static-content)
