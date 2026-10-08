FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies -q > /dev/null
COPY src src
RUN ./gradlew --no-daemon installDist -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/build/install/petrolheads-backend /app
RUN useradd --system app && mkdir -p /data/uploads && chown app /data/uploads
USER app
ENV UPLOAD_DIR=/data/uploads
EXPOSE 8080
CMD ["/app/bin/petrolheads-backend"]
