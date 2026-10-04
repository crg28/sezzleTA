// Package api exposes the calculator over HTTP/JSON.
package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/sezzle/calculator/internal/calculator"
)

const maxBodyBytes = 1 << 10 // requests are tiny; reject anything larger

// CalculateRequest is the JSON body of POST /api/v1/calculate.
// B is a pointer so "missing" can be told apart from an explicit 0.
type CalculateRequest struct {
	Operation calculator.Operation `json:"operation"`
	A         *float64             `json:"a"`
	B         *float64             `json:"b,omitempty"`
}

// CalculateResponse is returned on success.
type CalculateResponse struct {
	Result float64 `json:"result"`
}

// ErrorResponse is returned on every failure. Clients should switch on
// Error.Code (stable) rather than Error.Message (human readable).
type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewRouter wires all routes. Static assets are served by the caller.
func NewRouter(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", handleCalculate)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	return logRequests(logger, mux)
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	var req CalculateRequest
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "request body must be valid JSON with numeric operands")
		return
	}
	if req.A == nil {
		writeError(w, http.StatusBadRequest, "missing_operand", "operand \"a\" is required")
		return
	}

	result, err := calculator.Calculate(req.Operation, *req.A, req.B)
	if err != nil {
		status, code := classify(err)
		writeError(w, status, code, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, CalculateResponse{Result: result})
}

// classify maps domain errors to an HTTP status and a stable error code.
// 400: the request itself is malformed. 422: well-formed but mathematically invalid.
func classify(err error) (status int, code string) {
	switch {
	case errors.Is(err, calculator.ErrUnknownOperation):
		return http.StatusBadRequest, "unknown_operation"
	case errors.Is(err, calculator.ErrMissingOperand):
		return http.StatusBadRequest, "missing_operand"
	case errors.Is(err, calculator.ErrDivisionByZero):
		return http.StatusUnprocessableEntity, "division_by_zero"
	case errors.Is(err, calculator.ErrNegativeSqrt):
		return http.StatusUnprocessableEntity, "negative_sqrt"
	case errors.Is(err, calculator.ErrNotRepresentable):
		return http.StatusUnprocessableEntity, "result_not_representable"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, ErrorResponse{Error: ErrorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
