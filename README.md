# Full-Stack Calculator

React + TypeScript frontend and a Go REST microservice. Frontend validates input
and displays results; **all arithmetic happens in the backend**.

```
.
├── backend/            Go service (stdlib only, no third-party deps)
│   ├── cmd/server/     entrypoint: config, graceful shutdown, optional static hosting
│   └── internal/
│       ├── calculator/ pure domain logic (no HTTP) + tests
│       └── api/        HTTP handlers, error mapping, logging + tests
├── frontend/           Vite + React + TypeScript + Bootstrap + Vitest
│   └── src/
│       ├── api/        fetch client, error-code → friendly message
│       ├── components/ Calculator UI
│       ├── validation.ts, format.ts   pure helpers
├── Dockerfile          single image serving API + UI
├── Makefile
└── PROMPTS.md          AI prompts used
```

## Setup

Requirements: Go ≥ 1.22, Node ≥ 20 (Docker optional).

### Run in development (two terminals)

```bash
# 1. API on http://localhost:8080
cd backend && go run ./cmd/server

# 2. UI on http://localhost:5173 (Vite proxies /api → :8080)
cd frontend && npm install && npm run dev
```

### Run with Docker (frontend + backend together)

```bash
docker build -t calculator .
docker run --rm -p 8080:8080 calculator   # open http://localhost:8080
```

Or, with the shortcut from the `Makefile` (runs both commands above):

```bash
make docker
```

### Run without Docker as a single process

```bash
cd frontend && npm install && npm run build
cd ../backend && STATIC_DIR=../frontend/dist go run ./cmd/server
```

## Tests and coverage

```bash
make test         # both layers
make coverage     # backend summary + frontend report (frontend/coverage/index.html)
```

| Layer | Coverage |
|---|---|
| `backend/internal/calculator` | 100 % |
| `backend/internal/api` | 100 % |
| `backend/cmd/server` | 0 % (wiring only, verified by manual smoke test) |
| frontend (`src/`, excl. `main.tsx`) | 100 % statements / branches |

## API

### `POST /api/v1/calculate`

| Field | Type | Notes |
|---|---|---|
| `operation` | string | `add`, `subtract`, `multiply`, `divide`, `power`, `percent`, `sqrt` |
| `a` | number | required |
| `b` | number | required except for `sqrt` (ignored there) |

```bash
curl -X POST localhost:8080/api/v1/calculate \
  -d '{"operation":"multiply","a":6,"b":7}'
# 200 {"result":42}

curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"sqrt","a":81}'
# 200 {"result":9}

curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"percent","a":15,"b":200}'
# 200 {"result":30}      ("15 percent of 200")

curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"divide","a":1,"b":0}'
# 422 {"error":{"code":"division_by_zero","message":"division by zero"}}
```

### Errors

All errors share the shape `{"error":{"code":"...","message":"..."}}`. Clients
should switch on `code`.

| HTTP | `code` | Cause |
|---|---|---|
| 400 | `invalid_json` | malformed body, wrong types, unknown fields, body > 1 KiB |
| 400 | `unknown_operation` | operation missing or unsupported |
| 400 | `missing_operand` | `a` missing, or `b` missing on a binary operation |
| 422 | `division_by_zero` | `b == 0` in `divide` |
| 422 | `negative_sqrt` | `sqrt` of a negative |
| 422 | `result_not_representable` | overflow, `0^-1`, `(-8)^0.5` … (would be Inf/NaN) |
| 405 | – | wrong HTTP method |

### `GET /healthz` → `{"status":"ok"}`

## Design decisions & assumptions

- **Domain separated from transport.** `calculator` has no HTTP knowledge; `api` only
  decodes, calls it, and maps sentinel errors to status/code (`errors.Is`). Operations
  are handled in a single `switch`; `sqrt` is the only one that takes one operand.
- **400 vs 422.** 400 = the request is malformed; 422 = well-formed but mathematically
  invalid. Stable `code` strings decouple the UI from message wording.
- **`b` is a `*float64`** so "missing" differs from an explicit `0` (`1 + 0` is valid).
- **Finite results only.** JSON can't carry NaN/Inf, so non-finite results are rejected
  with a clear error instead of producing a broken response.
- **Floating point.** The API uses `float64` and returns the raw value
  (`0.1+0.2 = 0.30000000000000004`). The UI rounds to 12 significant digits for display.
  For money-grade exactness, a decimal type would be the next step.
- **Percent** is defined as *"a percent of b"*.
- **Frontend validation is format-only** (empty / non-numeric / overflow). Business rules
  such as divide-by-zero are enforced once, in the server, which is the source of truth.
- **No CORS config:** dev uses Vite's proxy and Docker serves UI and API from the same
  origin. Add CORS if hosting them on different origins.
- **Simple Bootstrap form UI:** a dropdown for the operation and one or two number
  inputs. Bootstrap (via npm) handles layout and responsiveness, so there is no custom CSS.
  Labels are linked to inputs, results use `role="status"` and errors `role="alert"`.
- **Plain component code:** separate `result` / `error` / `loading` state and `if` blocks
  instead of nested ternaries or a state-machine type.
- **Server hardening:** read/write timeouts, 1 KiB body limit, graceful shutdown,
  structured JSON logs, non-root distroless runtime image.
- **Out of scope:** auth, rate limiting, calculation history, expression parsing.
