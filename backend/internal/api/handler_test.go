package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(NewRouter(slog.New(slog.NewTextHandler(io.Discard, nil))))
	t.Cleanup(srv.Close)
	return srv
}

func post(t *testing.T, srv *httptest.Server, body string) (*http.Response, []byte) {
	t.Helper()
	res, err := http.Post(srv.URL+"/api/v1/calculate", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	return res, data
}

func TestCalculateSuccess(t *testing.T) {
	srv := newTestServer(t)
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, 5},
		{"subtract", `{"operation":"subtract","a":2,"b":3}`, -1},
		{"multiply", `{"operation":"multiply","a":4,"b":2.5}`, 10},
		{"divide", `{"operation":"divide","a":9,"b":3}`, 3},
		{"power", `{"operation":"power","a":2,"b":8}`, 256},
		{"sqrt", `{"operation":"sqrt","a":81}`, 9},
		{"percent", `{"operation":"percent","a":10,"b":50}`, 5},
		{"explicit zero operand is valid", `{"operation":"add","a":1,"b":0}`, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, data := post(t, srv, tt.body)
			if res.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, body = %s", res.StatusCode, data)
			}
			if ct := res.Header.Get("Content-Type"); ct != "application/json" {
				t.Errorf("content-type = %q", ct)
			}
			var got CalculateResponse
			if err := json.Unmarshal(data, &got); err != nil {
				t.Fatal(err)
			}
			if got.Result != tt.want {
				t.Errorf("result = %v, want %v", got.Result, tt.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	srv := newTestServer(t)
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"division by zero", `{"operation":"divide","a":1,"b":0}`, 422, "division_by_zero"},
		{"negative sqrt", `{"operation":"sqrt","a":-4}`, 422, "negative_sqrt"},
		{"overflow", `{"operation":"power","a":10,"b":999}`, 422, "result_not_representable"},
		{"unknown operation", `{"operation":"modulo","a":1,"b":2}`, 400, "unknown_operation"},
		{"missing operation", `{"a":1,"b":2}`, 400, "unknown_operation"},
		{"missing a", `{"operation":"add","b":2}`, 400, "missing_operand"},
		{"missing b", `{"operation":"add","a":1}`, 400, "missing_operand"},
		{"malformed json", `{"operation":`, 400, "invalid_json"},
		{"string operand", `{"operation":"add","a":"1","b":2}`, 400, "invalid_json"},
		{"null operand", `{"operation":"add","a":null,"b":2}`, 400, "missing_operand"},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, 400, "invalid_json"},
		{"empty body", ``, 400, "invalid_json"},
		{"oversized body", `{"operation":"add","a":1,"b":2,"pad":"` + strings.Repeat("x", 2000) + `"}`, 400, "invalid_json"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, data := post(t, srv, tt.body)
			if res.StatusCode != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %s)", res.StatusCode, tt.wantStatus, data)
			}
			var got ErrorResponse
			if err := json.Unmarshal(data, &got); err != nil {
				t.Fatalf("error body is not JSON: %v", err)
			}
			if got.Error.Code != tt.wantCode {
				t.Errorf("code = %q, want %q", got.Error.Code, tt.wantCode)
			}
			if got.Error.Message == "" {
				t.Error("message should not be empty")
			}
		})
	}
}

func TestWrongMethod(t *testing.T) {
	srv := newTestServer(t)
	res, err := http.Get(srv.URL + "/api/v1/calculate")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", res.StatusCode)
	}
}

func TestHealth(t *testing.T) {
	srv := newTestServer(t)
	res, err := http.Get(srv.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", res.StatusCode)
	}
}

func TestClassifyUnknownErrorIsInternal(t *testing.T) {
	status, code := classify(io.ErrUnexpectedEOF)
	if status != http.StatusInternalServerError || code != "internal_error" {
		t.Errorf("got %d %q", status, code)
	}
}
