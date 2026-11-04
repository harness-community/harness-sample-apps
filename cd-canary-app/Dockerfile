FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

ARG APP_VERSION=dev
ARG FAULT_MODE=none
ENV APP_VERSION=${APP_VERSION}
ENV FAULT_MODE=${FAULT_MODE}

COPY target/cd-canary-app-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]
