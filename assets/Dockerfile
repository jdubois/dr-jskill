# Multi-stage Dockerfile for Spring Boot application
# Uses the latest Ubuntu and Java versions

# Build stage
FROM ubuntu:latest AS build

# Install Java and Maven
RUN apt-get update && \
    apt-get install -y openjdk-25-jdk maven && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM ubuntu:latest

# Install Java runtime
RUN apt-get update && \
    apt-get install -y openjdk-25-jre && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 springboot

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
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
