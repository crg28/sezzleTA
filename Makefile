.PHONY: backend frontend test coverage build docker

backend:   ## run API on :8080
	cd backend && go run ./cmd/server

frontend:  ## run Vite dev server on :5173 (proxies /api to :8080)
	cd frontend && npm run dev

test:
	cd backend && go test -race ./...
	cd frontend && npm test

coverage:
	cd backend && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -1
	cd frontend && npm run coverage

docker:
	docker build -t calculator . && docker run --rm -p 8080:8080 calculator
