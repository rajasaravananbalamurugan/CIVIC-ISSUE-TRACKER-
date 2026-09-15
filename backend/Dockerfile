# Build stage
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew .
COPY build.gradle settings.gradle ./
COPY src ./src
# Build the application
RUN ./gradlew bootJar --no-daemon

# Run stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
# Create directories for SQLite and Uploads
RUN mkdir -p database uploads
EXPOSE 5001
ENTRYPOINT ["java", "-jar", "app.jar"]
