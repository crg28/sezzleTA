# syntax=docker/dockerfile:1

# --- Stage 1: build the React app ---
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: build a static Go binary ---
FROM golang:1.22-alpine AS backend
WORKDIR /src
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# --- Stage 3: minimal runtime, one process serves API + UI ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend /server /server
COPY --from=frontend /app/dist /static
ENV PORT=8080 STATIC_DIR=/static
EXPOSE 8080
ENTRYPOINT ["/server"]
