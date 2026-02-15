# Spring Security Best Practices Guide

## Overview
This guide covers Spring Security configuration for Spring Boot 4 applications. Spring Security is **optional** - only include it when you need authentication and authorization. This guide provides best practices for common security scenarios.

**When to Add Spring Security:**

✅ **Add when you need:**
- User authentication (login/logout)
- API authentication (JWT, OAuth2)
- Authorization (role-based access control)
- Protection against common vulnerabilities (CSRF, XSS)
- Secure endpoints and resources

❌ **Don't add if:**
- Building a simple public API
- Creating a prototype or proof of concept
- No authentication/authorization requirements

## Prerequisites

1. Spring Boot 4 application
2. Basic understanding of authentication and authorization concepts
3. Database for user storage (optional - can use in-memory for testing)

## Problem Details (RFC 7807)
Enable globally in Spring Boot 4:
```properties
spring.mvc.problemdetails.enabled=true
```
Custom exception handler example:
```java
@RestControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(UserNotFoundException.class)
  ProblemDetail handle(UserNotFoundException ex) {
    var pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("User not found");
    pd.setProperty("error_code", "USER_NOT_FOUND");
    return pd;
  }
}
```

## CORS Configuration (API-only)
```java
@Configuration
public class CorsConfig {
  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    var config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:4200"));
    config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE"));
    config.setAllowedHeaders(List.of("Authorization","Content-Type"));
    config.setAllowCredentials(true);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
```

## Maven Dependencies

Add Spring Security starter to your `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- For JWT support -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>

<!-- For OAuth2 support -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

## Basic Security Configuration

### Default Behavior

Once you add Spring Security, **all endpoints are protected by default**. Spring Boot auto-generates a password on startup:

```
Using generated security password: 8e557245-73e2-4286-969a-ff57fe326336
```

### Custom Security Configuration

**For Spring Boot 4, use the new lambda DSL (method chaining is deprecated):**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/", "/public/**", "/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .permitAll()
            )
            .logout(logout -> logout
                .permitAll()
            );
        
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**Key Points:**

1. **Lambda DSL**: Spring Boot 4 requires lambda-based configuration
2. **Public Endpoints**: Use `.requestMatchers(...).permitAll()` for public access
3. **Password Encoding**: Always use `BCryptPasswordEncoder` (never plain text)
4. **HTTPS Only**: Use HTTPS in production (configure `server.ssl.*` properties)

## User Authentication

### In-Memory Users (Development Only)

For testing and development:

```java
@Bean
public UserDetailsService userDetailsService() {
    UserDetails user = User.builder()
        .username("user")
        .password(passwordEncoder().encode("password"))
        .roles("USER")
        .build();
    
    UserDetails admin = User.builder()
        .username("admin")
        .password(passwordEncoder().encode("admin"))
        .roles("USER", "ADMIN")
        .build();
    
    return new InMemoryUserDetailsManager(user, admin);
}
```

### Database Users (Production)

**User Entity:**

```java
@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(nullable = false)
    private boolean enabled = true;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    private Set<String> roles = new HashSet<>();
    
    // Getters and setters
}
```

**UserDetails Implementation:**

```java
public class SecurityUser implements UserDetails {
    
    private final User user;
    
    public SecurityUser(User user) {
        this.user = user;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
    }
    
    @Override
    public String getPassword() {
        return user.getPassword();
    }
    
    @Override
    public String getUsername() {
        return user.getUsername();
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return user.isEnabled();
    }
}
```

**UserDetailsService Implementation:**

```java
@Service
public class DatabaseUserDetailsService implements UserDetailsService {
    
    private final UserRepository userRepository;
    
    public DatabaseUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return new SecurityUser(user);
    }
}
```

## JWT Authentication (REST APIs)

### JWT Configuration

```java
@Configuration
@EnableWebSecurity
public class JwtSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public JwtSecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // Disable CSRF for stateless APIs
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/auth/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### JWT Service

```java
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration:86400000}")  // 24 hours default
    private long expiration;

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(getSigningKey())
            .compact();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

### JWT Authentication Filter

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, 
                                   UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        final String username = jwtService.extractUsername(jwt);

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (jwtService.validateToken(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

### Authentication Controller

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager,
                         UserDetailsService userDetailsService,
                         JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsername(),
                request.getPassword()
            )
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        String token = jwtService.generateToken(userDetails);

        return ResponseEntity.ok(new AuthResponse(token));
    }
}

record AuthRequest(String username, String password) {}
record AuthResponse(String token) {}
```

### Configuration Properties

```properties
# application.properties
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000

# Generate a secure secret:
# openssl rand -base64 64
```

**Important:** Never commit `JWT_SECRET` to version control. Use environment variables.

## Authorization

### Method-Level Security

Enable method security:

```java
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
    // No additional configuration needed
}
```

Use annotations on methods:

```java
@Service
public class UserService {

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(Long id) {
        // Only admins can delete users
    }

    @PreAuthorize("hasRole('USER')")
    public User getProfile(Long id) {
        // Any authenticated user can view profiles
    }

    @PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    public void updateUser(Long id, UserUpdateRequest request) {
        // Users can update their own profile, admins can update any
    }
}
```

### Role-Based Access Control

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/", "/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/user/**").hasAnyRole("USER", "ADMIN")
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
```

## CORS Configuration

For REST APIs with front-end clients:

```java
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:5173", "https://example.com")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
```

Or in properties:

```properties
spring.web.cors.allowed-origins=http://localhost:5173,https://example.com
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true
spring.web.cors.max-age=3600
```

## OAuth2 and Social Login

### OAuth2 Resource Server

For validating JWT tokens from OAuth2 providers (e.g., Azure AD, Okta):

```java
@Configuration
@EnableWebSecurity
public class OAuth2SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            );

        return http.build();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = 
            new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtAuthenticationConverter = 
            new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(
            grantedAuthoritiesConverter);
        return jwtAuthenticationConverter;
    }
}
```

Configuration:

```properties
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://login.microsoftonline.com/{tenant-id}/v2.0
spring.security.oauth2.resourceserver.jwt.audiences=api://{client-id}
```

## Security Best Practices

### 1. Password Security

✅ **Always hash passwords:**

```java
@Service
public class UserService {

    private final PasswordEncoder passwordEncoder;

    public void createUser(String username, String password) {
        String encodedPassword = passwordEncoder.encode(password);
        // Save user with encoded password
    }
}
```

❌ **Never store plain text passwords**

### 2. CSRF Protection

For traditional web applications (form-based):

```java
http.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
);
```

For stateless REST APIs:

```java
http.csrf(csrf -> csrf.disable());  // Safe for stateless JWT APIs
```

### 3. HTTPS Only

In production, enforce HTTPS:

```properties
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=${KEYSTORE_PASSWORD}
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=tomcat
```

Redirect HTTP to HTTPS:

```java
http.requiresChannel(channel -> channel
    .anyRequest().requiresSecure()
);
```

### 4. Security Headers

Spring Security adds secure headers by default. Customize if needed:

```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'")
    )
    .frameOptions(frame -> frame.deny())
    .xssProtection(xss -> xss.disable())  // Modern browsers handle this
);
```

### 5. Session Management

For stateless APIs:

```java
http.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
);
```

For traditional web apps:

```java
http.sessionManagement(session -> session
    .sessionFixation(fix -> fix.newSession())
    .maximumSessions(1)
    .maxSessionsPreventsLogin(true)
);
```

### 6. Rate Limiting

Implement rate limiting for sensitive endpoints (login, registration):

**Using Bucket4j:**

```xml
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.7.0</version>
</dependency>
```

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) 
            throws ServletException, IOException {

        String key = getClientIP(request);
        Bucket bucket = cache.computeIfAbsent(key, k -> createNewBucket());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(429);  // Too Many Requests
            response.getWriter().write("Too many requests");
        }
    }

    private Bucket createNewBucket() {
        Bandwidth limit = Bandwidth.simple(100, Duration.ofMinutes(1));
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
```

## Testing Security

### Testing with Spring Security Test

```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Controller Tests:**

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicEndpoint_shouldBeAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/public/info"))
            .andExpect(status().isOk());
    }

    @Test
    void protectedEndpoint_shouldReturn401WithoutAuth() throws Exception {
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void protectedEndpoint_shouldBeAccessibleWithAuth() throws Exception {
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminEndpoint_shouldBeAccessibleByAdmin() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    void adminEndpoint_shouldBeForbiddenForUser() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isForbidden());
    }
}
```

## Common Security Patterns

### User Registration

```java
@PostMapping("/api/auth/register")
public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
    if (userRepository.existsByUsername(request.getUsername())) {
        return ResponseEntity.badRequest().build();
    }

    User user = new User();
    user.setUsername(request.getUsername());
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setRoles(Set.of("USER"));
    user.setEnabled(true);

    userRepository.save(user);

    return ResponseEntity.ok(new UserResponse(user.getId(), user.getUsername()));
}
```

### Password Reset

```java
@PostMapping("/api/auth/forgot-password")
public ResponseEntity<Void> forgotPassword(@RequestBody ForgotPasswordRequest request) {
    User user = userRepository.findByEmail(request.getEmail())
        .orElseThrow(() -> new NotFoundException("User not found"));

    String resetToken = UUID.randomUUID().toString();
    user.setResetToken(resetToken);
    user.setResetTokenExpiry(LocalDateTime.now().plusHours(24));
    userRepository.save(user);

    // Send email with reset link
    emailService.sendPasswordResetEmail(user.getEmail(), resetToken);

    return ResponseEntity.ok().build();
}

@PostMapping("/api/auth/reset-password")
public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordRequest request) {
    User user = userRepository.findByResetToken(request.getToken())
        .orElseThrow(() -> new BadRequestException("Invalid token"));

    if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
        throw new BadRequestException("Token expired");
    }

    user.setPassword(passwordEncoder.encode(request.getNewPassword()));
    user.setResetToken(null);
    user.setResetTokenExpiry(null);
    userRepository.save(user);

    return ResponseEntity.ok().build();
}
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Hash passwords with BCrypt (never plain text)
- [ ] Use environment variables for secrets (JWT secret, DB password)
- [ ] Enable CSRF protection for traditional web apps
- [ ] Disable CSRF only for stateless REST APIs
- [ ] Implement rate limiting on authentication endpoints
- [ ] Use strong JWT secrets (64+ characters, base64 encoded)
- [ ] Set appropriate JWT expiration times
- [ ] Validate and sanitize all user input
- [ ] Use `@PreAuthorize` for method-level security
- [ ] Test security with `@WithMockUser` and integration tests
- [ ] Configure CORS appropriately for production
- [ ] Add security headers (CSP, X-Frame-Options)
- [ ] Implement account lockout after failed login attempts
- [ ] Log security events (failed logins, unauthorized access)

## References

- [Spring Security Documentation](https://docs.spring.io/spring-security/reference/index.html)
- [Spring Security 6 Migration Guide](https://docs.spring.io/spring-security/reference/migration/index.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Spring Security Test](https://docs.spring.io/spring-security/reference/servlet/test/index.html)
