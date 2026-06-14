# --- Build Stage ---
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace
COPY gradlew build.gradle settings.gradle ./
COPY gradle/ gradle/
RUN chmod +x gradlew && ./gradlew --version --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# --- Runtime Stage ---
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S memorica && adduser -S memorica -G memorica
USER memorica
WORKDIR /app
COPY --from=builder /workspace/build/libs/*.jar app.jar

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseZGC", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
