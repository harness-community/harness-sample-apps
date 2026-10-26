# CI Activation App

A small order-processing service built with Java 17 and Spring Boot. Provides REST endpoints for creating, retrieving, and listing orders with in-memory storage.

## Prerequisites

- Java 17 or later
- Maven 3.8+
- Docker (optional, for containerisation)

## Build

```bash
cd ci-activation-app
mvn -B -DskipTests package
```

## Run tests

```bash
mvn -B test
```

## Start locally

```bash
java -jar target/ci-activation-app-0.1.0.jar
```

The service starts on port 8080.

## API

| Method | Path              | Description         |
|--------|-------------------|---------------------|
| GET    | /actuator/health  | Health check        |
| POST   | /api/orders       | Create an order     |
| GET    | /api/orders/{id}  | Retrieve an order   |
| GET    | /api/orders       | List all orders     |

### Create an order

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "alice@example.com",
    "items": [
      {"productName": "Widget", "quantity": 2, "unitPrice": 9.99}
    ]
  }'
```

## Docker

Build the JAR first, then build and run the container:

```bash
mvn -B -DskipTests package
docker build -t ci-activation-app .
docker run -p 8080:8080 ci-activation-app
```
