# Multi-stage Dockerfile for Inspectra Spring Boot Backend
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /build

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Persistent data directory for H2 database and artifacts
RUN mkdir -p /app/data /app/artifacts

COPY --from=builder /build/target/*.jar app.jar

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=docker
ENV SPRING_DATASOURCE_URL=jdbc:h2:file:/app/data/inspectradb;DB_CLOSE_DELAY=-1;AUTO_SERVER=TRUE
ENV ARTIFACTS_DIR=/app/artifacts

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
