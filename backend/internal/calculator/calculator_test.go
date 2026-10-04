package calculator

import (
	"errors"
	"math"
	"testing"
)

func ptr(f float64) *float64 { return &f }

func TestCalculate(t *testing.T) {
	tests := []struct {
		name    string
		op      Operation
		a       float64
		b       *float64
		want    float64
		wantErr error
	}{
		{"add", Add, 2, ptr(3), 5, nil},
		{"add negatives", Add, -2, ptr(-3), -5, nil},
		{"subtract", Subtract, 10, ptr(4), 6, nil},
		{"multiply", Multiply, 6, ptr(7), 42, nil},
		{"multiply by zero", Multiply, 6, ptr(0), 0, nil},
		{"divide", Divide, 9, ptr(3), 3, nil},
		{"divide fraction", Divide, 1, ptr(4), 0.25, nil},
		{"divide by zero", Divide, 1, ptr(0), 0, ErrDivisionByZero},
		{"zero divided by zero", Divide, 0, ptr(0), 0, ErrDivisionByZero},
		{"power", Power, 2, ptr(10), 1024, nil},
		{"power zero exponent", Power, 5, ptr(0), 1, nil},
		{"power negative exponent", Power, 2, ptr(-1), 0.5, nil},
		{"zero to negative power", Power, 0, ptr(-1), 0, ErrNotRepresentable},
		{"negative base fractional exponent", Power, -8, ptr(0.5), 0, ErrNotRepresentable},
		{"power overflow", Power, 10, ptr(400), 0, ErrNotRepresentable},
		{"multiply overflow", Multiply, math.MaxFloat64, ptr(10), 0, ErrNotRepresentable},
		{"sqrt", Sqrt, 144, nil, 12, nil},
		{"sqrt ignores b", Sqrt, 9, ptr(100), 3, nil},
		{"sqrt zero", Sqrt, 0, nil, 0, nil},
		{"sqrt negative", Sqrt, -1, nil, 0, ErrNegativeSqrt},
		{"sqrt of NaN", Sqrt, math.NaN(), nil, 0, ErrNotRepresentable},
		{"sqrt of infinity", Sqrt, math.Inf(1), nil, 0, ErrNotRepresentable},
		{"percent", Percent, 15, ptr(200), 30, nil},
		{"percent of zero", Percent, 50, ptr(0), 0, nil},
		{"binary op missing b", Add, 1, nil, 0, ErrMissingOperand},
		{"unknown op", Operation("modulo"), 1, ptr(2), 0, ErrUnknownOperation},
		{"empty op", Operation(""), 1, ptr(2), 0, ErrUnknownOperation},
		{"unknown op without b", Operation("modulo"), 1, nil, 0, ErrUnknownOperation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.a, tt.b)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if err == nil && math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("result = %v, want %v", got, tt.want)
			}
		})
	}
}
