# Multi-stage Dockerfile for Spring Boot application
# Uses Eclipse Temurin official Java images for optimal performance

# Build stage
FROM eclipse-temurin:25-jdk-jammy AS build

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml (dependency caching layer)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline

# Copy source code
COPY src ./src

# Copy frontend directory if present (for fullstack projects with frontend-maven-plugin)
# If no frontend/ exists, comment out or remove this line
COPY frontend ./frontend

# Build the application
RUN ./mvnw clean package -DskipTests

# Runtime stage (Alpine-based for smaller image ~100 MB vs ~220 MB)
FROM eclipse-temurin:25-jre-alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create non-root user
RUN adduser -D -u 1001 springboot

# Set working directory
WORKDIR /app

# Copy the JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Change ownership
RUN chown -R springboot:springboot /app

# Switch to non-root user
USER springboot

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${SPRING_BOOT_PORT:-8080}/actuator/health || exit 1

# Run the application with optimized JVM flags
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
